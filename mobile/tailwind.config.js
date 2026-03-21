/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#16a34a",
        "primary-foreground": "#ffffff",
        muted: "#f3f4f6",
        "muted-foreground": "#6b7280",
        destructive: "#ef4444",
        border: "#e5e7eb",
        background: "#ffffff",
        foreground: "#111827",
        card: "#ffffff",
        "card-foreground": "#111827",
      },
    },
  },
  plugins: [],
};
