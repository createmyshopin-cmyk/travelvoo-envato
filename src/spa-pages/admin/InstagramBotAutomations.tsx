import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Image, RefreshCw, Instagram, Film, LayoutGrid } from "lucide-react";
import { FlowBuilder } from "@/components/admin/instagram-bot/FlowBuilder";

type IgMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  children?: { data?: Array<{ media_url?: string; thumbnail_url?: string; media_type?: string }> };
};

type IgAccountInfo = {
  id?: string;
  username: string | null;
  profile_picture_url: string | null;
  name: string | null;
  media_count: number | null;
};

/** Avoid `[object Object]` in img href when Graph returns nested objects. */
function stringHttpUrl(value: unknown): string | undefined {
  if (typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))) {
    return value;
  }
  return undefined;
}

function getMediaThumbnail(m: IgMediaItem): string | undefined {
  const t = stringHttpUrl(m.thumbnail_url);
  if (t) return t;
  if (m.media_type === "IMAGE") {
    const u = stringHttpUrl(m.media_url);
    if (u) return u;
  }
  const first = m.children?.data?.[0];
  if (first) {
    const ft = stringHttpUrl(first.thumbnail_url);
    if (ft) return ft;
    const fu = stringHttpUrl(first.media_url);
    if (fu) return fu;
  }
  return stringHttpUrl(m.media_url);
}

function mediaKindLabel(m: IgMediaItem): string {
  const p = (m.media_product_type || "").toUpperCase();
  if (p === "REELS") return "Reel";
  if (p === "STORY") return "Story";
  if (m.media_type === "CAROUSEL_ALBUM") return "Carousel";
  if (m.media_type === "VIDEO") return "Video";
  return "Post";
}

interface KeywordRule {
  id?: string;
  channel: string;
  match: string;
  match_type: string;
  case_sensitive: boolean;
  action: string;
  template_text: string;
  url: string;
  priority: number;
  enabled: boolean;
  conditions: Record<string, any>;
}

