import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Copy, Users, TicketPercent, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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
  template_type: "lead" | "coupon" | "offer" | "stats" | "announcement";
  subtitle: string;
  stats_text: string;
  primary_color: string;
  background_color: string;
}

const STORAGE_KEY = "stay_promo_popup_seen";

const PromoPopup = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    message: "",
    consent: true,
  });
  const [submittingLead, setSubmittingLead] = useState(false);
  const firstLeadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
      if (!tenantId) return;
      setTenantId(tenantId);
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
        template_type: (data.template_type || "lead") as PopupSettings["template_type"],
        subtitle: data.subtitle || "",
        stats_text: data.stats_text || "",
        primary_color: data.primary_color || "",
        background_color: data.background_color || "",
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && settings?.template_type === "lead") {
      setTimeout(() => firstLeadInputRef.current?.focus(), 10);
    }
  }, [open, settings?.template_type]);

  const primaryColor = settings.primary_color?.trim() || undefined;
  const backgroundColor = settings.background_color?.trim() || undefined;
  const cardStyle = useMemo(
    () => ({
      ...(backgroundColor ? { backgroundColor } : {}),
    }),
    [backgroundColor],
  );
  const primaryStyle = useMemo(
    () => ({
      ...(primaryColor ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" } : {}),
    }),
    [primaryColor],
  );

  const submitLead = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    if (!leadForm.fullName.trim() || !leadForm.phone.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please enter full name and phone number.",
        variant: "destructive",
      });
      return;
    }
    if (!leadForm.consent) {
      toast({
        title: "Consent required",
        description: "Please accept the privacy policy to continue.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingLead(true);
    const { error } = await supabase.from("leads").insert({
      tenant_id: tenantId,
      source: "popup",
      full_name: leadForm.fullName.trim(),
      phone: leadForm.phone.trim(),
      email: leadForm.email.trim(),
      message: leadForm.message.trim(),
      meta: { popupType: "lead" },
    } as never);
    setSubmittingLead(false);

    if (error) {
      toast({
        title: "Failed to save lead",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request sent",
      description: "Thank you. Our team will contact you shortly.",
    });
    setOpen(false);
  };

  const body = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-background rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-border" style={cardStyle}>
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
        {settings.template_type === "lead" ? (
          <div className="p-4 md:p-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Lead Capture</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-bold leading-tight">
                {settings.title || "Begin Your Personalized Consultation Today"}
              </h3>
              {settings.subtitle && (
                <p className="text-sm text-muted-foreground">{settings.subtitle}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {settings.message || "No need to worry, your data is 100% safe with us."}
              </p>
            </div>
            <form className="space-y-3" onSubmit={submitLead}>
              <div>
                <label className="text-xs font-medium">Full Name</label>
                <Input
                  ref={firstLeadInputRef}
                  placeholder="Enter your full name"
                  value={leadForm.fullName}
                  onChange={(e) => setLeadForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Phone Number</label>
                <Input
                  placeholder="Enter your phone number"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Email (optional)</label>
                <Input
                  placeholder="Enter your email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Message (optional)</label>
                <Textarea
                  rows={2}
                  placeholder="Tell us what you need"
                  value={leadForm.message}
                  onChange={(e) => setLeadForm((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
              <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={leadForm.consent}
                  onChange={(e) => setLeadForm((p) => ({ ...p, consent: e.target.checked }))}
                  className="mt-0.5"
                />
                <span>
                  By clicking, you agree to our
                  {" "}
                  <a href="/privacy-policy" className="underline">Privacy Policy</a>
                  {" "}
                  and marketing communication.
                </span>
              </label>
              <Button className="w-full" style={primaryStyle} disabled={submittingLead}>
                {submittingLead ? "Submitting..." : settings.cta_text || "Book an Appointment"}
              </Button>
            </form>
          </div>
        ) : settings.template_type === "coupon" ? (
          <div className="p-4 md:p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <TicketPercent className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Coupon Highlight</span>
            </div>
            <h3 className="text-2xl font-bold">{settings.title || "Special Coupon Inside"}</h3>
            <p className="text-sm text-muted-foreground">
              {settings.message || "Grab this coupon and save on your next booking."}
            </p>
            {settings.coupon_code && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(settings.coupon_code);
                  toast({ title: "Copied", description: "Coupon code copied to clipboard." });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-mono text-primary"
              >
                {settings.coupon_code}
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="pt-2">
              <Button
                style={primaryStyle}
                onClick={() => {
                  if (settings.cta_link) window.location.href = settings.cta_link;
                  else window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {settings.cta_text || "Use Coupon"}
              </Button>
            </div>
          </div>
        ) : settings.template_type === "offer" ? (
          <div className="p-4 md:p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Limited-Time Offer</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold">{settings.title || "Flash Deal"}</h3>
            {settings.subtitle && <p className="text-sm font-medium">{settings.subtitle}</p>}
            <p className="text-sm text-muted-foreground">{settings.message || "Book now and get an exclusive offer."}</p>
            <Button
              style={primaryStyle}
              onClick={() => {
                if (settings.cta_link) window.location.href = settings.cta_link;
              }}
            >
              {settings.cta_text || "Claim Offer"}
            </Button>
          </div>
        ) : settings.template_type === "stats" ? (
          <div className="p-4 md:p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Social Proof</span>
            </div>
            <h3 className="text-2xl font-bold">{settings.title || "Trusted by Guests"}</h3>
            {settings.stats_text && (
              <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {settings.stats_text}
              </div>
            )}
            <p className="text-sm text-muted-foreground">{settings.message || "Join thousands of happy guests who booked with us."}</p>
            {settings.cta_text && (
              <Button
                style={primaryStyle}
                onClick={() => {
                  if (settings.cta_link) window.location.href = settings.cta_link;
                }}
              >
                {settings.cta_text}
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Megaphone className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Announcement</span>
            </div>
            <h3 className="text-2xl font-bold">{settings.title || "Announcement"}</h3>
            <p className="text-sm text-muted-foreground">{settings.message || "Important update from our team."}</p>
            {settings.cta_text && (
              <Button
                style={primaryStyle}
                onClick={() => {
                  if (settings.cta_link) window.location.href = settings.cta_link;
                }}
              >
                {settings.cta_text}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return body;
};

export default PromoPopup;

