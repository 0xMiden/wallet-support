# Bread Wallet Help Center — brand audit against midenxyz.webflow.io/wallet-new

Read-only. No code was changed. Measured 2026-09-09 against the live reference and the local
production build at commit `a723f20`, deployment `05090f25`.

## Verdict

The Help Center is now substantially the same design system as the marketing site, and the things
that are usually hardest to get right are right: the palette, the type, and the token discipline.
Across 65 page states at two widths there are **zero WCAG AA contrast failures**, **zero hardcoded
colours** in the component stylesheet, **zero `px` font-sizes**, **zero gradients**, only the two
brand families in use, and no horizontal overflow or clipped label at any of 390/768/1024/1440. What
remains is a short list of specific defects rather than a systemic gap: one glyph is geometrically
clipped, the article reading measure is 88ch against a `--measure` token that exists and is never
applied, the home page silently misses the focus ring every other page gets, and the category view
never received the container and gutter the home page did. None of these are palette or typography
problems; they are places where a rule was written and not wired up.

## Coverage

**65 states, captured at 1440 and 390 = 130 screenshots**, in `tasks/brand-audit/`. Enumerated from
the content data, not hand-picked:

| Kind | Count | Note |
| --- | --- | --- |
| Home | 1 | |
| Subcategory | 14 | 7 subcategories x 2 platforms |
| Article | 43 | 22 published x each platform it declares; 12 differ per platform |
| Held-back article | 1 | `10-how-to-restore-…` — falls back to its category view |
| Search | 4 | results, no results, `?q=` deep link, empty query |
| Edge | 2 | unknown hash, unknown article id |

Responsive was additionally checked at **390/768/1024/1440 across all 65 states — 260 checks**.

**Three states in the brief do not exist, and that is a finding in itself:**

- **The 5 main category landing views.** `parseRoute` resolves only `#subcategory` and
  `#subcategory/article`. A main category is a grouping, not a route: its card links to its first
  subcategory. There is nothing to audit and nothing broken — but "all 5 category landings" cannot
  be captured because they are not pages.
- **The empty state (a subcategory with no articles on the selected platform).** Unreachable. Every
  subcategory has at least one article on both platforms; the thinnest is `security-and-recovery`
  at 6 extension / 5 mobile. The only empty state the site can reach is search-with-no-results,
  which is captured.
- **An article with SAMPLE placeholder images.** There are none. Zero `[image removed]` markers
  remain in any article, and there is no `sample` or `badge` rule in the stylesheet or component
  tree. The badge is not dead code — it does not exist.

## Findings

| Severity | Page-state | Element | Current | Expected | Why it matters |
| --- | --- | --- | --- | --- | --- |
| **blocker** | Home | Troubleshooting category glyph | Path's painted right edge reaches **25.01** in a `0 0 24 24` viewBox (geometry bbox ends at 24.31, plus 0.7 for half the 1.4 stroke) | Whole glyph inside the viewBox | The wrench's jaw is cut off. Visible on the busiest page, on a 16:10 panel where the glyph is the only content. Introduced in `a723f20`. |
| **major** | All 43 article states | `.help-center-article-body` paragraphs | `max-width: none`, paragraphs run **~88ch** at 1440 | 60–75ch; `--measure: 68ch` already exists | Long-form reading at 88ch measurably costs comprehension — the eye loses the line return. The token was defined for exactly this and is applied nowhere. |
| **major** | Home only | Focus ring on every interactive element | Browser default `1px auto rgb(16,16,16)` | `3px solid var(--help-accent)`, as every other page gets | `.help-center-shell :focus-visible` is scoped to the shell; the home page root is `.help-center-home`, so the rule never matches. Keyboard users get a different, weaker indicator on the entry page. Confirmed by real Tab traversal, not programmatic focus. |
| **major** | All 14 subcategory + 43 article states | Content container | `max-width: none`, `padding-left: 0`, content 989px at 1440 | Home is `1328px` with a `40px` gutter; reference is `1328px / 40px` | The two halves of the site do not agree on their measure. The gutter token exists and reaches the home frame only. |
| **minor** | Search results, no results | Document outline | **Two `<h1>` elements** | One | Screen-reader users navigating by heading get two competing page titles. |
| **minor** | Tokens | `--help-accent-strong` / `--accent-text-lg` | Both `#e65303`; `--help-accent-strong` is referenced nowhere | One name per value | Two names for one colour is how palettes drift back apart. |
| **minor** | Tokens | 9 unused tokens | `--card-tint-soft`, `--help-accent-deep`, `--help-accent-pale`, `--help-accent-strong`, `--help-callout`, `--help-rule`, `--measure`, `--radius-loaf-lg`, `--weight-body` | Used, or removed | `--measure` is the major finding above. The rest are dead weight that reads as available API. |
| **minor** | Home | `View all topics` link | Hover produces **no change at all** | Some hover affordance | It is the only link on the site with no hover state. The underline-on-hover rule excludes it via its `:not()` clause. |
| **minor** | Subcategory, search | `.help-center-card-link` (article title) | Underlined at rest; on focus the underline is **removed** | Focus adds emphasis, never subtracts | Focus should not make a target look less interactive than at rest. |
| **polish** | Header, all states | Lockup type sizes | `19.5683px` and `23.0216px`, derived from `--mark / 1.39` | On the type scale | Correct by construction and visually right, but they are the only two sizes on the site not from the scale. |
| **polish** | Support panel, footer | `#efe7d8` ground | A reference colour — but on the reference it fills the toaster illustration (`.bread-arm`, `.bread-pivot`, `.bread-lip`), never a page surface | Confirm the intent | The colour is brand. Using it as a large surface is our extension of it, not something the reference does. Worth a deliberate yes. |

