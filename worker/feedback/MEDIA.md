# Feedback media

The form submits up to three PNG, JPEG or MP4 files as repeated multipart
`attachment` fields to `POST /api/feedback/submit`. Combined file size is limited
to 10 MiB (the per-file cap is also 10 MiB). Every file's declared type and magic
bytes are checked before any object is written. Magic-byte checks identify the
allowed format; they are not a malware or sensitive-information scan. Each file
gets a unique stored name, so duplicate filenames do not overwrite evidence.

Keep the `ATTACHMENTS` R2 bucket private. Set `FEEDBACK_PUBLIC_ORIGIN` to the HTTPS
origin serving this combined Worker, normally `https://support.miden.xyz`.
GitHub issue bodies and duplicate-report comments link to
`/api/feedback/media/<submission-id>/<stored-name>`. The public route accepts
GET/HEAD and single-byte-range GET requests for video seeking. It returns only
exact members of the submission's recorded attachment list, and only after a
successful issue write (`published_issue`) or comment write (`dup_links`). Upload,
classification, and the in-flight publishing state do not grant public access.
Failed GitHub writes leave media private. Missing origin configuration fails
publication with a retryable error rather than creating an issue without evidence.

PNG/JPEG images are embedded in issue Markdown. MP4 files are explicit watch or
download links to this Worker, not GitHub-native video attachments. The old
undocumented GitHub upload helper is deprecated and has no publication caller;
previously recorded GitHub-hosted URLs remain compatible. `R2_PUBLIC_BASE` is no
longer used.

Media responses have explicit MIME types, `nosniff`, a sandbox CSP, and
`private, no-store`. Removing the recorded attachment or R2 object, or marking the
report as spam, revokes subsequent reads from this Worker. Copies already saved
by readers or GitHub's image proxy cannot be recalled. No bucket listing is
exposed. Preview environments should use their own origin if publication is
explicitly enabled; normal local previews keep publishing disabled.
