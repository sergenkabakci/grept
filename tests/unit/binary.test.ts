import { describe, it, expect } from 'vitest';
import { isBinaryBuffer } from '../../src/core/binary.js';
import { detectEncoding } from '../../src/core/encoding.js';

describe('Binary and encoding detection', () => {
  it('detects binary buffers with NUL bytes', () => {
    const bin = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6f]); // 'Hel\0o'
    expect(isBinaryBuffer(bin, bin.length)).toBe(true);

    const txt = Buffer.from('Plain ASCII and UTF-8 text string');
    expect(isBinaryBuffer(txt, txt.length)).toBe(false);
  });

  it('detects UTF-8 with BOM', () => {
    const bomUtf8 = Buffer.from([0xef, 0xbb, 0xbf, 0x41, 0x42]);
    const res = detectEncoding(bomUtf8, bomUtf8.length);
    expect(res.encoding).toBe('utf-8');
    expect(res.bomLength).toBe(3);
  });

  it('detects UTF-16 LE and BE with BOM', () => {
    const le = Buffer.from([0xff, 0xfe, 0x41, 0x00]);
    expect(detectEncoding(le, le.length)).toEqual({ encoding: 'utf-16le', bomLength: 2 });

    const be = Buffer.from([0xfe, 0xff, 0x00, 0x41]);
    expect(detectEncoding(be, be.length)).toEqual({ encoding: 'utf-16be', bomLength: 2 });
  });
});
