import { useState, useMemo, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  isAfter,
  isWithinInterval,
  format,
  getDay,
} from "date-fns";
import { cn } from "@/lib/utils";

export interface DatePricing {
  date: Date;
  price: number;
  originalPrice?: number;
  minNights?: number;
  unavailable?: boolean;
}

interface BookingCalendarProps {
  checkIn?: Date;
  checkOut?: Date;
  onRangeChange: (checkIn: Date | undefined, checkOut: Date | undefined) => void;
  basePrice: number;
  customPricing?: DatePricing[];
  unavailableDates?: Date[];
  minNightsError?: string;
  isBookedDate?: (date: Date) => boolean;
  isCooldownDate?: (date: Date) => boolean;
  cooldownMinutes?: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDefaultPrice = (date: Date, basePrice: number): number => {
  const day = getDay(date);
  if (day === 0 || day === 6) return Math.round(basePrice * 1.3);
  if (day === 5) return Math.round(basePrice * 1.15);
  return basePrice;
};

const BookingCalendar = ({
  checkIn,
  checkOut,
  onRangeChange,
  basePrice,
  customPricing,
  unavailableDates = [],
  minNightsError,
  isBookedDate,
  isCooldownDate,
  cooldownMinutes = 0,
}: BookingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => checkIn || new Date());
  const [direction, setDirection] = useState(0);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const lastVibratedDate = useRef<string | null>(null);

  const vibrate = (ms = 10) => {
    if (navigator.vibrate) navigator.vibrate(ms);
  };
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isUnavailable = useCallback(
    (date: Date) => unavailableDates.some((d) => isSameDay(d, date)),
    [unavailableDates]
  );

  const getCustomEntry = useCallback(
    (date: Date): DatePricing | undefined => {
      return customPricing?.find((p) => isSameDay(p.date, date));
    },
    [customPricing]
  );

