# Dashboard previews

Captured from the production build on October 19, 2026, using a snapshot of the deployed `/api/history` response: 155 Evowhey and 153 creatine observations. The latest observation is September 19, 2026, so the update notice is intentional. These are recorded prices, not current store quotes.

- `dashboard-desktop.png`: 1440px, English.
- `dashboard-mobile.png`: 390px, English.
- `dashboard-portuguese.png`: 1440px, Portuguese.

Browser verification covered widths from 320px to 1440px, shared chart dates, step paths, tooltips, keyboard focus, language persistence, period controls, observation tables, loading, API error/retry, empty histories, and a single observation. No horizontal overflow or page runtime errors were observed.

Re-run the price calculation checks with `npm run test:history`. They compile the two history TypeScript files into a temporary directory, run Node's built-in test runner, then remove the output. No additional test dependencies are needed.

Production TypeScript excludes standalone test files: the existing root `test.ts` imports a removed scraper function, and existing Discord Jest tests require uninstalled Jest types. Application code remains fully type-checked.
