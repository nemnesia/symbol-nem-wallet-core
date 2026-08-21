#!/usr/bin/env python3
"""Reject invisible Unicode characters in source files.

The check deliberately allows only the ASCII whitespace characters that are
normally meaningful in source files: space, tab, LF, and CR.  Unicode format
characters (including zero-width and bidirectional controls), other control
characters, and non-ASCII whitespace are rejected.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import unicodedata
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_SUFFIXES = frozenset(
    {
        ".c",
        ".cc",
        ".cpp",
        ".cxx",
        ".h",
        ".hh",
        ".hpp",
        ".hxx",
        ".java",
        ".js",
        ".jsx",
        ".kt",
        ".kts",
        ".mjs",
        ".py",
        ".rb",
        ".rs",
        ".sh",
        ".sql",
        ".swift",
        ".ts",
        ".tsx",
        ".zsh",
    }
)
ALLOWED_WHITESPACE = frozenset(" \t\n\r")


def is_invisible(character: str) -> bool:
    """Return whether *character* is not allowed in source text."""

    category = unicodedata.category(character)
    return (
        character not in ALLOWED_WHITESPACE
        and (category.startswith("C") or character.isspace())
    )


def source_path(path: Path) -> bool:
    return path.suffix.lower() in SOURCE_SUFFIXES


def default_paths() -> list[Path]:
    """Return tracked and non-ignored source files in the current worktree."""

    result = subprocess.run(
        [
            "git",
            "-C",
            str(REPO_ROOT),
            "ls-files",
            "--cached",
            "--others",
            "--exclude-standard",
            "-z",
        ],
        check=True,
        capture_output=True,
    )
    paths = {
        REPO_ROOT / relative
        for relative in (
            Path(value.decode("utf-8"))
            for value in result.stdout.split(b"\0")
            if value
        )
    }
    return sorted((path for path in paths if source_path(path)), key=str)


def requested_paths(arguments: list[str]) -> list[Path]:
    paths: set[Path] = set()
    for argument in arguments:
        path = Path(argument)
        if not path.is_absolute():
            path = Path.cwd() / path
        path = path.resolve()
        if path.is_dir():
            paths.update(
                candidate
                for candidate in path.rglob("*")
                if candidate.is_file() and source_path(candidate)
            )
        elif path.is_file():
            paths.add(path)
        else:
            raise FileNotFoundError(path)
    return sorted(paths, key=str)


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def scan_file(path: Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        return [f"{display_path(path)}: invalid UTF-8 ({error})"]

    issues: list[str] = []
    line = 1
    column = 1
    for character in text:
        if is_invisible(character):
            codepoint = f"U+{ord(character):04X}"
            category = unicodedata.category(character)
            name = unicodedata.name(character, "UNNAMED")
            issues.append(
                f"{display_path(path)}:{line}:{column}: "
                f"{codepoint} {name} ({category})"
            )
        if character == "\n":
            line += 1
            column = 1
        else:
            column += 1
    return issues


def main(arguments: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Reject invisible Unicode characters in source files."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        help="files or directories to scan (default: source files in the worktree)",
    )
    options = parser.parse_args(arguments)

    try:
        paths = requested_paths(options.paths) if options.paths else default_paths()
    except (FileNotFoundError, subprocess.CalledProcessError, UnicodeDecodeError) as error:
        print(f"error: could not determine source files: {error}", file=sys.stderr)
        return 2

    issues = [issue for path in paths for issue in scan_file(path)]
    if issues:
        print("Invisible characters found in source files:", file=sys.stderr)
        print("\n".join(issues), file=sys.stderr)
        return 1

    print(f"Checked {len(paths)} source file(s); no invisible characters found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
