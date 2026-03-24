import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Consumer, Kafka } from "kafkajs";

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka = new Kafka({
    clientId: "payment-service",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  });
  private consumer: Consumer = this.kafka.consumer({ groupId: "payment-group" });
  private isShuttingDown = false;

  async onModuleInit() {
    await this.startConsumerWithRetry();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    await this.disconnectConsumer();
  }

  private async startConsumerWithRetry() {
    while (!this.isShuttingDown) {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: "order.created",
          fromBeginning: true,
        });

        this.logger.log("Payment Service connected to Kafka");

        await this.consumer.run({
          eachMessage: async ({ message }) => {
            const data = JSON.parse(message.value?.toString() || "{}");

            this.logger.log(`Received order event: ${JSON.stringify(data)}`);
            await this.processPayment(data);
          },
        });

        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Payment consumer failed: ${message}. Retrying in 5 seconds.`,
        );
        await this.disconnectConsumer();
        this.consumer = this.kafka.consumer({ groupId: "payment-group" });
        await this.delay(5000);
      }
    }
  }

  private async disconnectConsumer() {
    try {
      await this.consumer.disconnect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to disconnect payment consumer cleanly: ${message}`);
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async processPayment(order: any) {
    this.logger.log(`Processing payment for order ${order.id}`);

    await new Promise((res) => setTimeout(res, 1000));

    this.logger.log(`Payment successful for order ${order.id}`);
  }
}