import { describe, it, expect } from 'vitest';
import { createMatcher, turkishCaseFold } from '../../src/core/matcher.js';
import { parseArgs } from '../../src/cli/args.js';
import { RegexSyntaxError } from '../../src/errors/errors.js';

describe('Matchers (Fixed, BRE, ERE, PCRE2)', () => {
  describe('Turkish Unicode case folding', () => {
    it('folds Turkish dotted and dotless pairs accurately', () => {
      // Dotted pair: i and İ
      expect(turkishCaseFold('i')).toBe(turkishCaseFold('İ'));
      // Dotless pair: I and ı
      expect(turkishCaseFold('I')).toBe(turkishCaseFold('ı'));
      // Cross pairs must NOT match
      expect(turkishCaseFold('i')).not.toBe(turkishCaseFold('I'));
      expect(turkishCaseFold('İ')).not.toBe(turkishCaseFold('ı'));
    });

    it('matches Turkish characters in FixedMatcher with -i', async () => {
      const opts1 = parseArgs(['-F', '-i', 'istanbul', 'dummy']);
      const m1 = await createMatcher(opts1);
      expect(m1.test('İSTANBUL')).toBe(true);

      const opts2 = parseArgs(['-F', '-i', 'ILIK', 'dummy']);
      const m2 = await createMatcher(opts2);
      expect(m2.test('ılık')).toBe(true);
      expect(m2.test('ilik')).toBe(false);
    });

    it('matches Turkish characters in RegexMatcher with -i', async () => {
      const opts = parseArgs(['-i', 'istanbul', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('İSTANBUL')).toBe(true);

      const opts2 = parseArgs(['-i', 'ılık', 'dummy']);
      const m2 = await createMatcher(opts2);
      expect(m2.test('ILIK')).toBe(true);
    });
  });

  describe('FixedMatcher (-F)', () => {
    it('matches literal substrings', async () => {
      const opts = parseArgs(['-F', 'C:\\Program Files', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('Path is C:\\Program Files\\App')).toBe(true);
      expect(m.test('Path is C:\\Other')).toBe(false);
    });

    it('handles -w whole word in fixed mode', async () => {
      const opts = parseArgs(['-F', '-w', 'cat', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('black cat here')).toBe(true);
      expect(m.test('cat.')).toBe(true);
      expect(m.test('catalog')).toBe(false);
      expect(m.test('bobcat')).toBe(false);
    });

    it('handles -x whole line in fixed mode', async () => {
      const opts = parseArgs(['-F', '-x', 'exact', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('exact')).toBe(true);
      expect(m.test('exact ')).toBe(false);
      expect(m.test(' exact')).toBe(false);
    });

    it('handles multiple patterns in fixed mode', async () => {
      const opts = parseArgs(['-F', '-e', 'apple', '-e', 'banana', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('I like apple')).toBe(true);
      expect(m.test('I like banana')).toBe(true);
      expect(m.test('I like cherry')).toBe(false);
    });

    it('handles empty pattern in fixed mode', async () => {
      const opts = parseArgs(['-F', '-e', '', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('any line matches')).toBe(true);
      expect(m.test('')).toBe(true);
    });

    it('handles inverted match (-v) in fixed mode', async () => {
      const opts = parseArgs(['-F', '-v', 'bad', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('good line')).toBe(true);
      expect(m.test('bad line')).toBe(false);
    });
  });

  describe('RegexMatcher (-G and -E)', () => {
    it('matches BRE regexes', async () => {
      const opts = parseArgs(['-G', 'a\\+b\\?', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('aaab')).toBe(true);
      expect(m.test('b')).toBe(false);
    });

    it('matches ERE regexes with alternation', async () => {
      const opts = parseArgs(['-E', 'foo|bar', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('foo')).toBe(true);
      expect(m.test('bar')).toBe(true);
      expect(m.test('baz')).toBe(false);
    });

    it('finds non-overlapping match ranges for -o', async () => {
      const opts = parseArgs(['-E', '[0-9]+', 'dummy']);
      const m = await createMatcher(opts);
      const ranges = m.findMatches('foo 123 bar 4567 baz');
      expect(ranges).toEqual([
        { start: 4, end: 7, text: '123' },
        { start: 12, end: 16, text: '4567' },
      ]);
    });

    it('throws RegexSyntaxError on unclosed bracket', async () => {
      const opts = parseArgs(['-E', '[unclosed', 'dummy']);
      await expect(createMatcher(opts)).rejects.toThrow(RegexSyntaxError);
    });
  });

  describe('PCRE2 Matcher (-P)', () => {
    it('supports positive and negative lookaround', async () => {
      const opts = parseArgs(['-P', '(?<=user=)\\w+', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('login: user=alice session=1')).toBe(true);
      expect(m.test('login: guest=bob')).toBe(false);

      const ranges = m.findMatches('user=admin user=root');
      expect(ranges.map(r => r.text)).toEqual(['admin', 'root']);
    });

    it('supports named groups and lookahead', async () => {
      const opts = parseArgs(['-P', '\\d+(?=px)', 'dummy']);
      const m = await createMatcher(opts);
      expect(m.test('width: 120px')).toBe(true);
      expect(m.test('width: 100em')).toBe(false);
    });

    it('throws RegexSyntaxError on invalid PCRE pattern', async () => {
      const opts = parseArgs(['-P', '(?P<invalid', 'dummy']);
      await expect(createMatcher(opts)).rejects.toThrow(RegexSyntaxError);
    });
  });
});
