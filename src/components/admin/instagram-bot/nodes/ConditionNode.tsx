"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NodeChrome } from "./NodeChrome";

export type ConditionNodeData = {
  conditionType?: string;
  match?: string;
  match_type?: string;
  case_sensitive?: boolean;
  require_follower?: boolean;
  else_message?: string;
  timezone?: string;
  window_start?: string;
  window_end?: string;
  window_days?: string;
  updateNode?: (id: string, patch: Record<string, unknown>) => void;
  deleteNode?: (id: string) => void;
  duplicateNode?: (id: string) => void;
};

export function ConditionNode({ id, data }: NodeProps) {
  const d = data as ConditionNodeData & { _heatCount?: number };
  const conditionType = d.conditionType ?? "keyword";
  const heat = typeof d._heatCount === "number" && d._heatCount > 0 ? d._heatCount : null;

  return (
    <NodeChrome
      onDuplicate={d.duplicateNode ? () => d.duplicateNode!(id) : undefined}
      onDelete={d.deleteNode ? () => d.deleteNode!(id) : undefined}
    >
      <div
        className={`relative rounded-lg border border-amber-500/40 bg-card px-3 py-2 shadow-md min-w-[220px] max-w-[280px] ${d.duplicateNode || d.deleteNode ? "pt-6" : "pt-2"}`}
      >
        {heat != null ? (
          <div className="absolute -left-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow z-[5]">
            {heat}
          </div>
        ) : null}
        <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Condition</div>
      <Label className="text-[10px] text-muted-foreground">Type</Label>
      <Select value={conditionType} onValueChange={(v) => d.updateNode?.(id, { conditionType: v })}>
        <SelectTrigger className="mt-1 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="keyword">Keyword</SelectItem>
          <SelectItem value="follower">Follower</SelectItem>
          <SelectItem value="schedule">Schedule</SelectItem>
          <SelectItem value="first_message_only">First message only</SelectItem>
        </SelectContent>
      </Select>

      {conditionType === "keyword" && (
        <div className="mt-2 space-y-1">
          <Input
            className="h-7 text-xs"
            value={d.match ?? ""}
            onChange={(e) => d.updateNode?.(id, { match: e.target.value })}
            placeholder="Keyword or phrase"
          />
          <Select value={d.match_type ?? "contains"} onValueChange={(v) => d.updateNode?.(id, { match_type: v })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="whole_word">Whole word</SelectItem>
              <SelectItem value="exact">Exact</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={!!d.case_sensitive}
              onCheckedChange={(v) => d.updateNode?.(id, { case_sensitive: v })}
            />
            <span className="text-[10px] text-muted-foreground">Case sensitive</span>
          </div>
        </div>
      )}

      {conditionType === "follower" && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <Switch
              checked={d.require_follower !== false}
              onCheckedChange={(v) => d.updateNode?.(id, { require_follower: v })}
            />
            <span className="text-[10px] text-muted-foreground">Require follower check</span>
          </div>
          <Label className="text-[10px] text-muted-foreground">If not following (optional)</Label>
          <Input
            className="h-7 text-xs"
            value={d.else_message ?? ""}
            onChange={(e) => d.updateNode?.(id, { else_message: e.target.value })}
            placeholder="Short message when not a follower…"
          />
          <p className="text-[9px] text-muted-foreground leading-tight">
            Connect the <strong>No</strong> handle to a different action, or leave empty to use this message only.
          </p>
        </div>
      )}

      {conditionType === "first_message_only" && (
        <p className="mt-2 text-[9px] text-muted-foreground leading-tight">
          Passes when this is the sender&apos;s first DM or comment logged for your tenant (before this event).
        </p>
      )}

      {conditionType === "schedule" && (
        <div className="mt-2 space-y-1">
          <Label className="text-[10px] text-muted-foreground">Timezone (IANA)</Label>
          <Input
            className="h-7 text-xs"
            value={d.timezone ?? "UTC"}
            onChange={(e) => d.updateNode?.(id, { timezone: e.target.value })}
            placeholder="America/New_York"
          />
          <div className="grid grid-cols-2 gap-1">
            <div>
              <Label className="text-[9px]">Start</Label>
              <Input
                className="h-7 text-xs"
                value={d.window_start ?? "09:00"}
                onChange={(e) => d.updateNode?.(id, { window_start: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[9px]">End</Label>
              <Input
                className="h-7 text-xs"
                value={d.window_end ?? "17:00"}
                onChange={(e) => d.updateNode?.(id, { window_end: e.target.value })}
              />
            </div>
          </div>
          <Label className="text-[9px] text-muted-foreground">Days (0=Sun … 6=Sat, comma)</Label>
          <Input
            className="h-7 text-xs"
            value={d.window_days ?? "1,2,3,4,5"}
            onChange={(e) => d.updateNode?.(id, { window_days: e.target.value })}
            placeholder="1,2,3,4,5"
          />
        </div>
      )}

        <Handle type="target" position={Position.Left} className="!size-2 !bg-amber-500" />
        <Handle
          id="yes"
          type="source"
          position={Position.Right}
          className="!size-2 !bg-green-500"
          style={{ top: "35%" }}
        />
        <Handle
          id="no"
          type="source"
          position={Position.Right}
          className="!size-2 !bg-red-400"
          style={{ top: "70%" }}
        />
      </div>
    </NodeChrome>
  );
}
