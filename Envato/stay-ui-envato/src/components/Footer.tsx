import { Instagram, Facebook, MessageCircle } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

const Footer = () => {
  const { siteName, logoUrl, footerText } = useBranding();

  const nameParts = siteName.split(/(?=[A-Z\s])/).filter(Boolean);
  const firstPart = nameParts[0] || "Stay";
  const restPart  = nameParts.slice(1).join("") || "Finder";

  return (
    <footer id="footer" className="bg-muted mt-6 pt-8 pb-6 px-4 md:px-6 lg:px-8">
      {/* Desktop: 3-col grid. Mobile: single column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">

        {/* Brand + social */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} loading="lazy" className="h-8 w-auto max-w-[140px] object-contain" />
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-lg font-extrabold text-primary">{firstPart}</span>
                <span className="text-lg font-extrabold text-foreground">{restPart}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {footerText || `Discover the best stays in Wayanad. From luxury resorts to budget-friendly rooms, find your perfect getaway.`}
          </p>
          <div className="flex gap-3 mt-4">
            {[
              { icon: Instagram,     label: "Instagram" },
              { icon: Facebook,      label: "Facebook" },
              { icon: MessageCircle, label: "WhatsApp" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                aria-label={label}
                className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-soft hover:bg-accent transition-colors"
              >
                <Icon className="w-5 h-5 text-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-sm font-bold text-foreground mb-3">Quick Links</h4>
          <div className="flex flex-col gap-2">
            {["Home", "Stays", "Categories", "Contact"].map((link) => (
              <a key={link} href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
                {link}
              </a>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm font-bold text-foreground mb-3">Get in Touch</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Plan your perfect stay with us.</p>
            <p>Available Mon – Sun, 9 AM – 8 PM</p>
            <a href="mailto:hello@stayfinder.com" className="block hover:text-primary transition-colors">
              hello@stayfinder.com
            </a>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center border-t border-border pt-4">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
