export const VERSION = '1.0.0';

export function getVersionString(): string {
  return `grept (GNU grep compatible for Windows) ${VERSION}
Copyright (C) 2026 grept contributors.
License MIT <https://opensource.org/licenses/MIT>.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Written for Windows native execution with PCRE2 WebAssembly support.`;
}
