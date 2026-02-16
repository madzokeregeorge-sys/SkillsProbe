/**
 * Gemini API Configuration
 * 
 * Centralized place to get the API key. Currently client-side via env var.
 * When you upgrade to Firebase Cloud Functions, update this to point to your function endpoint.
 */

export const getGeminiApiKey = (): string => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || key === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error(
            '⚠️ Gemini API key is missing!\n' +
            'Please set VITE_GEMINI_API_KEY in your .env.local file.\n' +
            'Get a key at: https://aistudio.google.com/apikey'
        );
        return '';
    }
    return key;
};
