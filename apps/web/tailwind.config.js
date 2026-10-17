/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0b0f19",
        card: "#111827",
        border: "#1f2937",
        primary: "#3b82f6",
        accent: "#8b5cf6",
        danger: "#ef4444",
        warning: "#f59e0b",
        success: "#10b981",
      },
    },
  },
  plugins: [],
};
