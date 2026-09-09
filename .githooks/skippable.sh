#!/usr/bin/env bash
#
# Decides whether a set of staged paths can skip the pre-commit checks.
#
# A denylist, not an allowlist. The allowlist this replaced named the
# extensions that *should* run — TypeScript, config, article content — and was
# wrong twice: it omitted .css, so every stylesheet-only commit skipped every
# check, and it would have omitted the next new file type too. Listing what
# ships is a list that grows; listing what does not ship is a list that does
# not.
#
# Exit 0  every path is a doc or a non-shipping asset, checks can be skipped
# Exit 1  at least one path can affect the build, run the checks
#
# Called with the staged paths as arguments. Kept separate from the hook so it
# can be exercised directly by the test suite — the filter is logic now, and
# logic that decides whether tests run is the last thing that should be
# untested.

set -uo pipefail

# Article bodies are .md and absolutely do ship: the fidelity test compares
# them against content-source/, so a change to either side must re-run it.
is_shipping_markdown() {
  case "$1" in
    src/help-center/content/*|content-source/*) return 0 ;;
    *) return 1 ;;
  esac
}

skippable_path() {
  local path="$1"

  # Everything under tasks/ is notes, reports and screenshots.
  case "$path" in
    tasks/*) return 0 ;;
  esac

  # Any other markdown, as long as it is not an article body.
  case "$path" in
    *.md) is_shipping_markdown "$path" && return 1 || return 0 ;;
  esac

  return 1
}

[ "$#" -eq 0 ] && exit 1

for path in "$@"; do
  skippable_path "$path" || exit 1
done

exit 0
