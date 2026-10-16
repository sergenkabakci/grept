export type ColorChoice = 'never' | 'always' | 'auto';

/**
 * Determines whether color escape sequences should be output based on
 * the user option, environment variables (NO_COLOR, TERM), and TTY status.
 */
export function shouldEnableColor(colorChoice: ColorChoice): boolean {
  if (colorChoice === 'never') {
    return false;
  }
  if (colorChoice === 'always') {
    return true;
  }

  // Auto mode
  if (process.env['NO_COLOR'] !== undefined && process.env['NO_COLOR'] !== '') {
    return false;
  }

  if (process.env['TERM'] === 'dumb') {
    return false;
  }

  return Boolean(process.stdout && process.stdout.isTTY);
}
