import fs from 'node:fs';
import type { Readable } from 'node:stream';
import type { CliOptions } from '../cli/args.js';
import { ExitCode, type ExitCodeType } from '../errors/exit-codes.js';
import { discoverTargets, type SearchTarget } from '../filesystem/discover.js';
import { readLines } from './line-reader.js';
import { isBinaryBuffer } from './binary.js';
import { createMatcher } from './matcher.js';
import { OutputFormatter } from '../output/formatter.js';
import { AnsiColors } from '../output/color.js';
import { ContextManager } from '../output/context.js';
import { OutputWriter } from '../output/writer.js';
import { shouldEnableColor } from '../utils/terminal.js';

export async function runSearch(
  options: CliOptions,
  customWriter?: OutputWriter,
): Promise<ExitCodeType> {
  const enableColor = shouldEnableColor(options.color);
  const colors = new AnsiColors(enableColor);
  const formatter = new OutputFormatter(options, colors);
  const writer =
    customWriter ??
    new OutputWriter(process.stdout, process.stderr, options.nullData, options.lineBuffered);

  const matcher = await createMatcher(options);

  // Discover all targets
  const targets: SearchTarget[] = [];
  for await (const t of discoverTargets(options)) {
    targets.push(t);
  }

  // Determine whether filename prefix should be shown
  const isMultipleTargets = targets.length > 1 || options.recursive;
  const defaultShowFilename = isMultipleTargets;
  const showFilename =
    options.withFilename !== undefined ? options.withFilename : defaultShowFilename;

  let hasAnyMatch = false;
  let hasError = false;

  for (const target of targets) {
    if (target.isError) {
      hasError = true;
      if (!options.noMessages) {
        writer.writeError(`grept: ${target.filePath}: ${target.errorMessage}`);
      }
      continue;
    }

    let stream: Readable;
    if (target.isStdin) {
      stream = process.stdin;
    } else {
      try {
        stream = fs.createReadStream(target.filePath, { highWaterMark: 65536 });
      } catch (err: unknown) {
        hasError = true;
        if (!options.noMessages) {
          const msg = err instanceof Error ? err.message : String(err);
          writer.writeError(`grept: ${target.filePath}: ${msg}`);
        }
        continue;
      }
    }

    let fileHasMatch = false;
    let fileMatchCount = 0;
    const contextManager = new ContextManager(options.beforeContext, options.afterContext);

    try {
      // Peek initial chunk for binary detection
      let initialChunk: Buffer | undefined;
      let isBinary = false;

      // Handle stream errors
      stream.on('error', (err: unknown) => {
        hasError = true;
        if (!options.noMessages) {
          const msg = err instanceof Error ? err.message : String(err);
          writer.writeError(`grept: ${target.filePath}: ${msg}`);
        }
      });

      // Binary detection (only if not -a and not -z)
      if (options.binaryFiles !== 'text' && !options.nullData) {
        // Read first chunk from stream
        const iterator = stream[Symbol.asyncIterator]();
        const first = await iterator.next();
        if (!first.done && first.value) {
          initialChunk = Buffer.isBuffer(first.value) ? first.value : Buffer.from(first.value);
          if (isBinaryBuffer(initialChunk, initialChunk.length)) {
            isBinary = true;
          }
        }
      }

      if (isBinary) {
        if (options.binaryFiles === 'without-match') {
          // -I or --binary-files=without-match: skip binary file completely
          if (!target.isStdin) {
            (stream as fs.ReadStream).destroy();
          }
          continue;
        }

        // --binary-files=binary (default)
        // Check if any match exists in the binary file
        const binaryLines = readLines(stream, {
          nullData: options.nullData,
          initialChunk,
          unixByteOffsets: options.unixByteOffsets,
        });

        for await (const line of binaryLines) {
          if (matcher.test(line.text)) {
            fileHasMatch = true;
            if (!options.filesWithoutMatch) {
              hasAnyMatch = true;
            }
            break;
          }
        }

        if (fileHasMatch) {
          if (options.quiet) {
            if (!target.isStdin) (stream as fs.ReadStream).destroy();
            return ExitCode.MATCH_FOUND;
          }
          if (options.filesWithMatches) {
            writer.writeLine(target.displayPath);
          } else if (options.count) {
            writer.writeLine(formatter.formatBinaryMatch(target.displayPath));
          } else if (!options.filesWithoutMatch) {
            writer.writeLine(formatter.formatBinaryMatch(target.displayPath));
          }
        } else if (options.filesWithoutMatch) {
          writer.writeLine(target.displayPath);
          hasAnyMatch = true;
        }

        if (!target.isStdin) (stream as fs.ReadStream).destroy();
        continue;
      }

      // Normal text scanning
      const lineGen = readLines(stream, {
        nullData: options.nullData,
        initialChunk,
        unixByteOffsets: options.unixByteOffsets,
      });

      let reachedMaxCount = false;

      for await (const line of lineGen) {
        const isMatch = matcher.test(line.text);

        if (isMatch) {
          fileMatchCount++;
          fileHasMatch = true;
          if (!options.filesWithoutMatch) {
            hasAnyMatch = true;
          }

          if (options.quiet) {
            if (!target.isStdin) (stream as fs.ReadStream).destroy();
            return ExitCode.MATCH_FOUND;
          }

          if (options.filesWithMatches) {
            writer.writeLine(target.displayPath);
            if (!target.isStdin) (stream as fs.ReadStream).destroy();
            break;
          }

          if (options.maxCount !== undefined && fileMatchCount >= options.maxCount) {
            reachedMaxCount = true;
          }
        }

        // If count or filename-only modes, skip normal line output
        if (options.count || options.filesWithMatches || options.filesWithoutMatch) {
          if (reachedMaxCount) {
            if (!target.isStdin) (stream as fs.ReadStream).destroy();
            break;
          }
          continue;
        }

        if (options.onlyMatching) {
          if (isMatch) {
            const matches = matcher.findMatches(line.text);
            const linesToPrint = formatter.formatOnlyMatching(
              target.displayPath,
              showFilename,
              line.lineNum,
              line.byteOffset,
              line.text,
              matches,
            );
            for (const outLine of linesToPrint) {
              writer.writeLine(outLine);
            }
          }
          if (reachedMaxCount) {
            if (!target.isStdin) (stream as fs.ReadStream).destroy();
            break;
          }
          continue;
        }

        // Standard or context output
        if (options.beforeContext === 0 && options.afterContext === 0) {
          if (isMatch) {
            const ranges = enableColor ? matcher.findMatches(line.text) : [];
            const outLine = formatter.formatLine(
              target.displayPath,
              showFilename,
              line.lineNum,
              line.byteOffset,
              line.text,
              false,
              ranges,
            );
            writer.writeLine(outLine);
          }
          if (reachedMaxCount) {
            if (!target.isStdin) (stream as fs.ReadStream).destroy();
            break;
          }
        } else {
          // Context mode
          for (const cLine of contextManager.processLine(line, isMatch)) {
            if (cLine.needsGroupSeparatorBefore) {
              const sep = formatter.formatGroupSeparator();
              if (sep !== null) {
                writer.writeLine(sep);
              }
            }
            const ranges = enableColor && cLine.isMatch ? matcher.findMatches(cLine.item.text) : [];
            const outLine = formatter.formatLine(
              target.displayPath,
              showFilename,
              cLine.item.lineNum,
              cLine.item.byteOffset,
              cLine.item.text,
              !cLine.isMatch,
              ranges,
            );
            writer.writeLine(outLine);
          }
          if (reachedMaxCount && options.afterContext === 0) {
            if (!target.isStdin) (stream as fs.ReadStream).destroy();
            break;
          }
        }
      }

      // After file processing
      if (options.filesWithoutMatch) {
        if (!fileHasMatch) {
          writer.writeLine(target.displayPath);
          hasAnyMatch = true;
        }
      } else if (options.count) {
        writer.writeLine(formatter.formatCount(target.displayPath, showFilename, fileMatchCount));
      }
    } catch (err: unknown) {
      hasError = true;
      if (!options.noMessages) {
        const msg = err instanceof Error ? err.message : String(err);
        writer.writeError(`grept: ${target.filePath}: ${msg}`);
      }
    } finally {
      if (!target.isStdin && stream && 'destroy' in stream) {
        (stream as fs.ReadStream).destroy();
      }
    }
  }

  if (hasError) {
    if (options.quiet && hasAnyMatch) {
      return ExitCode.MATCH_FOUND;
    }
    return ExitCode.ERROR;
  }

  return hasAnyMatch ? ExitCode.MATCH_FOUND : ExitCode.NO_MATCH;
}