## Accessibility

### Contrast — no failures

Every rendered text node across all 65 states at both widths, each measured against its real
composited backdrop, at its actual size and weight (3:1 for ≥24px or ≥18.66px bold, else 4.5:1):

**0 failures.** For reference, the roles measure: strong `#2e2b27` 13.61:1, body `#484848` 8.84:1,
muted `#5f5f5f` 6.17:1, faint `#6c6c6c` 5.07:1 on the page ground; accent text `#bf5417` 4.51:1;
card chevron `#3b5a72` 7.26:1 on the card; `#a8460f` 4.82:1 on the cream panel.

### Focus visibility

Driven with real `Tab` traversal on three page types. Every interactive element receives a visible
indicator, so there is no SC 2.4.7 failure — but **the indicator is not the same one everywhere**:

| Page | Indicator |
| --- | --- |
| Subcategory, article | `3px solid #e77537` — the intended ring |
| **Home** | `1px auto` browser default on all 9 tabbables |
| Search input (all pages) | `outline: none` on the input; the affordance is on the `.help-center-search` wrapper via `:focus-within` |

### Heading order

No skipped levels on any page type (home, subcategory, article, search, no-results all clean).
Two `<h1>`s on the search states, noted above.

### Images

**260 images across the captured states, 0 missing an `alt` attribute.**

### Target size

WCAG 2.2 SC 2.5.8 (AA) requires 24x24 with an explicit exception for links inline in a sentence.
Applying that exception honestly:

- **Not failures:** article-body links (19–22px tall) are inline in sentences and exempt. The search
  `<input>` reports 22px, but its hit area is the 54px-tall wrapper.
- **Worth a look:** `.help-home-section-link` ("View all topics", 131x19) and the breadcrumb links
  (`a.is-current`, 19–22px tall) are standalone, not inline in a sentence, and so are not covered by
  the exception.
- SC 2.5.5 (AAA, 44x44) is not met by most controls; the primary buttons and the back button are
  44–54px and do meet it.

### Reduced motion

Covered. A blanket `transition-duration: 0.01ms` over both roots plus explicit `transform: none`
resets for all nine hover-lift rules. 29 transitions, all inside the covered roots.

## Matches the reference

Measured equal, not judged equal:

- **Type families.** Only Inter and Nunito render anywhere across 130 captures. Nunito 900 on
  display, matching the reference's h1/h2 weight.
- **Weights.** 400/500/700/900 — a closed set, matching the reference's own usage.
- **Accent.** `#e77537`, `#f1a47e`, `#f7c8b1` byte-identical to the reference.
- **Ground and ink.** `#fbfbfb` page and `#484848` body text — the reference's exact values.
- **Card colours.** `#a8bca3` and `#91acc1` sampled from the reference's illustrated cards.
- **Container.** Home frame `1328px` with a `40px` gutter — the reference's exact container.
- **Buttons.** Pill `999px`; padding `14px 22px` on the reference, `8.8px 17.6px` on ours (see note
  below — ours is smaller but proportionate, not off-system).
- **Radii.** Every radius in use maps to a token: `8px`, `14.4px`, `17.6px`, `22.4px/7.2px`, `28px`,
  `55%/38%`, `999px`. **No off-scale radius anywhere.**
- **Lockup.** Mark-to-wordmark ratio 1.39, gap 0.11 of mark height — the reference's own proportions.
- **No gradients**, matching the reference's flat surfaces.
- **Consistency.** All five home panels render identical sage; all subcategory bands and chips
  render identical blue across `setup-and-basic-use`, `guardian-protection` and
  `common-issues-and-support`; the sidebar active state is identical across categories; the platform
  tabs render one selected and one unselected treatment everywhere.

