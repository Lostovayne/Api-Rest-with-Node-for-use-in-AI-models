import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// CORS Middleware
export const corsMiddleware = cors();

// Helmet Middleware
export const helmetMiddleware = helmet();

// Rate Limiting Middleware
export const rateLimitMiddleware = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});