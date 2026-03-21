import { useCallback, useEffect, useState } from "react";
import { Star, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Stay } from "@/types/stay";
import { useWishlist } from "@/context/WishlistContext";
import { useCurrency } from "@/context/CurrencyContext";

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
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const wishlisted = isWishlisted(stay.id);

  const savings = stay.originalPrice - stay.price;
  const hasDiscount = savings > 0;

  useEffect(() => {
    if (stay.images.length <= 1) return;
    const delay = 5000 + index * 700;
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % stay.images.length);
    }, delay);
    return () => clearInterval(interval);
  }, [stay.images.length, index]);

  const nextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1) % stay.images.length);
  }, [stay.images.length]);

  const prevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 + stay.images.length) % stay.images.length);
  }, [stay.images.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX === null) return;
    const diff = swipeStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setCurrentImage((prev) => (prev + 1) % stay.images.length);
      } else {
        setCurrentImage((prev) => (prev - 1 + stay.images.length) % stay.images.length);
      }
    }
    setSwipeStartX(null);
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(stay.id);
  };

  // Derive category badge
  const categoryBadge = stay.category ? { text: stay.category, color: "purple" as const } : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="shrink-0 w-[220px] md:w-[300px] lg:w-[230px] xl:w-[256px] rounded-2xl overflow-hidden bg-card shadow-card transition-shadow hover:shadow-elevated snap-start"
    >
      {/* Image Slider */}
      <div
        className="relative h-[160px] md:h-[180px] lg:h-[200px] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {stay.images.map((img, i) => (
          <motion.img
            key={i}
            src={img}
            alt={stay.name}
            loading={i === 0 ? "eager" : "lazy"}
            animate={{
              x: `${(i - currentImage) * 100}%`,
            }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full h-full object-cover absolute inset-0"
          />
        ))}

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

        {/* Price section + Book button */}
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
              router.push(`/stay/${stay.id}`);
            }}
            className="bg-primary text-primary-foreground text-xs font-bold px-5 py-2 rounded-md min-h-[36px] active:scale-95 transition-transform"
          >
            Book
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default StayCard;
