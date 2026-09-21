-- One-time use for OAuth sign-in state.
--
-- WHAT WAS WRONG WITHOUT IT. The callback verified that the `state` was signed
-- by us and unexpired, and then threw it away by clearing the browser cookie.
-- Clearing a cookie is a request to a browser, and a scripted client is not a
-- browser: holding the cookie value and the state string, it could replay
-- /admin/auth/callback?code=... as often as it liked for the full ten minutes,
-- and every replay reached Google's token endpoint.
--
-- Signed and unexpired is not the same as unused. This table is what makes it
-- used.
--
-- ONLY A HASH IS STORED. The state is a bearer value for the length of a
-- sign-in; a table of live ones would be a table worth stealing. sha256 is
-- right here rather than a slow KDF because the input is a 128-bit random UUID
-- inside a signed envelope — there is no low-entropy secret to grind.
--
-- CONSUMPTION IS AN INSERT, NOT A READ-THEN-WRITE. `INSERT ... ON CONFLICT DO
-- NOTHING` and then checking `changes` is atomic in SQLite: exactly one of two
-- racing callbacks sees changes = 1, and the loser sees 0 and is refused. A
-- SELECT followed by an INSERT would let both through in the window between
-- them, which is precisely the race a replay attempt creates on purpose.
CREATE TABLE IF NOT EXISTS admin_oauth_state (
  state_hash  TEXT PRIMARY KEY,   -- sha256 of the state value, never the value
  consumed_at INTEGER NOT NULL,   -- epoch ms
  -- Kept so a stale row can be purged without re-deriving anything. A state is
  -- only valid for ten minutes, so rows past that are dead weight.
  expires_at  INTEGER NOT NULL
);

-- The purge deletes everything already expired; this is the index it uses.
CREATE INDEX IF NOT EXISTS idx_oauth_state_expiry ON admin_oauth_state(expires_at);
