# Performance Architecture and Benchmarks in `grept`

`grept` is engineered specifically for fast text searching on modern Windows systems with NVMe and SATA SSDs.

---

## 1. Architectural Highlights

1. **Streaming Input Processing**:
   - Files are read in fixed 64 KB binary chunks rather than loaded entirely into memory.
   - Lines are parsed on-the-fly, bounding peak memory consumption regardless of file size.
   - Dynamic buffer growth safely accommodates long lines without truncation.

2. **One-Time Pattern Compilation**:
   - Regular expressions and string matchers are compiled once during CLI startup and reused across all files and lines.
   - For PCRE2, patterns are compiled into WebAssembly memory once per search session.

3. **Fast Substring Search (`-F`)**:
   - Literal string matching bypasses regex engines completely, using optimized substring searches.
   - Case-insensitive literal matching converts input lines with minimal object churn.

4. **Zero-Allocation Byte Offsets**:
   - Byte offsets (`-b`) are accumulated directly from incoming buffer byte counts rather than recalculating UTF-8 character lengths from string slices.

5. **Early Termination**:
   - `-q` (`--quiet`): Terminates the process immediately upon the first match found, closing open file descriptors cleanly.
   - `-m NUM` (`--max-count`): Halts file scanning as soon as `NUM` matching lines and their after-context are satisfied.
   - `-l` (`--files-with-matches`): Halts scanning the current file on its first match and moves to the next file.

6. **Bounded Memory Footprint**:
   - Heap usage remains under ~15 MB even when scanning multi-gigabyte files.

---

## 2. Benchmark Methodology and Environment

- **Host Operating System**: Windows 11 (x64)
- **Runtime**: Node.js v22.17.1
- **File System**: NTFS
- **Dataset**:
  - Synthetic ~20 MB server application log (140,000 CRLF lines).
  - Nested directory hierarchy containing 500 TypeScript source files across 20 directories.

### Benchmark Results

| Scenario | Execution Time (ms) | Measured Throughput | Matches |
| :--- | :--- | :--- | :--- |
| **Fixed-string search (`-F`)** | ~207 ms | **95.31 MB/s** | 280 |
| **Extended RegEx search (`-E`)** | ~200 ms | **98.67 MB/s** | 280 |
| **Case-insensitive search (`-i`)** | ~350 ms | **56.49 MB/s** | 280 |
| **High-density match count (`-c`)** | ~337 ms | **58.67 MB/s** | 1 (aggregated count) |
| **Recursive 500 files (`-r --include=*.ts`)** | ~401 ms | *I/O bound* | 500 |
| **PCRE2 lookaround search (`-P`)** | ~6.0 s | **3.25 MB/s** (WASM bridge) | 0 |

### Memory Consumption

- **Peak Heap Used**: 12.65 MB
- **Peak RSS**: 154.95 MB (including Node.js V8 runtime + WASM PCRE2 binary)