### Where the reference has no equivalent

Judged against the Bread system's own logic instead, and stated as such:

- **Article body.** The reference has no long-form article. Judged against reading convention —
  which is where the 88ch finding comes from.
- **Sidebar.** No equivalent. Internally consistent; active state is one treatment everywhere.
- **Search results and the no-results state.** No equivalent. Consistent with the card system.
- **Platform tabs.** No equivalent. Selected state is the accent fill with `--ink-on-accent` at
  5.93:1, which is the same pattern as the primary button.
- **Empty state and the SAMPLE badge.** Neither exists in this build, as set out under Coverage.
- **Decorative hero objects.** Deliberately absent — built, verified, and dropped by owner decision.
  Confirmed absent from every state, so there is nothing to check for overlap or reduced motion.
- **Button padding.** The reference's `14px 22px` is a marketing-scale control. Ours is `8.8px
  17.6px`, driven by the spacing ramp. Different, but from our system rather than from nowhere.

## Recommended fix order

Grouped so related fixes land together.

**1. The clipped glyph** — blocker, one line, no dependencies.
Redraw the troubleshooting path inside `0 0 24 24`, allowing 0.7 for the stroke. Verify by reading
the path's `getBBox()` rather than by eye.

**2. Reading measure and container** — both are "a token exists and is not applied", and both change
the article and category geometry, so they want the same commit and the same screenshot pass.
Apply `--measure` to the article body; give the category view the frame and gutter the home page
already has. Re-run the Playwright geometry cases afterwards — `the footer brand sits at the left
edge` asserts a 40px bound and is the one most likely to move.

**3. Focus ring and focus regressions** — one accessibility commit.
Extend the `:focus-visible` rule to `.help-center-home` so the home page gets the accent ring; stop
`.help-center-card-link` dropping its underline on focus; give `View all topics` a hover state.

**4. Token hygiene** — no visual change, so it can land on its own and be reviewed by diff alone.
Collapse `--help-accent-strong` into `--accent-text-lg`; remove or wire up the other 8 unused
tokens; decide whether the standalone 19px links should meet the 24px target.

**5. The two open questions** — need a decision, not a fix.
Whether `#efe7d8` should carry a page surface when the reference only uses it in an illustration,
and whether the search states should have one `<h1>` rather than two.

---

# Corrections (added after the fixes, 2026-09-09)

Two findings above are wrong, and both were the audit's fault rather than the code's. They are left
in place rather than edited out, because a report that quietly rewrites itself is not a record.

**"Two `<h1>` elements on the search states" — withdrawn.** Counted from the DOM. The second `h1`
sits inside a `[hidden]` section, verified `inHiddenSection=true`, and `hidden` removes an element
from the accessibility tree — so only one `h1` is ever exposed. `e2e/navigation.spec.ts` already
says so in a comment above its `RESULTS` selector. Demoting it to `h2` broke three Playwright cases,
which is how the mistake surfaced. Reverted; the code was right.

**"Article title link loses its underline on focus" — withdrawn.** A measurement artifact. The
harness left the mouse resting on the element from the previous step, so the hover underline was
recorded as the rest state. Measured with the pointer parked away: undecorated at rest, underlined
on hover. Correct as written.

**One finding was understated.** "View all topics has no hover" was recorded as a missing state on
one link. The cause was the same bug as the focus ring: the underline-on-hover rule named
`.help-home-shell`, a class that appears nowhere in the markup, so the rule had never applied to a
single link on the home page.

**And the responsive sweep should have caught a gutter mismatch it did not.** The audit compared
containers at 1440 only. At 620 the category view sat at 31px against the home page's 20px, and
below 620 the home page was pinned to 16px against the token's 20px. Both surfaced only when parity
was checked across seven widths during the fix.

**The contrast sweep itself was wrong, and "zero AA failures" was not true.** The harness resolved
an element's backdrop by walking up to the first ancestor with an opaque background, which skipped
straight past the element's *own* translucent fill. Every accent-coloured chip, eyebrow and callout
was therefore measured against white rather than against the tint it actually sits on.

Composited properly, `--accent-text` at `#bf5417` failed in fifteen places across seven views: 4.22
on a 10% chip, 4.41 on a 6% one, 4.26 on the cream panel, 4.10 inside a callout. It cleared 4.5:1 on
the bare page by one hundredth, which is the only reason it ever looked fine. Fixed by collapsing
`--accent-text` onto the deeper `#a8460f` that the cream panel already required — one value that
clears every ground the interface actually uses.

Every contrast figure quoted earlier in this report was produced by the same flawed harness and
should be re-read with that in mind.
