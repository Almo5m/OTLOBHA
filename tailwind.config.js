/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Design Tokens (مصدر واحد للحقيقة — كل الألوان من هنا) ----
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surfaceElevated: 'var(--color-surface-elevated)',
        borderc: 'var(--color-border)',
        textPrimary: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          strong: 'var(--color-accent-strong)',
          soft: 'var(--color-accent-soft)',
          neon: 'var(--color-accent-neon)'
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          dark: 'var(--color-brand-dark)'
        },
        inkContrast: 'var(--color-ink-contrast)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',

        // ---- أسماء قديمة متوافقة رجعيًا (Legacy aliases) — نفس الـTokens ----
        ink: 'var(--color-text-primary)',
        paper: 'var(--color-bg)',
        primary: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-strong)',
          light: 'var(--color-accent-soft)'
        },
        line: 'var(--color-border)'
      },
      fontFamily: {
        sans: ['var(--font-arabic)', 'var(--font-latin)', 'sans-serif'],
        latin: ['var(--font-latin)', 'sans-serif']
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)'
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)'
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)'
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 0.55 }, '50%': { opacity: 1 } }
      },
      animation: {
        fadeIn: 'fadeIn var(--duration-base) var(--ease-standard)',
        scaleIn: 'scaleIn var(--duration-base) var(--ease-standard)',
        slideUp: 'slideUp var(--duration-slow) var(--ease-standard)',
        pulseSoft: 'pulseSoft 1.6s var(--ease-standard) infinite'
      }
    }
  },
  plugins: []
};
