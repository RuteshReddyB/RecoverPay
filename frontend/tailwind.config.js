/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fintech: {
          bg: '#F8FAFC',        // Soft Light Grey background (default)
          card: '#FFFFFF',      // Soft off-white card surface
          subtle: '#F1F5F9',    // Light grey secondary panel
          border: '#E2E8F0',    // Clean slate border
          primary: '#4F46E5',   // Indigo primary brand color
          emerald: '#10B981',   // Emerald green revenue recovered
          amber: '#F59E0B',     // Amber human escalation
          rose: '#F43F5E',      // Rose revenue at risk
          text: '#0F172A',      // Slate text
          muted: '#64748B'      // Muted slate text
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}
