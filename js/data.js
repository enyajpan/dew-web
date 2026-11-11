// Static content for the Dew prototype. Prices, scores and counts are placeholders.

const IMG = (k) => `assets/img/products/${k}.png`;
const PERSON = (k) => `assets/img/people/${k}.jpg`;

export const PRODUCTS = {
  inn_cleanser: { brand: 'Innisfree', name: 'Green Tea Amino Acid Cleansing Foam', img: IMG('inn_cleanser'), price: 14, step: 'Cleanse', size: '150 ml' },
  goodal_toner: { brand: 'Goodal', name: 'Green Tangerine Vita C Toner Pad', img: IMG('goodal_toner'), price: 22, step: 'Tone', size: '70 pads' },
  anua_txa: { brand: 'Anua', name: 'Niacinamide 5 TXA Brightening Pad', img: IMG('anua_txa'), price: 23, step: 'Treat', size: '60 pads' },
  boj_glow: { brand: 'Beauty of Joseon', name: 'Glow Serum: Propolis + Niacinamide', img: IMG('boj_glow'), price: 17, step: 'Treat', size: '30 ml' },
  sana_eye: { brand: 'Sana', name: 'Nameraka Honpo Plumping Eye Cream', img: IMG('sana_eye'), price: 13, step: 'Eyes', size: '20 g' },
  drmtlgy_eye: { brand: 'DRMTLGY', name: 'Brightening Eye Masks', img: IMG('drmtlgy_eye'), price: 44, step: 'Eyes', size: '30 pairs' },
  anua_night: { brand: 'Anua', name: 'Retinol 3 Peptide Night Repair Cream', img: IMG('anua_night'), price: 40, step: 'Moisturize', size: '50 g' },
  anua_guasha: { brand: 'Anua', name: 'Collagen Retinol Refining Gua Sha Cream', img: IMG('anua_guasha'), price: 35, step: 'Moisturize', size: '50 ml' },
  cerave_int: { brand: 'CeraVe', name: 'Intensive Moisturizing Lotion', img: IMG('cerave_int'), price: 20, step: 'Moisturize', size: '473 ml' },
  biore: { brand: 'Bioré', name: 'UV Aqua Rich Watery Essence SPF 50+', img: IMG('biore'), price: 15, step: 'Protect', size: '50 g' },
  torriden_mask: { brand: 'Torriden', name: 'DIVE IN Mask', img: IMG('torriden_mask'), price: 33, step: 'Masks', size: '10 sheets' },

  farmacy_gc: { brand: 'Farmacy', name: 'Green Clean Makeup Meltaway Cleansing Balm', img: IMG('farmacy_gc'), price: 36, step: 'Cleanse', size: '100 ml' },
  lrp_cica: { brand: 'La Roche-Posay', name: 'Cicaplast Baume B5+', img: IMG('lrp_cica'), price: 18, step: 'Moisturize', size: '40 ml' },
  shiseido_stick: { brand: 'Shiseido', name: 'Clear Sunscreen Stick SPF 50+', img: IMG('shiseido_stick'), price: 32, step: 'Protect', size: '20 g' },
  laneige_lsm: { brand: 'Laneige', name: 'Lip Sleeping Mask', img: IMG('laneige_lsm'), price: 24, step: 'Lips', size: '20 g' },
  t28_sos: { brand: 'Tower 28', name: 'SOS Rescue Spray', img: IMG('t28_sos'), price: 12, step: 'Treat', size: '30 ml' },
  biodance_mask: { brand: 'Biodance', name: 'Bio-Collagen Real Deep Mask', img: IMG('biodance_mask'), price: 19, step: 'Masks', size: '4 masks' },
  farmacy_halo: { brand: 'Farmacy', name: 'Honey Halo Ultra-Hydrating Ceramide Moisturizer', img: IMG('farmacy_halo'), price: 48, step: 'Moisturize', size: '50 ml' },
  biodance_serum: { brand: 'Biodance', name: 'Pore Perfecting Collagen Peptide Serum', img: IMG('biodance_serum'), price: 22, step: 'Treat', size: '30 ml' },
  t28_serum: { brand: 'Tower 28', name: 'SOS Rescue Serum', img: IMG('t28_serum'), price: 34, step: 'Treat', size: '30 ml' },
  farmacy_potion: { brand: 'Farmacy', name: 'Honey Potion Plus Ceramide Hydration Mask', img: IMG('farmacy_potion'), price: 45, step: 'Masks', size: '50 g' },

  gmcleanser: { brand: 'COSRX', name: 'Low pH Good Morning Gel Cleanser', img: IMG('gmcleanser'), price: 14, step: 'Cleanse', size: '150 ml' },
  peel: { brand: 'COSRX', name: 'Low pH Good Night Soft Peeling Gel', img: IMG('peel'), price: 16, step: 'Treat', size: '120 ml' },
  levelup: { brand: 'Bubble', name: 'Level Up Balancing Gel Moisturizer', img: IMG('levelup'), price: 20, step: 'Moisturize', size: '50 ml' },
  anua_toner: { brand: 'Anua', name: 'Heartleaf 77 Soothing Toner', img: IMG('anua_toner'), price: 24, step: 'Tone', size: '250 ml' },
  new0: { brand: 'Anua', name: 'Barrier Reboot Milky Foam Toner', img: IMG('new0'), price: 26, step: 'Tone', size: '200 ml' },
  new1: { brand: 'Innisfree', name: 'Green Tea PDRN Firming Eye Patches', img: IMG('new1'), price: 28, step: 'Eyes', size: '60 patches' },
  new2: { brand: 'Innisfree', name: 'Black Volcanic PHA Cleansing Oil', img: IMG('new2'), price: 25, step: 'Cleanse', size: '200 ml' },
  new3: { brand: 'numbuzin', name: 'No.9 NAD+ PDRN Glow Serum Mist', img: IMG('new3'), price: 24, step: 'Treat', size: '100 ml' },
  snail: { brand: 'COSRX', name: 'Advanced Snail 96 Mucin Essence', img: IMG('snail'), price: 25, step: 'Treat', size: '100 ml' },
  cosrx_patch: { brand: 'COSRX', name: 'Acne Pimple Master Patch', img: IMG('cosrx_patch'), price: 7, step: 'Masks', size: '24 patches' },
  bha: { brand: 'COSRX', name: 'BHA Blackhead Power Liquid', img: IMG('bha'), price: 25, step: 'Treat', size: '100 ml' },
  cerave: { brand: 'CeraVe', name: 'Daily Moisturizing Lotion', img: IMG('cerave'), price: 17, step: 'Moisturize', size: '355 ml' },
  jetlag: { brand: 'Summer Fridays', name: 'Jet Lag Mask', img: IMG('jetlag'), price: 49, step: 'Masks', size: '64 g' },
  boj_sun: { brand: 'Beauty of Joseon', name: 'Relief Sun SPF50+', img: IMG('boj_sun'), price: 18, step: 'Protect', size: '50 ml' },
  farmacy_eye: { brand: 'Farmacy', name: 'Wide Awake Vitamin C Eye Cream', img: IMG('farmacy_eye'), price: 38, step: 'Eyes', size: '15 ml' },
  lbb: { brand: 'Summer Fridays', name: 'Lip Butter Balm', img: IMG('lbb'), price: 24, step: 'Lips', size: '15 g' },
  slamdunk: { brand: 'Bubble', name: 'Slam Dunk Hydrating Moisturizer', img: IMG('slamdunk'), price: 24, step: 'Moisturize', size: '50 ml' },
  inn_cream: { brand: 'Innisfree', name: 'Green Tea Seed Hyaluronic Cream', img: IMG('inn_cream'), price: 32, step: 'Moisturize', size: '50 ml' },
  inn_micellar: { brand: 'Innisfree', name: 'Green Tea Amino Acid Cleansing Water', img: IMG('inn_micellar'), price: 18, step: 'Cleanse', size: '300 ml' },
  numbuzin_pad: { brand: 'numbuzin', name: 'No.5 Vitamin-Niacinamide Toner Pads', img: IMG('numbuzin_pad'), price: 26, step: 'Tone', size: '70 pads' },
};

