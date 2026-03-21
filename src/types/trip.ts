export interface Trip {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationNights: number;
  durationDays: number;
  pickupDropLocation: string;
  images: string[];
  startingPrice: number;
  originalPrice: number;
  discountLabel: string | null;
  cancellationPolicy: string[];
  ctaHeading: string | null;
  ctaSubheading: string | null;
  ctaImageUrl: string | null;
  status: string;
  tenantId: string | null;
}

export interface TripItineraryDay {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  sortOrder: number;
}

export interface TripDate {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  status: "available" | "sold_out" | "few_left";
}

export interface TripInclusion {
  id: string;
  description: string;
  type: "included" | "excluded";
  sortOrder: number;
}

export interface TripOtherInfo {
  id: string;
  sectionTitle: string;
  items: string[];
  sortOrder: number;
}

export interface TripVideo {
  id: string;
  youtubeUrl: string;
  title: string;
  sortOrder: number;
}

export interface TripReview {
  id: string;
  reviewerName: string;
  reviewerAvatar: string;
  reviewTitle: string;
  reviewText: string;
  reviewDate: string;
  sortOrder: number;
}
