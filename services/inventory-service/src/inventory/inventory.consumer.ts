import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { KafkaService } from "../kafka/kafka.service";
import { InventoryService } from "./inventory.service";
import { InjectRepository } from "@nestjs/typeorm";
import { ProcessedEvent } from "../processed-events/processed-event.entity";
import { Repository } from "typeorm";

interface PaymentEvent {
  orderId: string;
  status: "SUCCESS" | "FAILED";
  productId?: string;
  quantity?: number;
}

@Injectable()
export class InventoryConsumer implements OnModuleInit {
  private readonly logger = new Logger(InventoryConsumer.name);

  constructor(
    @InjectRepository(ProcessedEvent)
    private processedRepo: Repository<ProcessedEvent>,
    private kafkaService: KafkaService,
    private inventoryService: InventoryService,
  ) {}

  async onModuleInit() {
    const consumer = this.kafkaService.getConsumer();

    await consumer.subscribe({
      topic: "payment.success",
    });

    this.logger.log("Listening to payment.success for inventory");

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const raw = message.value?.toString() || "{}";
          const data: PaymentEvent = JSON.parse(raw);

          if (!data.productId || !data.quantity) {
            this.logger.error("Invalid payment event payload");
            return;
          }

          // global idempotency
          const eventId = `${data.orderId}-INVENTORY_PROCESS`;

          const exists = await this.processedRepo.findOne({
            where: { eventId },
          });

          if (exists) {
            this.logger.warn(`Duplicate inventory event skipped: ${eventId}`);
            return;
          }

          const fail = Math.random() < 0.3; // simulate failure

          if (fail) {
            this.logger.error("Inventory failed");

            // mark processed BEFORE emitting (important)
            await this.processedRepo.save({ eventId });

            await this.kafkaService.sendEvent("inventory.failed", {
              orderId: data.orderId,
              productId: data.productId,
            });

            return;
          }

          //IMPORTANT: ensure these fields exist in event
          await this.inventoryService.decreaseStock(
            data.productId,
            data.quantity,
          );
          await this.processedRepo.save({ eventId });
          //NEW EVENT
          await this.kafkaService.sendEvent("inventory.updated", {
            orderId: data.orderId,
            productId: data.productId,
            quantity: data.quantity,
          });
          this.logger.log(`Inventory updated event emitted`);
        } catch (err) {
          this.logger.error("Inventory update failed", err);
        }
      },
    });
  }
}
