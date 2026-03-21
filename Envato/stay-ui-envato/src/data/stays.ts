import stay1 from "@/assets/stay-1.jpg";
import stay2 from "@/assets/stay-2.jpg";
import stay3 from "@/assets/stay-3.jpg";
import stay4 from "@/assets/stay-4.jpg";
import stay5 from "@/assets/stay-5.jpg";
import stay6 from "@/assets/stay-6.jpg";
import stay7 from "@/assets/stay-7.jpg";
import stay8 from "@/assets/stay-8.jpg";

export interface RoomCategory {
  name: string;
  images: string[];
  maxGuests: number;
  available: number;
  amenities: string[];
  price: number;
  originalPrice: number;
}

export interface Review {
  name: string;
  avatar: string;
  rating: number;
  text: string;
  photos: string[];
}

export interface NearbyDestination {
  name: string;
  image: string;
  distance: string;
}

export interface Reel {
  title: string;
  thumbnail: string;
  url: string;
  platform: "instagram" | "youtube" | "facebook" | "tiktok";
}

export interface Stay {
  id: number;
  stayId: string;
  name: string;
  location: string;
  price: number;
  originalPrice: number;
  image: string;
  images: string[];
  category: string;
  rating: number;
  reviews: number;
  description: string;
  amenities: string[];
  pricing: { label: string; amount: number }[];
  badges: { text: string; color: "orange" | "purple" | "pink" | "red" }[];
  roomCategories?: RoomCategory[];
  customerReviews?: Review[];
  nearbyDestinations?: NearbyDestination[];
  reels?: Reel[];
}

