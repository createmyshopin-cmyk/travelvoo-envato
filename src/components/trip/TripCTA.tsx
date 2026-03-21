interface TripCTAProps {
  heading?: string | null;
  subheading?: string | null;
  imageUrl?: string | null;
  onCallback: () => void;
}

export default function TripCTA({ heading, subheading, imageUrl, onCallback }: TripCTAProps) {
  const bg = imageUrl || "/assets/stay-1.jpg";

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div
        className="relative rounded-2xl overflow-hidden min-h-[280px] md:min-h-[340px] flex items-center"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        <div className="relative z-10 px-8 md:px-14 py-10 max-w-lg">
          <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-6">
            {heading || "You pick the mood.\nWe map the route."}
          </h2>
          {subheading && (
            <p className="text-white/80 text-sm mb-6">{subheading}</p>
          )}
          <button
            onClick={onCallback}
            className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Callback
          </button>
        </div>
      </div>
    </section>
  );
}
