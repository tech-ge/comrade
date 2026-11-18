import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#0B6B3A",
          "green-dark": "#084D2A",
          "green-light": "#128A4C",
          black: "#0A0A0A",
          white: "#FFFFFF",
          red: "#B3261E",
          "red-light": "#F5DAD8",
          gray: "#6B7280",
          "gray-light": "#F3F4F6",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
