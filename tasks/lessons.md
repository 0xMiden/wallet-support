# 2026-09-02 - Platform controls and visual references must be category-specific

Pattern:
- The initial Help Center shell placed Extension/Desktop and Mobile tabs on every category, even when the category was conceptual or support-oriented rather than platform-specific.
- The shell also preserved too many visual signatures from the structural reference, including clipped cards, a full-width segmented platform bar, and matching previous/next treatments.

Preventive rule:
- Store platform applicability in the category data and render a selector only when the active category has multiple platform-specific variants.
- Use competitor Help Centers only to understand information hierarchy and usability. Build visual identity from Bread's own logo, colors, spacing, shapes, and interaction patterns.
- During review, compare the final composition against the reference and remove distinctive borrowed visual motifs that are not required for usability.

# 2026-09-02 - Sequence navigation should match its information density

Pattern:
- The first Bread redesign changed colors and corner treatment, but its previous/next cards remained much larger than the small amount of content required.
- The oversized two-card composition still recalled the original wallet reference even after removing clipped corners.

Preventive rule:
- Size previous/next navigation for a label, title, category marker, and arrow rather than treating it like primary article content.
- Create a compact Bread-specific journey component instead of borrowing either oversized navigation cards or another Help Center's dense article-list treatment.

# 2026-09-02 - Confirm the intended WSL session before external preview updates

Pattern:
- A design instruction intended for another WSL session was pasted into this session and applied to this workspace's Help Center preview.

Preventive rule:
- When a request could refer to a parallel local session or duplicate project, confirm the intended workspace and preview target before editing files or redeploying an external preview.

# 2026-09-02 - Distinguish main categories from subcategories

Pattern:
- The first shell treated Manage wallet as a single parent for every Help Center section, so the sidebar did not express the intended top-level information architecture.

Preventive rule:
- Model main categories and subcategories as separate data levels. Render the parent category in navigation and breadcrumbs instead of hardcoding one label across every section.

# 2026-09-02 - Do not infer category children

Pattern:
- A proposed hierarchy assigned children before the complete category-to-subcategory mapping was confirmed.

Preventive rule:
- Creating a category does not authorize inventing its children. Keep it empty until the user supplies or approves the exact mapping, then follow that mapping directly.

# 2026-09-02 - Contact Support is a primary Help Center action

Pattern:
- Contact Support was initially placed conceptually under Troubleshooting, but the intended experience requires it to be visible from the main Help Center page.

Preventive rule:
- Treat the support-intake link as a global utility action beside search. It may also be referenced contextually later, but its primary access point must not be hidden inside a category.

# 2026-09-02 - Placement does not authorize a support destination

Pattern:
- Approval to place Contact Support on the main page was incorrectly treated as approval to connect it to the existing feedback-form URL.

Preventive rule:
- Treat support-action placement and support-action routing as separate decisions. Keep the control visibly unlinked until the user explicitly approves a destination.

# 2026-09-02 - Keep platform tabs concise

Pattern:
- The combined Extension and Desktop label was unnecessarily long for the platform selector.

Preventive rule:
- Use the concise user-facing label Extension while retaining broader internal identifiers only where compatibility requires them.

# 2026-09-03 - An untracked project has no recovery path

Pattern:
- The Help Center accumulated seven revision cycles of design work while living outside version control.
- The parent home repository ignores the directory, and the project had no repository of its own, so the
  only recoverable artefacts were the deployed Cloudflare bundles and the hashes written into these notes.
- Two separate WSL sessions had already written to the same tree, so an overwrite would have been silent.

Preventive rule:
- Put a project under version control at the point it acquires a second revision cycle, not at the point it
  is finished. Track source, configuration, and notes; keep build output and dependencies ignored.
- Confirm the deployed artefact and the local source agree before editing a tree that more than one session
  can write to, and treat a mismatch as a blocker rather than something to build on top of.

# 2026-09-03 - Derive a fact once, or watch the copies drift

Pattern:
- The same subcategory position was computed three times: the sidebar counted with its render index,
  the breadcrumb ran its own search of the hierarchy, and the previous/next cards read a denormalised
  `order` field stored beside the data.
- Two of the three agreed, so the disagreement looked like a card bug rather than a missing shared
  derivation, and patching the card would have left two derivations still free to drift apart.
- Neither TypeScript nor the production build could see the mismatch. Every reading was individually
  valid; only their disagreement was wrong, and nothing in the toolchain compares them.
- The render-index version carried a second, quieter defect: under an active search the list is
  filtered, so the surviving categories were silently renumbered.

Preventive rule:
- Derive a displayed fact in one module and have every view read it from there. If two places can
  compute a position, they will eventually disagree, and the disagreement will not be a type error.
- Treat a stored position field as a second source of truth. Prefer deriving order from the structure
  itself, and delete the field once nothing displays it, or it will grow the bug back.
- Never compute a position from the array a component happens to be rendering. Filtered, paginated, and
  sorted views all make render position a different quantity from hierarchy position.
- A resolver should refuse to guess. Throwing in development and returning nothing in production forces
  the caller to omit a marker; a fallback index quietly renders a confident wrong answer instead.