// Your shelf: top shelf fills first, then the bottom shelf.
export const SHELF = [
  { id: 'inn_cleanser', score: 8.4, weeks: 9, since: 'Sep 2', use: 'AM + PM' },
  { id: 'goodal_toner', score: 8.8, weeks: 6, since: 'Sep 23', use: 'AM', daysLeft: 14 },
  { id: 'anua_txa', score: 9.5, weeks: 6, since: 'Sep 23', use: 'AM' },
  { id: 'boj_glow', score: 9.3, weeks: 6, since: 'Sep 23', use: 'AM + PM' },
  { id: 'sana_eye', score: 7.8, weeks: 4, since: 'Oct 7', use: 'PM' },
  { id: 'drmtlgy_eye', score: 8.2, weeks: 3, since: 'Oct 14', use: 'As needed' },
  { id: 'anua_night', score: 9.0, weeks: 3, since: 'Oct 14', use: 'PM only' },
  { id: 'anua_guasha', score: 3.0, weeks: 4, since: 'Oct 7', use: 'PM' },
  { id: 'cerave_int', score: 8.6, weeks: 8, since: 'Sep 9', use: 'PM' },
  { id: 'biore', score: 9.4, weeks: 10, since: 'Aug 26', use: 'AM', daysLeft: 5 },
  { id: 'torriden_mask', score: 8.7, weeks: 5, since: 'Sep 30', use: '2x a week' },
];

export const PICKS = {
  gaps: [
    { id: 'farmacy_gc', why: 'No first cleanse on your shelf. It melts SPF and makeup before your Innisfree foam.', buy: 87, results: 'Results ~1 week', matched: 312, score: 9.1 },
    { id: 'lrp_cica', why: 'Your retinol nights have no barrier step. Seals in moisture where you logged flaking.', buy: 91, results: 'Results ~1 week', matched: 428, score: 9.4 },
    { id: 'shiseido_stick', why: 'Your Bioré runs out in ~5 days, and nothing on your shelf reapplies over makeup.', buy: 84, results: 'Reapply on the go', matched: 266, score: 8.7 },
    { id: 'laneige_lsm', why: 'No lip step yet. People like you pair it with retinol to stop dry corners.', buy: 89, results: 'Results ~3 nights', matched: 504, score: 9.0 },
    { id: 't28_sos', why: 'Calms the redness you logged on vitamin C and TXA pad days.', buy: 82, results: 'Results ~2 weeks', matched: 198, score: 8.5 },
  ],
  fresh: [
    { id: 'biodance_mask', why: 'The overnight hydrogel mask behind most glass skin posts from people like you.', buy: 86, results: 'Results overnight', matched: 611, score: 8.9 },
    { id: 'farmacy_halo', why: 'A richer ceramide cream for winter, one step up from your CeraVe lotion.', buy: 83, results: 'Results ~2 weeks', matched: 241, score: 8.6 },
    { id: 'biodance_serum', why: 'Peptides for texture. Layers under your Anua retinol cream.', buy: 80, results: 'Results ~4 weeks', matched: 156, score: 8.3 },
    { id: 't28_serum', why: 'A fragrance-free calming serum for sensitive weeks.', buy: 81, results: 'Results ~2 weeks', matched: 133, score: 8.2 },
    { id: 'farmacy_potion', why: 'A warming weekly mask that pairs with your Torriden sheet masks.', buy: 78, results: 'Results after 1 use', matched: 119, score: 8.0 },
  ],
};

export const LAUNCHES = [
  { id: 'new0', step: 'Tone step', helps: 'Barrier repair', buy: 88 },
  { id: 'new1', step: 'Eye step', helps: 'Firms + de-puffs', buy: 81 },
  { id: 'new3', step: 'Treat step', helps: 'Glow + hydration', buy: 84 },
  { id: 'new2', step: 'Cleanse step', helps: 'Clears pores', buy: 79 },
];

