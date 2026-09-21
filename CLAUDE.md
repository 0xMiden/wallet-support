# Bread Help Center — Claude Code Guidance

Build the Bread Help Center as a production-quality support product using established industry standards.

Keep the architecture simple, maintainable, accessible, performant, secure, and easy to extend. Avoid short-term fixes that create future technical debt.

Do not write to MEMORY.md or memory memos unless Ivan explicitly asks in the current turn.

## Brand and design system — standing rule

The current design system follows wallet PR #1047 at `9e6c69ca7cac6ae8cc12d657613e4b4db490293b`, the reviewed tip of its design-system PR stack. See `tasks/design-system-upgrade.md` for the audit and scope. Motion follows the newer wallet PR #1054 at `02337f752720e9929c6e9afcd4945f2fd296a8d4`; see `src/lib/animation/README.md`. This approved direction supersedes the earlier PR #9 presentation rules.

- Use source-owned shadcn/Radix primitives in `src/components/ui`, layout compositions in `src/components/support`, and the copied wallet motion library in `src/lib/animation` and its CSS bridge `src/lib/animation-css.ts`.
- Semantic tokens and named typography live in `src/design-system.css`. Legacy article-renderer tokens remain in `src/help-center/tokens.css`; do not create new page-specific control systems.
- Nunito for headings/actions, Inter for reading and form fields. Fonts are self-hosted.
- White page, warm secondary fills, flat 16px cards, pill actions. Use dark accent ink for text; brand orange is a fill/icon role.
- Keyboard navigation, focus restoration, minimum 44px touch targets, responsive overflow checks, and reduced motion are required. Use Radix dialogs/sheets/selects rather than implementing focus management manually.
- Article copy and security/privacy behavior must not change as a side effect of visual work.

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
  FAQ source, the interface components, the glossary, and this file.
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

Every change goes through GitHub: a branch for the change, pushed, and a pull request into `main`.
Nothing is committed to `main` locally or pushed to it directly, and no work stays local-only.
The `main` ruleset requires the `verify` check and, by decision while the repository has one
maintainer, no approving review; the README's On GitHub section has the reasoning. Do not add a
review requirement until there is a second reviewer.

A preview is deployed from the pull request's branch before it merges, so the live page is reviewed
first, and its deploy record is committed to the same pull request. Deploy only with
`yarn deploy:preview <preview-branch>`: it writes the record itself, and the line it adds to
`tasks/deployments.jsonl` is what gets committed. Never write or edit a deploy record by hand.

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
