#!/usr/bin/env bash
# One-time label bootstrap. Run LOCALLY with your own gh auth.
# Creates only — never edits or deletes an existing label.
set -euo pipefail
# No default. A missing REPO must fail, never silently target production.
if [ -z "${REPO:-}" ]; then
  echo "REPO is required. Example:" >&2
  echo "  REPO=0xMiden/wallet $0" >&2
  exit 1
fi

create() {
  local name="$1" color="$2" desc="$3"
  if gh label list --repo "$REPO" --limit 200 --json name --jq '.[].name' | grep -Fxq "$name"; then
    echo "exists, skipping: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc"
    echo "created: $name"
  fi
}

create "feedback-form" "0E8A16" "Filed by a user through the Bread feedback form"

# One label, by decision (2026-08-13). The pipeline applies exactly this one:
# its job is provenance, not classification. Platform, error code and
# confidence all live in the issue body's Environment table instead.

echo
echo "Done. This script never runs 'gh label edit' or 'gh label delete'."
echo "Narrow your Claude Code allowlist to match:"
echo '  allow:   Bash(gh label create *), Bash(gh label list *)'
echo '  confirm: gh label delete, gh label edit'
