import amqp, { Channel, Connection } from 'amqplib';
import { rabbitmqConfig } from '../config/rabbitmq.config';

class QueueService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  async connect() {
    if (this.connection && this.channel) {
      return;
    }

    try {
      console.log('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(rabbitmqConfig.url);
      this.channel = await this.connection.createChannel();

      // Assert the queue to ensure it exists
      await this.channel.assertQueue(rabbitmqConfig.queues.taskQueue, {
        durable: true, // The queue will survive a broker restart
      });

      console.log('Successfully connected to RabbitMQ and queue is asserted.');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      // Implement retry logic or exit gracefully
      throw error;
    }
  }

  async sendToQueue(queue: string, message: string) {
    if (!this.channel) {
      throw new Error('No RabbitMQ channel available. Please connect first.');
    }

    // The message is sent as a Buffer
    this.channel.sendToQueue(queue, Buffer.from(message), {
      persistent: true, // The message will be saved to disk
    });
    console.log(`Message sent to queue "${queue}": ${message}`);
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
