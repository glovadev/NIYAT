import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        niyat: {
          cream: "#FFFCF8",
          blush: "#F9D5D2",
          forest: "#153D32",
          darkText: "#172723",
          emerald: {
            DEFAULT: "#153D32", // Forest green
            dark: "#0F2E25",
            light: "#1F5445",
            subtle: "#EAF2EE",
          },
          gold: {
            DEFAULT: "#D4AF37", // Royal Emirati Gold
            dark: "#996515",
            metallic: "#C5A059",
            light: "#E8CD96",
            champagne: "#F4E8C1",
            shimmer: "#FCF6BA",
            subtle: "#F9F5EC",
          },
          royal: {
            night: "#061510",
            emerald: "#0A261D",
            gold: "#D4AF37",
          },
          ivory: {
            DEFAULT: "#FFFCF8", // Cream
            card: "#FFFFFF",
            border: "#EAE5DC",
          },
          sage: {
            DEFAULT: "#DCE6D4", // Sage green
            light: "#EAF0E5",
            subtle: "#F4F7F2",
          },
          charcoal: {
            DEFAULT: "#172723", // Dark text
            muted: "#5D6560",
            light: "#8C948F",
          },
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 10px 30px -10px rgba(15, 56, 44, 0.08)",
        "luxury-hover": "0 20px 40px -15px rgba(15, 56, 44, 0.15)",
        gold: "0 4px 20px -2px rgba(197, 160, 89, 0.25)",
      },
      keyframes: {
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
      animation: {
        progress: "progress 5s linear forwards",
      },
    },
  },
  plugins: [],
};

export default config;
