import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { TripReview } from "@/types/trip";

interface TripReviewsProps {
  reviews: TripReview[];
}

export default function TripReviews({ reviews }: TripReviewsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (reviews.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 360;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Hear from <span className="font-black">travellers like you</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-10 h-10 rounded-full bg-lime-300 hover:bg-lime-400 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-10 h-10 rounded-full bg-lime-300 hover:bg-lime-400 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory scrollbar-hide"
      >
        {reviews.map((review) => {
          const isExpanded = expanded === review.id;
          return (
            <div
              key={review.id}
              className="snap-start shrink-0 w-[320px] md:w-[340px] rounded-2xl border bg-background p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                  {review.reviewerAvatar ? (
                    <img
                      src={review.reviewerAvatar}
                      alt={review.reviewerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-bold">
                      {review.reviewerName.charAt(0)}
                    </div>
                  )}
                </div>
                <Quote className="w-8 h-8 text-lime-300" />
              </div>

              <h4 className="font-bold text-foreground text-base mb-2 leading-tight">
                {review.reviewTitle}
              </h4>
              <p
                className={cn(
                  "text-sm text-muted-foreground flex-1",
                  !isExpanded && "line-clamp-4"
                )}
              >
                {review.reviewText}
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {review.reviewerName}
                  </p>
                  {review.reviewDate && (
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(review.reviewDate), "dd MMMM yyyy")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setExpanded(isExpanded ? null : review.id)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {isExpanded ? "Show Less" : "Continue Reading"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
