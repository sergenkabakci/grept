# GNU grep Compatibility Matrix

This document details the compatibility of `grept` with GNU `grep` (GNU grep 3.11 specification).
Each option supported or evaluated is categorized into one of four states:
- **Fully supported**: Matches GNU grep specification and behavior.
- **Partially supported**: Functional on Windows with specific architectural differences documented.
- **Unsupported**: Not implemented with technical justification.
- **Not applicable on Windows**: Concept or option is specific to POSIX environments (e.g., POSIX device inodes or TTY ioctls not present on Win32).

---

## 1. Pattern Selection Options

| Option | Long Option | Status | Notes / Behavioral Differences |
| :--- | :--- | :--- | :--- |
| `-E` | `--extended-regexp` | **Fully supported** | Interprets patterns as POSIX Extended Regular Expressions (ERE). Unescaped `?`, `+`, `{`, `}`, `\|`, `(`, `)` are special operators. |
| `-F` | `--fixed-strings` | **Fully supported** | Interprets patterns as fixed strings (literal matching). Extremely fast multi-string matching. |
| `-G` | `--basic-regexp` | **Fully supported** | Interprets patterns as POSIX Basic Regular Expressions (BRE, default). `?`, `+`, `{`, `}`, `\|`, `(`, `)` are literals unless escaped. |
| `-P` | `--perl-regexp` | **Fully supported** | Interprets patterns as Perl-compatible regular expressions using WebAssembly-compiled PCRE2. Supports lookarounds, atomic groups, Unicode properties. |
| `-e PATTERN` | `--regexp=PATTERN` | **Fully supported** | Specifies matching pattern. Multiple `-e` options are combined (logical OR). Protects patterns beginning with `-`. |
| `-f FILE` | `--file=FILE` | **Fully supported** | Obtains patterns from file, one per line. Empty pattern lines match any input line. |
| `-i`, `-y` | `--ignore-case` | **Fully supported** | Case-insensitive matching across ASCII and Unicode characters (including Turkish dotted/dotless I). |
| `--no-ignore-case` | `--no-ignore-case` | **Fully supported** | Resets case-insensitive matching if previously specified. |
| `-v` | `--invert-match` | **Fully supported** | Inverts the sense of matching, to select non-matching lines. |
| `-w` | `--word-regexp` | **Fully supported** | Selects only those lines containing matches that form whole words (bounded by word/non-word boundaries). |
| `-x` | `--line-regexp` | **Fully supported** | Selects only those matches that exactly match the whole line. |

---

## 2. Matching Control Options

| Option | Long Option | Status | Notes / Behavioral Differences |
| :--- | :--- | :--- | :--- |
| `-m NUM` | `--max-count=NUM` | **Fully supported** | Stop reading a file after `NUM` matching lines. If context is specified, trailing context is printed. |
| `--line-buffered` | `--line-buffered` | **Fully supported** | Flushes output after every line. Useful for real-time streaming in PowerShell and CMD pipelines. |
| `-a` | `--text` | **Fully supported** | Process binary files as if they were text; equivalent to `--binary-files=text`. |
| `-I` | *(none)* | **Fully supported** | Process a binary file as if it did not contain any matches; equivalent to `--binary-files=without-match`. |
| `-U` | `--binary` | **Fully supported** | Treat input file as binary data, reading verbatim without CR/LF translation. |
| *(none)* | `--binary-files=TYPE` | **Fully supported** | `TYPE` can be `binary`, `text`, or `without-match`. In `binary` mode, matches output `Binary file <NAME> matches`. |

---

## 3. General Output Control Options

| Option | Long Option | Status | Notes / Behavioral Differences |
| :--- | :--- | :--- | :--- |
| `-c` | `--count` | **Fully supported** | Suppress normal output; instead print a count of matching lines for each input file. |
| `--color[=WHEN]` | `--colour[=WHEN]` | **Fully supported** | `WHEN` may be `never`, `always`, or `auto`. Respects `NO_COLOR` env var and Windows Terminal / conhost capabilities. |
| `-L` | `--files-without-match` | **Fully supported** | Suppress normal output; print the name of each input file from which no output would have normally been produced. |
| `-l` | `--files-with-matches` | **Fully supported** | Suppress normal output; print the name of each input file with matches (stops scanning upon first match). |
| `-o` | `--only-matching` | **Fully supported** | Print only the matched (non-empty) parts of a matching line, each on a separate output line. |
| `-q` | `--quiet`, `--silent` | **Fully supported** | Quiet mode. Exit immediately with zero status if any match is found, even if an error was detected. |
| `-s` | `--no-messages` | **Fully supported** | Suppress error messages about nonexistent or unreadable files. Argument errors still reported. |

---

## 4. Output Line Prefix Control Options

