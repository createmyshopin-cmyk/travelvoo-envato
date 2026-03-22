import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Star, MapPin } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useTenant } from "@/context/TenantContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformTenantId } from "@/lib/platformTenant";
import type { Stay } from "@/types/stay";

const fallbackImages = ["/assets/stay-1.jpg", "/assets/stay-2.jpg", "/assets/stay-3.jpg", "/assets/stay-4.jpg"];

const Wishlist = () => {
  const { format } = useCurrency();
  const router = useRouter();
  const { tenantId } = useTenant();
  const { wishlist, toggleWishlist } = useWishlist();
  const [wishedStays, setWishedStays] = useState<Stay[]>([]);

  useEffect(() => {
    if (wishlist.length === 0) {
      setWishedStays([]);
      return;
    }
    let cancelled = false;
    (async () => {
      let query = supabase.from("stays").select("*").in("id", wishlist);
      const filter = tenantId ?? (await getPlatformTenantId());
      if (filter) query = query.eq("tenant_id", filter);
      else query = query.is("tenant_id", null);
      const { data } = await query;
      if (cancelled || !data) return;
      setWishedStays(
        data.map((row: any) => ({
          id: row.id,
          stayId: row.stay_id,
          name: row.name,
          location: row.location,
          price: row.price,
          originalPrice: row.original_price,
          image: row.images?.[0] || fallbackImages[0],
          images: row.images?.length > 0 ? row.images : [fallbackImages[0]],
          category: row.category,
          rating: Number(row.rating),
          reviews: row.reviews_count,
          description: row.description,
          amenities: row.amenities || [],
          status: row.status,
          tenantId: row.tenant_id,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [wishlist, tenantId]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-10">
      <header className="sticky top-0 z-50 h-[60px] bg-background shadow-soft flex items-center px-4 gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">My Wishlist</h1>
        <span className="ml-auto text-sm font-bold text-primary">{wishedStays.length} stays</span>
      </header>

      {wishedStays.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center pt-32 px-6 text-center"
        >
          <Heart className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-bold text-foreground">No saved stays yet</p>
          <p className="text-sm text-muted-foreground mt-1">Tap the heart icon on any stay to save it here</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 bg-primary text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl active:scale-95 transition-transform"
          >
            Explore Stays
          </button>
        </motion.div>
      ) : (
        <div className="px-4 pt-4 flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {wishedStays.map((stay) => (
              <motion.div
                key={stay.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex gap-3 bg-card rounded-2xl overflow-hidden shadow-card"
              >
                <img
                  src={stay.images[0]}
                  alt={stay.name}
                  className="w-28 h-28 object-cover shrink-0 cursor-pointer"
                  onClick={() => router.push(`/stay/${stay.id}`)}
                />
                <div className="flex-1 py-2.5 pr-3 flex flex-col justify-between">
                  <div>
                    <p
                      className="text-sm font-bold text-card-foreground truncate cursor-pointer"
                      onClick={() => router.push(`/stay/${stay.id}`)}
                    >
                      {stay.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{stay.location}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-star-rating text-star-rating" />
                      <span className="text-xs font-bold text-card-foreground">{stay.rating}</span>
                      <span className="text-xs text-muted-foreground">({stay.reviews})</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-primary">{format(stay.price)}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                    <motion.button
                      whileTap={{ scale: 1.3 }}
                      onClick={() => toggleWishlist(stay.id)}
                      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                    >
                      <motion.div initial={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Heart className="w-4 h-4 fill-primary text-primary" />
                      </motion.div>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Wishlist;
