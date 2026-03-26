import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class OrdersService {
  async createOrder(data: any) {
    const response = await axios.post("http://order-service:3001/orders", data);

    return response.data;
  }
}
