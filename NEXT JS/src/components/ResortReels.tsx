import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, ExternalLink } from "lucide-react";
import type { Reel } from "@/types/stay";

interface Props {
  reels: Reel[];
}

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  youtube:   "bg-destructive",
  facebook:  "bg-blue-600",
  tiktok:    "bg-foreground",
};

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

// ── Individual reel card ────────────────────────────────────────────────────

interface ReelCardProps {
  reel: Reel;
  index: number;
}

const ReelCard = ({ reel, index }: ReelCardProps) => {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ytId = getYouTubeId(reel.url);
  const isVideo = isVideoFile(reel.url);

  // Build YouTube embed src — no controls, no branding, no info
  const ytSrc = (muteParam: boolean) =>
    ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muteParam ? 1 : 0}&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`
      : "";

  // Intersection Observer → autoplay when visible, pause when not
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(containerRef.current!);
    return () => observer.disconnect();
  }, [isVideo]);

  // Sync muted state to video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((m) => !m);
  }, []);

  const handleClick = useCallback(() => {
    if (!ytId && !isVideo) {
      window.open(reel.url, "_blank");
    }
  }, [ytId, isVideo, reel.url]);

  const platformLabel =
    reel.platform === "youtube"   ? "YT" :
    reel.platform === "instagram" ? "IG" :
    reel.platform.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="shrink-0 w-[120px] text-left"
    >
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden shadow-card aspect-[9/16] w-full bg-black cursor-pointer"
        onClick={handleClick}
      >
        {/* ── Direct video ── */}
        {isVideo && (
          <>
            <video
              ref={videoRef}
              src={reel.url}
              poster={reel.thumbnail}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Unmute/mute overlay button */}
            <button
              onClick={toggleMute}
              className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white"
            >
              {muted
                ? <VolumeX className="w-3.5 h-3.5" />
                : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </>
        )}

        {/* ── YouTube embed ── */}
        {ytId && (
          <>
            {/* Scale up slightly so YouTube's bottom bar is clipped by overflow-hidden */}
            <iframe
              key={`${ytId}-${muted}`}
              src={ytSrc(muted)}
              title={reel.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              className="absolute inset-0 border-0 pointer-events-none"
              style={{ width: "100%", height: "115%", top: "-7.5%" }}
            />
            {/* Cover strip — hides YouTube watermark / logo at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-black z-[5]" />
            {/* Full-area click-catcher to block iframe interaction */}
            <div className="absolute inset-0 z-[6]" onClick={toggleMute} />
            {/* Speaker icon — only UI element shown */}
            <button
              onClick={toggleMute}
              className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white z-[7]"
            >
              {muted
                ? <VolumeX className="w-3.5 h-3.5" />
                : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </>
        )}

        {/* ── External link (Instagram / Facebook / TikTok) ── */}
        {!isVideo && !ytId && (
          <>
            <img
              src={reel.thumbnail}
              alt={reel.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/90 flex items-center justify-center shadow-elevated">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
            </div>
          </>
        )}

        {/* Platform badge — hidden for YouTube (iframe already has YT branding handled) */}
        {!ytId && <div className="absolute top-2 right-2 z-[8]">
          <span
            className={`text-[9px] font-bold text-primary-foreground px-1.5 py-0.5 rounded-full ${
              platformColors[reel.platform] ?? "bg-muted"
            }`}
          >
            {platformLabel}
          </span>
        </div>}
      </div>

      <p className="text-xs font-semibold text-foreground mt-2 truncate">{reel.title}</p>
    </motion.div>
  );
};

// ── Section ─────────────────────────────────────────────────────────────────

const ResortReels = ({ reels }: Props) => {
  if (!reels?.length) return null;

  return (
    <div className="mt-6">
      <h2 className="text-base font-bold text-foreground mb-3 px-4">Resort Reels</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {reels.map((reel, i) => (
          <ReelCard key={reel.title} reel={reel} index={i} />
        ))}
      </div>
    </div>
  );
};

export default ResortReels;
