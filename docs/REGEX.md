# Regular Expression Engines and Matching Semantics in `grept`

`grept` supports four distinct regex and string matching modes corresponding to GNU grep:

1. **Basic Regular Expressions (`-G`, `--basic-regexp`)** [Default]
2. **Extended Regular Expressions (`-E`, `--extended-regexp`)**
3. **Fixed Strings (`-F`, `--fixed-strings`)**
4. **Perl-Compatible Regular Expressions (`-P`, `--perl-regexp`)**

---

## 1. Engine Modes

### Basic Regular Expressions (BRE, `-G`)
In GNU Basic Regular Expression mode:
- Meta-characters `?`, `+`, `{`, `}`, `|`, `(`, and `)` are treated as ordinary literal characters.
- To activate their special meaning, they must be backslash-escaped:
  - `\?` : Zero or one occurrence
  - `\+` : One or more occurrences
  - `\{m,n\}` : Between `m` and `n` occurrences
  - `\|` : Alternation (OR)
  - `\(` and `\)` : Capturing groups
- Unescaped `.` matches any character except newline (unless `-z` is enabled).
- `^` anchors to the start of the line; `$` anchors to the end.
- `*` matches zero or more occurrences of the preceding element.
- Backreferences `\1` through `\9` refer back to matched groups.

### Extended Regular Expressions (ERE, `-E`)
In GNU Extended Regular Expression mode:
- Meta-characters `?`, `+`, `{`, `}`, `|`, `(`, and `)` are special operators by default.
- Preceding them with a backslash makes them literal characters.
- Supports POSIX character classes and alternation without backslashes.

### Fixed Strings (`-F`)
- All characters in the pattern are treated as literal characters.
- Fast multi-string search using direct substring matching.
- Avoids regular expression compilation overhead.

### Perl-Compatible Regular Expressions (PCRE, `-P`)
- Backed by WebAssembly-compiled **PCRE2 (10.49+)**.
- Zero native build dependencies; 100% portable on Windows Node.js.
- Supports:
  - Lookahead (`(?=...)`, `(?!...)`) and Lookbehind (`(?<=...)`, `(?<!...)`)
  - Non-capturing groups (`(?:...)`) and Named groups (`(?P<name>...)`)
  - Possessive quantifiers (`*+`, `++`, `?+`) and Atomic groups (`(?>...)`)
  - Unicode character properties (`\p{...}`) and PCRE control verbs
  - Configurable backtracking step limits for ReDoS protection.

---

## 2. POSIX Character Classes

Both BRE and ERE support POSIX character classes within bracket expressions:

| POSIX Class | Matches |
| :--- | :--- |
| `[:alnum:]` | Alphanumeric characters (`[0-9A-Za-z]`) |
| `[:alpha:]` | Alphabetic characters (`[A-Za-z]`) |
| `[:blank:]` | Space and tab characters (`[ \t]`) |
| `[:cntrl:]` | Control characters (`[\x00-\x1F\x7F]`) |
| `[:digit:]` | Digits (`[0-9]`) |
| `[:graph:]` | Non-blank printable characters (`[\x21-\x7E]`) |
| `[:lower:]` | Lowercase letters (`[a-z]`) |
| `[:print:]` | Printable characters including space (`[\x20-\x7E]`) |
| `[:punct:]` | Punctuation characters (`[!-/:-@[-`{-~]`) |
| `[:space:]` | Whitespace characters (`[ \t\r\n\v\f]`) |
| `[:upper:]` | Uppercase letters (`[A-Z]`) |
| `[:xdigit:]` | Hexadecimal digits (`[0-9A-Fa-f]`) |

---

## 3. Word Boundaries and GNU Extensions

- `\b` : Word boundary
- `\B` : Non-word boundary
- `\<` : Start of word boundary (`(?<=\W|^)(?=\w)`)
- `\>` : End of word boundary (`(?<=\w)(?=\W|$)`)
- `\w` : Word character (`[a-zA-Z0-9_]`)
- `\W` : Non-word character (`[^a-zA-Z0-9_]`)
- `\s` : Whitespace character (`[ \t\r\n\v\f]`)
- `\S` : Non-whitespace character

---

## 4. Unicode and Case Folding

- When `-i` (`--ignore-case`) is active, case folding applies across both ASCII and Unicode text.
- Special handling is included for Turkish characters:
  - Capital dotted `İ` (U+0130) and lowercase `i` (U+0069)
  - Capital dotless `I` (U+0049) and lowercase dotless `ı` (U+0131)
- In `-P` mode, `FLAGS.UTF` and `FLAGS.UCP` ensure full Unicode code-point matching.

---

## 5. Security & ReDoS Mitigation

- In PCRE2 mode, execution limits (`matchLimit: 1_000_000`, `depthLimit: 10_000`) prevent runaway backtracking.
- Empty patterns match every line (matching GNU grep behavior).
- Invalid regular expressions emit diagnostic error messages to `stderr` and exit with code `2`.