| Option | Long Option | Status | Notes / Behavioral Differences |
| :--- | :--- | :--- | :--- |
| `-b` | `--byte-offset` | **Fully supported** | Print the 0-based byte offset within the input file before each line of output. With `-o`, prints offset of match. |
| `-H` | `--with-filename` | **Fully supported** | Print the file name for each match. Default when searching multiple files or recursive directories. |
| `-h` | `--no-filename` | **Fully supported** | Suppress the prefixing of file names on output. Default when searching a single file or stdin. |
| `--label=LABEL` | *(none)* | **Fully supported** | Display input from standard input as if it came from file `LABEL`. |
| `-n` | `--line-number` | **Fully supported** | Prefix each line of output with the 1-based line number within its input file. |
| `-T` | `--initial-tab` | **Fully supported** | Pad prefix with a tab so that line content aligns across lines with varying number widths. |
| `-u` | `--unix-byte-offsets` | **Fully supported** | Report Unix-style byte offsets as if the file were Unix text (CRLF `\r\n` pairs are counted as 1 byte `\n` instead of 2 bytes). Matches GNU grep on MS-Windows. |
| `-Z` | `--null` | **Fully supported** | Output a zero byte (`NUL`) instead of the character that normally follows a file name (e.g. `:`). |
| `-z` | `--null-data` | **Fully supported** | Treat input and output data as sequences of lines, each terminated by a zero byte (`NUL`) instead of a newline. |

---

## 5. Context Control Options

| Option | Long Option | Status | Notes / Behavioral Differences |
| :--- | :--- | :--- | :--- |
| `-A NUM` | `--after-context=NUM` | **Fully supported** | Print `NUM` lines of trailing context after matching lines. Overlapping contexts are merged. |
| `-B NUM` | `--before-context=NUM` | **Fully supported** | Print `NUM` lines of leading context before matching lines. Overlapping contexts are merged. |
| `-C NUM`, `-NUM` | `--context=NUM` | **Fully supported** | Print `NUM` lines of leading and trailing context. |
| *(none)* | `--group-separator=SEP` | **Fully supported** | Use `SEP` as group separator between contiguous groups of matches. Default is `--`. |
| *(none)* | `--no-group-separator` | **Fully supported** | Suppress the group separator between contiguous groups of matches. |

---

## 6. File and Directory Selection Options

| Option | Long Option | Status | Notes / Behavioral Differences |
| :--- | :--- | :--- | :--- |
| `-r` | `--recursive` | **Fully supported** | Read all files under each directory recursively. Follows symbolic links only if they are on the command line. |
| `-R` | `--dereference-recursive` | **Fully supported** | Recurse directories and dereference directory symbolic links / NTFS junctions, with cycle detection. |
| `--follow` | *(none)* | **Fully supported** | Follow symlinks and reparse points during traversal. |
| `--include=GLOB` | *(none)* | **Fully supported** | Search only files whose base name matches `GLOB` (case-insensitive on Windows). |
| `--exclude=GLOB` | *(none)* | **Fully supported** | Skip any command-line file with a name suffix that matches the pattern `GLOB`. |
| `--exclude-from=FILE` | *(none)* | **Fully supported** | Skip files whose base name matches any of the file-name globs read from `FILE`. |
| `--exclude-dir=GLOB` | *(none)* | **Fully supported** | Skip directories matching `GLOB`. By default skips `node_modules`, `.git`, and hidden directories. |
| `--max-depth=NUM` | *(none)* | **Fully supported** | Descend at most `NUM` directory levels below command-line targets. |
| `-d ACTION` | `--directories=ACTION` | **Fully supported** | If input is a directory, `ACTION` is `read`, `recurse`, or `skip`. |
| `-D ACTION` | `--devices=ACTION` | **Fully supported** | If input file is a device, FIFO, or socket, `ACTION` can be `read` or `skip`. |

---

## 7. Other Options

| Option | Long Option | Status | Notes / Behavioral Differences |
| :--- | :--- | :--- | :--- |
| `--mmap` | *(none)* | **Fully supported (no-op)** | Deprecated and ignored in GNU grep 3.8+; accepted safely without error for CLI script compatibility. |
| `--debug` | *(none)* | **Fully supported** | Output internal debugging diagnostics regarding regex parsing, matching, and traversal. |
| `--help` | *(none)* | **Fully supported** | Display comprehensive help message and exit with 0. |
| `-V` | `--version` | **Fully supported** | Display version information and exit with 0. |

---

## Exit Status

- `0`: Selected lines or matches were found.
- `1`: No lines or matches were found.
- `2`: An error occurred (e.g., invalid regex syntax, unreadable file without `-s`, invalid option).
- In `-q` mode, if a match is found, exit code is always `0`.
