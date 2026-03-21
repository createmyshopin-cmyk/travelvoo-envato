import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { TripItineraryDay } from "@/types/trip";

interface TripItineraryProps {
  days: TripItineraryDay[];
}

export default function TripItinerary({ days }: TripItineraryProps) {
  if (days.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      {days.map((day) => (
        <AccordionItem key={day.id} value={day.id} className="border rounded-lg mb-3 px-4">
          <AccordionTrigger className="hover:no-underline gap-3">
            <div className="flex items-center gap-3 text-left">
              <span
                className={cn(
                  "shrink-0 inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold text-white",
                  day.dayNumber === 0 ? "bg-green-500" : "bg-purple-600"
                )}
              >
                Day {day.dayNumber}
              </span>
              <span className="text-sm font-medium text-foreground">{day.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line pl-16">
              {day.description}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
