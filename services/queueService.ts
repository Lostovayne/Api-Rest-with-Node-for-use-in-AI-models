import { connect, Channel } from 'amqplib';
import { rabbitmqConfig } from '../config/rabbitmq.config';

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

class QueueService {
  private connection: any | null = null;
  private channel: Channel | null = null;

  async connect() {
    if (this.channel) {
      return;
    }

    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      try {
        console.log(`Attempting to connect to RabbitMQ... (${attempts + 1}/${MAX_RETRIES})`);
        this.connection = await connect(rabbitmqConfig.url);

        this.connection.on('error', (err: Error) => {
          console.error('RabbitMQ connection error', err);
          this.connection = null;
          this.channel = null;
        });

        this.connection.on('close', () => {
          console.warn('RabbitMQ connection closed. Reconnecting...');
          this.connection = null;
          this.channel = null;
          setTimeout(() => this.connect(), RETRY_DELAY);
        });

        this.channel = await this.connection.createChannel();

        await this.channel!.assertQueue(rabbitmqConfig.queues.taskQueue, {
          durable: true,
        });

        console.log('Successfully connected to RabbitMQ and queue is asserted.');
        return; // Exit loop on successful connection

      } catch (error) {
        attempts++;
        console.error(`Failed to connect to RabbitMQ (attempt ${attempts}):`, error);
        if (attempts >= MAX_RETRIES) {
          throw new Error('Could not connect to RabbitMQ after multiple retries.');
        }
        await new Promise(res => setTimeout(res, RETRY_DELAY));
      }
    }
  }

  async sendToQueue(queue: string, message: string) {
    if (!this.channel) {
      // This could happen if the connection is lost and not yet re-established.
      // A more advanced implementation could queue messages internally.
      console.error('No RabbitMQ channel available. Message was not sent.');
      throw new Error('RabbitMQ channel is not available.');
    }

    try {
        this.channel.sendToQueue(queue, Buffer.from(message), {
            persistent: true,
        });
        console.log(`Message sent to queue "${queue}": ${message}`);
    } catch (error) {
        console.error('Failed to send message to RabbitMQ:', error);
        // Handle channel/connection errors during send
        throw error;
    }
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('No RabbitMQ channel available. Please connect first.');
    }
    return this.channel;
  }
}

// Export a singleton instance
export const queueService = new QueueService();