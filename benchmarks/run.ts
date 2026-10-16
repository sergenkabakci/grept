import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseArgs } from '../dist/cli/args.js';
import { runSearch } from '../dist/core/search.js';
import { OutputWriter } from '../dist/output/writer.js';

class NullWriter extends OutputWriter {
  public matchCount = 0;
  constructor() {
    super(process.stdout, process.stderr, false, false);
  }
  override writeLine(): void {
    this.matchCount++;
  }
  override writeError(): void {}
}

const benchDir = path.resolve('benchmarks/data');
const largeLogFile = path.join(benchDir, 'large_sample.log');
const nestedDir = path.join(benchDir, 'nested_tree');

async function setupBenchmarkFixtures(): Promise<void> {
  if (!fs.existsSync(benchDir)) {
    fs.mkdirSync(benchDir, { recursive: true });
  }

  // Generate 20MB log file if not exists
  if (!fs.existsSync(largeLogFile)) {
    console.log('Generating synthetic 20MB log file...');
    const ws = fs.createWriteStream(largeLogFile, { encoding: 'utf8' });
    const logLine =
      '2026-10-17 01:23:45.678 [INFO] [WorkerThread-4] com.example.service.UserService - User authentication succeeded for user_id=123456 ip=192.168.1.50\r\n';
    const errLine =
      '2026-10-17 01:23:46.123 [ERROR] [WorkerThread-2] com.example.service.Database - ConnectionTimeoutException: Unable to acquire connection from pool\r\n';

    // 20MB is roughly 140,000 lines
    for (let i = 0; i < 140000; i++) {
      if (i % 500 === 0) {
        ws.write(errLine);
      } else {
        ws.write(logLine);
      }
    }
    ws.end();
    await new Promise<void>(resolve => ws.on('finish', resolve));
  }

  // Generate 500 small files in deep directories
  if (!fs.existsSync(nestedDir)) {
    console.log('Generating 500 nested files in directory tree...');
    fs.mkdirSync(nestedDir, { recursive: true });
    for (let i = 0; i < 20; i++) {
      const subDir = path.join(nestedDir, `level_${i % 5}`, `sub_${i}`);
      fs.mkdirSync(subDir, { recursive: true });
      for (let j = 0; j < 25; j++) {
        const filePath = path.join(subDir, `file_${j}.ts`);
        const content = `// Component ${i}_${j}\nexport const Component_${i}_${j} = () => {\n  const [state, setState] = useState(0);\n  return <div>Component ${i} ${j}</div>;\n};\n`;
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

async function runBenchmark(): Promise<void> {
  await setupBenchmarkFixtures();

  console.log('\n======================================================');
  console.log('           grept Performance Benchmark Suite           ');
  console.log('======================================================\n');

  const stat = fs.statSync(largeLogFile);
  const sizeMB = stat.size / (1024 * 1024);
  console.log(`Log File Size: ${sizeMB.toFixed(2)} MB`);

  const results: Array<{ scenario: string; durationMs: number; throughputMBs: string; matches: number }> = [];

  // Scenario 1: Fixed-string search (-F)
  {
    const writer = new NullWriter();
    const opts = parseArgs(['-F', 'ConnectionTimeoutException', largeLogFile]);
    const t0 = performance.now();
    await runSearch(opts, writer);
    const dur = performance.now() - t0;
    const mbps = (sizeMB / (dur / 1000)).toFixed(2);
    results.push({ scenario: 'Fixed-string search (-F)', durationMs: dur, throughputMBs: `${mbps} MB/s`, matches: writer.matchCount });
  }

  // Scenario 2: Extended RegEx search (-E)
  {
    const writer = new NullWriter();
    const opts = parseArgs(['-E', 'Connection(Timeout|Refused)Exception', largeLogFile]);
    const t0 = performance.now();
    await runSearch(opts, writer);
    const dur = performance.now() - t0;
    const mbps = (sizeMB / (dur / 1000)).toFixed(2);
    results.push({ scenario: 'Extended RegEx search (-E)', durationMs: dur, throughputMBs: `${mbps} MB/s`, matches: writer.matchCount });
  }

  // Scenario 3: PCRE2 search (-P)
  {
    const writer = new NullWriter();
    const opts = parseArgs(['-P', '(?<=\\[ERROR\\]\\s)[\\w.]+', largeLogFile]);
    const t0 = performance.now();
    await runSearch(opts, writer);
    const dur = performance.now() - t0;
    const mbps = (sizeMB / (dur / 1000)).toFixed(2);
    results.push({ scenario: 'PCRE2 lookaround search (-P)', durationMs: dur, throughputMBs: `${mbps} MB/s`, matches: writer.matchCount });
  }

  // Scenario 4: Case-insensitive search (-i)
  {
    const writer = new NullWriter();
    const opts = parseArgs(['-i', 'connectiontimeoutexception', largeLogFile]);
    const t0 = performance.now();
    await runSearch(opts, writer);
    const dur = performance.now() - t0;
    const mbps = (sizeMB / (dur / 1000)).toFixed(2);
    results.push({ scenario: 'Case-insensitive search (-i)', durationMs: dur, throughputMBs: `${mbps} MB/s`, matches: writer.matchCount });
  }

  // Scenario 5: High match density (counting all log lines)
  {
    const writer = new NullWriter();
    const opts = parseArgs(['-c', '2026', largeLogFile]);
    const t0 = performance.now();
    await runSearch(opts, writer);
    const dur = performance.now() - t0;
    const mbps = (sizeMB / (dur / 1000)).toFixed(2);
    results.push({ scenario: 'High-density match count (-c)', durationMs: dur, throughputMBs: `${mbps} MB/s`, matches: writer.matchCount });
  }

  // Scenario 6: Recursive traversal over 500 nested files
  {
    const writer = new NullWriter();
    const opts = parseArgs(['-r', '--include=*.ts', 'useState', nestedDir]);
    const t0 = performance.now();
    await runSearch(opts, writer);
    const dur = performance.now() - t0;
    results.push({ scenario: 'Recursive 500 files (-r --include=*.ts)', durationMs: dur, throughputMBs: 'N/A (I/O bound)', matches: writer.matchCount });
  }

  // Print results table
  console.table(
    results.map(r => ({
      Scenario: r.scenario,
      'Time (ms)': r.durationMs.toFixed(2),
      Throughput: r.throughputMBs,
      Matches: r.matches,
    })),
  );

  const mem = process.memoryUsage();
  console.log(`Peak RSS Memory: ${(mem.rss / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Heap Used: ${(mem.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
  console.log('\nBenchmark completed successfully.\n');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
