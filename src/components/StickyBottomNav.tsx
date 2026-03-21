import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Compass, Sparkles, Heart, Search, X, Loader2, Mic, Clapperboard } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { supabase } from "@/integrations/supabase/client";
import { reelsQueryKey, fetchReels } from "@/hooks/useReels";
import { Badge } from "@/components/ui/badge";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useCurrency } from "@/context/CurrencyContext";

const placeholders = [
  "romantic stay with pool...",
  "budget stay near Kalpetta...",
  "family resort for 5 people...",
  "treehouse in Wayanad...",
];

const popularSearches = [
  "Couple Friendly Stays",
  "Budget Stays",
  "Pool Resorts",
  "Family Friendly",
  "Tree Houses",
];

interface SearchResult {
  id: string;
  stay_id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  images: string[];
}

const StickyBottomNav = () => {
  const { format } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { count } = useWishlist();
  const [activeTab, setActiveTab] = useState("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [menuConfig, setMenuConfig] = useState({
    enabled: true,
    showAi: true,
    showWishlist: true,
    showExplore: true,
    showReels: true,
  });

  // Sync activeTab with current route
  useEffect(() => {
    const path = pathname;
    if (path === "/") setActiveTab("home");
    else if (path === "/stays") setActiveTab("explore");
    else if (path === "/wishlist") setActiveTab("wishlist");
    else if (path === "/reels") setActiveTab("reels");
  }, [pathname]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("sticky_menu_enabled, sticky_menu_show_ai, sticky_menu_show_wishlist, sticky_menu_show_explore, sticky_menu_show_reels")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setMenuConfig({
            enabled: data.sticky_menu_enabled ?? true,
            showAi: data.sticky_menu_show_ai ?? true,
            showWishlist: data.sticky_menu_show_wishlist ?? true,
            showExplore: data.sticky_menu_show_explore ?? true,
            showReels: data.sticky_menu_show_reels ?? true,
          });
        }
      });
  }, []);

  // Prefetch reels data + ReelsPage chunk when Reels tab is visible (after 1.5s idle)
  useEffect(() => {
    if (!menuConfig.showReels) return;
    const timer = setTimeout(() => {
      queryClient.prefetchQuery({ queryKey: reelsQueryKey, queryFn: fetchReels });
      import("../spa-pages/ReelsPage");
    }, 1500);
    return () => clearTimeout(timer);
  }, [menuConfig.showReels, queryClient]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchAI = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setFilters([]);
      setSummary("");
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-search", {
        body: { query: q },
      });
      if (error) throw error;
      setResults(data?.stays || []);
      setFilters(data?.filters || []);
      setSummary(data?.summary || "");
    } catch {
      setResults([]);
      setFilters([]);
      setSummary("");
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAI(value), 400);
  }, [searchAI]);

  const { isListening, isSupported, toggleListening } = useVoiceSearch({
    onResult: (transcript) => {
      triggerSearch(transcript);
    },
  });

  const handleSearch = (value: string) => {
    triggerSearch(value);
  };

  const handleResultClick = (stay: SearchResult) => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    router.push(`/stay/${stay.stay_id}`);
  };

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === "home") {
      if (pathname !== "/") {
        router.replace("/");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (tab === "explore") {
      router.push("/stays");
    } else if (tab === "wishlist") {
      router.push("/wishlist");
    } else if (tab === "reels") {
      router.push("/reels");
    }
  };

  if (!menuConfig.enabled) return null;

  const navItems = [
    { key: "home", icon: Home, label: "Home", show: true },
    { key: "explore", icon: Compass, label: "Explore", show: menuConfig.showExplore },
    { key: "ai", icon: Sparkles, label: "AI Search", show: menuConfig.showAi },
    { key: "wishlist", icon: Heart, label: "Wishlist", show: menuConfig.showWishlist },
    { key: "reels", icon: Clapperboard, label: "Reels", show: menuConfig.showReels },
  ].filter((item) => item.show);

  return (
    <>
      {/* AI Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-background"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
              <button onClick={() => { setSearchOpen(false); setQuery(""); setResults([]); setHasSearched(false); }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className={`flex-1 flex items-center gap-2 h-10 rounded-full bg-muted px-3 transition-all ${isListening ? "ring-2 ring-primary" : ""}`}>
                {loading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={isListening ? "Listening..." : "Search with AI..."}
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
                {query && (
                  <button onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              {isSupported && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleListening}
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isListening ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                  aria-label={isListening ? "Stop listening" : "Voice search"}
                >
                  {isListening ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                      <Mic className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </motion.button>
              )}
            </div>

            {/* Voice Listening Indicator */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center gap-2 py-3 border-b border-border bg-primary/5"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary rounded-full"
                        animate={{ height: [8, 20, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-primary font-medium">Listening... speak now</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-56px)]">
              {/* AI Summary */}
              {summary && (
                <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-foreground/80">{summary}</p>
                </div>
              )}

              {/* Suggested Filters */}
              {filters.length > 0 && (
                <div className="px-4 py-3 border-b border-border flex flex-wrap gap-1.5">
                  {filters.map((f) => (
                    <Badge
                      key={f}
                      variant="secondary"
                      className="text-[11px] cursor-pointer hover:bg-primary/10"
                      onClick={() => { setQuery(f); searchAI(f); }}
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center gap-2 py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">AI is searching...</p>
                </div>
              )}

              {/* Results */}
              {!loading && results.length > 0 && (
                <div>
                  {results.map((r) => (
                    <button
                      key={r.id}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border/50"
                      onClick={() => handleResultClick(r)}
                    >
                      <img
                        src={r.images?.[0] || "/placeholder.svg"}
                        alt={r.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.location}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">{format(r.price)}</p>
                        {r.rating > 0 && <p className="text-[11px] text-muted-foreground">⭐ {r.rating}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!loading && hasSearched && results.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No stays found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
                </div>
              )}

              {/* Popular Searches */}
              {!hasSearched && !loading && (
                <div className="px-4 py-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Try searching for
                  </p>
                  <div className="space-y-1">
                    {[
                      "romantic stay with pool",
                      "budget stay near banasura dam",
                      "family stay in wayanad",
                      "luxury treehouse",
                      "pool villa for couples",
                    ].map((term) => (
                      <button
                        key={term}
                        className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => { setQuery(term); searchAI(term); }}
                      >
                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">{term}</span>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3">
                    Popular searches
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularSearches.map((term) => (
                      <Badge
                        key={term}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => { setQuery(term); searchAI(term); }}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[80] w-full max-w-lg md:hidden">
        <div className="bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-2xl">
          <div className="flex items-end justify-evenly h-[70px] pb-2 pt-1 relative">
            {navItems.map((item) => {
              if (item.key === "ai") {
                return (
                  <motion.button
                    key="ai"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchOpen(true)}
                    className="relative -mt-5 flex flex-col items-center flex-1"
                  >
                    <div className="w-[56px] h-[56px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-semibold text-primary mt-0.5">{item.label}</span>
                  </motion.button>
                );
              }

              const isActive = activeTab === item.key;
              return (
                <motion.button
                  key={item.key}
                  whileTap={{ scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleNavClick(item.key)}
                  className="flex flex-col items-center justify-center flex-1 py-1 relative"
                >
                  <div className="relative">
                    <item.icon
                      className={`w-6 h-6 transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      } ${item.key === "wishlist" && count > 0 ? "fill-primary text-primary" : ""}`}
                    />
                    {item.key === "wishlist" && count > 0 && (
                      <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 font-medium transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default StickyBottomNav;
