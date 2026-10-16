import type { CliOptions } from '../cli/args.js';
import type { MatchRange } from '../core/matcher.js';
import { AnsiColors } from './color.js';
import { getMatchByteOffset } from '../core/offsets.js';

export class OutputFormatter {
  private options: CliOptions;
  private colors: AnsiColors;

  constructor(options: CliOptions, colors: AnsiColors) {
    this.options = options;
    this.colors = colors;
  }

  /**
   * Formats a normal matching or context line.
   */
  formatLine(
    displayPath: string,
    showFilename: boolean,
    lineNum: number,
    byteOffset: number,
    text: string,
    isContext: boolean,
    matchRanges: MatchRange[],
  ): string {
    const sepChar = isContext ? '-' : ':';
    let prefix = '';

    if (showFilename) {
      const coloredFilename = this.colors.filename(displayPath);
      if (this.options.nullByteFilename) {
        prefix += coloredFilename + '\0';
      } else {
        prefix += coloredFilename + this.colors.separator(sepChar);
      }
    }

    if (this.options.lineNumber) {
      const numStr = String(lineNum);
      prefix += this.colors.lineNumber(numStr) + this.colors.separator(sepChar);
    }

    if (this.options.byteOffset) {
      const offsetStr = String(byteOffset);
      prefix += this.colors.byteOffset(offsetStr) + this.colors.separator(sepChar);
    }

    if (this.options.initialTab && prefix.length > 0) {
      prefix += '\t';
    }

    // Apply color highlighting to matched text if not context
    let formattedText = text;
    if (!isContext && matchRanges.length > 0) {
      formattedText = this.highlightMatches(text, matchRanges);
    }

    return prefix + formattedText;
  }

  /**
   * Formats only-matching (-o) output lines.
   */
  formatOnlyMatching(
    displayPath: string,
    showFilename: boolean,
    lineNum: number,
    lineByteOffset: number,
    lineText: string,
    matches: MatchRange[],
  ): string[] {
    const lines: string[] = [];
    const sepChar = ':';

    for (const m of matches) {
      if (m.text.length === 0) continue; // GNU grep ignores empty matches with -o
      let prefix = '';

      if (showFilename) {
        const coloredFilename = this.colors.filename(displayPath);
        if (this.options.nullByteFilename) {
          prefix += coloredFilename + '\0';
        } else {
          prefix += coloredFilename + this.colors.separator(sepChar);
        }
      }

      if (this.options.lineNumber) {
        prefix += this.colors.lineNumber(String(lineNum)) + this.colors.separator(sepChar);
      }

      if (this.options.byteOffset) {
        const matchByteOffset = getMatchByteOffset(lineByteOffset, lineText, m.start);
        prefix += this.colors.byteOffset(String(matchByteOffset)) + this.colors.separator(sepChar);
      }

      if (this.options.initialTab && prefix.length > 0) {
        prefix += '\t';
      }

      const matchText = this.colors.matchedText(m.text);
      lines.push(prefix + matchText);
    }

    return lines;
  }

  /**
   * Highlights match ranges inside text using ANSI sequences.
   */
  private highlightMatches(text: string, ranges: MatchRange[]): string {
    let result = '';
    let lastIdx = 0;

    for (const r of ranges) {
      if (r.start > lastIdx) {
        result += text.slice(lastIdx, r.start);
      }
      result += this.colors.matchedText(text.slice(r.start, r.end));
      lastIdx = Math.max(lastIdx, r.end);
    }

    if (lastIdx < text.length) {
      result += text.slice(lastIdx);
    }

    return result;
  }

  formatBinaryMatch(displayPath: string): string {
    return `Binary file ${displayPath} matches`;
  }

  formatCount(displayPath: string, showFilename: boolean, count: number): string {
    if (showFilename) {
      if (this.options.nullByteFilename) {
        return `${this.colors.filename(displayPath)}\0${count}`;
      }
      return `${this.colors.filename(displayPath)}:${count}`;
    }
    return String(count);
  }

  formatGroupSeparator(): string | null {
    if (this.options.groupSeparator === null) return null;
    return this.colors.groupSeparator(this.options.groupSeparator);
  }
}
