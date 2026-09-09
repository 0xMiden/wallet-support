# Design audit — Help Center vs midenxyz.webflow.io/wallet-new

Phase 1. No code changed. Measured 2026-09-09 against the live reference page and the local
production build at commit `5527a0b`.

## Method

Computed styles were read out of a real Chromium render at 1440×900, not from the stylesheet
source, so every number below is what the browser actually paints. Colour and radius tallies count
visible elements only. Font licensing was read from the reference's `@font-face` rules
(`midenxyz.webflow.shared.16211bb15.min.css`). Contrast is WCAG 2.1 relative luminance; alpha
colours are composited against their real backdrop first.

Screenshots in `tasks/design-audit/` — reference plus Help Center home, subcategory and article, at
1440px and 390px.

## The decision that governs everything else

**The reference is a light theme. The Help Center is a dark theme.**

| | Reference | Help Center |
| --- | --- | --- |
| Page background | `#fbfbfb` near-white | `#100c0a` near-black |
| Body text | `#484848` dark grey | `#fcfaf7` cream |

Nothing else in this audit can be settled until that is. "Visually consistent" read literally means
inverting the Help Center — every surface, every text role, every border, and the two gradients.
That is a bigger change than the rest of the audit combined, and it is not a styling detail I should
decide.

Worth knowing before you choose: **the brand accents already match.** The reference's `#e77537`,
`#f1a47e` and `#f7c8b1` are byte-identical to our `--help-accent`, `--help-accent-soft` and the
`--help-line` / `--help-rule` tint. The two designs are already the same palette — one on a light
ground, one on a dark one.

**Three options:**

- **A. Full inversion** — the Help Center becomes light. Maximum consistency, largest diff, and it
  discards a dark palette whose contrast is currently excellent (worst role 5.95:1).
- **B. Adopt everything except the ground** — take the type scale, the fonts, the radii, the spacing,
  the button and link treatments, and keep our dark surfaces. The Help Center reads as the same
  design system in a dark register. Much smaller diff, no contrast regressions.
- **C. Adopt type and components only** — leave colour alone entirely.

**My recommendation: B.** The accent lineage is already shared, so the family resemblance is
carried by type, shape and spacing rather than by the background; and a support site that a user
lands on from a bright marketing page is a reasonable place for a calmer, darker reading surface.
But A is a legitimate call if you want them indistinguishable — say which and Phase 2 follows it.

## Fonts

| | Reference | Help Center | Licence | Recommendation |
| --- | --- | --- | --- | --- |
| Display / headings | **Nunito** Bold + Black (`.ttf`) | system stack | **SIL OFL 1.1 — free to self-host** | **Adopt.** Self-host woff2, weights 600/700/900. This is the single biggest visual tell of the reference and it is legally free. |
| Body | **Söhne Buch** (`soehne-buch.woff2`) | system stack | **Commercial (Klim Type Foundry). Webfont licence forbids redistribution — we cannot ship it.** | **Adapt.** Nearest permissively licensed neo-grotesque: **Inter** (OFL), self-hosted. Public Sans and Archivo are alternates. |
| Nav | **Seasonmix** SemiBold | — | No open licence found; treat as unavailable | **Keep ours.** Only used for the marketing nav, which the Help Center does not reproduce. |

No runtime dependency on Webflow or a font CDN either way — everything self-hosted in the repo.

One caveat, from `src/styles.css`: a previous pass named Inter without ever loading it, so eight
fractional weights silently collapsed to the fallback. If we adopt Inter it must arrive with real
woff2 files and real weights, or we repeat that bug.

## Type scale

Reference base is **14px**; ours is **16px**.

| Role | Reference | Help Center | Recommendation |
| --- | --- | --- | --- |
| h1 | 70.4px / 900 / lh 0.98 / ls −2.46px | 60px / 700 / lh 1.05 / ls −2.1px | **Adapt** — take the 900 weight and the tighter leading; keep our size, 70px is a marketing hero. |
| h2 | 40–56px / 600–900 | 38px (home), 18px (article) | **Adapt** — reference is inconsistent with itself (three different h2 treatments). Take weight 600, keep our sizes. |
| h3 | 28px / 600 / **accent orange** | — | **Adopt the idea** — an accent-coloured h3 is a strong, cheap signal. See contrast note. |
| Body | 14px / lh 1.4 | 16px / lh 1.7 | **Keep ours.** 14px with 1.4 leading is a marketing measure; this is a reading site. |
| Lead paragraph | 21.6px / lh 1.5 / 68% ink | 18px | **Adapt** — take the lead-paragraph idea, keep our size. |
| Small / label | 12px / 600 / ls +1.2px / uppercase | 13px | **Adopt** the uppercase + letterspacing treatment for labels. |
| Letter-spacing | Negative and aggressive on display (−1.2 to −2.46px) | −0.76 to −2.1px | **Adopt** — ours is already close; tighten h2. |

