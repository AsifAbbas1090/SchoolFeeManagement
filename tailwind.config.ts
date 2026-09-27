import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: token("bg"),
        surface: token("surface"),
        foreground: token("fg"),
        muted: token("muted"),
        border: token("border"),
        grid: token("grid"),
        accent: {
          DEFAULT: token("accent"),
          strong: token("accent-strong"),
          fg: token("accent-fg"),
          soft: token("accent-soft"),
        },
        chart: { DEFAULT: token("chart"), 2: token("chart-2") },
        warn: { DEFAULT: token("warn"), soft: token("warn-soft") },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
