import { Injectable, OnModuleInit } from "@nestjs/common";
import { KafkaService } from "../kafka/kafka.service";

@Injectable()
export class PaymentConsumer implements OnModuleInit {
  constructor(private kafkaService: KafkaService) {}

  async onModuleInit() {
    const consumer = this.kafkaService.getConsumer();

    await consumer.subscribe({
      topic: "order.created",
      fromBeginning: true,
    });

    console.log("👀 Listening to topic: order.created");

    await consumer.run({
      eachMessage: async ({ message }: { message: { value: Buffer | null } }) => {
        const data = JSON.parse(message.value?.toString() || "{}");

        console.log("📩 Received order event:", data);

        await this.handleWithRetry(data);
      },
    });
  }

  // 🔁 retry wrapper
  async handleWithRetry(order: any, retries = 3) {
    while (retries > 0) {
      try {
        await this.processPayment(order);
        return;
      } catch (err) {
        console.log(`❌ Payment failed. Retries left: ${retries}`);
        retries--;

        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    console.log(`💀 Sending to DLQ for order ${order.id}`);

    await this.kafkaService.emit("payment.failed", order);
  }

  // 💳 main logic
  async processPayment(order: any) {
    console.log(`💳 Processing payment for order ${order.id}`);

    // simulate random failure
    const fail = Math.random() < 0.5;

    if (fail) {
      throw new Error("Payment failed!");
    }

    await new Promise((res) => setTimeout(res, 1000));

    console.log(`✅ Payment successful for order ${order.id}`);

    // 🔥 emit success event
    await this.kafkaService.emit("payment.success", {
      orderId: order.id,
      status: "SUCCESS",
    });
  }
}
