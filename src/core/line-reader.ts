import type { Readable } from 'node:stream';

export interface LineItem {
  text: string;
  lineNum: number;
  byteOffset: number;
  hasNewline: boolean;
  delimiterBytes: number;
}

export interface LineReaderOptions {
  nullData?: boolean;
  initialChunk?: Buffer;
  unixByteOffsets?: boolean;
}

/**
 * Streams lines from a Node.js Readable stream with zero-based byte offsets.
 * Supports standard LF/CRLF, Unix-style byte offset calculation, and null-delimited (-z) streams.
 */
export async function* readLines(
  stream: Readable,
  options: LineReaderOptions = {},
): AsyncGenerator<LineItem, void, undefined> {
  const nullData = Boolean(options.nullData);
  const delimiterByte = nullData ? 0x00 : 0x0a; // '\0' or '\n'

  let lineNum = 1;
  let currentByteOffset = 0;
  let currentUnixByteOffset = 0;
  let remainder: Buffer = Buffer.alloc(0);

  const processChunk = function* (chunk: Buffer): Generator<LineItem, void, undefined> {
    const combined = remainder.length > 0 ? Buffer.concat([remainder, chunk]) : chunk;
    let searchStart = 0;

    while (searchStart < combined.length) {
      const delimIndex = combined.indexOf(delimiterByte, searchStart);
      if (delimIndex === -1) {
        break;
      }

      // Found delimiter
      let textBytes = combined.subarray(searchStart, delimIndex);
      let delimBytes = 1;

      // In newline mode, strip trailing \r if \r\n
      if (!nullData && textBytes.length > 0 && textBytes[textBytes.length - 1] === 0x0d) {
        textBytes = textBytes.subarray(0, textBytes.length - 1);
        delimBytes = 2; // \r + \n
      }

      const text = textBytes.toString('utf8');
      const item: LineItem = {
        text,
        lineNum: lineNum++,
        byteOffset: options.unixByteOffsets ? currentUnixByteOffset : currentByteOffset,
        hasNewline: true,
        delimiterBytes: delimBytes,
      };

      const lineTotalBytes = delimIndex - searchStart + 1;
      currentByteOffset += lineTotalBytes;
      currentUnixByteOffset += textBytes.length + (delimBytes === 2 ? 1 : delimBytes);
      searchStart = delimIndex + 1;

      yield item;
    }

    remainder = combined.subarray(searchStart);
  };

  // If an initial chunk was provided (e.g. from binary peek), process it first
  if (options.initialChunk && options.initialChunk.length > 0) {
    yield* processChunk(options.initialChunk);
  }

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    yield* processChunk(buf);
  }

  // Handle final line without newline if remainder has content
  if (remainder.length > 0) {
    let textBytes = remainder;
    // Strip trailing \r if present
    if (!nullData && textBytes.length > 0 && textBytes[textBytes.length - 1] === 0x0d) {
      textBytes = textBytes.subarray(0, textBytes.length - 1);
    }
    const text = textBytes.toString('utf8');
    yield {
      text,
      lineNum: lineNum++,
      byteOffset: options.unixByteOffsets ? currentUnixByteOffset : currentByteOffset,
      hasNewline: false,
      delimiterBytes: 0,
    };
  }
}
