# DEW

DEW is a skincare web app that matches you with people who share your skin, climate and goals, then picks, samples and tracks a routine for you.

Live site: https://enyajpan.github.io/dew-web/

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

## Run locally

It's a static site with no build step:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Notes

Product names and photos are real products from brand and retailer sites. Prices, scores, match counts, reviews and creator profiles are placeholders for the prototype.
