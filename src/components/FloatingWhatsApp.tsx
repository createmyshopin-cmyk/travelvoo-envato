"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { formatPhoneForWhatsApp } from "@/lib/countryCodes";

const FloatingWhatsApp = () => {
  const { settings, loading } = useSiteSettings();
  const [showTooltip, setShowTooltip] = useState(false);
  const [bounce, setBounce] = useState(false);

  const waDigits = useMemo(() => {
    if (!settings?.whatsapp_number?.trim()) return "";
    return formatPhoneForWhatsApp(settings.whatsapp_number.trim());
  }, [settings?.whatsapp_number]);

  const waHref = useMemo(() => {
    if (!waDigits) return "";
    const name = (settings?.site_name || "your property").trim();
    const text = `Hello, I'm interested in stays at ${name}.`;
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`;
  }, [waDigits, settings?.site_name]);

  useEffect(() => {
    if (!waDigits) return;
    const showTimer = setTimeout(() => setShowTooltip(true), 1500);
    const hideTimer = setTimeout(() => setShowTooltip(false), 5500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [waDigits]);

  useEffect(() => {
    if (!waDigits) return;
    const interval = setInterval(() => {
      setBounce(true);
      setTimeout(() => setBounce(false), 1000);
    }, 10000);
    return () => clearInterval(interval);
  }, [waDigits]);

  if (loading || !waDigits || !waHref) return null;

  /* z-40: stay below Dialog/Sheet/AlertDialog overlays (z-50) and similar popups so they fully cover the FAB */
  return (
    <div
      className="fixed z-40 flex flex-col items-end gap-2 pointer-events-none [&>*]:pointer-events-auto
        right-4 sm:right-6
        bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]
        md:bottom-8 md:right-8"
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            className="bg-card text-card-foreground text-xs font-semibold px-3 py-2 rounded-xl shadow-elevated whitespace-nowrap max-w-[min(280px,calc(100vw-2rem))] text-right"
          >
            Need help finding a stay?
            <div className="absolute -bottom-1 right-5 w-2.5 h-2.5 bg-card rotate-45 rounded-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        animate={bounce ? { y: [0, -10, 0, -5, 0] } : {}}
        transition={bounce ? { duration: 0.6, ease: "easeInOut" } : {}}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-whatsapp text-whatsapp-foreground flex items-center justify-center shadow-elevated touch-manipulation"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
      </motion.a>
    </div>
  );
};

export default FloatingWhatsApp;
