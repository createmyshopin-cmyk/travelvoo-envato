import { useState } from "react";

interface TripCancellationPolicyProps {
  policy: string[];
}

export default function TripCancellationPolicy({ policy }: TripCancellationPolicyProps) {
  const [expanded, setExpanded] = useState(false);

  if (policy.length === 0) return null;

  const visible = expanded ? policy : policy.slice(0, 5);

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="bg-muted/50 rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-bold text-foreground mb-2">Cancellation Policy</h3>
        <p className="font-semibold text-foreground text-sm mb-4">
          Cancellation/ Reschedule and Refund Policy:
        </p>
        <ul className="space-y-2 list-disc list-inside">
          {visible.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
        {policy.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-sm font-semibold text-primary hover:underline float-right"
          >
            {expanded ? "Show Less" : "Read Full Policy"}
          </button>
        )}
      </div>
    </section>
  );
}
