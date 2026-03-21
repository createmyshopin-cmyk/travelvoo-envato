import { Search, X, Loader2, Mic, MapPin, Tag } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

const placeholders = [
  "romantic stay with pool...",
  "budget stay near Kalpetta...",
  "family resort for 5 people...",
  "treehouse in Wayanad...",
  "luxury stay with mountain view...",
];

const popularSearches = [
  "Couple Friendly Stays",
  "Budget Stays",
  "Pool Resorts",
  "Family Friendly",
  "Tree Houses",
  "Luxury Resorts",
];

interface SearchResult {
  id: string;
  stay_id: string;
  name: string;
  location: string;
  price: number;
  original_price: number;
  rating: number;
  category: string;
  images: string[];
}

async function searchStaysDB(q: string, tenantId: string | null): Promise<SearchResult[]> {
  const term = q.trim();
  let query = supabase
    .from("stays")
    .select("id, stay_id, name, location, price, original_price, rating, category, images")
    .eq("status", "active")
    .or(
      `name.ilike.%${term}%,location.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`
    )
    .order("rating", { ascending: false })
    .limit(10);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  else query = query.is("tenant_id", null);
  const { data } = await query;
  return (data || []) as SearchResult[];
}

interface SearchBarProps {
  onPopularClick?: (term: string) => void;
}

const SearchBar = ({ onPopularClick }: SearchBarProps) => {
  const { format } = useCurrency();
  const { tenantId } = useTenant();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const rows = await searchStaysDB(q, tenantId);
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const triggerSearch = useCallback((value: string) => {
    setQuery(value);
    setFocused(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 350);
  }, [doSearch]);

  const { isListening, isSupported, toggleListening } = useVoiceSearch({
    onResult: (transcript) => triggerSearch(transcript),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholders.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
    setFocused(true);
    inputRef.current?.blur();
  };

  const handlePopularClick = (term: string) => {
    setQuery(term);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(term);
    setFocused(true);
    if (onPopularClick) {
      onPopularClick(term);
    }
  };

  const handleResultClick = (stay: SearchResult) => {
    setFocused(false);
    router.push(`/stay/${stay.id}`);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div ref={ref} className="relative px-4 py-3">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className={`relative flex flex-1 items-center h-12 rounded-full bg-muted shadow-soft px-4 gap-3 transition-all focus-within:shadow-card border ${isListening ? "border-primary shadow-card" : "border-transparent focus-within:border-primary/30"}`}>
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => triggerSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={isListening ? "Listening..." : placeholders[placeholderIndex]}
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button type="button" onClick={clearSearch} className="shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {isSupported && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={toggleListening}
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isListening ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10 text-muted-foreground"
              }`}
              aria-label={isListening ? "Stop listening" : "Voice search"}
            >
              {isListening ? (
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Mic className="w-4 h-4" />
                </motion.div>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </motion.button>
          )}
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="h-12 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 shadow-soft active:scale-95 transition-transform shrink-0"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {/* Voice Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-2 py-2"
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
            <span className="text-xs text-primary font-medium">Listening...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-4 right-4 top-full mt-1 bg-background rounded-xl shadow-elevated z-30 overflow-hidden border border-border max-h-[70vh] overflow-y-auto"
          >
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Searching stays...</p>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {results.length} stay{results.length !== 1 ? "s" : ""} found
                </p>
                {results.map((r) => (
                  <button
                    key={r.id}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
                    onClick={() => handleResultClick(r)}
                  >
                    <img
                      src={r.images?.[0] || "/placeholder.svg"}
                      alt={r.name}
                      loading="lazy"
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{r.location}
                      </p>
                      {r.category && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Tag className="w-3 h-3" />{r.category}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{format(r.price)}</p>
                      {r.original_price > r.price && (
                        <p className="text-[11px] line-through text-muted-foreground">{format(r.original_price)}</p>
                      )}
                      {r.rating > 0 && <p className="text-[11px] text-muted-foreground">⭐ {r.rating}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && hasSearched && results.length === 0 && (
              <div className="px-4 py-6 text-center">
                <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No stays found for "{query}"</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse below</p>
              </div>
            )}

            {/* Popular Searches */}
            {!hasSearched && !loading && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Popular searches</p>
                <div className="flex flex-wrap gap-1.5">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handlePopularClick(term)}
                      className="text-xs border border-border rounded-full px-3 py-1 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
