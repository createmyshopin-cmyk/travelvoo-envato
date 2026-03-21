// Shared types for stay data — all data now comes from Supabase
export interface RoomCategory {
  id: string;
  name: string;
  images: string[];
  maxGuests: number;
  available: number;
  amenities: string[];
  price: number;
  originalPrice: number;
}

export interface Review {
  id: string;
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
  id: string;
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
  status: string;
  tenantId: string | null;
  cooldownMinutes: number;
  maxAdults: number;
  maxChildren: number;
  maxPets: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImageUrl?: string | null;
}
