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
          50: "#f3f9e8",
          100: "#e2f0c9",
          400: "#a8d65a",
          500: "#93cc3d",
          600: "#5a8721",
          700: "#446519",
        },
        // Reservado a los descuentos de 70% o más: si todas las insignias
        // fueran rojas no destacaría ninguna.
        chollo: "#e5443b",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-archivo-black)", "var(--font-archivo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
