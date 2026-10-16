import fs from 'node:fs';
import { ArgumentError } from '../errors/errors.js';
import type { ColorChoice } from '../utils/terminal.js';

export type RegexMode = 'basic' | 'extended' | 'fixed' | 'pcre';
export type BinaryMode = 'binary' | 'text' | 'without-match';
export type DirectoryAction = 'read' | 'recurse' | 'skip';
export type DeviceAction = 'read' | 'skip';

export interface CliOptions {
  // Regex mode
  regexMode: RegexMode;

  // Pattern flags
  ignoreCase: boolean;
  invertMatch: boolean;
  wordRegexp: boolean;
  lineRegexp: boolean;

  // Patterns and sources
  patterns: string[];
  patternFiles: string[];

  // Output control
  maxCount?: number;
  byteOffset: boolean;
  lineNumber: boolean;
  withFilename?: boolean; // undefined = auto (true if >1 file or recursive)
  label?: string;
  onlyMatching: boolean;
  quiet: boolean;
  noMessages: boolean;
  count: boolean;
  filesWithMatches: boolean;
  filesWithoutMatch: boolean;
  initialTab: boolean;
  nullByteFilename: boolean; // -Z
  nullData: boolean; // -z
  lineBuffered: boolean;
  color: ColorChoice;
  unixByteOffsets: boolean;

  // Binary mode
  binaryFiles: BinaryMode;

  // Context
  beforeContext: number;
  afterContext: number;
  groupSeparator: string | null; // null means no group separator

  // Traversal
  recursive: boolean;
  dereferenceRecursive: boolean; // -R or --follow
  includes: string[];
  excludes: string[];
  excludeFrom: string[];
  excludeDirs: string[];
  maxDepth?: number;
  directories: DirectoryAction;
  devices: DeviceAction;

  // Diagnostics
  debug: boolean;
  help: boolean;
  version: boolean;

  // Positional file targets
  targets: string[];
}

