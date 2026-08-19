/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // DigitalSentinel Core Tokens
        "ds-navy": "#0B2340",
        "ds-blue": "#0A3254",
        "ds-blue-hover": "#07233B",
        "ds-blue-soft": "#E6F0F9",
        "ds-red": "#D32F2F",
        "ds-bg": "#FFFFFF",
        "ds-white": "#FFFFFF",
        "ds-border": "#E0E0E0",
        "ds-ink": "#111827",
        "ds-text": "#374151",
        "ds-muted": "#6B7280",
        "ds-disabled": "#9CA3AF",

        // Domain Specific
        "cdr": "#0A3254",
        "ipdr": "#0B5CAB",
        "bank": "#D32F2F",
        "social": "#1976D2",
        "ncrp": "#B71C1C",

        "cdr-cyan": "#0A3254",
        "ipdr-purple": "#0B5CAB",
        "bank-orange": "#D32F2F",

        // Severity
        "critical": "#D32F2F",
        "high": "#E53935",
        "medium": "#1E88E5",
        "low": "#64B5F6",

        // Material / Stitch token mappings
        "primary": "#0B5CAB",
        "primary-container": "#0B2340",
        "on-primary": "#ffffff",
        "on-primary-container": "#bfd6ff",
        "primary-fixed": "#d5e3ff",
        "primary-fixed-dim": "#a7c8ff",
        "secondary": "#005FAF",
        "secondary-container": "#C3D8FE",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#495e7e",
        "tertiary": "#C8102E",
        "tertiary-container": "#BB0027",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ffc8c6",
        "error": "#BA1A1A",
        "error-container": "#FFDAD6",
        "on-error": "#ffffff",
        "on-error-container": "#93000A",
        "surface": "#F5F7FA",
        "surface-bright": "#F7F9FC",
        "surface-dim": "#D8DADD",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F2F4F7",
        "surface-container": "#ECEEF1",
        "surface-container-high": "#E6E8EB",
        "surface-container-highest": "#E0E3E6",
        "surface-variant": "#E0E3E6",
        "surface-white": "#FFFFFF",
        "on-surface": "#191C1E",
        "on-surface-variant": "#424751",
        "on-background": "#191C1E",
        "outline": "#727783",
        "outline-variant": "#D9E1EA",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.375rem",
        "xl": "0.5rem",
        "full": "9999px"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        "data-mono": ["'JetBrains Mono'", "monospace"],
        "headline-lg": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"],
      },
      fontSize: {
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "700" }],
        "data-mono": ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "headline-lg": ["30px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }]
      },
      spacing: {
        "stack-sm": "0.5rem",
        "stack-md": "1rem",
        "stack-lg": "2rem",
        "gutter": "1rem",
        "margin": "1.5rem",
        "margin-desktop": "1.5rem",
        "margin-mobile": "1rem",
        "container-max": "1600px",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
      },
      animation: {
        blob: "blob 7s infinite",
      },
    },
  },
  plugins: [],
}
