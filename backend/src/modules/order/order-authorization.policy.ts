import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "READY_FOR_PICKUP",
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERING",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderActorRole =
  | "CUSTOMER"
  | "RESTAURANT"
  | "DRIVER"
  | "ADMIN"
  | "SUPER_ADMIN";

export interface OrderActor {
  id?: string;
  sub?: string;
  role?: string;
  type?: string;
  userType?: string;
}

export interface OrderOwnership {
  customerId: string;
  restaurantId: string;
  driverId?: string | null;
  status: string;
}

const TRANSITIONS: Readonly<
  Record<"RESTAURANT" | "DRIVER", Readonly<Record<string, OrderStatus>>>
> = {
  RESTAURANT: {
    PENDING: "CONFIRMED",
    CONFIRMED: "PREPARING",
    PREPARING: "READY_FOR_PICKUP",
  },
  DRIVER: {
    ACCEPTED: "PICKED_UP",
    PICKED_UP: "DELIVERED",
  },
};

export function getOrderActorId(actor: OrderActor): string {
  const id = actor.id || actor.sub;
  if (!id) {
    throw new ForbiddenException("Authenticated actor identity is missing");
  }
  return id;
}

export function getOrderActorRole(actor: OrderActor): OrderActorRole {
  const value = actor.role || actor.type || actor.userType;
  const normalized = value?.toUpperCase();
  if (
    normalized !== "CUSTOMER" &&
    normalized !== "RESTAURANT" &&
    normalized !== "DRIVER" &&
    normalized !== "ADMIN" &&
    normalized !== "SUPER_ADMIN"
  ) {
    throw new ForbiddenException("Unsupported order actor role");
  }
  return normalized;
}

export function assertCanReadOrder(
  actor: OrderActor,
  order: OrderOwnership,
): void {
  const actorId = getOrderActorId(actor);
  const role = getOrderActorRole(actor);

  if (role === "SUPER_ADMIN") {
    return;
  }
  if (role === "CUSTOMER" && order.customerId === actorId) {
    return;
  }
  if (role === "RESTAURANT" && order.restaurantId === actorId) {
    return;
  }
  if (
    role === "DRIVER" &&
    (order.driverId === actorId ||
      (!order.driverId && order.status === "READY_FOR_PICKUP"))
  ) {
    return;
  }

  throw new ForbiddenException("Order access denied");
}

export function scopeOrderFilters<T extends Record<string, unknown>>(
  actor: OrderActor,
  filters: T,
): T {
  const actorId = getOrderActorId(actor);
  const role = getOrderActorRole(actor);

  if (role === "SUPER_ADMIN") {
    return { ...filters };
  }
  if (role === "ADMIN") {
    throw new ForbiddenException("Missing order:read permission");
  }
  if (role === "CUSTOMER") {
    return { ...filters, customerId: actorId };
  }
  if (role === "RESTAURANT") {
    return { ...filters, restaurantId: actorId };
  }
  return { ...filters, driverId: actorId };
}

export function assertCanTransitionOrder(
  actor: OrderActor,
  order: OrderOwnership,
  requestedStatus: string,
): asserts requestedStatus is OrderStatus {
  if (!ORDER_STATUSES.includes(requestedStatus as OrderStatus)) {
    throw new BadRequestException("Invalid order status");
  }

  const actorId = getOrderActorId(actor);
  const role = getOrderActorRole(actor);
  if (role !== "RESTAURANT" && role !== "DRIVER") {
    throw new ForbiddenException("Role cannot update order status");
  }
  if (role === "RESTAURANT" && order.restaurantId !== actorId) {
    throw new ForbiddenException("Order does not belong to restaurant");
  }
  if (role === "DRIVER" && order.driverId !== actorId) {
    throw new ForbiddenException("Order is not assigned to driver");
  }

  const transitionOwner = findTransitionOwner(order.status, requestedStatus);
  if (transitionOwner && transitionOwner !== role) {
    throw new ForbiddenException(
      `${role} cannot perform this order status transition`,
    );
  }

  const expected = TRANSITIONS[role][order.status];
  if (expected !== requestedStatus) {
    throw new ConflictException(
      `Invalid order status transition from ${order.status} to ${requestedStatus}`,
    );
  }
}

function findTransitionOwner(
  currentStatus: string,
  requestedStatus: string,
): "RESTAURANT" | "DRIVER" | undefined {
  if (currentStatus === "READY_FOR_PICKUP" && requestedStatus === "ACCEPTED") {
    return "DRIVER";
  }
  return (["RESTAURANT", "DRIVER"] as const).find(
    (role) => TRANSITIONS[role][currentStatus] === requestedStatus,
  );
}
