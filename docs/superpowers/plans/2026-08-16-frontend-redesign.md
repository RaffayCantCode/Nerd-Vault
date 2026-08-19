# NerdVault Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild NerdVault into a clean, modern, Cloudflare-friendly frontend with a lightweight styling system, consistent shared UI primitives, and polished responsive layouts.

**Architecture:** Replace the current styling sprawl with a small global token layer plus focused CSS modules owned by individual components or routes. Keep the brand palette and overall identity, but simplify depth, spacing, motion, and hierarchy so the interface reads as a real product instead of a decorative prototype. Shared primitives handle repeatable patterns like buttons, cards, fields, empty states, and skeletons; route files stay responsible for layout and data flow.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, existing Cloudflare Pages build flow.

---

### Task 1: Replace the global style foundation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Delete: `src/app/landing-rehaul.css`
- Delete: `src/app/books/books.css`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/styles/layout.css`

- [ ] **Step 1: Split the design tokens out of the giant stylesheet**

Move the shared color, spacing, radius, shadow, and typography values into `src/styles/tokens.css` so the visual system has one source of truth.

- [ ] **Step 2: Reduce the root stylesheet to a small base layer**

Keep only resets, typography defaults, scrollbar treatment, selection color, motion reduction, and a few layout helpers in `src/app/globals.css`. Import the new token/base files from the root layout rather than leaving component-specific rules there.

- [ ] **Step 3: Remove the old landing stylesheet and obsolete page CSS**

Delete `src/app/landing-rehaul.css` and `src/app/books/books.css` once the page modules replace their styling responsibilities.

- [ ] **Step 4: Verify the app still boots with the new base**

Run: `npm.cmd run build`
Expected: Next.js compiles without CSS or import errors.

### Task 2: Create reusable UI primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/field.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/section-header.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/index.ts`
- Create: `src/components/ui/button.module.css`
- Create: `src/components/ui/card.module.css`
- Create: `src/components/ui/field.module.css`
- Create: `src/components/ui/empty-state.module.css`
- Create: `src/components/ui/section-header.module.css`
- Create: `src/components/ui/skeleton.module.css`

- [ ] **Step 1: Build the shared button and field primitives**

Define a compact button system for primary, secondary, ghost, and icon actions, plus a matching text field / textarea / select style set for auth, search, and forms.

- [ ] **Step 2: Build the shared surface primitives**

Create card, section header, empty state, and skeleton components that make all pages visually consistent without repeating class strings and inline styles.

- [ ] **Step 3: Export the primitives through a single module**

Add `src/components/ui/index.ts` so pages and workspaces can import the same building blocks from one place.

- [ ] **Step 4: Verify the primitives are ready for reuse**

Run: `npm.cmd run build`
Expected: TypeScript accepts the new component props and CSS module imports.

### Task 3: Rebuild the shell and navigation

**Files:**
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/app-topbar.tsx`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/components/sidebar-shell.tsx`
- Modify: `src/components/mobile-bottom-nav.tsx`
- Modify: `src/components/brand-logo.tsx`
- Create: `src/components/site-header.module.css`
- Create: `src/components/app-topbar.module.css`
- Create: `src/components/app-sidebar.module.css`
- Create: `src/components/mobile-bottom-nav.module.css`

- [ ] **Step 1: Redesign the public header**

Replace the current header with a calm, compact nav that keeps the NerdVault identity but removes the heavy floating controls and checkbox-driven mobile toggle.

- [ ] **Step 2: Rebuild the authenticated top bar**

Make the top bar feel like a tidy utility strip with clear search, inbox, and profile regions, tighter spacing, and a cleaner dropdown structure for guest prompts and social actions.

- [ ] **Step 3: Simplify the sidebar and mobile navigation**

Make the sidebar consistent across vault, browse, books, activity, and friends, and give mobile a more intentional bottom navigation with clear active states and no noisy overlap.

- [ ] **Step 4: Verify the shell works on small screens**

Run: `npm.cmd run build`
Expected: Shell components compile and the responsive nav markup stays intact.

### Task 4: Rebuild landing, auth, and account entry points

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/sign-in/page.tsx`
- Modify: `src/app/forgot-password/page.tsx`
- Modify: `src/app/reset-password/page.tsx`
- Modify: `src/components/guest-shell.tsx`
- Modify: `src/components/landing-auth-card.tsx`
- Modify: `src/components/landing-feature-carousel.tsx`
- Modify: `src/components/hero-interactive-showcase.tsx`
- Modify: `src/components/guest-auth-prompt.tsx`
- Modify: `src/components/auth-required-modal.tsx`
- Create: `src/app/page.module.css`
- Create: `src/app/sign-in/page.module.css`
- Create: `src/app/forgot-password/page.module.css`
- Create: `src/app/reset-password/page.module.css`

- [ ] **Step 1: Rebuild the landing page as a cleaner product home**

Keep the same brand tone, but replace the current busy hero with a focused editorial layout, concise copy, stronger typographic hierarchy, and fewer decorative layers.

- [ ] **Step 2: Restyle the sign-in and password recovery pages**

Make auth screens feel like part of the same product system, with simple panels, obvious form states, and no extra visual clutter.

- [ ] **Step 3: Tighten guest-mode surfaces**

Update guest shell, auth prompts, and supporting landing components so guests see a polished browse-first experience instead of a patched-together fallback.

- [ ] **Step 4: Verify the entry flows render cleanly**

Run: `npm.cmd run build`
Expected: Landing and auth routes compile and still route correctly for guests and signed-in users.

### Task 5: Rework the core app pages

**Files:**
- Modify: `src/app/home/page.tsx`
- Modify: `src/app/browse/page.tsx`
- Modify: `src/app/media/[slug]/page.tsx`
- Modify: `src/app/media/[slug]/reviews/page.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/lists/[id]/page.tsx`
- Modify: `src/app/activity/page.tsx`
- Modify: `src/app/friends/page.tsx`
- Modify: `src/app/books/page.tsx`
- Modify: `src/app/books/[id]/page.tsx`
- Modify: `src/app/books/[id]/read/page.tsx`
- Modify: `src/app/books/wishlist/page.tsx`
- Modify: `src/app/vault/page.tsx`
- Modify: `src/app/support/page.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Create: `src/app/home/page.module.css`
- Create: `src/app/browse/page.module.css`
- Create: `src/app/media/[slug]/page.module.css`
- Create: `src/app/media/[slug]/reviews/page.module.css`
- Create: `src/app/profile/page.module.css`
- Create: `src/app/lists/[id]/page.module.css`
- Create: `src/app/activity/page.module.css`
- Create: `src/app/friends/page.module.css`
- Create: `src/app/books/page.module.css`
- Create: `src/app/books/[id]/page.module.css`
- Create: `src/app/books/[id]/read/page.module.css`
- Create: `src/app/books/wishlist/page.module.css`
- Create: `src/app/vault/page.module.css`
- Create: `src/app/support/page.module.css`
- Create: `src/app/admin/page.module.css`
- Create: `src/app/admin/settings/page.module.css`
- Create: `src/app/admin/users/page.module.css`

