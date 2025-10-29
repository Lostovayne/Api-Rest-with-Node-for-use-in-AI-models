export const rabbitmqConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672',
  queues: {
    taskQueue: 'task_queue',
  },
  exchanges: {
    taskExchange: 'task_exchange',
  },
  routingKeys: {
    taskRoutingKey: 'task_routing_key',
  },
};
