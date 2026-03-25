import { Controller, Post, Body } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Controller("orders")
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() body: CreateOrderDto) {
    console.log("POST /orders received:", body);
    const result = await this.ordersService.createOrder(body);
    console.log("Order created:", result);
    return result;
  }
}
