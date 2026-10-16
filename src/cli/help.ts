export function getHelpString(): string {
  return `Usage: grept [OPTION]... PATTERNS [FILE]...
Search for PATTERNS in each FILE.
Example: grept -i 'hello world' menu.h main.c

Pattern selection and interpretation:
  -E, --extended-regexp     PATTERNS are extended regular expressions
  -F, --fixed-strings       PATTERNS are strings
  -G, --basic-regexp        PATTERNS are basic regular expressions (default)
  -P, --perl-regexp         PATTERNS are Perl-compatible regular expressions (PCRE2)
  -e, --regexp=PATTERNS     use PATTERNS for matching
  -f, --file=FILE           take PATTERNS from FILE
  -i, --ignore-case         ignore case distinctions in patterns and data
      --no-ignore-case      do not ignore case distinctions (default)
  -v, --invert-match        select non-matching lines
  -w, --word-regexp         match only whole words
  -x, --line-regexp         match only whole lines

Miscellaneous:
  -s, --no-messages         suppress error messages
  -v, --invert-match        select non-matching lines
  -V, --version             display version information and exit
      --help                display this help text and exit

Output control:
  -m, --max-count=NUM       stop after NUM selected lines
  -b, --byte-offset         print the byte offset with output lines
  -n, --line-number         print line number with output lines
      --line-buffered       flush output on every line
  -H, --with-filename       print file name with output lines
  -h, --no-filename         suppress the file name prefix on output
      --label=LABEL         use LABEL as the standard input file name prefix
  -o, --only-matching       show only nonempty parts of lines matching
  -q, --quiet, --silent     suppress all normal output
  -a, --text                equivalent to --binary-files=text
  -I                        equivalent to --binary-files=without-match
      --binary-files=TYPE   assume that binary files are TYPE;
                            TYPE is 'binary', 'text', or 'without-match'
  -c, --count               print only a count of selected lines per FILE
  -l, --files-with-matches  print only names of FILEs with selected lines
  -L, --files-without-match print only names of FILEs with no selected lines
  -Z, --null                print 0 byte after FILE name
  -z, --null-data           a data line ends in 0 byte, not newline
  -T, --initial-tab         make tabs line up (if needed)
      --color[=WHEN],
      --colour[=WHEN]       use markers to highlight the matching strings;
                            WHEN is 'always', 'never', or 'auto'

Context control:
  -B, --before-context=NUM  print NUM lines of leading context
  -A, --after-context=NUM   print NUM lines of trailing context
  -C, --context=NUM         print NUM lines of output context
  -NUM                      same as --context=NUM
      --group-separator=SEP use SEP as a group separator
      --no-group-separator  do not treat group separators specially

File and directory selection:
  -r, --recursive           like --directories=recurse, but do not follow symlinks/junctions
  -R, --dereference-recursive
                            likewise, but follow all directory symlinks and NTFS junctions
      --follow              follow directory symlinks and reparse points
      --include=GLOB        search only files that match GLOB
      --exclude=GLOB        skip files that match GLOB
      --exclude-from=FILE   skip files that match any file pattern from FILE
      --exclude-dir=GLOB    skip directories that match GLOB
      --max-depth=NUM       descend at most NUM directories
  -d, --directories=ACTION  how to handle directories;
                            ACTION is 'read', 'recurse', or 'skip'
  -D, --devices=ACTION      how to handle devices, FIFOs, and sockets;
                            ACTION is 'read' or 'skip'
      --debug               display internal debugging information

When FILE is '-', read standard input. If no FILE is given, recursive searches
examine the working directory '.', while nonrecursive searches read standard input.`;
}
