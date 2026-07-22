import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f8",
          100: "#fce7f3",
          500: "#db2777",
          600: "#be185d",
          700: "#9d174d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
