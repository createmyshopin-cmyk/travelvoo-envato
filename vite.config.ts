import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    // Keep off 8080 — Next.js app (`NEXT JS/`) uses 8080 for `npm run dev`
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    // Raise warning threshold to 1MB (our chunks are intentionally split)
    chunkSizeWarningLimit: 1000,
    // Disable source maps in production for smaller output
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching and parallel loading
        manualChunks: {
          // Core React runtime — changes rarely, long cache life
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Data fetching + Supabase — grouped as "backend" layer
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          // Heavy animation lib — only needed on public pages
          "vendor-motion": ["framer-motion"],
          // Charts only used in admin dashboards
          "vendor-charts": ["recharts"],
          // PDF generation only used in admin quotation/invoice pages
          "vendor-pdf": ["jspdf"],
          // All Radix UI primitives together (they share internal deps)
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-aspect-ratio",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],
          // Utility libs — small but shared everywhere
          "vendor-utils": [
            "clsx",
            "class-variance-authority",
            "tailwind-merge",
            "date-fns",
            "zod",
            "lucide-react",
          ],
          // Form libs
          "vendor-forms": ["react-hook-form", "@hookform/resolvers"],
          // UI extras
          "vendor-ui": [
            "embla-carousel-react",
            "react-resizable-panels",
            "sonner",
            "next-themes",
            "vaul",
            "cmdk",
            "input-otp",
            "react-day-picker",
          ],
        },
        // Deterministic file names with content hash for long-lived caching
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
}));