export default function InstagramBotAutomations() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [mediaTargets, setMediaTargets] = useState<any[]>([]);
  const [availableMedia, setAvailableMedia] = useState<IgMediaItem[]>([]);
  const [igAccount, setIgAccount] = useState<IgAccountInfo | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const loadMedia = async () => {
    setMediaError(null);
    setMediaLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMediaError("Sign in required to load Instagram media.");
        setAvailableMedia([]);
        setIgAccount(null);
        return;
      }
      const res = await fetch("/api/integrations/instagram/media", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        media?: IgMediaItem[];
        account?: IgAccountInfo;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setMediaError(typeof data.detail === "string" ? data.detail : data.error || "Could not load posts and reels.");
        setAvailableMedia([]);
        setIgAccount(data.account ?? null);
        return;
      }
      setAvailableMedia(data.media ?? []);
      setIgAccount(data.account ?? null);
    } catch {
      setMediaError("Network error loading Instagram media.");
      setAvailableMedia([]);
    } finally {
      setMediaLoading(false);
    }
  };

  const fetchData = async () => {
    const { data: tid } = await supabase.rpc("get_my_tenant_id");
    if (!tid) { setLoading(false); return; }
    setTenantId(tid);

    const [configRes, rulesRes, targetsRes] = await Promise.all([
      supabase.from("instagram_automation_config" as any).select("*").eq("tenant_id", tid).maybeSingle(),
      supabase.from("instagram_automation_keyword_rules" as any).select("*").eq("tenant_id", tid).order("priority"),
      supabase.from("instagram_automation_media_targets" as any).select("*").eq("tenant_id", tid),
    ]);

    setConfig(configRes.data);
    setRules((rulesRes.data as any[]) ?? []);
    setMediaTargets((targetsRes.data as any[]) ?? []);

    await loadMedia();

    setLoading(false);
  };

  const toggleMasterSwitch = async (enabled: boolean) => {
    if (!tenantId) return;
    await supabase.from("instagram_automation_config" as any).upsert({ tenant_id: tenantId, enabled, updated_at: new Date().toISOString() } as any, { onConflict: "tenant_id" });
    setConfig((c: any) => ({ ...c, enabled }));
    toast({ title: enabled ? "Automation enabled" : "Automation paused" });
  };

  const addRule = () => {
    setRules((r) => [...r, {
      channel: "dm", match: "", match_type: "contains", case_sensitive: false,
      action: "ai_reply", template_text: "", url: "", priority: r.length,
      enabled: true, conditions: {},
    }]);
  };

  const updateRule = (i: number, patch: Partial<KeywordRule>) => {
    setRules((r) => r.map((rule, idx) => idx === i ? { ...rule, ...patch } : rule));
  };

  const removeRule = (i: number) => {
    const rule = rules[i];
    if (rule.id && tenantId) {
      supabase.from("instagram_automation_keyword_rules" as any).delete().eq("id", rule.id);
    }
    setRules((r) => r.filter((_, idx) => idx !== i));
  };

  const saveRules = async () => {
    if (!tenantId) return;
    setSaving(true);
    for (const rule of rules) {
      const row = { ...rule, tenant_id: tenantId, updated_at: new Date().toISOString() };
      if (rule.id) {
        await supabase.from("instagram_automation_keyword_rules" as any).update(row as any).eq("id", rule.id);
      } else {
        const { data } = await supabase.from("instagram_automation_keyword_rules" as any).insert(row as any).select("id").maybeSingle();
        if (data) rule.id = (data as any).id;
      }
    }
    setSaving(false);
    toast({ title: "Keyword rules saved" });
  };

  const toggleMedia = async (media: IgMediaItem) => {
    if (!tenantId) return;
    const existing = mediaTargets.find((t) => t.ig_media_id === media.id);
    if (existing) {
      await supabase.from("instagram_automation_media_targets" as any).update({ enabled: !existing.enabled } as any).eq("id", existing.id);
      setMediaTargets((t) => t.map((m) => m.id === existing.id ? { ...m, enabled: !m.enabled } : m));
    } else {
      const row = {
        tenant_id: tenantId,
        ig_media_id: media.id,
        media_product_type: media.media_product_type || "FEED",
        caption: (media.caption || "").slice(0, 500),
        permalink: media.permalink || "",
        enabled: true,
      };
      const { data } = await supabase.from("instagram_automation_media_targets" as any).insert(row as any).select().maybeSingle();
      if (data) setMediaTargets((t) => [...t, data]);
    }
  };

  const mediaReels = availableMedia.filter((m) => String(m.media_product_type || "").toUpperCase() === "REELS");
  const mediaPosts = availableMedia.filter((m) => String(m.media_product_type || "").toUpperCase() !== "REELS");
  const igProfilePicUrl = igAccount ? stringHttpUrl(igAccount.profile_picture_url) : undefined;

  const renderMediaCard = (m: IgMediaItem) => {
    const target = mediaTargets.find((t) => t.ig_media_id === m.id);
    const isEnabled = target?.enabled ?? false;
    const thumb = getMediaThumbnail(m);
    const permalinkLink = stringHttpUrl(m.permalink);
    return (
      <Card key={m.id} className={`overflow-hidden ${isEnabled ? "ring-2 ring-primary" : ""}`}>
        <div className="aspect-square bg-muted relative">
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
            <Image className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}
          <span className="absolute top-2 left-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium uppercase shadow-sm">
            {mediaKindLabel(m)}
          </span>
        </div>
        <CardContent className="py-3 space-y-2">
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">{m.caption?.trim() || "No caption"}</p>
          <div className="flex items-center justify-between gap-2">
            <Switch checked={isEnabled} onCheckedChange={() => toggleMedia(m)} />
            {permalinkLink && (
              <a
                href={permalinkLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline shrink-0"
              >
                Open on Instagram
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Automations</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Master switch</span>
          <Switch checked={config?.enabled ?? true} onCheckedChange={toggleMasterSwitch} />
        </div>
      </div>

      <Tabs defaultValue="keywords">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="media">Posts & Reels</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="flow">Flow Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Define keyword rules that trigger specific actions on incoming DMs or comments.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addRule}>
                <Plus className="h-4 w-4 mr-1" /> Add Rule
              </Button>
              <Button size="sm" onClick={saveRules} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No keyword rules yet. Add rules to trigger specific actions based on message content.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <Card key={rule.id || i}>
                  <CardContent className="py-3 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Channel</Label>
                        <Select value={rule.channel} onValueChange={(v) => updateRule(i, { channel: v })}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dm">DM</SelectItem>
                            <SelectItem value="comment">Comment</SelectItem>
                            <SelectItem value="story">Story</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Match</Label>
                        <Input className="mt-1 h-8 text-xs" value={rule.match} onChange={(e) => updateRule(i, { match: e.target.value })} placeholder="price, book, ..." />
                      </div>
                      <div>
                        <Label className="text-xs">Match type</Label>
                        <Select value={rule.match_type} onValueChange={(v) => updateRule(i, { match_type: v })}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="whole_word">Whole word</SelectItem>
                            <SelectItem value="exact">Exact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Action</Label>
                        <Select value={rule.action} onValueChange={(v) => updateRule(i, { action: v })}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ai_reply">AI Reply</SelectItem>
                            <SelectItem value="template_reply">Template</SelectItem>
                            <SelectItem value="send_link">Send Link</SelectItem>
                            <SelectItem value="suppress">Suppress</SelectItem>
                            <SelectItem value="qualify_lead_only">Qualify Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(rule.action === "template_reply" || rule.action === "send_link") && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Template text</Label>
                          <Input className="mt-1 h-8 text-xs" value={rule.template_text} onChange={(e) => updateRule(i, { template_text: e.target.value })} />
                        </div>
                        {rule.action === "send_link" && (
                          <div>
                            <Label className="text-xs">URL</Label>
                            <Input className="mt-1 h-8 text-xs" value={rule.url} onChange={(e) => updateRule(i, { url: e.target.value })} placeholder="https://..." />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch checked={rule.enabled} onCheckedChange={(v) => updateRule(i, { enabled: v })} />
                        <span className="text-xs text-muted-foreground">{rule.enabled ? "Active" : "Disabled"}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeRule(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="media" className="mt-4 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-muted-foreground max-w-xl">
              Your connected Instagram account&apos;s recent posts and reels from Meta. Toggle comment automation per item (when comment rules apply).
            </p>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => loadMedia()} disabled={mediaLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${mediaLoading ? "animate-spin" : ""}`} />
              {mediaLoading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {igAccount && (
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                {igProfilePicUrl ? (
                  <img
                    src={igProfilePicUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover border bg-muted"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border">
                    <Instagram className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-lg truncate">
                    {igAccount.name || (igAccount.username ? `@${igAccount.username}` : "Connected Instagram")}
                  </p>
                  {igAccount.name && igAccount.username && (
                    <p className="text-sm text-muted-foreground">@{igAccount.username}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {availableMedia.length} recent item{availableMedia.length === 1 ? "" : "s"} loaded (max 50)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {mediaError && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-4 text-sm text-destructive">{mediaError}</CardContent>
            </Card>
          )}

          {!mediaLoading && !mediaError && availableMedia.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
                <p>No posts or reels returned from Instagram.</p>
                <p className="text-xs">Connect the account under Setup, ensure the app has Instagram permissions, then use Refresh.</p>
              </CardContent>
            </Card>
          )}

          {mediaReels.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold">Reels</h3>
                <span className="text-xs text-muted-foreground">({mediaReels.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mediaReels.map(renderMediaCard)}
              </div>
            </div>
          )}

          {mediaPosts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold">Posts</h3>
                <span className="text-xs text-muted-foreground">({mediaPosts.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mediaPosts.map(renderMediaCard)}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure when the bot should be active. Set timezone, weekly windows, and quiet hours.
                Outside scheduled windows, the bot will not auto-reply.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Schedule configuration is stored in <code className="text-xs bg-muted px-1 rounded">instagram_automation_schedules</code>.
                Edit directly or use the API for now. A full schedule editor UI is coming in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Build visual flows that run before flat keyword rules. Publish a flow to activate it; drafts are ignored by the webhook.
          </p>
          {tenantId ? <FlowBuilder tenantId={tenantId} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
