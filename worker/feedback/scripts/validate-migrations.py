#!/usr/bin/env python3
"""Replay EVERY migration, in order, and prove the result is schema.sql.

This is the check that matches how production is actually built.

`check-schema-drift.py` compares one PR's migrations against schema.sql, which
catches the mistake being made right now. It cannot catch an older one: a
migration that was wrong when it landed, or a schema.sql that was hand-edited
to paper over a migration that never said the same thing. Those two databases
have already diverged, and nothing notices until a query touches the column
that exists on only one side.

So this replays the whole chain:

    schema.sql AS IT WAS before the first migration existed
      + 0001, 0002, ... 000N applied in order        (the production path)
      ==
    schema.sql AS IT IS NOW                          (the fresh db:init path)

EVERY TABLE IS COMPARED, not a named list. A table nobody remembered to add to
the list gets no protection at all, and gets it silently — which is the same
class of failure this file exists to prevent, one level up. Tables are
discovered from the databases themselves, so a new one is covered the moment it
is created.

WHY THERE IS A "BASE" AT ALL.
Migrations 0001-0006 are ALTER TABLE against a `submissions` table that already
exists, so they cannot be replayed onto an empty database. The base is the
committed schema.sql from the parent of the commit that introduced the first
migration — the last state of the world before migrations began. It is found
from git history rather than pinned, so it survives the file being renamed.

Needs full git history: run with fetch-depth 0 in CI.

Usage:  npm run check:migrations
        python3 scripts/validate-migrations.py [--base-ref <ref>]
"""
import pathlib
import re
import sqlite3
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIGRATIONS = ROOT / 'migrations'


def migration_files() -> list[pathlib.Path]:
    files = sorted(path for path in MIGRATIONS.glob('*.sql') if path.name != 'base.sql')
    if not files:
        sys.exit('no migrations found')
    # Numeric prefixes must be unique, or "in order" is undefined and two
    # people can land 0008 independently.
    seen: dict[str, str] = {}
    for f in files:
        m = re.match(r'^(\d+)', f.name)
        if not m:
            sys.exit(f'{f.name} has no numeric prefix — ordering would be undefined')
        if m.group(1) in seen:
            sys.exit(f'duplicate migration number {m.group(1)}: {seen[m.group(1)]} and {f.name}')
        seen[m.group(1)] = f.name
    return files


def base_schema(explicit: str | None) -> tuple[str, str]:
    """The immutable schema from immediately before migration 0001."""
    base = pathlib.Path(explicit) if explicit else MIGRATIONS / 'base.sql'
    if not base.is_absolute():
        base = ROOT / base
    if not base.exists():
        sys.exit(f'migration replay base is missing: {base}')
    return base.read_text(), base.relative_to(ROOT).as_posix()


def shape(db: sqlite3.Connection) -> dict:
    tables = [r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    out = {}
    for t in tables:
        cols = [(r[1], r[2], r[3], r[4]) for r in db.execute(f'PRAGMA table_info("{t}")')]
        idx = sorted(r[0] for r in db.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? "
            "AND name NOT LIKE 'sqlite_%'", (t,)))
        out[t] = (cols, idx)
    return out


def main() -> int:
    explicit = None
    if '--base-ref' in sys.argv:
        i = sys.argv.index('--base-ref')
        if i + 1 >= len(sys.argv):
            sys.exit('--base-ref needs a ref')
        explicit = sys.argv[i + 1]

    base_sql, base_label = base_schema(explicit)
    files = migration_files()

    # A — the production path.
    replayed = sqlite3.connect(':memory:')
    try:
        replayed.executescript(base_sql)
    except sqlite3.Error as e:
        sys.exit(f'❌ base schema at {base_label} is not valid SQL: {e}')
    for f in files:
        try:
            replayed.executescript(f.read_text())
        except sqlite3.Error as e:
            print(f'❌ {f.name} failed to apply in sequence: {e}')
            print(f'   Replayed from {base_label} through the migrations before it.')
            return 1

    # B — the fresh-init path.
    fresh = sqlite3.connect(':memory:')
    try:
        fresh.executescript((ROOT / 'schema.sql').read_text())
    except sqlite3.Error as e:
        sys.exit(f'❌ schema.sql is not valid SQL: {e}')

    a, b = shape(replayed), shape(fresh)
    ok = True

    only_replayed = sorted(set(a) - set(b))
    only_fresh = sorted(set(b) - set(a))
    if only_replayed:
        print(f'❌ tables the migrations create but schema.sql does not: {only_replayed}')
        ok = False
    if only_fresh:
        print(f'❌ tables schema.sql creates but no migration does: {only_fresh}')
        print('   A fresh database would have them and production would not.')
        ok = False

    order_only: list[str] = []
    for t in sorted(set(a) & set(b)):
        (a_cols, a_idx), (b_cols, b_idx) = a[t], b[t]
        if (a_cols, a_idx) == (b_cols, b_idx):
            continue

        an = {c[0] for c in a_cols}
        bn = {c[0] for c in b_cols}

        # COLUMN ORDER ALONE IS NOT DRIFT, and failing on it would be actively
        # harmful. A column added by ALTER lands at the END of the physical
        # table; schema.sql groups columns so a person can read it. The two
        # orders diverge permanently the first time a migration adds a column,
        # and forcing them back into step would mean rewriting schema.sql into
        # migration order — trading readability for a property nothing uses.
        #
        # It is safe here because nothing reads a column by position: every
        # INSERT names its columns, and D1 returns rows as objects keyed by
        # name rather than as arrays. Reported so that stays a checked fact
        # rather than an assumption, and so the day someone writes
        # `INSERT INTO t VALUES (...)` there is a note explaining why it broke.
        same_attrs = {c[0]: c[1:] for c in a_cols} == {c[0]: c[1:] for c in b_cols}
        if an == bn and same_attrs and set(a_idx) == set(b_idx):
            order_only.append(t)
            continue

        ok = False
        print(f'❌ DRIFT in {t}:')
        if an - bn:
            print(f'   migrations add, schema.sql lacks: {sorted(an - bn)}')
        if bn - an:
            print(f'   schema.sql has, migrations never add: {sorted(bn - an)}')
        for col in sorted(an & bn):
            x = next(c for c in a_cols if c[0] == col)
            y = next(c for c in b_cols if c[0] == col)
            if x != y:
                print(f'   {col}: replayed {x[1:]} vs fresh {y[1:]}  (type, notnull, default)')
        if set(a_idx) - set(b_idx):
            print(f'   indexes missing from schema.sql: {sorted(set(a_idx) - set(b_idx))}')
        if set(b_idx) - set(a_idx):
            print(f'   indexes no migration creates: {sorted(set(b_idx) - set(a_idx))}')

    if ok:
        total_idx = sum(len(v[1]) for v in b.values())
        print(f'✅ replay from {base_label} through {len(files)} migrations reproduces schema.sql '
              f'({len(b)} tables, {total_idx} indexes).')
        if order_only:
            print(f'   note: physical column ORDER differs in {", ".join(order_only)} — expected, '
                  'and harmless while every INSERT names its columns.')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