## Colour

| Role | Reference | Help Center | Recommendation |
| --- | --- | --- | --- |
| Page ground | `#fbfbfb` | `#100c0a` | **Blocked on the A/B/C decision above.** |
| Surface | `#ffffff`, warm `#fffdf9` | `#211814`, `#18110e` | Same. |
| Text | `#484848` | `#fcfaf7` | Same. |
| Muted text | ink @68% / @46% | `#b6a79e`, `#9c8b81` | **Keep ours** — both reference alphas fail AA (below). |
| Accent | `#e77537` | `#e77537` | **Already identical. Adopt, no change.** |
| Strong accent | `#e65303` | — | **Adopt** as a second accent step for fills and borders; we lack one. |
| Accent soft | `#f1a47e` | `#f1a47e` | **Already identical.** |
| Accent pale | `#f7c8b1` | `#f7c8b1` (as line tint) | **Already identical.** |
| Cream surface | `#efe7d8` | — | **Adapt** — useful as a callout ground if we go light; no dark equivalent needed. |
| Decorative | green `#90ba89`, purple `#beacd2`, blue `#91acc1` | — | **Keep ours (none).** Pastel blobs are marketing furniture; a support page does not need them and CLAUDE.md rules out decorative interaction. |
| Border | `#484848` (156 uses), `#e9dfd3` | `rgb(247 200 177 / 18%)` | **Keep ours** — the reference draws hard 1px ink outlines, a poster device that would read as heavy at article length. |
| Link | unstyled `#0000ee` in places | accent | **Keep ours** — the reference has genuinely unstyled links; that is a defect, not a style. |
| Focus | not visibly defined | 3px accent outline | **Keep ours.** Do not regress this. |

## Contrast — six reference pairings fail AA

Every one of these is measured, not estimated.

| Pairing | Ratio | Needs | Verdict | Nearest passing |
| --- | --- | --- | --- | --- |
| body `#484848` on `#fbfbfb` | 8.84 | 4.5 | PASS | — |
| lead p, ink @68% | 3.76 | 4.5 | **FAIL** | ink @75% → `#757575` (4.45) or @80% → `#6c6c6c` (5.07) |
| small label, ink @46% | 2.27 | 4.5 | **FAIL** | ink @80% → `#6c6c6c` (5.07) |
| accent `#e77537` text on light | 2.90 | 4.5 | **FAIL** | `#bf5417` (4.51) |
| accent `#e77537` as h3, 28px large | 2.90 | 3.0 | **FAIL** | `#e65303` (3.62) |
| `#e65303` as normal text on light | 3.62 | 4.5 | **FAIL** | `#bf5417` (4.51) |
| white on `#e65303` bar, 14px | 3.75 | 4.5 | **FAIL** | `#d44b02` (4.37) or `#c14402` (5.13) |
| white on button `#e7743a` | 3.02 | 4.5 | **FAIL** | `#c14402` (5.13) |
| ink on white / cream / `#efe7d8` | 9.15 / 9.00 / 7.44 | 4.5 | PASS | — |

**Our current dark palette passes everywhere** — strong 18.68, body 13.12, muted 8.35, faint 5.95,
accent 6.49. Any move toward the light theme must not import these failures; the nearest passing
values above are what Phase 2 would use.

## Radii

| | Reference | Help Center | Recommendation |
| --- | --- | --- | --- |
| Buttons | `999px` pill | `999px` pill | **Already identical.** |
| Cards / panels | `16px`, `28px` | loaf `1.1rem 1.1rem 0.4rem 0.4rem` | **Keep ours.** The loaf is our own signature and is documented as a deliberate unification; the reference's card radii belong to decorative blobs (`26%`, `50%`), not content cards. |
| Pills / tags | `200px` | `999px` | Equivalent. |