export const REFILLS = [
  { id: 'biore', note: '~5 days left', action: 'refill', alt: 'Keep it  9.4' },
  { id: 'goodal_toner', note: '~2 weeks left', action: 'refill', alt: 'Swap for winter?' },
  { id: 'anua_guasha', note: 'You rated it 3.0', action: 'replace', replaceWith: 'farmacy_halo', alt: 'Honey Halo  92% match' },
];

export const PUBLIC_REVIEWS = [
  { name: 'Priya Nair', avatar: PERSON('women_44'), source: 'Sephora', meta: '6 weeks tracked', verdict: 'buy', resultWeek: 'Week 2', product: 'anua_toner', score: 9.3, changes: ['Less redness', 'Fewer breakouts'], text: 'Redness around my nose was gone by week 2. Chin breakouts are way down.', similar: 96 },
  { name: 'hana.s', avatar: PERSON('women_21'), source: 'Reddit', meta: 'Verified purchase', verdict: 'skip', resultWeek: 'None by week 4', product: 'slamdunk', score: 3.0, changes: ['More breakouts', 'Clogged jawline'], text: 'Broke me out along my jawline in week 1. Lovely texture, wrong skin.', similar: 88 },
  { name: 'Leo Park', avatar: PERSON('men_32'), source: 'YesStyle', meta: '10 weeks tracked', verdict: 'buy', resultWeek: 'Week 4', product: 'snail', score: 9.0, changes: ['Faded marks', 'Calmer skin'], text: 'Post-acne marks faded faster than anything else I’ve tried.', similar: 93 },
];

export const COMMUNITY = [
  { pid: 'priya', name: 'Priya Nair', avatar: PERSON('women_44'), rel: 'Friend', when: '2 days ago', product: 'anua_toner', usage: 'AM + PM  6 weeks  Miami, FL', score: 9.3, similar: 96, tags: ['Combination', 'Acne-prone', 'Humid'], text: 'Redness around my nose calmed down by week 2 and my chin breakouts are way down. Ranked it above every toner I’ve tried.', helpful: 42, comments: 8, photos: ['w0', 'w1', 'w3', 'w5'] },
  { pid: 'jess', name: 'jessrivers', avatar: PERSON('women_12'), rel: 'Following', when: '5 days ago', product: 'inn_cream', usage: 'Normalized from 4/5 stars  Houston, TX', score: 8.4, similar: 89, tags: ['Oily', 'Humid'], text: 'Light enough for Houston summers and doesn’t pill under SPF. A bit too light once it got cold.', helpful: 118, comments: 12 },
  { pid: 'mayac', name: 'Maya Chen', avatar: PERSON('women_68'), rel: 'Friend', when: '1 week ago', product: 'cerave', usage: 'PM  3 weeks  Miami, FL', score: 4.2, similar: 92, tags: ['Combination', 'Humid'], text: 'Pilled under sunscreen and felt heavy in this humidity. Fine on my body, but it’s at the bottom of my face shelf.', helpful: 27, comments: 4 },
  { pid: 'sam', name: 'Sam Okafor', avatar: PERSON('men_75'), rel: 'Following', when: '1 week ago', product: 'boj_sun', usage: 'Daily  8 weeks  Austin, TX', score: 9.6, similar: 84, tags: ['Oily', 'High UV'], text: 'No white cast, no stinging, and it sits well under makeup. Eight weeks in, my dark spots are lighter.', helpful: 203, comments: 21 },
  { pid: 'jordan', name: 'Jordan Lee', avatar: PERSON('men_11'), rel: 'Friend', when: '2 weeks ago', product: 'cosrx_patch', usage: 'Overnight  as needed  Miami, FL', score: 8.8, similar: 90, tags: ['Acne-prone', 'Humid'], text: 'Flattens a whitehead overnight. Thin enough that I wear one on Zoom calls.', helpful: 35, comments: 3 },
  { pid: 'leo', name: 'Leo Park', avatar: PERSON('men_32'), rel: 'Friend', when: '1 month ago', product: 'snail', usage: 'AM + PM  10 weeks  Seattle, WA', score: 9.0, similar: 93, tags: ['Combination', 'Dry climate'], text: 'Helped my barrier after over-exfoliating, and the post-acne marks faded faster.', helpful: 88, comments: 9 },
  { pid: 'nina', name: 'nina.r', avatar: PERSON('women_57'), rel: 'Following', when: '2 months ago', product: 'inn_micellar', usage: 'PM  4 weeks  Tampa, FL', score: 3.6, similar: 58, tags: ['Dry'], text: 'Leaves a film, so I need a second cleanse anyway. Doesn’t really move waterproof mascara.', helpful: 12, comments: 1 },
];

