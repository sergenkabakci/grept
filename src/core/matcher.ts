import { createPCRE2, FLAGS, type PCRE2 } from 'pcre2-wasm';
import { RegexSyntaxError } from '../errors/errors.js';
import type { CliOptions } from '../cli/args.js';
import { convertBreToJsRegex, convertEreToJsRegex, applyPatternConstraints } from './patterns.js';

export interface MatchRange {
  start: number;
  end: number;
  text: string;
}

export interface Matcher {
  test(line: string): boolean;
  findMatches(line: string): MatchRange[];
}

export function turkishCaseFold(s: string): string {
  return s
    .replace(/\u0130/g, 'i')
    .replace(/I/g, '\u0131')
    .toLowerCase();
}

function isWordChar(char: string | undefined): boolean {
  if (!char) return false;
  return /^[a-zA-Z0-9_]$/.test(char);
}

function passesWordBoundary(line: string, start: number, end: number): boolean {
  const prevChar = start > 0 ? line[start - 1] : undefined;
  const nextChar = end < line.length ? line[end] : undefined;
  return !isWordChar(prevChar) && !isWordChar(nextChar);
}

/**
 * Matcher for -F (fixed-strings)
 */
export class FixedMatcher implements Matcher {
  private patterns: string[];
  private ignoreCase: boolean;
  private invertMatch: boolean;
  private wordRegexp: boolean;
  private lineRegexp: boolean;
  private hasEmptyPattern: boolean;

  constructor(options: CliOptions) {
    this.patterns = options.patterns;
    this.ignoreCase = options.ignoreCase;
    this.invertMatch = options.invertMatch;
    this.wordRegexp = options.wordRegexp;
    this.lineRegexp = options.lineRegexp;
    this.hasEmptyPattern = options.patterns.some(p => p.length === 0);
  }

  test(line: string): boolean {
    const rawMatch = this.rawTest(line);
    return this.invertMatch ? !rawMatch : rawMatch;
  }

  private rawTest(line: string): boolean {
    if (this.hasEmptyPattern) {
      if (this.lineRegexp) {
        return line.length === 0;
      }
      return true;
    }

    if (this.lineRegexp) {
      for (const pat of this.patterns) {
        if (this.ignoreCase) {
          if (turkishCaseFold(line) === turkishCaseFold(pat)) return true;
        } else {
          if (line === pat) return true;
        }
      }
      return false;
    }

    if (this.wordRegexp) {
      return this.findMatches(line).length > 0;
    }

    // Substring match
    const searchTarget = this.ignoreCase ? turkishCaseFold(line) : line;
    for (const pat of this.patterns) {
      const searchPat = this.ignoreCase ? turkishCaseFold(pat) : pat;
      if (searchTarget.includes(searchPat)) {
        return true;
      }
    }
    return false;
  }

  findMatches(line: string): MatchRange[] {
    if (this.invertMatch) {
      return [];
    }

    const ranges: MatchRange[] = [];

    if (this.hasEmptyPattern) {
      if (this.lineRegexp) {
        if (line.length === 0) {
          return [{ start: 0, end: 0, text: '' }];
        }
      } else {
        return [{ start: 0, end: 0, text: '' }];
      }
    }

    if (this.lineRegexp) {
      for (const pat of this.patterns) {
        const matches = this.ignoreCase
          ? turkishCaseFold(line) === turkishCaseFold(pat)
          : line === pat;
        if (matches) {
          return [{ start: 0, end: line.length, text: line }];
        }
      }
      return [];
    }

    const searchTarget = this.ignoreCase ? turkishCaseFold(line) : line;

    for (const pat of this.patterns) {
      if (pat.length === 0) continue;
      const searchPat = this.ignoreCase ? turkishCaseFold(pat) : pat;
      let pos = 0;
      while (pos <= searchTarget.length - searchPat.length) {
        const found = searchTarget.indexOf(searchPat, pos);
        if (found === -1) break;
        const end = found + searchPat.length;
        if (!this.wordRegexp || passesWordBoundary(line, found, end)) {
          ranges.push({
            start: found,
            end,
            text: line.slice(found, end),
          });
        }
        pos = found + 1; // permit overlapping scan then deduplicate
      }
    }

    return mergeAndDeduplicateRanges(ranges);
  }
}

/**
 * Matcher for -G (BRE) and -E (ERE)
 */
export class RegexMatcher implements Matcher {
  private regexes: RegExp[];
  private invertMatch: boolean;
  private hasEmptyPattern: boolean;

  constructor(options: CliOptions) {
    this.invertMatch = options.invertMatch;
    this.hasEmptyPattern = options.patterns.some(p => p.length === 0);
    this.regexes = [];

    const flags = options.ignoreCase ? 'giu' : 'gu';

    for (const rawPat of options.patterns) {
      let converted: string;
      if (options.regexMode === 'basic') {
        converted = convertBreToJsRegex(rawPat);
      } else {
        converted = convertEreToJsRegex(rawPat);
      }

      if (options.ignoreCase) {
        // Expand Turkish dotted/dotless I
        converted = converted
          .replace(/(?<!\\)i/g, '(?:i|\u0130)')
          .replace(/(?<!\\)\u0130/g, '(?:\u0130|i)')
          .replace(/(?<!\\)I/g, '(?:I|\u0131)')
          .replace(/(?<!\\)\u0131/g, '(?:\u0131|I)');
      }

      const patternStr = applyPatternConstraints(converted, options.wordRegexp, options.lineRegexp);

      try {
        const re = new RegExp(patternStr, flags);
        this.regexes.push(re);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new RegexSyntaxError(`invalid regular expression '${rawPat}': ${msg}`);
      }
    }
  }

