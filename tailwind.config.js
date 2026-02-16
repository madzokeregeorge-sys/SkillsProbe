/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{tsx,ts}",
        "./components/**/*.{tsx,ts}",
        "./hooks/**/*.{tsx,ts}",
        "./utils/**/*.{tsx,ts}",
    ],
    theme: {
        extend: {
            colors: {
                slate: {
                    850: '#1c1917',
                    900: '#0c0a09',
                    950: '#000000',
                },
                primary: {
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                },
                secondary: {
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'blob': 'blob 7s infinite',
                'fadeIn': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slideIn': 'slideIn 0.3s ease-out',
            },
            keyframes: {
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideIn: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
