# Unified Support Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Bread header, search, navigation, page width, and footer stable across Help Center, All topics, feedback, category, glossary, and article views.

**Architecture:** `App` chooses the top-level pathname while the existing hash router continues to resolve category, glossary, and article deep links. A shared `PublicShell` owns the persistent chrome; content components render only their page body. `/topics` gets a grouped index and `/feedback` gets a React form that uses same-origin feedback APIs.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Playwright, existing Bread CSS tokens.

**Spec:** `docs/superpowers/specs/2026-09-18-unified-support-feedback-design.md`

## Global Constraints

- Preserve existing hash deep links and search behavior.
- Use `#E77537` primary orange and `#C95A21` hover orange.
- Card translation is at most two pixels; directional icons at most three pixels.
- Reduced motion removes translation and compression.
- Feedback posts to `/api/feedback/submit` and polls `/api/feedback/status`.
- Unknown `/api/*` and `/admin/*` paths never render the React app.

---

### Task 1: Top-level public routing

**Files:**
- Create: `src/help-center/publicRoute.ts`
- Test: `src/help-center/publicRoute.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `parsePublicRoute(pathname: string): 'help' | 'topics' | 'feedback' | 'not-found'`.

- [ ] **Step 1: Write the failing route test** covering `/`, `/topics`, `/feedback`, `/api/feedback/submit`, and `/admin/review`.
- [ ] **Step 2: Run `yarn vitest run src/help-center/publicRoute.test.ts` and confirm failure.**
- [ ] **Step 3: Implement an exact-path parser; privileged paths return `not-found`.**
- [ ] **Step 4: Run the route test and confirm it passes.**

### Task 2: Persistent shell and grouped topic index

**Files:**
- Create: `src/help-center/PublicShell.tsx`
- Create: `src/help-center/AllTopics.tsx`
- Modify: `src/help-center/HelpCenter.tsx`
- Modify: `src/help-center/HelpCenterHome.tsx`
- Modify: `src/help-center/HelpCenterFooter.tsx`
- Modify: `src/help-center/links.ts`
- Test: `e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: `parsePublicRoute` from Task 1.
- Produces: `PublicShell({ active, searchValue, onSearch, children })` and `AllTopics({ categories })`.

- [ ] **Step 1: Add a browser test asserting the same header bounding box and nav remain after navigating Home → All topics → article.**
- [ ] **Step 2: Run the navigation spec and confirm the continuity assertion fails.**
- [ ] **Step 3: Move lockup, global search, primary nav, and footer into `PublicShell`; make home render body content only.**
- [ ] **Step 4: Render every category and its articles in `AllTopics`, using existing `categoryHref` and `articleHref` helpers.**
- [ ] **Step 5: Point support links to `/feedback` and keep all public pages inside `PublicShell`.**
- [ ] **Step 6: Run unit and navigation tests and confirm they pass.**

### Task 3: Feedback form parity

**Files:**
- Create: `src/feedback/api.ts`
- Create: `src/feedback/FeedbackPage.tsx`
- Create: `src/feedback/feedback.css`
- Test: `src/feedback/api.test.ts`
- Test: `e2e/feedback.spec.ts`

**Interfaces:**
- Produces: `submitFeedback(form: FormData): Promise<SubmissionReceipt>` and `getFeedbackStatus(receiptId: string, installId: string): Promise<PublicFeedbackStatus>`.

- [ ] **Step 1: Add API tests proving the submit endpoint is `/api/feedback/submit` and status endpoint is `/api/feedback/status`.**
- [ ] **Step 2: Run the API tests and confirm failure.**
- [ ] **Step 3: Implement typed same-origin API functions with useful errors.**
- [ ] **Step 4: Implement fields for type, platform, wallet version, title, description, attachments, local install ID, Turnstile placeholder, receipt display, and status polling.**
- [ ] **Step 5: Add a browser test for required fields, secret warning copy, successful receipt UI, and shell continuity.**
- [ ] **Step 6: Run API and browser tests and confirm they pass.**

### Task 4: Bread interaction polish and responsive behavior

**Files:**
- Modify: `src/help-center/help-center.css`
- Modify: `src/help-center/tokens.css`
- Modify: `src/feedback/feedback.css`
- Test: `e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: shell and page class names from Tasks 2–3.

- [ ] **Step 1: Add assertions for active nav state, keyboard focus, mobile menu, and reduced-motion computed transforms.**
- [ ] **Step 2: Add warm hover surfaces, orange focus rings, two-pixel card lift, three-pixel arrow motion, tactile button press, and loaf corners.**
- [ ] **Step 3: Add responsive one-column topics and feedback layouts plus reduced-motion overrides.**
- [ ] **Step 4: Run `yarn verify` and `yarn build`; confirm both pass.**

### Task 5: Commit the public application

**Files:** all files in Tasks 1–4.

- [ ] **Step 1: Review the diff for unrelated content changes.**
- [ ] **Step 2: Commit with `feat: unify support navigation and feedback UI`.**