  test(line: string): boolean {
    const rawMatch = this.rawTest(line);
    return this.invertMatch ? !rawMatch : rawMatch;
  }

  private rawTest(line: string): boolean {
    if (this.hasEmptyPattern) {
      return true;
    }
    for (const re of this.regexes) {
      re.lastIndex = 0;
      if (re.test(line)) {
        return true;
      }
    }
    return false;
  }

  findMatches(line: string): MatchRange[] {
    if (this.invertMatch) {
      return [];
    }

    if (this.hasEmptyPattern) {
      return [{ start: 0, end: 0, text: '' }];
    }

    const ranges: MatchRange[] = [];
    for (const re of this.regexes) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        ranges.push({
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
        });
        if (m[0].length === 0) {
          re.lastIndex++; // advance past empty match to avoid infinite loop
        }
      }
    }

    return mergeAndDeduplicateRanges(ranges);
  }
}

/**
 * Matcher for -P (PCRE2 using pcre2-wasm)
 */
export class PcreMatcher implements Matcher {
  private pcre2: PCRE2;
  private patterns: string[];
  private invertMatch: boolean;
  private hasEmptyPattern: boolean;
  private flags: number;

  constructor(pcre2: PCRE2, options: CliOptions) {
    this.pcre2 = pcre2;
    this.invertMatch = options.invertMatch;
    this.hasEmptyPattern = options.patterns.some(p => p.length === 0);

    let flagMask = FLAGS.UTF | FLAGS.UCP;
    if (options.ignoreCase) {
      flagMask |= FLAGS.CASELESS;
    }
    this.flags = flagMask;

    this.patterns = [];
    for (const rawPat of options.patterns) {
      let pat = rawPat;
      if (options.ignoreCase) {
        pat = pat
          .replace(/(?<!\\)i/g, '(?:i|\u0130)')
          .replace(/(?<!\\)\u0130/g, '(?:\u0130|i)')
          .replace(/(?<!\\)I/g, '(?:I|\u0131)')
          .replace(/(?<!\\)\u0131/g, '(?:\u0131|I)');
      }
      if (options.wordRegexp) {
        pat = `(?:\\b|(?<=\\W)|^)(?:${pat})(?:\\b|(?=\\W)|$)`;
      }
      if (options.lineRegexp) {
        pat = `^(?:${pat})$`;
      }

      // Verify compilation
      try {
        const compiled = this.pcre2.compile(pat, this.flags);
        compiled.destroy();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new RegexSyntaxError(`invalid Perl regular expression '${rawPat}': ${msg}`);
      }
      this.patterns.push(pat);
    }
  }

  test(line: string): boolean {
    const rawMatch = this.rawTest(line);
    return this.invertMatch ? !rawMatch : rawMatch;
  }

  private rawTest(line: string): boolean {
    if (this.hasEmptyPattern) {
      return true;
    }
    for (const pat of this.patterns) {
      try {
        if (this.pcre2.test(pat, line, this.flags, { matchLimit: 1_000_000, depthLimit: 10_000 })) {
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  }

  findMatches(line: string): MatchRange[] {
    if (this.invertMatch) {
      return [];
    }

    if (this.hasEmptyPattern) {
      return [{ start: 0, end: 0, text: '' }];
    }

    const ranges: MatchRange[] = [];
    for (const pat of this.patterns) {
      try {
        const matches = this.pcre2.matchAll(pat, line, this.flags);
        for (const m of matches) {
          ranges.push({
            start: m.index,
            end: m.index + m.match.length,
            text: m.match,
          });
        }
      } catch {
        // matchLimit or regex evaluation error
      }
    }

    return mergeAndDeduplicateRanges(ranges);
  }
}

/**
 * Merges overlapping and duplicate match ranges in ascending start position.
 */
function mergeAndDeduplicateRanges(ranges: MatchRange[]): MatchRange[] {
  if (ranges.length <= 1) {
    return ranges;
  }

  // Sort by start position ascending, then end descending (prefer longer matches)
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const result: MatchRange[] = [];
  let current = ranges[0]!;

  for (let i = 1; i < ranges.length; i++) {
    const next = ranges[i]!;
    if (next.start < current.end) {
      // Overlapping match: extend current if next ends later
      if (next.end > current.end) {
        current = {
          start: current.start,
          end: next.end,
          text: current.text + next.text.slice(current.end - next.start),
        };
      }
    } else {
      result.push(current);
      current = next;
    }
  }
  result.push(current);

  return result;
}

/**
 * Creates the appropriate Matcher based on CliOptions.
 */
export async function createMatcher(options: CliOptions): Promise<Matcher> {
  if (options.regexMode === 'fixed') {
    return new FixedMatcher(options);
  }
  if (options.regexMode === 'pcre') {
    const pcre2 = await createPCRE2();
    return new PcreMatcher(pcre2, options);
  }
  // 'basic' (BRE) or 'extended' (ERE)
  return new RegexMatcher(options);
}
