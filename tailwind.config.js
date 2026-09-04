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
        // Warm editorial serif — headers, client names, figures of consequence.
        display: [
          "var(--font-display)",
          "ui-serif",
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "serif"
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

        /* ── Warm architectural luxury ───────────────────────────────────────
           Deep espresso replaces black entirely — the darkest value still
           carries red and yellow, so it reads as roasted wood, not ink. */
        espresso: {
          950: "#1F1A15",
          900: "#2A231C",
          800: "#392F26",
          700: "#4B3E33",
          600: "#63533F",
          500: "#7D6B55",
        },
        /* Alabaster grounds — warm off-whites, never a clinical #FFF plane. */
        alabaster: {
          50: "#FDFBF8",
          100: "#FAF6F0",
          200: "#F4EEE4",
          300: "#EDE4D6",
          400: "#E1D5C3",
        },
        /* Taupe — soft rules, secondary and tertiary type. */
        taupe: {
          200: "#E8DFD2",
          300: "#D9CDBB",
          400: "#BCAC96",
          500: "#9C8B75",
          600: "#7C6B57",
          700: "#5E4F3E",
        },
        /* Antique brass accent — burnished, never a bright gold. */
        brass: {
          50: "#FBF5EA",
          100: "#F4E9D4",
          200: "#E8D6B4",
          300: "#D8BF92",
          400: "#C6A672",
          500: "#B08D58",
          600: "#8F7044",
        },
        /* Approved — soft olive, the green of weathered patina. */
        patina: {
          50: "#F3F5EE",
          100: "#E5EBDA",
          200: "#CCD8BB",
          500: "#6E8158",
          600: "#586A45",
          700: "#445236",
        },
        /* Declined — terracotta, warm rather than alarming. */
        clay: {
          50: "#FCF3EE",
          100: "#F6E2D6",
          200: "#E9C8B4",
          500: "#B26B4C",
          600: "#95553A",
          700: "#77422C",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        /* Softened, elegant radii. */
        edge: "6px",
        panel: "10px",
        sheet: "14px",
      },
      letterSpacing: {
        /* Gentle editorial tracking — legible, not technical. */
        architect: "0.08em",
        title: "0.12em",
      },
      boxShadow: {
        "soft": "0 4px 30px rgba(0, 0, 0, 0.03)",
        "elevated": "0 8px 40px rgba(0, 0, 0, 0.06)",
        "card": "0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)",
        "premium": "0 2px 4px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.05)",
        "glow-gold": "0 0 20px rgba(196, 162, 101, 0.15)",
        /* Warm ambient elevation — the shadow is brown, so nothing greys out. */
        hairline: "0 0 0 1px rgba(94, 79, 62, 0.07)",
        riser: "0 1px 2px rgba(58, 46, 34, 0.03), 0 6px 20px -6px rgba(58, 46, 34, 0.07)",
        lift: "0 2px 6px rgba(58, 46, 34, 0.04), 0 18px 40px -16px rgba(58, 46, 34, 0.13)",
        bloom: "0 4px 12px rgba(58, 46, 34, 0.05), 0 28px 60px -24px rgba(58, 46, 34, 0.16)",
        plinth: "0 -1px 0 0 rgba(94, 79, 62, 0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "rise": "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "draw-in": "drawIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
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
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawIn: {
          "0%": { opacity: "0", transform: "scaleX(0)" },
          "100%": { opacity: "1", transform: "scaleX(1)" },
        },
      },
      transitionTimingFunction: {
        architect: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
