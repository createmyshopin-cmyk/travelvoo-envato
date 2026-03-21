import { Clock, MapPin, CalendarDays, Download, Ticket, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Trip, TripDate } from "@/types/trip";
import { useCurrency } from "@/context/CurrencyContext";
import { tripHasAnyLocation } from "@/lib/tripLocations";

interface TripHeroProps {
  trip: Trip;
  dates: TripDate[];
  onGetItinerary: () => void;
  onBookNow: () => void;
}

export default function TripHero({ trip, dates, onGetItinerary, onBookNow }: TripHeroProps) {
  const { format: fmt } = useCurrency();

  const dateChips = dates
    .filter((d) => d.status === "available" || d.status === "few_left")
    .slice(0, 6)
    .map((d) => format(parseISO(d.startDate), "dd MMM"));

  const savings = trip.originalPrice - trip.startingPrice;

  return (
    <section className="w-full bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-4 flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
              {trip.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <div>
                  <span className="text-xs uppercase tracking-wide block">Duration</span>
                  <span className="font-semibold text-foreground">
                    {trip.durationNights} Night{trip.durationNights !== 1 ? "s" : ""} &{" "}
                    {trip.durationDays} Day{trip.durationDays !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {tripHasAnyLocation(trip) && (
                <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
                  {(trip.pickupLocation.trim() || trip.pickupMapUrl) && (
                    <div className="flex items-start gap-2 min-w-0 max-w-[min(100%,280px)]">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-xs uppercase tracking-wide block">Pickup</span>
                        <div className="font-semibold text-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                          {trip.pickupLocation.trim() ? (
                            <span className="break-words">{trip.pickupLocation.trim()}</span>
                          ) : null}
                          {trip.pickupMapUrl ? (
                            <a
                              href={trip.pickupMapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Map
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                  {(trip.dropLocation.trim() || trip.dropMapUrl) && (
                    <div className="flex items-start gap-2 min-w-0 max-w-[min(100%,280px)]">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-xs uppercase tracking-wide block">Drop</span>
                        <div className="font-semibold text-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                          {trip.dropLocation.trim() ? (
                            <span className="break-words">{trip.dropLocation.trim()}</span>
                          ) : null}
                          {trip.dropMapUrl ? (
                            <a
                              href={trip.dropMapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Map
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {dateChips.length > 0 && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <div>
                    <span className="text-xs uppercase tracking-wide block">Dates</span>
                    <span className="font-semibold text-foreground">
                      {dateChips.join(", ")}
                      {dates.length > 6 ? "..." : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Starting from</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-foreground">
                  {fmt(trip.startingPrice)}
                </span>
                <span className="text-sm text-muted-foreground">per adult</span>
                {trip.originalPrice > trip.startingPrice && (
                  <span className="text-sm line-through text-muted-foreground">
                    {fmt(trip.originalPrice)}
                  </span>
                )}
              </div>
              {savings > 0 && trip.discountLabel && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                  {trip.discountLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onGetItinerary}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors"
              >
                <Download className="w-4 h-4" />
                Get Itinerary
              </button>
              <button
                onClick={onBookNow}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Ticket className="w-4 h-4" />
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
