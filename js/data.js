// Static content for the DEW prototype. Prices, scores and counts are placeholders.

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
  { id: 'anua_txa', score: 9.1, weeks: 6, since: 'Sep 23', use: 'AM' },
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
  { name: 'Priya Nair', avatar: PERSON('women_44'), rel: 'Friend', when: '2 days ago', product: 'anua_toner', usage: 'AM + PM  6 weeks  Miami, FL', score: 9.3, similar: 96, tags: ['Combination', 'Acne-prone', 'Humid'], text: 'Redness around my nose calmed down by week 2 and my chin breakouts are way down. Ranked it above every toner I’ve tried.', helpful: 42, comments: 8, photos: ['w0', 'w1', 'w3', 'w5'] },
  { name: 'jessrivers', avatar: PERSON('women_12'), rel: 'Following', when: '5 days ago', product: 'inn_cream', usage: 'Normalized from 4/5 stars  Houston, TX', score: 8.4, similar: 89, tags: ['Oily', 'Humid'], text: 'Light enough for Houston summers and doesn’t pill under SPF. A bit too light once it got cold.', helpful: 118, comments: 12 },
  { name: 'Maya Chen', avatar: PERSON('women_68'), rel: 'Friend', when: '1 week ago', product: 'cerave', usage: 'PM  3 weeks  Miami, FL', score: 4.2, similar: 92, tags: ['Combination', 'Humid'], text: 'Pilled under sunscreen and felt heavy in this humidity. Fine on my body, but it’s at the bottom of my face shelf.', helpful: 27, comments: 4 },
  { name: 'Sam Okafor', avatar: PERSON('men_75'), rel: 'Following', when: '1 week ago', product: 'boj_sun', usage: 'Daily  8 weeks  Austin, TX', score: 9.6, similar: 84, tags: ['Oily', 'High UV'], text: 'No white cast, no stinging, and it sits well under makeup. Eight weeks in, my dark spots are lighter.', helpful: 203, comments: 21 },
  { name: 'Jordan Lee', avatar: PERSON('men_11'), rel: 'Friend', when: '2 weeks ago', product: 'cosrx_patch', usage: 'Overnight  as needed  Miami, FL', score: 8.8, similar: 90, tags: ['Acne-prone', 'Humid'], text: 'Flattens a whitehead overnight. Thin enough that I wear one on Zoom calls.', helpful: 35, comments: 3 },
  { name: 'Leo Park', avatar: PERSON('men_32'), rel: 'Friend', when: '1 month ago', product: 'snail', usage: 'AM + PM  10 weeks  Seattle, WA', score: 9.0, similar: 93, tags: ['Combination', 'Dry climate'], text: 'Helped my barrier after over-exfoliating, and the post-acne marks faded faster.', helpful: 88, comments: 9 },
  { name: 'nina.r', avatar: PERSON('women_57'), rel: 'Following', when: '2 months ago', product: 'inn_micellar', usage: 'PM  4 weeks  Tampa, FL', score: 3.6, similar: 58, tags: ['Dry'], text: 'Leaves a film, so I need a second cleanse anyway. Doesn’t really move waterproof mascara.', helpful: 12, comments: 1 },
];

