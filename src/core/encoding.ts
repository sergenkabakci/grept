export type DetectedEncoding = 'utf-8' | 'utf-16le' | 'utf-16be';

export interface EncodingDetectionResult {
  encoding: DetectedEncoding;
  bomLength: number;
}

/**
 * Checks for byte-order marks (BOM) in the initial chunk.
 */
export function detectEncoding(buffer: Uint8Array, length: number): EncodingDetectionResult {
  if (length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { encoding: 'utf-8', bomLength: 3 };
  }
  if (length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return { encoding: 'utf-16le', bomLength: 2 };
  }
  if (length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return { encoding: 'utf-16be', bomLength: 2 };
  }
  return { encoding: 'utf-8', bomLength: 0 };
}
