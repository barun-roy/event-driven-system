import { Injectable } from "@nestjs/common";
import { KafkaService } from "../kafka/kafka.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class OrdersService {
  private orders: any[] = [];

  constructor(private kafkaService: KafkaService) {}

  async createOrder(data: any) {
    console.log("🔄 Creating order with data:", data);
    const order = {
      id: uuidv4(),
      status: "CREATED",
      ...data,
    };

    this.orders.push(order);
    console.log("💾 Order stored in memory:", order);

    // publish event
    try {
      await this.kafkaService.sendEvent("order.created", order);
      console.log("🚀 Event published to Kafka topic 'order.created'");
    } catch (error) {
      console.error("❌ Failed to publish event:", error);
    }

    return order;
  }
}
