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
        // Same commanding grotesque as the UI face; hierarchy comes from
        // weight, scale and tracking rather than from a second family.
        display: [
          "var(--font-display)",
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

        /* ── Bold industrial luxury ──────────────────────────────────────────
           Matte machined blacks. Low numbers are the deepest so a lower step
           always reads as "further back". */
        carbon: {
          950: "#08090A",
          900: "#0F1112",
          850: "#16181A",
          800: "#1E2123",
          700: "#2A2E31",
          600: "#3A3F43",
          500: "#4E5459",
        },
        /* Titanium greys — secondary type, tick marks, inert data. */
        steel: {
          300: "#B7BDC2",
          400: "#8D949A",
          500: "#6C7378",
          600: "#545A5F",
          700: "#3C4145",
        },
        /* Stark white — inverted blocks, primary type, the hardest contrast. */
        chalk: {
          50: "#FFFFFF",
          100: "#F2F4F5",
          200: "#DDE1E3",
        },
        /* Burnt architectural amber. Low steps are dark tints for chips on
           black; mid and high steps are the vivid accent and its type. */
        ember: {
          50: "#1A1008",
          100: "#241608",
          200: "#4A2C10",
          300: "#B4611F",
          400: "#E2761F",
          500: "#F58220",
          600: "#FF9A45",
          700: "#FFB776",
        },
        /* Approved — signal green, calibrated for black. */
        signal: {
          50: "#0C1A10",
          100: "#102516",
          200: "#2A5138",
          500: "#34C05E",
          600: "#56D97C",
          700: "#7FE79C",
        },
        /* Declined — hazard crimson, distinct from the amber accent. */
        crimson: {
          50: "#1F0D0D",
          100: "#2A1111",
          200: "#5A2222",
          500: "#E5484D",
          600: "#F26D71",
          700: "#FF9296",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        /* Machined edges. */
        edge: "0px",
        panel: "0px",
        sheet: "2px",
      },
      letterSpacing: {
        /* Blueprint tracking for uppercase micro-labels. */
        architect: "0.18em",
        title: "0.28em",
      },
      boxShadow: {
        "soft": "0 4px 30px rgba(0, 0, 0, 0.03)",
        "elevated": "0 8px 40px rgba(0, 0, 0, 0.06)",
        "card": "0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)",
        "premium": "0 2px 4px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.05)",
        "glow-gold": "0 0 20px rgba(196, 162, 101, 0.15)",
        /* Structure comes from edges, not from blur. Only overlays cast. */
        hairline: "0 0 0 1px #2A2E31",
        riser: "none",
        lift: "none",
        bloom: "0 0 0 1px #2A2E31, 0 40px 80px -24px rgba(0,0,0,0.9)",
        plinth: "0 -1px 0 0 #2A2E31",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "rise": "rise 0.35s cubic-bezier(0.2, 0, 0, 1) both",
        "draw-in": "drawIn 0.45s cubic-bezier(0.2, 0, 0, 1) both",
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
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawIn: {
          "0%": { opacity: "0", transform: "scaleX(0)" },
          "100%": { opacity: "1", transform: "scaleX(1)" },
        },
      },
      transitionTimingFunction: {
        architect: "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
};
