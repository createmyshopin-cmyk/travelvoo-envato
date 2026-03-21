-- Demo trip: Coorg Backpacking Trip (mirrors the TripperTrails reference)
-- Run after 20260321150000_trips_packages.sql migration

DO $$
DECLARE
  v_trip_id uuid;
BEGIN

-- Insert the trip (tenant_id = NULL for platform demo)
INSERT INTO public.trips (
  slug, name, description, duration_nights, duration_days,
  pickup_drop_location, images,
  starting_price, original_price, discount_label,
  cancellation_policy,
  cta_heading, cta_subheading, cta_image_url,
  status, tenant_id
) VALUES (
  'tt-coorg-backpacking-trip',
  'Coorg Backpacking Trip: Scenic Adventure',
  'Experience the stunning beauty of Coorg with our backpacking trip. Hike through lush coffee estates, explore magnificent waterfalls, visit ancient monasteries, and create memories that last a lifetime.',
  1, 2,
  'Bangalore',
  ARRAY[
    '/assets/stay-1.jpg',
    '/assets/stay-2.jpg',
    '/assets/stay-3.jpg'
  ],
  4599, 5199, 'Save ₹600',
  '["No refund shall be made with respect to the initial booking amount for any cancellations/reschedule. However,",
    "If cancellations/reschedule are made 7 days before the start date of the trip, 50% of the trip cost will be charged as cancellation fees.",
    "If cancellations/reschedule are made 3 days before the start date of the trip, 75% of the trip cost will be charged as cancellation fees.",
    "If cancellations/reschedule are made within 3 days before the start date of the trip, 100% of the trip cost will be charged as cancellation fees.",
    "In the case of unforeseen weather conditions or government restrictions, certain activities may be cancelled and in such cases, the operator will try his best to provide an alternate feasible activity. However, no refund will be provided for the same."]'::jsonb,
  'You pick the mood. We map the route.', NULL, NULL,
  'active', NULL
) RETURNING id INTO v_trip_id;

-- Itinerary days
INSERT INTO public.trip_itinerary_days (trip_id, day_number, title, description, sort_order) VALUES
(v_trip_id, 0, 'Travel Day', 'Board the bus/tempo from Bangalore in the evening. Overnight journey to Coorg with a brief stop for dinner.', 0),
(v_trip_id, 1, 'Hike To Mandalpatti and Exploring Abbey Waterfalls, Raja seat and Madikeri market.', 'Wake up to misty mountains! Start with a thrilling jeep ride to Mandalpatti peak for panoramic views. After descending, visit the iconic Abbey Falls surrounded by coffee and spice plantations. Head to Raja Seat for stunning sunset views, then explore the vibrant Madikeri market for local flavors and souvenirs.', 1),
(v_trip_id, 2, 'Coffee Estate Walk, Harangi Elephant Camp & Backwaters, Namdroling Monastery (Golden Temple)', 'Begin with a guided coffee estate walk, learning about Coorg''s famous coffee culture. Visit the Harangi Elephant Camp for a unique wildlife experience, then enjoy the serene backwaters. End the day at the magnificent Namdroling Monastery (Golden Temple) in Bylakuppe before heading back to Bangalore.', 2);

-- Trip dates (weekly batches from late March to late June 2026)
INSERT INTO public.trip_dates (trip_id, start_date, end_date, price, status) VALUES
(v_trip_id, '2026-03-27', '2026-03-29', 4599, 'available'),
(v_trip_id, '2026-04-03', '2026-04-05', 4599, 'available'),
(v_trip_id, '2026-04-10', '2026-04-12', 4599, 'available'),
(v_trip_id, '2026-04-10', '2026-04-12', 4599, 'available'),
(v_trip_id, '2026-04-17', '2026-04-19', 4599, 'available'),
(v_trip_id, '2026-04-24', '2026-04-26', 4599, 'available'),
(v_trip_id, '2026-05-01', '2026-05-03', 4599, 'available'),
(v_trip_id, '2026-05-08', '2026-05-10', 4599, 'available'),
(v_trip_id, '2026-05-15', '2026-05-17', 4599, 'available'),
(v_trip_id, '2026-05-22', '2026-05-24', 4599, 'available'),
(v_trip_id, '2026-05-29', '2026-05-31', 4599, 'available'),
(v_trip_id, '2026-06-05', '2026-06-07', 4599, 'available'),
(v_trip_id, '2026-06-12', '2026-06-14', 4599, 'available'),
(v_trip_id, '2026-06-19', '2026-06-21', 4599, 'available'),
(v_trip_id, '2026-06-26', '2026-06-28', 4599, 'available');

