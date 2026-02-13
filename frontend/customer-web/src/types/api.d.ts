// API Response Type Definitions

export interface ApiResponse<T = unknown> {
  data?: T;
  status?: number;
  message?: string;
  error?: string;
  code?: string;
  errors?: Array<{
    property: string;
    constraints: Record<string, string>;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderResponse {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  deliveryFee: number;
  taxAmount: number;
  tip: number;
  createdAt: string;
  restaurantId: string;
  customerId: string;
  priority: string;
  estimatedDeliveryTime: number;
  restaurant: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

export interface RestaurantResponse {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  address: string;
  rating?: number;
  distance?: number;
  dishes: DishResponse[];
  phone?: string;
  email?: string;
  isActive?: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
  estimatedDeliveryTime?: number;
  location?: { lat: number; lng: number };
  coordinates?: { lat: number; lng: number };
}

export interface DishResponse {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  restaurantId?: string;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  paymentIntentId?: string;
  createdAt: string;
}

export interface RefundResponse {
  refundId: string;
  orderId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  createdAt: string;
  processedAt?: string;
}

export interface GiftCardResponse {
  id: string;
  code: string;
  amount: number;
  balance: number;
  status: 'active' | 'used' | 'expired';
  expiresAt?: string;
  createdAt: string;
}

export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface DashboardStatsResponse {
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    favoriteCount: number;
    recentOrdersCount: number;
    orderTrend: number;
    spendingTrend: number;
  };
  spendingData: Array<{
    date: string;
    amount: number;
  }>;
  restaurantPreferences: Array<{
    restaurantName: string;
    orderCount: number;
  }>;
}
