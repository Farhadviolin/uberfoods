export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  address?: string;
  phone?: string;
  notes?: string;
}

export interface OrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
}

export interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  address: string;
  rating?: number;
  distance?: number;
  dishes?: Dish[];
  phone?: string;
  email?: string;
  isActive?: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
  estimatedDeliveryTime?: number;
  operatingHours?: OperatingHours;
  status?: 'OPEN' | 'CLOSED' | 'IN_WORK';
  location?: { lat: number; lng: number };
  coordinates?: { lat: number; lng: number };
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  restaurantId?: string;
  tags?: string[];
}

export interface PlannedMeal {
  id: string;
  date: Date | string;
  restaurantId: string;
  restaurantName: string;
  dishIds: string[];
  notes?: string;
  restaurant?: Pick<Restaurant, 'id' | 'name' | 'imageUrl'>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export interface AxiosErrorWithResponse extends Error {
  response?: {
    data?: {
      message?: string;
      error?: string;
      code?: string;
      errors?: Array<{
        property: string;
        constraints: Record<string, string>;
      }>;
    };
    status?: number;
    headers?: Record<string, unknown>;
  };
  request?: unknown;
  config?: unknown;
  isOffline?: boolean;
}

export interface CreateOrderData {
  restaurantId: string;
  items: Array<{
    dishId: string;
    quantity: number;
  }>;
  addressId?: string;
  address?: string;
  phone?: string;
  notes?: string;
  paymentMethod?: string;
}

export interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

// Achievement Requirements
export interface AchievementRequirements {
  orders?: number;
  totalSpent?: number;
  streak?: number;
  reviews?: number;
  socialPosts?: number;
  [key: string]: number | undefined;
}

// WebSocket Event Types (re-export from hooks for convenience)
export interface WebSocketPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  images: string[];
  restaurant: string;
  dish: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

export interface WebSocketGroupOrder {
  id: string;
  code: string;
  host: string;
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    total: number;
    isReady: boolean;
  }>;
  restaurant?: string;
  status: 'active' | 'ordering' | 'ready' | 'completed';
  createdAt: string;
  total: number;
}

export interface WebSocketAchievement {
  id: string;
  type: string;
  title: string;
  description: string;
  icon?: string;
  points: number;
  unlockedAt: string;
}

export interface WebSocketMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface WebSocketLevelData {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface WebSocketTrendingData {
  dishes: Array<{
    id: string;
    name: string;
    restaurant: {
      id: string;
      name: string;
    };
    popularity: number;
  }>;
}

