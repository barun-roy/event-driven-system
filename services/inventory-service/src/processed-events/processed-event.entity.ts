import { Entity, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity("inventory_processed_events")
export class ProcessedEvent {
  @PrimaryColumn()
  eventId!: string;

  @CreateDateColumn()
  processedAt!: Date;
}
