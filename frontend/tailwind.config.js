/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nic-blue': '#1a73e8',
        'nic-dark': '#1a1a2e',
        'nic-gray': '#f0f2f5',
      }
    },
  },
  plugins: [],
}