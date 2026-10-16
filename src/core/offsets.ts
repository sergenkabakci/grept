/**
 * Computes exact byte offset of a match within a UTF-8 line string.
 */
export function getMatchByteOffset(
  lineByteOffset: number,
  lineText: string,
  matchCharIndex: number,
): number {
  if (matchCharIndex <= 0) {
    return lineByteOffset;
  }
  const prefix = lineText.slice(0, matchCharIndex);
  return lineByteOffset + Buffer.byteLength(prefix, 'utf8');
}
