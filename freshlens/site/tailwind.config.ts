import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fresh: "#10b981",
        aging: "#f59e0b",
        stale: "#ef4444",
      },
    },
  },
  plugins: [],
} satisfies Config;
