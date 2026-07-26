import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  assertCanReadOrder,
  getOrderActorRole,
} from "./order-authorization.policy";

@Injectable()
export class OrderOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orderId = request.params?.id;
    if (!orderId) {
      return true;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        restaurantId: true,
        driverId: true,
        status: true,
      },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (
      request.method === "POST" &&
      request.path?.endsWith("/accept") &&
      getOrderActorRole(request.user) === "DRIVER"
    ) {
      return true;
    }

    assertCanReadOrder(request.user, order);
    return true;
  }
}
