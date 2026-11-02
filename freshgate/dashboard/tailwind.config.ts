import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#09090b",
          900: "#121215",
          850: "#18181b",
          800: "#27272a",
        },
        fresh: {
          500: "#10b981",
          950: "rgba(16, 185, 129, 0.1)",
        },
        aging: {
          500: "#f59e0b",
          950: "rgba(245, 158, 11, 0.1)",
        },
        stale: {
          500: "#f43f5e",
          950: "rgba(244, 63, 94, 0.1)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