- [ ] **Step 1: Convert the main content areas to the new card system**

Restyle the home feed, browse grids, media detail panels, profile views, lists, books, activity, friends, and admin views using the new primitives instead of page-local one-off styles.

- [ ] **Step 2: Rebuild page structure around consistent spacing**

Use the same container widths, section rhythm, and responsive breakpoints across all major pages so the product feels intentionally designed rather than page-by-page different.

- [ ] **Step 3: Normalize metadata, tabs, and action rows**

Make all page actions, filters, tabs, and badge rows use the same typography and spacing patterns, especially on media pages and profile/list views.

- [ ] **Step 4: Verify the core pages still route and render**

Run: `npm.cmd run build`
Expected: No page-specific CSS or component import regressions.

### Task 6: Polish loading, empty, and error states

**Files:**
- Modify: `src/app/error.tsx`
- Modify: `src/app/activity/error.tsx`
- Modify: `src/app/activity/loading.tsx`
- Modify: `src/app/admin/error.tsx`
- Modify: `src/app/books/error.tsx`
- Modify: `src/app/books/loading.tsx`
- Modify: `src/app/books/[id]/error.tsx`
- Modify: `src/app/books/[id]/loading.tsx`
- Modify: `src/app/books/[id]/read/error.tsx`
- Modify: `src/app/books/[id]/read/loading.tsx`
- Modify: `src/app/browse/loading.tsx`
- Modify: `src/app/friends/error.tsx`
- Modify: `src/app/friends/loading.tsx`
- Modify: `src/app/home/loading.tsx`
- Modify: `src/app/media/[slug]/error.tsx`
- Modify: `src/app/media/[slug]/loading.tsx`
- Modify: `src/app/profile/loading.tsx`
- Modify: `src/app/sign-in/error.tsx`
- Modify: `src/app/sign-in/loading.tsx`
- Modify: `src/app/support/error.tsx`
- Modify: `src/app/support/loading.tsx`
- Modify: `src/components/nv-loader.tsx`
- Modify: `src/components/route-loader.tsx`
- Modify: `src/components/action-feedback.tsx`
- Modify: `src/components/scroll-manager.tsx`
- Modify: `src/components/performance-optimizer.tsx`
- Modify: `src/components/vault-workspace.tsx`
- Modify: `src/components/home-workspace.tsx`
- Modify: `src/components/browse-workspace.tsx`
- Modify: `src/components/profile-workspace.tsx`
- Modify: `src/components/list-detail-workspace.tsx`
- Modify: `src/components/books-workspace.tsx`

- [ ] **Step 1: Redesign loaders and skeletons**

Replace dense spinner and shimmer patterns with calmer skeleton blocks and page-scoped loading shells that match the new card system.

- [ ] **Step 2: Restyle empty states and error states**

Give empty lists, empty searches, and error boundaries a cleaner layout with obvious recovery actions and less visual noise.

- [ ] **Step 3: Remove leftover style coupling**

Strip obsolete utility classes and page-specific overrides that were only supporting the old giant stylesheet.

- [ ] **Step 4: Verify the app is still stable**

Run: `npm.cmd run build`
Expected: Build passes after loading and error state updates.

### Task 7: Final responsive pass and cleanup

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/app-topbar.tsx`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/components/mobile-bottom-nav.tsx`

- [ ] **Step 1: Check mobile-first behavior across the rebuilt surfaces**

Confirm the landing page, auth screens, nav, and primary content pages stay readable and usable from narrow widths up through desktop.

- [ ] **Step 2: Remove any dead CSS or dead component variants**

Delete styling files or class variants that no longer serve a real page or component after the redesign lands.

- [ ] **Step 3: Run the Cloudflare-targeted build**

Run: `npm.cmd run pages:build`
Expected: `@cloudflare/next-on-pages` finishes and writes `.vercel/output/static` without build or prerender failures.

- [ ] **Step 4: Run the final verification build**

Run: `npm.cmd run build`
Expected: The normal Next.js build remains green after the redesign.

No additional CSS deletions are expected beyond the explicit removals in Tasks 1 and 5.
