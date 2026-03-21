"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NodeChrome } from "./NodeChrome";

export type TriggerNodeData = {
  channel?: string;
  updateNode?: (id: string, patch: Record<string, unknown>) => void;
  deleteNode?: (id: string) => void;
  duplicateNode?: (id: string) => void;
};

export function TriggerNode({ id, data }: NodeProps) {
  const d = data as TriggerNodeData & { _heatCount?: number };
  const channel = d.channel ?? "dm";
  const heat = typeof d._heatCount === "number" && d._heatCount > 0 ? d._heatCount : null;

  return (
    <NodeChrome
      onDuplicate={d.duplicateNode ? () => d.duplicateNode!(id) : undefined}
      onDelete={d.deleteNode ? () => d.deleteNode!(id) : undefined}
    >
      <div
        className={`relative rounded-lg border border-violet-500/40 bg-card px-3 py-2 shadow-md min-w-[180px] ${d.duplicateNode || d.deleteNode ? "pt-6" : "pt-2"}`}
      >
        {heat != null ? (
          <div className="absolute -left-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow z-[5]">
            {heat}
          </div>
        ) : null}
        <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">Trigger</div>
      <Label className="text-[10px] text-muted-foreground">Channel</Label>
      <Select
        value={channel}
        onValueChange={(v) => d.updateNode?.(id, { channel: v })}
      >
        <SelectTrigger className="mt-1 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dm">DM</SelectItem>
          <SelectItem value="comment">Comment</SelectItem>
          <SelectItem value="story">Story</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
        <Handle type="target" position={Position.Left} className="!size-2 !bg-muted-foreground/30" />
        <Handle type="source" position={Position.Right} className="!size-2 !bg-violet-500" />
      </div>
    </NodeChrome>
  );
}
