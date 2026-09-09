# Bread Help Center — Claude Code Guidance

Build the Bread Help Center as a production-quality support product using established industry standards.

Keep the architecture simple, maintainable, accessible, performant, secure, and easy to extend. Avoid short-term fixes that create future technical debt.

Do not write to MEMORY.md or memory memos unless Ivan explicitly asks in the current turn.

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
- Use the house vocabulary for Guardian's account keys: **everyday key** (not "hot key") and
  **recovery key** (not "cold key"). External sources, including the Miden blog, use the retired
  terms; quote them only where the note is explicitly describing that source. `content.test.ts`
  enforces this over the articles, `content-source/`, and the interface components.
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
