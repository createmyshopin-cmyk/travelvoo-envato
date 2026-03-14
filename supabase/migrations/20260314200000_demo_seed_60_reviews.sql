-- =============================================================================
-- Demo Seed: 60 Reviews (3 per stay × 20 stays)
-- Date: 2026-03-14
-- Note: status = 'approved' so public RLS policy covers visibility.
--       Uses randomuser.me avatars + Unsplash review photos.
-- =============================================================================

DO $$
DECLARE
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

INSERT INTO public.reviews
  (stay_id, guest_name, rating, comment, avatar_url, photos, status, created_at)
VALUES

-- ─────────────────────────────────────────────────────────────
-- s01 · The Lovers' Nest · Coorg
-- ─────────────────────────────────────────────────────────────
(s01, 'Priya Sharma', 5,
 'Absolutely magical! The plunge pool suite had us speechless — waking up to misty coffee hills was worth every rupee. The candlelit dinner they arranged under the stars was the most romantic evening of our lives. Highly recommend for anniversaries!',
 'https://randomuser.me/api/portraits/women/12.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '5 days'),

(s01, 'Arjun Mehta', 5,
 'Best couple getaway in South India, period. The staff anticipated our every need before we even asked. The private plunge pool at sunset was simply unreal. Already planning our second visit!',
 'https://randomuser.me/api/portraits/men/22.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '12 days'),

(s01, 'Neha Kapoor', 4,
 'Stunning location and beautiful interiors. The breakfast spread was fresh and flavourful. Only minor wish: slightly better Wi-Fi signal in the pool area, but honestly you won''t want to be on your phone anyway!',
 'https://randomuser.me/api/portraits/women/34.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '20 days'),

-- ─────────────────────────────────────────────────────────────
-- s02 · Misty Pines Cottage · Munnar
-- ─────────────────────────────────────────────────────────────
(s02, 'Rohan Nair', 5,
 'Perched at the edge of the tea gardens, this cottage felt like our own secret world. The outdoor bathtub with valley views was the highlight — we spent two hours just soaking it all in. Fireplace evenings are absolutely dreamy.',
 'https://randomuser.me/api/portraits/men/45.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '8 days'),

(s02, 'Divya Krishnan', 5,
 'The misty mornings here are unlike anything I''ve ever experienced. Hot tea delivered to our room at 6 AM, birds singing, clouds rolling in over the valley — pure poetry. The cottage is cosy and spotlessly clean.',
 'https://randomuser.me/api/portraits/women/56.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '15 days'),

(s02, 'Karthik Iyer', 4,
 'Wonderful property in a prime spot. Food was delicious — the Kerala-style breakfast with appam and stew is a must. Getting there requires navigating narrow mountain roads, so be prepared, but it is completely worth it.',
 'https://randomuser.me/api/portraits/men/67.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '25 days'),

-- ─────────────────────────────────────────────────────────────
-- s03 · Rosewood Hideaway · Ooty
-- ─────────────────────────────────────────────────────────────
(s03, 'Anjali Verma', 5,
 'This heritage bungalow is a love letter to a bygone era. The four-poster bed, crackling fireplace, and rose garden views made us feel like we''d stepped into an old English novel. Butler service was prompt and genuinely warm.',
 'https://randomuser.me/api/portraits/women/23.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '6 days'),

(s03, 'Vikram Bose', 5,
 'Impeccable taste in every detail. The eucalyptus grove surroundings, the antique furniture, the homemade jam at breakfast — everything spoke of genuine care. A rare gem in the Nilgiris.',
 'https://randomuser.me/api/portraits/men/78.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '18 days'),

(s03, 'Meera Pillai', 4,
 'Such a beautiful and tranquil stay. The garden is breathtaking and the spa treatments are heavenly. Would love a few more restaurant options nearby, but the in-house meals were so good we barely wanted to leave anyway.',
 'https://randomuser.me/api/portraits/women/89.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '30 days'),

-- ─────────────────────────────────────────────────────────────
-- s04 · Happy Trails Family Resort · Wayanad
-- ─────────────────────────────────────────────────────────────
(s04, 'Suresh Patel', 5,
 'Our kids are still talking about this trip three months later! The adventure zone, the nature trek with a ranger, and the bonfire with marshmallows — every activity was perfectly organised. Parents loved the natural swimming pond and peaceful vibes.',
 'https://randomuser.me/api/portraits/men/14.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '9 days'),

(s04, 'Lakshmi Reddy', 5,
 'Finally a resort that genuinely caters to ALL ages. My 6-year-old daughter and my 70-year-old parents were equally delighted. The family cottage was spacious and the staff were wonderful with the children.',
 'https://randomuser.me/api/portraits/women/31.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1484910292437-025e5d13ce87?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '14 days'),

(s04, 'Arun Kumar', 4,
 'Great family-friendly property with lush jungle surroundings. The food was tasty and portions were generous. Loved the guided bird-watching walk at dawn. The budget dorm rooms are basic but clean — fine for older kids.',
 'https://randomuser.me/api/portraits/men/52.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '22 days'),

-- ─────────────────────────────────────────────────────────────
-- s05 · The Farmstead · Lonavala
-- ─────────────────────────────────────────────────────────────
(s05, 'Pooja Joshi', 5,
 'My daughter''s highlight was feeding the goats every morning. Mine was the farm-to-table breakfast with produce picked an hour before. The treehouse loft is charming and the infinity pool views over the valley are stunning.',
 'https://randomuser.me/api/portraits/women/43.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '7 days'),

(s05, 'Rahul Desai', 5,
 'A working farm that doubles as a resort — genius concept. Pony rides for the kids, yoga at sunrise for the adults, campfire stories at night for everyone. The organic food was out of this world. We''ll be back every monsoon.',
 'https://randomuser.me/api/portraits/men/61.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '19 days'),

(s05, 'Swati Kulkarni', 4,
 'Lovely retreat just 2 hours from Pune. The farm suite was spacious and comfortable. Kids had a blast and didn''t miss their screens once! Only note: the pool gets crowded on weekends — book a weekday if you can.',
 'https://randomuser.me/api/portraits/women/72.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '28 days'),

-- ─────────────────────────────────────────────────────────────
-- s06 · Riverside Family Bungalow · Coorg
-- ─────────────────────────────────────────────────────────────
(s06, 'Mohan Gowda', 5,
 'We had a 14-person family reunion here and it was perfect. Seven spacious bedrooms, a riverside BBQ that went on till midnight, and the game room kept everyone entertained. The master suite jacuzzi overlooking the Cauvery was phenomenal.',
 'https://randomuser.me/api/portraits/men/33.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '11 days'),

(s06, 'Rekha Nambiar', 5,
 'The river is right at your doorstep and you can hear it all night — the most soothing sleep I''ve had in years. The cook prepared an authentic Coorgi spread that I''m still dreaming about. Absolutely worth every penny for a large group.',
 'https://randomuser.me/api/portraits/women/18.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '16 days'),

(s06, 'Sanjay Hegde', 4,
 'Excellent for large families and groups. The outdoor splash pool and riverside deck made the days memorable. Catering service was very good. The access road is a bit tricky in a low-clearance car — come in an SUV.',
 'https://randomuser.me/api/portraits/men/27.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '35 days'),

-- ─────────────────────────────────────────────────────────────
-- s07 · Aurum Grand Resort & Spa · Udaipur
-- ─────────────────────────────────────────────────────────────
(s07, 'Ishaan Malhotra', 5,
 'Nothing short of a palace experience. The Royal Lake Suite with its private terrace overlooking Pichola at golden hour is one of the most beautiful sights I have ever seen. The Michelin-starred dinner was a revelation. Five stars don''t do it justice.',
 'https://randomuser.me/api/portraits/men/11.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '4 days'),

(s07, 'Tara Singh', 5,
 'The Aurum Grand is in a league of its own. The Ayurvedic spa alone is worth the trip. Every staff member made us feel like royalty. The Heritage Suite was impeccably designed — modern luxury woven through authentic Rajput architecture.',
 'https://randomuser.me/api/portraits/women/25.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '10 days'),

(s07, 'Dev Choudhary', 5,
 'I have stayed at luxury properties across the world and this belongs in the top tier. The rooftop infinity pool at 3 AM with the city lights below was otherworldly. Champagne and fresh flowers waiting in the suite — those details matter.',
 'https://randomuser.me/api/portraits/men/49.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '21 days'),

-- ─────────────────────────────────────────────────────────────
-- s08 · Serenity Blue Beach Resort · Andaman
-- ─────────────────────────────────────────────────────────────
(s08, 'Natasha D''Souza', 5,
 'I have genuinely never seen water that colour outside of a screensaver. The overwater bungalow with glass floor panels is surreal — you can watch fish swimming beneath your feet at night with the underwater lights on. Life-changing trip.',
 'https://randomuser.me/api/portraits/women/38.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1540541338537-c8bfbbd7df5b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '3 days'),

(s08, 'Cyrus Mistry', 5,
 'The snorkelling reef is literally 50 metres from your bungalow door — I snorkelled three times a day. The zero-waste restaurant serves the freshest seafood I''ve ever tasted. This is what bucket-list travel looks like.',
 'https://randomuser.me/api/portraits/men/55.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1586375300773-8384e3e4916f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '13 days'),

(s08, 'Preethi Ramachandran', 4,
 'Paradise found. The sunsets from the beachfront villa deck are indescribable. The sunset catamaran cruise was romantic and special. Getting to Havelock requires effort but the resort makes the journey completely worthwhile.',
 'https://randomuser.me/api/portraits/women/64.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '27 days'),

-- ─────────────────────────────────────────────────────────────
-- s09 · The Highland Palace · Shimla
-- ─────────────────────────────────────────────────────────────
(s09, 'Aarav Chandra', 5,
 'Staying here feels like inhabiting a chapter of history. The 19th-century library with original editions, the clawfoot tub, the riding trails through pine forests — all exquisite. The staff are extraordinarily well-read and delightful to converse with.',
 'https://randomuser.me/api/portraits/men/16.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '6 days'),

(s09, 'Kavya Menon', 5,
 'The Palace View Suite fireplace on a winter night with snowfall outside is pure magic. We did horse riding in the morning and warmed up in the spa in the afternoon. The period furniture and decor make every corner photo-worthy.',
 'https://randomuser.me/api/portraits/women/47.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1520637836993-a0e5b1a2f7a8?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '17 days'),

(s09, 'Rishi Anand', 4,
 'A truly special property that transports you to colonial-era Shimla. The butler service is impeccable. The restaurant menu could use a bit more variety, but the quality of what they do serve is exceptional. Would absolutely return.',
 'https://randomuser.me/api/portraits/men/58.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '29 days'),

-- ─────────────────────────────────────────────────────────────
-- s10 · Emerald Canopy Luxury Lodge · Jim Corbett
-- ─────────────────────────────────────────────────────────────
(s10, 'Vikrant Khanna', 5,
 'Woke up at 5 AM to a herd of elephants at the watering hole right outside our tent. Spent 20 minutes watching in awe. The naturalist-led safari was the most educational and thrilling 3 hours I''ve ever had. Extraordinary experience.',
 'https://randomuser.me/api/portraits/men/29.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '5 days'),

(s10, 'Shreya Banerjee', 5,
 'The Premier Jungle Suite has its own private pool — swimming while listening to jungle sounds at dusk is incomparable. Gourmet meals under fairy lights, leopard sighting on Day 2, and the most comfortable safari tent I''ve ever slept in.',
 'https://randomuser.me/api/portraits/women/41.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '16 days'),

(s10, 'Nitin Saxena', 4,
 'Top-tier jungle lodge experience. Saw tigers on both our morning safaris — the naturalist knew exactly where to look. The signature safari tent is incredibly comfortable for a jungle setting. Book the Premier Suite if budget allows.',
 'https://randomuser.me/api/portraits/men/73.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '24 days'),

-- ─────────────────────────────────────────────────────────────
-- s11 · Backpackers' Base Camp · Manali
-- ─────────────────────────────────────────────────────────────
(s11, 'Aryan Sethi', 5,
 'Best hostel in old Manali — full stop. The rooftop bonfire every night drew travellers from all over the world and the conversations were priceless. The thali was enormous and delicious. I extended my stay by four days I was so comfortable.',
 'https://randomuser.me/api/portraits/men/19.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1414369153946-7d64ca7d7af1?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '8 days'),

(s11, 'Simran Kaur', 4,
 'Great budget option in a prime location. Staff are friendly and super helpful for trek recommendations. Private room was simple but clean and warm. The mountain views from the dorm terrace are absolutely stunning.',
 'https://randomuser.me/api/portraits/women/53.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '18 days'),

(s11, 'Tushar Rao', 4,
 'Perfect base for Manali adventures. Organised a Hampta Pass trek through the hostel — the team was knowledgeable and affordable. Bonfire culture here is authentic and the fellow travellers are incredible people.',
 'https://randomuser.me/api/portraits/men/37.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '32 days'),

-- ─────────────────────────────────────────────────────────────
-- s12 · The Yellow Door Hostel · Rishikesh
-- ─────────────────────────────────────────────────────────────
(s12, 'Ananya Gupta', 5,
 'This place has soul. Morning yoga on the rooftop with Ganga views, momos from the café downstairs, evening aarti ceremony within walking distance — it''s everything Rishikesh should be. Met my best travel friends here.',
 'https://randomuser.me/api/portraits/women/62.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1500259571355-332da5cb07aa?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '7 days'),

(s12, 'Kabir Malhotra', 5,
 'Came for bungee jumping and stayed for a week because of how good the hostel was. The riverside private room with en-suite is exceptional value. Yoga at sunrise every morning sorted out months of back pain.',
 'https://randomuser.me/api/portraits/men/44.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '14 days'),

(s12, 'Riya Jain', 4,
 'Super vibrant hostel energy. The women''s dorm felt safe and welcoming. Breakfast is included and genuinely tasty. A bit noisy near the common areas at night, but earplugs solve that. Amazing spiritual energy in this part of Rishikesh.',
 'https://randomuser.me/api/portraits/women/75.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1500259571355-332da5cb07aa?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '23 days'),

-- ─────────────────────────────────────────────────────────────
-- s13 · Sunrise Guesthouse · Pushkar
-- ─────────────────────────────────────────────────────────────
(s13, 'Zara Khan', 5,
 'The rooftop terrace at dawn with the lake and ghats below is one of the most beautiful views I''ve ever woken up to. The hand-painted rooms are gorgeous and the Rajasthani breakfast with dal baati was authentic and delicious. Perfect budget gem.',
 'https://randomuser.me/api/portraits/women/86.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '9 days'),

(s13, 'Omar Farooq', 4,
 'Charming old-city guesthouse with character oozing from every wall. The painted rooms are exactly as beautiful as the photos. Great location inside the city walls. Staff helped us navigate the best ghats and temples.',
 'https://randomuser.me/api/portraits/men/92.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '20 days'),

(s13, 'Prachi Sharma', 4,
 'Great value for a Pushkar stay. The lake view en-suite is definitely worth upgrading to. The family running this guesthouse are incredibly hospitable. Having the camel fair in the background while sipping chai on the rooftop — priceless.',
 'https://randomuser.me/api/portraits/women/15.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '31 days'),

-- ─────────────────────────────────────────────────────────────
-- s14 · Azure Infinity Villa · North Goa
-- ─────────────────────────────────────────────────────────────
(s14, 'Mihail D''Cruz', 5,
 'The 20-metre infinity pool merging with the sea on the horizon is the stuff of Instagram dreams — except it''s even better in person. The private chef cooked us the best seafood feast imaginable. Five minutes to the beach and total privacy. Absolute perfection.',
 'https://randomuser.me/api/portraits/men/21.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '4 days'),

(s14, 'Alisha Fernandes', 5,
 'Booked the Master Pool Suite for our honeymoon and it exceeded every expectation. The Portuguese architecture, the outdoor shower, the butler who organised a beach picnic at sunset — every detail was magical. The villa smells of frangipani and sea breeze.',
 'https://randomuser.me/api/portraits/women/28.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '12 days'),

(s14, 'Ronak Shah', 4,
 'Premium villa experience in North Goa. The pool is stunning and private, the house is beautifully maintained. Only mild wish is that it''s a tiny bit far from some of the best restaurants — but with a private chef on-site, you won''t care.',
 'https://randomuser.me/api/portraits/men/66.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '26 days'),

-- ─────────────────────────────────────────────────────────────
-- s15 · The Plunge Palace · Alibaug
-- ─────────────────────────────────────────────────────────────
(s15, 'Siddharth Lele', 5,
 'The perfect Mumbai escape. Two-hour ferry ride and you''re in another world entirely. Temperature-controlled plunge pool in the evening, outdoor rain shower at dawn, and a courtyard garden that smells incredible. My wife and I go back every quarter.',
 'https://randomuser.me/api/portraits/men/36.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '8 days'),

(s15, 'Nisha Mehrotra', 5,
 'This villa is gorgeous in every way. The plunge pool deluxe room is the one to book — the private pool and rainfall shower make it incredibly special. Staff are discreet but attentive. So close to Mumbai yet miles away in every other sense.',
 'https://randomuser.me/api/portraits/women/51.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '17 days'),

(s15, 'Akash Tiwari', 4,
 'Fantastic weekend villa. The garden studio is great value and the shared pool is beautiful. Lovely breakfasts with fresh local produce. The beach is a 10-minute walk and that''s actually a plus — more private than a beachfront property.',
 'https://randomuser.me/api/portraits/men/82.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '33 days'),

-- ─────────────────────────────────────────────────────────────
-- s16 · Horizon Pool Villa Retreat · Hampi
-- ─────────────────────────────────────────────────────────────
(s16, 'Varun Mishra', 5,
 'Hampi''s boulder landscape is otherworldly and this villa places you right inside it. The pool blends with the volcanic rock perfectly. Sundowners looking over the ruins with a cold drink — I have not been so at peace in years.',
 'https://randomuser.me/api/portraits/men/48.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '6 days'),

(s16, 'Gayatri Iyer', 5,
 'Stargazing from the pool at midnight in Hampi''s dark skies is a once-in-a-lifetime experience. The boulder view suite is stunning and the entire villa feels architecturally thoughtful — it doesn''t fight the landscape, it honours it.',
 'https://randomuser.me/api/portraits/women/69.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1540541338537-c8bfbbd7df5b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '15 days'),

(s16, 'Harsh Pandey', 4,
 'Unique and memorable experience at this contemporary villa. The Hampi ruins exploration by bicycle followed by a pool dip and bonfire evening is a perfect day. Getting to the villa involves some off-road driving but the host guides you well.',
 'https://randomuser.me/api/portraits/men/83.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '28 days'),

-- ─────────────────────────────────────────────────────────────
-- s17 · Cobalt Cove Villa · Varkala
-- ─────────────────────────────────────────────────────────────
(s17, 'Elena Thomas', 5,
 'Watching the Arabian Sea from a saltwater infinity pool fifty metres above the cliffs while the sky turns amber and pink — there are no words for this. The Ayurvedic spa packages are genuinely transformative. I came stressed and left renewed.',
 'https://randomuser.me/api/portraits/women/35.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '5 days'),

(s17, 'George Kurien', 5,
 'This clifftop villa is simply stunning. The fresh seafood restaurant rivals any coastal fine-dining I''ve visited internationally. The sea suite bedroom with its ocean views made waking up at sunrise the best part of every morning.',
 'https://randomuser.me/api/portraits/men/57.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '13 days'),

(s17, 'Bindu Nair', 4,
 'Cobalt Cove is special. The cliff location, the pool, the sound of waves below at night — deeply relaxing. The Ayurvedic sessions were excellent. Could use a few more options for evening activities, but the sunsets keep you fully occupied.',
 'https://randomuser.me/api/portraits/women/80.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '25 days'),

-- ─────────────────────────────────────────────────────────────
-- s18 · The Canopy Nest · Athirapally
-- ─────────────────────────────────────────────────────────────
(s18, 'Jiya Mathew', 5,
 'Sleeping to the thunder of Athirapally Falls is the most spectacular experience. The glass walls mean the waterfall is your bedroom wall — visible from the bed, the bathroom, everywhere. The suspension bridge entrance is adventurous and fun.',
 'https://randomuser.me/api/portraits/women/42.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '7 days'),

(s18, 'Robin Varghese', 5,
 'The Canopy Nest feels like nature''s own five-star suite. Waking up surrounded by mist and the roar of the falls, with hornbills flying past your glass wall — you cannot manufacture this experience anywhere else in the world.',
 'https://randomuser.me/api/portraits/men/63.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '16 days'),

(s18, 'Aparna Suresh', 4,
 'Magical location and a beautifully crafted teak treehouse. The forest nest room is simpler but still charming and more affordable. Breakfast delivered via a little pulley basket to your treehouse deck is the cutest thing ever.',
 'https://randomuser.me/api/portraits/women/76.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '27 days'),

-- ─────────────────────────────────────────────────────────────
-- s19 · Whispering Pines Treehouse · Kodaikanal
-- ─────────────────────────────────────────────────────────────
(s19, 'Dhruv Rajput', 5,
 'Off-grid living at its absolute finest. No phone signal, no noise, no distractions — just the pine canopy and birdsong. The rope ladder, the solar lights at dusk, and the wrap-around deck at 35 feet above ground made me feel like a kid again.',
 'https://randomuser.me/api/portraits/men/24.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '9 days'),

(s19, 'Sonal Bhandari', 5,
 'The silver oak treehouse is genuinely unlike anything I''ve experienced. The century-old tree creaks gently in the breeze, the stars above Kodaikanal are brilliant, and the eco-conscious design makes the stay guilt-free. Fell asleep to owls hooting.',
 'https://randomuser.me/api/portraits/women/50.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '19 days'),

(s19, 'Manoj Pillai', 4,
 'Unique eco-stay that delivers on its promise. The ground-level cabin is cosier and warmer on cold Kodai nights. The host is extremely knowledgeable about the local flora, fauna, and hidden trails. A truly restorative experience.',
 'https://randomuser.me/api/portraits/men/87.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1476514555960-1153cced88c4?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '34 days'),

-- ─────────────────────────────────────────────────────────────
-- s20 · Jungle Crown Treehouse · Wayanad
-- ─────────────────────────────────────────────────────────────
(s20, 'Aditi Nair', 5,
 'Three interconnected treehouses 40 feet in the Wayanad canopy — we were speechless on arrival. A wild elephant walked below our sky deck in the evening. Campfire storytelling with the host under the stars was the most memorable night of our trip.',
 'https://randomuser.me/api/portraits/women/32.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '6 days'),

(s20, 'Vivek Pillai', 5,
 'The canopy walk between the three treehouses at sunrise with mist swirling below is something out of a nature documentary. Saw Malabar hornbills, a langur troop, and fresh elephant tracks every morning. The rainforest loft is heavenly.',
 'https://randomuser.me/api/portraits/men/46.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '15 days'),

(s20, 'Sneha Krishnamurthy', 5,
 'The most immersive nature experience I''ve ever had. The sky deck wildlife spotting, the campfire, the suspension bridge into the rainforest loft — it all felt utterly real and adventurous. Pet-friendly too, so our dog came along and loved it.',
 'https://randomuser.me/api/portraits/women/59.jpg',
 ARRAY[
   'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80'
 ], 'approved', now() - interval '22 days');

END $$;
