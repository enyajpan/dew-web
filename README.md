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

Points, cart, ratings and check-ins are saved in your browser (localStorage). Use **Reset demo data** at the bottom of the profile tracker to start over, and **Demo: jump to 1,500 pts** to see the sample box unlock.

## Layout

The top nav is fixed. On desktop the left column (check-in and shelf), the middle column and the right column each scroll on their own. Below 820px wide the page falls back to a single scrolling column.

## Backend

- **Database:** Supabase (Postgres). Schema in `supabase/migrations/`: products, review sources, rating snapshots, reviews and scrape runs. Public reads, server-only writes.
- **API** (Vercel functions in `api/`):
  - `GET /api/products` and `GET /api/products?id=t28_sos`: products with the latest published star rating per retailer.
  - `GET /api/reviews?product=t28_sos&skin_type=Combination&limit=20&offset=0`: scraped reviews, newest first.
- **Review scraper** (`scraper/`): runs daily through Vercel Cron (`/api/cron/scrape`, 09:00 UTC). It identifies itself as `DewReviewBot`, follows robots.txt, waits 3 seconds between requests to a site, and:
  - saves full reviews from keyless review widgets (Okendo) and schema.org data on product pages;
  - saves the published star rating and review count from any product page;
  - marks sites that refuse bots as `blocked`, and sites whose review text needs a vendor partnership (PowerReviews, Bazaarvoice, Yotpo) as `needs_partnership`.

To track a new product page, add it to `scraper/sources.json` and run `npm run seed`.

## Run locally

Needs Node 22+ and a `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.

```
npm install
npm run local        # site + API at http://localhost:3000
npm run scrape:dry   # scrape sources.json into scraper/out/ without touching the database
npm run scrape       # scrape due sources into Supabase
npm run seed         # load products and review sources into Supabase
```

## Notes

Product names and photos are real products from brand and retailer sites. Prices, scores, match counts, reviews and creator profiles are placeholders for the prototype.
