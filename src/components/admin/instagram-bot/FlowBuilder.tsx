"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, RefreshCw, Trash2 } from "lucide-react";
import { TriggerNode } from "./nodes/TriggerNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { ActionNode } from "./nodes/ActionNode";
import { buildConditionsMeta } from "@/lib/flow-engine";
import { FlowAnalytics } from "./FlowAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabeledEdge } from "./edges/LabeledEdge";

const nodeTypes = { trigger: TriggerNode, condition: ConditionNode, action: ActionNode };
const edgeTypes = { labeled: LabeledEdge };

function defaultFlow(): { nodes: Node[]; edges: Edge[] } {
  const t1 = crypto.randomUUID();
  const a1 = crypto.randomUUID();
  return {
    nodes: [
      {
        id: t1,
        type: "trigger",
        position: { x: 0, y: 80 },
        data: { channel: "dm" },
      },
      {
        id: a1,
        type: "action",
        position: { x: 320, y: 80 },
        data: { action: "ai_reply", template_text: "", url: "" },
      },
    ],
    edges: [{ id: `e-${t1}-${a1}`, source: t1, target: a1, type: "labeled", data: {} }],
  };
}

type FlowRow = {
  id: string;
  name: string;
  channel: string;
  enabled: boolean;
  is_draft: boolean;
  flow_definition: unknown;
  version: number;
};

