# HSN price dashboard refresh

Status: approved by user on October 19, 2026.

## Goal

Within seconds, visitors should understand which supplements are tracked, the latest recorded prices, how those prices compare with recorded lows, and how to get Discord alerts.

## Approaches

1. Recommended: compact dark dashboard. Two product cards with prominent prices, separate readable charts, and a short alert setup panel. Reuses the installed Recharts, Lucide, Tailwind, and existing history endpoint.
2. Light dashboard: the same information on white cards with restrained color. Clear and familiar, but a larger departure from the existing dark appearance.
3. Chart-only cleanup: restyle the current charts and labels. Smallest scope, but leaves visitors doing the work of interpreting prices.

## Recommended design

- Header: “HSN Price Tracker”, a plain-language description, English/Portuguese controls, and “Get price alerts”.
- Charcoal background, restrained emerald and blue product accents, fine borders, generous spacing, clear type hierarchy, and visible keyboard focus.
- Product names: “Evowhey Protein” with “2 kg”, and “Creatine Monohydrate” with “1 kg”; natural Portuguese equivalents.
- Two stacked product cards, each with its price summary beside a wide chart on desktop and above the chart on phones. This keeps the charts vertically aligned and gives frequent price changes enough space. Each shows the latest recorded price, price per kilogram, lowest recorded price, and change from the preceding recorded observation when available.
- Separate compact step-line price charts with euro axes, readable localized dates, precise timestamp tooltips, and reference lines for the lowest recorded price and median observed price. Keep the charts vertically aligned on a shared time domain so their oscillations can be compared without putting different euro ranges on one axis.
- Plot raw chronological observations on a numeric time axis using `stepAfter`, with subtle observation markers and a prominent last-observation marker. Label the chart “Recorded prices” and explain that steps change when a new price was observed; the exact time of the store's change is unknown. Avoid smooth interpolation, moving averages, and heavy area fills that obscure the short dips.
- Shared 7-day, 30-day, and all-history controls, defaulting to all history. Following user feedback, periods end at the latest observation across both products so filters remain useful when collection pauses. Show the selected dates and explain this anchor in both languages; retain the stale-data warning. Do not extend the final price to today. Break connections across observation gaps over 36 hours and explain gaps as missing observations.
- Latest observation timestamps expose data freshness. Never claim a live connection or verified Discord health.
- Brief Discord instructions explain adding the bot and using `/subscribe`, with the existing authorization link.

## Data and states

Keep `/api/history`, scraping, storage, and Discord behavior unchanged. Sort valid observations by timestamp and normalize display and comparison values to euro cents so sub-cent precision does not appear as meaningful price oscillation. Derive latest prices from raw observations and retain timestamps and intraday movements in the chart. Derive each product independently; never carry another product’s price forward. Label medians as observation-based, not time-weighted, and avoid predicting future sales from this short history.

## Evidence from the deployed history endpoint

Read-only inspection of https://hsn-scraper.vercel.app/api/history on October 19, 2026 returned 308 observations spanning June 29 to September 19, 2026:

| Product | Observations | Price changes at cent precision | Pattern |
| --- | ---: | ---: | --- |
| Evowhey Protein | 155 | 17 | 132 observations at €61.49, short dips near €55.89–€55.90, and a final rise to €74.54. Recorded minimum €54.78. |
| Creatine Monohydrate | 153 | 43 | 94 observations at €15.66, repeatedly interrupted by higher levels around €22.87–€26.52. Latest €26.06. |

This is plateau-and-jump behavior, especially pronounced for creatine. Step lines communicate the observed levels and abrupt transitions better than smooth curves. There are no within-day cent-level changes in this snapshot, but retaining raw observations preserves future intraday changes. The largest observation gap is about 43.4 hours. The latest observations are approximately 30 days old, so freshness must be explicit.

An unavailable API gets an understandable error and retry action. Empty histories and empty selected periods get distinct messages. Loading preserves the page structure. A single observation remains visible as a chart point; no previous observation means no trend percentage. Missing prices display a dash rather than zero.

## Implementation boundaries

Keep the page responsible for fetching, language, and period selection. Extract a focused product/chart component and small pure history helpers as needed. Update translations, shared CSS, and page metadata. No new dependencies or backend changes.

## Validation

Check derived values against unordered observations, multiple observations per day, empty histories, and one-point histories. Run TypeScript, lint on changed files, and the production build. Inspect desktop and mobile with populated, loading, empty, and API-error states using mocked responses when browser tooling is available. Verify period controls, language controls, euro formatting, keyboard focus, and overflow.

## References

- https://ui.shadcn.com/charts/area — chart layout, restrained grids, area fills, and tooltips.
- https://www.shadcn.io/blocks/dashboard-price-monitoring — prominent price comparisons and directional price indicators.
- https://www.datawrapper.de/blog/weekly-chart-altitude — choosing stepped interpolation for values that stay constant until discrete changes.
