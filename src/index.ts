import { parseArgs } from './cli/args.js';
import { getHelpString } from './cli/help.js';
import { getVersionString } from './cli/version.js';
import { runSearch } from './core/search.js';
import { GreptError } from './errors/errors.js';
import { ExitCode } from './errors/exit-codes.js';

export * from './cli/args.js';
export * from './cli/help.js';
export * from './cli/version.js';
export * from './core/search.js';
export * from './core/matcher.js';
export * from './errors/errors.js';
export * from './errors/exit-codes.js';

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const options = parseArgs(argv);

    if (options.help) {
      process.stdout.write(getHelpString() + '\n');
      return ExitCode.MATCH_FOUND;
    }

    if (options.version) {
      process.stdout.write(getVersionString() + '\n');
      return ExitCode.MATCH_FOUND;
    }

    const code = await runSearch(options);
    return code;
  } catch (err: unknown) {
    if (err instanceof GreptError) {
      process.stderr.write(`${err.message}\n`);
      return err.exitCode;
    }
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`grept: ${message}\n`);
    return ExitCode.ERROR;
  }
}

// Only invoke automatically when run as main executable
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('grept.js') ||
    process.argv[1].endsWith('dist/index.js') ||
    process.argv[1].endsWith('dist\\index.js') ||
    process.argv[1].endsWith('src/index.ts') ||
    process.argv[1].endsWith('src\\index.ts'));

if (isMainModule) {
  main().then(code => {
    process.exit(code);
  });
}
