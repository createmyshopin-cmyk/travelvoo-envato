import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles, Plus, Trash2, Search, BarChart3, Settings2, Brain, Shield,
  RefreshCw, X, Cpu, Zap, ToggleLeft, MessageSquare, Activity, CheckCircle2, AlertTriangle
} from "lucide-react";

const AI_PROVIDERS = [
  {
    provider: "Google Gemini",
    models: [
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)", desc: "Balanced speed & capability" },
      { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Latest)", desc: "Latest next-gen reasoning" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Best for complex reasoning + vision" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Fast with good reasoning" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", desc: "Fastest, lowest cost" },
    ],
  },
  {
    provider: "OpenAI",
    models: [
      { value: "openai/gpt-5", label: "GPT-5", desc: "Powerful all-rounder, best accuracy" },
      { value: "openai/gpt-5.2", label: "GPT-5.2 (Latest)", desc: "Enhanced reasoning" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini", desc: "Strong performance, lower cost" },
      { value: "openai/gpt-5-nano", label: "GPT-5 Nano", desc: "Speed optimized, budget-friendly" },
    ],
  },
];

const ALL_DATA_SOURCES = [
  { key: "stays", label: "Stays" },
  { key: "room_categories", label: "Room Categories" },
  { key: "amenities", label: "Amenities" },
  { key: "reviews", label: "Reviews" },
  { key: "pricing", label: "Pricing" },
];

const PERSONALITIES = [
  { value: "travel_assistant", label: "Travel Assistant" },
  { value: "friendly_guide", label: "Friendly Guide" },
  { value: "luxury_expert", label: "Luxury Travel Expert" },
];

const RESPONSE_LENGTHS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "detailed", label: "Detailed" },
];

interface AISettings {
  id: string;
  search_enabled: boolean;
  data_sources: string[];
  attraction_radius: number;
  auto_review_summary: boolean;
  system_prompt: string;
  blacklisted_words: string[];
  ai_model: string;
  ai_personality: string;
  response_length: string;
  cache_enabled: boolean;
  cache_duration: number;
  feature_recommendations: boolean;
  feature_review_summaries: boolean;
  feature_stay_highlights: boolean;
  feature_query_suggestions: boolean;
  feature_chat_assistant: boolean;
}

interface Synonym { id: string; query_term: string; maps_to: string; }
interface SearchLog { id: string; query: string; results_count: number; created_at: string; }

