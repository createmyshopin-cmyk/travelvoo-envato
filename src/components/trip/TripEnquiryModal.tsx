import { useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TripEnquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripName: string;
}

export default function TripEnquiryModal({
  open,
  onOpenChange,
  tripName,
}: TripEnquiryModalProps) {
  const [form, setForm] = useState({
    name: "",
    isdCode: "+91",
    phone: "",
    callback: false,
  });

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please fill in Name and Phone Number");
      return;
    }
    const phone = "919876543210";
    const msg = encodeURIComponent(
      `Hi! Itinerary request for "${tripName}":\nName: ${form.name}\nPhone: ${form.isdCode} ${form.phone}\nCallback: ${form.callback ? "Yes" : "No"}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    toast.success("Request sent! We'll share the itinerary soon.");
    onOpenChange(false);
  };

  const inputClass =
    "w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-xl">Enquire & Download Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <input
            className={inputClass}
            placeholder="Full Name *"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />

          <div className="flex gap-3">
            <select
              className={inputClass + " !w-28 shrink-0"}
              value={form.isdCode}
              onChange={(e) => update("isdCode", e.target.value)}
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+61">+61</option>
              <option value="+971">+971</option>
            </select>
            <input
              className={inputClass}
              type="tel"
              placeholder="Phone Number (WhatsApp) *"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.callback}
              onChange={(e) => update("callback", e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            Expecting a callback?
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-colors"
          >
            Submit
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
