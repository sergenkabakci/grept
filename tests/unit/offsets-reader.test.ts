import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { readLines, type LineItem } from '../../src/core/line-reader.js';
import { getMatchByteOffset } from '../../src/core/offsets.js';

describe('Streaming line reader and byte offsets', () => {
  it('correctly calculates line byte offsets with LF endings', async () => {
    // "abc\n" (4 bytes) + "defg\n" (5 bytes) + "hi" (2 bytes, no final newline)
    const content = Buffer.from('abc\ndefg\nhi', 'utf8');
    const stream = Readable.from([content]);

    const lines: LineItem[] = [];
    for await (const l of readLines(stream)) {
      lines.push(l);
    }

    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({
      text: 'abc',
      lineNum: 1,
      byteOffset: 0,
      hasNewline: true,
      delimiterBytes: 1,
    });
    expect(lines[1]).toEqual({
      text: 'defg',
      lineNum: 2,
      byteOffset: 4,
      hasNewline: true,
      delimiterBytes: 1,
    });
    expect(lines[2]).toEqual({
      text: 'hi',
      lineNum: 3,
      byteOffset: 9,
      hasNewline: false,
      delimiterBytes: 0,
    });
  });

  it('correctly calculates line byte offsets with Windows CRLF endings', async () => {
    // "hello\r\n" (7 bytes) + "world\r\n" (7 bytes)
    const content = Buffer.from('hello\r\nworld\r\n', 'utf8');
    const stream = Readable.from([content]);

    const lines: LineItem[] = [];
    for await (const l of readLines(stream)) {
      lines.push(l);
    }

    expect(lines).toHaveLength(2);
    expect(lines[0]?.text).toBe('hello');
    expect(lines[0]?.byteOffset).toBe(0);
    expect(lines[0]?.delimiterBytes).toBe(2);

    expect(lines[1]?.text).toBe('world');
    expect(lines[1]?.byteOffset).toBe(7);
    expect(lines[1]?.delimiterBytes).toBe(2);
  });

  it('correctly calculates Unix-style byte offsets with -u when CRLF is present', async () => {
    // "hello\r\n" (7 raw bytes, 6 Unix bytes: 'hello\n')
    // "world\r\n" (7 raw bytes, 6 Unix bytes: 'world\n')
    // "end" (3 raw bytes, 3 Unix bytes)
    const content = Buffer.from('hello\r\nworld\r\nend', 'utf8');
    const stream = Readable.from([content]);

    const lines: LineItem[] = [];
    for await (const l of readLines(stream, { unixByteOffsets: true })) {
      lines.push(l);
    }

    expect(lines).toHaveLength(3);
    expect(lines[0]?.byteOffset).toBe(0);
    expect(lines[1]?.byteOffset).toBe(6);
    expect(lines[2]?.byteOffset).toBe(12);
  });

  it('handles invalid UTF-8 byte sequences gracefully without crashing', async () => {
    const invalidUtf8 = Buffer.from([0x61, 0xff, 0xfe, 0x62, 0x0a]);
    const stream = Readable.from([invalidUtf8]);

    const lines: LineItem[] = [];
    for await (const l of readLines(stream)) {
      lines.push(l);
    }

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toContain('a');
    expect(lines[0]?.text).toContain('b');
  });

  it('handles null-data mode (-z) with NUL delimiter', async () => {
    const content = Buffer.from('first\0second\0third', 'utf8');
    const stream = Readable.from([content]);

    const lines: LineItem[] = [];
    for await (const l of readLines(stream, { nullData: true })) {
      lines.push(l);
    }

    expect(lines).toHaveLength(3);
    expect(lines[0]?.text).toBe('first');
    expect(lines[0]?.byteOffset).toBe(0);
    expect(lines[1]?.text).toBe('second');
    expect(lines[1]?.byteOffset).toBe(6);
    expect(lines[2]?.text).toBe('third');
    expect(lines[2]?.byteOffset).toBe(13);
  });

  it('handles multi-byte UTF-8 match offsets accurately', () => {
    // "Em-dash — test" -> "Em-dash " is 8 bytes, "—" is 3 bytes (E2 80 94), " test" is 5 bytes.
    const lineText = 'Em-dash — test';
    const matchIdx = lineText.indexOf('test'); // character index 10
    const byteOffset = getMatchByteOffset(100, lineText, matchIdx);
    // 100 + 8 + 3 + 1 = 112 bytes
    expect(byteOffset).toBe(112);
  });

  it('handles chunk fragmentation across line boundaries', async () => {
    // Fragment chunks in the middle of words and newlines
    const chunk1 = Buffer.from('first line par');
    const chunk2 = Buffer.from('t\r\nsecond line\r\n');
    const stream = Readable.from([chunk1, chunk2]);

    const lines: LineItem[] = [];
    for await (const l of readLines(stream)) {
      lines.push(l);
    }

    expect(lines).toHaveLength(2);
    expect(lines[0]?.text).toBe('first line part');
    expect(lines[1]?.text).toBe('second line');
  });

  it('handles very large lines exceeding 64KB without truncation', async () => {
    const longString = 'A'.repeat(80000) + '\nB';
    const stream = Readable.from([Buffer.from(longString)]);

    const lines: LineItem[] = [];
    for await (const l of readLines(stream)) {
      lines.push(l);
    }

    expect(lines).toHaveLength(2);
    expect(lines[0]?.text.length).toBe(80000);
    expect(lines[1]?.text).toBe('B');
  });
});
