import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronLeft, ChevronRight, Zap, Sparkles, Minus, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomCategory } from "@/types/stay";

export interface RoomSelection {
  name: string;
  price: number;
  originalPrice: number;
  count: number;
  selected: boolean;
}

interface Props {
  rooms: RoomCategory[];
  selections: RoomSelection[];
  onSelectionsChange: (selections: RoomSelection[]) => void;
}

const RoomCard = ({
  room,
  selection,
  onToggle,
  onCountChange,
}: {
  room: RoomCategory;
  selection: RoomSelection;
  onToggle: () => void;
  onCountChange: (count: number) => void;
}) => {
  const [imgIdx, setImgIdx] = useState(0);
  const savings = room.originalPrice - room.price;
  const hasSavings = savings > 0;
  const lowAvail = room.available <= 2;
  const isSelected = selection.selected;

  const nextImg = () => setImgIdx((c) => (c + 1) % room.images.length);
  const prevImg = () => setImgIdx((c) => (c - 1 + room.images.length) % room.images.length);

  return (
    <motion.div
      animate={{
        y: isSelected ? -4 : 0,
        boxShadow: isSelected
          ? "0 8px 25px -5px rgba(22, 163, 74, 0.25)"
          : "0 1px 3px 0 rgba(0,0,0,0.1)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "rounded-2xl overflow-hidden border-2 transition-colors duration-200",
        isSelected
          ? "border-savings bg-savings/5"
          : "border-border bg-card"
      )}
    >
      {/* Room image */}
      <div className="relative h-[120px] overflow-hidden" onClick={onToggle}>
        <AnimatePresence mode="wait">
          <motion.img
            key={imgIdx}
            src={room.images[imgIdx]}
            alt={room.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </AnimatePresence>
        {room.images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prevImg(); }} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center">
              <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextImg(); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 text-foreground" />
            </button>
          </>
        )}
        {/* Dots */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
          {room.images.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-primary-foreground w-3" : "bg-primary-foreground/50"}`} />
          ))}
        </div>
        {lowAvail && (
          <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" /> {room.available} left
          </div>
        )}

        {/* Checkbox */}
        <div
          className={cn(
            "absolute top-1.5 right-1.5 w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm",
            isSelected
              ? "bg-savings text-primary-foreground"
              : "bg-background/80 backdrop-blur-sm border border-border"
          )}
        >
          {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-foreground">{room.name}</h3>
          {isSelected && (
            <span className="text-[9px] font-bold text-savings bg-savings/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
              Selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <Users className="w-3 h-3" />
            <span>Max {room.maxGuests}</span>
          </div>
          <span>•</span>
          <span>{room.available} left</span>
        </div>

        {/* Amenities */}
        <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-hide">
          {room.amenities.slice(0, 4).map((a) => (
            <span key={a} className="bg-muted text-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">{a}</span>
          ))}
          {room.amenities.length > 4 && (
            <span className="text-[9px] text-muted-foreground font-medium px-1 py-0.5">+{room.amenities.length - 4}</span>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-center gap-2 mt-2">
          {hasSavings && (
            <span className="text-[11px] text-muted-foreground line-through">₹{room.originalPrice.toLocaleString()}</span>
          )}
          <span className="text-base font-extrabold text-primary">₹{room.price.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">/night</span>
          {hasSavings && (
            <span className="ml-auto inline-flex items-center gap-0.5 bg-savings/10 text-savings text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" />
              -₹{savings.toLocaleString()}
            </span>
          )}
        </div>

        {/* Quantity selector - always visible when selected */}
        <AnimatePresence>
          {isSelected ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between mt-2.5 bg-muted rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-foreground">Rooms</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onCountChange(Math.max(0, selection.count - 1))}
                    className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <motion.span
                    key={selection.count}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-sm font-bold text-foreground w-5 text-center"
                  >
                    {selection.count}
                  </motion.span>
                  <button
                    onClick={() => onCountChange(Math.min(room.available, selection.count + 1))}
                    className="w-7 h-7 rounded-lg bg-savings text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              type="button"
              onClick={onToggle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full mt-2 font-semibold text-xs py-2 rounded-xl border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-savings hover:text-savings active:scale-[0.98] transition-all min-h-[36px]"
            >
              + Add Room
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const RoomCategories = ({ rooms, selections, onSelectionsChange }: Props) => {
  // Selections can momentarily be out of sync with rooms (async fetch + state init),
  // so we normalize to avoid crashing the StayDetails page.
  const normalizedSelections = useMemo<RoomSelection[]>(
    () =>
      (rooms ?? []).map((room, idx) =>
        selections[idx] ?? {
          name: room.name,
          price: room.price,
          originalPrice: room.originalPrice,
          count: 0,
          selected: false,
        }
      ),
    [rooms, selections]
  );

  if (!rooms?.length) return null;

  const toggleRoom = (index: number) => {
    const updated = normalizedSelections.map((s, i) =>
      i === index
        ? { ...s, selected: !s.selected, count: !s.selected ? Math.max(1, s.count) : 0 }
        : s
    );
    onSelectionsChange(updated);
  };

  const updateCount = (index: number, count: number) => {
    const updated = normalizedSelections.map((s, i) =>
      i === index ? { ...s, count, selected: count > 0 } : s
    );
    onSelectionsChange(updated);
  };

  const selectedCount = normalizedSelections.filter((s) => s.selected).length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="text-base font-bold text-foreground">Choose Your Room</h2>
        {selectedCount > 0 && (
          <span className="text-xs font-bold text-savings bg-savings/10 px-2.5 py-1 rounded-full">
            {selectedCount} selected
          </span>
        )}
      </div>
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {rooms.map((room, i) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="min-w-[65%] max-w-[65%] snap-start shrink-0"
          >
            <RoomCard
              room={room}
              selection={normalizedSelections[i]}
              onToggle={() => toggleRoom(i)}
              onCountChange={(nextCount) => updateCount(i, nextCount)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RoomCategories;
