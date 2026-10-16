export const ExitCode = {
  MATCH_FOUND: 0,
  NO_MATCH: 1,
  ERROR: 2,
} as const;

export type ExitCodeType = (typeof ExitCode)[keyof typeof ExitCode];
