import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TripItinerary from "./TripItinerary";
import TripDatesGrid from "./TripDatesGrid";
import TripInclusions from "./TripInclusions";
import TripOtherInfo from "./TripOtherInfo";
import type {
  TripItineraryDay,
  TripDate,
  TripInclusion,
  TripOtherInfo as TripOtherInfoType,
  TripCustomTab,
} from "@/types/trip";

interface TripTabsProps {
  days: TripItineraryDay[];
  dates: TripDate[];
  inclusions: TripInclusion[];
  otherInfo: TripOtherInfoType[];
  /** Extra tabs from package editor (trips.custom_tabs). */
  customTabs?: TripCustomTab[];
}

export default function TripTabs({
  days,
  dates,
  inclusions,
  otherInfo,
  customTabs = [],
}: TripTabsProps) {
  return (
    <Tabs defaultValue="itinerary" className="w-full">
      <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-0 overflow-x-auto flex-nowrap [-webkit-overflow-scrolling:touch]">
        <TabsTrigger
          value="itinerary"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground shrink-0"
        >
          Itinerary
        </TabsTrigger>
        <TabsTrigger
          value="dates"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground shrink-0"
        >
          Dates & Costing
        </TabsTrigger>
        <TabsTrigger
          value="inclusions"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground shrink-0"
        >
          Inclusions
        </TabsTrigger>
        <TabsTrigger
          value="other"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground shrink-0"
        >
          Other Info
        </TabsTrigger>
        {customTabs.map((tab, i) => (
          <TabsTrigger
            key={`custom-${i}-${tab.label}`}
            value={`custom-${i}`}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground shrink-0 max-w-[11rem] truncate"
          >
            {tab.label.trim() || `Custom ${i + 1}`}
          </TabsTrigger>
        ))}
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
      {customTabs.map((tab, i) => (
        <TabsContent key={`custom-content-${i}`} value={`custom-${i}`} className="pt-6">
          {tab.body.trim() ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{tab.body}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No content for this tab yet.</p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
