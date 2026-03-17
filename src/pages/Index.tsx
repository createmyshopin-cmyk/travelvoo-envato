import { useState } from "react";
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
import PromoPopup from "@/components/PromoPopup";
import MenuPopup from "@/components/MenuPopup";

const sections = [
  { title: "Couple Friendly Stays", category: "Couple Friendly" },
  { title: "Family Stay Picks",     category: "Family Stay" },
  { title: "Luxury Resorts",        category: "Luxury Resort" },
  { title: "Budget Rooms",          category: "Budget Rooms" },
  { title: "Pool Villas",           category: "Pool Villas" },
  { title: "Tree Houses",           category: "Tree Houses" },
];

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("Couple Friendly");

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
        <LazySection rootMargin="300px">
          <ResortStories />
        </LazySection>
        <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
        <StayCarousel title={selectedCategory + " Stays"} category={selectedCategory} />
        {sections
          .filter((s) => s.category !== selectedCategory)
          .map((s) => (
            <LazySection key={s.category} rootMargin="400px">
              <StayCarousel title={s.title} category={s.category} />
            </LazySection>
          ))}
        <LazySection rootMargin="300px">
          <PromoBanners />
        </LazySection>
        <LazySection rootMargin="250px">
          <BestFeatures />
        </LazySection>
        <LazySection rootMargin="200px">
          <EnquiryForm />
        </LazySection>
        <LazySection rootMargin="100px">
          <Footer />
        </LazySection>
      </div>

      <StickyBottomNav />
      <MenuPopup />
      <PromoPopup />
    </div>
  );
};

export default Index;
