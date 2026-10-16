export class AnsiColors {
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  filename(text: string): string {
    return this.enabled ? `\x1b[35m${text}\x1b[0m` : text;
  }

  lineNumber(text: string): string {
    return this.enabled ? `\x1b[32m${text}\x1b[0m` : text;
  }

  byteOffset(text: string): string {
    return this.enabled ? `\x1b[32m${text}\x1b[0m` : text;
  }

  separator(text: string): string {
    return this.enabled ? `\x1b[36m${text}\x1b[0m` : text;
  }

  matchedText(text: string): string {
    return this.enabled ? `\x1b[1;31m\x1b[K${text}\x1b[m\x1b[K` : text;
  }

  groupSeparator(text: string): string {
    return this.enabled ? `\x1b[36m${text}\x1b[0m` : text;
  }
}
