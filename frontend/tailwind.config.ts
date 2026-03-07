import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        diff: {
          add: {
            bg: "#e6ffec",
            "bg-dark": "#1a2e22",
            line: "#dafbe1",
            "line-dark": "#12261e",
          },
          del: {
            bg: "#ffebe9",
            "bg-dark": "#3d1a1e",
            line: "#ffd7d5",
            "line-dark": "#2d1316",
          },
          hunk: {
            bg: "#ddf4ff",
            "bg-dark": "#1b2a3a",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
