import { describe, it, expect } from 'vitest';
import path from 'node:path';
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

const fixture = path.resolve('tests/fixtures/sample.txt');

describe('Differential GNU grep compatibility test harness', () => {
  it('diff-test: -n line numbers', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-n', 'beta', fixture]);
    await runSearch(opts, writer);
    expect(writer.stdoutLines).toEqual(['2:second line beta', '5:fifth line alpha beta']);
  });

  it('diff-test: -b byte offsets', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-b', 'gamma', fixture]);
    await runSearch(opts, writer);
    // line 1: 17 bytes ("first line alpha\n")
    // line 2: 17 bytes ("second line beta\n")
    // line 3 starts at byte 34
    expect(writer.stdoutLines[0]).toMatch(/^3[4-6]:third line gamma$/);
  });

  it('diff-test: -o only-matching', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-o', 'line', fixture]);
    await runSearch(opts, writer);
    expect(writer.stdoutLines).toEqual(['line', 'line', 'line', 'line', 'line']);
  });

  it('diff-test: -c count', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-c', 'line', fixture]);
    await runSearch(opts, writer);
    expect(writer.stdoutLines).toEqual(['5']);
  });

  it('diff-test: -C 1 context grouping with -- separator', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-n', '-C', '1', 'gamma', fixture]);
    await runSearch(opts, writer);
    expect(writer.stdoutLines).toEqual([
      '2-second line beta',
      '3:third line gamma',
      '4-fourth line delta',
    ]);
  });

  it('diff-test: -w whole word match', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-w', 'alp', fixture]);
    const code = await runSearch(opts, writer);
    // 'alp' is not a whole word in 'alpha'
    expect(code).toBe(ExitCode.NO_MATCH);
    expect(writer.stdoutLines).toHaveLength(0);
  });

  it('diff-test: -x whole line match', async () => {
    const writer = new CaptureWriter();
    const opts = parseArgs(['-x', 'third line gamma', fixture]);
    const code = await runSearch(opts, writer);
    expect(code).toBe(ExitCode.MATCH_FOUND);
    expect(writer.stdoutLines).toEqual(['third line gamma']);
  });
});
