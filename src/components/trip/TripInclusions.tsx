import { CheckCircle2, XCircle } from "lucide-react";
import type { TripInclusion } from "@/types/trip";

interface TripInclusionsProps {
  inclusions: TripInclusion[];
}

export default function TripInclusions({ inclusions }: TripInclusionsProps) {
  const included = inclusions.filter((i) => i.type === "included");
  const excluded = inclusions.filter((i) => i.type === "excluded");

  if (included.length === 0 && excluded.length === 0) return null;

  return (
    <div className="space-y-8">
      {included.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h3 className="text-xl font-bold text-foreground">Whats included</h3>
          </div>
          <ul className="space-y-2 pl-1">
            {included.map((item) => (
              <li key={item.id} className="text-sm text-muted-foreground">
                {item.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {excluded.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
            <h3 className="text-xl font-bold text-foreground">Whats not included</h3>
          </div>
          <ul className="space-y-2 pl-1">
            {excluded.map((item) => (
              <li key={item.id} className="text-sm text-muted-foreground">
                {item.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
