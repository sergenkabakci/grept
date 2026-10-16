# Windows Native Filesystem & Shell Semantics in `grept`

`grept` is designed from the ground up for Windows 10 and 11 environments, prioritizing NTFS characteristics, PowerShell, CMD, and Windows Terminal.

---

## 1. Path Handling

- **Drive-Letter Paths**: Fully supports standard DOS drive paths such as `C:\Projects\App` and forward-slash normalized variants `C:/Projects/App`.
- **Spaces in Paths**: Paths containing whitespace (e.g. `C:\Program Files\App`) are preserved without unescaping corruption.
- **UNC Paths**: Network paths such as `\\server\share\folder` are traversed and reported correctly.
- **Extended-Length Paths**: Paths exceeding 260 characters (`\\?\C:\Very\Deep\...`) are supported natively using Node.js filesystem APIs.
- **Case-Insensitive Filesystem**: Windows file and directory comparisons are case-insensitive by default while preserving display casing in output.

---

## 2. Reparse Points, Junctions & NTFS Symlinks

- **Reparse Points**: NTFS junctions (`IO_REPARSE_TAG_MOUNT_POINT`) and symbolic links are detected via `fs.lstat()`.
- **Traversal Modes**:
  - `-r` (`--recursive`): Recurses normal subdirectories; directory reparse points and symlinks are **not** followed unless passed as command-line arguments.
  - `-R` (`--dereference-recursive`) or `--follow`: Traverses into directory reparse points and symlinks.
- **Cycle Detection**:
  - Traversal maintains a set of canonical target identifiers (`${dev}:${ino}`) and realpaths to detect loops and cyclic junctions.
  - When a loop is detected, traversal logs a warning (suppressed by `-s`) and skips the cycle, avoiding infinite recursion.

---

## 3. Windows Shells & Pipelines

### PowerShell (Windows PowerShell 5.1 & PowerShell 7+)
- PowerShell cmdlets pass objects through the pipeline; when piping text to external executables, PowerShell streams UTF-8 (PowerShell 7) or ANSI/OEM (PowerShell 5.1).
- `grept` automatically handles raw byte streams from stdin without corrupting non-ASCII characters.
- Examples:
  ```powershell
  Get-Content app.log | grept "Error"
  Get-Content -Raw data.bin | grept -z "record"
  ```

### CMD.exe
- Pipes (`type app.log | grept "Error"`) and standard redirection (`grept "Error" < app.log > results.txt`) work seamlessly.

### Console & Color Detection
- Respects `process.stdout.isTTY` and `NO_COLOR`.
- When output is redirected to a file or another command, ANSI color codes are automatically stripped to keep the data clean.
- Windows Virtual Terminal processing is supported across Windows Terminal and conhost.
