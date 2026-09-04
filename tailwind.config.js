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
        // Same grotesque as the UI. There is no display face: hierarchy is
        // size and weight, so nothing can drift into a wedding suite.
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

        /* ── WDO job file ───────────────────────────────────────────────────
           Warm paper the whole product is printed on. 50 is the sheet that
           lifts; 100 is the page. */
        paper: {
          50: "#FFFCF8",
          100: "#F6F3EE",
          200: "#EFEAE2",
          300: "#E7E1D7",
          400: "#DDD5C9",
        },
        /* Graphite, not costume brown. 900 is body copy. */
        ink: {
          900: "#1A1916",
          800: "#2C2A26",
          700: "#3D3A35",
          500: "#5C5852",
          400: "#7C766D",
          300: "#9E978C",
        },
        /* Warm stone rules. Never #E5E5E5, never gold. */
        rule: {
          200: "#E3DCD2",
          300: "#D9D2C8",
          400: "#C6BDB0",
        },
        /* The one accent metal. Oxidized bronze, used for focus, the active
           tab and primary-button hover — never as a large fill. */
        bronze: {
          50: "#F5F0E8",
          200: "#DCCBB2",
          400: "#8C6B48",
          500: "#6B4F35",
          600: "#57402B",
          700: "#41301F",
        },
        /* Signed / complete — muted forest, not neon. */
        forest: {
          50: "#EEF2EC",
          200: "#C6D2C1",
          600: "#3F5B3A",
          700: "#32492E",
        },
        /* Awaiting / pending — dust, not candy yellow. */
        dust: {
          50: "#F6F1E4",
          200: "#E1D6B9",
          600: "#7A6634",
          700: "#5E4F27",
        },
        /* Declined / destructive — dry brick, used rarely. */
        brick: {
          50: "#F7EDE9",
          200: "#E4C6BA",
          600: "#8C4A32",
          700: "#6E3925",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        /* Small or none. Nothing app-card sized. */
        edge: "4px",
        panel: "6px",
        sheet: "8px",
      },
      letterSpacing: {
        /* Slight tracking for sentence-case labels. */
        architect: "0.01em",
        /* Reserved for true specs: LICENSE, DRAW #, proposal numbers. */
        title: "0.08em",
      },
      boxShadow: {
        "soft": "0 4px 30px rgba(0, 0, 0, 0.03)",
        "elevated": "0 8px 40px rgba(0, 0, 0, 0.06)",
        "card": "0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)",
        "premium": "0 2px 4px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.05)",
        "glow-gold": "0 0 20px rgba(196, 162, 101, 0.15)",
        /* One whisper, and a hard edge for overlays. Everything else is a 1px
           stone rule. */
        hairline: "0 0 0 1px #D9D2C8",
        riser: "none",
        lift: "0 1px 2px rgba(26,25,22,0.04)",
        bloom: "0 1px 3px rgba(26,25,22,0.08), 0 24px 48px -16px rgba(26,25,22,0.22)",
        plinth: "0 -1px 0 0 #D9D2C8",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "rise": "rise 0.18s ease-out both",
        "draw-in": "drawIn 0.18s ease-out both",
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
          "0%": { opacity: "0", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      transitionTimingFunction: {
        architect: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