export const CREATORS = [
  {
    id: 'kara', location: 'Miami, FL', age: '25–29', skin: ['Combination', 'Acne-prone'], environment: 'Humid', top3: [['anua_toner', 9.4], ['anua_night', 9.6], ['biodance_mask', 9.2]], name: 'Kara Lim', handle: '@karaskinlog', followers: '182k', avatar: PERSON('women_33'), match: 94,
    tags: ['Combination', 'Acne-prone', 'Humid', '25–29', 'Fragrance-free'], reviews: 48, weeks: 26,
    holyGrail: 'anua_toner', quote: 'The only toner I’ve repurchased six times. Redness down by week 2, and it never stings.',
    shelf: {
      Cleanse: [['gmcleanser', 8.9], ['inn_cleanser', 8.2], ['bha', 8.0]],
      'Tone + treat': [['anua_toner', 9.4], ['snail', 9.0], ['new3', 7.9]],
      Moisturize: [['levelup', 9.1], ['cerave', 8.4]],
      'Protect + eyes': [['boj_sun', 9.2], ['farmacy_eye', 7.6], ['lbb', 8.3]],
      'Other: masks + spot care': [['biodance_mask', 9.0], ['jetlag', 8.1], ['cosrx_patch', 8.7]],
    },
    categories: { Toner: ['anua_toner', 'new3'], Cleanser: ['gmcleanser', 'inn_cleanser', 'bha'], 'Serum + essence': ['snail'], Moisturizer: ['levelup', 'cerave'], Sunscreen: ['boj_sun'], 'Eyes + lips': ['lbb', 'farmacy_eye'], 'Masks + spot care': ['biodance_mask', 'cosrx_patch', 'jetlag'] },
    purposes: { 'Best for redness': ['anua_toner', 'boj_sun', 'snail'], 'Best for hydration': ['levelup', 'snail', 'biodance_mask'], 'Best for breakouts': ['cosrx_patch', 'bha', 'gmcleanser'], 'Best for brightening': ['boj_sun', 'new3', 'farmacy_eye'], 'Best for anti-aging': ['biodance_mask', 'snail'], 'Best for dark circles': ['farmacy_eye', 'lbb'] },
    publicReviews: [['anua_toner', 'TikTok', '2 weeks ago', 'Repurchased six times. Redness was down by week 2 and it never stings, even after shaving my upper lip.'], ['new3', 'Sephora', '1 month ago', 'Pretty glow under makeup, but the spray comes out uneven and I go through a bottle fast.'], ['farmacy_eye', 'YouTube', '2 months ago', 'Brightens a little. Too rich for daytime, it creases under my concealer.']],
  },
  { id: 'ari', location: 'Houston, TX', age: '25–29', skin: ['Combination', 'Redness'], environment: 'Hot + humid', top3: [['boj_sun', 9.6], ['biore', 9.3], ['boj_glow', 9.1]], name: 'Ari Santos', handle: '@arisantos', followers: '96k', avatar: PERSON('women_90'), match: 91, tags: ['Combination', 'Redness', 'Hot + humid'], holyGrail: 'boj_sun', quote: 'No white cast ever.', products: ['boj_sun', 'anua_toner', 'snail', 'cerave', 'levelup', 'biore', 'laneige_lsm', 'cosrx_patch', 'inn_cream', 'lrp_cica', 'new0'] },
  { id: 'noor', location: 'Phoenix, AZ', age: '30–34', skin: ['Oily', 'Breakouts'], environment: 'High UV', top3: [['levelup', 8.8], ['lrp_cica', 9.2], ['laneige_lsm', 9.0]], name: 'Noor Haddad', handle: '@noorglows', followers: '241k', avatar: PERSON('women_79'), match: 87, tags: ['Oily', 'Breakouts', 'High UV'], holyGrail: 'levelup', quote: 'Mattes without drying.', products: ['levelup', 'gmcleanser', 'bha', 'cosrx_patch', 'boj_sun', 'peel', 'snail', 'anua_toner', 'numbuzin_pad', 'shiseido_stick', 't28_sos', 'biodance_mask', 'new2', 'inn_micellar', 'lbb', 'jetlag'] },
  { id: 'marcus', location: 'Tampa, FL', age: '30–34', skin: ['Oily', 'Texture'], environment: 'Humid', top3: [['peel', 8.7], ['t28_sos', 9.0], ['shiseido_stick', 8.6]], name: 'Marcus Bell', handle: '@marcusbell', followers: '54k', avatar: PERSON('men_46'), match: 84, tags: ['Oily', 'Texture', 'Humid'], holyGrail: 'peel', quote: 'Texture gone by week 4.', products: ['peel', 'gmcleanser', 'bha', 'levelup', 'boj_sun', 'snail', 'cosrx_patch', 'cerave', 'biore'] },
  { id: 'lucia', location: 'Chicago, IL', age: '25–29', skin: ['Combination', 'Dark spots'], environment: 'Dry winters', top3: [['snail', 8.9], ['biodance_serum', 9.1], ['lrp_cica', 8.9]], name: 'Lucia Reyes', handle: '@luciaskin', followers: '118k', avatar: PERSON('women_57'), match: 82, tags: ['Combination', 'Dark spots', 'Dry winters'], holyGrail: 'snail', quote: 'Faded my marks faster.', products: ['snail', 'anua_txa', 'boj_glow', 'farmacy_halo', 'lrp_cica', 'anua_toner', 'shiseido_stick', 'laneige_lsm', 'inn_cream', 'new1', 'farmacy_eye', 'biodance_serum', 'biodance_mask'] },
  { id: 'theo', location: 'San Diego, CA', age: '35–39', skin: ['Normal', 'Sensitive'], environment: 'Coastal', top3: [['inn_cream', 8.5], ['t28_serum', 8.8], ['goodal_toner', 8.5]], name: 'Theo Mensah', handle: '@theomensah', followers: '72k', avatar: PERSON('men_75'), match: 80, tags: ['Normal', 'Sensitive', 'Coastal'], holyGrail: 'inn_cream', quote: 'Calm skin in one week.', products: ['inn_cream', 'inn_cleanser', 'anua_toner', 'lrp_cica', 'biore', 't28_serum', 'cerave', 'snail', 'jetlag', 'farmacy_gc'] },
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
  ['Hydrate Hero', 'Moisturize AM + PM for 7 days', 5, 7, 150],
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
