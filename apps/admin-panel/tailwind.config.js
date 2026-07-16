const colors = require('tailwindcss/colors');

/**
 * Kasi Admin Console — design tokens (P4 refonte design, 2026-07-16).
 *
 * Identité Kasi : pétrole (primaire, interactif) + orange (accent signature),
 * fonts Bricolage Grotesque (display) + DM Sans (texte). Alignée sur la charte
 * de la landing kasigroupe. Remplace le bleu Ridy hérité de ng-zorro.
 *
 * darkMode: 'class' — le ThemeService pose/retire `.dark` sur <html>, initialisé
 * depuis prefers-color-scheme (« suivre le système ») puis pilotable au toggle.
 */
module.exports = {
  mode: 'jit',
  prefix: '',
  content: ['apps/admin-panel/**/*.{html,ts,css}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pétrole — couleur primaire (boutons, nav active, liens). Ancre 600 = teal du logo #1285A2.
        primary: {
          50: '#eef8fb',
          100: '#d2eef5',
          200: '#a7dceb',
          300: '#6ec4dd',
          400: '#3aa9c9',
          500: '#1a97b8',
          600: '#1285a2',
          700: '#146d85',
          800: '#17566a',
          900: '#184656',
          950: '#0a2a35',
        },
        // Orange Kasi — accent signature (pin ligne-trajet, deltas positifs, badges LIVE, CTA clés).
        secondary: {
          50: '#fef6ec',
          100: '#fce4c6',
          200: '#f8c98c',
          300: '#f4ac51',
          400: '#ef972b',
          500: '#e08411',
          600: '#bd6c0e',
          700: '#985313',
          800: '#7c4315',
          900: '#663715',
          950: '#3a1c06',
        },
        // Alias sémantique explicite (identique à primary, lisibilité dans les templates).
        petrol: {
          50: '#eef8fb',
          100: '#d2eef5',
          200: '#a7dceb',
          300: '#6ec4dd',
          400: '#3aa9c9',
          500: '#1a97b8',
          600: '#1285a2',
          700: '#146d85',
          800: '#17566a',
          900: '#184656',
          950: '#0a2a35',
        },
        kasi: {
          DEFAULT: '#f0982e', // orange accent sur fond sombre
          ink: '#0a2a35', // encre pétrole profonde
        },
        // Rail latéral — pétrole/charbon, sombre dans les deux thèmes (identité constante).
        rail: {
          DEFAULT: '#0b2129',
          hover: '#12303b',
          active: '#123f4d',
          border: 'rgba(255,255,255,0.07)',
        },
        neutral: colors.slate,
      },
      fontFamily: {
        sans: [
          '"DM Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        display: [
          '"Bricolage Grotesque"',
          '"DM Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      borderRadius: {
        kasi: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,42,53,0.04), 0 8px 24px -12px rgba(10,42,53,0.12)',
        rail: '2px 0 24px -12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
