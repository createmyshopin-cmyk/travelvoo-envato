import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import type { Trip } from "@/types/trip";

interface TripSidebarProps {
  trip: Trip;
}

export default function TripSidebar({ trip }: TripSidebarProps) {
  const { format: fmt } = useCurrency();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    travellers: "",
    date: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please fill in Name and Phone Number");
      return;
    }
    setSubmitting(true);
    const phone = "919876543210";
    const msg = encodeURIComponent(
      `Hi! Enquiry for trip "${trip.name}":\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nTravellers: ${form.travellers}\nDate: ${form.date}\nMessage: ${form.message}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    toast.success("Enquiry sent! We'll get back to you soon.");
    setSubmitting(false);
  };

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <div className="sticky top-[76px] rounded-2xl border bg-background shadow-card overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4">
        <span className="text-xs font-medium text-primary block">Starting from</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-bold text-foreground">{fmt(trip.startingPrice)}</span>
          <span className="text-sm text-muted-foreground">per adult</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Get in Touch.</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Our trip expert will assist you personally.
          </p>
        </div>

        <input
          className={inputClass}
          placeholder="Name*"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="email"
          placeholder="Email*"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <input
          className={inputClass}
          type="tel"
          placeholder="Phone Number*"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="number"
          placeholder="No. of Travellers*"
          min={1}
          value={form.travellers}
          onChange={(e) => update("travellers", e.target.value)}
        />
        <input
          className={inputClass}
          type="date"
          placeholder="Date*"
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
        />
        <textarea
          className={inputClass + " resize-none min-h-[80px]"}
          placeholder="Your Message"
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Talk to Our Expert
        </button>
      </form>
    </div>
  );
}
