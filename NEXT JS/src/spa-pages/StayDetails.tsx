import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useMemo, useEffect } from "react";
import { startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, MapPin, ChevronLeft, ChevronRight, Wifi, Waves, UtensilsCrossed, Car, TreePine, Flame, Coffee, Dumbbell, Heart, Share2, Sparkles, Tag, PartyPopper, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import NearbyDestinations from "@/components/NearbyDestinations";
import ResortReels from "@/components/ResortReels";
import RoomCategories from "@/components/RoomCategories";
import type { RoomSelection } from "@/components/RoomCategories";
import CustomerReviews from "@/components/CustomerReviews";
import { useWishlist } from "@/context/WishlistContext";
import StayCard from "@/components/StayCard";
import BookingFormModal from "@/components/BookingFormModal";
import ConfettiCelebration from "@/components/ConfettiCelebration";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useStayDetail, useStays } from "@/hooks/useStays";
import { useCalendarPricing } from "@/hooks/useCalendarPricing";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { getOgImageUrl } from "@/lib/ogImage";
import { useBranding } from "@/context/BrandingContext";
import { JsonLd } from "@/components/seo/JsonLd";

const amenityIcons: Record<string, React.ElementType> = {
  "Free Wi-Fi": Wifi, "Wi-Fi": Wifi, "Swimming Pool": Waves, "Pool": Waves, "Shared Pool": Waves,
  "Infinity Pool": Waves, "Restaurant": UtensilsCrossed, "Fine Dining": UtensilsCrossed,
  "Parking": Car, "Free Parking": Car, "Nature Trail": TreePine, "Garden": TreePine,
  "Campfire": Flame, "Bonfire": Flame, "Free Breakfast": Coffee, "Gym": Dumbbell,
};

interface CouponTier {
  code: string;
  minValue: number;
  discount: number;
}

