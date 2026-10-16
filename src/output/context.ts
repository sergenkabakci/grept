import type { LineItem } from '../core/line-reader.js';

export interface ContextLine {
  item: LineItem;
  isMatch: boolean;
  needsGroupSeparatorBefore: boolean;
}

export class ContextManager {
  private beforeCount: number;
  private afterCount: number;
  private beforeBuffer: LineItem[] = [];
  private afterRemaining = 0;
  private lastPrintedLineNum = 0;
  private hasPrintedAnyGroup = false;

  constructor(beforeCount: number, afterCount: number) {
    this.beforeCount = beforeCount;
    this.afterCount = afterCount;
  }

  /**
   * Processes a line. Yields lines that should be emitted to output.
   */
  *processLine(item: LineItem, isMatch: boolean): Generator<ContextLine, void, undefined> {
    if (isMatch) {
      // Check before context
      const beforeToPrint: LineItem[] = [];
      for (const b of this.beforeBuffer) {
        if (b.lineNum > this.lastPrintedLineNum) {
          beforeToPrint.push(b);
        }
      }

      const firstLineNum = beforeToPrint.length > 0 ? beforeToPrint[0]!.lineNum : item.lineNum;
      const needsSeparator = this.hasPrintedAnyGroup && firstLineNum > this.lastPrintedLineNum + 1;

      // Yield before context lines
      for (let i = 0; i < beforeToPrint.length; i++) {
        const b = beforeToPrint[i]!;
        yield {
          item: b,
          isMatch: false,
          needsGroupSeparatorBefore: i === 0 ? needsSeparator : false,
        };
        this.lastPrintedLineNum = b.lineNum;
      }

      // Yield match line
      const matchNeedsSeparator =
        beforeToPrint.length === 0 &&
        this.hasPrintedAnyGroup &&
        item.lineNum > this.lastPrintedLineNum + 1;

      yield {
        item,
        isMatch: true,
        needsGroupSeparatorBefore: matchNeedsSeparator,
      };

      this.lastPrintedLineNum = item.lineNum;
      this.hasPrintedAnyGroup = true;
      this.afterRemaining = this.afterCount;
      this.beforeBuffer = [];
      return;
    }

    // Not a match
    if (this.afterRemaining > 0) {
      this.afterRemaining--;
      if (item.lineNum > this.lastPrintedLineNum) {
        yield {
          item,
          isMatch: false,
          needsGroupSeparatorBefore: false,
        };
        this.lastPrintedLineNum = item.lineNum;
      }
    }

    // Store in circular beforeBuffer
    if (this.beforeCount > 0) {
      if (this.beforeBuffer.length >= this.beforeCount) {
        this.beforeBuffer.shift();
      }
      this.beforeBuffer.push(item);
    }
  }

  reset(): void {
    this.beforeBuffer = [];
    this.afterRemaining = 0;
    this.lastPrintedLineNum = 0;
    this.hasPrintedAnyGroup = false;
  }
}
