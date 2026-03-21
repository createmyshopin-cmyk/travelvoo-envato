export interface Trip {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationNights: number;
  durationDays: number;
  /** Pickup point label */
  pickupLocation: string;
  /** Drop-off label */
  dropLocation: string;
  /** Optional map URL (e.g. Google Maps) for pickup */
  pickupMapUrl: string | null;
  /** Optional map URL for drop-off */
  dropMapUrl: string | null;
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
  /** Booking: adult / child limits */
  minAdults: number;
  maxAdults: number;
  maxChildren: number;
  defaultAdults: number;
  /** Extra tabs on the trip page (from trips.custom_tabs). */
  customTabs: TripCustomTab[];
}

/** User-defined tab: label + body shown on the public trip page. */
export interface TripCustomTab {
  label: string;
  body: string;
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
