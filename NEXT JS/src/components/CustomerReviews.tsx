import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import type { Review } from "@/types/stay";

interface Props {
  reviews: Review[];
}

const CustomerReviews = ({ reviews }: Props) => {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>();

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement;
    if (card) {
      el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
    }
  }, []);

  // Auto-slide
  useEffect(() => {
    if (reviews.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % reviews.length;
        scrollToIndex(next);
        return next;
      });
    }, 4000);
    return () => clearInterval(autoPlayRef.current);
  }, [reviews.length, scrollToIndex]);

  // Sync active index on manual scroll
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = (el.children[0] as HTMLElement)?.offsetWidth || 1;
    const idx = Math.round(scrollLeft / (cardWidth + 12));
    setActiveIndex(Math.min(idx, reviews.length - 1));
    // Reset auto-play on manual interaction
    clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % reviews.length;
        scrollToIndex(next);
        return next;
      });
    }, 4000);
  };

  if (!reviews?.length) return null;

  return (
    <div className="mt-6">
      <h2 className="text-base font-bold text-foreground mb-3 px-4">Customer Reviews</h2>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {reviews.map((review, i) => (
          <motion.div
            key={review.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="min-w-[80%] max-w-[80%] snap-start shrink-0 bg-card rounded-2xl p-3 shadow-card border border-border"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              {review.avatar && (review.avatar.startsWith("http") || review.avatar.startsWith("/")) ? (
                <img src={review.avatar} alt={review.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {review.avatar}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground">{review.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-star-rating fill-star-rating" />
                  <span className="text-[11px] font-semibold text-foreground">{review.rating}</span>
                </div>
              </div>
            </div>

            {/* Text */}
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed line-clamp-3">{review.text}</p>

            {/* Photos */}
            {review.photos?.length > 0 && (
              <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
                {review.photos.map((photo, pi) => (
                  <button
                    key={pi}
                    onClick={() => setExpandedPhoto(photo)}
                    className="shrink-0 w-14 h-14 rounded-lg overflow-hidden"
                  >
                    <img src={photo} alt="Review photo" loading="lazy" className="w-full h-full object-cover hover:scale-110 transition-transform duration-200" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Dots */}
      {reviews.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); scrollToIndex(i); }}
              className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      )}

      {/* Expanded photo modal */}
      <AnimatePresence>
        {expandedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center p-4"
            onClick={() => setExpandedPhoto(null)}
          >
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/20 flex items-center justify-center">
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={expandedPhoto}
              alt="Expanded review photo"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerReviews;