import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { KafkaModule } from "../kafka/kafka.module";
import { Order } from "./orders.entity";
import { OrderEventsConsumer } from "./order-events.consumer";

@Module({
  imports: [TypeOrmModule.forFeature([Order]), KafkaModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderEventsConsumer],
})
export class OrdersModule {}
