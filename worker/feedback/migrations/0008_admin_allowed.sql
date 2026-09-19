-- Who may open the admin console.
--
-- One row per person, keyed on the email address Google verifies. Adding a row
-- grants access; setting disabled_at removes it on that person's next request.
-- There is nothing else to provision — no password to choose, no invite to
-- expire and resend, no account to create.
--
-- WHY THE EMAIL IS THE KEY.
-- Google is the one that proves ownership of the address, so the address is the
-- only identifier we can act on and the only one worth storing. A Google
-- subject id would be more stable across address changes, but it is opaque:
-- nobody can look at a table of subject ids and tell who has access, which is
-- the question this table exists to answer.
--
-- LOWERCASE, ALWAYS. Gmail treats the local part case-insensitively and Google
-- returns whatever the account was created with, so `Ivan.L@miden.team` and
-- `ivan.l@miden.team` are the same person. Storing both would be two rows for
-- one human, and revoking one would leave the other working. The application
-- lowercases on write and on comparison; this comment is here because the
-- database cannot enforce it.
CREATE TABLE IF NOT EXISTS admin_allowed (
  email        TEXT PRIMARY KEY,     -- lowercased, as verified by Google
  name         TEXT,                 -- display name, for the audit trail
  added_at     INTEGER NOT NULL,
  added_by     TEXT,                 -- the email of whoever granted access
  -- Revocation is a timestamp rather than a DELETE: who had access, and when it
  -- ended, is exactly the question asked after something goes wrong. A deleted
  -- row cannot answer it.
  disabled_at  INTEGER,
  last_seen_at INTEGER
);

-- The console lists people by when they were added; the sign-in path looks up
-- one address at a time and uses the primary key.
CREATE INDEX IF NOT EXISTS idx_admin_added ON admin_allowed(added_at);