export const CREATORS = [
  {
    id: 'kara', location: 'Miami, FL', age: '25–29', skin: ['Combination', 'Acne-prone'], environment: 'Humid', top3: [['anua_toner', 9.4], ['anua_night', 9.6], ['biodance_mask', 9.2]], name: 'Kara Lim', handle: '@karaskinlog', followers: '182k', avatar: PERSON('women_33'), match: 94,
    tags: ['Combination', 'Acne-prone', 'Humid', '25–29', 'Fragrance-free'], reviews: 48, weeks: 26,
    holyGrail: 'anua_toner', quote: 'The only toner I’ve repurchased six times. Redness down by week 2, and it never stings.',
    shelf: {
      Cleanse: [['gmcleanser', 8.9], ['inn_cleanser', 8.2], ['bha', 8.0], ['new2', 7.8]],
      'Tone + treat': [['anua_toner', 9.4], ['snail', 9.0], ['new3', 7.9], ['boj_glow', 8.6], ['numbuzin_pad', 8.2]],
      Moisturize: [['levelup', 9.1], ['cerave', 8.4], ['inn_cream', 8.0]],
      'Protect + eyes': [['boj_sun', 9.2], ['farmacy_eye', 7.6], ['lbb', 8.3], ['laneige_lsm', 8.5]],
      'Other: masks + spot care': [['biodance_mask', 9.0], ['jetlag', 8.1], ['cosrx_patch', 8.7], ['torriden_mask', 8.4]],
    },
    categories: { Toner: ['anua_toner', 'new3'], Cleanser: ['gmcleanser', 'inn_cleanser', 'bha'], 'Serum + essence': ['snail'], Moisturizer: ['levelup', 'cerave'], Sunscreen: ['boj_sun'], 'Eyes + lips': ['lbb', 'farmacy_eye'], 'Masks + spot care': ['biodance_mask', 'cosrx_patch', 'jetlag'] },
    purposes: { 'Best for redness': ['anua_toner', 'boj_sun', 'snail'], 'Best for hydration': ['levelup', 'snail', 'biodance_mask'], 'Best for breakouts': ['cosrx_patch', 'bha', 'gmcleanser'], 'Best for brightening': ['boj_sun', 'new3', 'farmacy_eye'], 'Best for anti-aging': ['biodance_mask', 'snail'], 'Best for dark circles': ['farmacy_eye', 'lbb'] },
    blurb: 'Hi, I’m Kara. Combination, acne-prone skin in Miami humidity, so everything here has survived sweat, SPF and 90% humidity. I only rank what I’ve used for 4+ weeks.',
    announcement: ['My humid-summer routine is up: I swapped my moisturizer for a gel and added a midday SPF.', 'Posted Oct 28', 'Shelf updated 2 days ago'],
    theme: 'blush',
    recs: [
      ['anua_toner', 'Best for redness', 'Repurchased six times. The redness around my nose was gone by week 2 and it never stings, even after shaving my upper lip.'],
      ['boj_sun', 'Best for daily SPF', 'The only sunscreen I don’t mind reapplying in Miami heat. No white cast and it sits fine under makeup.'],
      ['levelup', 'Best for oily skin', 'Light enough for summer, and my T-zone stays matte until lunch. Smells faintly of cucumber.'],
      ['snail', 'Best for hydration', 'My barrier-repair go-to after over-exfoliating. Post-acne marks faded faster too.'],
      ['biodance_mask', 'Best for glow', 'Sunday night ritual. Peel it off in the morning and my skin looks like I slept 10 hours.'],
    ],
    moreReviews: [
      ['anua_toner', 'TikTok', '2 weeks ago', 'Third bottle this year. I use it morning and night and it’s the reason my redness is under control.'],
      ['boj_sun', 'YouTube', '2 months ago', 'No white cast, doesn’t pill under makeup. The only SPF I actually reapply.'],
      ['levelup', 'Instagram', '3 weeks ago', 'Swapped my heavy cream for this in June. Matte T-zone, no tightness by evening.'],
      ['snail', 'Sephora', '1 month ago', 'Fixed the damage from my acid phase in about ten days. Sticky for a minute, then nothing.'],
      ['biodance_mask', 'TikTok', '5 weeks ago', 'Pricey, so I save it for Sundays. Worth it the morning after.'],
      ['gmcleanser', 'Sephora', '6 weeks ago', 'Low-pH and doesn’t strip. My skin never feels squeaky after.'],
      ['cosrx_patch', 'TikTok', '2 months ago', 'Flattens a whitehead overnight. I keep a sheet in every bag.'],
      ['bha', 'YouTube', '3 months ago', 'Twice a week is plenty. More than that and my cheeks get red.'],
      ['cerave', 'Sephora', '4 months ago', 'Too heavy for Miami summers, but it got me through a dry winter trip.'],
      ['lbb', 'Instagram', '1 month ago', 'Hydrating, but the bottle is tiny for the price.'],
      ['jetlag', 'TikTok', '6 weeks ago', 'Good after flights. Not something I reach for at home.'],
      ['inn_cleanser', 'Sephora', '3 months ago', 'Fine for mornings. A little drying if I use it twice a day.'],
    ],
    publicReviews: [['anua_toner', 'TikTok', '2 weeks ago', 'Repurchased six times. Redness was down by week 2 and it never stings, even after shaving my upper lip.'], ['new3', 'Sephora', '1 month ago', 'Pretty glow under makeup, but the spray comes out uneven and I go through a bottle fast.'], ['farmacy_eye', 'YouTube', '2 months ago', 'Brightens a little. Too rich for daytime, it creases under my concealer.']],
  },
  { id: 'ari', location: 'Houston, TX', age: '25–29', skin: ['Combination', 'Redness'], environment: 'Hot + humid', top3: [['boj_sun', 9.6], ['biore', 9.3], ['boj_glow', 9.1]], name: 'Ari Santos', handle: '@arisantos', followers: '96k', avatar: PERSON('women_90'), match: 91, tags: ['Combination', 'Redness', 'Hot + humid'], holyGrail: 'boj_sun', quote: 'No white cast ever.', products: ['boj_sun', 'anua_toner', 'snail', 'cerave', 'levelup', 'biore', 'laneige_lsm', 'cosrx_patch', 'inn_cream', 'lrp_cica', 'new0'] },
  { id: 'noor', location: 'Phoenix, AZ', age: '30–34', skin: ['Oily', 'Breakouts'], environment: 'High UV', top3: [['levelup', 8.8], ['lrp_cica', 9.2], ['laneige_lsm', 9.0]], name: 'Noor Haddad', handle: '@noorglows', followers: '241k', avatar: PERSON('women_79'), match: 87, tags: ['Oily', 'Breakouts', 'High UV'], holyGrail: 'levelup', quote: 'Mattes without drying.', products: ['levelup', 'gmcleanser', 'bha', 'cosrx_patch', 'boj_sun', 'peel', 'snail', 'anua_toner', 'numbuzin_pad', 'shiseido_stick', 't28_sos', 'biodance_mask', 'new2', 'inn_micellar', 'lbb', 'jetlag'] },
  { id: 'marcus', location: 'Tampa, FL', age: '30–34', skin: ['Oily', 'Texture'], environment: 'Humid', top3: [['peel', 8.7], ['t28_sos', 9.0], ['shiseido_stick', 8.6]], name: 'Marcus Bell', handle: '@marcusbell', followers: '54k', avatar: PERSON('men_46'), match: 84, tags: ['Oily', 'Texture', 'Humid'], holyGrail: 'peel', quote: 'Texture gone by week 4.', products: ['peel', 'gmcleanser', 'bha', 'levelup', 'boj_sun', 'snail', 'cosrx_patch', 'cerave', 'biore'] },
  { id: 'lucia', location: 'Chicago, IL', age: '25–29', skin: ['Combination', 'Dark spots'], environment: 'Dry winters', top3: [['snail', 8.9], ['biodance_serum', 9.1], ['lrp_cica', 8.9]], name: 'Lucia Reyes', handle: '@luciaskin', followers: '118k', avatar: PERSON('women_57'), match: 82, tags: ['Combination', 'Dark spots', 'Dry winters'], holyGrail: 'snail', quote: 'Faded my marks faster.', products: ['snail', 'anua_txa', 'boj_glow', 'farmacy_halo', 'lrp_cica', 'anua_toner', 'shiseido_stick', 'laneige_lsm', 'inn_cream', 'new1', 'farmacy_eye', 'biodance_serum', 'biodance_mask'] },
  { id: 'theo', location: 'San Diego, CA', age: '35–39', skin: ['Normal', 'Sensitive'], environment: 'Coastal', top3: [['inn_cream', 8.5], ['t28_serum', 8.8], ['goodal_toner', 8.5]], name: 'Theo Mensah', handle: '@theomensah', followers: '72k', avatar: PERSON('men_75'), match: 80, tags: ['Normal', 'Sensitive', 'Coastal'], holyGrail: 'inn_cream', quote: 'Calm skin in one week.', products: ['inn_cream', 'inn_cleanser', 'anua_toner', 'lrp_cica', 'biore', 't28_serum', 'cerave', 'snail', 'jetlag', 'farmacy_gc'] },
  { id: 'maya', location: 'Austin, TX', age: '25–29', skin: ['Dry', 'Sensitive'], environment: 'Hot + dry', top3: [['inn_cream', 9.0], ['torriden_mask', 8.9], ['lrp_cica', 8.8]], name: 'Maya Okafor', handle: '@mayaokafor', followers: '64k', avatar: PERSON('women_5'), match: 79, tags: ['Dry', 'Sensitive', 'Hot + dry'], holyGrail: 'inn_cream', quote: 'Barrier came back in two weeks.', products: ['inn_cream', 'inn_cleanser', 'torriden_mask', 'lrp_cica', 'cerave', 'boj_sun', 'laneige_lsm', 'goodal_toner', 'biodance_mask'] },
  { id: 'jun', location: 'Seattle, WA', age: '25–29', skin: ['Combination', 'Dehydrated'], environment: 'Rainy + mild', top3: [['snail', 9.1], ['anua_toner', 8.9], ['levelup', 8.6]], name: 'Jun Park', handle: '@junskin', followers: '141k', avatar: PERSON('men_22'), match: 78, tags: ['Combination', 'Dehydrated', 'Rainy + mild'], holyGrail: 'snail', quote: 'Glass skin without the grease.', products: ['snail', 'anua_toner', 'levelup', 'gmcleanser', 'boj_sun', 'biore', 'torriden_mask', 'cosrx_patch', 'new1'] },
  { id: 'sofia', location: 'Los Angeles, CA', age: '30–34', skin: ['Normal', 'Fine lines'], environment: 'Dry + sunny', top3: [['biodance_mask', 9.2], ['anua_night', 9.0], ['shiseido_stick', 8.7]], name: 'Sofia Marin', handle: '@sofiamarin', followers: '312k', avatar: PERSON('women_15'), match: 76, tags: ['Normal', 'Fine lines', 'Dry + sunny'], holyGrail: 'biodance_mask', quote: 'My overnight glow trick.', products: ['biodance_mask', 'anua_night', 'shiseido_stick', 'farmacy_halo', 'farmacy_potion', 'inn_micellar', 'boj_glow', 'sana_eye', 'lbb'] },
  { id: 'dev', location: 'New York, NY', age: '20–24', skin: ['Oily', 'Acne-prone'], environment: 'Cold winters', top3: [['bha', 8.9], ['cosrx_patch', 9.1], ['levelup', 8.5]], name: 'Dev Patel', handle: '@devdoesskin', followers: '88k', avatar: PERSON('men_58'), match: 75, tags: ['Oily', 'Acne-prone', 'Cold winters'], holyGrail: 'bha', quote: 'Cleared my jawline acne.', products: ['bha', 'cosrx_patch', 'levelup', 'gmcleanser', 'slamdunk', 'biore', 'anua_txa', 'numbuzin_pad', 'cerave'] },
  { id: 'hana', location: 'Honolulu, HI', age: '25–29', skin: ['Combination', 'Dark spots'], environment: 'Humid + high UV', top3: [['anua_txa', 9.0], ['boj_sun', 9.3], ['numbuzin_pad', 8.6]], name: 'Hana Mori', handle: '@hanamori', followers: '205k', avatar: PERSON('women_26'), match: 74, tags: ['Combination', 'Dark spots', 'Humid + high UV'], holyGrail: 'anua_txa', quote: 'Sunscreen is the whole routine.', products: ['anua_txa', 'boj_sun', 'numbuzin_pad', 'goodal_toner', 'biore', 'snail', 'levelup', 't28_sos', 'inn_cleanser'] },
  { id: 'amara', location: 'Atlanta, GA', age: '30–34', skin: ['Oily', 'Hyperpigmentation'], environment: 'Hot + humid', top3: [['goodal_toner', 8.8], ['new2', 8.4], ['boj_sun', 9.0]], name: 'Amara Johnson', handle: '@amaraglow', followers: '157k', avatar: PERSON('women_38'), match: 72, tags: ['Oily', 'Hyperpigmentation', 'Hot + humid'], holyGrail: 'goodal_toner', quote: 'Faded marks on deep skin.', products: ['goodal_toner', 'new2', 'boj_sun', 'gmcleanser', 'anua_txa', 'levelup', 'peel', 'lbb', 'farmacy_eye'] },
  { id: 'elena', location: 'Denver, CO', age: '35–39', skin: ['Dry', 'Redness'], environment: 'High altitude', top3: [['lrp_cica', 9.3], ['inn_cream', 8.7], ['farmacy_potion', 8.4]], name: 'Elena Rossi', handle: '@elenarossi', followers: '93k', avatar: PERSON('women_47'), match: 70, tags: ['Dry', 'Redness', 'High altitude'], holyGrail: 'lrp_cica', quote: 'Calmed my rosacea flares.', products: ['lrp_cica', 'inn_cream', 'farmacy_potion', 'inn_micellar', 'cerave_int', 'shiseido_stick', 'laneige_lsm', 'torriden_mask', 'drmtlgy_eye'] },
  { id: 'kai', location: 'Portland, OR', age: '25–29', skin: ['Sensitive', 'Eczema-prone'], environment: 'Cold + damp', top3: [['cerave', 9.0], ['inn_cleanser', 8.6], ['torriden_mask', 8.8]], name: 'Kai Nakamura', handle: '@kaiskincare', followers: '47k', avatar: PERSON('men_64'), match: 68, tags: ['Sensitive', 'Eczema-prone', 'Cold + damp'], holyGrail: 'cerave', quote: 'Fragrance-free, every step.', products: ['cerave', 'inn_cleanser', 'torriden_mask', 'lrp_cica', 'inn_cream', 'shiseido_stick', 'laneige_lsm', 'cerave_int'] },
  { id: 'priyanka', location: 'Boston, MA', age: '20–24', skin: ['Combination', 'Texture'], environment: 'Cold winters', top3: [['peel', 8.9], ['numbuzin_pad', 8.7], ['levelup', 8.8]], name: 'Priyanka Rao', handle: '@priyankarao', followers: '76k', avatar: PERSON('women_63'), match: 66, tags: ['Combination', 'Texture', 'Cold winters'], holyGrail: 'peel', quote: 'Texture smoothed in a month.', products: ['peel', 'numbuzin_pad', 'levelup', 'gmcleanser', 'anua_toner', 'biore', 'cosrx_patch', 'jetlag', 'new0'] },
  { id: 'zoe', location: 'Nashville, TN', age: '30–34', skin: ['Normal', 'Dull'], environment: 'Humid summers', top3: [['boj_glow', 9.0], ['biodance_serum', 8.8], ['farmacy_halo', 8.5]], name: 'Zoe Bennett', handle: '@zoebennett', followers: '129k', avatar: PERSON('women_85'), match: 64, tags: ['Normal', 'Dull', 'Humid summers'], holyGrail: 'boj_glow', quote: 'Glow that lasts past noon.', products: ['boj_glow', 'biodance_serum', 'farmacy_halo', 'farmacy_gc', 'boj_sun', 't28_serum', 'sana_eye', 'lbb', 'new3'] },
];

