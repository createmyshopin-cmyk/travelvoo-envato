/** Inputs for timeline step completion (keeps dialog lean + testable). */
export type PackageFormTimelineFields = {
  name: string;
  slug: string;
  durationNights: string;
  durationDays: string;
  minAdults: string;
  maxAdults: string;
  defaultAdults: string;
  maxChildren: string;
  pickupLocation: string;
  dropLocation: string;
  pickupMapUrl: string;
  dropMapUrl: string;
  startingPrice: string;
  originalPrice: string;
  tripBatchCount: number;
  coverImageCount: number;
};

/** Returns 8 booleans: step i complete === result[i] (step numbers are 1-based in UI). */
export function computePackageTimelineCompletion(f: PackageFormTimelineFields): boolean[] {
  const step1 = f.name.trim().length > 0 && f.slug.trim().length > 0;

  const nights = parseInt(f.durationNights, 10);
  const days = parseInt(f.durationDays, 10);
  const step2 = !Number.isNaN(nights) && nights >= 0 && !Number.isNaN(days) && days >= 1;

  const rawMin = parseInt(f.minAdults, 10);
  const rawMax = parseInt(f.maxAdults, 10);
  const rawDef = parseInt(f.defaultAdults, 10);
  const rawMaxC = parseInt(f.maxChildren, 10);
  const step3 =
    !Number.isNaN(rawMin) &&
    rawMin >= 1 &&
    !Number.isNaN(rawMax) &&
    rawMax >= rawMin &&
    !Number.isNaN(rawMaxC) &&
    rawMaxC >= 0 &&
    !Number.isNaN(rawDef) &&
    rawDef >= rawMin &&
    rawDef <= rawMax;

  const step4 =
    f.pickupLocation.trim().length > 0 ||
    f.dropLocation.trim().length > 0 ||
    f.pickupMapUrl.trim().length > 0 ||
    f.dropMapUrl.trim().length > 0;

  const start = parseFloat(f.startingPrice);
  const orig = f.originalPrice.trim() === "" ? start : parseFloat(f.originalPrice);
  const step5 =
    !Number.isNaN(start) &&
    start >= 0 &&
    (f.originalPrice.trim() === "" || (!Number.isNaN(orig) && orig >= 0));

  const step6 = f.tripBatchCount > 0;

  const step7 = f.coverImageCount > 0;

  const step8 = step1 && step2 && step3 && step4 && step5 && step6 && step7;

  return [step1, step2, step3, step4, step5, step6, step7, step8];
}
