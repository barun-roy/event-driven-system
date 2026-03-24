import { Controller, Post, Body } from "@nestjs/common";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() body: any) {
    console.log("📦 POST /orders received:", body);
    const result = await this.ordersService.createOrder(body);
    console.log("✅ Order created:", result);
    return result;
  }
}
