import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

interface PopupSettings {
  enabled: boolean;
  title: string;
  message: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  delay_seconds: number;
  show_once: boolean;
  coupon_code: string;
}

const STORAGE_KEY = "stay_promo_popup_seen";

const PromoPopup = () => {
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
      if (!tenantId) return;
      const { data } = await supabase
        .from("popup_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!data || !data.enabled) return;

      const popup: PopupSettings = {
        enabled: data.enabled,
        title: data.title || "",
        message: data.message || "",
        cta_text: data.cta_text || "Book Now",
        cta_link: data.cta_link || "",
        image_url: data.image_url || "",
        delay_seconds: data.delay_seconds ?? 3,
        show_once: data.show_once ?? true,
        coupon_code: data.coupon_code || "",
      };

      if (popup.show_once && sessionStorage.getItem(STORAGE_KEY) === "1") {
        return;
      }

      setSettings(popup);
      const delay = Math.max(0, Math.min(30, popup.delay_seconds || 0)) * 1000;
      setTimeout(() => {
        setOpen(true);
        if (popup.show_once) {
          sessionStorage.setItem(STORAGE_KEY, "1");
        }
      }, delay);
    };

    fetchData();
  }, []);

  if (!settings || !open) return null;

  const handleClose = () => setOpen(false);

  const body = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-background rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-border">
        {settings.image_url && (
          <div
            className="h-32 bg-cover bg-center"
            style={{ backgroundImage: `url(${settings.image_url})` }}
          />
        )}
        <button
          className="absolute top-2 right-2 rounded-full bg-black/40 text-white p-1 hover:bg-black/60"
          onClick={handleClose}
          aria-label="Close promotion"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="w-3 h-3" />
            </span>
            <h3 className="text-sm font-semibold">
              {settings.title || "Limited-time offer"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {settings.message || "Share your best deal here to nudge guests to book."}
          </p>
          {settings.coupon_code && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(settings.coupon_code)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary mt-1"
            >
              COUPON: {settings.coupon_code}
            </button>
          )}
          <div className="pt-2 flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => {
                if (settings.cta_link) {
                  window.location.href = settings.cta_link;
                }
              }}
            >
              {settings.cta_text || "Book Now"}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return body;
};

export default PromoPopup;

