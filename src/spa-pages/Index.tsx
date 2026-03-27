import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/seo/JsonLd";
import StickyHeader from "@/components/StickyHeader";
import SearchBar from "@/components/SearchBar";
import HeroBanner from "@/components/HeroBanner";
import ResortStories from "@/components/ResortStories";
import CategoryTabs from "@/components/CategoryTabs";
import StayCarousel from "@/components/StayCarousel";
import PromoBanners from "@/components/PromoBanners";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import EnquiryForm from "@/components/EnquiryForm";
import Footer from "@/components/Footer";
import StickyBottomNav from "@/components/StickyBottomNav";
import LazySection from "@/components/LazySection";
import CouponBanner from "@/components/CouponBanner";
import BestFeatures from "@/components/BestFeatures";
const PromoPopup = dynamic(() => import("@/components/PromoPopup"), { ssr: false });
const MenuPopup = dynamic(() => import("@/components/MenuPopup"), { ssr: false });

const sections = [
  { title: "Couple Friendly Stays", category: "Couple Friendly" },
  { title: "Family Stay Picks",     category: "Family Stay" },
  { title: "Luxury Resorts",        category: "Luxury Resort" },
  { title: "Budget Rooms",          category: "Budget Rooms" },
  { title: "Pool Villas",           category: "Pool Villas" },
  { title: "Tree Houses",           category: "Tree Houses" },
];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("All Stays");
  const [deferredUiReady, setDeferredUiReady] = useState(false);

  useEffect(() => {
    const run = () => setDeferredUiReady(true);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = (window as any).requestIdleCallback(run, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback?.(idleId);
    }
    const timer = window.setTimeout(run, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: typeof window !== "undefined" ? window.location.origin : "/" }],
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={breadcrumbSchema} />
      <StickyHeader />

      {/* Single centered container — everything stays in the same column */}
      <div className="max-w-lg mx-auto md:max-w-5xl lg:max-w-7xl xl:max-w-[1400px] pb-[80px] md:pb-16">
        <AnnouncementBanner />
        <CouponBanner />
        <HeroBanner />
        <SearchBar
          onPopularClick={(term) => {
            if (term === "Luxury Resorts") {
              setSelectedCategory("Luxury Resort");
            }
          }}
        />
        <LazySection rootMargin="180px">
          <ResortStories />
        </LazySection>
        <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
        <StayCarousel
          title={selectedCategory === "All Stays" ? "All Stays" : `${selectedCategory} Stays`}
          category={selectedCategory === "All Stays" ? undefined : selectedCategory}
        />
        {sections
          .filter((s) => s.category !== selectedCategory)
          .map((s) => (
            <LazySection key={s.category} rootMargin="220px">
              <StayCarousel title={s.title} category={s.category} />
            </LazySection>
          ))}
        <LazySection rootMargin="220px">
          <PromoBanners />
        </LazySection>
        <LazySection rootMargin="180px">
          <BestFeatures />
        </LazySection>
        <LazySection rootMargin="160px">
          <EnquiryForm />
        </LazySection>
        <LazySection rootMargin="120px">
          <Footer />
        </LazySection>
      </div>

      <StickyBottomNav />
      {deferredUiReady ? (
        <>
          <MenuPopup />
          <PromoPopup />
        </>
      ) : null}
    </div>
  );
};

export default Index;
