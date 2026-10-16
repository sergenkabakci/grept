const POSIX_CLASSES: Record<string, string> = {
  '[:alnum:]': 'a-zA-Z0-9',
  '[:alpha:]': 'a-zA-Z',
  '[:blank:]': ' \\t',
  '[:cntrl:]': '\\x00-\\x1F\\x7F',
  '[:digit:]': '0-9',
  '[:graph:]': '\\x21-\\x7E',
  '[:lower:]': 'a-z',
  '[:print:]': '\\x20-\\x7E',
  '[:punct:]': '!-/:-@\\[-`{-~',
  '[:space:]': ' \\t\\r\\n\\v\\f',
  '[:upper:]': 'A-Z',
  '[:xdigit:]': '0-9A-Fa-f',
};

/**
 * Expands POSIX bracket classes inside a bracket expression [...].
 */
function expandPosixInBracket(content: string): string {
  let result = content;
  for (const [posix, expanded] of Object.entries(POSIX_CLASSES)) {
    result = result.replaceAll(posix, expanded);
  }
  return result;
}

/**
 * Converts GNU Basic Regular Expression (BRE) to JS RegExp pattern.
 */
export function convertBreToJsRegex(bre: string): string {
  let result = '';
  let i = 0;
  const len = bre.length;

  while (i < len) {
    const c = bre[i]!;

    // Escaped sequence
    if (c === '\\') {
      if (i + 1 >= len) {
        // Trailing backslash
        result += '\\\\';
        i++;
        break;
      }
      const next = bre[i + 1]!;
      if (next === '<') {
        result += '(?:(?<=\\W|^)(?=\\w))';
        i += 2;
        continue;
      }
      if (next === '>') {
        result += '(?:(?<=\\w)(?=\\W|$))';
        i += 2;
        continue;
      }
      if (next === '(' || next === ')' || next === '+' || next === '?' || next === '|') {
        // In BRE, \(, \), \+, \?, \| are regex operators
        result += next;
        i += 2;
        continue;
      }
      if (next === '{') {
        // In BRE, \{m,n\} is an interval quantifier
        const closeIdx = bre.indexOf('\\}', i + 2);
        if (closeIdx !== -1) {
          const inner = bre.slice(i + 2, closeIdx);
          if (/^\d+(?:,\d*)?$/.test(inner)) {
            result += `{${inner}}`;
            i = closeIdx + 2;
            continue;
          }
        }
        result += '\\{';
        i += 2;
        continue;
      }
      if (next === '}') {
        result += '\\}';
        i += 2;
        continue;
      }
      if (next >= '1' && next <= '9') {
        // Backreference \1 through \9
        result += `\\${next}`;
        i += 2;
        continue;
      }
      if (
        next === 'b' ||
        next === 'B' ||
        next === 'w' ||
        next === 'W' ||
        next === 's' ||
        next === 'S' ||
        next === 'd' ||
        next === 'D'
      ) {
        result += `\\${next}`;
        i += 2;
        continue;
      }
      // Any other escaped char: escape it literally
      result += `\\${next}`;
      i += 2;
      continue;
    }

    // Bracket expressions [...]
    if (c === '[') {
      let j = i + 1;
      if (j < len && (bre[j] === '^' || bre[j] === '!')) {
        j++;
      }
      if (j < len && bre[j] === ']') {
        j++;
      }
      while (j < len && bre[j] !== ']') {
        // Check for [:class:] inside brackets
        if (bre.startsWith('[:', j)) {
          const closePosix = bre.indexOf(':]', j + 2);
          if (closePosix !== -1) {
            j = closePosix + 2;
            continue;
          }
        }
        j++;
      }
      if (j < len && bre[j] === ']') {
        // Found complete bracket expression
        const bracketContent = bre.slice(i + 1, j);
        const expanded = expandPosixInBracket(bracketContent);
        result += `[${expanded}]`;
        i = j + 1;
        continue;
      }
    }

    // Unescaped operators in BRE are literals!
    if (c === '(' || c === ')' || c === '+' || c === '?' || c === '|' || c === '{' || c === '}') {
      result += `\\${c}`;
      i++;
      continue;
    }

    result += c;
    i++;
  }

  return result;
}

/**
 * Converts GNU Extended Regular Expression (ERE) to JS RegExp pattern.
 */
export function convertEreToJsRegex(ere: string): string {
  let result = '';
  let i = 0;
  const len = ere.length;

  while (i < len) {
    const c = ere[i]!;

    if (c === '\\') {
      if (i + 1 >= len) {
        result += '\\\\';
        i++;
        break;
      }
      const next = ere[i + 1]!;
      if (next === '<') {
        result += '(?:(?<=\\W|^)(?=\\w))';
        i += 2;
        continue;
      }
      if (next === '>') {
        result += '(?:(?<=\\w)(?=\\W|$))';
        i += 2;
        continue;
      }
      result += `\\${next}`;
      i += 2;
      continue;
    }

    // Bracket expressions [...]
    if (c === '[') {
      let j = i + 1;
      if (j < len && (ere[j] === '^' || ere[j] === '!')) {
        j++;
      }
      if (j < len && ere[j] === ']') {
        j++;
      }
      while (j < len && ere[j] !== ']') {
        if (ere.startsWith('[:', j)) {
          const closePosix = ere.indexOf(':]', j + 2);
          if (closePosix !== -1) {
            j = closePosix + 2;
            continue;
          }
        }
        j++;
      }
      if (j < len && ere[j] === ']') {
        const bracketContent = ere.slice(i + 1, j);
        const expanded = expandPosixInBracket(bracketContent);
        result += `[${expanded}]`;
        i = j + 1;
        continue;
      }
    }

    result += c;
    i++;
  }

  return result;
}

/**
 * Escapes a literal string for inclusion in a RegExp pattern.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Applies -w (word) and -x (line) constraints to a regex pattern string.
 */
export function applyPatternConstraints(
  patternStr: string,
  wordRegexp: boolean,
  lineRegexp: boolean,
): string {
  let res = patternStr;
  if (wordRegexp) {
    res = `(?:\\b|(?<=\\W)|^)(?:${res})(?:\\b|(?=\\W)|$)`;
  }
  if (lineRegexp) {
    res = `^(?:${res})$`;
  }
  return res;
}
