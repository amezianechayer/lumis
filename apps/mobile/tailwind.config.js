/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Design system Lumis (terracotta / cream sur fond sombre)
        "lumis-black": "#0D0D0F",
        "lumis-white": "#E8D5C0",
        "lumis-cream": "#E8D5C0",
        "lumis-gold": "#C9826B",
        "lumis-rose": "#C9826B",
        "lumis-slate": "#9A8A7A",
        "surface-1": "#0D0D0F",
        "surface-2": "#161618",
        "surface-3": "#1E1E20",
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
