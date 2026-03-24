import { Module } from "@nestjs/common";
import { KafkaModule } from "../kafka/kafka.module";
import { PaymentConsumer } from "./payment.consumer";
import { KafkaService } from "../kafka/kafka.service";

@Module({
  imports: [KafkaModule],
  providers: [PaymentConsumer, KafkaService],
})
export class PaymentModule {}
