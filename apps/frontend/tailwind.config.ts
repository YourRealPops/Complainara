import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#EFF2EF",
        ink: "#1C2B2A",
        teal: "#1F6F63",
        stamp: "#A63D2F",
        slate: "#5C6B66",
        line: "#D8DDD5",
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