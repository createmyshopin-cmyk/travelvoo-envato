"use client";

import { useMemo, useState, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  format,
  eachDayOfInterval,
  parseISO,
  addDays,
  startOfDay,
  getDay,
  isBefore,
} from "date-fns";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import type { DateRange, DayContentProps } from "react-day-picker";
import { cn } from "@/lib/utils";

/** Same multipliers as BookingCalendar / AdminCalendar — for “default” rate hint on empty days */
export function getDefaultTripDayPrice(date: Date, basePrice: number): number {
  const day = getDay(date);
  if (day === 0 || day === 6) return Math.round(basePrice * 1.3);
  if (day === 5) return Math.round(basePrice * 1.15);
  return basePrice;
}

export type TripBatchDraft = {
  localKey: string;
  id?: string;
  startDate: string;
  endDate: string;
  price: number;
  status: "available" | "sold_out" | "few_left";
};

function buildDateRateMap(batches: TripBatchDraft[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const b of batches) {
    try {
      const start = parseISO(b.startDate);
      const end = parseISO(b.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) continue;
      eachDayOfInterval({ start, end }).forEach((d) => {
        m.set(format(d, "yyyy-MM-dd"), b.price);
      });
    } catch {
      /* ignore */
    }
  }
  return m;
}

export function AdminPackageTripDatesSection({
  durationDays,
  batches,
  onChange,
  basePriceHint,
  /** When true, no outer card/title (parent provides section chrome, e.g. timeline) */
  embedded = false,
}: {
  durationDays: number;
  batches: TripBatchDraft[];
  onChange: (next: TripBatchDraft[]) => void;
  basePriceHint: number;
  embedded?: boolean;
}) {
  const { format: fmtMoney, formatCompact } = useCurrency();
  /** Range: pick start then end for custom length; single day uses package Days for span */
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [newBatchPrice, setNewBatchPrice] = useState("");
  const [newStatus, setNewStatus] = useState<TripBatchDraft["status"]>("available");

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const rateMap = useMemo(() => buildDateRateMap(batches), [batches]);

  const DayPriceCell = useCallback(
    (props: DayContentProps) => {
      const dayStart = startOfDay(props.date);
      const isPastDay = isBefore(dayStart, todayStart);
      const ds = format(props.date, "yyyy-MM-dd");
      const batchPrice = isPastDay ? undefined : rateMap.get(ds);
      const hint =
        batchPrice ??
        (isPastDay
          ? undefined
          : basePriceHint > 0
            ? getDefaultTripDayPrice(props.date, basePriceHint)
            : undefined);
      const isLive = batchPrice != null;

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center w-full gap-0 leading-tight py-0.5",
            isPastDay && "opacity-40"
          )}
        >
          <span className={cn("text-[13px] font-medium", isPastDay && "text-muted-foreground")}>
            {props.date.getDate()}
          </span>
          {hint != null && (
            <span
              className={cn(
                "text-[8px] font-bold tabular-nums max-w-[38px] truncate",
                isLive ? "text-primary" : "text-muted-foreground"
              )}
              title={isLive ? "Batch rate" : "Default calendar rate (hint)"}
            >
              {formatCompact(hint)}
            </span>
          )}
        </div>
      );
    },
    [rateMap, basePriceHint, formatCompact, todayStart]
  );

  const days = Math.max(1, durationDays || 2);

  const addBatch = () => {
    if (!range?.from) return;
    let start = startOfDay(range.from);
    let end = range.to ? startOfDay(range.to) : addDays(start, days - 1);
    if (isBefore(end, start)) {
      const t = start;
      start = end;
      end = t;
    }
    if (isBefore(start, todayStart)) {
      return;
    }
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const parsed = parseFloat(newBatchPrice);
    const price =
      !Number.isNaN(parsed) && parsed >= 0
        ? parsed
        : basePriceHint > 0
          ? basePriceHint
          : 0;

    onChange([
      ...batches,
      {
        localKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}`,
        startDate: startStr,
        endDate: endStr,
        price,
        status: newStatus,
      },
    ]);
    setRange(undefined);
    setNewBatchPrice("");
  };

  const removeBatch = (key: string) => {
    onChange(batches.filter((b) => b.localKey !== key));
  };

  const updateBatchPrice = (key: string, priceStr: string) => {
    const p = parseFloat(priceStr);
    if (Number.isNaN(p) || p < 0) return;
    onChange(batches.map((b) => (b.localKey === key ? { ...b, price: p } : b)));
  };

  const updateBatchStatus = (key: string, status: TripBatchDraft["status"]) => {
    onChange(batches.map((b) => (b.localKey === key ? { ...b, status } : b)));
  };

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "space-y-3 rounded-lg border bg-muted/20 p-3"
      }
    >
      {!embedded && (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          Departure batches &amp; calendar rates
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Add <strong>multiple departure packages</strong>: each batch is one bookable window.{" "}
        <strong className="text-foreground">Click a start date</strong>, then{" "}
        <strong className="text-foreground">click an end date</strong> for a custom trip length, or click{" "}
        <strong>Add batch</strong> after only the start to use <strong>{days}</strong> day
        {days !== 1 ? "s" : ""} from the package <strong>Days</strong> field. Past dates are disabled and
        rates are hidden there. On future days: <strong className="text-primary">live batch rates</strong>{" "}
        and muted <strong>weekend hints</strong> (Fri ×1.15, Sat–Sun ×1.3).
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border bg-background p-1 overflow-x-auto">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            fromDate={todayStart}
            fromMonth={todayStart}
            defaultMonth={todayStart}
            className="mx-auto w-fit"
            components={{
              DayContent: DayPriceCell,
            }}
          />
        </div>

        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Price / person (new batch)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={newBatchPrice}
                onChange={(e) => setNewBatchPrice(e.target.value)}
                placeholder={basePriceHint > 0 ? String(Math.round(basePriceHint)) : "0"}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TripBatchDraft["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="few_left">Few left</SelectItem>
                  <SelectItem value="sold_out">Sold out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={addBatch}
            disabled={!range?.from}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add departure batch
          </Button>
          {range?.from && !range.to && (
            <p className="text-[10px] text-muted-foreground text-center">
              End not selected — batch will use <strong>{days}</strong> day{days !== 1 ? "s" : ""} from start.
            </p>
          )}

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {batches.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No batches yet — select a future start (and optional end) on the calendar.
              </p>
            ) : (
              batches.map((b) => (
                <div
                  key={b.localKey}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-2 py-2 text-xs"
                >
                  <span className="font-mono text-[10px] sm:text-xs shrink-0">
                    {b.startDate} → {b.endDate}
                  </span>
                  <Input
                    key={`${b.localKey}-price-${b.price}`}
                    className="h-8 w-24 text-xs"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={String(b.price)}
                    onBlur={(e) => updateBatchPrice(b.localKey, e.target.value)}
                  />
                  <Select
                    value={b.status}
                    onValueChange={(v) => updateBatchStatus(b.localKey, v as TripBatchDraft["status"])}
                  >
                    <SelectTrigger className="h-8 w-[110px] text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="few_left">Few left</SelectItem>
                      <SelectItem value="sold_out">Sold out</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground hidden sm:inline">{fmtMoney(b.price)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 ml-auto"
                    onClick={() => removeBatch(b.localKey)}
                    aria-label="Remove batch"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
