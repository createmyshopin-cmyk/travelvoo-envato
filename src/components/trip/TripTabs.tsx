import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TripItinerary from "./TripItinerary";
import TripDatesGrid from "./TripDatesGrid";
import TripInclusions from "./TripInclusions";
import TripOtherInfo from "./TripOtherInfo";
import type { TripItineraryDay, TripDate, TripInclusion, TripOtherInfo as TripOtherInfoType } from "@/types/trip";

interface TripTabsProps {
  days: TripItineraryDay[];
  dates: TripDate[];
  inclusions: TripInclusion[];
  otherInfo: TripOtherInfoType[];
}

export default function TripTabs({ days, dates, inclusions, otherInfo }: TripTabsProps) {
  return (
    <Tabs defaultValue="itinerary" className="w-full">
      <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-0">
        <TabsTrigger
          value="itinerary"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground"
        >
          Itinerary
        </TabsTrigger>
        <TabsTrigger
          value="dates"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground"
        >
          Dates & Costing
        </TabsTrigger>
        <TabsTrigger
          value="inclusions"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground"
        >
          Inclusions
        </TabsTrigger>
        <TabsTrigger
          value="other"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground"
        >
          Other Info
        </TabsTrigger>
      </TabsList>

      <TabsContent value="itinerary" className="pt-6">
        <TripItinerary days={days} />
      </TabsContent>
      <TabsContent value="dates" className="pt-6">
        <TripDatesGrid dates={dates} />
      </TabsContent>
      <TabsContent value="inclusions" className="pt-6">
        <TripInclusions inclusions={inclusions} />
      </TabsContent>
      <TabsContent value="other" className="pt-6">
        <TripOtherInfo sections={otherInfo} />
      </TabsContent>
    </Tabs>
  );
}
