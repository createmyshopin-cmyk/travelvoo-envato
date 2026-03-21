import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import type { TripDate } from "@/types/trip";

interface TripDatesGridProps {
  dates: TripDate[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-700" },
  few_left: { label: "Few Left", color: "bg-orange-100 text-orange-700" },
  sold_out: { label: "Sold Out", color: "bg-red-100 text-red-700" },
};

export default function TripDatesGrid({ dates }: TripDatesGridProps) {
  const { format: fmt } = useCurrency();

  if (dates.length === 0) {
    return <p className="text-muted-foreground text-sm">No upcoming dates available.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Dates</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dates.map((d) => {
          const cfg = statusConfig[d.status] ?? statusConfig.available;
          return (
            <div
              key={d.id}
              className={cn(
                "border rounded-xl p-4 transition-shadow hover:shadow-md",
                d.status === "sold_out" && "opacity-60"
              )}
            >
              <span className={cn("inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold mb-3", cfg.color)}>
                {cfg.label}
              </span>
              <p className="font-semibold text-foreground text-sm">
                {format(parseISO(d.startDate), "EEE MMM dd yyyy")} -{" "}
                {format(parseISO(d.endDate), "EEE MMM dd yyyy")}
              </p>
              <div className="mt-3 border rounded-lg px-3 py-2 inline-block">
                <span className="text-xs text-muted-foreground block">Starting Price:</span>
                <span className="text-sm font-bold text-primary">{fmt(d.price)} /-</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
