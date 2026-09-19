#!/usr/bin/env bash
#
# Deploy, with a preflight, and make the deployment say which commit it is.
#
# TWO JOBS, AND THE FIRST ONE IS NEW.
#
# 1. REFUSE TO UPLOAD INTO A WORKER THAT CANNOT RUN. wrangler.jsonc lists every
#    secret this Worker needs under `secrets.required`. Cloudflare's current
#    documentation states that `wrangler deploy` and `wrangler versions upload`
#    validate that list and FAIL when a required secret is missing -- but that
#    behaviour has not been independently exercised against the Wrangler version
#    pinned here, so this check does not lean on it.
#
#    It is defence in depth, and it is not redundant with the built-in check:
#    it verifies the EXACT canonical Worker before upload, asks Cloudflare for
#    remote secret NAMES explicitly, produces a controlled list of any missing,
#    never retrieves or prints a VALUE, and keeps working if Wrangler's
#    behaviour or its diagnostics change.
#
#    The failure it prevents is specific and was live until 2026-09-02:
#    the configuration and deploy script once named different Workers. `wrangler secret put` takes the name from the config
#    file, so secrets went to a Worker that does not exist (the API answers
#    10007) while the application ran somewhere else. Secrets are per-Worker and
#    write-only, so nothing announced it — the first request needing one would
#    just fail. Deploying into an empty Worker is the same failure with a
#    different first symptom.
#
# 2. MAKE THE DEPLOYMENT TRACEABLE. Cloudflare recorded `Source: Unknown` for
#    every deployment this Worker ever had, which made "is master what is
#    running?" answerable only by comparing dates. Three records now, because
#    they fail differently:
#
#      --tag       the short SHA, shown in `wrangler deployments list`
#      --message   the SHA plus subject, for a human reading the dashboard
#      --var       COMMIT_SHA, which /health reports — the only one checkable
#                  from outside against the thing actually serving traffic
#
# THE WORKER NAME IS NOT SET HERE. It comes from wrangler.jsonc and nowhere
# else, so `wrangler deploy`, `wrangler secret put`, `wrangler secret list` and
# `wrangler tail` all agree by construction. Do not reintroduce --name.
#
# A DIRTY TREE IS REFUSED. A deployment tagged with a commit that does not
# describe the deployed code is worse than an untagged one. ALLOW_DIRTY=1
# overrides, for when that is genuinely the intent.
#
# Usage:  npm run deploy
#         SKIP_SECRET_CHECK=1 npm run deploy   (first deploy of a NEW Worker)
#         ALLOW_DIRTY=1 npm run deploy         (deliberately untraceable)
set -euo pipefail

cd "$(dirname "$0")/.."

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "refusing: not a git repository, so nothing can be traced to a commit" >&2
  exit 1
fi

# The single source of truth. Comments are stripped the same way the CI check
# strips them; this is a jsonc file and JSON.parse will not accept it raw.
WORKER_NAME="$(node -e '
  const fs = require("fs");
  const raw = fs.readFileSync("wrangler.jsonc", "utf8").replace(/^\s*\/\/.*$/gm, "");
  process.stdout.write(JSON.parse(raw).name);
')"
REQUIRED="$(node -e '
  const fs = require("fs");
  const raw = fs.readFileSync("wrangler.jsonc", "utf8").replace(/^\s*\/\/.*$/gm, "");
  const c = JSON.parse(raw);
  process.stdout.write(((c.secrets || {}).required || []).join(" "));
')"

SHA="$(git rev-parse HEAD)"
SHORT="$(git rev-parse --short HEAD)"
SUBJECT="$(git log -1 --format=%s)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ -n "$(git status --porcelain)" ]; then
  if [ "${ALLOW_DIRTY:-0}" != "1" ]; then
    echo "refusing: the working tree has uncommitted changes." >&2
    echo "  Deploying now would tag the build ${SHORT}, which is NOT what would ship." >&2
    echo "  Commit them, or re-run with ALLOW_DIRTY=1 to deploy untraceably on purpose." >&2
    git status --short >&2
    exit 1
  fi
  echo "WARNING: deploying a DIRTY tree. The tag ${SHORT} does not describe what ships."
  SUBJECT="[dirty] ${SUBJECT}"
fi

if ! git branch -r --contains HEAD 2>/dev/null | grep -q .; then
  echo "WARNING: ${SHORT} is not on any remote branch — nobody else can resolve this SHA."
fi

# ---- preflight: does the target have every secret it needs? ---------------
if [ "${SKIP_SECRET_CHECK:-0}" != "1" ] && [ -n "${REQUIRED}" ]; then
  echo "Checking secrets on ${WORKER_NAME}…"

  # NAMES ONLY. `wrangler secret list` never returns values, and nothing here
  # prints one. A deploy script that could echo a secret is a deploy script
  # that will, into a CI log, eventually.
  if ! PRESENT="$(npx wrangler secret list 2>/dev/null | grep -oE '"name": "[A-Za-z0-9_]+"' | sed 's/.*: "//;s/"//')"; then
    echo "refusing: could not list secrets for '${WORKER_NAME}'." >&2
    echo "  Either the Worker does not exist yet, or this token cannot read it." >&2
    echo "  For the FIRST deploy of a genuinely new Worker: SKIP_SECRET_CHECK=1 npm run deploy" >&2
    exit 1
  fi

  MISSING=""
  for name in ${REQUIRED}; do
    printf '%s\n' "${PRESENT}" | grep -qx "${name}" || MISSING="${MISSING} ${name}"
  done

  if [ -n "${MISSING}" ]; then
    echo "refusing: '${WORKER_NAME}' is missing required secrets:" >&2
    for name in ${MISSING}; do echo "    ${name}" >&2; done
    echo >&2
    echo "  Set each with:  npx wrangler secret put <NAME>" >&2
    echo "  (no --name: the target comes from wrangler.jsonc, which says '${WORKER_NAME}')" >&2
    echo >&2
    echo "  Deploying without them would upload code that cannot serve a request" >&2
    echo "  it needs one for, and nothing would announce it." >&2
    exit 1
  fi
  echo "  all $(printf '%s\n' ${REQUIRED} | wc -w | tr -d ' ') required secrets present"
fi

echo
echo "Deploying ${WORKER_NAME}"
echo "  commit  ${SHA}"
echo "  branch  ${BRANCH}"
echo "  subject ${SUBJECT}"
echo

exec npx wrangler deploy \
  --tag "${SHORT}" \
  --message "${SHA} ${SUBJECT}" \
  --var "COMMIT_SHA:${SHA}" \
  "$@"
