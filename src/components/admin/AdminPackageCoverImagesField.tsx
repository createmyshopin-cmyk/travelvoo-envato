"use client";

import { useCallback, useState, type RefObject } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PackageCoverImage } from "@/lib/packageCoverImage";

export type { PackageCoverImage } from "@/lib/packageCoverImage";
export { newPackageImageId } from "@/lib/packageCoverImage";

function SortableCoverThumb({
  item,
  index,
  onRemove,
}: {
  item: PackageCoverImage;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isCover = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-square rounded-lg border bg-muted overflow-hidden group",
        isDragging && "z-50 opacity-60 shadow-lg ring-2 ring-primary/40"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
      <img src={item.url} alt="" className="h-full w-full object-cover pointer-events-none select-none" />
      {isCover && (
        <Badge className="absolute left-1 top-1 z-[1] text-[10px] px-1.5 py-0 shadow-sm pointer-events-none">
          Cover
        </Badge>
      )}
      <button
        type="button"
        className="absolute left-1 bottom-1 z-[2] h-8 w-8 rounded-md bg-background/95 border shadow flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-background touch-none"
        aria-label="Drag to reorder images"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <button
        type="button"
        className="absolute top-1 right-1 z-[2] h-7 w-7 rounded-full bg-background/95 border shadow flex items-center justify-center opacity-90 hover:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(item.id)}
        aria-label="Remove image"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AdminPackageCoverImagesField({
  items,
  onChange,
  uploading,
  fileInputRef,
  onFilesSelected,
}: {
  items: PackageCoverImage[];
  onChange: (items: PackageCoverImage[]) => void;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange(arrayMove(items, oldIndex, newIndex));
    },
    [items, onChange]
  );

  const onRemove = (id: string) => onChange(items.filter((i) => i.id !== id));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const fl = e.dataTransfer.files;
    if (fl?.length) onFilesSelected(fl);
  };

  const ids = items.map((i) => i.id);

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed p-3 transition-colors",
        dragOver && "border-primary bg-primary/5",
        !dragOver && "border-muted"
      )}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload images
        </Button>
        <span className="text-xs text-muted-foreground">
          Drop files in this box · use the grip to reorder (first = cover / hero)
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No images yet — upload or drop here.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((item, index) => (
                <SortableCoverThumb key={item.id} item={item} index={index} onRemove={onRemove} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
