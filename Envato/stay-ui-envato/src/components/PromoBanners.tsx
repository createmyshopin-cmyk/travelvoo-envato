import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import banner1 from "@/assets/banner-1.jpg";
import banner2 from "@/assets/banner-2.jpg";
import banner3 from "@/assets/banner-3.jpg";

interface PromoBanner {
  id: string | number;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
}

const FALLBACK_BANNERS: PromoBanner[] = [
  { id: 1, image: banner1, title: "Explore Wayanad",      subtitle: "Up to 30% Off on Premium Stays",   cta: "View Offers", link: "#stays" },
  { id: 2, image: banner2, title: "Pool Villa Escapes",   subtitle: "Starting from ₹4,999/night",       cta: "Book Now",    link: "#stays" },
  { id: 3, image: banner3, title: "Treehouse Adventures", subtitle: "Limited Availability — Book Today", cta: "Explore",     link: "#stays" },
];

const PromoBanners = () => {
  const [banners, setBanners] = useState<PromoBanner[]>(FALLBACK_BANNERS);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBanners = useCallback(async () => {
    const { data } = await (supabase.from("banners") as any)
      .select("id, title, subtitle, cta_text, cta_link, image_url")
      .eq("type", "promo")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      setBanners(
        data.map((b: any) => ({
          id:       b.id,
          image:    b.image_url || banner1,
          title:    b.title,
          subtitle: b.subtitle || "",
          cta:      b.cta_text || "View",
          link:     b.cta_link || "#stays",
        }))
      );
      setCurrent(0);
    } else {
      setBanners(FALLBACK_BANNERS);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const scrollTo = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement;
    if (child) container.scrollTo({ left: child.offsetLeft - 16, behavior: "smooth" });
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % banners.length;
        scrollTo(next);
        return next;
      });
    }, 4000);
  }, [banners.length, scrollTo]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const childWidth = (container.children[0] as HTMLElement)?.offsetWidth || 1;
    const index = Math.round(container.scrollLeft / (childWidth + 12));
    setCurrent(Math.min(index, banners.length - 1));
  };

  if (banners.length === 0) return null;

  return (
    <section className="py-4">
      <div className="flex items-center justify-between px-4 md:px-6 mb-3">
        <h3 className="text-base md:text-lg font-bold text-foreground">Special Offers</h3>
        <button className="flex items-center gap-0.5 text-sm font-semibold text-primary">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile: horizontal scroll. Desktop: 3-column grid */}
      <div
        ref={scrollRef}
        className="
          flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory touch-pan-x
          md:grid md:grid-cols-3 md:overflow-x-visible md:px-6 md:snap-none md:gap-5
        "
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={handleScroll}
        onTouchStart={startTimer}
        onTouchEnd={startTimer}
      >
        {banners.map((banner, i) => (
          <motion.a
            key={banner.id}
            href={banner.link}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="shrink-0 w-[85%] md:w-auto snap-start rounded-2xl overflow-hidden relative block group"
          >
            <div className="relative h-[160px] md:h-[200px] lg:h-[220px]">
              <img
                src={banner.image}
                alt={banner.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-active:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {banner.subtitle && (
                  <p className="text-primary-foreground text-xs font-semibold uppercase tracking-wider opacity-90">
                    {banner.subtitle}
                  </p>
                )}
                <h4 className="text-primary-foreground text-lg font-extrabold mt-0.5">{banner.title}</h4>
                {banner.cta && (
                  <span className="inline-flex items-center gap-1 mt-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                    {banner.cta} <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Dots — hidden on desktop grid view */}
      <div className="flex justify-center gap-1.5 mt-3 md:hidden">
        {banners.map((banner, i) => (
          <button
            key={banner.id}
            onClick={() => { setCurrent(i); scrollTo(i); startTimer(); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default PromoBanners;
