import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Star, ChevronRight, SlidersHorizontal, Wifi, Waves, Coffee,
  Flame, Mountain, ShowerHead, Wind, Sparkles, UtensilsCrossed, Dumbbell,
  Car, TreePine, Tv, Dog, Baby, Tent, Crown, Award, ArrowUpDown,
} from "lucide-react";
import { useStays } from "@/hooks/useStays";
import type { Stay } from "@/types/stay";
import { useWishlist } from "@/context/WishlistContext";
import StickyHeader from "@/components/StickyHeader";
import StickyBottomNav from "@/components/StickyBottomNav";
import Footer from "@/components/Footer";

// ── Category map ──────────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  "couple-friendly": "Couple Friendly",
  "family-stay":     "Family Stay",
  "luxury-resort":   "Luxury Resort",
  "budget-rooms":    "Budget Rooms",
  "non-ac-rooms":    "Non AC Rooms",
  "pool-villas":     "Pool Villas",
  "tree-houses":     "Tree Houses",
};

// ── Amenity icons ─────────────────────────────────────────────────────────────
const AMENITY_ICON: Record<string, React.ElementType> = {
  "Free Wi-Fi":       Wifi,
  "Swimming Pool":    Waves,
  "Free Breakfast":   Coffee,
  "Bonfire":          Flame,
  "Mountain View":    Mountain,
  "Hot Water":        ShowerHead,
  "Air Conditioning": Wind,
  "Spa":              Sparkles,
  "Restaurant":       UtensilsCrossed,
  "Gym":              Dumbbell,
  "Free Parking":     Car,
  "Garden":           TreePine,
  "TV":               Tv,
  "Pet Friendly":     Dog,
  "Kid Friendly":     Baby,
  "Camping":          Tent,
};

const AMENITY_LABEL: Record<string, string> = {
  "Free Wi-Fi":       "Wi-Fi",
  "Swimming Pool":    "Pool",
  "Free Breakfast":   "Breakfast",
  "Bonfire":          "Campfire",
  "Mountain View":    "Mtn view",
  "Hot Water":        "Hot water",
  "Air Conditioning": "AC",
  "Spa":              "Spa",
  "Restaurant":       "Restaurant",
  "Gym":              "Gym",
  "Free Parking":     "Parking",
  "Garden":           "Garden",
  "TV":               "TV",
  "Pet Friendly":     "Pets OK",
  "Kid Friendly":     "Kids OK",
  "Camping":          "Camping",
};

type SortKey = "top" | "price-asc" | "price-desc";

