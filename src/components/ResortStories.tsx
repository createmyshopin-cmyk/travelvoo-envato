import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { getPlatformTenantId } from "@/lib/platformTenant";

// --- Types -----------------------------------------------------------

interface StoryItem {
  id: string;
  type: "reel";
  src: string;       // thumbnail
  url: string;       // external reel link
  platform: string;
  title: string;
}

interface StoryGroup {
  stayId: string;
  name: string;
  cover: string;    // first thumbnail shown in story circle
  items: StoryItem[];
}

// --- Component -------------------------------------------------------

const FALLBACK_DURATION = 4;

const ResortStories = () => {
  const { tenantId } = useTenant();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [sectionTitle, setSectionTitle] = useState("Resort Stories");
  const [duration, setDuration] = useState(FALLBACK_DURATION);
  const [visible, setVisible] = useState(true);

  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState(0);

  useEffect(() => {
    if (shouldLoad) return;
    const el = sectionRef.current;
    if (!el) return;

    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    const fetchAll = async () => {
      let reelsQuery = supabase
        .from("stay_reels")
        .select("id, stay_id, url, platform, title, thumbnail, sort_order, stays(name, images)")
        .order("sort_order");
      const reelFilter = tenantId ?? (await getPlatformTenantId());
      if (reelFilter) reelsQuery = reelsQuery.eq("tenant_id", reelFilter);
      else reelsQuery = reelsQuery.is("tenant_id", null);

      const [{ data: reelsData }, { data: settingsData }] = await Promise.all([
        reelsQuery,
        supabase
          .from("site_settings")
          .select("*")
          .limit(1)
          .single(),
      ]);

      if (settingsData) {
        setVisible((settingsData as any).stories_enabled ?? true);
        setSectionTitle((settingsData as any).stories_section_title || "Resort Stories");
        setDuration((settingsData as any).stories_duration || FALLBACK_DURATION);
      }

      if (!reelsData?.length) return;

      // Group by stay_id
      const map = new Map<string, { name: string; cover: string; items: StoryItem[] }>();
      for (const reel of reelsData as any[]) {
        const stayName: string = reel.stays?.name || "Resort";
        const stayImages: string[] = reel.stays?.images || [];
        const thumb: string = reel.thumbnail || stayImages[0] || "";

        if (!map.has(reel.stay_id)) {
          map.set(reel.stay_id, { name: stayName, cover: thumb, items: [] });
        }
        map.get(reel.stay_id)!.items.push({
          id: reel.id,
          type: "reel",
          src: thumb,
          url: reel.url,
          platform: reel.platform,
          title: reel.title || "",
        });
      }

      setGroups(
        Array.from(map.entries()).map(([stayId, val]) => ({
          stayId,
          name: val.name,
          cover: val.cover,
          items: val.items,
        }))
      );
    };

    fetchAll();
  }, [tenantId, shouldLoad]);

  const openGroup = (idx: number) => { setActiveGroup(idx); setActiveItem(0); };
  const closeGroup = () => setActiveGroup(null);

  const next = () => {
    if (activeGroup === null) return;
    const grp = groups[activeGroup];
    if (activeItem < grp.items.length - 1) {
      setActiveItem((i) => i + 1);
    } else if (activeGroup < groups.length - 1) {
      setActiveGroup((g) => (g ?? 0) + 1);
      setActiveItem(0);
    } else {
      closeGroup();
    }
  };

  const prev = () => {
    if (activeItem > 0) {
      setActiveItem((i) => i - 1);
    } else if (activeGroup !== null && activeGroup > 0) {
      const p = activeGroup - 1;
      setActiveGroup(p);
      setActiveItem(groups[p].items.length - 1);
    }
  };

  if (!shouldLoad) return <div ref={sectionRef} style={{ minHeight: "72px" }} />;
  if (!visible || groups.length === 0) return <div ref={sectionRef} />;

  const currentGroup = activeGroup !== null ? groups[activeGroup] : null;
  const currentItem = currentGroup ? currentGroup.items[activeItem] : null;

  return (
    <>
      {/* Story circles */}
      <div ref={sectionRef} className="py-4">
        <h3 className="px-4 text-base font-bold text-foreground mb-3">{sectionTitle}</h3>
        <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
          {groups.map((group, idx) => (
            <button
              key={group.stayId}
              onClick={() => openGroup(idx)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className="w-[76px] h-[76px] rounded-full p-[3px] bg-gradient-to-br from-primary to-orange-400">
                <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-muted">
                  {group.cover ? (
                    <img src={group.cover} alt={group.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground w-[76px] text-center truncate">
                {group.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {activeGroup !== null && currentGroup && currentItem && (
          /* Full-screen dark backdrop — tap outside card to close */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
            onClick={closeGroup}
          >
            {/* 9:16 story card — stop propagation so taps inside don't close */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col bg-black overflow-hidden rounded-2xl shadow-2xl"
              style={{
                /* Always 9:16 — fills viewport height on mobile, capped on desktop */
                aspectRatio: "9 / 16",
                height: "min(100dvh, 100vh)",
                maxHeight: "calc(100dvh - 16px)",
                width: "auto",
                maxWidth: "calc((100dvh - 16px) * 9 / 16)",
              }}
            >
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-3 pt-3">
                {currentGroup.items.map((_, i) => (
                  <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: i < activeItem ? "100%" : "0%" }}
                      animate={{ width: i <= activeItem ? "100%" : "0%" }}
                      transition={i === activeItem ? { duration, ease: "linear" } : { duration: 0 }}
                      onAnimationComplete={() => { if (i === activeItem) next(); }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/60">
                    {currentGroup.cover && (
                      <img src={currentGroup.cover} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white drop-shadow block">
                      {currentGroup.name}
                    </span>
                    {currentItem.title && (
                      <span className="text-[11px] text-white/70 drop-shadow">{currentItem.title}</span>
                    )}
                  </div>
                </div>
                <button onClick={closeGroup} className="text-white p-1 bg-black/30 rounded-full backdrop-blur-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Media — fills the 9:16 card */}
              <img
                src={currentItem.src}
                alt={currentItem.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Reel play overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/25">
                <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </div>
                {currentItem.platform && (
                  <span className="text-xs text-white/80 capitalize bg-black/40 px-2 py-0.5 rounded-full">
                    {currentItem.platform}
                  </span>
                )}
                <button
                  onClick={() => window.open(currentItem.url, "_blank")}
                  className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-full"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Watch Reel
                </button>
              </div>

              {/* Tap zones for prev / next */}
              <button className="absolute left-0 top-0 w-1/3 h-full z-20" onClick={prev} />
              <button className="absolute right-0 top-0 w-2/3 h-full z-20" onClick={next} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ResortStories;
