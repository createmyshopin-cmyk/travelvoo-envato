import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Stay } from "@/types/stay";
import { stayPublicPath } from "@/lib/stayPublicUrl";
import { useWishlist } from "@/context/WishlistContext";
import { useCurrency } from "@/context/CurrencyContext";
import { withSupabaseImageTransform } from "@/lib/supabaseImage";

const badgeColorMap: Record<string, string> = {
  orange: "bg-[hsl(var(--badge-orange))]",
  purple: "bg-[hsl(var(--badge-purple))]",
  pink: "bg-[hsl(var(--badge-pink))]",
  red: "bg-[hsl(var(--badge-red))]",
};

interface StayCardProps {
  stay: Stay;
  index: number;
}

const StayCard = ({ stay, index }: StayCardProps) => {
  const router = useRouter();
  const { format } = useCurrency();
  const { isWishlisted, toggleWishlist: toggle } = useWishlist();
  const [currentImage, setCurrentImage] = useState(0);
  const [prevImageSrc, setPrevImageSrc] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [shouldLoadCard, setShouldLoadCard] = useState(index < 2);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const wishlisted = isWishlisted(stay.id);

  const savings = stay.originalPrice - stay.price;
  const hasDiscount = savings > 0;
  const nextImageIndex = (currentImage + 1) % Math.max(stay.images.length, 1);
  const currentSrc = useMemo(
    () => withSupabaseImageTransform(stay.images[currentImage] || "", { width: 720, quality: 62, format: "webp" }),
    [stay.images, currentImage]
  );
  const nextSrc = useMemo(
    () => withSupabaseImageTransform(stay.images[nextImageIndex] || "", { width: 720, quality: 62, format: "webp" }),
    [stay.images, nextImageIndex]
  );

  useEffect(() => {
    if (shouldLoadCard) return;
    const el = cardRef.current;
    if (!el) return;

    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      setShouldLoadCard(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadCard(true);
          observer.disconnect();
        }
      },
      { rootMargin: "220px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoadCard]);

  useEffect(() => {
    if (!shouldLoadCard || stay.images.length <= 1) return;
    const delay = 5000 + index * 700;
    const interval = setInterval(() => {
      setCurrentImage((prev) => {
        setPrevImageSrc(
          withSupabaseImageTransform(stay.images[prev] || "", { width: 720, quality: 62, format: "webp" })
        );
        return (prev + 1) % stay.images.length;
      });
    }, delay);
    return () => clearInterval(interval);
  }, [stay.images, index, shouldLoadCard]);

  const nextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => {
      setPrevImageSrc(
        withSupabaseImageTransform(stay.images[prev] || "", { width: 720, quality: 62, format: "webp" })
      );
      return (prev + 1) % stay.images.length;
    });
  }, [stay.images]);

  const prevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => {
      setPrevImageSrc(
        withSupabaseImageTransform(stay.images[prev] || "", { width: 720, quality: 62, format: "webp" })
      );
      return (prev - 1 + stay.images.length) % stay.images.length;
    });
  }, [stay.images]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStartRef.current;
    if (!start) return;
    const endTouch = e.changedTouches[0];
    const deltaX = start.x - endTouch.clientX;
    const deltaY = Math.abs(start.y - endTouch.clientY);

    // Only treat as image swipe when horizontal intent is clear.
    if (Math.abs(deltaX) > 52 && Math.abs(deltaX) > deltaY * 1.15) {
      if (deltaX > 0) {
        setCurrentImage((prev) => {
          setPrevImageSrc(withSupabaseImageTransform(stay.images[prev] || "", { width: 720, quality: 62, format: "webp" }));
          return (prev + 1) % stay.images.length;
        });
      } else {
        setCurrentImage((prev) => {
          setPrevImageSrc(withSupabaseImageTransform(stay.images[prev] || "", { width: 720, quality: 62, format: "webp" }));
          return (prev - 1 + stay.images.length) % stay.images.length;
        });
      }
    }
    swipeStartRef.current = null;
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(stay.id);
  };

  // Derive category badge
  const categoryBadge = stay.category ? { text: stay.category, color: "purple" as const } : null;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group shrink-0 w-[220px] md:w-[300px] lg:w-[230px] xl:w-[256px] rounded-2xl overflow-hidden bg-card shadow-card transition-shadow hover:shadow-elevated snap-start"
    >
      {/* Image Slider */}
      <div
        className="relative h-[160px] md:h-[180px] lg:h-[200px] overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {shouldLoadCard ? (
          <>
            {/* Previous image stays visible underneath during cross-fade — no white flash */}
            {prevImageSrc && (
              <img
                src={prevImageSrc}
                alt=""
                aria-hidden="true"
                decoding="async"
                className="w-full h-full object-cover absolute inset-0"
                style={{ zIndex: 0 }}
              />
            )}
            <motion.img
              key={stay.images[currentImage] || `${stay.id}-current`}
              src={currentSrc}
              alt={stay.name}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              sizes="(min-width: 1280px) 256px, (min-width: 1024px) 230px, (min-width: 768px) 300px, 220px"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              onAnimationComplete={() => setPrevImageSrc(null)}
              className="w-full h-full object-cover absolute inset-0"
              style={{ zIndex: 1 }}
            />
            {stay.images.length > 1 && (
              <img
                src={nextSrc}
                alt=""
                loading="lazy"
                decoding="async"
                className="hidden"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}

        {/* Nav arrows */}
        {stay.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card/70 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-card-foreground" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card/70 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="w-3.5 h-3.5 text-card-foreground" />
            </button>
          </>
        )}

        {/* Pagination dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {stay.images.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentImage ? "bg-primary-foreground w-3" : "bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* Category badge - top left */}
        {categoryBadge && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className={`${badgeColorMap[categoryBadge.color]} text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full`}>
              {categoryBadge.text}
            </span>
          </div>
        )}

        {/* Wishlist - top right */}
        <motion.button
          onClick={toggleWishlist}
          whileTap={{ scale: 1.3 }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/60 flex items-center justify-center"
          aria-label="Toggle wishlist"
        >
          <motion.div
            animate={wishlisted ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                wishlisted ? "fill-primary text-primary" : "text-primary-foreground"
              }`}
            />
          </motion.div>
        </motion.button>
      </div>

      {/* Card Body */}
      <div className="p-3">
        <p className="text-sm font-bold text-card-foreground truncate">{stay.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 fill-star-rating text-star-rating" />
          <span className="text-[10px] font-bold text-card-foreground">
            {stay.rating} <span className="font-normal text-muted-foreground">({stay.reviews})</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{stay.location}</p>

        {/* Price section + View Details */}
        <div className="flex items-end justify-between mt-2">
          <div>
            {hasDiscount && (
              <p className="text-xs text-muted-foreground line-through">{format(stay.originalPrice)}</p>
            )}
            <p className="text-sm font-bold text-primary">From {format(stay.price)}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(stayPublicPath(stay));
            }}
            className="bg-primary text-primary-foreground text-xs font-bold px-5 py-2 rounded-md min-h-[36px] active:scale-95 transition-transform"
          >
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default StayCard;
