# Price Dashboard Implementation Plan

**Goal:** Make recorded supplement prices and their oscillations readable in seconds.

**Architecture:** Keep the existing history API and Recharts. Pure history helpers normalize cents and split gaps; product cards render summaries and aligned step charts; the page manages fetching, periods, and language.

**Tech Stack:** Next.js 16, React 19, Recharts 3, Tailwind 4, TypeScript.

## Constraints

- No new runtime dependencies or backend changes.
- Preserve real timestamps; use stepAfter, separate euro axes, and a shared time domain.
- Default to all history; recent periods are relative to today; never extend stale prices to today.
- Show explicit loading, error/retry, empty, and stale-data states in English and Portuguese.
- Keep new components under 220 lines and helpers under 140 lines.

## Tasks

- [x] Add `src/lib/history.test.ts` with Node assertions for unordered prices, euro-cent normalization, invalid records, latest versus lowest values, period bounds, medians, and gaps over 36 hours. Compile with the installed TypeScript compiler and run with `node --test`; observe failure before implementing `src/lib/history.ts`.
- [x] Implement history helpers and pass the assertions. Use sorted numeric timestamps and null points to break long gaps without changing observed values.
- [x] Replace `src/lib/i18n.ts`, refresh `src/app/page.tsx`, add `src/components/product-card.tsx`, update `src/app/globals.css` and metadata. Provide language/period controls, summaries, links, step charts, and alert instructions.
- [x] Run targeted ESLint, TypeScript, helper tests, and production build. Use Playwright against real history responses and mocked loading/error/empty/single-point responses; inspect desktop/mobile screenshots and keyboard controls.
- [ ] Review the diff, resolve findings, commit only task files, push the feature branch, and open a PR with committed desktop/mobile screenshot images and verification results.
