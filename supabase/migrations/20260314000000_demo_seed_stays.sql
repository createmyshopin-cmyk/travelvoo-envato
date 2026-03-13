-- =============================================================================
-- Demo Seed: 20 Stays with Room Categories
-- Date: 2026-03-14
-- Purpose: Demo data for showcase / testing
-- Note: Runs as postgres superuser → RLS bypassed, tenant_id left NULL so
--       public "active" policy covers visibility on the guest-facing site.
-- =============================================================================

DO $$
DECLARE
  -- Stay UUIDs
  s01 uuid := 'a1000001-0000-0000-0000-000000000001';
  s02 uuid := 'a1000002-0000-0000-0000-000000000002';
  s03 uuid := 'a1000003-0000-0000-0000-000000000003';
  s04 uuid := 'a1000004-0000-0000-0000-000000000004';
  s05 uuid := 'a1000005-0000-0000-0000-000000000005';
  s06 uuid := 'a1000006-0000-0000-0000-000000000006';
  s07 uuid := 'a1000007-0000-0000-0000-000000000007';
  s08 uuid := 'a1000008-0000-0000-0000-000000000008';
  s09 uuid := 'a1000009-0000-0000-0000-000000000009';
  s10 uuid := 'a1000010-0000-0000-0000-000000000010';
  s11 uuid := 'a1000011-0000-0000-0000-000000000011';
  s12 uuid := 'a1000012-0000-0000-0000-000000000012';
  s13 uuid := 'a1000013-0000-0000-0000-000000000013';
  s14 uuid := 'a1000014-0000-0000-0000-000000000014';
  s15 uuid := 'a1000015-0000-0000-0000-000000000015';
  s16 uuid := 'a1000016-0000-0000-0000-000000000016';
  s17 uuid := 'a1000017-0000-0000-0000-000000000017';
  s18 uuid := 'a1000018-0000-0000-0000-000000000018';
  s19 uuid := 'a1000019-0000-0000-0000-000000000019';
  s20 uuid := 'a1000020-0000-0000-0000-000000000020';

BEGIN

-- ============================================================
-- STAYS
-- ============================================================

INSERT INTO public.stays
  (id, stay_id, name, location, description, category, rating, reviews_count, price, original_price, amenities, images, status)
VALUES

-- ── COUPLE FRIENDLY ────────────────────────────────────────

