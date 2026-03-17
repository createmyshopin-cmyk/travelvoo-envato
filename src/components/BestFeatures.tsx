import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

interface SiteSettingsLite {
  best_features_enabled: boolean;
  best_features_title: string;
}

interface FeatureItem {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  sort_order: number;
  active: boolean;
}

const BestFeatures = () => {
  const [settings, setSettings] = useState<SiteSettingsLite | null>(null);
  const [features, setFeatures] = useState<FeatureItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: site }, { data: tenantId }] = await Promise.all([
        supabase
          .from("site_settings")
          .select("best_features_enabled, best_features_title")
          .limit(1)
          .single(),
        supabase.rpc("get_my_tenant_id"),
      ]);
      if (site) setSettings(site as SiteSettingsLite);
      if (!site?.best_features_enabled || !tenantId) return;

      const { data } = await supabase
        .from("property_features")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      setFeatures((data || []) as FeatureItem[]);
    };

    fetchData();
  }, []);

  if (!settings?.best_features_enabled || features.length === 0) return null;

  const title = settings.best_features_title || "Why guests love us";

  return (
    <section className="px-4 md:px-6 lg:px-8 mt-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="w-3 h-3" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {features.slice(0, 6).map((feat) => (
          <div
            key={feat.id}
            className="border border-border/60 rounded-xl p-3 bg-background shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {feat.icon_name?.[0] || "★"}
              </span>
              <h3 className="text-xs font-semibold leading-snug">{feat.title}</h3>
            </div>
            {feat.description && (
              <p className="text-[11px] text-muted-foreground leading-snug">
                {feat.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default BestFeatures;

