import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

interface Slide {
  id: string | number;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
}

const FALLBACK_SLIDES: Slide[] = [
  { id: 1, image: hero1, title: "Mountain Getaway",  subtitle: "Explore misty peaks & infinity pools", cta: "Explore Now", link: "/" },
  { id: 2, image: hero2, title: "Romantic Escapes",  subtitle: "Candlelit dinners in the forest",      cta: "View Stays",  link: "/" },
  { id: 3, image: hero3, title: "Family Vacations",  subtitle: "Fun-filled resort experiences",        cta: "Book Now",    link: "/" },
];

const HeroBanner = () => {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);

  const fetchSlides = useCallback(async () => {
    const { data } = await (supabase.from("banners") as any)
      .select("id, title, subtitle, cta_text, cta_link, image_url")
      .eq("type", "hero")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      setSlides(
        data.map((b: any) => ({
          id:       b.id,
          image:    b.image_url || hero1,
          title:    b.title,
          subtitle: b.subtitle  || "",
          cta:      b.cta_text  || "Explore Now",
          link:     b.cta_link  || "/",
        }))
      );
      setCurrent(0);
    } else {
      setSlides(FALLBACK_SLIDES);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length]
  );

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  const [touchStart, setTouchStart] = useState(0);
  const handleTouchEnd = (endX: number) => {
    const diff = touchStart - endX;
    if (Math.abs(diff) > 50) {
      setCurrent((c) =>
        diff > 0 ? (c + 1) % slides.length : (c - 1 + slides.length) % slides.length
      );
    }
  };

  const slide = slides[current];

  return (
    /* Mobile: px-4 inset rounded card. Desktop: full-bleed edge-to-edge. */
    <div className="px-4 md:px-0">
      <div
        className="relative h-[220px] md:h-[400px] lg:h-[480px] rounded-2xl md:rounded-none overflow-hidden shadow-card md:shadow-none"
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientX)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <img src={slide.image} alt={slide.title} fetchPriority="high" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 md:p-10 lg:p-14 flex flex-col gap-2 md:gap-3">
              <h2 className="text-xl md:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight">
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p className="text-sm md:text-lg text-primary-foreground/80">{slide.subtitle}</p>
              )}
              {slide.cta && (
                <a
                  href={slide.link || "/"}
                  className="flex items-center gap-1 mt-1 px-4 py-2 md:px-6 md:py-3 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-semibold w-fit shadow-soft active:scale-95 transition-transform"
                >
                  {slide.cta}
                  <ChevronRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="absolute bottom-3 md:bottom-6 right-4 md:right-10 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "bg-primary-foreground w-5" : "bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
