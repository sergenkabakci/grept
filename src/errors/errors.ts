import { ExitCode, type ExitCodeType } from './exit-codes.js';

export class GreptError extends Error {
  public readonly exitCode: ExitCodeType;
  public readonly isFileError: boolean;

  constructor(message: string, exitCode: ExitCodeType = ExitCode.ERROR, isFileError = false) {
    super(message);
    this.name = 'GreptError';
    this.exitCode = exitCode;
    this.isFileError = isFileError;
  }
}

export class ArgumentError extends GreptError {
  constructor(message: string) {
    super(`grept: ${message}`, ExitCode.ERROR, false);
    this.name = 'ArgumentError';
  }
}

export class RegexSyntaxError extends GreptError {
  constructor(message: string) {
    super(`grept: ${message}`, ExitCode.ERROR, false);
    this.name = 'RegexSyntaxError';
  }
}

export class FileSystemError extends GreptError {
  public readonly path: string;

  constructor(path: string, message: string) {
    super(`grept: ${path}: ${message}`, ExitCode.ERROR, true);
    this.name = 'FileSystemError';
    this.path = path;
  }
}
