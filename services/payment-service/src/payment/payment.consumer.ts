import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { KafkaService } from "../kafka/kafka.service";

interface PaymentEvent {
  orderId: string;
  status: "SUCCESS" | "FAILED";
  productId?: string;
  quantity?: number;
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
    // ensure underlying consumer is connected (with retry/backoff)
    await this.kafkaService.connectConsumerWithRetry();

    const consumer = this.kafkaService.getConsumer();

    await consumer.subscribe({
      topic: "order.created",
      fromBeginning: true,
    });
    await consumer.subscribe({ topic: "payment.refund" });

    this.logger.log("Listening to topic: order.created");

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const raw = message.value?.toString() || "{}";
          const data: OrderCreatedEvent = JSON.parse(raw);

          this.logger.log(`Received order event: ${raw}`);

          if (topic === "payment.refund") {
            const refundData = JSON.parse(raw);

            this.logger.log(`Refunding payment for ${refundData.orderId}`);

            await new Promise((res) => setTimeout(res, 1000));

            await this.kafkaService.sendEvent("payment.refunded", {
              orderId: refundData.orderId,
            });
          } else {
            await this.handleWithRetry(data);
          }
        } catch (error) {
          this.logger.error("Failed to process message", error);
        }
      },
    });
  }

  //retry wrapper
  async handleWithRetry(order: OrderCreatedEvent, retries = 3) {
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

    this.logger.error(`Sending to DLQ for order ${order.id}`);

    //emit FAILED event (standardized)
    const event: PaymentEvent = {
      orderId: order.id,
      status: "FAILED",
    };

    await this.kafkaService.sendEvent("payment.failed", event);
  }

  // main logic
  async processPayment(order: OrderCreatedEvent) {
    this.logger.log(`Processing payment for order ${order.id}`);

    // simulate random failure
    const fail = Math.random() < 0.5;

    if (fail) {
      throw new Error("Payment failed!");
    }

    await this.delay(1000);

    this.logger.log(`Payment successful for order ${order.id}`);

    const event: PaymentEvent = {
      orderId: order.id,
      status: "SUCCESS",
      productId: order.productId,
      quantity: order.quantity,
    };

    await this.kafkaService.sendEvent("payment.success", event);
  }

  private async delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
