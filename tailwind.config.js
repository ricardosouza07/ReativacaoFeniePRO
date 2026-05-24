/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#C8932E",
        sidebar: "#1A1F36",
        background: "#F5F6FA",
      },
      fontFamily: {
        kpi: ["Syne", "sans-serif"],
        display: ["Cormorant Garamond", "serif"],
      },
    },
  },
  plugins: [],
}
