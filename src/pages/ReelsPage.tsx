import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX, ExternalLink, MapPin, Share2 } from "lucide-react";
import StickyBottomNav from "@/components/StickyBottomNav";
import { useReels, type ReelWithStay } from "@/hooks/useReels";

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  youtube: "bg-destructive",
  facebook: "bg-blue-600",
  tiktok: "bg-foreground",
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

interface VerticalReelCardProps {
  reel: ReelWithStay;
}

function VerticalReelCard({ reel }: VerticalReelCardProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ytId = getYouTubeId(reel.url);
  const isVideo = isVideoFile(reel.url);

  const ytSrc = (muteParam: boolean, playing: boolean) =>
    ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=${playing ? 1 : 0}&mute=${muteParam ? 1 : 0}&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`
      : "";

  // IntersectionObserver: play/pause + unmute when visible, mute when not
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (visible) {
          setMuted(false);
          setIsPlaying(true);
          if (isVideo && videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        } else {
          setMuted(true);
          setIsPlaying(false);
          if (isVideo && videoRef.current) {
            videoRef.current.pause();
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVideo]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((m) => !m);
  }, []);

  const togglePlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isVideo && videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else if (ytId) {
        setIsPlaying((p) => !p);
      } else if (!ytId && !isVideo) {
        window.open(reel.url, "_blank");
      }
    },
    [isVideo, ytId, reel.url]
  );

  const handleViewStay = useCallback(() => {
    navigate(`/stay/${reel.stay_id}`);
  }, [navigate, reel.stay_id]);

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const origin = window.location.origin;
      const reelsLink = `${origin}/reels`;
      const websiteLink = origin;
      const text = `Check out this reel: ${reel.title}\n\nReels: ${reelsLink}\nWebsite: ${websiteLink}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    },
    [reel.title]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isVideo || ytId) {
        togglePlayPause(e);
      } else if (!ytId && !isVideo) {
        window.open(reel.url, "_blank");
      }
    },
    [isVideo, ytId, reel.url, togglePlayPause]
  );

  const platformLabel =
    reel.platform === "youtube"
      ? "YT"
      : reel.platform === "instagram"
        ? "IG"
        : reel.platform.slice(0, 2).toUpperCase();

  return (
    <div
      ref={containerRef}
      className="min-h-screen h-screen w-full snap-start snap-always flex flex-col bg-black relative shrink-0"
    >
      <div
        className="flex-1 flex items-center justify-center min-h-0 relative cursor-pointer"
        onClick={handleClick}
      >
        <div className="aspect-[9/16] w-full max-h-full flex items-center justify-center overflow-hidden bg-black relative">
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
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
                >
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
                  title="Share to WhatsApp"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {ytId && (
            <>
              <iframe
                key={`${ytId}-${muted}-${isPlaying}`}
                src={ytSrc(muted, isPlaying)}
                title={reel.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                className="absolute inset-0 border-0 pointer-events-none w-full h-[115%] -top-[7.5%]"
              />
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-black z-[5]" />
              <div className="absolute inset-0 z-[6]" aria-hidden />
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-[7]">
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white"
                >
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white"
                  title="Share to WhatsApp"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {!isVideo && !ytId && (
            <>
              <img
                src={reel.thumbnail}
                alt={reel.title}
                loading="lazy"
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary-foreground/90 flex items-center justify-center shadow-elevated">
                  <ExternalLink className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
                  title="Share to WhatsApp"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {!ytId && (
            <div className="absolute top-4 right-14 z-[8]">
              <span
                className={`text-[10px] font-bold text-primary-foreground px-2 py-1 rounded-full ${
                  platformColors[reel.platform] ?? "bg-muted"
                }`}
              >
                {platformLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom overlay: stay name + View Stay button — safe-area for all mobile devices */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-10 min-h-[120px]"
        style={{ paddingBottom: "max(1rem, calc(env(safe-area-inset-bottom) + 88px))" }}
      >
        <p className="text-white font-semibold text-sm mb-2 line-clamp-2">{reel.title}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewStay();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm touch-manipulation"
        >
          <MapPin className="w-4 h-4 shrink-0" />
          View Stay
        </button>
      </div>
    </div>
  );
}

const ReelsPage = () => {
  const { data: reels = [], isLoading: loading } = useReels();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading reels...</div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-muted-foreground text-center">No reels yet</p>
        </div>
        <StickyBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory pb-[80px]">
        {reels.map((reel) => (
          <VerticalReelCard key={reel.id} reel={reel} />
        ))}
      </div>
      <StickyBottomNav />
    </div>
  );
};

export default ReelsPage;
