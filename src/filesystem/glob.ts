/**
 * Converts a glob pattern (e.g. *.ts, test_??, app.*) to a case-insensitive RegExp.
 */
export function globToRegex(glob: string): RegExp {
  let regexStr = '^';
  let i = 0;
  const len = glob.length;

  while (i < len) {
    const c = glob[i]!;
    if (c === '*') {
      if (i + 1 < len && glob[i + 1] === '*') {
        regexStr += '.*';
        i += 2;
        continue;
      }
      regexStr += '[^/\\\\]*';
      i++;
      continue;
    }
    if (c === '?') {
      regexStr += '[^/\\\\]';
      i++;
      continue;
    }
    if (c === '[') {
      const closeIdx = glob.indexOf(']', i + 1);
      if (closeIdx !== -1) {
        const inner = glob.slice(i + 1, closeIdx);
        regexStr += `[${inner}]`;
        i = closeIdx + 1;
        continue;
      }
    }
    // Escape regex characters
    if (/[.+^${}()|[\]\\]/.test(c)) {
      regexStr += `\\${c}`;
    } else {
      regexStr += c;
    }
    i++;
  }

  regexStr += '$';
  // Windows filenames are case-insensitive
  return new RegExp(regexStr, 'i');
}

/**
 * Checks if a basename or relative path matches any glob in the pattern list.
 */
export function matchesAnyGlob(name: string, globs: string[]): boolean {
  for (const g of globs) {
    if (!g) continue;
    const re = globToRegex(g);
    if (re.test(name)) {
      return true;
    }
  }
  return false;
}
