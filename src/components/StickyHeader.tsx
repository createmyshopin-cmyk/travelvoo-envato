import { Menu, Heart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MobileMenu from "./MobileMenu";
import { useWishlist } from "@/context/WishlistContext";
import { useBranding } from "@/context/BrandingContext";

const NAV_LINKS = [
  { label: "Home",       href: "/" },
  { label: "Stays",      href: "#stays" },
  { label: "Trips",      href: "/trips" },
  { label: "Categories", href: "#categories" },
  { label: "Contact",    href: "#footer" },
];

const StickyHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { count } = useWishlist();
  const { siteName, logoUrl } = useBranding();

  const nameParts = siteName.split(/(?=[A-Z\s])/).filter(Boolean);
  const firstPart = nameParts[0] || "Stay";
  const restPart  = nameParts.slice(1).join("") || "Finder";

  return (
    <>
      <header className="sticky top-0 z-50 bg-background shadow-soft">
        <div className="h-[60px] max-w-lg mx-auto md:max-w-5xl lg:max-w-7xl xl:max-w-[1400px] flex items-center justify-between px-4 md:px-6">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>

          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => router.push("/")}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 w-auto max-w-[140px] object-contain" />
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xl font-extrabold tracking-tight text-primary">{firstPart}</span>
                <span className="text-xl font-extrabold tracking-tight text-foreground">{restPart}</span>
              </div>
            )}
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1 ml-8">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right: wishlist */}
          <button
            onClick={() => router.push("/wishlist")}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Wishlist"
          >
            <Heart className={`w-5 h-5 transition-colors ${count > 0 ? "fill-primary text-primary" : "text-foreground"}`} />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};

export default StickyHeader;
