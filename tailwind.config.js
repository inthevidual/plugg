/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app.js"],
  safelist: [
    "text-success", "text-warning", "text-error", "text-primary", "text-secondary",
    "bg-primary/15", "bg-secondary/15", "bg-success/15", "bg-error/15",
    "ring-primary/40", "ring-secondary/40", "ring-success/40", "ring-error/40",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fira Sans"', "system-ui", "sans-serif"],
        mono: ['"Fira Mono"', "monospace"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["garden"],
    logs: false,
  },
};
