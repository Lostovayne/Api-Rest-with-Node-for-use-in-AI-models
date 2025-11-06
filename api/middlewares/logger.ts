import pino from "pino";
import pinoHttp from "pino-http";

// Configure Pino logger
const isProduction = process.env.NODE_ENV === "production";

// Configure Pino logger
const logger = pino(
  isProduction
    ? {} // Default pino configuration for production (JSON)
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
);

// Export pino-http middleware
export const pinoHttpMiddleware = pinoHttp({ logger });

// Export the logger instance for direct use in controllers/services
export { logger };
