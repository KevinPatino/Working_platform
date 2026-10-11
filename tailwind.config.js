/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand-primary)",
          hover: "var(--color-brand-hover)",
          accent: "var(--color-brand-accent)",
          "accent-light": "var(--color-brand-accent-light)",
        },
        status: {
          success: "var(--color-status-success)",
          "success-light": "var(--color-status-success-light)",
          danger: "var(--color-status-danger)",
          "danger-light": "var(--color-status-danger-light)",
          warning: "var(--color-status-warning)",
          "warning-light": "var(--color-status-warning-light)",
        },
      },
    },
  },
  plugins: [],
};