const AdminAISettings = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [newTerm, setNewTerm] = useState("");
  const [newMapsTo, setNewMapsTo] = useState("");
  const [newBlacklistWord, setNewBlacklistWord] = useState("");
  const [totalSearches, setTotalSearches] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [settingsRes, synonymsRes, logsRes, countRes] = await Promise.all([
      supabase.from("ai_settings").select("*").limit(1).single(),
      supabase.from("ai_synonyms").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_search_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_search_logs").select("id", { count: "exact", head: true }),
    ]);

    if (settingsRes.data) {
      setSettings({
        ...settingsRes.data,
        data_sources: settingsRes.data.data_sources as string[],
        blacklisted_words: settingsRes.data.blacklisted_words || [],
        ai_model: (settingsRes.data as any).ai_model || "google/gemini-3-flash-preview",
        ai_personality: (settingsRes.data as any).ai_personality || "travel_assistant",
        response_length: (settingsRes.data as any).response_length || "medium",
        cache_enabled: (settingsRes.data as any).cache_enabled ?? false,
        cache_duration: (settingsRes.data as any).cache_duration ?? 12,
        feature_recommendations: (settingsRes.data as any).feature_recommendations ?? true,
        feature_review_summaries: (settingsRes.data as any).feature_review_summaries ?? false,
        feature_stay_highlights: (settingsRes.data as any).feature_stay_highlights ?? true,
        feature_query_suggestions: (settingsRes.data as any).feature_query_suggestions ?? true,
        feature_chat_assistant: (settingsRes.data as any).feature_chat_assistant ?? false,
      });
    }
    setSynonyms((synonymsRes.data as Synonym[]) || []);
    setLogs((logsRes.data as SearchLog[]) || []);
    setTotalSearches(countRes.count || 0);
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("ai_settings")
      .update({
        search_enabled: settings.search_enabled,
        data_sources: settings.data_sources as any,
        attraction_radius: settings.attraction_radius,
        auto_review_summary: settings.auto_review_summary,
        system_prompt: settings.system_prompt,
        blacklisted_words: settings.blacklisted_words,
        ai_model: settings.ai_model,
        ai_personality: settings.ai_personality,
        response_length: settings.response_length,
        cache_enabled: settings.cache_enabled,
        cache_duration: settings.cache_duration,
        feature_recommendations: settings.feature_recommendations,
        feature_review_summaries: settings.feature_review_summaries,
        feature_stay_highlights: settings.feature_stay_highlights,
        feature_query_suggestions: settings.feature_query_suggestions,
        feature_chat_assistant: settings.feature_chat_assistant,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved", description: "AI settings updated successfully." });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-search", {
        body: { query: "test connection" },
      });
      if (error) throw error;
      setTestResult("success");
      toast({ title: "✓ Connection Successful", description: `AI model responded. Found ${data?.stays?.length || 0} results.` });
    } catch (e: any) {
      setTestResult("error");
      toast({ title: "⚠ Connection Failed", description: e.message || "Could not reach AI service", variant: "destructive" });
    }
    setTesting(false);
  };

  const toggleDataSource = (key: string) => {
    if (!settings) return;
    const sources = settings.data_sources.includes(key)
      ? settings.data_sources.filter((s) => s !== key)
      : [...settings.data_sources, key];
    setSettings({ ...settings, data_sources: sources });
  };

  const addSynonym = async () => {
    if (!newTerm.trim() || !newMapsTo.trim()) return;
    const { error } = await supabase
      .from("ai_synonyms")
      .insert({ query_term: newTerm.trim().toLowerCase(), maps_to: newMapsTo.trim() });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewTerm("");
      setNewMapsTo("");
      fetchAll();
      toast({ title: "Synonym added" });
    }
  };

  const deleteSynonym = async (id: string) => {
    await supabase.from("ai_synonyms").delete().eq("id", id);
    fetchAll();
  };

  const addBlacklistWord = () => {
    if (!settings || !newBlacklistWord.trim()) return;
    setSettings({
      ...settings,
      blacklisted_words: [...settings.blacklisted_words, newBlacklistWord.trim().toLowerCase()],
    });
    setNewBlacklistWord("");
  };

  const removeBlacklistWord = (word: string) => {
    if (!settings) return;
    setSettings({ ...settings, blacklisted_words: settings.blacklisted_words.filter((w) => w !== word) });
  };

  // Get current provider name
  const currentProvider = AI_PROVIDERS.find((p) => p.models.some((m) => m.value === settings?.ai_model));
  const currentModel = currentProvider?.models.find((m) => m.value === settings?.ai_model);

  // Analytics
  const topQueries = logs.reduce<Record<string, number>>((acc, log) => {
    const q = log.query.toLowerCase().trim();
    acc[q] = (acc[q] || 0) + 1;
    return acc;
  }, {});
  const sortedQueries = Object.entries(topQueries).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const avgResults = logs.length > 0
    ? (logs.reduce((sum, l) => sum + l.results_count, 0) / logs.length).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return <p className="p-6 text-muted-foreground">AI settings not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> AI Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure AI models, features, search behavior & analytics</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      {/* === AI Provider & Model Selection === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="w-4 h-4" /> AI Provider & Model
          </CardTitle>
          <CardDescription>
            Select the AI model powering your search. All models are available via Lovable AI — no API keys needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current model display */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <Zap className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Active: {currentModel?.label || settings.ai_model}</p>
              <p className="text-xs text-muted-foreground">{currentProvider?.provider} · {currentModel?.desc}</p>
            </div>
            <Badge variant="default" className="shrink-0">Active</Badge>
          </div>

          {/* Model selection by provider */}
          {AI_PROVIDERS.map((provider) => (
            <div key={provider.provider} className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">{provider.provider}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {provider.models.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => setSettings({ ...settings, ai_model: model.value })}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      settings.ai_model === model.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="text-sm font-medium">{model.label}</p>
                    <p className="text-xs text-muted-foreground">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Test connection */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
              {testing ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Activity className="w-4 h-4 mr-1" />}
              Test Connection
            </Button>
            {testResult === "success" && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> API Connected Successfully
              </span>
            )}
            {testResult === "error" && (
              <span className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Connection Failed
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* === AI Feature Toggles === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ToggleLeft className="w-4 h-4" /> AI Features
          </CardTitle>
          <CardDescription>Enable or disable individual AI-powered features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "search_enabled", label: "AI Natural Language Search", desc: "Smart search with natural queries" },
              { key: "feature_recommendations", label: "AI Stay Recommendations", desc: "Suggest similar stays" },
              { key: "feature_review_summaries", label: "AI Review Summaries", desc: "Auto-summarize guest reviews" },
              { key: "feature_stay_highlights", label: "AI Stay Highlights", desc: "Generate stay highlight badges" },
              { key: "feature_query_suggestions", label: "AI Query Suggestions", desc: "Suggest search queries" },
              { key: "feature_chat_assistant", label: "AI Chat Assistant", desc: "Conversational travel assistant" },
            ].map((feat) => (
              <div key={feat.key} className="flex items-start justify-between gap-3 p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{feat.label}</p>
                  <p className="text-xs text-muted-foreground">{feat.desc}</p>
                </div>
                <Switch
                  checked={(settings as any)[feat.key]}
                  onCheckedChange={(v) => setSettings({ ...settings, [feat.key]: v })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* === AI Behavior === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" /> AI Behavior
            </CardTitle>
            <CardDescription>Control how AI responds to users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>AI Personality</Label>
              <Select value={settings.ai_personality} onValueChange={(v) => setSettings({ ...settings, ai_personality: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSONALITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Response Length</Label>
              <Select value={settings.response_length} onValueChange={(v) => setSettings({ ...settings, response_length: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESPONSE_LENGTHS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* === Search Configuration === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="w-4 h-4" /> Search Configuration
            </CardTitle>
            <CardDescription>Configure search parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Attraction Search Radius</Label>
              <Select
                value={String(settings.attraction_radius)}
                onValueChange={(v) => setSettings({ ...settings, attraction_radius: Number(v) })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="20">20 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-review">Auto-generate Review Summaries</Label>
              <Switch
                id="auto-review"
                checked={settings.auto_review_summary}
                onCheckedChange={(v) => setSettings({ ...settings, auto_review_summary: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* === Data Sources === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-4 h-4" /> Data Sources
            </CardTitle>
            <CardDescription>Choose which data AI should use for search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ALL_DATA_SOURCES.map((ds) => (
                <div key={ds.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`ds-${ds.key}`}
                    checked={settings.data_sources.includes(ds.key)}
                    onCheckedChange={() => toggleDataSource(ds.key)}
                  />
                  <Label htmlFor={`ds-${ds.key}`} className="cursor-pointer">{ds.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* === Caching === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4" /> AI Caching
            </CardTitle>
            <CardDescription>Cache AI responses to reduce costs & improve speed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable AI Query Cache</Label>
              <Switch
                checked={settings.cache_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, cache_enabled: v })}
              />
            </div>
            {settings.cache_enabled && (
              <div>
                <Label>Cache Duration</Label>
                <Select
                  value={String(settings.cache_duration)}
                  onValueChange={(v) => setSettings({ ...settings, cache_duration: Number(v) })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === Safety Controls === */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" /> Safety Controls
            </CardTitle>
            <CardDescription>Blacklist words from AI search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Word to block..."
                value={newBlacklistWord}
                onChange={(e) => setNewBlacklistWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBlacklistWord()}
                className="flex-1"
              />
              <Button size="sm" onClick={addBlacklistWord} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {settings.blacklisted_words.map((w) => (
                <Badge key={w} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeBlacklistWord(w)}>
                  {w} <X className="w-3 h-3" />
                </Badge>
              ))}
              {settings.blacklisted_words.length === 0 && (
                <p className="text-xs text-muted-foreground">No blacklisted words</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === System Prompt === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI System Prompt</CardTitle>
          <CardDescription>Customize the instructions given to the AI search engine</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.system_prompt}
            onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
            rows={5}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* === Synonym Mapping === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synonym Mapping</CardTitle>
          <CardDescription>Map search terms to categories so AI understands user intent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-col sm:flex-row">
            <Input placeholder="Search term (e.g. honeymoon)" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} className="flex-1" />
            <Input placeholder="Maps to (e.g. Couple Friendly)" value={newMapsTo} onChange={(e) => setNewMapsTo(e.target.value)} className="flex-1" />
            <Button onClick={addSynonym} size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
          {synonyms.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query Term</TableHead>
                    <TableHead>Maps To</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {synonyms.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.query_term}</TableCell>
                      <TableCell>{s.maps_to}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteSynonym(s.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No synonyms configured yet</p>
          )}
        </CardContent>
      </Card>

      {/* === Search Analytics === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4" /> AI Usage Analytics
          </CardTitle>
          <CardDescription>Search performance overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold text-foreground">{totalSearches}</p>
              <p className="text-xs text-muted-foreground">Total Searches</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold text-foreground">{avgResults}</p>
              <p className="text-xs text-muted-foreground">Avg Results</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold text-foreground">{sortedQueries.length}</p>
              <p className="text-xs text-muted-foreground">Unique Queries</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold text-foreground">{currentProvider?.provider || "—"}</p>
              <p className="text-xs text-muted-foreground">Active Provider</p>
            </div>
          </div>

          {/* Top queries */}
          {sortedQueries.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Search Keywords</p>
              {sortedQueries.map(([q, count]) => (
                <div key={q} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm truncate flex-1">{q}</span>
                  <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No search queries logged yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAISettings;