export const ROUTINE = [
  { step: 'Cleanse', icon: 'cleanse', options: ['gmcleanser', 'farmacy_gc', 'new2'], buy: 86, results: '~2 weeks', why: 'Gentler than your foam cleanser, and low pH keeps pores clear.' },
  { step: 'Treat', icon: 'treat', options: ['peel', 'biodance_serum', 'bha'], buy: 80, results: '~4 weeks', why: 'Replaces your BHA for winter. Less flaking for people like you.' },
  { step: 'Moisturize', icon: 'hydrate', options: ['levelup', 'farmacy_halo', 'lrp_cica'], buy: 82, results: '~3 weeks', why: 'Light gel that doesn’t pill under SPF in humid weather.' },
  { step: 'Protect', icon: 'protect', options: ['biore', 'shiseido_stick', 'boj_sun'], buy: 91, results: '~2 weeks', why: 'Already on your shelf and #1 for your profile. Keep it.', owned: 'biore' },
];

export const SAMPLE_SLOTS = [
  { key: 'cleanse', label: 'Cleanse', options: ['gmcleanser', 'inn_cleanser', 'farmacy_gc'], mini: { gmcleanser: '20 ml', inn_cleanser: '30 ml', farmacy_gc: '15 ml' }, value: 4, score: { gmcleanser: 8.9, inn_cleanser: 8.4, farmacy_gc: 9.1 }, buy: { gmcleanser: 86, inn_cleanser: 79, farmacy_gc: 87 } },
  { key: 'tone', label: 'Tone', options: ['anua_toner', 'new0', 't28_sos'], mini: { anua_toner: '30 ml', new0: '30 ml', t28_sos: '15 ml' }, value: 6, score: { anua_toner: 9.4, new0: 8.6, t28_sos: 8.5 }, buy: { anua_toner: 91, new0: 88, t28_sos: 82 } },
  { key: 'moisturize', label: 'Moisturize', options: ['farmacy_halo', 'levelup', 'lrp_cica'], mini: { farmacy_halo: '15 ml', levelup: '15 ml', lrp_cica: '15 ml' }, value: 8, score: { farmacy_halo: 8.6, levelup: 9.1, lrp_cica: 9.4 }, buy: { farmacy_halo: 83, levelup: 82, lrp_cica: 91 } },
];

