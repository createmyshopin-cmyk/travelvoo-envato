import type { TripOtherInfo as TripOtherInfoType } from "@/types/trip";

interface TripOtherInfoProps {
  sections: TripOtherInfoType[];
}

export default function TripOtherInfo({ sections }: TripOtherInfoProps) {
  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Other Info</h2>
      {sections.map((section) => (
        <div key={section.id}>
          <h3 className="font-bold text-foreground mb-2">{section.sectionTitle}</h3>
          <ul className="space-y-1">
            {section.items.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
