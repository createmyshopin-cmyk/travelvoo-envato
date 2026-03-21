import { useRouter } from "next/navigation";
import { Loader2, Clock, MapPin } from "lucide-react";
import { useTrips } from "@/hooks/useTrips";
import { useCurrency } from "@/context/CurrencyContext";
import { tripHasAnyLocation, tripLocationSummary } from "@/lib/tripLocations";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";

const TripsListing = () => {
  const router = useRouter();
  const { trips, loading } = useTrips();
  const { format: fmt } = useCurrency();

  return (
    <div className="min-h-screen bg-background">
      <StickyHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Trips & Packages
        </h1>
        <p className="text-muted-foreground mb-8">
          Discover curated travel experiences and group adventures.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">
              No trips available at the moment. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const savings = trip.originalPrice - trip.startingPrice;
              return (
                <div
                  key={trip.id}
                  onClick={() => router.push(`/trip/${trip.slug}`)}
                  className="group cursor-pointer rounded-2xl border bg-background overflow-hidden hover:shadow-elevated transition-shadow"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={trip.images[0]}
                      alt={trip.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {savings > 0 && trip.discountLabel && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                        {trip.discountLabel}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {trip.name}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {trip.durationNights}N / {trip.durationDays}D
                      </span>
                      {tripHasAnyLocation(trip) && (
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{tripLocationSummary(trip) || "Map"}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-foreground">
                        {fmt(trip.startingPrice)}
                      </span>
                      <span className="text-xs text-muted-foreground">per adult</span>
                      {trip.originalPrice > trip.startingPrice && (
                        <span className="text-xs line-through text-muted-foreground">
                          {fmt(trip.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default TripsListing;
