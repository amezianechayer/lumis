/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens (flip via CSS vars on light/dark)
        "lumis-black": "rgb(var(--bg) / <alpha-value>)",
        "lumis-white": "rgb(var(--text) / <alpha-value>)",
        "lumis-cream": "rgb(var(--text) / <alpha-value>)",
        "lumis-gold": "rgb(var(--primary) / <alpha-value>)",
        "lumis-rose": "rgb(var(--primary) / <alpha-value>)",
        "lumis-slate": "#9A8A7A",
        "surface-1": "rgb(var(--bg) / <alpha-value>)",
        "surface-2": "rgb(var(--bg) / <alpha-value>)",
        "surface-3": "rgb(var(--bg) / <alpha-value>)",
        // Semantic card/border tokens (replace white/X usage)
        card: "var(--card)",
        line: "var(--line)",
        success: "#5DCAA5",
        warning: "#E8A35C",
        danger: "#F09595",
      },
      fontFamily: {
        display: ["PlayfairDisplay_700Bold"],
        body: ["DMSans_400Regular"],
        "body-medium": ["DMSans_500Medium"],
        "body-bold": ["DMSans_700Bold"],
        mono: ["JetBrainsMono_400Regular"],
      },
    },
  },
  plugins: [],
};
