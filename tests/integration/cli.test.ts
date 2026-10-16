import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseArgs } from '../../src/cli/args.js';
import { runSearch } from '../../src/core/search.js';
import { ExitCode } from '../../src/errors/exit-codes.js';
import { OutputWriter } from '../../src/output/writer.js';

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

const sampleFile = path.resolve('tests/fixtures/sample.txt');
const binaryFile = path.resolve('tests/fixtures/binary.bin');

describe('CLI Integration Tests', () => {
  it('returns MATCH_FOUND (0) and outputs matching line', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-n', 'gamma', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual(['3:third line gamma']);
  });

  it('returns NO_MATCH (1) when pattern is not found', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['nonexistent_pattern', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.NO_MATCH);
    expect(writer.stdoutLines).toHaveLength(0);
  });

  it('returns ERROR (2) when file does not exist without -s', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['pat', 'nonexistent_file_123.txt']);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.ERROR);
    expect(writer.stderrLines.length).toBeGreaterThan(0);
  });

  it('suppresses file errors when -s is active', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-s', 'pat', 'nonexistent_file_123.txt']);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.ERROR);
    expect(writer.stderrLines).toHaveLength(0);
  });

  it('supports count (-c) mode', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-c', 'alpha', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual(['2']);
  });

  it('supports files-with-matches (-l)', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-l', 'alpha', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual([sampleFile]);
  });

  it('supports files-without-match (-L)', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-L', 'nonexistent_word', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual([sampleFile]);
  });

  it('supports quiet (-q) mode with early termination', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-q', 'alpha', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toHaveLength(0);
  });

  it('supports max-count (-m NUM)', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-m', '1', 'alpha', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual(['first line alpha']);
  });

  it('supports inverted matching (-v)', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-v', 'alpha', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual([
      'second line beta',
      'third line gamma',
      'fourth line delta',
    ]);
  });

  it('detects binary file and outputs "Binary file ... matches"', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['alpha', binaryFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual([`Binary file ${binaryFile} matches`]);
  });

  it('treats binary file as text with -a', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-a', 'alpha', binaryFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines[0]).toContain('alpha');
  });

  it('skips binary file with -I', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-I', 'alpha', binaryFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.NO_MATCH);
    expect(writer.stdoutLines).toHaveLength(0);
  });

  it('prints nothing when -v and -o are both specified', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-v', '-o', 'alpha', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toHaveLength(0);
  });

  it('prioritizes -L over -c when both are specified', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-c', '-L', 'nonexistent', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual([sampleFile]);
  });

  it('prioritizes last specified between -l and -L', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-l', '-L', 'alpha', sampleFile]);
    const code = await runSearch(opts, writer);

    // -L was last; alpha matches, so no files without match
    expect(code).toBe(ExitCode.NO_MATCH);
    expect(writer.stdoutLines).toHaveLength(0);
  });

  it('reports Unix-style byte offsets with -u -b on CRLF file', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-u', '-b', '-m', '1', 'beta', sampleFile]);
    const code = await runSearch(opts, writer);

    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines[0]).toMatch(/^17:second line beta$/);
  });
});
