# Support design system

Reference: wallet PR #1047 (`brian/ds-guidelines`), pinned at `9e6c69ca7cac6ae8cc12d657613e4b4db490293b`. This is the current wallet PR stack tip inspected for this change, not wallet main.

## Audit

- Home renders its own header beneath the public header; article navigation introduces another brand and toolbar.
- Controls and layouts are independently styled, and tokens do not reach the public header.
- Search lacks a site-wide keyboard interaction; mobile navigation has custom overlay behavior.
- Topics is a dense wall of links. Feedback lacks an explicit success state and consistent field treatments.
- Large illustration panels dominate category information and make browsing slow.

## Implementation contract

Use source-owned shadcn components with Radix behavior, Tailwind v4, CVA variants, Lucide icons, and Motion. Keep the Vite/React app, article content, hash URLs, and feedback API contract.

The wallet's white page, warm fill, ink, orange tint, card hues, Nunito/Inter type roles, pill controls, 16px cards, and shared springs are the reference. Orange text uses the accessible dark accent; orange remains the brand fill. Responsive web layout adapts wallet patterns rather than copying extension dimensions.

Shared layers: semantic tokens → UI primitives → Container/PageHeader/SectionHeader/ArticleRow → page compositions. One header, a command search dialog, mobile navigation sheet, consistent footer, reusable category and article rows. Motion is centralized, brief, and honors reduced-motion preferences.

## Validation

Typecheck, existing content/routing/search tests, production build under the existing CSP, and browser checks for navigation, search keyboard/focus, mobile layout, feedback states, and reduced motion. Article copy and backend behavior remain covered by existing tests.

## Review resolutions

- Merged PR #26 is incorporated as the branch base (`5c71a87`). Its removal of duplicate Home chrome and responsive overflow coverage are preserved.
- Portaled article navigation has an explicit token scope rather than depending on ancestry.
- Radix-injected styles are authorized by a fresh, uncacheable HTML style nonce; script policy remains unchanged. Browser checks open dialogs, drawers, and selects under the real policy.
- Feedback verification is explicitly rendered, cleared on expiry, and renewed after both successful and failed requests.

## Validation evidence

- Existing content, routing, search, glossary, and link construction: 254 unit tests pass.
- Worker suite: 428 tests pass, including nonce freshness, CSP/header matching, feedback allowances, and unchanged admin/API behavior.
- Browser checks cover the responsive grid, persistent shell, article measure and screenshots, global command search, focus return/trapping, platform keyboard navigation, reduced motion, feedback failure/retry/receipt, and CSP during Radix interactions.
- Axe WCAG A/AA checks cover Home, Topics, feedback, and articles at 390px and 1280px. An inactive-tab contrast failure was corrected in the shared Tabs primitive.
- Specialist review found the portal-token and CSP issues above; the follow-up review reported no remaining must-fix findings.
