"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Loads whether OPENAI_API_KEY is set on the server (Theme/Plugin Builder AI). */
export function useMarketplaceAiStatus() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        if (!cancelled) {
          setEnabled(false);
          setLoading(false);
        }
        return;
      }
      const res = await fetch("/api/saas-admin/marketplace/ai-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { enabled?: boolean };
      if (!cancelled) {
        setEnabled(!!data.enabled);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}
