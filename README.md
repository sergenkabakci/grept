# `grept` — Windows-Native GNU grep-Compatible CLI

A production-ready, high-performance command-line text search utility designed specifically for Windows 10 and Windows 11. `grept` reproduces GNU grep's command-line interface, options, and matching semantics as closely as possible without requiring WSL, Git Bash, MSYS2, Cygwin, or native compilation.

[![Windows CI](https://github.com/sergenkabakci/grept/actions/workflows/ci.yml/badge.svg)](https://github.com/sergenkabakci/grept/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **GNU grep Command-Line Compatibility**: Full support for standard pattern flags, output formatting, byte offsets, context controls, and recursive traversal.
- **Four Regex Engines**:
  - `-G`, `--basic-regexp`: Basic Regular Expressions (GNU BRE syntax, default).
  - `-E`, `--extended-regexp`: Extended Regular Expressions (POSIX ERE syntax).
  - `-F`, `--fixed-strings`: High-speed literal substring matching.
  - `-P`, `--perl-regexp`: WebAssembly-compiled PCRE2 engine supporting lookahead, lookbehind, atomic groups, and ReDoS protection.
- **Windows-Native Semantics**:
  - Handles DOS drive paths (`C:\...`), UNC network paths (`\\server\share\...`), and extended-length paths (`\\?\...`).
  - Traverses NTFS file systems with cycle detection across symbolic links and NTFS junction points.
  - Native support for Windows CRLF (`\r\n`), LF, and missing final newline endings.
  - Case-insensitive Windows file system and glob matching.
- **Streaming & Memory Efficiency**:
  - 64 KB chunked streaming avoids loading entire files into memory; memory footprint remains bounded under 15 MB even on gigabyte-sized files.
- **Accurate Byte Offsets (`-b`)**:
  - Measures raw byte positions in the input stream (properly accounting for multi-byte UTF-8 sequences and CRLF delimiters).
- **PowerShell and CMD Pipeline Integration**:
  - Streams data cleanly through PowerShell (`Get-Content app.log | grept "error"`) and CMD (`type app.log | grept "error"`).
- **Zero Native Build Dependencies**:
  - Written in TypeScript and runs on Node.js 20+; uses pure WebAssembly for PCRE2.

---

## Installation

### Global Installation
```powershell
npm install -g grept
```

### On-Demand Execution (No install required)
```powershell
npx grept --version
```

---

## Usage Examples

### Tested PowerShell Examples
```powershell
# Basic search in a log file
grept "error" app.log

# Case-insensitive search with line numbers
grept -in "exception" app.log

# Recursive search from current directory
grept -rn "TODO" .

# Recursive search restricted to TypeScript files
grept -rn --include="*.ts" "useEffect" src

# Exclude directories from recursive search
grept -rn --exclude-dir=node_modules --exclude-dir=.git "TODO" .

# Output 3 lines of context around matches
grept -n -C 3 "Exception" app.log

# Extended regular expression search
grept -E "ERROR|WARNING|CRITICAL" app.log

# Fixed string search with Windows paths containing spaces
grept -F "C:\Program Files" config.txt

# List only files containing matches
grept -l "database" *.log

# Count total matching lines
grept -c "ERROR" *.log

# Pipeline search from PowerShell Get-Content
Get-Content app.log | grept "error"

# Null-delimited data search
Get-Content -Raw app.log | grept -z "error"
```

---

## Option Reference

### Pattern Selection
- `-E`, `--extended-regexp`: Interpret patterns as extended regular expressions.
- `-F`, `--fixed-strings`: Interpret patterns as fixed strings.
- `-G`, `--basic-regexp`: Interpret patterns as basic regular expressions (default).
- `-P`, `--perl-regexp`: Interpret patterns as Perl-compatible regular expressions (PCRE2).
- `-e PATTERN`, `--regexp=PATTERN`: Specify matching pattern (can be used multiple times).
- `-f FILE`, `--file=FILE`: Read patterns from file, one per line.
- `-i`, `--ignore-case`: Case-insensitive matching (including Turkish `İ`/`i` and `I`/`ı`).
- `-v`, `--invert-match`: Select non-matching lines.
- `-w`, `--word-regexp`: Match only whole words.
- `-x`, `--line-regexp`: Match only entire lines.

### Matching Control
- `-m NUM`, `--max-count=NUM`: Stop after `NUM` selected lines.
- `--line-buffered`: Flush output on every line.
- `-a`, `--text`: Process binary files as text.
- `-I`: Ignore binary files (treat as non-matching).
- `--binary-files=TYPE`: Specify binary handling (`binary`, `text`, `without-match`).

### Output Control
- `-b`, `--byte-offset`: Print 0-based byte offset of each output line.
- `-n`, `--line-number`: Print 1-based line number.
- `-H`, `--with-filename`: Print filename prefix for each match.
- `-h`, `--no-filename`: Suppress filename prefix.
- `--label=LABEL`: Use `LABEL` as standard input filename prefix.
- `-o`, `--only-matching`: Print only matching parts of lines.
- `-q`, `--quiet`, `--silent`: Exit immediately with status 0 upon finding a match.
- `-s`, `--no-messages`: Suppress error messages for nonexistent or unreadable files.
- `-c`, `--count`: Output only count of matching lines per file.
- `-l`, `--files-with-matches`: Output filenames of files containing matches.
- `-L`, `--files-without-match`: Output filenames of files containing no matches.
- `-Z`, `--null`: Print NUL (`\0`) byte instead of colon after filename.
- `-z`, `--null-data`: Input and output lines end in NUL byte instead of newline.
- `-T`, `--initial-tab`: Align output lines using a leading tab.
- `--color[=WHEN]`: Highlight matches (`never`, `always`, `auto`).

### Context Control
- `-B NUM`, `--before-context=NUM`: Print `NUM` lines of leading context.
- `-A NUM`, `--after-context=NUM`: Print `NUM` lines of trailing context.
- `-C NUM`, `--context=NUM`, `-NUM`: Print `NUM` lines of before and after context.
- `--group-separator=SEP`: Context group separator (default `--`).
- `--no-group-separator`: Suppress group separator.

### File and Directory Selection
- `-r`, `--recursive`: Recurse subdirectories (does not follow directory symlinks/junctions).
- `-R`, `--dereference-recursive`: Recurse subdirectories and dereference directory symlinks/junctions.
- `--follow`: Follow directory symlinks and reparse points.
- `--include=GLOB`: Search only files matching `GLOB`.
- `--exclude=GLOB`: Skip files matching `GLOB`.
- `--exclude-from=FILE`: Skip files matching glob patterns read from `FILE`.
- `--exclude-dir=GLOB`: Skip directories matching `GLOB`.
- `--max-depth=NUM`: Limit traversal to `NUM` directory levels.
- `-d ACTION`, `--directories=ACTION`: Directory handling (`read`, `recurse`, `skip`).
- `-D ACTION`, `--devices=ACTION`: Device handling (`read`, `skip`).

---

## Exit Codes

- `0`: One or more selected lines or matches were found.
- `1`: No lines were selected.
- `2`: An error occurred (e.g. invalid regex syntax, unreadable file without `-s`).

---

## Detailed Documentation

- [GNU grep Compatibility Matrix](docs/COMPATIBILITY.md)
- [Regex Engines & Matching Semantics](docs/REGEX.md)
- [Windows File System & Shell Notes](docs/WINDOWS.md)
- [Performance Architecture & Benchmarks](docs/PERFORMANCE.md)

---

## License

MIT © [grept contributors](LICENSE)
