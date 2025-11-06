import * as dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { createTables, seedDatabase } from "../db"; // Adjusted path
import { queueService } from "../services/queueService";
import { logger, pinoHttpMiddleware } from "./middlewares/logger";
import {
  corsMiddleware,
  helmetMiddleware,
  rateLimitMiddleware,
} from "./middlewares/security";
import routes from "./routes";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Pino HTTP logger (activado solo en producción)
if (process.env.NODE_ENV === "production") {
  app.use(pinoHttpMiddleware);
}

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
  await queueService.connect();
  logger.info(`El servidor está corriendo en el puerto ${port}`);
  logger.info(
    `RabbitMQ conectado y listo para usar en su UI http://localhost:15672.`,
  );
});
