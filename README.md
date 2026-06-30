# HSN Price Scraper & Discord Bot 🏋️‍♂️

This is a scraper to get the price of whey protein and creatine from the HSN Store. It automatically tracks the price over time using a scheduled cron job and immediately pings you via a Discord Direct Message if a flash sale or price drop is detected!

## 🏗 Architecture & Flow

The system is fully automated and serverless, utilizing GitHub Actions, Vercel, ScrapingAnt, and Upstash Redis.

```mermaid
sequenceDiagram
    participant Web as Web Dashboard
    participant User as Discord User
    participant GitHub as GitHub Actions (Cron)
    participant Vercel as Vercel API
    participant Scraper as ScrapingAnt Proxy
    participant HSN as HSN Store (Target)
    participant Redis as Upstash Redis (KV)
    participant Discord as Discord API

    Note over Web,Vercel: Dashboard Flow
    Web->>Vercel: GET /api/history (Cached)
    Vercel->>Redis: Fetch historical prices
    Vercel-->>Web: Render Price Charts

    Note over User,Vercel: Slash Commands Flow (User Install)
    User->>Vercel: /subscribe, /unsubscribe, /test
    Vercel->>Redis: Check User Rate Limit (15 req/min)
    Vercel->>Redis: Save/Remove User from subs:{product}
    alt If /subscribe AND Sale is Active
        Vercel->>Discord: INSTANT Open DM & Send Alert
        Vercel->>Redis: Add User to alerted:{product}
    end
    Vercel-->>User: Ephemeral Response
    
    Note over GitHub,Discord: Automated Scrape Flow
    GitHub->>Vercel: 1. Trigger Scrape (09:00 & 16:00)
    Note over GitHub,Vercel: Bypasses 10 req/day global limit via ?secret=CRON_SECRET
    
    loop For each Product (Evowhey & Creatine)
        Vercel->>Scraper: 2. Fetch HTML via Proxy
        Scraper->>HSN: 3. Bypasses Cloudflare
        Scraper-->>Vercel: Raw HTML
        
        Vercel->>Vercel: 4. Extract currentPrice
        Vercel->>Redis: 5. Compare currentPrice vs baselinePrice & Save to History
        
        alt If percentDrop >= 10%
            Vercel->>Redis: 6. Get Subscribed Users who are NOT in alerted:{product}
            Vercel->>Discord: 7. Open DM & Send Alert
            Vercel->>Redis: 8. Add users to alerted:{product}
            Note over Vercel,Redis: Baseline is preserved so new subscribers can see the drop!
        else If currentPrice > baselinePrice
            Vercel->>Redis: 9. Sale ended! Reset Baseline higher & Clear alerted:{product}
        end
        Note over Vercel,Redis: If drop is minor (<10%), Baseline is NOT updated (Smart Sliding Baseline)
    end
```

## ✨ Features
1. **Multi-Product Tracking**: Simultaneously tracks multiple products (Evowhey, Creatine 1Kg).
2. **Web Dashboard & Chart**: A beautiful, localized (English/Portuguese) Next.js frontend showing daily historical price drops using `recharts`.
3. **Instant Mid-Sale Alerts**: If someone types `/subscribe` while a sale is currently active, the bot detects it and instantly sends them a DM on the spot!
4. **Smart Sliding Baseline**: Perfectly handles slow, multi-day creeping flash sales by refusing to lower the internal baseline until a full 10% drop occurs!
5. **Automated Scraping**: Runs exactly at 9 AM and 4 PM local time using GitHub Actions.
6. **Cloudflare Evasion**: Uses the ScrapingAnt Proxy API (bypassing heavy headless browsers) to fetch HSN pricing fast and reliably.
7. **Discord Bot & DM Alerts**: Supports **User Installs**! Users can add the bot directly to their profile and type `/subscribe` in DMs. Includes `/unsubscribe` and a `/test` drive command.
8. **Anti-Spam Security**: 
   - Global Scraper Limit: Maximum 10 public requests per day (Cron jobs bypass this using a private `CRON_SECRET`).
   - Discord Bot Limit: Strict limit of 15 slash commands per minute per user to protect the database from malicious spam bots.

## 🚀 Setup & Environment Variables

Make sure the following environment variables are set in your **Vercel** project:

- `SCRAPINGANT_API_KEY`: Your ScrapingAnt token.
- `DISCORD_TOKEN`: Your bot's authorization token (so it can send messages).
- `DISCORD_PUBLIC_KEY`: Used to verify `/subscribe` commands securely.
- `KV_REST_API_URL` & `KV_REST_API_TOKEN`: Automatically generated if you use Upstash on Vercel.
- `CRON_SECRET`: A secret string you invent to secure your endpoint.

Make sure to add `CRON_SECRET` to your **GitHub Repository Secrets** as well so the GitHub Action can authenticate!
