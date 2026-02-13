import api from '../utils/api';

export interface DashboardOverview {
  todayMetrics: {
    orders: number;
    revenue: number;
    avgOrderValue: number;
    activeDrivers: number;
    onlineRestaurants: number;
  };
  growth: {
    orders: number;
    revenue: number;
  };
  trends: {
    metric: string;
    period: string;
    data: Array<{
      date: string;
      value: number;
      growth: number;
      predicted: number;
    }>;
    overallGrowth: number;
  };
}

export interface RevenueAnalytics {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    avgDailyRevenue: number;
  };
  dailyData: Array<{
    date: string;
    orders: number;
    revenue: number;
    deliveryFees: number;
    avgOrderValue: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
}

export interface OrderAnalytics {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    status: string;
    count: number;
    avgValue: number;
    avgDeliveryTime: number;
  }>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  segments: Array<{
    segment: string;
    count: number;
    percentage: number;
    avgOrderValue: number;
    totalSpent: number;
    avgOrdersPerMonth: number;
  }>;
  topCustomers: Array<{
    id: string;
    username: string;
    totalSpent: number;
    orderCount: number;
    avgOrderValue: number;
    lastOrderDate: string;
  }>;
  customerLifetimeValue: number;
}

export interface GeographicAnalytics {
  type: string;
  regions: Array<{
    name: string;
    orders: number;
    revenue: number;
    drivers: number;
    density: number;
  }>;
  heatmap: {
    maxValue: number;
    minValue: number;
  };
}

export const analyticsApi = {
  // Dashboard Overview
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const response = await api.get('/analytics/dashboard/overview');
    return response.data;
  },

  getRealtimeMetrics: async (): Promise<any> => {
    const response = await api.get('/analytics/dashboard/realtime');
    return response.data;
  },

  // Revenue Analytics
  getRevenueAnalytics: async (
    period: string = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<RevenueAnalytics> => {
    const params = new URLSearchParams({ period });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`/analytics/revenue?${params}`);
    return response.data;
  },

  // Order Analytics
  getOrderAnalytics: async (
    period: string = 'month',
    restaurantId?: string,
    status?: string
  ): Promise<OrderAnalytics> => {
    const params = new URLSearchParams({ period });
    if (restaurantId) params.append('restaurantId', restaurantId);
    if (status) params.append('status', status);

    const response = await api.get(`/analytics/orders?${params}`);
    return response.data;
  },

  // Customer Analytics
  getCustomerAnalytics: async (segment?: string): Promise<CustomerAnalytics> => {
    const params = segment ? `?segment=${segment}` : '';
    const response = await api.get(`/analytics/customers${params}`);
    return response.data;
  },

  // Driver Analytics
  getDriverAnalytics: async (
    period: string = 'month',
    driverId?: string
  ): Promise<any> => {
    const params = new URLSearchParams({ period });
    if (driverId) params.append('driverId', driverId);

    const response = await api.get(`/analytics/drivers?${params}`);
    return response.data;
  },

  // Restaurant Analytics
  getRestaurantAnalytics: async (
    period: string = 'month',
    restaurantId?: string
  ): Promise<any> => {
    const params = new URLSearchParams({ period });
    if (restaurantId) params.append('restaurantId', restaurantId);

    const response = await api.get(`/analytics/restaurants?${params}`);
    return response.data;
  },

  // Trends & Predictions
  getTrends: async (
    metric: string = 'orders',
    period: string = 'month'
  ): Promise<any> => {
    const response = await api.get(`/analytics/trends?metric=${metric}&period=${period}`);
    return response.data;
  },

  // Geographic Analytics
  getGeographicAnalytics: async (
    type: string = 'orders',
    region?: string
  ): Promise<GeographicAnalytics> => {
    const params = new URLSearchParams({ type });
    if (region) params.append('region', region);

    const response = await api.get(`/analytics/geographic?${params}`);
    return response.data;
  },

  // Performance Metrics
  getPerformanceMetrics: async (period: string = 'hour'): Promise<any> => {
    const response = await api.get(`/analytics/performance?period=${period}`);
    return response.data;
  },

  // Custom Reports
  generateCustomReport: async (params: {
    metrics: string[];
    filters: any;
    groupBy: string[];
    format: string;
  }): Promise<any> => {
    const response = await api.get('/analytics/reports/custom', { params });
    return response.data;
  },
};