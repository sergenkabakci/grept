import fs from 'node:fs/promises';
import path from 'node:path';
import type { CliOptions } from '../cli/args.js';
import { matchesAnyGlob } from './glob.js';
import { ReparseCycleTracker } from './reparse-points.js';

export interface DiscoveredFile {
  filePath: string;
  displayPath: string;
}

export interface TraversalError {
  filePath: string;
  message: string;
}

/**
 * Traverses a directory recursively, applying glob filters, depth limits, and cycle detection.
 */
export async function* traverseDirectory(
  rootDir: string,
  options: CliOptions,
  cycleTracker: ReparseCycleTracker,
  currentDepth = 0,
): AsyncGenerator<DiscoveredFile | TraversalError, void, undefined> {
  if (options.maxDepth !== undefined && currentDepth > options.maxDepth) {
    return;
  }

  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    yield { filePath: rootDir, message: msg };
    return;
  }

  // Combine excludeDirs with default exclude policy unless explicitly overridden
  const effectiveExcludeDirs = [...options.excludeDirs];
  if (!options.excludeDirs.some(d => d === 'node_modules')) {
    effectiveExcludeDirs.push('node_modules');
  }
  if (!options.excludeDirs.some(d => d === '.git')) {
    effectiveExcludeDirs.push('.git');
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory() || entry.isSymbolicLink()) {
      // Check if directory matches exclude-dir
      if (matchesAnyGlob(entry.name, effectiveExcludeDirs)) {
        continue;
      }
      // Hidden directories (starting with '.') skipped by default unless included
      if (entry.name.startsWith('.') && !options.includes.length) {
        if (!options.excludeDirs.includes(entry.name)) {
          continue;
        }
      }

      let isDir = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        if (!options.dereferenceRecursive) {
          // -r does NOT follow directory symlinks/junctions
          continue;
        }
        try {
          const stat = await fs.stat(fullPath);
          isDir = stat.isDirectory();
        } catch {
          // Broken symlink
          continue;
        }
      }

      if (isDir) {
        // Check cycle
        const ok = await cycleTracker.markAndCheck(fullPath);
        if (!ok) {
          continue; // Cycle or duplicate
        }
        yield* traverseDirectory(fullPath, options, cycleTracker, currentDepth + 1);
      } else {
        // Symlink pointing to regular file
        yield* processFileEntry(fullPath, entry.name, options);
      }
    } else if (entry.isFile()) {
      yield* processFileEntry(fullPath, entry.name, options);
    }
  }
}

function* processFileEntry(
  fullPath: string,
  fileName: string,
  options: CliOptions,
): Generator<DiscoveredFile, void, undefined> {
  // Check exclude globs
  if (options.excludes.length > 0 && matchesAnyGlob(fileName, options.excludes)) {
    return;
  }

  // Check include globs
  if (options.includes.length > 0 && !matchesAnyGlob(fileName, options.includes)) {
    return;
  }

  yield {
    filePath: fullPath,
    displayPath: fullPath,
  };
}
