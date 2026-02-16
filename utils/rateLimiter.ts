/**
 * Client-side Rate Limiter
 * 
 * Prevents users from spamming Gemini API calls.
 * Free Gemini API: 15 RPM / 1M TPM
 */

interface RateLimitEntry {
    timestamps: number[];
}

const rateLimits: Record<string, RateLimitEntry> = {};

/**
 * Check if an action is rate-limited.
 * @param action - A unique identifier for the action (e.g., 'gemini-chat', 'gemini-analyze')
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns { allowed: boolean, retryAfterMs: number }
 */
export const checkRateLimit = (
    action: string,
    maxRequests: number = 10,
    windowMs: number = 60000
): { allowed: boolean; retryAfterMs: number; remaining: number } => {
    const now = Date.now();

    if (!rateLimits[action]) {
        rateLimits[action] = { timestamps: [] };
    }

    const entry = rateLimits[action];

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

    if (entry.timestamps.length >= maxRequests) {
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = windowMs - (now - oldestInWindow);
        return {
            allowed: false,
            retryAfterMs,
            remaining: 0
        };
    }

    entry.timestamps.push(now);
    return {
        allowed: true,
        retryAfterMs: 0,
        remaining: maxRequests - entry.timestamps.length
    };
};

/**
 * Shorthand for Gemini API rate limiting.
 * Allows 12 requests per minute (under the 15 RPM free tier limit).
 */
export const checkGeminiRateLimit = (): { allowed: boolean; retryAfterMs: number; remaining: number } => {
    return checkRateLimit('gemini-api', 12, 60000);
};

/**
 * Format retry time for display
 */
export const formatRetryTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
};
