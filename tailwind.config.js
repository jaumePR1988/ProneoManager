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
                proneo: {
                    green: '#74b72e', // Estimated Proneo Green from logo
                    dark: '#0a0a0a',
                    card: '#161616',
                    border: '#262626'
                }
            }
        },
    },
    plugins: [],
}