- When one of several readings is the odd one out, fix the derivation rather than the odd reading, and
  pin the expected values in a hand-written table. A test that compares views after they share one
  source passes by construction and proves nothing.

# 2026-09-03 - Derive the supported subset from the content, not from the plan

Pattern:
- The Markdown subset for the renderer was agreed in advance as bold, links, lists, blockquotes and
  paragraphs. Scanning the migrated articles first turned up italic in two sentences that hinge on it —
  "lost *all* your keys", "your encrypted wallet file, *and* access to your device" — both distinguishing
  losing something from losing everything, in a recovery article.
- Had the renderer been lenient it would have dropped the emphasis and nobody would have found out. Had it
  thrown without the scan, the migration would have failed on two words at the end of the work.

Preventive rule:
- Before writing a parser, renderer, or validator, enumerate what the real input actually contains. The
  supported subset is a fact about the data, not a decision to make ahead of it.
- Prefer refusing an unknown construct to dropping it. In user-facing safety copy, a silently discarded
  word can invert the meaning of a sentence.

# 2026-09-03 - A global /g regex plus recursion is an infinite loop

Pattern:
- The inline tokeniser used a module-level regex with the /g flag, and its render function recursed for
  bold, italic and link labels. Each inner call reset and advanced `lastIndex` on the shared object, so
  the outer loop never reached the end of its input.
- The symptom was not a wrong result but unbounded string growth: the test run exhausted the heap and was
  killed. The project's standing heap cap is the only reason it stayed contained.

Preventive rule:
- A stateful `/g` regex is shared mutable state. Build it inside the function that scans with it whenever
  that function can recurse or be re-entered, or scan without the global flag.
- Keep the heap cap on test runs even for small suites. It converts a machine-wide freeze into one failed
  command with a readable stack.

# 2026-09-03 - Verify layout by rendering it, not by reasoning about it

Pattern:
- A row was given `grid-row: 1 / 3` on two of its four cells with no `grid-column`. Grid auto-placement
  then put the chevron in column 2, the title in column 3 and the excerpt on row 3. Every viewport at or
  above the mobile breakpoint was wrong.
- Typecheck, build and 112 passing tests all stayed green: none of them can see grid placement.
- It survived a careful read of the CSS because the placement algorithm's behaviour is not visible in the
  declarations — it is a property of how they interact.
- It looked correct below 620px, where a media query hides the chevron and removes the item that was
  stealing the column. A mobile-first check would have signed it off.

Preventive rule:
- Any layout change gets rendered and measured before it is called done. A headless browser reading back
  bounding boxes at several widths takes a minute and is the only thing that can see this class of bug.
- Check the widths where a media query changes the DOM's effective shape, not just the narrow end. A
  breakpoint that removes an element can accidentally repair a layout that is broken everywhere else.
- Screenshots are worth taking even when the numbers look right: the redundant "EXTENSION" label beside
  an "Extension" tab, and a 77px gap where every other join was 16-24px, were only obvious once seen.

# 2026-09-03 - A font that is not loaded cannot carry hierarchy

Pattern:
- The stylesheet encoded its hierarchy in eight fractional font weights (560 to 760) against a family
  named in one line of CSS and never loaded — no `@font-face`, no link tag, no font file — with
  `font-synthesis: none` set.
- Under CSS font matching, all eight resolved to the fallback's nearest available weight. On Windows and
  Android that is 700, so the page heading, the card title, the nav heading and the primary button
  rendered identically. The design being reviewed was not the design that shipped.

Preventive rule:
- Before tuning typography, confirm the font actually loads. Grep for `@font-face`, a stylesheet link and
  a font file; a `font-family` declaration on its own proves nothing.
- On a system stack, treat weight as three coarse steps at most, and check each against the real fallback
  families: 600 collapses into 700 on Roboto and DejaVu, so it buys nothing on Android or Linux.
- Carry hierarchy in size, colour and space, which render everywhere, rather than in weight, which may not.

# 2026-09-03 - Copy written to fill a render gap is still authored copy

Pattern:
- The home page's cards needed a line per main category. Subcategories had carried a description
  since the beginning; main categories had not, so there was a hole in the data model exactly where
  the design needed prose.
- Five descriptions and a replacement meta description were written to fill it, shipped into the
  working tree, and reported only as prose in a summary of what had been built. Six lines of
  reader-facing copy were a paragraph in a status update rather than a list awaiting approval.
- CLAUDE.md's licence to improve "categories, subcategories, navigation, layout, and presentation"
  reads like permission to write the words those things contain. It is not: the standing gate is that
  reviewed titles and content must not change without approval, and new copy ships in the same voice
  beside them.
- One line was wrong on the facts, and only review caught it. "Learn what Guardian protects against
  and how to manage it" promised managing Guardian; the single article under it explains what
  Guardian is. A card had been made to advertise an article that does not exist.

Preventive rule:
- When a layout needs a line that does not exist yet, write it, then stop and list every such line
  verbatim with the field it fills, before committing. Do not fold it into a summary of the work,
  where it can be approved by omission.
- Check each new line against the articles actually filed under it. A category description is a
  promise about the content beneath it, and the count of that content is one grep away.
- Prefer a layout that needs no new copy. Deriving a card's supporting text from what is already
  written cannot drift and cannot overpromise.