export function parseArgs(rawArgs: string[]): CliOptions {
  const options: CliOptions = {
    regexMode: 'basic',
    ignoreCase: false,
    invertMatch: false,
    wordRegexp: false,
    lineRegexp: false,
    patterns: [],
    patternFiles: [],
    byteOffset: false,
    lineNumber: false,
    onlyMatching: false,
    quiet: false,
    noMessages: false,
    count: false,
    filesWithMatches: false,
    filesWithoutMatch: false,
    initialTab: false,
    nullByteFilename: false,
    nullData: false,
    lineBuffered: false,
    color: 'auto',
    unixByteOffsets: false,
    binaryFiles: 'binary',
    beforeContext: 0,
    afterContext: 0,
    groupSeparator: '--',
    recursive: false,
    dereferenceRecursive: false,
    includes: [],
    excludes: [],
    excludeFrom: [],
    excludeDirs: [],
    directories: 'read',
    devices: 'read',
    debug: false,
    help: false,
    version: false,
    targets: [],
  };

  let i = 0;
  let stopOptions = false;
  const positional: string[] = [];

  while (i < rawArgs.length) {
    const arg = rawArgs[i]!;

    if (stopOptions) {
      positional.push(arg);
      i++;
      continue;
    }

    if (arg === '--') {
      stopOptions = true;
      i++;
      continue;
    }

    // Long option
    if (arg.startsWith('--') && arg.length > 2) {
      const eqIdx = arg.indexOf('=');
      const optName = eqIdx === -1 ? arg.slice(2) : arg.slice(2, eqIdx);
      const optVal = eqIdx === -1 ? undefined : arg.slice(eqIdx + 1);

      const getVal = (name: string): string => {
        if (optVal !== undefined) return optVal;
        i++;
        if (i >= rawArgs.length) {
          throw new ArgumentError(`option '--${name}' requires an argument`);
        }
        return rawArgs[i]!;
      };

      const getNumVal = (name: string): number => {
        const valStr = getVal(name);
        const num = Number(valStr);
        if (!Number.isInteger(num) || num < 0) {
          throw new ArgumentError(`invalid context length argument '${valStr}'`);
        }
        return num;
      };

      switch (optName) {
        case 'help':
          options.help = true;
          break;
        case 'version':
          options.version = true;
          break;
        case 'extended-regexp':
          options.regexMode = 'extended';
          break;
        case 'fixed-strings':
          options.regexMode = 'fixed';
          break;
        case 'basic-regexp':
          options.regexMode = 'basic';
          break;
        case 'perl-regexp':
          options.regexMode = 'pcre';
          break;
        case 'regexp':
          options.patterns.push(getVal('regexp'));
          break;
        case 'file':
          options.patternFiles.push(getVal('file'));
          break;
        case 'ignore-case':
          options.ignoreCase = true;
          break;
        case 'no-ignore-case':
          options.ignoreCase = false;
          break;
        case 'invert-match':
          options.invertMatch = true;
          break;
        case 'word-regexp':
          options.wordRegexp = true;
          break;
        case 'line-regexp':
          options.lineRegexp = true;
          break;
        case 'max-count':
          options.maxCount = getNumVal('max-count');
          break;
        case 'byte-offset':
          options.byteOffset = true;
          break;
        case 'line-number':
          options.lineNumber = true;
          break;
        case 'line-buffered':
          options.lineBuffered = true;
          break;
        case 'with-filename':
          options.withFilename = true;
          break;
        case 'no-filename':
          options.withFilename = false;
          break;
        case 'label':
          options.label = getVal('label');
          break;
        case 'only-matching':
          options.onlyMatching = true;
          break;
        case 'quiet':
        case 'silent':
          options.quiet = true;
          break;
        case 'no-messages':
          options.noMessages = true;
          break;
        case 'text':
          options.binaryFiles = 'text';
          break;
        case 'binary':
          options.binaryFiles = 'without-match';
          break;
        case 'binary-files': {
          const type = getVal('binary-files');
          if (type === 'binary' || type === 'text' || type === 'without-match') {
            options.binaryFiles = type;
          } else {
            throw new ArgumentError(`unknown binary-files type '${type}'`);
          }
          break;
        }
        case 'count':
          options.count = true;
          break;
        case 'files-with-matches':
          options.filesWithMatches = true;
          options.filesWithoutMatch = false;
          break;
        case 'files-without-match':
          options.filesWithoutMatch = true;
          options.filesWithMatches = false;
          break;
        case 'initial-tab':
          options.initialTab = true;
          break;
        case 'null':
          options.nullByteFilename = true;
          break;
        case 'null-data':
          options.nullData = true;
          break;
        case 'color':
        case 'colour': {
          let val = optVal;
          if (val === undefined) {
            if (
              i + 1 < rawArgs.length &&
              (rawArgs[i + 1] === 'always' ||
                rawArgs[i + 1] === 'never' ||
                rawArgs[i + 1] === 'auto')
            ) {
              i++;
              val = rawArgs[i];
            } else {
              val = 'auto';
            }
          }
          if (val === 'never' || val === 'always' || val === 'auto') {
            options.color = val;
          } else {
            throw new ArgumentError(`invalid argument '${val}' for '--color'`);
          }
          break;
        }
        case 'before-context':
          options.beforeContext = getNumVal('before-context');
          break;
        case 'after-context':
          options.afterContext = getNumVal('after-context');
          break;
        case 'context': {
          const c = getNumVal('context');
          options.beforeContext = c;
          options.afterContext = c;
          break;
        }
        case 'group-separator':
          options.groupSeparator = getVal('group-separator');
          break;
        case 'no-group-separator':
          options.groupSeparator = null;
          break;
        case 'recursive':
          options.recursive = true;
          options.directories = 'recurse';
          break;
        case 'dereference-recursive':
          options.recursive = true;
          options.dereferenceRecursive = true;
          options.directories = 'recurse';
          break;
        case 'follow':
          options.dereferenceRecursive = true;
          break;
        case 'include':
          options.includes.push(getVal('include'));
          break;
        case 'exclude':
          options.excludes.push(getVal('exclude'));
          break;
        case 'exclude-from':
          options.excludeFrom.push(getVal('exclude-from'));
          break;
        case 'exclude-dir':
          options.excludeDirs.push(getVal('exclude-dir'));
          break;
        case 'max-depth':
          options.maxDepth = getNumVal('max-depth');
          break;
        case 'directories': {
          const d = getVal('directories');
          if (d === 'read' || d === 'recurse' || d === 'skip') {
            options.directories = d;
            if (d === 'recurse') options.recursive = true;
          } else {
            throw new ArgumentError(`invalid argument '${d}' for '--directories'`);
          }
          break;
        }
        case 'devices': {
          const dev = getVal('devices');
          if (dev === 'read' || dev === 'skip') {
            options.devices = dev;
          } else {
            throw new ArgumentError(`invalid argument '${dev}' for '--devices'`);
          }
          break;
        }
        case 'mmap':
          // documented partial support
          break;
        case 'unix-byte-offsets':
          options.unixByteOffsets = true;
          break;
        case 'debug':
          options.debug = true;
          break;
        default:
          throw new ArgumentError(`unrecognized option '--${optName}'`);
      }
      i++;
      continue;
    }

    // Short options or numeric context flag (-3)
    if (arg.startsWith('-') && arg.length > 1) {
      // Check if pure number like -3
      if (/^-\d+$/.test(arg)) {
        const c = parseInt(arg.slice(1), 10);
        options.beforeContext = c;
        options.afterContext = c;
        i++;
        continue;
      }

      let charIdx = 1;
      while (charIdx < arg.length) {
        const char = arg[charIdx]!;

        const getShortVal = (): string => {
          if (charIdx + 1 < arg.length) {
            const val = arg.slice(charIdx + 1);
            charIdx = arg.length; // consumed rest of current arg
            return val;
          }
          i++;
          if (i >= rawArgs.length) {
            throw new ArgumentError(`option requires an argument -- '${char}'`);
          }
          return rawArgs[i]!;
        };

        const getShortNumVal = (): number => {
          const valStr = getShortVal();
          const num = Number(valStr);
          if (!Number.isInteger(num) || num < 0) {
            throw new ArgumentError(`invalid context length argument '${valStr}'`);
          }
          return num;
        };

        switch (char) {
          case 'E':
            options.regexMode = 'extended';
            break;
          case 'F':
            options.regexMode = 'fixed';
            break;
          case 'G':
            options.regexMode = 'basic';
            break;
          case 'P':
            options.regexMode = 'pcre';
            break;
          case 'e':
            options.patterns.push(getShortVal());
            break;
          case 'f':
            options.patternFiles.push(getShortVal());
            break;
          case 'i':
          case 'y':
            options.ignoreCase = true;
            break;
          case 'v':
            options.invertMatch = true;
            break;
          case 'w':
            options.wordRegexp = true;
            break;
          case 'x':
            options.lineRegexp = true;
            break;
          case 'm':
            options.maxCount = getShortNumVal();
            break;
          case 'b':
            options.byteOffset = true;
            break;
          case 'n':
            options.lineNumber = true;
            break;
          case 'H':
            options.withFilename = true;
            break;
          case 'h':
            options.withFilename = false;
            break;
          case 'o':
            options.onlyMatching = true;
            break;
          case 'q':
            options.quiet = true;
            break;
          case 's':
            options.noMessages = true;
            break;
          case 'a':
            options.binaryFiles = 'text';
            break;
          case 'I':
            options.binaryFiles = 'without-match';
            break;
          case 'c':
            options.count = true;
            break;
          case 'l':
            options.filesWithMatches = true;
            options.filesWithoutMatch = false;
            break;
          case 'L':
            options.filesWithoutMatch = true;
            options.filesWithMatches = false;
            break;
          case 'T':
            options.initialTab = true;
            break;
          case 'Z':
            options.nullByteFilename = true;
            break;
          case 'z':
            options.nullData = true;
            break;
          case 'A':
            options.afterContext = getShortNumVal();
            break;
          case 'B':
            options.beforeContext = getShortNumVal();
            break;
          case 'C': {
            const c = getShortNumVal();
            options.beforeContext = c;
            options.afterContext = c;
            break;
          }
          case 'r':
            options.recursive = true;
            options.directories = 'recurse';
            break;
          case 'R':
            options.recursive = true;
            options.dereferenceRecursive = true;
            options.directories = 'recurse';
            break;
          case 'd': {
            const d = getShortVal();
            if (d === 'read' || d === 'recurse' || d === 'skip') {
              options.directories = d;
              if (d === 'recurse') options.recursive = true;
            } else {
              throw new ArgumentError(`invalid argument '${d}' for '-d'`);
            }
            break;
          }
          case 'D': {
            const dev = getShortVal();
            if (dev === 'read' || dev === 'skip') {
              options.devices = dev;
            } else {
              throw new ArgumentError(`invalid argument '${dev}' for '-D'`);
            }
            break;
          }
          case 'V':
            options.version = true;
            break;
          case 'u':
            options.unixByteOffsets = true;
            break;
          case 'U':
            options.binaryFiles = 'text';
            break;
          default:
            throw new ArgumentError(`invalid option -- '${char}'`);
        }
        charIdx++;
      }
      i++;
      continue;
    }

    // Positional argument
    positional.push(arg);
    i++;
  }

  // Load patterns from -f pattern files
  for (const file of options.patternFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split(/\r?\n/);
      // Remove trailing empty line if file ended in newline
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      options.patterns.push(...lines);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ArgumentError(`cannot open pattern file '${file}': ${message}`);
    }
  }

  // If no -e or -f was given, the first positional argument is the pattern
  if (options.patterns.length === 0 && !options.help && !options.version) {
    if (positional.length === 0) {
      // No pattern given
      throw new ArgumentError('missing PATTERNS argument');
    }
    const pat = positional.shift()!;
    // In GNU grep, if the pattern contains multiple lines, each line is an independent pattern
    const patLines = pat.split(/\r?\n/);
    options.patterns.push(...patLines);
  }

  options.targets = positional;
  return options;
}