-- Inclusions
INSERT INTO public.trip_inclusions (trip_id, description, type, sort_order) VALUES
(v_trip_id, 'Entire travel as per the itinerary by AC Tempo Traveller/Mini Bus.', 'included', 1),
(v_trip_id, 'Meals- Breakfast on Day 1 & 2 and Dinner on day 1.', 'included', 2),
(v_trip_id, 'Trip captain throughout the trip.', 'included', 3),
(v_trip_id, 'Accommodation on a triple and quad basis in a homestay.', 'included', 4),
(v_trip_id, '(Property overview- Stay will be in rooms but it offers all the amenities like common area, and bonfire & chill area and property is located amidst of a coffee estate).', 'included', 5),
(v_trip_id, 'Raja Seat Entry is included', 'included', 6),
(v_trip_id, 'Driver Bata and Toll charges', 'included', 7),
(v_trip_id, 'Experience of Tripper Trail''s trip and a lifetime memory.', 'included', 8),
(v_trip_id, 'Anything not mentioned under inclusions', 'excluded', 1),
(v_trip_id, 'Travel, Accidental and Medical insurance', 'excluded', 2),
(v_trip_id, 'Cost arises due to uncontrollable circumstances like bad weather conditions, landslides, or some public protest.', 'excluded', 3),
(v_trip_id, 'Jeep ride charge to Mandalpatti.', 'excluded', 4),
(v_trip_id, 'Activities and entry at Harangi elephant camp.', 'excluded', 5),
(v_trip_id, 'Any guide fees, or entry charges which are not mentioned on the itinerary.', 'excluded', 6),
(v_trip_id, 'Anything not mentioned under "inclusions"', 'excluded', 7),
(v_trip_id, 'GST @ 5%', 'excluded', 8);

-- Other info
INSERT INTO public.trip_other_info (trip_id, section_title, items, sort_order) VALUES
(v_trip_id, 'Must Carry', ARRAY[
  'Soft copy of your Aadhar card and Vaccine certificate',
  'Face mask and Sanitizer',
  'Cargo/Track pants/Shorts',
  'T-shirts',
  'Sunscreen',
  'Good traction shoes',
  'Personal medicines (if any)',
  'Rain jacket or umbrella (seasonal)',
  'Power bank and charger'
], 1);

-- Videos
INSERT INTO public.trip_videos (trip_id, youtube_url, title, sort_order) VALUES
(v_trip_id, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Client Testimonials | Experience with TripperTrails', 1),
(v_trip_id, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Experience Chikmagalur with Tripper Trails', 2);

-- Reviews
INSERT INTO public.trip_reviews (trip_id, reviewer_name, reviewer_avatar, review_title, review_text, review_date, sort_order) VALUES
(v_trip_id, 'Vansh Goyal', '', 'Amazing Experience with a Skilled Captain', 'Having an amazing captain can greatly enhance the overall experience of a trip. A skilled captain can navigate the waters with precision and expertise, ensuring a smooth and enjoyable journey for all passengers.', '2024-02-29', 1),
(v_trip_id, 'Raghvendra Soni', '', 'A Surprisingly Perfect Chikmagalur Getaway', 'I went for 2 days and 1 night trip to Chikmagalur with Tripper Trail. I would say it was one of the best trip I ever had with strangers as I am not a solo or community traveller. The experience was beyond my expectations.', '2024-03-25', 2),
(v_trip_id, 'Ashmiha Anwar', '', 'A Community That Makes Every Trip Special', 'Tripper trails is a community that tries to connect backpackers to have an amazing experience on the trip. I had a great time in their Gokarna backpacking trip and would highly recommend it to anyone looking for adventure.', '2024-03-15', 3);

RAISE NOTICE 'Demo trip seeded: %', v_trip_id;

END $$;