const StayDetails = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [currentImage, setCurrentImage] = useState(0);
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [bookingOpen, setBookingOpen] = useState(false);
  
  const [showCouponBanner, setShowCouponBanner] = useState(false);
  const [bannerCoupon, setBannerCoupon] = useState<CouponTier | null>(null);
  const prevUnlockedCount = useRef(0);
  const [dbCoupons, setDbCoupons] = useState<CouponTier[]>([]);

  useEffect(() => {
    if (!id) return;
    (supabase.from("coupons") as any)
      .select("code, type, value, min_purchase, active, expires_at, starts_at, usage_limit, usage_count")
      .eq("active", true)
      .order("min_purchase", { ascending: true })
      .then(({ data }: { data: any[] | null }) => {
        if (!data) return;
        const now = new Date();
        const tiers: CouponTier[] = data
          .filter((c: any) => {
            if (c.expires_at && new Date(c.expires_at) < now) return false;
            if (c.starts_at && new Date(c.starts_at) > now) return false;
            if (c.usage_limit && c.usage_count >= c.usage_limit) return false;
            return true;
          })
          .filter((c: any) => c.min_purchase > 0)
          .map((c: any) => ({
            code: c.code,
            minValue: c.min_purchase,
            discount: c.value,
          }));
        setDbCoupons(tiers);
      });
  }, [id]);

  const { siteName } = useBranding();

  // Fetch stay data from database
  const { stay, roomCategories, reviews, reels, nearbyDestinations, loading } = useStayDetail(id);
  const liked = stay ? isWishlisted(stay.id) : false;

  // Real-time calendar pricing — admin changes reflect instantly via Supabase Realtime
  const allRoomCategoryIds = useMemo(() => roomCategories.map((r) => r.id), [roomCategories]);
  const { getPriceForDate: getDbPrice, getOriginalPriceForDate: getDbOriginalPrice } = useCalendarPricing(stay?.id ?? "", allRoomCategoryIds);
  const today = useMemo(() => startOfDay(new Date()), []);
  const roomsWithCalendarPrices = useMemo(
    () =>
      roomCategories.map((r) => ({
        ...r,
        price: getDbPrice(today, r.id) ?? getDbPrice(today) ?? r.price,
        originalPrice: getDbOriginalPrice(today, r.id) ?? getDbOriginalPrice(today) ?? r.originalPrice,
      })),
    [roomCategories, getDbPrice, getDbOriginalPrice, today]
  );

  const seoTitle = stay?.seoTitle || (stay ? `${stay.name} | ${siteName}` : "");
  const seoDescription = stay?.seoDescription || (stay?.description?.slice(0, 155) ?? "");
  const rawOgImage = stay?.ogImageUrl || stay?.images?.[0];
  const ogImage = getOgImageUrl(rawOgImage, typeof window !== "undefined" ? window.location.origin : undefined);

  useDocumentHead(
    stay
      ? {
          title: seoTitle,
          description: seoDescription,
          keywords: stay.seoKeywords ?? undefined,
          ogTitle: seoTitle,
          ogDescription: seoDescription,
          ogImage,
          ogType: "place",
          canonicalUrl: typeof window !== "undefined" ? `${window.location.origin}/stay/${stay.id}` : undefined,
        }
      : {}
  );

  const lodgingSchema = stay
    ? {
        "@context": "https://schema.org",
        "@type": "Resort",
        name: stay.name,
        description: stay.description?.slice(0, 500) ?? stay.name,
        image: stay.images?.length ? stay.images : [stay.image],
        address: stay.location ? { "@type": "PostalAddress", addressLocality: stay.location } : undefined,
        ...(stay.rating > 0 &&
          stay.reviews > 0 && {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: String(stay.rating),
              reviewCount: String(stay.reviews),
            },
          }),
        ...(stay.amenities?.length && {
          amenityFeature: stay.amenities.map((a: string) => ({
            "@type": "LocationFeatureSpecification",
            name: a,
          })),
        }),
        ...(stay.price > 0 && { priceRange: `₹${stay.price}` }),
        url: typeof window !== "undefined" ? `${window.location.origin}/stay/${stay.id}` : undefined,
      }
    : null;

  const breadcrumbSchema = stay
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: typeof window !== "undefined" ? window.location.origin : "/" },
          { "@type": "ListItem", position: 2, name: stay.name, item: typeof window !== "undefined" ? `${window.location.origin}/stay/${stay.id}` : undefined },
        ],
      }
    : null;

  // Fetch recommended stays
  const { stays: allDbStays } = useStays();

  // Auto-slide timer
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const startAutoSlide = (total: number) => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    if (total <= 1) return;
    autoSlideRef.current = setInterval(() => {
      setCurrentImage((c) => (c + 1) % total);
    }, 3500);
  };

  useEffect(() => {
    if (!stay) return;
    startAutoSlide(stay.images.length);
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stay?.images.length]);

  // Scroll thumbnail strip to keep active thumb visible
  useEffect(() => {
    const strip = thumbsRef.current;
    if (!strip) return;
    const thumb = strip.children[currentImage] as HTMLElement;
    if (thumb) thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentImage]);

  const goTo = (index: number, total: number) => {
    setCurrentImage(index);
    startAutoSlide(total);
  };

  // Touch swipe
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent, total: number) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? (currentImage + 1) % total : (currentImage - 1 + total) % total, total);
    }
  };

  const buildSelections = (categories: typeof roomCategories) =>
    (categories || []).map((r, i) => ({
      name: r.name,
      price: r.price,
      originalPrice: r.originalPrice,
      count: i === 0 ? 1 : 0,
      selected: i === 0,
    }));

  const [roomSelections, setRoomSelections] = useState<RoomSelection[]>([]);

  useEffect(() => {
    if (roomsWithCalendarPrices.length === 0) return;
    setRoomSelections((prev) => {
      if (prev.length === 0) return buildSelections(roomsWithCalendarPrices);
      return prev.map((s, i) => {
        const room = roomsWithCalendarPrices.find((r) => r.name === s.name) ?? roomsWithCalendarPrices[i];
        return room ? { ...s, price: room.price, originalPrice: room.originalPrice } : s;
      });
    });
  }, [roomsWithCalendarPrices]);

  // Dynamic pricing
  const roomTotal = useMemo(() =>
    roomSelections.reduce((sum, s) => sum + (s.selected ? s.price * s.count : 0), 0),
    [roomSelections]
  );
  const compareTotal = useMemo(() =>
    roomSelections.reduce((sum, s) => sum + (s.selected ? s.originalPrice * s.count : 0), 0),
    [roomSelections]
  );
  const totalSavings = compareTotal - roomTotal;
  const hasRoomSelected = roomSelections.some((r) => r.selected && r.count > 0);

  // Multi-tier coupon logic from database
  const unlockedCoupons = useMemo(() => dbCoupons.filter(c => roomTotal >= c.minValue), [roomTotal, dbCoupons]);
  const bestCoupon = unlockedCoupons.length > 0 ? unlockedCoupons[unlockedCoupons.length - 1] : null;
