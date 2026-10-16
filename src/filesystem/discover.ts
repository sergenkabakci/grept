import fs from 'node:fs';
import fsp from 'node:fs/promises';
import type { CliOptions } from '../cli/args.js';
import { traverseDirectory } from './traversal.js';
import { ReparseCycleTracker } from './reparse-points.js';
import { normalizeWindowsPath } from '../utils/windows-paths.js';

export interface SearchTarget {
  isStdin: boolean;
  filePath: string;
  displayPath: string;
  isError?: boolean;
  errorMessage?: string;
}

export async function* discoverTargets(
  options: CliOptions,
): AsyncGenerator<SearchTarget, void, undefined> {
  // Load extra exclude globs from --exclude-from files
  for (const exFile of options.excludeFrom) {
    try {
      const content = fs.readFileSync(exFile, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          options.excludes.push(trimmed);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      yield {
        isStdin: false,
        filePath: exFile,
        displayPath: exFile,
        isError: true,
        errorMessage: `cannot open exclude-from file '${exFile}': ${msg}`,
      };
      return;
    }
  }

  const targets = options.targets.length > 0 ? options.targets : options.recursive ? ['.'] : ['-'];

  const visitedFiles = new Set<string>();
  const cycleTracker = new ReparseCycleTracker();

  for (const target of targets) {
    if (target === '-') {
      yield {
        isStdin: true,
        filePath: '-',
        displayPath: options.label ?? '(standard input)',
      };
      continue;
    }

    let stats: import('node:fs').Stats;
    try {
      stats = await fsp.stat(target);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      yield {
        isStdin: false,
        filePath: target,
        displayPath: target,
        isError: true,
        errorMessage: msg,
      };
      continue;
    }

    if (stats.isDirectory()) {
      if (options.directories === 'skip') {
        continue;
      }
      if (!options.recursive && options.directories === 'read') {
        yield {
          isStdin: false,
          filePath: target,
          displayPath: target,
          isError: true,
          errorMessage: 'Is a directory',
        };
        continue;
      }

      // Recurse directory
      await cycleTracker.markAndCheck(target);
      for await (const item of traverseDirectory(target, options, cycleTracker)) {
        if ('message' in item) {
          yield {
            isStdin: false,
            filePath: item.filePath,
            displayPath: item.filePath,
            isError: true,
            errorMessage: item.message,
          };
        } else {
          const norm = normalizeWindowsPath(item.filePath).toLowerCase();
          if (!visitedFiles.has(norm)) {
            visitedFiles.add(norm);
            yield {
              isStdin: false,
              filePath: item.filePath,
              displayPath: item.displayPath,
            };
          }
        }
      }
    } else {
      // Regular file or device
      const norm = normalizeWindowsPath(target).toLowerCase();
      if (!visitedFiles.has(norm)) {
        visitedFiles.add(norm);
        yield {
          isStdin: false,
          filePath: target,
          displayPath: target,
        };
      }
    }
  }
}
