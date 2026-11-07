# DEW

DEW is a skincare web app that matches you with people who share your skin, climate and goals, then picks, samples and tracks a routine for you.

Live site: https://dew-web-three.vercel.app (Vercel; every push to `main` deploys)

## What works

- **For you:** 10 picks split into "Fills a gap in your routine" and "Want to try something new?", public reviews from people like you, new launches and refill reminders.
- **My shelf:** tap a product to see weeks used, your rank and score, rate it, log a refill or ask Dew.
- **Skin profile:** four onboarding steps (lifestyle, skin, goals, current shelf) with profile strength and points.
- **Creators and Community:** creator shelves with rankings by category and purpose; a friends-only feed with a collapsible filter and sort panel.
- **Picked for you:** a full-size 4-step routine you can swap and add to the cart, or **Sample it first** with three minis paid for with points.
- **Cart and checkout:** refills, swaps and routine picks in one order, with points redemption (500 pts = $5 off).
- **Sample box flow:** 1,500 pts unlocks a free sample box, then a 2-week trial and a day-14 verdict that moves loved minis to full size with the sample value taken off.
- **Weekly check-in and profile:** skin health, product ratings, buy or don't buy, progress tracker, rankings, challenges and milestones.
- **Ask Dew:** a chat assistant that sits as a button in the bottom-right corner and expands.
- **Live reviews:** every product has a page (`#/product/<id>`) with its star rating on each site that reviews it and real reviews you can filter by skin type. "What people like you are saying" shows the newest reviews from people with your skin type, and picks and search show live star ratings.

Points, cart, ratings and check-ins are saved in your browser (localStorage). Use **Reset demo data** at the bottom of the profile tracker to start over, and **Demo: jump to 1,500 pts** to see the sample box unlock.

## Layout

The top nav is fixed. On desktop the left column (check-in and shelf), the middle column and the right column each scroll on their own. Below 820px wide the page falls back to a single scrolling column.

## Backend

### How data flows

```
Browser  →  dew-web-three.vercel.app/api/...  →  Supabase API  →  Postgres
```

- **Reading:** the app calls `/api/products` and `/api/reviews`. Those Vercel functions query Supabase with `@supabase/supabase-js` (which goes through Supabase's API, not a direct database connection) using the read-only anon key. The browser never talks to Supabase directly.
- **Writing:** the daily scrape (`/api/cron/scrape`) writes through the same API with the service role key. Big backfills run from a laptop with `npm run scrape -- --full`, using the keys in a local `.env`.
- **Keys:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are Vercel environment variables (and in `.env` locally, which is not committed). None of them reach the browser.

### Where data lives

| Where | What |
|---|---|
| **Supabase** (Postgres, project `dew`) | All product and review data: `products`, `review_sources` (each scraped page and its status), `reviews`, `rating_snapshots` (each site's published rating over time) and `scrape_runs` (a log of every scrape) |
| **Vercel** | Hosting, the API functions and the daily cron. Stores no data. |
| **GitHub** | Code only. |
| **Your browser** | Demo state for the prototype: points, cart, shelf ratings and check-ins (localStorage). |

### Pieces

- **Database:** Supabase (Postgres). Schema in `supabase/migrations/`: products, review sources, rating snapshots, reviews and scrape runs. Public reads, server-only writes.
- **API** (Vercel functions in `api/`):
  - `GET /api/products` and `GET /api/products?id=t28_sos`: products with the latest published star rating per retailer.
  - `GET /api/reviews?product=t28_sos&skin_type=Combination&limit=20&offset=0`: scraped reviews, newest first.
- **Review scraper** (`scraper/`): runs daily through Vercel Cron (`/api/cron/scrape`, 09:00 UTC). It identifies itself as `DewReviewBot`, follows robots.txt, waits 3 seconds between requests to a site, and:
  - saves full reviews from keyless review widgets (Okendo) and schema.org data on product pages;
  - saves the published star rating and review count from any product page;
  - marks sites that refuse bots as `blocked`, and sites whose review text needs a vendor partnership (PowerReviews, Bazaarvoice, Yotpo) as `needs_partnership`.

Where the products come from:
- `scraper/stores.json` lists brand stores whose review widgets are open (Okendo): Eadem, Tower 28, Anua, Beauty of Joseon, KraveBeauty, Rhode, Versed and Then I Met You. `node scripts/import-catalog.js` imports every skincare product they sell (no makeup, sets, minis or merch).
- `scraper/sources.json` holds hand-picked pages, including the prototype catalog in `js/data.js`. `node scripts/find-sources.js --write` suggests pages for catalog products, then `npm run seed` loads them.

Each product keeps its newest 1,000 reviews. The daily cron only fetches reviews newer than the last ones saved; `npm run scrape -- --full` re-reads everything.

Sephora, Olive Young and Bubble block automated access. Ulta, Shiseido and stores using PowerReviews, Bazaarvoice, Yotpo, Judge.me or Stamped only publish a star rating openly; their review text needs a data partnership with the review provider.

## Run locally

Needs Node 22+ and a `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.

```
npm install
npm run local        # site + API at http://localhost:3000
npm run scrape:dry   # scrape sources.json into scraper/out/ without touching the database
npm run scrape       # scrape due sources into Supabase (add -- --full to backfill)
npm run seed         # load products and review sources into Supabase
```

## Changelog

**November 7, 2026: backend**
- Moved hosting from GitHub Pages to Vercel (GitHub Pages is turned off). The repo is connected, so every push to `main` deploys.
- Added a Supabase database for products and reviews, and API routes on Vercel that read from it.
- Built the review scraper with a daily Vercel cron. It follows robots.txt, rate-limits itself, and doesn't work around sites that block bots or need a vendor key.
- Imported the full skincare catalogs of 8 brand stores (155 products) on top of the prototype's 42, and backfilled up to 1,000 reviews per product.
- Wired the app to the live data: a product page with ratings and reviews filtered by skin type, live reviews on For you, and star ratings on picks and search. If the API is unreachable, the app falls back to the sample data.
- Safeguards: a product page that redirects elsewhere is treated as an error, reviews are read only for the page's own product, and reviews with no real text are hidden.

## Notes

Product names and photos are real products from brand and retailer sites. Reviews and published star ratings are real, scraped from brand sites. Prices, match scores, match counts, the prototype's sample reviews and creator profiles are still placeholders.
