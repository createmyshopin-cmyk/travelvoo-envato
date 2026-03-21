import { X, Home, Building, Grid3X3, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const links = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Building, label: "Stays", href: "#stays" },
  { icon: Grid3X3, label: "Categories", href: "#categories" },
  { icon: Phone, label: "Contact", href: "#footer" },
];

const MobileMenu = ({ open, onClose }: MobileMenuProps) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.nav
          className="fixed top-0 left-0 bottom-0 z-[70] w-72 bg-background shadow-elevated flex flex-col"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="flex items-center justify-between px-4 h-[60px] border-b border-border">
            <span className="text-lg font-bold text-primary">StayFinder</span>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 py-4">
            {links.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 px-6 py-3 text-foreground hover:bg-muted transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{label}</span>
              </a>
            ))}
          </div>
        </motion.nav>
      </>
    )}
  </AnimatePresence>
);

export default MobileMenu;
