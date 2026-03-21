import type { TripVideo } from "@/types/trip";

interface TripVideosProps {
  videos: TripVideo[];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/
  );
  return match?.[1] ?? null;
}

export default function TripVideos({ videos }: TripVideosProps) {
  if (videos.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
        Watch Our Community Explore the World
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {videos.map((video) => {
          const ytId = extractYouTubeId(video.youtubeUrl);
          if (!ytId) return null;
          return (
            <div key={video.id} className="space-y-2">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              {video.title && (
                <p className="text-sm text-muted-foreground">{video.title}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
