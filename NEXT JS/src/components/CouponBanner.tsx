import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Coupon {
  id: string;
  code: string;
  description: string;
  value: number;
  type: string;
  min_purchase: number;
  max_discount: number | null;
  expires_at: string | null;
  show_publicly?: boolean;
}

interface SiteSettingsLite {
  coupon_banner_enabled: boolean;
}

const CouponBanner = () => {
  const [settings, setSettings] = useState<SiteSettingsLite | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: site } = await supabase
        .from("site_settings")
        .select("coupon_banner_enabled")
        .limit(1)
        .single();
      if (site) setSettings(site as SiteSettingsLite);
      if (!site?.coupon_banner_enabled) return;

      const { data } = await supabase
        .from("coupons")
        .select("id, code, description, value, type, min_purchase, max_discount, expires_at, show_publicly")
        .eq("active", true)
        .eq("show_publicly", true)
        .order("created_at", { ascending: false });
      setCoupons((data || []) as Coupon[]);
    };

    fetchData();
  }, []);

  if (!settings?.coupon_banner_enabled || coupons.length === 0) return null;

  const formatLabel = (c: Coupon) => {
    const value = c.type === "percentage" ? `${c.value}% off` : `₹${c.value} off`;
    return `${value} • Min ₹${c.min_purchase.toLocaleString()}`;
  };

  return (
    <div className="px-4 md:px-6 lg:px-8 pt-1 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {coupons.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => navigator.clipboard.writeText(c.code)}
            className="flex items-center gap-2 rounded-full bg-primary/5 border border-primary/20 px-3 py-1 text-left shrink-0 hover:bg-primary/10 active:scale-95 transition-transform"
          >
            <Badge variant="outline" className="text-[10px] font-mono bg-primary text-primary-foreground border-primary">
              {c.code}
            </Badge>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-foreground">{formatLabel(c)}</span>
              {c.description && (
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  {c.description}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Tap a coupon code to copy it automatically at checkout.
      </p>
    </div>
  );
};

export default CouponBanner;

