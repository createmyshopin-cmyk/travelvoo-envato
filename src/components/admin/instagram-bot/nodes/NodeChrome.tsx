"use client";

import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NodeChromeProps = {
  children: React.ReactNode;
  className?: string;
  onDuplicate?: () => void;
  onDelete?: () => void;
};

/** Floating actions for flow nodes (duplicate / delete). Stops propagation so the canvas does not start a drag. */
export function NodeChrome({ children, className, onDuplicate, onDelete }: NodeChromeProps) {
  const showBar = Boolean(onDuplicate || onDelete);
  return (
    <div className={cn("relative", className)}>
      {showBar ? (
      <div
        className="absolute -top-1 right-0 z-10 flex gap-0.5"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-6 w-6 shrink-0 shadow-sm"
          title="Duplicate node"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate?.();
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-6 w-6 shrink-0 text-destructive shadow-sm"
          title="Delete node"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      ) : null}
      {children}
    </div>
  );
}
