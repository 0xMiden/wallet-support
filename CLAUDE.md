# Bread Help Center — Claude Code Guidance

Build the Bread Help Center as a production-quality support product using established industry standards.

Keep the architecture simple, maintainable, accessible, performant, secure, and easy to extend. Avoid short-term fixes that create future technical debt.

Do not write to MEMORY.md or memory memos unless Ivan explicitly asks in the current turn.

## Brand and design system — standing rule

Binding on every change: edits, new articles, new pages, new components and design changes. It is
not advisory. The values live in `src/help-center/tokens.css`; the measurements and decisions behind
them are in `tasks/design-audit.md` and `tasks/brand-audit-2026-09-09.md`.

- **Tokens only.** Colours, font sizes, weights, radii and spacing come from the custom properties in
  `tokens.css`. Component rules in `src/help-center/help-center.css` never hardcode a value, new
  components included; older raw spacing is not a precedent. Line-height has no token scale yet, so
  reuse a value already in the stylesheet. `src/styles.css` is the host page and only repeats token
  values it cannot reach.
- **Type.** Nunito for display and Inter for body, both self-hosted in `src/help-center/assets/fonts/`.
  The weights in use are 400, 500, 700 and 900. No new family or weight without approval.
- **Colour.** The light ground is `--help-bg` (`#fbfbfb`). The Bread accent `--help-accent`
  (`#e77537`) is for fills, icons and borders, never text. Accent text uses the deeper
  `--accent-text` (`#a8460f`); `--accent-text-lg` (`#e65303`) is for headings 24px and over only.
  Hues come from the reference. When a pairing fails WCAG AA at its real size and weight, darken
  within the same hue rather than switching to a different colour.
- **Accessibility floor.** Every text pairing meets WCAG AA against its real backdrop, translucent
  fills included. Every interactive element gets the 3px accent focus ring; the search field shows
  its focus on the pill around it. Decorative elements are `aria-hidden`. Reduced motion is
  respected: new motion gets a reset in the `prefers-reduced-motion` rules.
- **Components.** Home category cards follow the reference pattern: a pastel `--card-panel` panel
  with `--radius-panel`, the uppercase title below it, and a centred description. Buttons and links
  reuse the shipped treatments and their states: rest, hover, focus-visible, and current or selected
  where that applies. The article body stays capped at `--measure`.
- **Decorative objects.** None ship today. If one is added, it goes in the home hero only, never on
  any other page, and never overlaps text at any width.
- **Layout.** Use `--frame` and `--gutter` as shipped, so the home and category views keep matching.
  The breakpoints are ours (620, 740 and 900), not Webflow's (991, 767, 479); the article rail is
  placed by a container query on the content column, not a viewport breakpoint.
- **No Webflow CSS.** Never import, paste or hotlink generated CSS, fonts or images from the
  reference. Measure it in a browser and express what you take as tokens.
- **Article content.** Articles inherit the shipped typography and spacing; nothing gets bespoke
  styling. Bold for UI labels, with punctuation outside the bold; quotes only in titles and for
  genuine quotation. Use the canonical terms from the glossary and the terminology guard in
  `content.test.ts`, and ask Ivan where the two disagree.
- **Changing the system.** A changed token value, a new token, font, weight, breakpoint or component
  pattern needs Ivan's approval first, reported with before and after values and contrast ratios.
  Matching the reference is not self-authorising.

## Roles

Use specialized agents when their expertise is relevant.

### Lead Engineer
Owns architecture and final technical decisions.

- Review the existing codebase before making structural changes.
- Keep components reusable and responsibilities clearly separated.
- Prefer durable fixes over patches.
- Resolve conflicts between recommendations from other agents.
- Avoid unnecessary dependencies and overengineering.

### UX/UI Designer
Owns the user experience and interface design.

- Make the Help Center interactive and engaging rather than a wall of text.
- Design clear navigation, search, article discovery, visual hierarchy, and reading flows.
- Use screenshots, step-based layouts, expandable sections, related articles, breadcrumbs, and other interactions when they genuinely help users.
- Design mobile-first and responsive.
- Avoid unnecessary animation, clutter, and decorative interaction.

### Content & Information Architect
Owns how Help Center information is organized.

- Assign each article to the correct **main category and subcategory**.
- Keep the structure intuitive and scalable as more articles are added.
- Maintain clear relationships between categories, subcategories, and articles.
- Use the house vocabulary for the account keys: everyday key (not "hot key" or "device key"),
  emergency key (not "cold key" or "recovery key"), recovery phrase for the phrase itself (never a
  "key"), and Guardian key (it acknowledges state updates; it does not co-sign). External sources,
  including the Miden blog, use the retired terms; quote them only where the note is explicitly
  describing that source. `content.test.ts` enforces this over the articles, `content-source/`, the
  interface components, the glossary, and this file.
- Bold for UI labels in article bodies, punctuation outside the bold; quotes only in titles
  (plain text) and for genuine quotation.

Existing reviewed Help Center **titles and written content must not be changed** unless explicitly approved. Images, screenshots, categories, subcategories, navigation, layout, and presentation may be improved.

### QA & Accessibility Reviewer
Reviews implementation before work is considered complete.

Verify:

- Desktop and mobile behavior
- Responsive layouts — measure values at every breakpoint and on both sides of each, not only at
  desktop. A gutter or container that matches at one width tells you nothing about the others.
- Accessibility and keyboard navigation
- Search and navigation
- Internal links
- Images and screenshots
- Existing functionality
- Relevant automated tests
- Regressions

## Product Direction

The Help Center should help users reach an answer quickly.

Users should be able to:

- Search easily
- Browse clear categories and subcategories
- Scan articles quickly
- Follow visual or step-by-step instructions
- Expand secondary information when needed
- Discover related help naturally
- Navigate comfortably on mobile

Interaction must serve a purpose. Do not add features simply to make the site look more dynamic.

## Engineering Workflow

For meaningful features or structural changes:

1. Inspect the existing implementation first.
2. Have the relevant specialist agent review the problem.
3. Let the Lead Engineer determine the implementation approach.
4. Reuse existing architecture where appropriate.
5. Implement the smallest coherent long-term solution.
6. Add or update appropriate tests.
7. Run validation.
8. Have QA/Accessibility review the result.
9. Fix discovered regressions before considering the work complete.

Do not blindly implement a requested technical solution when a safer, simpler, or more maintainable industry-standard approach exists.

Do not overengineer. Build only the architecture and abstractions the Help Center reasonably needs.