  const getPriceForDate = useCallback(
    (date: Date) => {
      const custom = getCustomEntry(date);
      if (custom) return custom.price;
      return getDefaultPrice(date, basePrice);
    },
    [basePrice, getCustomEntry]
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentMonth]);

  const hasBlockedBetween = useCallback(
    (a: Date, b: Date) => {
      const [from, to] = isBefore(a, b) ? [a, b] : [b, a];
      let d = addDays(from, 1);
      while (isBefore(d, to)) {
        if (isUnavailable(d)) return true;
        d = addDays(d, 1);
      }
      return false;
    },
    [isUnavailable]
  );

  const handleDateClick = (date: Date) => {
    if (isUnavailable(date) || isBefore(date, today)) return;
    if (!checkIn || (checkIn && checkOut)) {
      const nextDay = addDays(date, 1);
      onRangeChange(date, isUnavailable(nextDay) ? undefined : nextDay);
    } else {
      if (isSameDay(date, checkIn) || isBefore(date, checkIn)) {
        const nextDay = addDays(date, 1);
        onRangeChange(date, isUnavailable(nextDay) ? undefined : nextDay);
      } else if (hasBlockedBetween(checkIn, date)) {
        return;
      } else {
        onRangeChange(checkIn, date);
      }
    }
  };

  const startDrag = (date: Date) => {
    if (isUnavailable(date) || isBefore(date, today)) return;
    isDragging.current = true;
    didDrag.current = false;
    lastVibratedDate.current = date.toISOString();
    vibrate(15);
    setDragStart(date);
    setDragEnd(date);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging.current || !dragStart) return;
    const el = document.elementFromPoint(clientX, clientY);
    if (el) {
      const dateStr = el.getAttribute("data-date");
      if (dateStr && dateStr !== lastVibratedDate.current) {
        const d = new Date(dateStr);
        if (!isUnavailable(d) && !isBefore(d, today) && !hasBlockedBetween(dragStart, d)) {
          if (!isSameDay(d, dragStart)) didDrag.current = true;
          lastVibratedDate.current = dateStr;
          vibrate(8);
          setDragEnd(d);
        }
      }
    }
  };

  const endDrag = () => {
    if (!isDragging.current || !dragStart) return;
    isDragging.current = false;
    if (didDrag.current && dragEnd && !isSameDay(dragStart, dragEnd)) {
      const [from, to] = isBefore(dragStart, dragEnd) ? [dragStart, dragEnd] : [dragEnd, dragStart];
      onRangeChange(from, to);
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => moveDrag(e.touches[0].clientX, e.touches[0].clientY);

  const [dragActive, setDragActive] = useState(false);

  const wrappedStartDrag = (date: Date) => { startDrag(date); setDragActive(true); };
  const wrappedEndDrag = () => { endDrag(); setDragActive(false); };

  const wrappedTouchStart = (date: Date) => wrappedStartDrag(date);
  const wrappedTouchEnd = () => wrappedEndDrag();
  const wrappedMouseDown = (date: Date) => wrappedStartDrag(date);
  const wrappedMouseUp = () => wrappedEndDrag();
  const handleMouseEnter = (date: Date) => {
    if (!isDragging.current || !dragStart) return;
    if (!isSameDay(date, dragStart)) didDrag.current = true;
    if (!isUnavailable(date) && !isBefore(date, today) && !hasBlockedBetween(dragStart, date)) {
      setDragEnd(date);
    }
  };

  const selStart = dragActive && dragStart && dragEnd
    ? (isBefore(dragStart, dragEnd) ? dragStart : dragEnd)
    : checkIn;
  const selEnd = dragActive && dragStart && dragEnd
    ? (isBefore(dragStart, dragEnd) ? dragEnd : dragStart)
    : checkOut;

  const isDragPreview = dragActive && dragStart && dragEnd && !isSameDay(dragStart, dragEnd);

  const isInRange = (date: Date) => {
    if (!selStart || !selEnd) return false;
    return isWithinInterval(date, { start: selStart, end: selEnd });
  };

  const isStart = (date: Date) => selStart && isSameDay(date, selStart);
  const isEnd = (date: Date) => selEnd && isSameDay(date, selEnd);
  const isDragEndDate = (date: Date) => dragActive && dragEnd && isSameDay(date, dragEnd);

  const nextMonth = () => { setDirection(1); setCurrentMonth((m) => addMonths(m, 1)); };
  const prevMonth = () => { setDirection(-1); setCurrentMonth((m) => subMonths(m, 1)); };

  const nightBreakdown = useMemo(() => {
    if (!checkIn || !checkOut) return [];
    const nights: { date: Date; price: number; originalPrice?: number }[] = [];
    let d = checkIn;
    while (isBefore(d, checkOut)) {
      const entry = getCustomEntry(d);
      nights.push({
        date: d,
        price: entry?.price ?? getDefaultPrice(d, basePrice),
        originalPrice: entry?.originalPrice,
      });
      d = addDays(d, 1);
    }
    return nights;
  }, [checkIn, checkOut, getCustomEntry, basePrice]);

  const totalNights = nightBreakdown.length;
  const dynamicTotal = nightBreakdown.reduce((sum, n) => sum + n.price, 0);
  const hasDiscount = nightBreakdown.some((n) => n.originalPrice && n.originalPrice > n.price);
  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth();

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <span className="text-sm font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Min nights warning */}
      <AnimatePresence>
        {minNightsError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          >
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{minNightsError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={format(currentMonth, "yyyy-MM")}
          custom={direction}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -60 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-y-0.5 select-none"
          onTouchMove={handleTouchMove}
          onTouchEnd={wrappedTouchEnd}
          onMouseUp={wrappedMouseUp}
          onMouseLeave={wrappedMouseUp}
        >
          {calendarDays.map((date, i) => {
            const isPast = isBefore(date, today);
            const blocked = isUnavailable(date);
            const outsideMonth = !isCurrentMonth(date);
            const booked = isBookedDate?.(date) ?? false;
            const cooldown = isCooldownDate?.(date) ?? false;
            const disabled = isPast || blocked || outsideMonth;
            const price = getPriceForDate(date);
            const custom = getCustomEntry(date);
            const hasOriginalPrice = custom?.originalPrice && custom.originalPrice > custom.price;
            const minNights = custom?.minNights;
            const isToday = isSameDay(date, today);
            const inRange = isInRange(date);
            const start = isStart(date);
            const end = isEnd(date);
            const dragEnd_ = isDragEndDate(date);
            const inDragPreview = isDragPreview && inRange && !start && !end;
            const isWeekend = getDay(date) === 0 || getDay(date) === 6;

            return (
              <motion.button
                key={i}
                type="button"
                data-date={date.toISOString()}
                disabled={disabled}
                onClick={() => !disabled && handleDateClick(date)}
                onTouchStart={() => !disabled && wrappedTouchStart(date)}
                onMouseDown={(e) => { e.preventDefault(); !disabled && wrappedMouseDown(date); }}
                onMouseEnter={() => !disabled && handleMouseEnter(date)}
                animate={{
                  scale: dragEnd_ ? 1.15 : inDragPreview ? 1.04 : 1,
                  backgroundColor: start || end
                    ? "hsl(var(--primary))"
                    : inDragPreview
                    ? "hsl(var(--primary) / 0.15)"
                    : inRange && !start && !end
                    ? "hsl(var(--primary) / 0.1)"
                    : "transparent",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
                className={cn(
                  "relative flex flex-col items-center justify-center min-h-[48px] min-w-[40px] py-1 text-xs select-none",
                  outsideMonth && "opacity-0 pointer-events-none",
                  disabled && !outsideMonth && "opacity-40 cursor-not-allowed",
                  (start || end) && "text-primary-foreground rounded-xl font-bold",
                  start && !end && "rounded-l-xl",
                  end && !start && "rounded-r-xl",
                )}
              >
                {/* Today dot */}
                {isToday && !start && !end && (
                  <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}

                {/* Booked overlay */}
                {booked && !outsideMonth && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-[70%] h-[1px] bg-red-400/60 rotate-45 absolute" />
                  </span>
                )}

                {/* Cooldown overlay */}
                {cooldown && !booked && !outsideMonth && (
                  <span className="absolute inset-0 pointer-events-none">
                    <span className="absolute inset-0 bg-amber-400/8 rounded" />
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400/30 rounded-b" />
                  </span>
                )}

                {/* Blocked overlay (pricing) */}
                {blocked && !booked && !cooldown && !outsideMonth && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-[70%] h-[1px] bg-destructive/40 rotate-45 absolute" />
                  </span>
                )}

                {/* Date number */}
                <span className={cn(
                  "text-[13px] leading-none font-semibold",
                  isToday && !start && !end && "text-primary",
                  !start && !end && !disabled && !isToday && "text-foreground",
                )}>
                  {date.getDate()}
                </span>

                {/* Price */}
                {!disabled && !outsideMonth && (
                  <span className="flex items-center gap-0.5 mt-0.5">
                    {hasOriginalPrice && (
                      <span className={cn(
                        "text-[7px] leading-none line-through",
                        start || end ? "text-primary-foreground/50" : "text-muted-foreground/60"
                      )}>
                        ₹{custom!.originalPrice!.toLocaleString("en-IN")}
                      </span>
                    )}
                    <span className={cn(
                      "text-[8px] leading-none font-medium",
                      start || end
                        ? "text-primary-foreground/80"
                        : hasOriginalPrice
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isWeekend
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-price-low"
                    )}>
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                  </span>
                )}

                {/* Min nights badge */}
                {minNights && minNights > 1 && !disabled && !outsideMonth && !start && !end && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1 rounded-sm leading-tight">
                    {minNights}N min
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Night count & pricing summary */}
      {totalNights > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted rounded-xl p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              {format(checkIn!, "dd MMM")} → {format(checkOut!, "dd MMM")}
            </span>
            <span className="text-xs font-bold text-primary">{totalNights} {totalNights === 1 ? "night" : "nights"}</span>
          </div>

          <div className="space-y-1">
            {nightBreakdown.slice(0, 5).map((n, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{format(n.date, "EEE, dd MMM")}</span>
                <span className="flex items-center gap-1.5">
                  {n.originalPrice && n.originalPrice > n.price && (
                    <span className="text-muted-foreground/60 line-through text-[10px]">
                      ₹{n.originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span className={cn(
                    "font-semibold",
                    n.originalPrice && n.originalPrice > n.price
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-price-low"
                  )}>
                    ₹{n.price.toLocaleString("en-IN")}/night
                  </span>
                </span>
              </div>
            ))}
            {nightBreakdown.length > 5 && (
              <p className="text-[10px] text-muted-foreground">+{nightBreakdown.length - 5} more nights</p>
            )}
          </div>

          {hasDiscount && (
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">You save</span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                ₹{nightBreakdown.reduce((s, n) => s + ((n.originalPrice && n.originalPrice > n.price ? n.originalPrice - n.price : 0)), 0).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          <div className="border-t border-border pt-2 flex justify-between">
            <span className="text-xs font-bold text-foreground">Avg per night</span>
            <span className="text-xs font-extrabold text-primary">
              ₹{Math.round(dynamicTotal / totalNights).toLocaleString("en-IN")}/night
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BookingCalendar;
export { getDefaultPrice };
