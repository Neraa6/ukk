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
        heritage: {
          green: {
            50: "#f3f6f4",
            100: "#e2ebdf",
            200: "#c7d8c2",
            300: "#a2be9c",
            400: "#7b9f74",
            500: "#588052",
            600: "#44653f",
            700: "#375133",
            800: "#1d3b2b", // soft green
            900: "#0d1f15", // deep green
            950: "#060f0a",
          },
          gold: {
            50: "#faf8f5",
            100: "#f3ede3",
            200: "#e6d9c4",
            300: "#d4be9c",
            400: "#c5a880", // gold accent
            500: "#a9895c",
            600: "#927047",
            700: "#7a593b",
            800: "#634731",
            900: "#523c2a",
          },
          cream: {
            50: "#faf9f6", // softest cream
            100: "#f4efe6", // main cream background
            200: "#e9e0cf", // dark cream
            300: "#dbccb4",
          }
        }
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
