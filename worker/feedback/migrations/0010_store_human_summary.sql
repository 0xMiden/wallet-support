-- A person's own summary of a store review, kept beside the AI's.
--
-- WHY THREE NEW COLUMNS RATHER THAN EDITING ai_structured. The AI's output is
-- recorded exactly as the model returned it, with model and prompt version, so a
-- batch that went wrong can be recognised later. Writing a correction into it
-- would make a human's words indistinguishable from the model's. The console
-- shows the human summary when there is one and keeps the AI's on record.
--
-- ONLY A HUMAN WRITES THESE, through the signed-in console with a CSRF token,
-- like the other human_* columns. NULL means nobody has edited the summary.
--
-- Additive only: existing rows read NULL and render the AI's summary as before,
-- so this migration is safe to apply before the Worker that uses it.
ALTER TABLE store_reviews ADD COLUMN human_summary TEXT;
ALTER TABLE store_reviews ADD COLUMN human_summary_by TEXT;
ALTER TABLE store_reviews ADD COLUMN human_summary_at INTEGER;
