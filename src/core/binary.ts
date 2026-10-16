/**
 * Detects whether a buffer contains binary data.
 * In GNU grep, a file is treated as binary if it contains a NUL byte (\0).
 */
export function isBinaryBuffer(buffer: Uint8Array, length: number): boolean {
  const checkLen = Math.min(buffer.length, length, 8192);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}
