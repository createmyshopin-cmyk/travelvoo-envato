import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Instagram, Copy, CheckCheck, Unplug, ExternalLink } from "lucide-react";

export default function InstagramBotSetup() {
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/integrations/instagram/webhook-url");
        if (!res.ok) throw new Error("bad");
        const data = (await res.json()) as { webhookUrl?: string };
        if (!cancelled && data.webhookUrl) setWebhookUrl(data.webhookUrl);
      } catch {
        if (!cancelled && typeof window !== "undefined") {
          setWebhookUrl(`${window.location.origin}/api/webhooks/instagram`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const s = searchParams.get("success");
    const e = searchParams.get("error");
    if (s === "connected") toast({ title: "Instagram connected successfully" });
    if (e) toast({ title: "Connection failed", description: e.replace(/_/g, " "), variant: "destructive" });
  }, [searchParams]);

  useEffect(() => {
    fetchConnection();

    const channel = supabase
      .channel("ig-conn-setup")
      .on("postgres_changes", { event: "*", schema: "public", table: "tenant_instagram_connections" }, () => {
        fetchConnection();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchConnection = async () => {
    const { data: tid } = await supabase.rpc("get_my_tenant_id");
    if (!tid) { setLoading(false); return; }
    const { data } = await supabase
      .from("tenant_instagram_connections" as any)
      .select("*")
      .eq("tenant_id", tid)
      .maybeSingle();
    setConnection(data);
    setLoading(false);
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Please log in first", variant: "destructive" });
        return;
      }
      const { data: refreshed } = await supabase.auth.refreshSession();
      const token = refreshed.session?.access_token ?? session.access_token;

      // POST returns JSON { url } — avoids fetch + redirect:manual opaque responses on cross-origin 302.
      const res = await fetch("/api/integrations/instagram/auth", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        toast({
          title: "Could not start Instagram login",
          description: "Server did not return an OAuth URL.",
          variant: "destructive",
        });
        return;
      }

      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      toast({
        title: "Could not start Instagram login",
        description:
          typeof errBody.error === "string"
            ? errBody.error
            : res.status === 401
              ? "Session expired or invalid — try signing out and back in."
              : res.statusText || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    const { data: tid } = await supabase.rpc("get_my_tenant_id");
    if (tid) {
      const res = await fetch("/api/integrations/instagram/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tid }),
      });
      if (res.ok) {
        setConnection(null);
        toast({ title: "Instagram disconnected" });
      } else {
        toast({ title: "Disconnect failed", variant: "destructive" });
      }
    }
    setDisconnecting(false);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Instagram Bot Setup</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection ? (
            <>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Connected{connection.ig_username ? ` — @${connection.ig_username}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    Page ID: {connection.facebook_page_id} | IG Business ID: {connection.instagram_business_account_id}
                  </p>
                  {connection.token_expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Token expires: {new Date(connection.token_expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={disconnect} disabled={disconnecting}>
                <Unplug className="h-4 w-4 mr-1" />
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Connect your Instagram Business account for DMs and automations. If your platform has an{" "}
                <strong className="text-foreground">Instagram App ID</strong> in SaaS Admin → Meta, you&apos;ll sign in on
                Instagram; otherwise Meta uses Facebook Login with a Page linked to your Instagram professional account.
              </p>
              <Button onClick={connect} disabled={connecting}>
                <Instagram className="h-4 w-4 mr-2" />
                {connecting ? "Starting…" : "Connect Instagram"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use this URL in your Meta Developer Console webhook configuration. It uses the same public site origin as{" "}
            <strong className="text-foreground font-medium">SaaS Admin → Meta OAuth redirect</strong> (or{" "}
            <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_APP_URL</code>
            ) — not this page&apos;s URL, so it never includes <code className="text-xs bg-muted px-1 rounded">/admin</code>. All tenants share one endpoint.
          </p>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button size="icon" variant="outline" onClick={copyWebhook}>
              {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta Developer Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ensure your Meta app has Instagram Messaging enabled and the webhook URL is configured.
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Instagram account must be Business or Creator type</li>
            <li>Facebook Page must be linked to the Instagram account</li>
            <li>Subscribe to <code className="text-xs bg-muted px-1 rounded">messages</code> webhook field</li>
            <li>Request Advanced Access for <code className="text-xs bg-muted px-1 rounded">instagram_manage_messages</code></li>
          </ul>
          <Button variant="link" size="sm" className="p-0" asChild>
            <a href="https://developers.facebook.com/docs/instagram-platform" target="_blank" rel="noopener noreferrer">
              Meta Instagram Platform Docs <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
