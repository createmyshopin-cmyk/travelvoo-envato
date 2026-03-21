import { useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Trash2, GripVertical } from "lucide-react";

interface SortablePhotoGridProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  showCoverBadge?: boolean;
  columns?: number;
}

export function SortablePhotoGrid({
  photos,
  onChange,
  showCoverBadge = true,
  columns = 3,
}: SortablePhotoGridProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const touchState = useRef<{
    idx: number;
    startX: number;
    startY: number;
    el: HTMLElement | null;
    clone: HTMLElement | null;
    moved: boolean;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = [...photos];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
    [photos, onChange]
  );

  // HTML5 Drag (desktop)
  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  };

  const onDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
    reorder(from, idx);
    setDragIdx(null);
    setOverIdx(null);
  };

  // Touch (mobile)
  const getIdxFromPoint = (x: number, y: number): number | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const children = Array.from(grid.children) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return i;
      }
    }
    return null;
  };

  const onTouchStart = (e: React.TouchEvent, idx: number) => {
    const touch = e.touches[0];
    const el = e.currentTarget as HTMLElement;
    touchState.current = {
      idx,
      startX: touch.clientX,
      startY: touch.clientY,
      el,
      clone: null,
      moved: false,
    };
  };

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const ts = touchState.current;
      if (!ts) return;

      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - ts.startX);
      const dy = Math.abs(touch.clientY - ts.startY);

      if (!ts.moved && dx + dy > 8) {
        ts.moved = true;
        setDragIdx(ts.idx);
        const clone = ts.el!.cloneNode(true) as HTMLElement;
        clone.style.position = "fixed";
        clone.style.zIndex = "9999";
        clone.style.pointerEvents = "none";
        clone.style.opacity = "0.85";
        clone.style.width = `${ts.el!.offsetWidth}px`;
        clone.style.transform = "scale(1.05)";
        clone.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)";
        clone.style.borderRadius = "8px";
        document.body.appendChild(clone);
        ts.clone = clone;
        ts.el!.style.opacity = "0.3";
      }

      if (ts.moved && ts.clone) {
        e.preventDefault();
        ts.clone.style.left = `${touch.clientX - ts.clone.offsetWidth / 2}px`;
        ts.clone.style.top = `${touch.clientY - ts.clone.offsetHeight / 2}px`;
        const hoverIdx = getIdxFromPoint(touch.clientX, touch.clientY);
        setOverIdx(hoverIdx);
      }
    },
    []
  );

  const onTouchEnd = useCallback(() => {
    const ts = touchState.current;
    if (!ts) return;

    if (ts.clone) {
      document.body.removeChild(ts.clone);
    }
    if (ts.el) {
      ts.el.style.opacity = "1";
    }
    if (ts.moved && overIdx !== null && overIdx !== ts.idx) {
      reorder(ts.idx, overIdx);
    }
    touchState.current = null;
    setDragIdx(null);
    setOverIdx(null);
  }, [overIdx, reorder]);

  const remove = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  if (photos.length === 0) return null;

  return (
    <div
      ref={gridRef}
      className={`grid gap-2`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {photos.map((url, i) => (
        <div
          key={`${url}-${i}`}
          draggable
          onDragStart={(e) => onDragStart(e, i)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => onDragOver(e, i)}
          onDrop={(e) => onDrop(e, i)}
          onTouchStart={(e) => onTouchStart(e, i)}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`relative group aspect-video rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing transition-all select-none ${
            overIdx === i && dragIdx !== null && dragIdx !== i
              ? "ring-2 ring-primary ring-offset-1 scale-[1.02]"
              : ""
          } ${dragIdx === i ? "opacity-40" : ""}`}
        >
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          {/* Drag handle overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute top-1 left-1 bg-black/50 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          {showCoverBadge && i === 0 && (
            <Badge className="absolute bottom-1 left-1 text-[9px]">Cover</Badge>
          )}
          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