(s01, 'Stay-1001', 'The Lovers'' Nest',
 'Coorg, Karnataka',
 'A secluded hilltop retreat crafted for two. Wake up to coffee-plantation vistas, enjoy a candlelit dinner under the stars, and unwind in your private plunge pool. Silence, luxury, and each other — that''s the only agenda here.',
 'Couple Friendly', 4.9, 128,
 8500, 12000,
 ARRAY['Free Wi-Fi','Swimming Pool','Free Breakfast','Bonfire','Mountain View','Hot Water','Air Conditioning'],
 ARRAY[
   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s02, 'Stay-1002', 'Misty Pines Cottage',
 'Munnar, Kerala',
 'Perched at 5,500 ft in the Munnar hills, this intimate cottage for couples offers panoramic tea-garden views, crackling fireside evenings, and a private outdoor bathtub overlooking the valley. Romantic seclusion at its finest.',
 'Couple Friendly', 4.8, 94,
 7200, 9500,
 ARRAY['Free Wi-Fi','Free Breakfast','Bonfire','Mountain View','Hot Water','Garden','Spa'],
 ARRAY[
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s03, 'Stay-1003', 'Rosewood Hideaway',
 'Ooty, Tamil Nadu',
 'A heritage bungalow wrapped in rose gardens and eucalyptus groves. The stone fireplace, four-poster beds, and butler service make this the quintessential romantic getaway for discerning couples.',
 'Couple Friendly', 4.7, 76,
 6800, 9000,
 ARRAY['Free Wi-Fi','Free Breakfast','Spa','Hot Water','Garden','Air Conditioning','TV'],
 ARRAY[
   'https://images.unsplash.com/photo-1520637836993-a0e5b1a2f7a8?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

-- ── FAMILY STAY ────────────────────────────────────────────

(s04, 'Stay-1004', 'Happy Trails Family Resort',
 'Wayanad, Kerala',
 'Spread across 12 acres of lush jungle, Happy Trails is designed entirely for families. Kids'' adventure zone, a natural swimming pond, family bonfire nights, guided nature treks, and spacious cottages ensure every generation has a blast.',
 'Family Stay', 4.6, 211,
 5500, 7500,
 ARRAY['Free Wi-Fi','Swimming Pool','Free Breakfast','Garden','Free Parking','Kid Friendly','Pet Friendly','Bonfire','Camping'],
 ARRAY[
   'https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1484910292437-025e5d13ce87?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s05, 'Stay-1005', 'The Farmstead',
 'Lonavala, Maharashtra',
 'A working organic farm turned family retreat. Let the kids collect eggs, feed goats, and ride ponies while parents unwind in the infinity pool. Farm-to-table meals, nature games, and evening campfires round out the perfect family holiday.',
 'Family Stay', 4.5, 183,
 4800, 6500,
 ARRAY['Free Wi-Fi','Swimming Pool','Free Breakfast','Free Parking','Kid Friendly','Pet Friendly','Garden','Restaurant'],
 ARRAY[
   'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s06, 'Stay-1006', 'Riverside Family Bungalow',
 'Coorg, Karnataka',
 'Sits right on the banks of the Cauvery. A sprawling colonial bungalow with seven bedrooms, a game room, an outdoor splash pool, and private riverside BBQ decks. Ideal for large families and reunion groups.',
 'Family Stay', 4.7, 97,
 9200, 12000,
 ARRAY['Free Wi-Fi','Swimming Pool','Free Breakfast','Free Parking','Kid Friendly','Restaurant','Bonfire','Hot Water'],
 ARRAY[
   'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

-- ── LUXURY RESORT ──────────────────────────────────────────

(s07, 'Stay-1007', 'Aurum Grand Resort & Spa',
 'Udaipur, Rajasthan',
 'A palatial lakeside resort where Rajput grandeur meets 21st-century luxury. Marble suites, a 3,000 sq ft rooftop infinity pool overlooking Lake Pichola, a world-class Ayurvedic spa, and a Michelin-starred chef curating every meal.',
 'Luxury Resort', 5.0, 342,
 28000, 38000,
 ARRAY['Free Wi-Fi','Swimming Pool','Spa','Restaurant','Free Breakfast','Air Conditioning','TV','Hot Water','Gym','Free Parking'],
 ARRAY[
   'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s08, 'Stay-1008', 'Serenity Blue Beach Resort',
 'Havelock Island, Andaman',
 'Your very own slice of paradise — 50 metres from the whitest sand beach in Asia. Overwater bungalows, snorkelling reefs at your doorstep, sunset catamaran cruises, and a zero-waste gourmet restaurant. Bucket-list luxury, redefined.',
 'Luxury Resort', 4.9, 289,
 22000, 30000,
 ARRAY['Free Wi-Fi','Swimming Pool','Spa','Restaurant','Free Breakfast','Air Conditioning','TV','Hot Water','Gym'],
 ARRAY[
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1540541338537-c8bfbbd7df5b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1586375300773-8384e3e4916f?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s09, 'Stay-1009', 'The Highland Palace',
 'Shimla, Himachal Pradesh',
 'A colonial-era palace hotel perched on the pine-covered ridgeline above Shimla. Twelve heritage suites, a library lounge stocked with 19th-century first editions, butler service, and horse-riding trails. History meets luxury in the Himalayas.',
 'Luxury Resort', 4.8, 174,
 18500, 25000,
 ARRAY['Free Wi-Fi','Free Breakfast','Restaurant','Spa','Gym','Hot Water','Mountain View','Air Conditioning','TV','Free Parking'],
 ARRAY[
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1520637836993-a0e5b1a2f7a8?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s10, 'Stay-1010', 'Emerald Canopy Luxury Lodge',
 'Jim Corbett, Uttarakhand',
 'The finest jungle lodge in Jim Corbett National Park. Ten exclusive safari tents with en-suite bathrooms and private decks overlooking a watering hole frequented by elephants. Naturalist-led safaris at dawn, gourmet meals at dusk.',
 'Luxury Resort', 4.9, 136,
 24000, 33000,
 ARRAY['Free Wi-Fi','Swimming Pool','Spa','Restaurant','Free Breakfast','Air Conditioning','Hot Water','Gym'],
 ARRAY[
   'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

-- ── BUDGET ROOMS ───────────────────────────────────────────

(s11, 'Stay-1011', 'Backpackers'' Base Camp',
 'Manali, Himachal Pradesh',
 'No-frills, full-soul. A cosy hostel in old Manali with dorm beds, private rooms, a rooftop bonfire area, and the best thali you''ll eat in the mountains. Centrally located, traveller-run, and always buzzing with good energy.',
 'Budget Rooms', 4.3, 318,
 950, 1500,
 ARRAY['Free Wi-Fi','Bonfire','Hot Water','Mountain View'],
 ARRAY[
   'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1414369153946-7d64ca7d7af1?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s12, 'Stay-1012', 'The Yellow Door Hostel',
 'Rishikesh, Uttarakhand',
 'Riverside budget stay for the spiritual seeker and the adventure junkie alike. Steps from the Ganga, minutes from the bungee jump, and seconds from incredible momos. Yoga classes every morning included in the tariff.',
 'Budget Rooms', 4.4, 256,
 1100, 1800,
 ARRAY['Free Wi-Fi','Hot Water','Free Breakfast','Garden'],
 ARRAY[
   'https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1500259571355-332da5cb07aa?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s13, 'Stay-1013', 'Sunrise Guesthouse',
 'Pushkar, Rajasthan',
 'A charming heritage guesthouse inside the old city walls of Pushkar. Rooftop terrace with camel-fair views, traditional Rajasthani breakfasts, and hand-painted rooms that are pure Instagram gold — all for less than your coffee back home.',
 'Budget Rooms', 4.2, 192,
 1400, 2200,
 ARRAY['Free Wi-Fi','Free Breakfast','Hot Water','TV'],
 ARRAY[
   'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

-- ── POOL VILLAS ────────────────────────────────────────────

(s14, 'Stay-1014', 'Azure Infinity Villa',
 'North Goa',
 'A stunning four-bedroom Portuguese villa with a 20-metre infinity pool that merges with the horizon. Wraparound verandas, private chef on request, and a five-minute walk to the beach. The Goa dream, fully realised.',
 'Pool Villas', 4.9, 203,
 18000, 25000,
 ARRAY['Free Wi-Fi','Swimming Pool','Free Parking','Air Conditioning','TV','Hot Water','Spa','Restaurant'],
 ARRAY[
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s15, 'Stay-1015', 'The Plunge Palace',
 'Alibaug, Maharashtra',
 'A three-bedroom private villa with a temperature-controlled plunge pool, outdoor rain shower, and a landscaped courtyard garden. Just two hours from Mumbai, it''s the perfect weekend power-down for the city crowd.',
 'Pool Villas', 4.7, 167,
 15000, 20000,
 ARRAY['Free Wi-Fi','Swimming Pool','Free Parking','Air Conditioning','TV','Hot Water','Garden','Free Breakfast'],
 ARRAY[
   'https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s16, 'Stay-1016', 'Horizon Pool Villa Retreat',
 'Hampi, Karnataka',
 'Ancient boulder landscapes on one side, a glittering private pool on the other. This contemporary villa blends seamlessly with Hampi''s volcanic rock terrain. Sundowners, stargazing, and silence — pure magic.',
 'Pool Villas', 4.8, 89,
 12500, 17000,
 ARRAY['Free Wi-Fi','Swimming Pool','Free Parking','Air Conditioning','Hot Water','Mountain View','Bonfire'],
 ARRAY[
   'https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1540541338537-c8bfbbd7df5b?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s17, 'Stay-1017', 'Cobalt Cove Villa',
 'Varkala, Kerala',
 'Clifftop villa with a saltwater infinity pool perched 50 metres above the Arabian Sea. Watch the sun melt into the ocean from your private deck. Ayurvedic spa, fresh seafood, and the sound of waves below — an all-senses experience.',
 'Pool Villas', 4.9, 144,
 16500, 22000,
 ARRAY['Free Wi-Fi','Swimming Pool','Spa','Restaurant','Free Breakfast','Hot Water','Air Conditioning','TV'],
 ARRAY[
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

-- ── TREE HOUSES ────────────────────────────────────────────

(s18, 'Stay-1018', 'The Canopy Nest',
 'Athirapally, Kerala',
 'Sleep in the treetops above one of India''s most dramatic waterfalls. The Canopy Nest is a hand-crafted teak treehouse with floor-to-ceiling glass walls, a suspension bridge entrance, and the constant thunder of the falls as your lullaby.',
 'Tree Houses', 4.8, 112,
 7800, 11000,
 ARRAY['Free Wi-Fi','Hot Water','Free Breakfast','Mountain View','Garden'],
 ARRAY[
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s19, 'Stay-1019', 'Whispering Pines Treehouse',
 'Kodaikanal, Tamil Nadu',
 'Nested 35 feet up in a century-old silver oak, this artisan treehouse is surrounded by silent pine forests. Rope ladder, solar lighting, composting toilet, and a wrap-around deck — the ultimate off-grid eco escape.',
 'Tree Houses', 4.7, 88,
 6500, 9500,
 ARRAY['Free Wi-Fi','Hot Water','Free Breakfast','Garden','Mountain View'],
 ARRAY[
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80'
 ], 'active'),

(s20, 'Stay-1020', 'Jungle Crown Treehouse',
 'Vythiri, Wayanad',
 'Three interconnected treehouses set 40 feet high in the Wayanad rainforest canopy. Spy on wild elephants and Malabar hornbills from your private sky deck. Night sounds, canopy walks, and campfire storytelling make this unforgettable.',
 'Tree Houses', 4.9, 152,
 9000, 13000,
 ARRAY['Free Wi-Fi','Hot Water','Free Breakfast','Bonfire','Garden','Mountain View','Pet Friendly'],
 ARRAY[
   'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
 ], 'active')

ON CONFLICT (stay_id) DO NOTHING;


-- ============================================================
-- ROOM CATEGORIES
-- ============================================================

INSERT INTO public.room_categories
  (stay_id, name, max_guests, available, amenities, price, original_price, images)
VALUES

-- s01 – The Lovers' Nest
(s01, 'Plunge Pool Suite',        2, 2,
 ARRAY['King Bed','Private Plunge Pool','Balcony','Rainfall Shower','Mini Bar'],
 8500, 12000,
 ARRAY['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
       'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80']),
(s01, 'Deluxe Garden Room',       2, 3,
 ARRAY['Queen Bed','Garden View','En-suite Bathroom','Coffee Maker'],
 6500, 9000,
 ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80']),

-- s02 – Misty Pines Cottage
(s02, 'Valley View Cottage',      2, 2,
 ARRAY['King Bed','Valley View','Fireplace','Outdoor Bathtub','Kitchenette'],
 7200, 9500,
 ARRAY['https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80']),
(s02, 'Cosy Loft Room',           2, 3,
 ARRAY['Double Bed','Loft','Mountain View','En-suite'],
 5200, 7000,
 ARRAY['https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=80']),

-- s03 – Rosewood Hideaway
(s03, 'Heritage Suite',           2, 2,
 ARRAY['Four-Poster King Bed','Fireplace','Antique Furniture','Butler Service'],
 6800, 9000,
 ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']),
(s03, 'Garden Cottage Room',      2, 3,
 ARRAY['Queen Bed','Garden View','En-suite','Complimentary Tea Tray'],
 4800, 6500,
 ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80']),

-- s04 – Happy Trails Family Resort
(s04, 'Family Jungle Cottage',    6, 4,
 ARRAY['2 Bedrooms','Living Area','Jungle View','Bunk Beds for Kids','Kitchen'],
 5500, 7500,
 ARRAY['https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=800&q=80']),
(s04, 'Deluxe Family Room',       4, 5,
 ARRAY['1 Bedroom','Extra Beds','Pool View','En-suite'],
 4000, 5500,
 ARRAY['https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80']),
(s04, 'Budget Dorm (Family)',      8, 2,
 ARRAY['Bunk Beds','Shared Bathroom','Fan','Lockers'],
 1800, 2500,
 ARRAY['https://images.unsplash.com/photo-1484910292437-025e5d13ce87?auto=format&fit=crop&w=800&q=80']),

-- s05 – The Farmstead
(s05, 'Farm Suite',               4, 3,
 ARRAY['2 Queen Beds','Farm View','En-suite','Hammock on Porch'],
 4800, 6500,
 ARRAY['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80']),
(s05, 'Treehouse Loft',           2, 2,
 ARRAY['King Bed','Tree Canopy View','Kitchenette','Outdoor Deck'],
 5500, 7500,
 ARRAY['https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80']),

-- s06 – Riverside Family Bungalow
(s06, 'Master River Suite',       2, 1,
 ARRAY['King Bed','River View','Jacuzzi','Walk-in Wardrobe','Butler'],
 9200, 12000,
 ARRAY['https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80']),
(s06, 'Twin Riverside Room',      4, 3,
 ARRAY['2 Twin Beds','River View','En-suite','Balcony'],
 6500, 8500,
 ARRAY['https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=800&q=80']),

-- s07 – Aurum Grand Resort & Spa
(s07, 'Royal Lake Suite',         2, 3,
 ARRAY['King Bed','Lake View','Jacuzzi','Butler Service','Private Terrace','Mini Bar'],
 28000, 38000,
 ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80']),
(s07, 'Deluxe Palace Room',       2, 8,
 ARRAY['King Bed','Courtyard View','En-suite','Antique Decor'],
 18000, 25000,
 ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80']),
(s07, 'Heritage Suite',           4, 4,
 ARRAY['2 Bedrooms','Living Room','Rooftop Terrace','Butler','Complimentary Champagne'],
 38000, 52000,
 ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']),

-- s08 – Serenity Blue Beach Resort
(s08, 'Overwater Bungalow',       2, 5,
 ARRAY['King Bed','Glass Floor Panels','Direct Ocean Access','Outdoor Shower','Kayak'],
 22000, 30000,
 ARRAY['https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80']),
(s08, 'Beachfront Villa',         4, 3,
 ARRAY['2 Bedrooms','Private Beach Access','Pool','Outdoor Deck'],
 30000, 42000,
 ARRAY['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80']),

-- s09 – The Highland Palace
(s09, 'Palace View Suite',        2, 4,
 ARRAY['King Bed','Mountain View','Fireplace','Clawfoot Tub','Reading Nook'],
 18500, 25000,
 ARRAY['https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80']),
(s09, 'Colonial Standard Room',   2, 8,
 ARRAY['Queen Bed','Garden View','En-suite','Period Furniture'],
 12000, 16000,
 ARRAY['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80']),

-- s10 – Emerald Canopy Luxury Lodge
(s10, 'Signature Safari Tent',    2, 6,
 ARRAY['King Bed','Private Deck','En-suite Bathroom','Wildlife View','Minibar'],
 24000, 33000,
 ARRAY['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80']),
(s10, 'Premier Jungle Suite',     4, 2,
 ARRAY['2 Bedrooms','Living Room','Private Pool','Butler','Campfire Setup'],
 38000, 50000,
 ARRAY['https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?auto=format&fit=crop&w=800&q=80']),

-- s11 – Backpackers' Base Camp
(s11, '8-Bed Mixed Dorm',         8, 3,
 ARRAY['Bunk Beds','Shared Bathroom','Lockers','Fan'],
 950, 1500,
 ARRAY['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80']),
(s11, 'Private Budget Room',      2, 5,
 ARRAY['Double Bed','Shared Bathroom','Fan','Mountain View'],
 1800, 2500,
 ARRAY['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80']),

-- s12 – The Yellow Door Hostel
(s12, '6-Bed Female Dorm',        6, 2,
 ARRAY['Bunk Beds','Shared Bathroom','Locker','Fan'],
 1100, 1800,
 ARRAY['https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?auto=format&fit=crop&w=800&q=80']),
(s12, 'Riverside Private Room',   2, 4,
 ARRAY['Double Bed','River View','En-suite','AC'],
 2400, 3500,
 ARRAY['https://images.unsplash.com/photo-1500259571355-332da5cb07aa?auto=format&fit=crop&w=800&q=80']),

-- s13 – Sunrise Guesthouse
(s13, 'Rooftop Heritage Room',    2, 3,
 ARRAY['Double Bed','Rooftop Access','Rajasthani Decor','Shared Bathroom'],
 1400, 2200,
 ARRAY['https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80']),
(s13, 'Lake View En-suite',       2, 4,
 ARRAY['Queen Bed','Lake View','En-suite','AC','TV'],
 2200, 3200,
 ARRAY['https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80']),

-- s14 – Azure Infinity Villa
(s14, 'Master Pool Suite',        2, 1,
 ARRAY['King Bed','Pool Access','Sea View','Outdoor Shower','Butler'],
 18000, 25000,
 ARRAY['https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80']),
(s14, 'Garden Villa Room',        4, 3,
 ARRAY['2 Beds','Pool Access','Garden View','En-suite'],
 14000, 19000,
 ARRAY['https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80']),

-- s15 – The Plunge Palace
(s15, 'Plunge Pool Deluxe',       2, 2,
 ARRAY['King Bed','Private Plunge Pool','Outdoor Deck','Rainfall Shower'],
 15000, 20000,
 ARRAY['https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?auto=format&fit=crop&w=800&q=80']),
(s15, 'Garden Studio',            2, 3,
 ARRAY['Queen Bed','Garden View','Pool Access','En-suite'],
 10000, 14000,
 ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80']),

-- s16 – Horizon Pool Villa
(s16, 'Boulder View Pool Suite',  2, 2,
 ARRAY['King Bed','Pool Access','Rock Formation View','Outdoor Shower'],
 12500, 17000,
 ARRAY['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80']),
(s16, 'Courtyard Room',           2, 4,
 ARRAY['Queen Bed','Courtyard View','Pool Access','En-suite'],
 8500, 12000,
 ARRAY['https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80']),

-- s17 – Cobalt Cove Villa
(s17, 'Clifftop Ocean Suite',     2, 2,
 ARRAY['King Bed','Ocean View','Infinity Pool Access','Private Terrace'],
 16500, 22000,
 ARRAY['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80']),
(s17, 'Sea Breeze Studio',        2, 4,
 ARRAY['Queen Bed','Sea View','Pool Access','En-suite Bathroom'],
 11500, 16000,
 ARRAY['https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80']),

-- s18 – The Canopy Nest
(s18, 'Waterfall View Treehouse', 2, 2,
 ARRAY['King Bed','Glass Walls','Waterfall View','Outdoor Deck','En-suite'],
 7800, 11000,
 ARRAY['https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80']),
(s18, 'Forest Nest Room',         2, 3,
 ARRAY['Double Bed','Canopy View','Shared Bathroom','Hammock'],
 4500, 6500,
 ARRAY['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80']),

-- s19 – Whispering Pines Treehouse
(s19, 'Silver Oak Treehouse',     2, 1,
 ARRAY['Queen Bed','Solar Lighting','Rope Ladder','Wrap-around Deck','Composting Toilet'],
 6500, 9500,
 ARRAY['https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80']),
(s19, 'Ground-Level Cabin',       2, 2,
 ARRAY['Double Bed','Forest View','En-suite','Fireplace'],
 4200, 6000,
 ARRAY['https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80']),

-- s20 – Jungle Crown Treehouse
(s20, 'Sky Canopy Suite',         4, 3,
 ARRAY['2 Bedrooms','Sky Deck','Wildlife Spotting','En-suite','Campfire Setup'],
 9000, 13000,
 ARRAY['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80']),
(s20, 'Rainforest Loft',          2, 4,
 ARRAY['King Bed','Canopy View','En-suite','Suspension Bridge Entry'],
 7000, 10000,
 ARRAY['https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80']);

END $$;
