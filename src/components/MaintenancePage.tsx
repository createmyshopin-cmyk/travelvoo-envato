import { motion } from "framer-motion";
import { WrenchIcon, Clock, Mail, Phone } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

const MaintenancePage = () => {
  const { siteName, logoUrl, primaryColor } = useBranding();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Animated gear illustration */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="mb-6 text-primary"
      >
        <WrenchIcon className="w-16 h-16" style={{ color: primaryColor || undefined }} />
      </motion.div>

      {/* Logo / site name */}
      <div className="mb-2">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="h-10 mx-auto object-contain" />
        ) : (
          <span className="text-2xl font-extrabold tracking-tight text-primary" style={{ color: primaryColor || undefined }}>
            {siteName}
          </span>
        )}
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-bold text-foreground mt-4"
      >
        We'll be back soon
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-3 text-muted-foreground max-w-sm text-sm leading-relaxed"
      >
        We're performing scheduled maintenance to improve your experience.
        We should be back shortly. Thank you for your patience.
      </motion.p>

      {/* Pulsing dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 mt-8"
      >
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay }}
            className="w-2.5 h-2.5 rounded-full bg-primary"
            style={{ backgroundColor: primaryColor || undefined }}
          />
        ))}
      </motion.div>

      {/* Contact info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground"
      >
        <ContactChip icon={<Clock className="w-3.5 h-3.5" />} label="Estimated time: a few minutes" />
        <ContactChip icon={<Mail className="w-3.5 h-3.5" />} label="Contact us if urgent" />
      </motion.div>
    </div>
  );
};

const ContactChip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5">
    {icon}
    {label}
  </span>
);

export default MaintenancePage;
