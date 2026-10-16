import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli/args.js';
import { ArgumentError } from '../../src/errors/errors.js';

describe('CLI argument parsing', () => {
  it('parses basic pattern and target', () => {
    const opts = parseArgs(['hello', 'file.txt']);
    expect(opts.patterns).toEqual(['hello']);
    expect(opts.targets).toEqual(['file.txt']);
    expect(opts.regexMode).toBe('basic');
  });

  it('parses short options combined: -inC3', () => {
    const opts = parseArgs(['-inC3', 'pattern', 'test.log']);
    expect(opts.ignoreCase).toBe(true);
    expect(opts.lineNumber).toBe(true);
    expect(opts.beforeContext).toBe(3);
    expect(opts.afterContext).toBe(3);
    expect(opts.patterns).toEqual(['pattern']);
  });

  it('parses numeric context shorthand -3', () => {
    const opts = parseArgs(['-3', 'pattern', 'file.txt']);
    expect(opts.beforeContext).toBe(3);
    expect(opts.afterContext).toBe(3);
  });

  it('parses regex mode switches with last-wins precedence', () => {
    const opts = parseArgs(['-E', '-F', '-P', 'pattern', 'file.txt']);
    expect(opts.regexMode).toBe('pcre');

    const opts2 = parseArgs(['-P', '-G', 'pattern', 'file.txt']);
    expect(opts2.regexMode).toBe('basic');
  });

  it('parses multiple -e patterns and protects dash-prefixed patterns', () => {
    const opts = parseArgs(['-e', '-pattern1', '-e', 'pattern2', 'file.txt']);
    expect(opts.patterns).toEqual(['-pattern1', 'pattern2']);
  });

  it('terminates option parsing on --', () => {
    const opts = parseArgs(['-i', '--', '-notAnOption', '-fileStartingWithDash.txt']);
    expect(opts.ignoreCase).toBe(true);
    expect(opts.patterns).toEqual(['-notAnOption']);
    expect(opts.targets).toEqual(['-fileStartingWithDash.txt']);
  });

  it('parses long options with = and with space', () => {
    const opts1 = parseArgs(['--max-count=5', '--color=never', 'pat', 'file.txt']);
    expect(opts1.maxCount).toBe(5);
    expect(opts1.color).toBe('never');

    const opts2 = parseArgs(['--max-count', '10', '--color', 'always', 'pat', 'file.txt']);
    expect(opts2.maxCount).toBe(10);
    expect(opts2.color).toBe('always');
  });

  it('parses context options: -A, -B, -C, --group-separator', () => {
    const opts = parseArgs(['-A', '2', '-B', '4', '--group-separator=***', 'pat', 'file.txt']);
    expect(opts.afterContext).toBe(2);
    expect(opts.beforeContext).toBe(4);
    expect(opts.groupSeparator).toBe('***');

    const opts2 = parseArgs(['--no-group-separator', 'pat', 'file.txt']);
    expect(opts2.groupSeparator).toBeNull();
  });

  it('parses recursive and include/exclude flags', () => {
    const opts = parseArgs([
      '-r',
      '--include=*.ts',
      '--exclude=*.spec.ts',
      '--exclude-dir=dist',
      '--max-depth=3',
      'pat',
      'src',
    ]);
    expect(opts.recursive).toBe(true);
    expect(opts.includes).toEqual(['*.ts']);
    expect(opts.excludes).toEqual(['*.spec.ts']);
    expect(opts.excludeDirs).toEqual(['dist']);
    expect(opts.maxDepth).toBe(3);
  });

  it('throws ArgumentError on unknown option', () => {
    expect(() => parseArgs(['--unknown-flag', 'pat'])).toThrow(ArgumentError);
    expect(() => parseArgs(['-k', 'pat'])).toThrow(ArgumentError);
  });

  it('throws ArgumentError on missing option argument', () => {
    expect(() => parseArgs(['-m'])).toThrow(ArgumentError);
    expect(() => parseArgs(['--max-count'])).toThrow(ArgumentError);
  });

  it('throws ArgumentError when no pattern and no -e given', () => {
    expect(() => parseArgs([])).toThrow(ArgumentError);
  });
});
