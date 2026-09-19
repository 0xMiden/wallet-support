#!/usr/bin/env python3
"""Prove that a new migration and schema.sql produce the SAME tables.

Production is built by applying migrations in order. A fresh `db:init` is built
by running schema.sql. Nothing forces the two to agree, and when they disagree
nothing complains: dev passes every test against one shape while production runs
the other, until a query touches the column that only exists on one side.

The check: take schema.sql as committed (HEAD), apply every migration added or
changed in the working tree, and compare the resulting tables against schema.sql
as it now stands. They must be identical — same columns, same types, same
nullability, same defaults, same indexes.

Runs as part of the test script, so it cannot rot in a directory nobody looks at.

EVERY TABLE A MIGRATION TOUCHES MUST BE NAMED HERE.
The checker compares only the tables it is given. A table nobody passes gets no
drift protection at all, and gets it silently — which is the same failure this
script exists to prevent, one level up. When a migration adds a table, add it to
the `check:schema` script in package.json in the same commit.

Usage:  npm run check:schema                  (working tree vs HEAD; falls back to HEAD~1)
        python3 scripts/check-schema-drift.py <table> [<table> ...] [--base <ref>]

python3 is a DELIBERATE dependency in an otherwise pure-node package: it ships
with a sqlite3 module, so the comparison runs two real databases rather than
diffing SQL text. Node has no stable equivalent. Do not "fix" this by deleting it.
"""
import sqlite3, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Positionals are TABLES. The base ref is a flag so that adding a second table
# can never be misread as a ref — the old positional form silently treated
# `check-schema-drift.py submissions store_reviews` as "table submissions,
# base ref store_reviews", which fails in a confusing way rather than an
# obvious one.
argv = sys.argv[1:]
BASE = 'HEAD'
TABLES = []
i = 0
while i < len(argv):
    if argv[i] == '--base':
        if i + 1 >= len(argv):
            sys.exit('--base needs a ref')
        BASE = argv[i + 1]
        i += 2
    else:
        TABLES.append(argv[i])
        i += 1
if not TABLES:
    TABLES = ['submissions']


def git(*args: str) -> str:
    r = subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'git {" ".join(args)} failed: {r.stderr.strip()}')
    return r.stdout


def shape(db: sqlite3.Connection, table: str):
    cols = [(r[1], r[2], r[3], r[4]) for r in db.execute(f'PRAGMA table_info({table})')]
    idx = sorted(r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? "
        "AND name NOT LIKE 'sqlite_%'", (table,)))
    return cols, idx


# Migrations this working tree adds or changes on top of BASE.
#
# UNTRACKED FILES COUNT. A brand-new migration is untracked until it is staged,
# and `git diff` does not see it — so a checker built on diff alone passes
# silently on exactly the commit it exists to check. Ask git for both.
changed = sorted({
    line for line in (
        git('diff', '--name-only', '--diff-filter=ACM', BASE, '--', 'migrations/').split()
        + git('ls-files', '--others', '--exclude-standard', '--', 'migrations/').split()
    ) if line.endswith('.sql')
})
if not changed and BASE == 'HEAD':
    # Nothing uncommitted. Check the most recent COMMITTED migration change
    # instead, so running this after a commit still verifies something. A gate
    # that answers "nothing to compare, exit 0" to someone who ran it expecting
    # a verdict is the silent pass coming back through a different door.
    BASE = 'HEAD~1'
    changed = sorted({
        line for line in git('diff', '--name-only', '--diff-filter=ACM', BASE, 'HEAD', '--', 'migrations/').split()
        if line.endswith('.sql')
    })
    if changed:
        print(f'Working tree adds no migration; checking HEAD instead.')

if not changed:
    print(f'No migration changes in the working tree or in HEAD — nothing to compare.')
    sys.exit(0)

# A — the production path: committed schema, then the new migrations.
migrated = sqlite3.connect(':memory:')
migrated.executescript(git('show', f'{BASE}:schema.sql'))
FROM_HEAD = BASE == 'HEAD~1'
for m in sorted(changed):
    sql = git('show', f'HEAD:{m}') if FROM_HEAD else (ROOT / m).read_text()
    try:
        migrated.executescript(sql)
    except sqlite3.Error as e:
        sys.exit(f'❌ {m} is not valid SQL against the {BASE} schema: {e}')

# B — the fresh-init path: schema.sql as it now stands.
# ALWAYS the working tree's schema.sql -- that is what `db:init` would actually
# run. Reading it from a ref instead would let an uncommitted edit to schema.sql
# slip past whenever the migration itself is already committed.
fresh = sqlite3.connect(':memory:')
try:
    fresh.executescript((ROOT / 'schema.sql').read_text())
except sqlite3.Error as e:
    sys.exit(f'❌ schema.sql is not valid SQL: {e}')

ok = True
for table in TABLES:
    a_cols, a_idx = shape(migrated, table)
    b_cols, b_idx = shape(fresh, table)

    # A table that exists on neither side is a TYPO in the table list, not a
    # pass. Reporting it as agreement is how a table quietly loses its gate.
    if not a_cols and not b_cols:
        print(f'❌ {table}: no such table on either side — check the name in package.json.')
        ok = False
        continue

    if (a_cols, a_idx) == (b_cols, b_idx):
        print(f'✅ {table}: migrated and fresh agree '
              f'({len(b_cols)} columns, {len(b_idx)} indexes).')
        continue

    ok = False
    print(f'❌ DRIFT in {table} — a migrated database and a fresh one differ.')
    a_names = {c[0] for c in a_cols}
    b_names = {c[0] for c in b_cols}
    if a_names - b_names:
        print(f'  in the migration but MISSING from schema.sql: {sorted(a_names - b_names)}')
    if b_names - a_names:
        print(f'  in schema.sql but MISSING from the migration: {sorted(b_names - a_names)}')
    for col in sorted(a_names & b_names):
        x = next(c for c in a_cols if c[0] == col)
        y = next(c for c in b_cols if c[0] == col)
        if x != y:
            print(f'  {col}: migrated {x[1:]} vs fresh {y[1:]}  (type, notnull, default)')
    if set(a_idx) - set(b_idx):
        print(f'  indexes missing from schema.sql: {sorted(set(a_idx) - set(b_idx))}')
    if set(b_idx) - set(a_idx):
        print(f'  indexes missing from the migration: {sorted(set(b_idx) - set(a_idx))}')

if ok:
    print(f'{", ".join(sorted(changed))} and schema.sql agree on all {len(TABLES)} tables.')
sys.exit(0 if ok else 1)
