import { describe, it, expect } from 'vitest';
import {
  convertBreToJsRegex,
  convertEreToJsRegex,
  applyPatternConstraints,
} from '../../src/core/patterns.js';

describe('Pattern translation (BRE and ERE)', () => {
  describe('BRE conversions', () => {
    it('escapes unescaped operators as literals in BRE', () => {
      // In BRE: + and ? are literals
      const jsPattern = convertBreToJsRegex('a+b?c');
      expect(jsPattern).toBe('a\\+b\\?c');
      const re = new RegExp(jsPattern);
      expect(re.test('a+b?c')).toBe(true);
      expect(re.test('ab')).toBe(false);
    });

    it('treats \\+ and \\? as operators in BRE', () => {
      const jsPattern = convertBreToJsRegex('a\\+b\\?');
      expect(jsPattern).toBe('a+b?');
      const re = new RegExp(jsPattern);
      expect(re.test('aaa')).toBe(true);
      expect(re.test('aaab')).toBe(true);
      expect(re.test('')).toBe(false);
    });

    it('treats \\| as alternation in BRE', () => {
      const jsPattern = convertBreToJsRegex('cat\\|dog');
      expect(jsPattern).toBe('cat|dog');
      const re = new RegExp(jsPattern);
      expect(re.test('I have a cat')).toBe(true);
      expect(re.test('I have a dog')).toBe(true);
      expect(re.test('I have a bird')).toBe(false);
    });

    it('treats \\( \\) as capturing groups in BRE', () => {
      const jsPattern = convertBreToJsRegex('\\(abc\\)');
      expect(jsPattern).toBe('(abc)');
      const re = new RegExp(jsPattern);
      expect(re.test('abc')).toBe(true);
    });

    it('treats \\{m,n\\} as interval quantifiers in BRE', () => {
      const jsPattern = convertBreToJsRegex('a\\{2,4\\}');
      expect(jsPattern).toBe('a{2,4}');
      const re = new RegExp(jsPattern);
      expect(re.test('a')).toBe(false);
      expect(re.test('aa')).toBe(true);
      expect(re.test('aaaa')).toBe(true);
    });

    it('supports word boundary extensions \\< and \\>', () => {
      const jsPattern = convertBreToJsRegex('\\<word\\>');
      const re = new RegExp(jsPattern);
      expect(re.test('a word here')).toBe(true);
      expect(re.test('swordfish')).toBe(false);
      expect(re.test('password')).toBe(false);
    });

    it('expands POSIX character classes inside brackets', () => {
      const jsPattern = convertBreToJsRegex('[[:digit:]][[:alpha:]]');
      const re = new RegExp(jsPattern);
      expect(re.test('3x')).toBe(true);
      expect(re.test('9Z')).toBe(true);
      expect(re.test('ab')).toBe(false);
    });
  });

  describe('ERE conversions', () => {
    it('preserves +, ?, |, () as special operators in ERE', () => {
      const jsPattern = convertEreToJsRegex('(foo|bar)+');
      const re = new RegExp(jsPattern);
      expect(re.test('foo')).toBe(true);
      expect(re.test('barfoobar')).toBe(true);
      expect(re.test('baz')).toBe(false);
    });

    it('escapes \\+, \\? as literals in ERE', () => {
      const jsPattern = convertEreToJsRegex('a\\+b');
      const re = new RegExp(jsPattern);
      expect(re.test('a+b')).toBe(true);
      expect(re.test('ab')).toBe(false);
    });

    it('expands POSIX classes in ERE', () => {
      const jsPattern = convertEreToJsRegex('[[:space:]]+');
      const re = new RegExp(jsPattern);
      expect(re.test('   \t')).toBe(true);
    });
  });

  describe('Pattern constraints (-w and -x)', () => {
    it('applies whole word constraint (-w)', () => {
      const wrapped = applyPatternConstraints('test', true, false);
      const re = new RegExp(wrapped);
      expect(re.test('this is a test.')).toBe(true);
      expect(re.test('testing')).toBe(false);
      expect(re.test('attest')).toBe(false);
    });

    it('applies whole line constraint (-x)', () => {
      const wrapped = applyPatternConstraints('exact line', false, true);
      const re = new RegExp(wrapped);
      expect(re.test('exact line')).toBe(true);
      expect(re.test(' exact line ')).toBe(false);
    });
  });
});
