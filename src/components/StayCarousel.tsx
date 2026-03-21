import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStays } from "@/hooks/useStays";
import StayCard from "@/components/StayCard";

interface StayCarouselProps {
  title: string;
  category: string;
}

const toSlug = (cat: string) => cat.toLowerCase().replace(/\s+/g, "-");

const StayCarousel = ({ title, category }: StayCarouselProps) => {
  const { stays, loading } = useStays(category);
  const router = useRouter();

  if (loading || stays.length === 0) return null;

  return (
    <section id="stays" className="py-4">
      <div className="flex items-center justify-between px-4 md:px-6 mb-3">
        <h3 className="text-base md:text-lg font-bold text-foreground">{title}</h3>
        <button
          onClick={() => router.push(`/category/${toSlug(category)}`)}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary"
        >
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Always horizontal scroll — 5 cards visible on xl/lg, 3 on md, 1–2 on mobile */}
      <div
        className="flex gap-3 px-4 md:px-6 md:gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {stays.map((stay, i) => (
          <StayCard key={stay.id} stay={stay} index={i} />
        ))}
      </div>
    </section>
  );
};

export default StayCarousel;
