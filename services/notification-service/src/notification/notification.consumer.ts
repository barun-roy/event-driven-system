import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { Kafka } from "kafkajs";
import { EmailService } from "./email.service";

type NotificationEvent = {
  orderId: string;
};

@Injectable()
export class NotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationConsumer.name);

  private kafka = new Kafka({
    clientId: "notification-service",
    brokers: [process.env.KAFKA_BROKER || "redpanda:9092"],
  });

  private consumer = this.kafka.consumer({
    groupId: "notification-group",
  });

  constructor(private emailService: EmailService) {}

  async onModuleInit() {
    await this.consumer.connect();

    await this.consumer.subscribe({ topic: "payment.success" });
    await this.consumer.subscribe({ topic: "payment.failed" });
    await this.consumer.subscribe({ topic: "order.confirmed" });
    await this.consumer.subscribe({ topic: "order.cancelled" });

    this.logger.log("Listening to payment events from notification service");

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString() || "{}";
        const data: NotificationEvent = JSON.parse(raw);

        if (topic === "payment.success") {
          await this.emailService.sendEmail(
            "boron.roy@gmail.com",
            "Payment Successful",
            `Payment for order ${data.orderId} completed successfully`,
          );
        }

        if (topic === "payment.failed") {
          await this.emailService.sendEmail(
            "boron.roy@gmail.com",
            "Payment Failed",
            `Payment for order ${data.orderId} failed`,
          );
        }

        if (topic === "order.confirmed") {
          await this.emailService.sendEmail(
            "boron.roy@gmail.com",
            "Order Confirmed",
            `Your order ${data.orderId} is confirmed!`,
          );
        }

        if (topic === "order.cancelled") {
          await this.emailService.sendEmail(
            "boron.roy@gmail.com",
            "Order Cancelled",
            `Order ${data.orderId} was cancelled and refunded`,
          );
        }
      },
    });
  }
}
