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
