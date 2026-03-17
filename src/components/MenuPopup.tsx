import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Utensils } from "lucide-react";

interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

interface SiteSettingsLite {
  menu_popup_enabled: boolean;
  menu_popup_title: string;
}

const MenuPopup = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<SiteSettingsLite | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: settingsData }, { data: tenantId }] = await Promise.all([
        supabase.from("site_settings").select("menu_popup_enabled, menu_popup_title").limit(1).single(),
        supabase.rpc("get_my_tenant_id"),
      ]);

      if (settingsData) {
        setSettings(settingsData as SiteSettingsLite);
      }
      if (!settingsData?.menu_popup_enabled || !tenantId) return;

      const { data: menu } = await supabase
        .from("menu_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });

      setItems((menu || []) as MenuItem[]);
    };

    fetchData();
  }, []);

  if (!settings?.menu_popup_enabled || items.length === 0) return null;

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!item.is_available) return acc;
    const key = item.category || "General";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const hasItems = Object.keys(grouped).length > 0;
  if (!hasItems) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[70] md:right-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 shadow-lg hover:shadow-xl active:scale-95 transition-transform"
      >
        <Utensils className="w-4 h-4" />
        <span className="text-xs font-semibold">Menu</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[86] flex items-end justify-center md:items-center md:justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-background rounded-t-3xl md:rounded-2xl shadow-2xl border border-border max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">
                  {settings.menu_popup_title || "Our Menu"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-4 overflow-y-auto max-h-[70vh]">
              {Object.entries(grouped).map(([category, values]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {values.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between border border-border/60 rounded-lg px-3 py-2"
                      >
                        <div className="flex-1 pr-2">
                          <div className="text-xs font-semibold">{item.name}</div>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-semibold text-primary">
                            ₹{Number(item.price || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuPopup;

