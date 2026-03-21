"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Plus, Trash2, CalendarDays, ListTree, CircleCheck, CircleX, Info, LayoutGrid } from "lucide-react";
import { AdminPackageTripDatesSection, type TripBatchDraft } from "@/components/admin/AdminPackageTripDatesSection";

export type ItineraryDraft = {
  localKey: string;
  id?: string;
  dayNumber: number;
  title: string;
  description: string;
};

export type InclusionDraft = {
  localKey: string;
  id?: string;
  description: string;
  type: "included" | "excluded";
};

export type OtherInfoDraft = {
  localKey: string;
  id?: string;
  sectionTitle: string;
  /** One bullet per line */
  itemsText: string;
};

export type CustomTabDraft = {
  localKey: string;
  label: string;
  body: string;
};

function newLocalKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const tabTriggerClass =
  "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground data-[state=active]:text-foreground sm:px-4 sm:py-3 sm:text-sm shrink-0";

const MAX_CUSTOM_TABS = 10;

export function AdminPackageTripPageTabsEditor({
  durationDays,
  tripBatches,
  onTripBatchesChange,
  basePriceHint,
  itinerary,
  onItineraryChange,
  inclusions,
  onInclusionsChange,
  otherSections,
  onOtherSectionsChange,
  customTabs,
  onCustomTabsChange,
}: {
  durationDays: number;
  tripBatches: TripBatchDraft[];
  onTripBatchesChange: (b: TripBatchDraft[]) => void;
  basePriceHint: number;
  itinerary: ItineraryDraft[];
  onItineraryChange: (rows: ItineraryDraft[]) => void;
  inclusions: InclusionDraft[];
  onInclusionsChange: (rows: InclusionDraft[]) => void;
  otherSections: OtherInfoDraft[];
  onOtherSectionsChange: (rows: OtherInfoDraft[]) => void;
  customTabs: CustomTabDraft[];
  onCustomTabsChange: (rows: CustomTabDraft[]) => void;
}) {
  const updateItinerary = (localKey: string, patch: Partial<ItineraryDraft>) => {
    onItineraryChange(itinerary.map((r) => (r.localKey === localKey ? { ...r, ...patch } : r)));
  };

  const removeItinerary = (localKey: string) => {
    onItineraryChange(itinerary.filter((r) => r.localKey !== localKey));
  };

  const addItineraryDay = () => {
    const nextNum =
      itinerary.length === 0 ? 0 : Math.max(...itinerary.map((d) => d.dayNumber), -1) + 1;
    onItineraryChange([
      ...itinerary,
      { localKey: newLocalKey(), dayNumber: nextNum, title: "", description: "" },
    ]);
  };

  const updateInclusion = (localKey: string, patch: Partial<InclusionDraft>) => {
    onInclusionsChange(inclusions.map((r) => (r.localKey === localKey ? { ...r, ...patch } : r)));
  };

  const removeInclusion = (localKey: string) => {
    onInclusionsChange(inclusions.filter((r) => r.localKey !== localKey));
  };

  const addInclusion = (type: "included" | "excluded") => {
    onInclusionsChange([...inclusions, { localKey: newLocalKey(), description: "", type }]);
  };

  const updateOther = (localKey: string, patch: Partial<OtherInfoDraft>) => {
    onOtherSectionsChange(otherSections.map((r) => (r.localKey === localKey ? { ...r, ...patch } : r)));
  };

  const removeOther = (localKey: string) => {
    onOtherSectionsChange(otherSections.filter((r) => r.localKey !== localKey));
  };

  const addOtherSection = () => {
    onOtherSectionsChange([
      ...otherSections,
      { localKey: newLocalKey(), sectionTitle: "", itemsText: "" },
    ]);
  };

  const updateCustom = (localKey: string, patch: Partial<CustomTabDraft>) => {
    onCustomTabsChange(customTabs.map((r) => (r.localKey === localKey ? { ...r, ...patch } : r)));
  };

  const removeCustom = (localKey: string) => {
    onCustomTabsChange(customTabs.filter((r) => r.localKey !== localKey));
  };

  const addCustomTab = () => {
    if (customTabs.length >= MAX_CUSTOM_TABS) return;
    onCustomTabsChange([
      ...customTabs,
      { localKey: newLocalKey(), label: "New tab", body: "" },
    ]);
  };

  const includedList = inclusions.filter((i) => i.type === "included");
  const excludedList = inclusions.filter((i) => i.type === "excluded");

  return (
    <Tabs defaultValue="itinerary" className="w-full">
      <TabsList
        className={cn(
          "h-auto w-full min-w-0 flex-nowrap justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0 [-webkit-overflow-scrolling:touch]"
        )}
      >
        <TabsTrigger value="itinerary" className={tabTriggerClass}>
          <span className="inline-flex items-center gap-1.5">
            <ListTree className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
            Itinerary
          </span>
        </TabsTrigger>
        <TabsTrigger value="dates" className={tabTriggerClass}>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
            Dates &amp; costing
          </span>
        </TabsTrigger>
        <TabsTrigger value="inclusions" className={tabTriggerClass}>
          <span className="inline-flex items-center gap-1.5">
            <CircleCheck className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
            Inclusions
          </span>
        </TabsTrigger>
        <TabsTrigger value="other" className={tabTriggerClass}>
          <span className="inline-flex items-center gap-1.5">
            <Info className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
            Other info
          </span>
        </TabsTrigger>
        {customTabs.map((tab, i) => (
          <TabsTrigger key={tab.localKey} value={`custom-${tab.localKey}`} className={tabTriggerClass}>
            <span className="inline-flex max-w-[7rem] items-center gap-1.5 truncate sm:max-w-[10rem]">
              <LayoutGrid className="hidden h-3.5 w-3.5 shrink-0 sm:inline" aria-hidden />
              {tab.label.trim() || `Custom ${i + 1}`}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="itinerary" className="mt-4 space-y-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          Matches the public trip page: one card per day. Guests see this under <strong>Itinerary</strong>.
        </p>
        {itinerary.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
            No days yet. Add a day to describe the schedule.
          </p>
        ) : (
          <div className="space-y-3">
            {itinerary.map((day) => (
              <div
                key={day.localKey}
                className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">Day block</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => removeItinerary(day.localKey)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Day #</Label>
                    <Input
                      type="number"
                      min={0}
                      value={day.dayNumber}
                      onChange={(e) =>
                        updateItinerary(day.localKey, {
                          dayNumber: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={day.title}
                      onChange={(e) => updateItinerary(day.localKey, { title: e.target.value })}
                      placeholder="e.g. Travel day, Local sightseeing"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={day.description}
                    onChange={(e) => updateItinerary(day.localKey, { description: e.target.value })}
                    rows={4}
                    placeholder="What happens this day — meals, sights, timing…"
                    className="min-h-[88px] resize-y text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addItineraryDay}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add day
        </Button>
      </TabsContent>

      <TabsContent value="dates" className="mt-4 space-y-2">
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          Same data as the <strong>Dates &amp; costing</strong> grid on the live trip page.
        </p>
        <AdminPackageTripDatesSection
          embedded
          durationDays={durationDays}
          batches={tripBatches}
          onChange={onTripBatchesChange}
          basePriceHint={basePriceHint}
        />
      </TabsContent>

      <TabsContent value="inclusions" className="mt-4 space-y-5">
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          Included and excluded lines appear in two lists on the public page.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden />
              Included
            </h4>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addInclusion("included")}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {includedList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No included lines yet.</p>
          ) : (
            <div className="space-y-2">
              {includedList.map((row) => (
                <div key={row.localKey} className="flex gap-2 rounded-lg border border-border/70 bg-muted/15 p-2">
                  <Textarea
                    value={row.description}
                    onChange={(e) => updateInclusion(row.localKey, { description: e.target.value })}
                    rows={2}
                    placeholder="What's included"
                    className="min-h-[60px] flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-destructive"
                    onClick={() => removeInclusion(row.localKey)}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
              <CircleX className="h-3.5 w-3.5" aria-hidden />
              Excluded
            </h4>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addInclusion("excluded")}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {excludedList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No excluded lines yet.</p>
          ) : (
            <div className="space-y-2">
              {excludedList.map((row) => (
                <div key={row.localKey} className="flex gap-2 rounded-lg border border-border/70 bg-muted/15 p-2">
                  <Textarea
                    value={row.description}
                    onChange={(e) => updateInclusion(row.localKey, { description: e.target.value })}
                    rows={2}
                    placeholder="Not included"
                    className="min-h-[60px] flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-destructive"
                    onClick={() => removeInclusion(row.localKey)}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="other" className="mt-4 space-y-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          Each block has a heading and bullet lines (one per line in the box below).
        </p>
        {otherSections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
            No sections. Add one for things like “Things to carry”, “Notes”, etc.
          </p>
        ) : (
          <div className="space-y-3">
            {otherSections.map((sec) => (
              <div key={sec.localKey} className="rounded-xl border border-border/80 bg-card p-3 sm:p-4">
                <div className="mb-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => removeOther(sec.localKey)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove section
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Section title</Label>
                  <Input
                    value={sec.sectionTitle}
                    onChange={(e) => updateOther(sec.localKey, { sectionTitle: e.target.value })}
                    placeholder="e.g. Things to carry"
                    className="h-9"
                  />
                </div>
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Bullet lines (one per line)</Label>
                  <Textarea
                    value={sec.itemsText}
                    onChange={(e) => updateOther(sec.localKey, { itemsText: e.target.value })}
                    rows={5}
                    className="min-h-[100px] text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addOtherSection}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add section
        </Button>
      </TabsContent>

      {customTabs.map((tab) => (
        <TabsContent key={tab.localKey} value={`custom-${tab.localKey}`} className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              This tab appears on the live trip page after the standard tabs.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => removeCustom(tab.localKey)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Remove tab
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tab label (shown in the bar)</Label>
            <Input
              value={tab.label}
              onChange={(e) => updateCustom(tab.localKey, { label: e.target.value })}
              placeholder="e.g. FAQ, Visa, Packing"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea
              value={tab.body}
              onChange={(e) => updateCustom(tab.localKey, { body: e.target.value })}
              rows={8}
              placeholder="Write what visitors should see in this tab…"
              className="min-h-[160px] text-sm"
            />
          </div>
        </TabsContent>
      ))}

      <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground sm:text-xs">
          Custom tabs: {customTabs.length} / {MAX_CUSTOM_TABS}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          disabled={customTabs.length >= MAX_CUSTOM_TABS}
          onClick={addCustomTab}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add custom tab
        </Button>
      </div>
    </Tabs>
  );
}
