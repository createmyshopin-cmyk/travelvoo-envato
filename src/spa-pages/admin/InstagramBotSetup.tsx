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
  const [copied, setCopied] = useState(false);

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/instagram` : "";

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: "Please log in first", variant: "destructive" });
      return;
    }
    window.location.href = `/api/integrations/instagram/auth?token=${session.access_token}`;
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
                Connect your Instagram Business account to start receiving DMs and automating replies.
                You need a Facebook Page linked to an Instagram Business or Creator account.
              </p>
              <Button onClick={connect}>
                <Instagram className="h-4 w-4 mr-2" />
                Connect with Facebook
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
            Use this URL in your Meta Developer Console webhook configuration. All tenants share the same webhook endpoint.
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