## Spacing, container, breakpoints

| | Reference | Help Center | Recommendation |
| --- | --- | --- | --- |
| Container max-width | `1328px` | `78rem` = `1248px` | **Adapt** — move `--frame` to `83rem` (1328px) to match. Cheap, one token. |
| Gutter | `40px` | varies by view | **Adopt** `40px` as the desktop gutter token. |
| Spacing ramp | not a visible system | 0.25rem base, 8 steps | **Keep ours** — the reference has no discernible ramp to adopt. |
| Breakpoints | `991` / `767` / `479` (Webflow defaults) + `min-768` | `900` / `620` / `min-1180` | **Keep ours.** The reference's are Webflow's stock values, not a considered response to any layout. Ours are set where our sidebar grid actually breaks. Aligning would move breakpoints away from our own layout's needs for no gain. |

## Buttons and links

| | Reference | Help Center | Recommendation |
| --- | --- | --- | --- |
| Primary button | fill `#e7743a`, white text, pill, pad 14/22, weight 700 Nunito | accent fill, dark ink text, pill | **Adapt** — take padding and the 700 weight; **keep our dark-ink-on-accent**, since white-on-orange fails AA at 3.02. |
| Secondary button | white fill, ink text, pill | — | **Adopt** as a secondary variant; we do not have one. |
| Hover / active | not measurable without interaction | defined | **Keep ours** — reference states could not be captured from a static render. Flagging as unmeasured rather than guessing. |
| Focus | none observed | 3px accent outline | **Keep ours.** |

## Summary

**Adopt (7):** Nunito for display, self-hosted · accent-coloured h3 · uppercase letterspaced labels ·
`#e65303` as a second accent step · container `1328px` · `40px` gutter · secondary button variant.

**Adapt (6):** Inter in place of Söhne · h1/h2 weights and leading · lead-paragraph treatment ·
button padding and weight · h3 accent shifted to a passing value · cream callout ground if we go
light.

**Keep ours (9):** body size and leading · muted text roles · borders · links · focus ring · loaf
radii · spacing ramp · breakpoints · decorative colour (none).

**Blocked on your call:** light vs dark. Options A, B, C above — my recommendation is **B**.

## What I could not measure

- Hover, focus and active states on the reference — a static render does not expose them. If you
  want these matched, say so and I will drive the interactions in Phase 1b.
- Anything below the fold of the reference's very long page is captured in the screenshot but was
  not sampled for computed styles beyond the first three instances of each element type.
- Whether Seasonmix is licensable. I found no open licence; if Miden holds one, that changes the nav
  row.

---

# Phase 1b — interaction states on the reference

Measured by driving real hover, focus and mousedown against the live page at 1440×900, reading
computed styles before and after each.

## Finding: there is almost nothing to adopt

| Element | Rest | Hover | Focus | Active |
| --- | --- | --- | --- | --- |
| Primary pill (`Share`, bg `#e7743a`, white text, r `999px`) | `transition: all 0s` | **no change** | — | **no change** |
| Secondary pill (`Back to the counter`, white fill, ink text) | `transition: all 0s` | **no change** | — | **no change** |
| Ghost button (`TALK TO US`, 1px white @60% border) | `transition: all 0s` | **no change** | outline `#fff` 3px → `#101010` 1px | no change |
| Nav link | no decoration | `text-decoration: underline` | underline | underline |
| Quiet link (`Learn more ↓`) | ink @46% | outline only | — | — |
| Footer link | **`#0000ee`, underlined** | — | — | **`#ff0000`** |
| Card | no visible interactive card found | — | — | — |

Every transition on the page is `all 0s`, so nothing animates. The footer links are unstyled browser
defaults, including the `#ff0000` active colour — that is a defect on the reference, not a treatment.

## Recommendation

**Keep ours, in full.** Adopting the reference here would mean removing hover feedback from every
button and shipping a `#0000ee` link colour. Our current states — accent hover, 3px accent focus
ring, `prefers-reduced-motion` handling — are strictly better and are what the Playwright suite
asserts.

**One adopt:** underline-on-hover for links. It costs nothing, it is the reference's only deliberate
interaction, and it improves affordance in body copy.

## One surface worth taking

The measurement turned up a content card the static pass missed: background `#fffdf9`, radius
`28px`, no border. That is the reference's real content surface and is the right model for our
category cards on the light ground.