export const CHALLENGES = [
  ['Hydrate Hero', 'Moisturize AM + PM for 7 days', 6, 7, 150],
  ['SPF Every Day', '14-day sunscreen streak', 11, 14, 200],
  ['Photo Friday', 'Weekly progress photo, 4 weeks in a row', 3, 4, 100],
  ['Honest Reviewer', 'Rank 3 products you’ve used 4+ weeks', 1, 3, 90],
];

export const MILESTONES = [
  ['First month tracked', 'Oct 31', true],
  ['10 reviews written', 'Nov 2', true],
  ['30-day streak', '7 days to go', false],
  ['50 photo check-ins', '12 to go', false],
  ['Shelf of 20 products', '9 to go', false],
];

export const ASK_DEW_REPLIES = [
  [/txa|pad/i, 'Yes, if you swipe them in the morning. 41 people with your skin who split TXA pads and retinol saw less irritation by week 2.'],
  [/spf|sunscreen|sun/i, 'For humid days, people like you rate Bioré UV Aqua Rich 9.4 and the Shiseido Clear Stick 8.7 for reapplying over makeup.'],
  [/retinol|night/i, 'Keep your Anua Retinol 3 Peptide cream to PM only and add Cicaplast Baume B5+ on dry patches. 428 people like you did this.'],
  [/winter|dry|cold/i, 'Swap your Bioré for something richer only if you feel tight by noon. Farmacy Honey Halo is the top winter upgrade for your match pool.'],
  [/sample|try/i, 'At 1,500 pts you unlock a free sample box: minis of your top cleanser, toner and moisturizer for a 2-week trial.'],
];

