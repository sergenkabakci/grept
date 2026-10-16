import fs from 'node:fs/promises';
import { normalizeWindowsPath } from '../utils/windows-paths.js';

export class ReparseCycleTracker {
  private visitedRealPaths = new Set<string>();

  /**
   * Returns true if path has not been visited yet and marks it visited.
   * Returns false if cycle or duplicate visited.
   */
  public async markAndCheck(path: string): Promise<boolean> {
    try {
      const real = await fs.realpath(path);
      const key = normalizeWindowsPath(real).toLowerCase();
      if (this.visitedRealPaths.has(key)) {
        return false; // already visited, cycle or duplicate
      }
      this.visitedRealPaths.add(key);
      return true;
    } catch {
      // If realpath fails (e.g. broken symlink), treat as unvisitable
      return false;
    }
  }

  public clear(): void {
    this.visitedRealPaths.clear();
  }
}