export function FlowBuilder({ tenantId }: { tenantId: string }) {
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyticsCounts, setAnalyticsCounts] = useState<Record<string, number>>({});

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  const updateNode = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const newId = crypto.randomUUID();
      setNodes((nds) => {
        const n = nds.find((x) => x.id === nodeId);
        if (!n) return nds;
        const strip = (d: Record<string, unknown> | undefined) => {
          if (!d) return {};
          const { updateNode: _u, deleteNode: _d, duplicateNode: _dup, _heatCount: _h, ...rest } = d;
          return rest;
        };
        const copy: Node = {
          ...n,
          id: newId,
          position: { x: (n.position?.x ?? 0) + 56, y: (n.position?.y ?? 0) + 56 },
          data: strip(n.data as Record<string, unknown>) as Record<string, unknown>,
        };
        return [...nds, copy];
      });
      setEdges((eds) => {
        const extra: Edge[] = [];
        for (const e of eds) {
          if (e.source === nodeId && e.target === nodeId) {
            extra.push({
              ...e,
              id: `e-${newId}-${newId}-${crypto.randomUUID().slice(0, 8)}`,
              source: newId,
              target: newId,
            });
          } else if (e.source === nodeId) {
            extra.push({
              ...e,
              id: `e-${newId}-${e.target}-${crypto.randomUUID().slice(0, 8)}`,
              source: newId,
            });
          } else if (e.target === nodeId) {
            extra.push({
              ...e,
              id: `e-${e.source}-${newId}-${crypto.randomUUID().slice(0, 8)}`,
              target: newId,
            });
          }
        }
        return [...eds, ...extra];
      });
    },
    [setNodes, setEdges],
  );

  const nodesForCanvas = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          updateNode,
          deleteNode,
          duplicateNode,
        },
      })),
    [nodes, updateNode, deleteNode, duplicateNode],
  );

  const loadFlows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instagram_automation_flows")
      .select("id,name,channel,enabled,is_draft,flow_definition,version,updated_at")
      .eq("tenant_id", tenantId)
      .order("version", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load flows", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setFlows(((data ?? []) as FlowRow[]) ?? []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  useEffect(() => {
    if (!selectedId && flows.length) setSelectedId(flows[0].id);
  }, [flows, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const row = flows.find((f) => f.id === selectedId);
    if (!row) return;
    const def = (row.flow_definition ?? {}) as { nodes?: Node[]; edges?: Edge[] };
    const { nodes: dn, edges: de } = defaultFlow();
    setNodes(def.nodes?.length ? def.nodes : dn);
    setEdges(def.edges?.length ? def.edges : de);
  }, [selectedId, flows, setNodes, setEdges]);

  useEffect(() => {
    if (!selectedId) return;
    const ch = supabase
      .channel(`flow-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "instagram_automation_flows",
          filter: `id=eq.${selectedId}`,
        },
        (payload) => {
          const next = payload.new as FlowRow;
          setFlows((prev) => prev.map((f) => (f.id === next.id ? { ...f, ...next } : f)));
          const fd = next.flow_definition as { nodes?: Node[]; edges?: Edge[] } | undefined;
          if (fd?.nodes && fd.edges) {
            setNodes(fd.nodes);
            setEdges(fd.edges);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const label =
        params.sourceHandle === "no" ? "No" : params.sourceHandle === "yes" ? "Yes" : "";
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "labeled",
            animated: true,
            data: label ? { label } : {},
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const saveFlow = async () => {
    if (!selectedId) return;
    setSaving(true);
    const def = { nodes, edges };
    const conditions_meta = buildConditionsMeta(def);
    const { error } = await supabase
      .from("instagram_automation_flows")
      .update({
        flow_definition: def as unknown as Record<string, unknown>,
        conditions_meta: conditions_meta as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Flow saved" });
    loadFlows();
  };

  const createFlow = async () => {
    const { nodes: n, edges: e } = defaultFlow();
    const def = { nodes: n, edges: e };
    const { data, error } = await supabase
      .from("instagram_automation_flows")
      .insert({
        tenant_id: tenantId,
        name: `Flow ${flows.length + 1}`,
        channel: "dm",
        flow_definition: def as unknown as Record<string, unknown>,
        conditions_meta: buildConditionsMeta(def) as unknown as Record<string, unknown>,
        enabled: true,
        is_draft: true,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data && typeof data === "object" && "id" in data) {
      setSelectedId((data as { id: string }).id);
      loadFlows();
    }
  };

  const deleteFlow = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from("instagram_automation_flows").delete().eq("id", selectedId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setSelectedId(null);
    loadFlows();
  };

  const patchSelectedMeta = async (patch: Partial<Pick<FlowRow, "name" | "enabled" | "is_draft" | "channel">>) => {
    if (!selectedId) return;
    await supabase.from("instagram_automation_flows").update(patch as never).eq("id", selectedId);
    setFlows((prev) => prev.map((f) => (f.id === selectedId ? { ...f, ...patch } : f)));
  };

  const loadAnalytics = async () => {
    if (!selectedId) return;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("instagram_flow_executions")
      .select("node_id")
      .eq("flow_id", selectedId)
      .gte("created_at", since);
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      const id = (r as { node_id: string }).node_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    setAnalyticsCounts(counts);
  };

  const addPaletteNode = (t: "condition" | "action") => {
    const id = crypto.randomUUID();
    const y = 40 + nodes.length * 24;
    if (t === "condition") {
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "condition",
          position: { x: 160, y: y },
          data: {
            conditionType: "keyword",
            match: "",
            match_type: "contains",
            case_sensitive: false,
          },
        },
      ]);
    } else {
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "action",
          position: { x: 480, y: y },
          data: { action: "ai_reply", template_text: "", url: "" },
        },
      ]);
    }
  };

  const selected = flows.find((f) => f.id === selectedId) ?? null;

  if (loading && flows.length === 0) {
    return <div className="text-sm text-muted-foreground py-8">Loading flows…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Flow</Label>
          <Select
            value={selectedId ?? ""}
            onValueChange={(v) => setSelectedId(v)}
            disabled={!flows.length}
          >
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="Select a flow" />
            </SelectTrigger>
            <SelectContent>
              {flows.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                  {f.is_draft ? " (draft)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={createFlow}>
          <Plus className="h-4 w-4 mr-1" /> New flow
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => loadFlows()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        {selectedId && (
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={deleteFlow}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
      </div>

      {!flows.length ? (
        <p className="text-sm text-muted-foreground">
          No visual flows yet. Create one to run automations before flat keyword rules.
        </p>
      ) : selected ? (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
          <div className="space-y-3 rounded-lg border bg-card/50 p-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                key={selected.id}
                className="mt-1 h-8 text-sm"
                defaultValue={selected.name}
                onBlur={(e) => patchSelectedMeta({ name: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Published</span>
              <Switch
                checked={!selected.is_draft}
                onCheckedChange={(v) => patchSelectedMeta({ is_draft: !v })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Enabled</span>
              <Switch checked={selected.enabled} onCheckedChange={(v) => patchSelectedMeta({ enabled: v })} />
            </div>
            <div>
              <Label className="text-xs">Default channel</Label>
              <Select value={selected.channel} onValueChange={(v) => patchSelectedMeta({ channel: v })}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dm">DM</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Add node</p>
              <Button type="button" size="sm" variant="secondary" className="w-full h-8 text-xs" onClick={() => addPaletteNode("condition")}>
                + Condition
              </Button>
              <Button type="button" size="sm" variant="secondary" className="w-full h-8 text-xs" onClick={() => addPaletteNode("action")}>
                + Action
              </Button>
            </div>
            <Button type="button" size="sm" className="w-full" onClick={saveFlow} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save flow"}
            </Button>
          </div>

          <Tabs defaultValue="editor" className="w-full min-w-0">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="analytics" onClick={() => loadAnalytics()}>
                Analytics
              </TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="mt-3">
              <div className="h-[min(520px,60vh)] w-full rounded-md border bg-muted/10">
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={nodesForCanvas}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={{ type: "labeled", animated: true }}
                    fitView
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background />
                    <MiniMap pannable zoomable />
                    <Controls />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Connect <strong>Yes</strong> / <strong>No</strong> handles on conditions. Unlabeled edges from a condition follow the <strong>Yes</strong> path when the check passes.
              </p>
            </TabsContent>
            <TabsContent value="analytics" className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">Node visits in the last 7 days (from webhook evaluation).</p>
              <FlowAnalytics nodes={nodes} edges={edges} counts={analyticsCounts} />
              <div className="text-xs text-muted-foreground space-y-1">
                {nodes.map((n) => (
                  <div key={n.id} className="flex justify-between gap-2 border-b border-border/50 py-1">
                    <span className="font-mono truncate">{n.id.slice(0, 8)}…</span>
                    <span>{n.type}</span>
                    <span className="tabular-nums">{analyticsCounts[n.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