// Hi-fi v8: everyone who isn't a creator. Same shape as CREATORS so People pages, cards and
// Compare shelves treat them alike. kind: friend (in your circle), member (matched to you),
// fof (a friend of a friend). Members without a stock photo get an initials avatar.
const INITIALS = (t, bg) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${bg}"/><text x="40" y="49" font-family="Geist, Arial, sans-serif" font-size="28" text-anchor="middle" fill="#113916">${t}</text></svg>`)}`;
const M = (id, kind, name, avatar, match, location, age, skin, environment, top3, products, quote, extra = {}) => ({
  id, kind, name, handle: '@' + name.toLowerCase().replace(/[^a-z]/g, ''), followers: String(40 + (match * 7) % 300), avatar, match, location, age, skin, environment,
  tags: [...skin, environment], top3, holyGrail: top3[0][0], quote, products: [...new Set([...top3.map(([p]) => p), ...products])], ...extra,
});
export const MEMBERS = [
  M('priya', 'friend', 'Priya Nair', PERSON('women_44'), 96, 'Miami, FL', '25–29', ['Combination', 'Acne-prone'], 'Humid', [['anua_toner', 9.3], ['anua_txa', 9.1], ['biore', 9.0]], ['inn_cleanser', 'snail', 'cosrx_patch', 'laneige_lsm', 'torriden_mask'], 'Redness around my nose calmed down by week 2.'),
  M('mayac', 'friend', 'Maya Chen', PERSON('women_68'), 92, 'Miami, FL', '25–29', ['Combination'], 'Humid', [['boj_sun', 9.2], ['boj_glow', 8.9], ['gmcleanser', 8.6]], ['cerave', 'anua_toner', 'lbb'], 'Lightweight everything, it’s too humid for anything else.'),
  M('jordan', 'friend', 'Jordan Lee', PERSON('men_11'), 90, 'Miami, FL', '25–29', ['Acne-prone'], 'Humid', [['cosrx_patch', 8.8], ['bha', 8.7], ['levelup', 8.5]], ['gmcleanser', 'biore'], 'Patches on, Zoom on.'),
  M('leo', 'friend', 'Leo Park', PERSON('men_32'), 93, 'Seattle, WA', '25–29', ['Combination'], 'Dry climate', [['snail', 9.0], ['lrp_cica', 8.9], ['boj_sun', 8.8]], ['gmcleanser', 'anua_toner', 'anua_txa'], 'Barrier first, then everything else.'),
  M('jess', 'member', 'Jess Rivers', PERSON('women_12'), 89, 'Houston, TX', '25–29', ['Oily'], 'Humid', [['inn_cream', 8.4], ['boj_sun', 8.6], ['bha', 8.2]], ['gmcleanser', 'numbuzin_pad'], 'Light enough for Houston summers.'),
  M('sam', 'member', 'Sam Okafor', PERSON('men_75'), 84, 'Austin, TX', '30–34', ['Oily'], 'High UV', [['boj_sun', 9.6], ['gmcleanser', 8.5], ['slamdunk', 8.2]], ['bha', 'cosrx_patch'], 'No white cast, no stinging.'),
  M('nina', 'member', 'Nina Ruiz', PERSON('women_57'), 58, 'Tampa, FL', '30–34', ['Dry'], 'Humid', [['farmacy_halo', 8.6], ['lrp_cica', 8.4], ['farmacy_gc', 8.0]], ['inn_micellar', 'laneige_lsm'], 'Rich creams only.'),
  M('riley', 'member', 'Riley Torres', INITIALS('RT', '#cbe942'), 96, 'Denver, CO', '25–29', ['Combination', 'Redness'], 'Dry climate', [['anua_txa', 9.4], ['lrp_cica', 9.1], ['boj_sun', 9.0]], ['inn_cleanser', 'anua_toner', 'boj_glow', 'farmacy_eye', 'laneige_lsm'], 'This is the one that did it.', { moved: 'Moved from Miami to Denver this year' }),
  M('grace', 'member', 'Grace Kim', INITIALS('GK', '#cbdbea'), 91, 'Atlanta, GA', '30–34', ['Oily', 'Post-acne marks'], 'Humid', [['numbuzin_pad', 9.2], ['levelup', 8.9], ['biore', 8.8]], ['gmcleanser', 'cosrx_patch'], 'Marks fade if you’re patient.'),
  M('dani', 'member', 'Dani Brooks', INITIALS('DB', '#f9d28b'), 88, 'Phoenix, AZ', '25–29', ['Combination'], 'Dry climate', [['slamdunk', 9.0], ['snail', 8.8], ['boj_sun', 8.7]], ['gmcleanser', 'lbb'], 'Dry heat needs layers.'),
  M('omar', 'member', 'Omar Farouk', INITIALS('OF', '#ebeb88'), 86, 'Orlando, FL', '25–29', ['Acne-prone'], 'Humid', [['bha', 9.1], ['cosrx_patch', 8.8], ['levelup', 8.4]], ['gmcleanser', 'biore'], 'BHA twice a week, no more.'),
  M('tess', 'member', 'Tess Walker', INITIALS('TW', '#facac1'), 85, 'Denver, CO', '30–34', ['Dry', 'Sensitive'], 'Dry climate', [['farmacy_halo', 9.3], ['lrp_cica', 9.0], ['inn_micellar', 8.5]], ['laneige_lsm', 'sana_eye'], 'Ceramides or bust in Denver.'),
  M('ben', 'member', 'Ben Hughes', INITIALS('BH', '#cbdbea'), 82, 'Miami, FL', '35–44', ['Combination'], 'High UV', [['shiseido_stick', 9.0], ['gmcleanser', 8.6], ['levelup', 8.3]], ['bha'], 'A stick SPF I actually reapply.'),
  M('lu', 'fof', 'Lu Tran', INITIALS('LT', '#cbe942'), 89, 'Miami, FL', '25–29', ['Combination', 'Redness'], 'Humid', [['anua_toner', 9.2], ['t28_sos', 8.9], ['biore', 8.8]], ['inn_cleanser', 'snail'], 'Calm first, glow later.', { via: 'Friend of Priya Nair' }),
  M('iris', 'fof', 'Iris Lam', INITIALS('IL', '#f9d28b'), 87, 'Fort Lauderdale, FL', '25–29', ['Combination'], 'Humid', [['boj_glow', 9.1], ['anua_txa', 8.9], ['boj_sun', 8.8]], ['gmcleanser', 'torriden_mask'], 'Glow serum every single morning.', { via: 'Friend of Maya Chen' }),
  M('nate', 'fof', 'Nate Osei', INITIALS('NO', '#ebeb88'), 83, 'Seattle, WA', '30–34', ['Oily'], 'Dry climate', [['levelup', 8.9], ['bha', 8.7], ['boj_sun', 8.5]], ['gmcleanser'], 'Simple and boring, and it works.', { via: 'Friend of Leo Park' }),
  M('camille', 'fof', 'Camille Dubois', INITIALS('CD', '#facac1'), 80, 'Miami, FL', '30–34', ['Sensitive'], 'Humid', [['lrp_cica', 9.2], ['inn_micellar', 8.7], ['biore', 8.6]], ['anua_toner'], 'Fewer products, calmer skin.', { via: 'Friend of Jordan Lee' }),
];

