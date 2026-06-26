/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif"
        ],
        editorial: [
          "var(--font-editorial)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
      },
      colors: {
        brand: {
          alabaster: "#FBFBFA",
          charcoal: "#1A1A1A",
          warm: "#F5F3F0",
          stone: "#E8E4DF",
          muted: "#9C9590",
        },
        luxury: {
          gold: "#C4A265",
          champagne: "#E8D5B7",
          ochre: "#B8860B",
          soft: "#F9F3E8",
        },
        sage: {
          50: "#F4F7F4",
          100: "#E4ECE4",
          200: "#C8D9C8",
          500: "#6B8F6B",
          600: "#4A7A4A",
          700: "#3D6B3D",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        "soft": "0 4px 30px rgba(0, 0, 0, 0.03)",
        "elevated": "0 8px 40px rgba(0, 0, 0, 0.06)",
        "card": "0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)",
        "premium": "0 2px 4px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.05)",
        "glow-gold": "0 0 20px rgba(196, 162, 101, 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
