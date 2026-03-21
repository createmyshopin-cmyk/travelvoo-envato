"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  buildPackagePreviewTrip,
  type PreviewItineraryInput,
  type PreviewInclusionInput,
  type PreviewOtherInfoInput,
  type PreviewCustomTabInput,
} from "@/lib/buildPackagePreviewTrip";
import TripHero from "@/components/trip/TripHero";
import TripGallery from "@/components/trip/TripGallery";
import TripTabs from "@/components/trip/TripTabs";
import { ExternalLink, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TripBatchDraft } from "@/components/admin/AdminPackageTripDatesSection";

export type AdminPackagePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, show link to public /trip/[slug] (saved package). */
  packageIsPublished: boolean;
  name: string;
  slug: string;
  description: string;
  durationNights: string;
  durationDays: string;
  pickupLocation: string;
  dropLocation: string;
  pickupMapUrl: string;
  dropMapUrl: string;
  startingPrice: string;
  originalPrice: string;
  discountLabel: string;
  minAdults: string;
  maxAdults: string;
  maxChildren: string;
  defaultAdults: string;
  coverImageUrls: string[];
  tripBatches: TripBatchDraft[];
  /** Optional — same shapes as buildPackagePreviewTrip extras */
  itineraryDrafts?: PreviewItineraryInput[];
  inclusionDrafts?: PreviewInclusionInput[];
  otherInfoDrafts?: PreviewOtherInfoInput[];
  customTabDrafts?: PreviewCustomTabInput[];
};

export function AdminPackagePreviewDialog({
  open,
  onOpenChange,
  packageIsPublished,
  name,
  slug,
  description,
  durationNights,
  durationDays,
  pickupLocation,
  dropLocation,
  pickupMapUrl,
  dropMapUrl,
  startingPrice,
  originalPrice,
  discountLabel,
  minAdults,
  maxAdults,
  maxChildren,
  defaultAdults,
  coverImageUrls,
  tripBatches,
  itineraryDrafts = [],
  inclusionDrafts = [],
  otherInfoDrafts = [],
  customTabDrafts = [],
}: AdminPackagePreviewDialogProps) {
  const { toast } = useToast();

  const { trip, dates, itineraryDays, inclusions, otherInfo } = useMemo(
    () =>
      buildPackagePreviewTrip({
        name,
        slug,
        description,
        durationNights,
        durationDays,
        pickupLocation,
        dropLocation,
        pickupMapUrl,
        dropMapUrl,
        startingPrice,
        originalPrice,
        discountLabel,
        minAdults,
        maxAdults,
        maxChildren,
        defaultAdults,
        coverImageUrls,
        tripBatches,
        itineraryDays: itineraryDrafts,
        inclusions: inclusionDrafts,
        otherSections: otherInfoDrafts,
        customTabs: customTabDrafts,
      }),
    [
      name,
      slug,
      description,
      durationNights,
      durationDays,
      pickupLocation,
      dropLocation,
      pickupMapUrl,
      dropMapUrl,
      startingPrice,
      originalPrice,
      discountLabel,
      minAdults,
      maxAdults,
      maxChildren,
      defaultAdults,
      coverImageUrls,
      tripBatches,
      itineraryDrafts,
      inclusionDrafts,
      otherInfoDrafts,
      customTabDrafts,
    ]
  );

  const previewHint = () =>
    toast({
      title: "Preview mode",
      description: "Save the package to enable booking and itinerary downloads on the live site.",
    });

  const liveUrl =
    typeof window !== "undefined" ? `${window.location.origin}/trip/${trip.slug}` : `/trip/${trip.slug}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh] sm:max-w-4xl",
          "max-md:left-2 max-md:right-2 max-md:top-2 max-md:bottom-2 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-xl",
          "p-3 sm:p-4"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 pb-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Eye className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <DialogTitle className="text-lg">Preview package</DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm">
            How this package can look on the public trip page. Changes here are not saved until you click{" "}
            <strong>Save</strong> in the editor.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-200">
              Draft preview
            </span>
            {packageIsPublished ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open live page
                </a>
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-muted/20 [-webkit-overflow-scrolling:touch]">
          <div className="bg-background">
            <TripHero
              trip={trip}
              dates={dates}
              onGetItinerary={previewHint}
              onBookNow={previewHint}
            />
            <TripGallery images={trip.images} name={trip.name} />
            {trip.description ? (
              <div className="max-w-7xl mx-auto px-4 py-6 border-t border-border/60">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  About this trip
                </h2>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{trip.description}</p>
              </div>
            ) : null}
            <div className="max-w-7xl mx-auto px-4 pb-8 border-t border-border/60 pt-6">
              <TripTabs
                days={itineraryDays}
                dates={dates}
                inclusions={inclusions}
                otherInfo={otherInfo}
                customTabs={trip.customTabs}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 flex justify-end border-t border-border/60 pt-3">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