// Hi-fi v8 "Routines that worked for people like you" (Picked for you > From people like you).
// Each routine: whose it is, what they started with, their result and the weekly check-in trend
// (higher = more of the concern), and when each product was added, with their note.
export const PEER_ROUTINES = [
  { id: 'common-spots', goal: 'Fade dark spots', common: true, users: 212, kept: 81, weeks: 6, products: ['gmcleanser', 'anua_txa', 'slamdunk', 'biore'] },
  { id: 'riley', who: 'riley', goal: 'Fade dark spots', start: 'Spots + redness', result: 'Dark spots 7 → 3 in 6 weeks', tracked: 9, users: 74, kept: 79, trend: [7, 7, 7.5, 6, 5, 4, 3, 3, 3],
    dip: 'Week 3 stung a little, then settled.', change: 'Start the TXA pad every other day. Week 3 stung.',
    products: [['inn_cleanser', 'From week 1', 'Gentle, nothing to report.'], ['anua_toner', 'Added week 1', 'Calms things down before everything else goes on.'], ['anua_txa', 'Added week 2', 'This is the one that did it.'], ['boj_glow', 'Added week 3', 'Glow without any sting.'], ['lrp_cica', 'Added week 4', 'Switched to this after moving. No more flaking.'], ['farmacy_eye', 'Added week 5', 'Dry air made my under-eyes crepey. This fixed it.'], ['laneige_lsm', 'Added week 4', 'Every night, Denver air is brutal on lips.'], ['boj_sun', 'From week 1', 'Spots come back without it.']] },
  { id: 'kara', who: 'kara', creator: true, goal: 'Fade dark spots', start: 'Summer spots', result: 'Dark spots 6 → 2 in 8 weeks', tracked: 12, users: 128, kept: 84, trend: [6, 6, 5.5, 5, 4, 3.5, 3, 2.5, 2],
    change: 'Patch-test the retinol cream for a week before going nightly.',
    products: [['anua_toner', 'From week 1', 'The only toner I’ve repurchased six times.'], ['anua_night', 'Added week 3', 'Texture and spots both moved.'], ['biodance_mask', 'Added week 5', 'Sunday reset.'], ['biore', 'From week 1', 'Non-negotiable.']] },
  { id: 'grace', who: 'grace', goal: 'Fade dark spots', start: 'Post-acne marks', result: 'Marks 8 → 4 in 7 weeks', tracked: 10, users: 61, kept: 77, trend: [8, 8, 7, 6.5, 6, 5, 4.5, 4],
    change: 'I’d have started SPF every day sooner.',
    products: [['gmcleanser', 'From week 1', 'Low pH, no tightness.'], ['numbuzin_pad', 'Added week 2', 'The pads made the difference.'], ['levelup', 'From week 1', 'Light, never pills.'], ['biore', 'Added week 3', 'Marks fade faster with it.']] },
  { id: 'common-redness', goal: 'Calm redness', common: true, users: 188, kept: 83, weeks: 4, products: ['inn_cleanser', 'anua_toner', 'lrp_cica', 'biore'] },
  { id: 'leo', who: 'leo', goal: 'Calm redness', start: 'Redness after over-exfoliating', result: 'Redness 7 → 3 in 5 weeks', tracked: 10, users: 55, kept: 82, trend: [7, 6.5, 6, 5, 4, 3, 3],
    change: 'Stop exfoliating completely for the first two weeks.',
    products: [['gmcleanser', 'From week 1', 'Nothing fancy.'], ['snail', 'From week 1', 'Barrier came back fast.'], ['lrp_cica', 'Added week 2', 'Calms everything.'], ['boj_sun', 'From week 1', 'No sting.']] },
  { id: 'common-breakouts', goal: 'Clear breakouts', common: true, users: 240, kept: 76, weeks: 8, products: ['gmcleanser', 'bha', 'levelup', 'biore'] },
  { id: 'omar', who: 'omar', goal: 'Clear breakouts', start: 'Chin breakouts', result: 'Breakouts 6 → 2 in 8 weeks', tracked: 11, users: 90, kept: 74, trend: [6, 6, 5.5, 5, 4, 3, 2.5, 2],
    change: 'BHA twice a week is plenty.',
    products: [['gmcleanser', 'From week 1', 'Doesn’t strip.'], ['bha', 'Added week 2', 'Twice a week, no more.'], ['cosrx_patch', 'As needed', 'Overnight fix.'], ['levelup', 'From week 1', 'No clogged pores.']] },
];