const couponDiscount = bestCoupon ? bestCoupon.discount : 0;
  const finalTotal = roomTotal - couponDiscount;

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (unlockedCoupons.length > prevUnlockedCount.current && unlockedCoupons.length > 0) {
      const newlyUnlocked = unlockedCoupons[unlockedCoupons.length - 1];
      setBannerCoupon(newlyUnlocked);
      setShowCouponBanner(true);
      setShowConfetti(true);
      if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
      setTimeout(() => setShowCouponBanner(false), 3000);
      setTimeout(() => setShowConfetti(false), 100);
    }
    prevUnlockedCount.current = unlockedCoupons.length;
  }, [unlockedCoupons]);

  const handleBookNow = () => {
    if (!hasRoomSelected) {
      toast.error("Please select at least one room.");
      return;
    }
    setBookingOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">Stay not found</p>
          <button onClick={() => router.push("/")} className="mt-4 text-primary font-semibold">Go Home</button>
        </div>
      </div>
    );
  }

  const nextImg = () => goTo((currentImage + 1) % stay.images.length, stay.images.length);
  const prevImg = () => goTo((currentImage - 1 + stay.images.length) % stay.images.length, stay.images.length);

  // Recommended stays from DB
  const recommended = allDbStays.filter((s) => s.id !== stay.id && s.category === stay.category).slice(0, 6);
  const others = recommended.length < 3 ? allDbStays.filter((s) => s.id !== stay.id && !recommended.find((r) => r.id === s.id)).slice(0, 6 - recommended.length) : [];
  const recommendedItems = [...recommended, ...others];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-36">
      {lodgingSchema && <JsonLd data={lodgingSchema} />}
      {breadcrumbSchema && <JsonLd data={breadcrumbSchema} />}
      <ConfettiCelebration active={showConfetti} />
      {/* Coupon unlock banner */}
      <AnimatePresence>
        {showCouponBanner && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-0 left-0 right-0 z-[60] flex justify-center"
          >
            <div className="max-w-lg w-full bg-savings text-primary-foreground px-4 py-3 flex items-center justify-center gap-2 shadow-lg">
              <PartyPopper className="w-5 h-5" />
              <span className="font-bold text-sm">🎉 Coupon Applied! {bannerCoupon?.code} — ₹{bannerCoupon?.discount} OFF</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Gallery */}
      <div>
        {/* Main image */}
        <div
          className="relative h-[320px] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, stay.images.length)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImage}
              src={stay.images[currentImage]}
              alt={stay.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-foreground/50 to-transparent pointer-events-none" />

          {/* Top bar: back + actions */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 z-10">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-soft min-h-[48px] min-w-[48px]">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex gap-2">
              <button onClick={() => toggleWishlist(stay.id)} className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-soft min-h-[48px] min-w-[48px]">
                <Heart className={`w-5 h-5 transition-colors ${liked ? "fill-primary text-primary" : "text-foreground"}`} />
              </button>
              <button className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-soft min-h-[48px] min-w-[48px]">
                <Share2 className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>

          {/* Prev / Next arrows */}
          {stay.images.length > 1 && (
            <>
              <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </>
          )}

          {/* Counter badge */}
          <div className="absolute bottom-3 right-4 bg-foreground/60 backdrop-blur-sm text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full z-10">
            {currentImage + 1} / {stay.images.length}
          </div>
        </div>

        {/* Thumbnail strip */}
        {stay.images.length > 1 && (
          <div
            ref={thumbsRef}
            className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {stay.images.map((img, i) => (
              <button
                key={i}
                onClick={() => goTo(i, stay.images.length)}
                className={`shrink-0 w-[60px] h-[44px] rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentImage ? "border-primary scale-105" : "border-transparent opacity-60"
                }`}
              >
                <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Stay Info */}
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-foreground">{stay.name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{stay.location}, Wayanad</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Stay ID: {stay.stayId}</p>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
            <Star className="w-4 h-4 text-star-rating fill-star-rating" />
            <span className="text-sm font-bold text-foreground">{stay.rating}</span>
            <span className="text-xs text-muted-foreground">({stay.reviews})</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-block bg-secondary/15 text-secondary text-xs font-semibold px-3 py-1.5 rounded-full">{stay.category}</span>
        </div>
      </div>

      {/* 3. About */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-bold text-foreground mb-2">About this stay</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{stay.description}</p>
      </div>

      {/* 4. Resort Reels */}
      {reels.length > 0 && <ResortReels reels={reels} />}

      {/* 5. Amenities */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-bold text-foreground mb-3">Amenities</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {stay.amenities.map((amenity) => {
            const Icon = amenityIcons[amenity] || TreePine;
            return (
              <div key={amenity} className="flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5">
                <Icon className="w-4 h-4 text-secondary shrink-0" />
                <span className="text-xs font-medium text-foreground">{amenity}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Room Categories — prices from calendar_pricing (real-time) */}
      {roomsWithCalendarPrices.length > 0 && (
        <RoomCategories rooms={roomsWithCalendarPrices} selections={roomSelections} onSelectionsChange={setRoomSelections} />
      )}

      {/* Coupon tiers progress */}
      {roomCategories.length > 0 && hasRoomSelected && dbCoupons.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-muted rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5 mb-3">
              <Tag className="w-3.5 h-3.5 text-savings" />
              <span className="text-xs font-bold text-foreground">Unlock Savings</span>
            </div>
            <div className="space-y-2.5">
              {dbCoupons.map((coupon) => {
                const isUnlocked = roomTotal >= coupon.minValue;
                const progress = Math.min(100, (roomTotal / coupon.minValue) * 100);
                const isBest = bestCoupon?.code === coupon.code;
                const amountLeft = Math.max(0, coupon.minValue - roomTotal);
                return (
                  <div key={coupon.code}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {isUnlocked ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[10px]">✅</motion.span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-border bg-background flex items-center justify-center text-[8px]">🔒</span>
                        )}
                        <span className={cn("text-[11px] font-bold", isUnlocked ? "text-savings" : "text-muted-foreground")}>{coupon.code}</span>
                        {isBest && <span className="text-[9px] font-bold bg-savings/15 text-savings px-1.5 py-0.5 rounded-full">Active</span>}
                      </div>
                      <span className={cn("text-[11px] font-bold", isUnlocked ? "text-savings" : "text-foreground")}>₹{coupon.discount} OFF</span>
                    </div>
                    <Progress value={progress} className={cn("h-1.5 bg-border", isUnlocked && "[&>div]:bg-savings")} />
                    {!isUnlocked && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Add <span className="font-bold text-savings">₹{amountLeft.toLocaleString()}</span> more (min ₹{coupon.minValue.toLocaleString()})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. Customer Reviews */}
      {reviews.length > 0 && <CustomerReviews reviews={reviews} />}

      {/* Nearby Destinations */}
      {nearbyDestinations.length > 0 && <NearbyDestinations destinations={nearbyDestinations} />}

      {/* Location */}
      <div className="px-4 mt-6">
        <div className="bg-muted rounded-2xl p-4">
          <h2 className="text-base font-bold text-foreground mb-1">Location</h2>
          <p className="text-sm text-muted-foreground">{stay.location}, Wayanad, Kerala</p>
          <div className="mt-3 h-[120px] bg-accent rounded-xl flex items-center justify-center">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Recommended Properties */}
      {recommendedItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-bold text-foreground mb-3 px-4">Recommended Properties</h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {recommendedItems.map((s) => (
              <div key={s.id} className="min-w-[65%] max-w-[65%] snap-start shrink-0">
                <StayCard stay={s} index={0} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-lg mx-auto bg-background border-t border-border px-4 py-3">
          <AnimatePresence>
            {bestCoupon && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 overflow-hidden"
              >
                <div className="flex items-center gap-1.5 bg-savings/10 rounded-lg px-2.5 py-1.5">
                  <Tag className="w-3 h-3 text-savings" />
                  <span className="text-[11px] font-bold text-savings">Coupon: {bestCoupon?.code} • -₹{bestCoupon?.discount}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <div>
              {hasRoomSelected ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    {totalSavings > 0 && (
                      <span className="text-xs text-muted-foreground line-through">₹{compareTotal.toLocaleString()}</span>
                    )}
                    <motion.span
                      key={finalTotal}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={cn("text-lg font-extrabold text-primary", bestCoupon && "text-savings")}
                    >
                      ₹{finalTotal.toLocaleString()}
                    </motion.span>
                  </div>
                  {(totalSavings + couponDiscount) > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-savings" />
                      <span className="text-[11px] font-bold text-savings">
                        Save ₹{(totalSavings + couponDiscount).toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-extrabold text-primary">
                    ₹{(roomsWithCalendarPrices.length > 0
                      ? Math.min(...roomsWithCalendarPrices.map((r) => r.price))
                      : stay.price
                    ).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">/night</span>
                </div>
              )}
            </div>
            <button
              onClick={handleBookNow}
              className="bg-primary text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl shadow-soft active:scale-95 transition-transform min-h-[48px]"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>

      {roomCategories.length > 0 && (
        <BookingFormModal
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          stayName={stay.name}
          stayId={stay.id}
          roomCategories={roomCategories}
          preselectedRooms={roomSelections}
          autoAppliedCoupon={bestCoupon ? { code: bestCoupon.code, discount: bestCoupon.discount } : null}
          maxAdults={stay.maxAdults}
          maxChildren={stay.maxChildren}
          maxPets={stay.maxPets}
        />
      )}
    </div>
  );
};

export default StayDetails;