export const allStays: Stay[] = [
  {
    id: 1, stayId: "Stay-3546", name: "Mountain View Resort", location: "Kalpetta", price: 3500, originalPrice: 4099, image: stay1,
    images: [stay1, stay7, stay4, stay3], category: "Couple Friendly", rating: 4.8, reviews: 124,
    description: "Nestled in the misty hills of Wayanad, Mountain View Resort offers breathtaking panoramic views of the Western Ghats. Perfect for couples seeking a romantic escape surrounded by nature.",
    amenities: ["Free Wi-Fi", "Swimming Pool", "Spa", "Room Service", "Mountain View", "Parking", "Restaurant", "Bonfire"],
    pricing: [{ label: "Standard Room", amount: 3500 }, { label: "Deluxe Room", amount: 5000 }, { label: "Suite", amount: 7500 }],
    badges: [{ text: "VIP", color: "purple" }, { text: "Couple Friendly", color: "pink" }],
    roomCategories: [
      { name: "Standard Room", images: [stay1, stay7], maxGuests: 2, available: 5, amenities: ["AC", "Wi-Fi", "TV", "Hot Water"], price: 3500, originalPrice: 4099 },
      { name: "Deluxe Room", images: [stay7, stay4], maxGuests: 2, available: 3, amenities: ["AC", "Balcony", "Wi-Fi", "Mountain View"], price: 5000, originalPrice: 5999 },
      { name: "Suite Room", images: [stay4, stay3], maxGuests: 4, available: 1, amenities: ["AC", "Living Area", "Balcony", "Jacuzzi", "Wi-Fi"], price: 7500, originalPrice: 8999 },
    ],
    customerReviews: [
      { name: "Rahul Nair", avatar: "https://i.pravatar.cc/100?u=rahul", rating: 5, text: "Amazing stay with beautiful mountain views. The staff was incredibly welcoming and the food was delicious!", photos: [stay1, stay7, stay4] },
      { name: "Priya Menon", avatar: "https://i.pravatar.cc/100?u=priya", rating: 4.5, text: "Loved the peaceful atmosphere and the infinity pool. Would definitely come back again.", photos: [stay3, stay7] },
      { name: "Arjun Das", avatar: "https://i.pravatar.cc/100?u=arjun", rating: 5, text: "Perfect romantic getaway. The sunset views from the balcony were breathtaking.", photos: [stay4] },
    ],
    nearbyDestinations: [
      { name: "Edakkal Caves", image: stay3, distance: "12 km" },
      { name: "Banasura Dam", image: stay5, distance: "15 km" },
      { name: "Soochipara Waterfalls", image: stay6, distance: "20 km" },
      { name: "Chembra Peak", image: stay8, distance: "25 km" },
    ],
    reels: [
      { title: "Infinity Pool View", thumbnail: stay4, url: "https://youtube.com/shorts/example1", platform: "youtube" },
      { title: "Couple Room Tour", thumbnail: stay7, url: "https://instagram.com/reel/example2", platform: "instagram" },
      { title: "Sunset Balcony View", thumbnail: stay1, url: "https://youtube.com/shorts/example3", platform: "youtube" },
    ],
  },
  {
    id: 2, stayId: "Stay-8210", name: "Lake View Cottage", location: "Ambalavayal", price: 2800, originalPrice: 3299, image: stay2,
    images: [stay2, stay5, stay8, stay6], category: "Couple Friendly", rating: 4.6, reviews: 89,
    description: "A charming lakeside cottage offering serenity and privacy. Wake up to the sounds of birds and enjoy stunning lake reflections from your private balcony.",
    amenities: ["Lake View", "Private Balcony", "Free Breakfast", "Parking", "Garden", "Campfire"],
    pricing: [{ label: "Cottage Room", amount: 2800 }, { label: "Premium Cottage", amount: 4200 }],
    badges: [{ text: "Best Seller", color: "red" }],
    roomCategories: [
      { name: "Cottage Room", images: [stay2, stay5], maxGuests: 2, available: 4, amenities: ["Lake View", "Balcony", "Wi-Fi"], price: 2800, originalPrice: 3299 },
      { name: "Premium Cottage", images: [stay8, stay6], maxGuests: 3, available: 2, amenities: ["Lake View", "Balcony", "Wi-Fi", "Breakfast"], price: 4200, originalPrice: 4999 },
    ],
    customerReviews: [
      { name: "Sneha Raj", avatar: "https://i.pravatar.cc/100?u=sneha", rating: 5, text: "The lake view was absolutely stunning. Peaceful and serene!", photos: [stay2, stay5] },
      { name: "Vikram K", avatar: "https://i.pravatar.cc/100?u=vikram", rating: 4, text: "Great value for money. Loved the campfire nights.", photos: [stay8] },
    ],
    nearbyDestinations: [
      { name: "Edakkal Caves", image: stay3, distance: "18 km" },
      { name: "Phantom Rock", image: stay7, distance: "8 km" },
      { name: "Wayanad Wildlife", image: stay6, distance: "22 km" },
    ],
    reels: [
      { title: "Lake Morning View", thumbnail: stay2, url: "https://youtube.com/shorts/example4", platform: "youtube" },
      { title: "Campfire Night", thumbnail: stay8, url: "https://instagram.com/reel/example5", platform: "instagram" },
    ],
  },
  {
    id: 3, stayId: "Stay-10934", name: "Forest Tree House", location: "Meppadi", price: 4500, originalPrice: 5200, image: stay3,
    images: [stay3, stay1, stay6, stay7], category: "Tree Houses", rating: 4.9, reviews: 203,
    description: "Experience the magic of staying in a treehouse elevated above the tropical forest canopy. An adventurous and unforgettable stay for nature lovers.",
    amenities: ["Treehouse Living", "Nature Trail", "Bird Watching", "Campfire", "Local Cuisine", "Guided Trek"],
    pricing: [{ label: "Standard Treehouse", amount: 4500 }, { label: "Luxury Treehouse", amount: 6500 }],
    badges: [{ text: "Limited Booking", color: "orange" }, { text: "VIP", color: "purple" }],
    roomCategories: [
      { name: "Standard Treehouse", images: [stay3, stay1], maxGuests: 2, available: 3, amenities: ["Nature View", "Balcony", "Hot Water"], price: 4500, originalPrice: 5200 },
      { name: "Luxury Treehouse", images: [stay6, stay7], maxGuests: 2, available: 1, amenities: ["Panoramic View", "Private Deck", "Hot Water", "Breakfast"], price: 6500, originalPrice: 7999 },
    ],
    customerReviews: [
      { name: "Meera S", avatar: "https://i.pravatar.cc/100?u=meera", rating: 5, text: "Unforgettable experience! Waking up in the treetops was magical.", photos: [stay3, stay1] },
    ],
    nearbyDestinations: [
      { name: "Soochipara Waterfalls", image: stay6, distance: "10 km" },
      { name: "Chembra Peak", image: stay8, distance: "8 km" },
      { name: "Meenmutty Falls", image: stay5, distance: "14 km" },
    ],
    reels: [
      { title: "Treehouse Tour", thumbnail: stay3, url: "https://youtube.com/shorts/example6", platform: "youtube" },
    ],
  },
  {
    id: 4, stayId: "Stay-4721", name: "Infinity Pool Villa", location: "Vythiri", price: 6000, originalPrice: 7500, image: stay4,
    images: [stay4, stay7, stay1, stay2], category: "Pool Villas", rating: 4.7, reviews: 156,
    description: "A luxurious villa featuring a stunning infinity pool overlooking the lush green valley. Indulge in world-class amenities and unmatched privacy.",
    amenities: ["Infinity Pool", "Private Villa", "Jacuzzi", "Room Service", "Mini Bar", "Gym", "Spa", "Valley View"],
    pricing: [{ label: "Villa (2 guests)", amount: 6000 }, { label: "Villa (4 guests)", amount: 8500 }],
    badges: [{ text: "VIP", color: "purple" }, { text: "Best Seller", color: "red" }],
    roomCategories: [
      { name: "Pool Villa (2 Guests)", images: [stay4, stay7], maxGuests: 2, available: 2, amenities: ["Private Pool", "AC", "Mini Bar", "Wi-Fi"], price: 6000, originalPrice: 7500 },
      { name: "Pool Villa (4 Guests)", images: [stay1, stay2], maxGuests: 4, available: 1, amenities: ["Private Pool", "AC", "Mini Bar", "Wi-Fi", "Jacuzzi"], price: 8500, originalPrice: 10999 },
    ],
    customerReviews: [
      { name: "Anita R", avatar: "https://i.pravatar.cc/100?u=anita", rating: 5, text: "The infinity pool was absolutely gorgeous. Best villa experience ever!", photos: [stay4, stay7] },
      { name: "Karthik M", avatar: "https://i.pravatar.cc/100?u=karthik", rating: 4.5, text: "Luxurious and private. Worth every penny!", photos: [stay1] },
    ],
    nearbyDestinations: [
      { name: "Pookode Lake", image: stay2, distance: "5 km" },
      { name: "Chain Tree", image: stay3, distance: "3 km" },
      { name: "Lakkidi Viewpoint", image: stay8, distance: "7 km" },
    ],
    reels: [
      { title: "Pool Drone Shot", thumbnail: stay4, url: "https://youtube.com/shorts/example7", platform: "youtube" },
      { title: "Villa Room Tour", thumbnail: stay7, url: "https://instagram.com/reel/example8", platform: "instagram" },
    ],
  },
  {
    id: 5, stayId: "Stay-5893", name: "Budget Garden Stay", location: "Kalpetta", price: 1200, originalPrice: 1200, image: stay5,
    images: [stay5, stay8, stay2, stay6], category: "Budget Rooms", rating: 4.2, reviews: 67,
    description: "An affordable and comfortable homestay with a beautiful garden setting. Ideal for budget travelers looking for a clean and cozy base to explore Wayanad.",
    amenities: ["Garden", "Free Breakfast", "Parking", "Hot Water", "Wi-Fi"],
    pricing: [{ label: "Standard Room", amount: 1200 }, { label: "Double Room", amount: 1800 }],
    badges: [],
    roomCategories: [
      { name: "Standard Room", images: [stay5, stay8], maxGuests: 2, available: 6, amenities: ["Fan", "Wi-Fi", "Hot Water"], price: 1200, originalPrice: 1200 },
      { name: "Double Room", images: [stay2, stay6], maxGuests: 3, available: 4, amenities: ["Fan", "Wi-Fi", "Hot Water", "Breakfast"], price: 1800, originalPrice: 2100 },
    ],
    customerReviews: [
      { name: "Deepak T", avatar: "https://i.pravatar.cc/100?u=deepak", rating: 4, text: "Clean rooms and great breakfast. Perfect for budget travelers.", photos: [stay5] },
    ],
    nearbyDestinations: [
      { name: "Edakkal Caves", image: stay3, distance: "10 km" },
      { name: "Wayanad Museum", image: stay7, distance: "2 km" },
    ],
  },
  {
    id: 6, stayId: "Stay-6147", name: "Green Leaf Resort", location: "Sulthan Bathery", price: 3200, originalPrice: 3999, image: stay6,
    images: [stay6, stay3, stay7, stay5], category: "Family Stay", rating: 4.5, reviews: 112,
    description: "A family-friendly resort surrounded by spice plantations. Enjoy spacious rooms, kid-friendly activities, and authentic Kerala cuisine.",
    amenities: ["Kids Play Area", "Swimming Pool", "Restaurant", "Spice Garden Tour", "Parking", "Room Service", "Bonfire"],
    pricing: [{ label: "Family Room", amount: 3200 }, { label: "Family Suite", amount: 5200 }],
    badges: [{ text: "Couple Friendly", color: "pink" }],
    roomCategories: [
      { name: "Family Room", images: [stay6, stay3], maxGuests: 4, available: 4, amenities: ["AC", "Wi-Fi", "Kids Bed", "TV"], price: 3200, originalPrice: 3999 },
      { name: "Family Suite", images: [stay7, stay5], maxGuests: 6, available: 2, amenities: ["AC", "Wi-Fi", "Kids Bed", "TV", "Living Area", "Balcony"], price: 5200, originalPrice: 6499 },
    ],
    customerReviews: [
      { name: "Latha K", avatar: "https://i.pravatar.cc/100?u=latha", rating: 5, text: "Kids loved the play area! Great family vacation.", photos: [stay6, stay3] },
    ],
    nearbyDestinations: [
      { name: "Jain Temple", image: stay7, distance: "5 km" },
      { name: "Wayanad Wildlife", image: stay8, distance: "12 km" },
    ],
  },
  {
    id: 7, stayId: "Stay-7362", name: "Sunset View Villa", location: "Meppadi", price: 5500, originalPrice: 6999, image: stay7,
    images: [stay7, stay4, stay1, stay8], category: "Luxury Resort", rating: 4.9, reviews: 178,
    description: "Watch spectacular sunsets from your private villa perched on a hilltop. Premium luxury with personalized butler service and gourmet dining.",
    amenities: ["Sunset View", "Butler Service", "Fine Dining", "Spa", "Pool", "Wine Cellar", "Helipad"],
    pricing: [{ label: "Premium Villa", amount: 5500 }, { label: "Royal Suite", amount: 9000 }],
    badges: [{ text: "VIP", color: "purple" }, { text: "Limited Booking", color: "orange" }],
    roomCategories: [
      { name: "Premium Villa", images: [stay7, stay4], maxGuests: 2, available: 2, amenities: ["AC", "Butler", "Pool Access", "Wine Bar"], price: 5500, originalPrice: 6999 },
      { name: "Royal Suite", images: [stay1, stay8], maxGuests: 4, available: 1, amenities: ["AC", "Butler", "Private Pool", "Wine Bar", "Spa"], price: 9000, originalPrice: 11999 },
    ],
    customerReviews: [
      { name: "Ravi P", avatar: "https://i.pravatar.cc/100?u=ravi", rating: 5, text: "The sunset views are unmatched. Butler service was exceptional!", photos: [stay7, stay4] },
      { name: "Smitha N", avatar: "https://i.pravatar.cc/100?u=smitha", rating: 5, text: "Pure luxury. The wine cellar experience was a highlight.", photos: [stay1] },
    ],
    nearbyDestinations: [
      { name: "Chembra Peak", image: stay8, distance: "6 km" },
      { name: "Soochipara Waterfalls", image: stay6, distance: "12 km" },
      { name: "Meenmutty Falls", image: stay5, distance: "15 km" },
    ],
    reels: [
      { title: "Sunset Timelapse", thumbnail: stay7, url: "https://youtube.com/shorts/example9", platform: "youtube" },
      { title: "Royal Suite Tour", thumbnail: stay1, url: "https://instagram.com/reel/example10", platform: "instagram" },
    ],
  },
  {
    id: 8, stayId: "Stay-8054", name: "Eco Farm Stay", location: "Pozhuthana", price: 1800, originalPrice: 2200, image: stay8,
    images: [stay8, stay5, stay6, stay3], category: "Non AC Rooms", rating: 4.3, reviews: 54,
    description: "An eco-friendly farm stay experience surrounded by paddy fields and coconut palms. Disconnect from the city and reconnect with nature.",
    amenities: ["Farm Tour", "Organic Food", "Nature Walk", "Cycling", "Parking", "Hot Water"],
    pricing: [{ label: "Eco Room", amount: 1800 }, { label: "Premium Eco Room", amount: 2500 }],
    badges: [{ text: "Best Seller", color: "red" }],
    roomCategories: [
      { name: "Eco Room", images: [stay8, stay5], maxGuests: 2, available: 5, amenities: ["Fan", "Nature View", "Hot Water"], price: 1800, originalPrice: 2200 },
      { name: "Premium Eco Room", images: [stay6, stay3], maxGuests: 3, available: 3, amenities: ["Fan", "Nature View", "Hot Water", "Breakfast"], price: 2500, originalPrice: 3100 },
    ],
    customerReviews: [
      { name: "Jayesh M", avatar: "https://i.pravatar.cc/100?u=jayesh", rating: 4, text: "Loved the organic food and peaceful atmosphere. Great detox!", photos: [stay8] },
    ],
    nearbyDestinations: [
      { name: "Banasura Dam", image: stay5, distance: "10 km" },
      { name: "Karlad Lake", image: stay2, distance: "8 km" },
    ],
  },
  {
    id: 9, stayId: "Stay-9281", name: "Royal Heritage", location: "Kalpetta", price: 7000, originalPrice: 8999, image: stay1,
    images: [stay1, stay6, stay4, stay7], category: "Luxury Resort", rating: 4.8, reviews: 142,
    description: "A heritage property blending colonial architecture with modern luxury. Experience royal treatment with world-class amenities.",
    amenities: ["Heritage Architecture", "Spa", "Pool", "Fine Dining", "Library", "Garden", "Concierge"],
    pricing: [{ label: "Heritage Room", amount: 7000 }, { label: "Royal Chamber", amount: 12000 }],
    badges: [{ text: "VIP", color: "purple" }, { text: "Best Seller", color: "red" }],
    roomCategories: [
      { name: "Heritage Room", images: [stay1, stay6], maxGuests: 2, available: 3, amenities: ["AC", "Heritage Decor", "Wi-Fi", "Pool Access"], price: 7000, originalPrice: 8999 },
      { name: "Royal Chamber", images: [stay4, stay7], maxGuests: 4, available: 1, amenities: ["AC", "Heritage Decor", "Wi-Fi", "Private Pool", "Butler"], price: 12000, originalPrice: 14999 },
    ],
    customerReviews: [
      { name: "Suresh B", avatar: "https://i.pravatar.cc/100?u=suresh", rating: 5, text: "The heritage architecture is stunning. Felt like royalty!", photos: [stay1, stay6] },
    ],
    nearbyDestinations: [
      { name: "Edakkal Caves", image: stay3, distance: "10 km" },
      { name: "Wayanad Museum", image: stay7, distance: "2 km" },
      { name: "Banasura Dam", image: stay5, distance: "20 km" },
    ],
  },
  {
    id: 10, stayId: "Stay-1067", name: "River Side Cottage", location: "Ambalavayal", price: 2200, originalPrice: 2800, image: stay2,
    images: [stay2, stay8, stay3, stay5], category: "Family Stay", rating: 4.4, reviews: 76,
    description: "A peaceful riverside cottage ideal for family getaways. Enjoy fishing, boating, and nature walks along the river bank.",
    amenities: ["River View", "Fishing", "Boating", "Campfire", "Free Breakfast", "Parking"],
    pricing: [{ label: "Cottage", amount: 2200 }, { label: "Family Cottage", amount: 3500 }],
    badges: [{ text: "Couple Friendly", color: "pink" }],
    roomCategories: [
      { name: "Cottage", images: [stay2, stay8], maxGuests: 2, available: 4, amenities: ["River View", "Wi-Fi", "Hot Water"], price: 2200, originalPrice: 2800 },
      { name: "Family Cottage", images: [stay3, stay5], maxGuests: 5, available: 2, amenities: ["River View", "Wi-Fi", "Hot Water", "Breakfast", "Extra Bed"], price: 3500, originalPrice: 4299 },
    ],
    customerReviews: [
      { name: "Kavitha R", avatar: "https://i.pravatar.cc/100?u=kavitha", rating: 4.5, text: "The river sounds at night are so calming. Kids loved the fishing!", photos: [stay2, stay8] },
    ],
    nearbyDestinations: [
      { name: "Phantom Rock", image: stay7, distance: "8 km" },
      { name: "Edakkal Caves", image: stay3, distance: "15 km" },
    ],
  },
  {
    id: 11, stayId: "Stay-1198", name: "Canopy Retreat", location: "Vythiri", price: 4800, originalPrice: 5999, image: stay3,
    images: [stay3, stay7, stay5, stay1], category: "Tree Houses", rating: 4.7, reviews: 134,
    description: "A premium treehouse retreat offering luxury amidst the forest canopy. Perfect for adventure seekers and nature enthusiasts.",
    amenities: ["Canopy Walk", "Zip Line", "Nature Trail", "Spa", "Restaurant", "Bird Watching"],
    pricing: [{ label: "Canopy Suite", amount: 4800 }, { label: "Premium Canopy", amount: 7000 }],
    badges: [{ text: "Limited Booking", color: "orange" }],
    roomCategories: [
      { name: "Canopy Suite", images: [stay3, stay7], maxGuests: 2, available: 3, amenities: ["Nature View", "Balcony", "Wi-Fi"], price: 4800, originalPrice: 5999 },
      { name: "Premium Canopy", images: [stay5, stay1], maxGuests: 2, available: 1, amenities: ["Panoramic View", "Private Deck", "Wi-Fi", "Spa Access"], price: 7000, originalPrice: 8499 },
    ],
    customerReviews: [
      { name: "Naveen G", avatar: "https://i.pravatar.cc/100?u=naveen", rating: 5, text: "The zip line was thrilling! Amazing treehouse experience.", photos: [stay3] },
    ],
    nearbyDestinations: [
      { name: "Pookode Lake", image: stay2, distance: "6 km" },
      { name: "Chain Tree", image: stay8, distance: "4 km" },
    ],
  },
  {
    id: 12, stayId: "Stay-1243", name: "Palm View Resort", location: "Sulthan Bathery", price: 2500, originalPrice: 2500, image: stay4,
    images: [stay4, stay2, stay6, stay8], category: "Pool Villas", rating: 4.5, reviews: 91,
    description: "A tropical resort with a shared infinity pool surrounded by swaying palms. Great value for a luxurious pool experience.",
    amenities: ["Shared Pool", "Palm Garden", "Restaurant", "Parking", "Wi-Fi", "Room Service"],
    pricing: [{ label: "Pool View Room", amount: 2500 }, { label: "Pool Access Suite", amount: 4000 }],
    badges: [],
    roomCategories: [
      { name: "Pool View Room", images: [stay4, stay2], maxGuests: 2, available: 5, amenities: ["Pool View", "AC", "Wi-Fi"], price: 2500, originalPrice: 2500 },
      { name: "Pool Access Suite", images: [stay6, stay8], maxGuests: 3, available: 2, amenities: ["Pool Access", "AC", "Wi-Fi", "Balcony"], price: 4000, originalPrice: 4799 },
    ],
    customerReviews: [
      { name: "Rekha S", avatar: "https://i.pravatar.cc/100?u=rekha", rating: 4, text: "Great pool and relaxing vibes. Good value for money!", photos: [stay4, stay2] },
    ],
    nearbyDestinations: [
      { name: "Jain Temple", image: stay7, distance: "5 km" },
      { name: "Wayanad Wildlife", image: stay3, distance: "10 km" },
    ],
  },
];