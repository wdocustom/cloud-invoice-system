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
        // Display serif reserved for the admin + client portal surfaces.
        display: [
          "var(--font-display)",
          "ui-serif",
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "serif"
        ],
        // Technical face for drawing-set style labels, doc numbers and figures.
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace"
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

        /* ── Architectural system ───────────────────────────────────────────
           Deep obsidian slate for ink, rails and high-contrast actions. */
        obsidian: {
          950: "#0A0B0C",
          900: "#111315",
          800: "#191C1F",
          700: "#23272B",
          600: "#31363B",
          500: "#454B51",
        },
        /* Warm bone grounds — the paper of the drawing set. */
        bone: {
          50: "#FCFBF9",
          100: "#F7F4EF",
          200: "#EFEBE4",
          300: "#E3DDD3",
          400: "#D2CABD",
        },
        /* Warm-leaning greys for secondary and tertiary type. */
        graphite: {
          300: "#B3ADA4",
          400: "#948E85",
          500: "#78736B",
          600: "#575249",
          700: "#3B3833",
        },
        /* Restrained metallic accent — brass, not yellow gold. */
        brass: {
          50: "#FAF6EE",
          100: "#F2EADA",
          200: "#E4D5B9",
          300: "#D3BE94",
          400: "#C0A374",
          500: "#A98A5B",
          600: "#8A6E45",
        },
        /* Approved / positive — aged patina green. */
        patina: {
          50: "#F1F5F1",
          100: "#DEE8E0",
          200: "#C2D4C6",
          500: "#4A7355",
          600: "#3B5D45",
          700: "#2E4936",
        },
        /* Declined / destructive — oxidised clay, never a siren red. */
        clay: {
          50: "#FBF3F0",
          100: "#F3E1D9",
          200: "#E5C6BA",
          500: "#A55340",
          600: "#8A4232",
          700: "#6D3327",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        /* Sharp architectural radii. */
        edge: "2px",
        panel: "3px",
        sheet: "5px",
      },
      letterSpacing: {
        architect: "0.16em",
        title: "0.24em",
      },
      boxShadow: {
        "soft": "0 4px 30px rgba(0, 0, 0, 0.03)",
        "elevated": "0 8px 40px rgba(0, 0, 0, 0.06)",
        "card": "0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)",
        "premium": "0 2px 4px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.05)",
        "glow-gold": "0 0 20px rgba(196, 162, 101, 0.15)",
        /* Architectural elevation — shallow, wide, almost colourless. */
        hairline: "0 0 0 1px rgba(17,19,21,0.06)",
        riser: "0 1px 2px rgba(17,19,21,0.03), 0 10px 24px -14px rgba(17,19,21,0.14)",
        lift: "0 2px 4px rgba(17,19,21,0.04), 0 24px 44px -22px rgba(17,19,21,0.20)",
        plinth: "0 -1px 0 0 rgba(17,19,21,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "rise": "rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "draw-in": "drawIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
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
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawIn: {
          "0%": { opacity: "0", transform: "scaleX(0)" },
          "100%": { opacity: "1", transform: "scaleX(1)" },
        },
      },
      transitionTimingFunction: {
        architect: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