// ── Listing card ──────────────────────────────────────────────────────────────
const ListingCard = ({ stay, index }: { stay: Stay; index: number }) => {
  const router = useRouter();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(stay.id);
  const [mainImg, setMainImg] = useState(0);

  const isPremium = stay.rating >= 4.8;
  const savings = stay.originalPrice - stay.price;

  // Show 4 amenity icons; rest as "+N"
  const iconAmenities = stay.amenities.filter(a => AMENITY_ICON[a]);
  const shown  = iconAmenities.slice(0, 4);
  const extra  = iconAmenities.length - shown.length;

  const thumbs = stay.images.slice(1, 4);

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden flex flex-col md:flex-row border border-border/40 hover:shadow-elevated transition-shadow">
      {/* ── Image section ── */}
      <div className="relative md:w-[240px] lg:w-[270px] shrink-0">
        {/* Main image */}
        <div className="relative h-[200px] md:h-full min-h-[200px] overflow-hidden">
          <img
            src={stay.images[mainImg]}
            alt={stay.name}
            className="w-full h-full object-cover transition-all duration-500"
          />
          {/* Wishlist */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleWishlist(stay.id); }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-card/70 backdrop-blur-sm flex items-center justify-center"
          >
            <Heart className={`w-4 h-4 transition-colors ${wishlisted ? "fill-primary text-primary" : "text-white"}`} />
          </button>
          {/* Rating badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Star className="w-3 h-3 fill-star-rating text-star-rating" />
            <span className="text-xs font-bold text-foreground">{stay.rating}</span>
          </div>
        </div>

        {/* Thumbnails strip */}
        {thumbs.length > 0 && (
          <div className="flex gap-1 p-1 bg-muted/30">
            {thumbs.map((img, i) => (
              <button
                key={i}
                onClick={() => setMainImg(i + 1)}
                className={`relative flex-1 h-14 rounded overflow-hidden border-2 transition-all ${mainImg === i + 1 ? "border-primary" : "border-transparent"}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                {i === 2 && stay.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">+{stay.images.length - 4} MORE</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Details section ── */}
      <div
        className="flex-1 p-4 flex flex-col justify-between cursor-pointer"
        onClick={() => router.push(`/stay/${stay.id}`)}
      >
        <div>
          {/* Top row: name + badge */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-base md:text-lg font-bold text-foreground leading-tight">{stay.name}</h2>
            {isPremium ? (
              <span className="shrink-0 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
                <Crown className="w-3 h-3" /> PREMIUM
              </span>
            ) : (
              <span className="shrink-0 flex items-center gap-1 border border-primary/50 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">
                <Award className="w-3 h-3" /> STANDARD
              </span>
            )}
          </div>

          {/* Subtitle */}
          <p className="text-xs text-muted-foreground mb-3">
            {stay.category} &nbsp;·&nbsp; {stay.location}
          </p>

          {/* Amenity icons */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {shown.map((amenity) => {
              const Icon = AMENITY_ICON[amenity];
              return (
                <div key={amenity} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-foreground/70" />
                  </div>
                  <span className="text-[9px] text-muted-foreground leading-none text-center">{AMENITY_LABEL[amenity] ?? amenity}</span>
                </div>
              );
            })}
            {extra > 0 && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground/70">+{extra}</span>
                </div>
                <span className="text-[9px] text-muted-foreground">more</span>
              </div>
            )}
          </div>

          {/* Breakfast tag */}
          {stay.amenities.includes("Free Breakfast") && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mb-1">
              <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px]">✓</span>
              Breakfast Included
            </div>
          )}
        </div>

        {/* Bottom row: price + button */}
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/40">
          <div>
            {savings > 0 && (
              <p className="text-xs text-muted-foreground line-through">₹{stay.originalPrice.toLocaleString("en-IN")}</p>
            )}
            <p className="text-xl font-bold text-foreground">₹{stay.price.toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-muted-foreground">Per night + Taxes</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/stay/${stay.id}`); }}
            className="bg-primary text-primary-foreground text-xs font-bold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all"
          >
            EXPLORE
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Dual-range price slider ───────────────────────────────────────────────────
const PriceSlider = ({
  min, max, low, high, onLow, onHigh,
}: { min: number; max: number; low: number; high: number; onLow: (v: number) => void; onHigh: (v: number) => void }) => {
  const lowPct  = ((low  - min) / (max - min)) * 100;
  const highPct = ((high - min) / (max - min)) * 100;

  return (
    <div>
      <div className="relative h-1 bg-muted rounded-full mb-4 mt-6">
        {/* filled track */}
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
        />
        {/* low thumb */}
        <input type="range" min={min} max={max} value={low}
          onChange={e => onLow(Math.min(Number(e.target.value), high - 500))}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: low > max - 1000 ? 5 : 3 }}
        />
        {/* high thumb */}
        <input type="range" min={min} max={max} value={high}
          onChange={e => onHigh(Math.max(Number(e.target.value), low + 500))}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 4 }}
        />
        {/* thumb dots */}
        <div className="absolute w-3.5 h-3.5 bg-primary rounded-full border-2 border-background shadow -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${lowPct}%` }} />
        <div className="absolute w-3.5 h-3.5 bg-primary rounded-full border-2 border-background shadow -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${highPct}%` }} />
      </div>
      <div className="flex gap-2">
        <input
          type="number" value={low}
          onChange={e => onLow(Math.min(Number(e.target.value), high - 500))}
          className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-center bg-background text-foreground"
        />
        <input
          type="number" value={high}
          onChange={e => onHigh(Math.max(Number(e.target.value), low + 500))}
          className="w-full border border-border rounded-lg px-2 py-1.5 text-sm text-center bg-background text-foreground"
        />
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CategoryPage = () => {
  const params = useParams();
  const slug = (params.slug as string) || "";

  const category = CATEGORY_MAP[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const { stays, loading } = useStays(category);

  // Filters
  const allPrices   = stays.map(s => s.price);
  const globalMin   = allPrices.length ? Math.min(...allPrices) : 0;
  const globalMax   = allPrices.length ? Math.max(...allPrices) : 50000;

  const [priceLow,  setPriceLow]  = useState<number | null>(null);
  const [priceHigh, setPriceHigh] = useState<number | null>(null);
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("top");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const low  = priceLow  ?? globalMin;
  const high = priceHigh ?? globalMax;

  // Collect all unique amenities across stays
  const allAmenities = useMemo(() => {
    const s = new Set<string>();
    stays.forEach(st => st.amenities.forEach(a => s.add(a)));
    return Array.from(s).sort();
  }, [stays]);

  const toggleAmenity = (a: string) =>
    setAmenityFilters(prev => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  const filtered = useMemo(() => {
    let result = stays.filter(s => s.price >= low && s.price <= high);
    if (amenityFilters.size > 0)
      result = result.filter(s => [...amenityFilters].every(a => s.amenities.includes(a)));
    if (sort === "price-asc")  result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [stays, low, high, amenityFilters, sort]);

  const clearFilters = () => {
    setPriceLow(null); setPriceHigh(null); setAmenityFilters(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyHeader />

      <div className="max-w-lg mx-auto md:max-w-5xl lg:max-w-7xl xl:max-w-[1400px] pb-[80px] md:pb-16 px-4 md:px-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground pt-4 pb-3">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{category}</span>
        </nav>

        {/* ── Sort bar ── */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="md:hidden flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5 text-xs font-medium shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
          </button>

          {([
            ["top",        "Our top picks"],
            ["price-asc",  "Lowest price first"],
            ["price-desc", "Highest price first"],
          ] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                sort === key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:border-foreground"
              }`}
            >
              {key !== "top" && <ArrowUpDown className="w-3 h-3" />}
              {label}
            </button>
          ))}

          <span className="ml-auto text-xs text-muted-foreground shrink-0">
            {loading ? "Loading…" : `${filtered.length} stays`}
          </span>
        </div>

        {/* ── Body ── */}
        <div className="flex gap-6">

          {/* ── Sidebar ── */}
          <aside className={`
            shrink-0 w-64
            ${sidebarOpen ? "block" : "hidden"} md:block
            fixed md:sticky top-[64px] left-0 h-[calc(100vh-64px)] md:h-auto
            z-40 md:z-auto bg-background md:bg-transparent overflow-y-auto md:overflow-visible
            p-4 md:p-0 shadow-xl md:shadow-none rounded-r-2xl md:rounded-none
          `}>
            <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Filters</h3>
                {(amenityFilters.size > 0 || priceLow !== null || priceHigh !== null) && (
                  <button onClick={clearFilters} className="text-xs text-primary font-semibold">Clear all</button>
                )}
              </div>

              {/* Price */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Price Range / Night</p>
                {!loading && (
                  <PriceSlider
                    min={globalMin} max={globalMax}
                    low={low} high={high}
                    onLow={setPriceLow} onHigh={setPriceHigh}
                  />
                )}
              </div>

              {/* Amenities */}
              {allAmenities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Amenities</p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
                    {allAmenities.map(a => (
                      <label key={a} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={amenityFilters.has(a)}
                          onChange={() => toggleAmenity(a)}
                          className="w-3.5 h-3.5 rounded accent-primary"
                        />
                        <span className="text-xs text-foreground group-hover:text-primary transition-colors">{a}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply (mobile) */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden w-full bg-primary text-primary-foreground text-xs font-bold py-2.5 rounded-full"
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />
          )}

          {/* ── Listings ── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[220px] rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-lg font-semibold text-foreground">No stays match your filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try clearing some filters.</p>
                <button onClick={clearFilters} className="mt-4 text-sm text-primary font-semibold underline">Clear filters</button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((stay, i) => (
                  <ListingCard key={stay.id} stay={stay} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <StickyBottomNav />
    </div>
  );
};

export default CategoryPage;
