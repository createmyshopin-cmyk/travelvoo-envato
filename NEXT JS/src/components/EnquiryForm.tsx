import { useState } from "react";
import { motion } from "framer-motion";
import { Send, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import enquiryIllustration from "@/assets/enquiry-illustration.png";

const typeOptions = ["International", "Domestic"];
const travelTypeOptions = ["Solo", "Group", "Family", "Couple"];

const EnquiryForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    destination: "",
    email: "",
    travelDate: "",
    mobile: "",
    location: "",
    days: "",
    people: "",
    type: "",
    travelType: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      toast({ title: "Please fill in Name and Mobile", variant: "destructive" });
      return;
    }
    const phone = "919876543210";
    const msg = encodeURIComponent(
      `Hi! Enquiry from StayFinder:\nName: ${form.name}\nDestination: ${form.destination}\nEmail: ${form.email}\nTravel Date: ${form.travelDate}\nMobile: ${form.mobile}\nLocation: ${form.location}\nDays: ${form.days}\nPeople: ${form.people}\nType: ${form.type}\nTravel Type: ${form.travelType}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    toast({ title: "Enquiry sent!", description: "We'll get back to you soon." });
  };

  const inputClass =
    "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  const selectClass =
    "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mx-4 my-6 bg-muted rounded-2xl p-4 md:p-8 overflow-hidden"
    >
      <div className="flex flex-col gap-4">
        {/* Illustration — shown above form on all sizes */}
        <div className="flex items-center justify-center rounded-2xl overflow-hidden bg-accent/30 h-[180px] md:h-[220px]">
          <img
            src={enquiryIllustration}
            alt="Travel enquiry"
            loading="lazy"
            className="h-full object-contain"
          />
        </div>

        {/* Form content */}
        <div className="flex-1">
          <h3 className="text-base md:text-xl font-extrabold text-foreground">
            Have a question? Send us your enquiry.
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
            Fill out the form below and submit, our team will contact you for a dreamy travel experience.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-2.5">
              <input
                className={inputClass}
                placeholder="Name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                maxLength={100}
              />
              <input
                className={inputClass}
                placeholder="Destination"
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-2.5">
              <input
                className={inputClass}
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                maxLength={255}
              />
              <input
                className={inputClass}
                placeholder="Period of travel"
                type="date"
                value={form.travelDate}
                onChange={(e) => update("travelDate", e.target.value)}
              />
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <input
                className={inputClass}
                placeholder="Mobile"
                type="tel"
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                maxLength={15}
              />
              <input
                className={inputClass}
                placeholder="Location"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                maxLength={100}
              />
              <input
                className={inputClass}
                placeholder="No. of days"
                type="number"
                min="1"
                max="30"
                value={form.days}
                onChange={(e) => update("days", e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="People"
                type="number"
                min="1"
                max="50"
                value={form.people}
                onChange={(e) => update("people", e.target.value)}
              />
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 items-end">
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.type}
                  onChange={(e) => update("type", e.target.value)}
                >
                  <option value="" disabled>Type</option>
                  {typeOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.travelType}
                  onChange={(e) => update("travelType", e.target.value)}
                >
                  <option value="" disabled>Travel Type</option>
                  {travelTypeOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <button
                type="submit"
                className="col-span-2 md:col-span-1 bg-primary text-primary-foreground font-bold text-sm py-2.5 md:py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Send className="w-4 h-4" /> Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.section>
  );
};

export default EnquiryForm;
