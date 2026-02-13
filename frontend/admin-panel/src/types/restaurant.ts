// Gemeinsame Restaurant-Types für das gesamte Admin-Panel
export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email: string;
  imageUrl?: string;
  password?: string;
  mustChangePassword?: boolean;
  welcomeEmailSent?: boolean;
  welcomeEmailSentAt?: string;
  status: string; // 'OPEN', 'CLOSED', etc.
  rating: number;
  totalOrders: number;
  avgPrepTime: number;
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  deliveryZones?: Array<{
    name: string;
    coordinates: Array<[number, number]>;
    fee: number;
  }>;
  operatingHours?: Record<string, {
    open: string;
    close: string;
    isClosed?: boolean;
  }>;
  estimatedDeliveryTime: number;
  cuisines: string[];
  tags: string[];
  dishes?: any[]; // Dishes associated with the restaurant
  settings?: {
    holidays?: Array<{
      date: string;
      name: string;
    }>;
    notifications?: Record<string, boolean>;
    features?: Record<string, boolean>;
  };
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalDishes: number;
  activeDishes: number;
  averageRating?: number;
  totalReviews?: number;
}

export interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  };
}

export interface Holiday {
  date: string;
  name: string;
}

export interface RestaurantFormData {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string;
  status: string;
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  estimatedDeliveryTime: number;
  cuisines: string[];
  tags: string[];
  isActive: boolean;
}

export interface RestaurantFilters {
  status?: string;
  isActive?: boolean;
  cuisines?: string[];
  rating?: number;
  search?: string;
}