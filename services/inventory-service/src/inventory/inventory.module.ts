import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Inventory } from "./inventory.entity";
import { InventoryService } from "./inventory.service";
import { InventoryConsumer } from "./inventory.consumer";
import { KafkaModule } from "../kafka/kafka.module";
import { ProcessedEvent } from "../processed-events/processed-event.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, ProcessedEvent]), KafkaModule],
  providers: [InventoryService, InventoryConsumer],
})
export class InventoryModule {}
