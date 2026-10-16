import { describe, it, expect } from 'vitest';
import { ContextManager, type ContextLine } from '../../src/output/context.js';
import type { LineItem } from '../../src/core/line-reader.js';

function makeLine(lineNum: number, text: string): LineItem {
  return {
    text,
    lineNum,
    byteOffset: (lineNum - 1) * 10,
    hasNewline: true,
    delimiterBytes: 1,
  };
}

describe('Context Manager (-A, -B, -C)', () => {
  it('yields leading and trailing context for isolated match', () => {
    const cm = new ContextManager(1, 1);
    const output: ContextLine[] = [];

    const lines = [
      makeLine(1, 'line 1'),
      makeLine(2, 'line 2 (match)'),
      makeLine(3, 'line 3'),
      makeLine(4, 'line 4'),
    ];

    for (const l of lines) {
      const isMatch = l.lineNum === 2;
      for (const res of cm.processLine(l, isMatch)) {
        output.push(res);
      }
    }

    expect(output.map(o => `${o.item.lineNum}:${o.isMatch ? 'M' : 'C'}`)).toEqual([
      '1:C',
      '2:M',
      '3:C',
    ]);
  });

  it('smoothly merges overlapping context windows without duplicating lines', () => {
    const cm = new ContextManager(1, 1);
    const output: ContextLine[] = [];

    // Matches at line 2 and line 4 -> context around line 2 is [1, 2, 3]; context around line 4 is [3, 4, 5].
    // Line 3 is shared; it must only be emitted once!
    const lines = [
      makeLine(1, 'line 1'),
      makeLine(2, 'MATCH 1'),
      makeLine(3, 'shared line 3'),
      makeLine(4, 'MATCH 2'),
      makeLine(5, 'line 5'),
      makeLine(6, 'line 6'),
    ];

    for (const l of lines) {
      const isMatch = l.lineNum === 2 || l.lineNum === 4;
      for (const res of cm.processLine(l, isMatch)) {
        output.push(res);
      }
    }

    const emittedNums = output.map(o => o.item.lineNum);
    expect(emittedNums).toEqual([1, 2, 3, 4, 5]);

    // Ensure no group separator was requested since groups touch
    const separators = output.filter(o => o.needsGroupSeparatorBefore);
    expect(separators).toHaveLength(0);
  });

  it('flags group separator before non-contiguous match group', () => {
    const cm = new ContextManager(1, 1);
    const output: ContextLine[] = [];

    // Match at line 2 and line 10
    const lines = [
      makeLine(1, 'line 1'),
      makeLine(2, 'MATCH 1'),
      makeLine(3, 'line 3'),
      makeLine(4, 'line 4'),
      makeLine(5, 'line 5'),
      makeLine(6, 'line 6'),
      makeLine(7, 'line 7'),
      makeLine(8, 'line 8'),
      makeLine(9, 'line 9'),
      makeLine(10, 'MATCH 2'),
      makeLine(11, 'line 11'),
    ];

    for (const l of lines) {
      const isMatch = l.lineNum === 2 || l.lineNum === 10;
      for (const res of cm.processLine(l, isMatch)) {
        output.push(res);
      }
    }

    const emittedNums = output.map(o => o.item.lineNum);
    expect(emittedNums).toEqual([1, 2, 3, 9, 10, 11]);

    const sepLine = output.find(o => o.needsGroupSeparatorBefore);
    expect(sepLine?.item.lineNum).toBe(9);
  });
});
