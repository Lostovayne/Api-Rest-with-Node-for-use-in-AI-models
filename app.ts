import * as dotenv from "dotenv";
import express, { Request, Response } from "express";
import { createTables, seedDatabase } from "./db";
import routes from "./routes";

import { logger, pinoHttpMiddleware } from "./middlewares/logger";
import { corsMiddleware, helmetMiddleware, rateLimitMiddleware } from "./middlewares/security"; //

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(pinoHttpMiddleware);

// Security Middleware
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(rateLimitMiddleware);

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/", routes);

app.listen(port, async () => {
  await createTables();
  await seedDatabase();
  logger.info(`El servidor está corriendo en el puerto ${port}`);
});
