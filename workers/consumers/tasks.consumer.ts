import { logger as mainLogger } from "../../api/middlewares/logger"; // Import the main logger
import { rabbitmqConfig } from "../../config/rabbitmq.config";
import { queueService } from "../../services/queueService";
import { handleGenerateStudyPath } from "../tasks/generate-study-path.task";
import { handleGenerateQuiz } from "../tasks/generate-quiz.task";
import { handleGenerateImages } from "../tasks/generate-images.task";
import { handleGenerateTts } from "../tasks/tts.task";

const consumerLogger = mainLogger.child({ context: "RabbitMQ-Consumer" });

const startConsumer = async () => {
  // First, connect to RabbitMQ
  await queueService.connect();
  const channel = queueService.getChannel();

  const queue = rabbitmqConfig.queues.taskQueue;

  consumerLogger.info(`Waiting for messages in queue: ${queue}`);

  channel.consume(
    queue,
    async (msg) => {
      if (msg !== null) {
        consumerLogger.info({ messageContent: msg.content.toString() }, "Received message");

        try {
          const { taskType, payload } = JSON.parse(msg.content.toString());
          switch (taskType) {
            case "generateStudyPath":
              await handleGenerateStudyPath(payload);
              break;
            case "generateQuiz":
              await handleGenerateQuiz(payload);
              break;
            case "generateImages":
              await handleGenerateImages(payload);
              break;
            case "generateTTS":
              await handleGenerateTts(payload);
              break;
            // Add more cases for other tasks here in the future
            default:
              consumerLogger.error(`Unknown task type: ${taskType}`);
              break;
          }

          // Acknowledge the message so RabbitMQ removes it from the queue
          channel.ack(msg);
          consumerLogger.info("Message processed and acknowledged.");
        } catch (error) {
          consumerLogger.error({ err: error }, "Error processing message");
          // Negative-acknowledge the message, which can requeue it or send it to a dead-letter queue
          // For simplicity, we'll just nack it without requeueing for now.
          channel.nack(msg, false, false);
          consumerLogger.warn("Message negatively acknowledged.");
        }
      }
    },
    {
      // Manual acknowledgment mode.
      noAck: false,
    }
  );
};

startConsumer().catch((error) => {
  consumerLogger.fatal({ err: error }, "Failed to start consumer");
  process.exit(1);
});
