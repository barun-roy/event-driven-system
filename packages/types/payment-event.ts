export interface PaymentEvent {
  orderId: string;
  status: "SUCCESS" | "FAILED";
}
