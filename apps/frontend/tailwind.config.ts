import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Colors and fonts are defined via CSS custom properties in globals.css
  // using Tailwind v4's @theme inline, so no config needed here.
  plugins: [],
} satisfies Config;
