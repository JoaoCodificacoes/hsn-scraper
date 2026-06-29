# HSN Scraper

An automated scraper built with Next.js to track the price of "Evowhey Protein - 2kg" on HSN Store.

## Current Setup

- **Framework**: Next.js (App Router)
- **Scraper Route**: `/api/scrape`
- **Methodology**: Fetches the HTML and extracts the embedded JSON configuration containing price data for all sizes/variants.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000/api/scrape](http://localhost:3000/api/scrape) to execute the scraper and see the latest price for the 2kg size.

## Next Steps
- Integrate with a database (e.g., Google Sheets / Vercel KV) to store historical prices.
- Integrate with Discord Webhook / Bot for price drop alerts.
- Deploy to Vercel and configure a Cron Job.
