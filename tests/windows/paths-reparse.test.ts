import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeWindowsPath, pathsEqual, displayPath } from '../../src/utils/windows-paths.js';
import { ReparseCycleTracker } from '../../src/filesystem/reparse-points.js';
import { parseArgs } from '../../src/cli/args.js';
import { runSearch } from '../../src/core/search.js';
import { OutputWriter } from '../../src/output/writer.js';
import { ExitCode } from '../../src/errors/exit-codes.js';

class CaptureWriter extends OutputWriter {
  public stdoutLines: string[] = [];
  public stderrLines: string[] = [];

  constructor() {
    super(process.stdout, process.stderr, false, false);
  }

  override writeLine(line: string): void {
    this.stdoutLines.push(line);
  }

  override writeError(message: string): void {
    this.stderrLines.push(message);
  }
}

const testSpaceDir = path.resolve('tests/fixtures/space dir with spaces');
const testUnicodeDir = path.resolve('tests/fixtures/dizin_türkçe_şçğüöı');

describe('Windows paths, reparse points, and edge cases', () => {
  beforeAll(() => {
    fs.mkdirSync(testSpaceDir, { recursive: true });
    fs.writeFileSync(path.join(testSpaceDir, 'space file.txt'), 'hello from space path\n');

    fs.mkdirSync(testUnicodeDir, { recursive: true });
    fs.writeFileSync(path.join(testUnicodeDir, 'dosya_şçğ.txt'), 'türkçe içerik test başarılı\n');
  });

  afterAll(() => {
    try {
      fs.rmSync(testSpaceDir, { recursive: true, force: true });
      fs.rmSync(testUnicodeDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('Windows Path Utilities', () => {
    it('normalizes drive letters to uppercase', () => {
      const p1 = 'c:\\users\\app';
      expect(normalizeWindowsPath(p1).startsWith('C:\\')).toBe(true);
    });

    it('performs case-insensitive path equality', () => {
      expect(pathsEqual('C:\\Projects\\App\\file.ts', 'c:/projects/app/FILE.ts')).toBe(true);
    });

    it('formats extended path prefixes for display', () => {
      expect(displayPath('\\\\?\\C:\\Folder\\File.txt')).toBe('C:\\Folder\\File.txt');
      expect(displayPath('\\\\?\\UNC\\server\\share\\file.txt')).toBe(
        '\\\\server\\share\\file.txt',
      );
    });
  });

  describe('Reparse Point Cycle Tracker', () => {
    it('detects cycles and duplicate directory visits', async () => {
      const tracker = new ReparseCycleTracker();
      const p = path.resolve('tests/fixtures');

      // First check should succeed
      const first = await tracker.markAndCheck(p);
      expect(first).toBe(true);

      // Second check on same path should detect duplicate/cycle
      const second = await tracker.markAndCheck(p);
      expect(second).toBe(false);
    });
  });

  describe('Searching paths with spaces and Unicode', () => {
    it('searches files inside paths with spaces', async () => {
      const writer = new CaptureWriter();
      const target = path.join(testSpaceDir, 'space file.txt');
      const opts = parseArgs(['space path', target]);
      const code = await runSearch(opts, writer);

      expect(code).toBe(ExitCode.MATCH_FOUND);
      expect(writer.stdoutLines).toEqual(['hello from space path']);
    });

    it('searches files inside directories with Unicode characters', async () => {
      const writer = new CaptureWriter();
      const target = path.join(testUnicodeDir, 'dosya_şçğ.txt');
      const opts = parseArgs(['başarılı', target]);
      const code = await runSearch(opts, writer);

      expect(code).toBe(ExitCode.MATCH_FOUND);
      expect(writer.stdoutLines).toEqual(['türkçe içerik test başarılı']);
    });

    it('handles overlapping search roots without duplicating output', async () => {
      const writer = new CaptureWriter();
      const target1 = testSpaceDir;
      const target2 = path.join(testSpaceDir, 'space file.txt');
      const opts = parseArgs(['-r', 'space path', target1, target2]);
      const code = await runSearch(opts, writer);

      expect(code).toBe(ExitCode.MATCH_FOUND);
      expect(writer.stdoutLines).toHaveLength(1);
    });

    it('gracefully handles NTFS junction loops with cycle detection', async () => {
      const loopDir = path.resolve('tests/fixtures/loop_test_dir');
      const subDir = path.join(loopDir, 'sub');
      const junctionDir = path.join(subDir, 'loop_back');

      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(loopDir, 'loop_target.txt'), 'find me once in loop\n');

      let junctionCreated = false;
      try {
        fs.symlinkSync(loopDir, junctionDir, 'junction');
        junctionCreated = true;
      } catch {
        // Ignored if environment restricts
      }

      try {
        const writer = new CaptureWriter();
        const opts = parseArgs(['-R', 'find me once in loop', loopDir]);
        const code = await runSearch(opts, writer);

        expect(code).toBe(ExitCode.MATCH_FOUND);
        expect(writer.stdoutLines).toHaveLength(1);
      } finally {
        if (junctionCreated) {
          try {
            fs.unlinkSync(junctionDir);
          } catch {}
        }
        try {
          fs.rmSync(loopDir, { recursive: true, force: true });
        } catch {}
      }
    });
  });
});
