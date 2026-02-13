export interface OrderPayload {
  id: string;
  customerId?: string;
  restaurantId?: string;
  driverId?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface RestaurantPayload {
  id: string;
  name: string;
  description?: string;
  address?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface PromotionPayload {
  id: string;
  name: string;
  description?: string;
  discount: number;
  discountType: "PERCENTAGE" | "FIXED";
  startDate: string;
  endDate: string;
  isActive: boolean;
  [key: string]: unknown;
}

export interface WebSocketMessage {
  room: string;
  message: string | Record<string, unknown>;
}
