-- "Your reports" listed the first 140 characters of the reporter's own body,
-- which reads as a sentence cut off mid-word. It now shows the GitHub issue
-- title instead, so what the reporter sees matches what the maintainers see.
--
-- This column is NOT the main source of those titles. Folds (duplicate and
-- low-confidence) never reach the publish path, so they have no title of their
-- own and are resolved through issue_mirror. This covers one narrower case:
-- the window after a genuinely NEW issue is filed and before the next mirror
-- sync (<=15 min) knows it exists.
ALTER TABLE submissions ADD COLUMN published_title TEXT;
