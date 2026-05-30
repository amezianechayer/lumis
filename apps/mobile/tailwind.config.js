/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "lumis-black": "#0A0A0A",
        "lumis-white": "#FAFAF8",
        "lumis-cream": "#F5F0E8",
        "lumis-gold": "#C9A96E",
        "lumis-rose": "#E8A8A0",
        "lumis-slate": "#6B7A8D",
        "surface-1": "#FFFFFF",
        "surface-2": "#F7F7F5",
        "surface-3": "#EEEEEA",
        success: "#4CAF50",
        warning: "#FF9800",
        danger: "#F44336",
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
