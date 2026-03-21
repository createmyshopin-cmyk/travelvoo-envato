import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTripDetail } from "@/hooks/useTrips";
import TripHero from "@/components/trip/TripHero";
import TripGallery from "@/components/trip/TripGallery";
import TripTabs from "@/components/trip/TripTabs";
import TripSidebar from "@/components/trip/TripSidebar";
import TripVideos from "@/components/trip/TripVideos";
import TripReviews from "@/components/trip/TripReviews";
import TripCancellationPolicy from "@/components/trip/TripCancellationPolicy";
import TripCTA from "@/components/trip/TripCTA";
import TripEnquiryModal from "@/components/trip/TripEnquiryModal";
import TripBookingModal from "@/components/trip/TripBookingModal";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";

const TripDetails = () => {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { trip, itineraryDays, dates, inclusions, otherInfo, videos, reviews, loading } =
    useTripDetail(slug);

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StickyHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <StickyHeader />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Trip not found</h1>
          <p className="text-muted-foreground mb-6">
            The trip you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/trips")}
            className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Browse Trips
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const scrollToSidebar = () => {
    const el = document.getElementById("trip-sidebar");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyHeader />

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <TripHero
        trip={trip}
        dates={dates}
        onGetItinerary={() => setEnquiryOpen(true)}
        onBookNow={() => setBookingOpen(true)}
      />

      <TripGallery images={trip.images} name={trip.name} />

      {/* Two-column layout: content + sticky sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Content column */}
          <div className="flex-1 min-w-0">
            <TripTabs
              days={itineraryDays}
              dates={dates}
              inclusions={inclusions}
              otherInfo={otherInfo}
            />
          </div>

          {/* Sidebar column */}
          <div className="w-full lg:w-[380px] shrink-0" id="trip-sidebar">
            <TripSidebar trip={trip} />
          </div>
        </div>
      </div>

      <TripVideos videos={videos} />

      <TripReviews reviews={reviews} />

      <TripCancellationPolicy policy={trip.cancellationPolicy} />

      <TripCTA
        heading={trip.ctaHeading}
        subheading={trip.ctaSubheading}
        imageUrl={trip.ctaImageUrl}
        onCallback={scrollToSidebar}
      />

      <TripBookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        trip={trip}
        dates={dates}
      />

      <TripEnquiryModal
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        tripName={trip.name}
      />

      <Footer />
    </div>
  );
};

export default TripDetails;
