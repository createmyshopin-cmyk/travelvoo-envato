import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripGalleryProps {
  images: string[];
  name: string;
}

export default function TripGallery({ images, name }: TripGalleryProps) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <section className="w-full overflow-hidden">
      <div className="relative flex gap-2 max-w-7xl mx-auto px-4">
        {images.length <= 3 ? (
          images.map((img, i) => (
            <div
              key={i}
              className={cn(
                "relative overflow-hidden rounded-xl",
                images.length === 1
                  ? "w-full aspect-[16/7]"
                  : images.length === 2
                    ? "w-1/2 aspect-[4/3]"
                    : "flex-1 aspect-[4/3]",
                i === 1 && images.length === 3 && "flex-[1.4]"
              )}
            >
              <img
                src={img}
                alt={`${name} - ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))
        ) : (
          <>
            <div className="hidden md:flex gap-2 w-full">
              {images.slice(0, 3).map((img, i) => (
                <div
                  key={i}
                  className={cn(
                    "relative overflow-hidden rounded-xl aspect-[4/3]",
                    i === 1 ? "flex-[1.4]" : "flex-1"
                  )}
                >
                  <img
                    src={img}
                    alt={`${name} - ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="md:hidden relative w-full aspect-[4/3] rounded-xl overflow-hidden">
              <img
                src={images[current]}
                alt={`${name} - ${current + 1}`}
                className="w-full h-full object-cover transition-transform duration-300"
              />
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-foreground backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-foreground backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i === current ? "bg-white" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
