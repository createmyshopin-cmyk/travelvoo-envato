import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";

const FloatingWhatsApp = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [bounce, setBounce] = useState(false);

  // Show tooltip on mount for 4 seconds
  useEffect(() => {
    const showTimer = setTimeout(() => setShowTooltip(true), 1500);
    const hideTimer = setTimeout(() => setShowTooltip(false), 5500);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  // Bounce every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBounce(true);
      setTimeout(() => setBounce(false), 1000);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const openWhatsApp = () => {
    window.open(
      "https://wa.me/919876543210?text=Hello%2C%20I%20want%20to%20enquire%20about%20stays.",
      "_blank"
    );
  };

  return (
    <div className="fixed bottom-20 right-5 z-[80] flex flex-col items-end gap-2">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            className="bg-card text-card-foreground text-xs font-semibold px-3 py-2 rounded-xl shadow-elevated whitespace-nowrap"
          >
            Need help finding a stay? 💬
            <div className="absolute -bottom-1 right-5 w-2.5 h-2.5 bg-card rotate-45 rounded-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={openWhatsApp}
        animate={bounce ? { y: [0, -10, 0, -5, 0] } : {}}
        transition={bounce ? { duration: 0.6, ease: "easeInOut" } : {}}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-whatsapp text-whatsapp-foreground flex items-center justify-center shadow-elevated"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </motion.button>
    </div>
  );
};

export default FloatingWhatsApp;
