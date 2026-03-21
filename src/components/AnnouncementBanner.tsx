import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
}

const AnnouncementBanner = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    const { data } = await (supabase.from("banners") as any)
      .select("id, title, subtitle, cta_text, cta_link")
      .eq("type", "announcement")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) setItems(data as Announcement[]);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="px-4 md:px-6 lg:px-8 space-y-2 pt-2">
      {visible.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2.5 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2.5"
        >
          <span className="mt-0.5 shrink-0 bg-purple-100 dark:bg-purple-900 text-purple-600 rounded-full p-1">
            <Megaphone className="h-3.5 w-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 leading-snug">
              {item.title}
            </p>
            {item.subtitle && (
              <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">{item.subtitle}</p>
            )}
            {item.cta_text && (
              <a
                href={item.cta_link || "/"}
                className="inline-flex items-center gap-0.5 mt-1.5 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-transform"
              >
                {item.cta_text} <ChevronRight className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          <button
            onClick={() => setDismissed((d) => new Set([...d, item.id]))}
            className="shrink-0 text-purple-400 hover:text-purple-600 transition-colors mt-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementBanner;
