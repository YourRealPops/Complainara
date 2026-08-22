import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A1210",
        surface: "#0F1A17",
        foreground: "#ECF1EE",
        muted: "#93A29C",
        teal: "#2FE6C0",
        stamp: "#FF6B4A",
        line: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["var(--font-archivo)"],
        body: ["var(--font-inter)"],
        mono: ["var(--font-plex-mono)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
