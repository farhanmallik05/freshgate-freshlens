/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#09090b",
          900: "#121215",
          850: "#18181b",
          800: "#27272a",
        },
      },
    },
  },
  plugins: [],
};
