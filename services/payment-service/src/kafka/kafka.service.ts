import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Consumer, Kafka } from "kafkajs";

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka = new Kafka({
    clientId: "payment-service",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  });
  private consumer: Consumer = this.kafka.consumer({
    groupId: "payment-group",
  });
  private producer = this.kafka.producer();
  private isShuttingDown = false;

  async onModuleInit() {
    await this.producer.connect();
    await this.startConsumerWithRetry();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    await this.disconnectConsumer();
    await this.producer.disconnect();
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
            // await this.processPayment(data);
            await this.handleWithRetry(data);
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
      this.logger.warn(
        `Failed to disconnect payment consumer cleanly: ${message}`,
      );
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  //   async processPayment(order: any) {
  //     this.logger.log(`Processing payment for order ${order.id}`);

  //     await new Promise((res) => setTimeout(res, 1000));

  //     this.logger.log(`Payment successful for order ${order.id}`);
  //   }

  async processPayment(order: any) {
    this.logger.log(`Processing payment for order ${order.id}`);

    // 🔥 simulate random failure
    const fail = Math.random() < 0.5;

    if (fail) {
      throw new Error("Simulated payment failure");
    }

    await this.delay(1000);

    this.logger.log(`Payment successful for order ${order.id}`);

    // 🔥 emit success event
    await this.producer.send({
      topic: "payment.success",
      messages: [
        {
          value: JSON.stringify({
            orderId: order.id,
            status: "SUCCESS",
          }),
        },
      ],
    });
  }

  async handleWithRetry(order: any, retries = 3) {
    while (retries > 0) {
      try {
        await this.processPayment(order);
        return;
      } catch (err) {
        this.logger.error(
          `Payment failed for order ${order.id}. Retries left: ${retries}`,
        );
        retries--;

        await this.delay(1000);
      }
    }

    this.logger.error(`Sending order ${order.id} to DLQ`);

    await this.producer.send({
      topic: "payment.failed",
      messages: [{ value: JSON.stringify(order) }],
    });
  }

  getConsumer(): Consumer {
    return this.consumer;
  }

  async emit(topic: string, message: any): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(message),
        },
      ],
    });
  }
}
