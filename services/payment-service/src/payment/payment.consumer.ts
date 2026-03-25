import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { KafkaService } from "../kafka/kafka.service";

interface PaymentEvent {
  orderId: string;
  status: "SUCCESS" | "FAILED";
}


interface OrderCreatedEvent {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  amount: number;
  status: string;
}

@Injectable()
export class PaymentConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(private kafkaService: KafkaService) {}

  async onModuleInit() {
    const consumer = this.kafkaService.getConsumer();

    await consumer.subscribe({
      topic: "order.created",
      fromBeginning: true,
    });

    this.logger.log("👀 Listening to topic: order.created");

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const raw = message.value?.toString() || "{}";
          const data: OrderCreatedEvent = JSON.parse(raw);

          this.logger.log(`📩 Received order event: ${raw}`);

          await this.handleWithRetry(data);
        } catch (error) {
          this.logger.error("❌ Failed to process message", error);
        }
      },
    });
  }

  // 🔁 retry wrapper
  async handleWithRetry(order: OrderCreatedEvent, retries = 3) {
    while (retries > 0) {
      try {
        await this.processPayment(order);
        return;
      } catch (err) {
        this.logger.error(
          `❌ Payment failed for order ${order.id}. Retries left: ${retries}`,
        );

        retries--;
        await this.delay(1000);
      }
    }

    this.logger.error(`💀 Sending to DLQ for order ${order.id}`);

    // ✅ emit FAILED event (standardized)
    const event: PaymentEvent = {
      orderId: order.id,
      status: "FAILED",
    };

    await this.kafkaService.emit("payment.failed", event);
  }

  // 💳 main logic
  async processPayment(order: OrderCreatedEvent) {
    this.logger.log(`💳 Processing payment for order ${order.id}`);

    // simulate random failure
    const fail = Math.random() < 0.5;

    if (fail) {
      throw new Error("Payment failed!");
    }

    await this.delay(1000);

    this.logger.log(`✅ Payment successful for order ${order.id}`);

    const event: PaymentEvent = {
      orderId: order.id,
      status: "SUCCESS",
    };

    await this.kafkaService.emit("payment.success", event);
  }

  private async delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
