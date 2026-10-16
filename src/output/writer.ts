let pipeHandlersInstalled = false;

function ensurePipeHandlersInstalled(): void {
  if (pipeHandlersInstalled) return;
  pipeHandlersInstalled = true;

  if (process.stdout && typeof process.stdout.on === 'function') {
    process.stdout.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EPIPE') {
        process.exit(0);
      }
    });
  }
  if (process.stderr && typeof process.stderr.on === 'function') {
    process.stderr.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EPIPE') {
        process.exit(0);
      }
    });
  }
}

export class OutputWriter {
  private stdout: NodeJS.WriteStream;
  private stderr: NodeJS.WriteStream;
  private nullData: boolean;
  public readonly lineBuffered: boolean;

  constructor(
    stdout: NodeJS.WriteStream = process.stdout,
    stderr: NodeJS.WriteStream = process.stderr,
    nullData = false,
    lineBuffered = false,
  ) {
    this.stdout = stdout;
    this.stderr = stderr;
    this.nullData = nullData;
    this.lineBuffered = lineBuffered;

    ensurePipeHandlersInstalled();
  }

  writeLine(line: string): void {
    const endChar = this.nullData ? '\0' : '\n';
    try {
      this.stdout.write(line + endChar);
      if (this.lineBuffered && typeof (this.stdout as any).uncork === 'function') {
        (this.stdout as any).uncork();
      }
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'EPIPE') {
        process.exit(0);
      }
      throw err;
    }
  }

  writeError(message: string): void {
    try {
      this.stderr.write(message + '\n');
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'EPIPE') {
        process.exit(0);
      }
      throw err;
    }
  }
}
