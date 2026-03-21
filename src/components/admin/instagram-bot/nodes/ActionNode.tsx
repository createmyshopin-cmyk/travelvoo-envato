"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NodeChrome } from "./NodeChrome";

export type ActionNodeData = {
  action?: string;
  template_text?: string;
  url?: string;
  updateNode?: (id: string, patch: Record<string, unknown>) => void;
  deleteNode?: (id: string) => void;
  duplicateNode?: (id: string) => void;
};

export function ActionNode({ id, data }: NodeProps) {
  const d = data as ActionNodeData & { _heatCount?: number };
  const action = d.action ?? "ai_reply";
  const heat = typeof d._heatCount === "number" && d._heatCount > 0 ? d._heatCount : null;

  return (
    <NodeChrome
      onDuplicate={d.duplicateNode ? () => d.duplicateNode!(id) : undefined}
      onDelete={d.deleteNode ? () => d.deleteNode!(id) : undefined}
    >
      <div
        className={`relative rounded-lg border border-emerald-500/40 bg-card px-3 py-2 shadow-md min-w-[200px] ${d.duplicateNode || d.deleteNode ? "pt-6" : "pt-2"}`}
      >
        {heat != null ? (
          <div className="absolute -left-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow z-[5]">
            {heat}
          </div>
        ) : null}
        <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Action</div>
        <Label className="text-[10px] text-muted-foreground">Type</Label>
        <Select value={action} onValueChange={(v) => d.updateNode?.(id, { action: v })}>
          <SelectTrigger className="mt-1 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_reply">AI reply</SelectItem>
            <SelectItem value="template_reply">Template</SelectItem>
            <SelectItem value="send_link">Send link</SelectItem>
            <SelectItem value="suppress">Suppress</SelectItem>
            <SelectItem value="qualify_lead_only">Qualify only</SelectItem>
          </SelectContent>
        </Select>
        {(action === "template_reply" || action === "send_link") && (
          <>
            <Label className="text-[10px] text-muted-foreground mt-2 block">Message</Label>
            <Input
              className="mt-1 h-7 text-xs"
              value={d.template_text ?? ""}
              onChange={(e) => d.updateNode?.(id, { template_text: e.target.value })}
              placeholder="Text…"
            />
          </>
        )}
        {action === "send_link" && (
          <>
            <Label className="text-[10px] text-muted-foreground mt-2 block">URL</Label>
            <Input
              className="mt-1 h-7 text-xs"
              value={d.url ?? ""}
              onChange={(e) => d.updateNode?.(id, { url: e.target.value })}
              placeholder="https://…"
            />
          </>
        )}
        <Handle type="target" position={Position.Left} className="!size-2 !bg-emerald-500" />
      </div>
    </NodeChrome>
  );
}
