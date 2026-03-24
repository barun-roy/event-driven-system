import { Module } from "@nestjs/common";
import { KafkaService } from "./kafka.service";

@Module({
  providers: [KafkaService],
  exports: [KafkaService], // Export KafkaService to make it available for other modules
})
export class KafkaModule {}
