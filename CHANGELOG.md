# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-17

### Added
- Complete Windows-native GNU grep-compatible CLI implementation.
- Support for Basic Regular Expressions (`-G`), Extended Regular Expressions (`-E`), Fixed Strings (`-F`), and Perl-Compatible Regular Expressions (`-P`).
- Native PCRE2 support via WebAssembly (`pcre2-wasm`) with ReDoS protection.
- Full context grouping (`-A`, `-B`, `-C`), overlapping context merging, and `--group-separator`.
- Exact zero-based byte offset calculation (`-b`) in raw binary stream.
- Streaming input architecture with 64KB chunking for low memory footprint on multi-gigabyte files.
- Binary file detection, `--binary-files`, `-a`, `-I`, and null-data mode (`-z`).
- Windows-specific path support (drive letters, UNC paths, spaces, extended-length paths `\\?\...`).
- Recursive directory traversal (`-r`, `-R`, `--follow`) with NTFS junction and symlink cycle detection.
- Fast include/exclude globbing (`--include`, `--exclude`, `--exclude-dir`, `--exclude-from`).
- ANSI terminal color highlighting (`--color=auto|always|never`) with Windows Terminal and `NO_COLOR` support.
- Comprehensive test suite in Vitest and Windows CI workflow.
