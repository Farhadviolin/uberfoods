import api from '../utils/api';
import { logger } from '../utils/logger';
import { Driver, Order, PerformanceMetrics, GamificationStats } from '../types';

export interface DriverServiceResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export class DriverService {
  // ===== DRIVER PROFILE =====
  static async getProfile(driverId: string): Promise<DriverServiceResponse<Driver>> {
    try {
      const response = await api.get(`/drivers/${driverId}`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get driver profile', error);
      throw error;
    }
  }

  static async updateProfile(driverId: string, data: Partial<Driver>): Promise<DriverServiceResponse<Driver>> {
    try {
      const response = await api.put(`/drivers/${driverId}`, data);
      return {
        data: response.data,
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update driver profile', error);
      throw error;
    }
  }

  static async updateLocation(driverId: string, location: { lat: number; lng: number }): Promise<DriverServiceResponse<void>> {
    try {
      await api.put(`/drivers/${driverId}/location`, location);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      logger.error('Failed to update location', error);
      throw error;
    }
  }

  static async updateStatus(driverId: string, status: string, reason?: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.put(`/drivers/${driverId}/status`, { status, reason });
      return {
        data: undefined,
        success: true,
        message: 'Status updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update status', error);
      throw error;
    }
  }

  // ===== ORDERS =====
  static async getPendingOrders(driverId: string): Promise<DriverServiceResponse<Order[]>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/pending`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get pending orders', error);
      throw error;
    }
  }

  static async getActiveOrders(driverId: string): Promise<DriverServiceResponse<Order[]>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/active`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get active orders', error);
      throw error;
    }
  }

  static async acceptOrder(driverId: string, orderId: string): Promise<DriverServiceResponse<Order>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/${orderId}/accept`);
      return {
        data: response.data,
        success: true,
        message: 'Order accepted successfully'
      };
    } catch (error) {
      logger.error('Failed to accept order', error);
      throw error;
    }
  }

  static async rejectOrder(driverId: string, orderId: string, reason?: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/reject`, { reason });
      return {
        data: undefined,
        success: true,
        message: 'Order rejected successfully'
      };
    } catch (error) {
      logger.error('Failed to reject order', error);
      throw error;
    }
  }

  static async bulkAcceptOrders(driverId: string, orderIds: string[]): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/bulk-accept`, { orderIds });
      return {
        data: response.data,
        success: true,
        message: `Successfully accepted ${response.data.successful} out of ${response.data.total} orders`
      };
    } catch (error) {
      logger.error('Failed to bulk accept orders', error);
      throw error;
    }
  }

  static async updateOrderStatus(driverId: string, orderId: string, status: string): Promise<DriverServiceResponse<Order>> {
    try {
      const response = await api.put(`/drivers/${driverId}/orders/${orderId}/status`, { status });
      return {
        data: response.data,
        success: true,
        message: 'Order status updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update order status', error);
      throw error;
    }
  }

  static async reportOrderDelay(driverId: string, orderId: string, delayData: {
    reason: string;
    delayMinutes: number;
    customerNotification?: string;
  }): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/delay`, delayData);
      return {
        data: undefined,
        success: true,
        message: 'Delay reported successfully'
      };
    } catch (error) {
      logger.error('Failed to report order delay', error);
      throw error;
    }
  }

  static async addOrderNote(driverId: string, orderId: string, note: string, type: string = 'GENERAL'): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/notes`, { note, type });
      return {
        data: undefined,
        success: true,
        message: 'Note added successfully'
      };
    } catch (error) {
      logger.error('Failed to add order note', error);
      throw error;
    }
  }

  static async getOrderNotes(driverId: string, orderId: string): Promise<DriverServiceResponse<any[]>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/${orderId}/notes`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order notes', error);
      throw error;
    }
  }

  // ===== PERFORMANCE & ANALYTICS =====
  static async getPerformanceDashboard(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/dashboard`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance dashboard', error);
      throw error;
    }
  }

  static async getPerformanceMetrics(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<PerformanceMetrics>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/metrics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance metrics', error);
      throw error;
    }
  }

  // ===== GAMIFICATION =====
  static async getGamificationStats(driverId: string): Promise<DriverServiceResponse<GamificationStats>> {
    try {
      const response = await api.get(`/drivers/${driverId}/gamification/stats`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get gamification stats', error);
      throw error;
    }
  }

  static async redeemGamificationPoints(driverId: string, points: number): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/gamification/points/redeem`, { points });
      return {
        data: undefined,
        success: true,
        message: 'Points redeemed successfully'
      };
    } catch (error) {
      logger.error('Failed to redeem gamification points', error);
      throw error;
    }
  }

  // ===== EMERGENCY =====
  static async triggerEmergency(driverId: string, emergencyData: {
    type?: string;
    location?: { lat: number; lng: number };
    description?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/emergency/panic`, emergencyData);
      return {
        data: response.data,
        success: true,
        message: 'Emergency alert sent successfully'
      };
    } catch (error) {
      logger.error('Failed to trigger emergency', error);
      throw error;
    }
  }

  static async getEmergencyContacts(driverId: string): Promise<DriverServiceResponse<any[]>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/contacts`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get emergency contacts', error);
      throw error;
    }
  }

  // ===== ROUTE OPTIMIZATION =====
  static async optimizeRoute(driverId: string, routeData: {
    location: { lat: number; lng: number };
    orders: Array<{
      orderId: string;
      restaurant: { lat: number; lng: number };
      customer: { lat: number; lng: number };
      totalAmount: number;
    }>;
  }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/route/optimize-advanced`, routeData);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to optimize route', error);
      throw error;
    }
  }

  static async getTrafficIncidents(driverId: string, lat: number, lng: number, radius: number = 10): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routing/traffic/incidents`, {
        params: { lat, lng, radius }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get traffic incidents', error);
      throw error;
    }
  }

  // ===== FINANCIAL =====
  static async requestPayout(driverId: string, payoutData: {
    amount: number;
    currency?: string;
    notes?: string;
  }): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/payouts/request`, payoutData);
      return {
        data: undefined,
        success: true,
        message: 'Payout request submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to request payout', error);
      throw error;
    }
  }

  static async getFinancialBalance(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/balance`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get financial balance', error);
      throw error;
    }
  }

  static async submitExpense(driverId: string, expenseData: {
    category: string;
    amount: number;
    description?: string;
    date: string;
  }): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/expenses`, expenseData);
      return {
        data: undefined,
        success: true,
        message: 'Expense submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to submit expense', error);
      throw error;
    }
  }

  // ===== SUBSCRIPTION =====
  static async getSubscriptionStatus(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/subscription`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get subscription status', error);
      throw error;
    }
  }

  static async upgradeSubscription(driverId: string, tier: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/subscription/upgrade`, { tier });
      return {
        data: undefined,
        success: true,
        message: 'Subscription upgraded successfully'
      };
    } catch (error) {
      logger.error('Failed to upgrade subscription', error);
      throw error;
    }
  }

  // ===== NOTIFICATIONS =====
  static async getNotifications(driverId: string, limit: number = 50): Promise<DriverServiceResponse<any[]>> {
    try {
      const response = await api.get(`/drivers/${driverId}/notifications`, {
        params: { limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get notifications', error);
      throw error;
    }
  }

  static async markNotificationAsRead(driverId: string, notificationId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.put(`/drivers/${driverId}/notifications/${notificationId}/read`);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  // ===== QR SCANNING =====
  static async scanQRCode(driverId: string, qrData: {
    qrCode: string;
    type: string;
    location?: { lat: number; lng: number };
  }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/qr/scan`, qrData);
      return {
        data: response.data,
        success: true,
        message: 'QR code scanned successfully'
      };
    } catch (error) {
      logger.error('Failed to scan QR code', error);
      throw error;
    }
  }

  // ===== VOICE COMMANDS =====
  static async processVoiceCommand(driverId: string, command: string, parameters?: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/voice/command`, {
        command,
        parameters
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to process voice command', error);
      throw error;
    }
  }

  // ===== META GLASSES =====
  static async connectMetaGlasses(driverId: string, deviceId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/meta-glasses/connect`, { deviceId });
      return {
        data: undefined,
        success: true,
        message: 'Meta glasses connected successfully'
      };
    } catch (error) {
      logger.error('Failed to connect meta glasses', error);
      throw error;
    }
  }

  static async disconnectMetaGlasses(driverId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/meta-glasses/disconnect`);
      return {
        data: undefined,
        success: true,
        message: 'Meta glasses disconnected successfully'
      };
    } catch (error) {
      logger.error('Failed to disconnect meta glasses', error);
      throw error;
    }
  }

  static async syncARData(driverId: string, data: { location?: any; batteryLevel?: number; temperature?: number; overlays?: any[] }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/meta-glasses/sync`, data);
      return {
        data: response.data,
        success: true,
        message: 'AR data synced successfully'
      };
    } catch (error) {
      logger.error('Failed to sync AR data', error);
      throw error;
    }
  }

  static async getMetaGlassesDevices(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/meta-glasses/devices`);
      return {
        data: response.data,
        success: true,
        message: 'Devices retrieved successfully'
      };
    } catch (error) {
      logger.error('Failed to get meta glasses devices', error);
      throw error;
    }
  }

  static async updateMetaGlassesBattery(driverId: string, batteryLevel: number): Promise<DriverServiceResponse<void>> {
    try {
      await api.put(`/drivers/${driverId}/meta-glasses/battery`, { batteryLevel });
      return {
        data: undefined,
        success: true,
        message: 'Battery level updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update battery level', error);
      throw error;
    }
  }

  static async sendAROverlay(driverId: string, overlay: { type: string; content: string; position?: string; duration?: number }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/meta-glasses/overlay`, overlay);
      return {
        data: response.data,
        success: true,
        message: 'Overlay sent successfully'
      };
    } catch (error) {
      logger.error('Failed to send AR overlay', error);
      throw error;
    }
  }

  static async startMetaGlassesNavigation(driverId: string, navigationData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/meta-glasses/navigation/start`, navigationData);
      return {
        data: undefined,
        success: true,
        message: 'Navigation started on meta glasses'
      };
    } catch (error) {
      logger.error('Failed to start meta glasses navigation', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====
  static async getOrderStatistics(driverId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/statistics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order statistics', error);
      throw error;
    }
  }

  static async getOrderHistory(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/history`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order history', error);
      throw error;
    }
  }

  // ===== SHIFTS =====
  static async getCurrentShift(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/shifts/current`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get current shift', error);
      throw error;
    }
  }

  static async startShift(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/shifts/start`);
      return {
        data: response.data,
        success: true,
        message: 'Shift started successfully'
      };
    } catch (error) {
      logger.error('Failed to start shift', error);
      throw error;
    }
  }

  static async endShift(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/shifts/end`);
      return {
        data: response.data,
        success: true,
        message: 'Shift ended successfully'
      };
    } catch (error) {
      logger.error('Failed to end shift', error);
      throw error;
    }
  }

  static async startBreak(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/shifts/break/start`);
      return {
        data: response.data,
        success: true,
        message: 'Break started successfully'
      };
    } catch (error) {
      logger.error('Failed to start break', error);
      throw error;
    }
  }

  static async endBreak(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/shifts/break/end`);
      return {
        data: response.data,
        success: true,
        message: 'Break ended successfully'
      };
    } catch (error) {
      logger.error('Failed to end break', error);
      throw error;
    }
  }

  static async getShiftHistory(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/shifts/history`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get shift history', error);
      throw error;
    }
  }

  static async getShiftAnalytics(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/shifts/analytics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get shift analytics', error);
      throw error;
    }
  }

  static async getShiftSchedule(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/shifts/schedule`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get shift schedule', error);
      throw error;
    }
  }

  static async createShiftSchedule(driverId: string, scheduleData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/shifts/schedule`, scheduleData);
      return {
        data: response.data,
        success: true,
        message: 'Shift schedule created successfully'
      };
    } catch (error) {
      logger.error('Failed to create shift schedule', error);
      throw error;
    }
  }

  // ✅ Erweiterte Shift-Operationen
  static async getShiftStatistics(driverId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/shifts/statistics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get shift statistics', error);
      throw error;
    }
  }

  static async getAllShifts(driverId: string, filters?: { startDate?: string; endDate?: string; limit?: number }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/shifts`, {
        params: filters
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get shifts', error);
      throw error;
    }
  }

  static async createShift(driverId: string, shiftData: { startTime: string; endTime?: string; type?: string; notes?: string }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/shifts`, shiftData);
      return {
        data: response.data,
        success: true,
        message: 'Shift created successfully'
      };
    } catch (error) {
      logger.error('Failed to create shift', error);
      throw error;
    }
  }

  static async updateShift(driverId: string, shiftId: string, shiftData: { startTime?: string; endTime?: string; notes?: string }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.put(`/drivers/${driverId}/shifts/${shiftId}`, shiftData);
      return {
        data: response.data,
        success: true,
        message: 'Shift updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update shift', error);
      throw error;
    }
  }

  static async deleteShift(driverId: string, shiftId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.delete(`/drivers/${driverId}/shifts/${shiftId}`);
      return {
        data: response.data,
        success: true,
        message: 'Shift deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete shift', error);
      throw error;
    }
  }

  static async createSchedule(driverId: string, scheduleData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/schedule`, scheduleData);
      return {
        data: response.data,
        success: true,
        message: 'Schedule created successfully'
      };
    } catch (error) {
      logger.error('Failed to create schedule', error);
      throw error;
    }
  }

  // ===== RATINGS =====
  static async getRatingsStats(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/ratings/stats`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get ratings stats', error);
      throw error;
    }
  }

  static async getRatings(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/ratings`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get ratings', error);
      throw error;
    }
  }

  static async respondToRating(driverId: string, reviewId: string, response: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/ratings/${reviewId}/respond`, { response });
      return {
        data: undefined,
        success: true,
        message: 'Response submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to respond to rating', error);
      throw error;
    }
  }

  // ===== DOCUMENTS (ERWEITERT) =====
  static async getDocumentsStatus(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/documents/status`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get documents status', error);
      throw error;
    }
  }

  static async deleteDocument(driverId: string, documentId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.delete(`/drivers/${driverId}/documents/${documentId}`);
      return {
        data: undefined,
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete document', error);
      throw error;
    }
  }

  static async getDocument(driverId: string, documentId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/documents/${documentId}`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get document', error);
      throw error;
    }
  }

  static async validateDocument(driverId: string, documentId: string, validationData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/documents/${documentId}/validate`, validationData);
      return {
        data: response.data,
        success: true,
        message: 'Document validation submitted'
      };
    } catch (error) {
      logger.error('Failed to validate document', error);
      throw error;
    }
  }

  // ===== REFERRAL =====
  static async getReferralCode(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/referral/code`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get referral code', error);
      throw error;
    }
  }

  static async getReferrals(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/referrals`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get referrals', error);
      throw error;
    }
  }

  static async getReferralsStats(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/referrals/stats`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get referrals stats', error);
      throw error;
    }
  }

  static async applyReferralCode(driverId: string, code: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/referrals/apply`, { code });
      return {
        data: response.data,
        success: true,
        message: 'Referral code applied successfully'
      };
    } catch (error) {
      logger.error('Failed to apply referral code', error);
      throw error;
    }
  }

  static async claimReferral(driverId: string, referralId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/referrals/${referralId}/claim`);
      return {
        data: response.data,
        success: true,
        message: 'Referral claimed successfully'
      };
    } catch (error) {
      logger.error('Failed to claim referral', error);
      throw error;
    }
  }

  // ===== ADVANCED ROUTES =====
  static async getRoutesHistory(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/history`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get routes history', error);
      throw error;
    }
  }

  static async getRoutePerformance(driverId: string, routeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/${routeId}/performance`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route performance', error);
      throw error;
    }
  }

  static async getRouteAlternatives(driverId: string, routeData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/alternatives`, routeData);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route alternatives', error);
      throw error;
    }
  }

  static async getActiveRoutes(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/active`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get active routes', error);
      throw error;
    }
  }

  static async calculateRoute(driverId: string, routeData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/calculate`, routeData);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to calculate route', error);
      throw error;
    }
  }

  static async getRouteWaypoints(driverId: string, routeId?: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/waypoints`, {
        params: routeId ? { routeId } : {}
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route waypoints', error);
      throw error;
    }
  }

  static async updateRouteWaypoints(driverId: string, waypointsData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/waypoints`, waypointsData);
      return {
        data: response.data,
        success: true,
        message: 'Route waypoints updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update route waypoints', error);
      throw error;
    }
  }

  static async getRouteTraffic(driverId: string, routeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/traffic`, {
        params: { routeId }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route traffic', error);
      throw error;
    }
  }

  static async avoidRouteArea(driverId: string, avoidData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/avoid`, avoidData);
      return {
        data: response.data,
        success: true,
        message: 'Route area avoided successfully'
      };
    } catch (error) {
      logger.error('Failed to avoid route area', error);
      throw error;
    }
  }

  static async recalculateRoute(driverId: string, routeData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/recalculate`, routeData);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to recalculate route', error);
      throw error;
    }
  }

  static async getRouteETA(driverId: string, routeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/eta`, {
        params: { routeId }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route ETA', error);
      throw error;
    }
  }

  static async createRouteDetour(driverId: string, detourData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/detour`, detourData);
      return {
        data: response.data,
        success: true,
        message: 'Route detour created successfully'
      };
    } catch (error) {
      logger.error('Failed to create route detour', error);
      throw error;
    }
  }

  static async getRouteOptimization(driverId: string, routeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/optimization`, {
        params: { routeId }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route optimization', error);
      throw error;
    }
  }

  static async saveRoute(driverId: string, routeData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/save`, routeData);
      return {
        data: response.data,
        success: true,
        message: 'Route saved successfully'
      };
    } catch (error) {
      logger.error('Failed to save route', error);
      throw error;
    }
  }

  static async getSavedRoutes(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/saved`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get saved routes', error);
      throw error;
    }
  }

  static async deleteRoute(driverId: string, routeId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.delete(`/drivers/${driverId}/routes/${routeId}`);
      return {
        data: undefined,
        success: true,
        message: 'Route deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete route', error);
      throw error;
    }
  }

  static async getRouteWeather(driverId: string, routeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/weather`, {
        params: { routeId }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route weather', error);
      throw error;
    }
  }

  static async submitRouteFeedback(driverId: string, feedbackData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/routes/feedback`, feedbackData);
      return {
        data: undefined,
        success: true,
        message: 'Route feedback submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to submit route feedback', error);
      throw error;
    }
  }

  static async getRouteStatistics(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/statistics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route statistics', error);
      throw error;
    }
  }

  static async shareRoute(driverId: string, shareData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/share`, shareData);
      return {
        data: response.data,
        success: true,
        message: 'Route shared successfully'
      };
    } catch (error) {
      logger.error('Failed to share route', error);
      throw error;
    }
  }

  static async getSharedRoutes(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/shared`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get shared routes', error);
      throw error;
    }
  }

  static async compareRoutes(driverId: string, compareData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/compare`, compareData);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to compare routes', error);
      throw error;
    }
  }

  static async getRoutePredictions(driverId: string, routeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/predictions`, {
        params: { routeId }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route predictions', error);
      throw error;
    }
  }

  static async submitRouteLearning(driverId: string, learningData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/routes/learning`, learningData);
      return {
        data: undefined,
        success: true,
        message: 'Route learning data submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to submit route learning', error);
      throw error;
    }
  }

  static async getRoutePatterns(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/patterns`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get route patterns', error);
      throw error;
    }
  }

  static async createEmergencyRoute(driverId: string, emergencyRouteData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/routes/emergency`, emergencyRouteData);
      return {
        data: response.data,
        success: true,
        message: 'Emergency route created successfully'
      };
    } catch (error) {
      logger.error('Failed to create emergency route', error);
      throw error;
    }
  }

  static async getRealTimeRoute(driverId: string, routeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/routes/real-time`, {
        params: { routeId }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get real-time route', error);
      throw error;
    }
  }

  // ===== FINANCIAL (ERWEITERT) =====
  static async getFinancialTransactions(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/transactions`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get financial transactions', error);
      throw error;
    }
  }

  static async transferFunds(driverId: string, transferData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/transfer`, transferData);
      return {
        data: response.data,
        success: true,
        message: 'Funds transferred successfully'
      };
    } catch (error) {
      logger.error('Failed to transfer funds', error);
      throw error;
    }
  }

  static async getTaxReport(driverId: string, year: number): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/tax-report`, {
        params: { year }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get tax report', error);
      throw error;
    }
  }

  static async getFinancialProjections(driverId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/projections`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get financial projections', error);
      throw error;
    }
  }

  static async getFinancialAnalytics(driverId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/analytics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get financial analytics', error);
      throw error;
    }
  }

  static async getPayoutsHistory(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/payouts/history`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get payouts history', error);
      throw error;
    }
  }

  static async getPayoutSchedule(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/payouts/schedule`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get payout schedule', error);
      throw error;
    }
  }

  static async updatePayoutSchedule(driverId: string, scheduleData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/payouts/schedule`, scheduleData);
      return {
        data: response.data,
        success: true,
        message: 'Payout schedule updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update payout schedule', error);
      throw error;
    }
  }

  static async getInvoices(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/invoices`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get invoices', error);
      throw error;
    }
  }

  static async getInvoice(driverId: string, invoiceId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/invoices/${invoiceId}`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get invoice', error);
      throw error;
    }
  }

  static async payInvoice(driverId: string, invoiceId: string, paymentData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/invoices/${invoiceId}/pay`, paymentData);
      return {
        data: response.data,
        success: true,
        message: 'Invoice paid successfully'
      };
    } catch (error) {
      logger.error('Failed to pay invoice', error);
      throw error;
    }
  }

  static async getTaxes(driverId: string, year: number): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/taxes`, {
        params: { year }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get taxes', error);
      throw error;
    }
  }

  static async calculateTaxes(driverId: string, taxData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/taxes/calculate`, taxData);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to calculate taxes', error);
      throw error;
    }
  }

  static async getDeductions(driverId: string, year: number): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/deductions`, {
        params: { year }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get deductions', error);
      throw error;
    }
  }

  static async createDeduction(driverId: string, deductionData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/deductions`, deductionData);
      return {
        data: response.data,
        success: true,
        message: 'Deduction created successfully'
      };
    } catch (error) {
      logger.error('Failed to create deduction', error);
      throw error;
    }
  }

  static async getBonuses(driverId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/bonuses`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get bonuses', error);
      throw error;
    }
  }

  static async claimBonus(driverId: string, bonusId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/bonuses/claim`, { bonusId });
      return {
        data: response.data,
        success: true,
        message: 'Bonus claimed successfully'
      };
    } catch (error) {
      logger.error('Failed to claim bonus', error);
      throw error;
    }
  }

  static async getPenalties(driverId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/penalties`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get penalties', error);
      throw error;
    }
  }

  static async disputePenalty(driverId: string, penaltyId: string, disputeData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/penalties/dispute`, {
        penaltyId,
        ...disputeData
      });
      return {
        data: response.data,
        success: true,
        message: 'Penalty dispute submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to dispute penalty', error);
      throw error;
    }
  }

  static async getFinancialReports(driverId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/reports`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get financial reports', error);
      throw error;
    }
  }

  static async generateFinancialReport(driverId: string, reportData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/reports/generate`, reportData);
      return {
        data: response.data,
        success: true,
        message: 'Financial report generated successfully'
      };
    } catch (error) {
      logger.error('Failed to generate financial report', error);
      throw error;
    }
  }

  static async getFinancialForecast(driverId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/forecast`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get financial forecast', error);
      throw error;
    }
  }

  static async createBudget(driverId: string, budgetData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/budget`, budgetData);
      return {
        data: response.data,
        success: true,
        message: 'Budget created successfully'
      };
    } catch (error) {
      logger.error('Failed to create budget', error);
      throw error;
    }
  }

  static async getBudget(driverId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/financial/budget`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get budget', error);
      throw error;
    }
  }

  static async createFinancialGoal(driverId: string, goalData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/financial/goals`, goalData);
      return {
        data: response.data,
        success: true,
        message: 'Financial goal created successfully'
      };
    } catch (error) {
      logger.error('Failed to create financial goal', error);
      throw error;
    }
  }

  // ===== PERFORMANCE (ERWEITERT) =====
  static async getPerformanceScore(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/score`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance score', error);
      throw error;
    }
  }

  static async getPerformanceRank(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/rank`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance rank', error);
      throw error;
    }
  }

  static async getPerformanceBenchmarks(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/benchmarks`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance benchmarks', error);
      throw error;
    }
  }

  static async getPerformanceComparison(driverId: string, comparisonData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/comparison`, {
        params: comparisonData
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance comparison', error);
      throw error;
    }
  }

  static async createPerformanceGoal(driverId: string, goalData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/performance/goals`, goalData);
      return {
        data: response.data,
        success: true,
        message: 'Performance goal created successfully'
      };
    } catch (error) {
      logger.error('Failed to create performance goal', error);
      throw error;
    }
  }

  static async getPerformanceImprovements(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/improvements`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance improvements', error);
      throw error;
    }
  }

  static async createPerformanceTraining(driverId: string, trainingData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/performance/training`, trainingData);
      return {
        data: response.data,
        success: true,
        message: 'Performance training created successfully'
      };
    } catch (error) {
      logger.error('Failed to create performance training', error);
      throw error;
    }
  }

  static async getPerformanceTraining(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/training`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance training', error);
      throw error;
    }
  }

  static async getCertifications(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/certifications`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get certifications', error);
      throw error;
    }
  }

  static async createCertification(driverId: string, certificationData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/performance/certifications`, certificationData);
      return {
        data: response.data,
        success: true,
        message: 'Certification created successfully'
      };
    } catch (error) {
      logger.error('Failed to create certification', error);
      throw error;
    }
  }

  static async getPerformanceReviews(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/reviews`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance reviews', error);
      throw error;
    }
  }

  static async createPerformanceReview(driverId: string, reviewData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/performance/reviews`, reviewData);
      return {
        data: response.data,
        success: true,
        message: 'Performance review created successfully'
      };
    } catch (error) {
      logger.error('Failed to create performance review', error);
      throw error;
    }
  }

  static async getPerformanceFeedback(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/feedback`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance feedback', error);
      throw error;
    }
  }

  static async submitPerformanceFeedback(driverId: string, feedbackData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/performance/feedback`, feedbackData);
      return {
        data: undefined,
        success: true,
        message: 'Performance feedback submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to submit performance feedback', error);
      throw error;
    }
  }

  static async getPerformancePredictions(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/predictions`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance predictions', error);
      throw error;
    }
  }

  static async getPerformanceRisks(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/risks`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance risks', error);
      throw error;
    }
  }

  static async getPerformanceOpportunities(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/opportunities`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance opportunities', error);
      throw error;
    }
  }

  static async getPerformanceStrengths(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/strengths`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance strengths', error);
      throw error;
    }
  }

  static async getPerformanceWeaknesses(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/weaknesses`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance weaknesses', error);
      throw error;
    }
  }

  static async createActionPlan(driverId: string, actionPlanData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/performance/action-plan`, actionPlanData);
      return {
        data: response.data,
        success: true,
        message: 'Action plan created successfully'
      };
    } catch (error) {
      logger.error('Failed to create action plan', error);
      throw error;
    }
  }

  static async getActionPlan(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/action-plan`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get action plan', error);
      throw error;
    }
  }

  static async getPerformanceHistory(driverId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/history`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get performance history', error);
      throw error;
    }
  }

  static async exportPerformanceData(driverId: string, exportData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/export`, {
        params: exportData,
        responseType: 'blob'
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to export performance data', error);
      throw error;
    }
  }

  static async sharePerformance(driverId: string, shareData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/performance/share`, shareData);
      return {
        data: response.data,
        success: true,
        message: 'Performance data shared successfully'
      };
    } catch (error) {
      logger.error('Failed to share performance', error);
      throw error;
    }
  }

  static async getExtendedPerformanceComparison(driverId: string, comparisonData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/comparison/extended`, {
        params: comparisonData
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get extended performance comparison', error);
      throw error;
    }
  }

  static async getRealTimePerformance(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/real-time`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get real-time performance', error);
      throw error;
    }
  }

  // ===== GAMIFICATION (ERWEITERT) =====
  static async getGamificationAchievements(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/gamification/achievements`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get gamification achievements', error);
      throw error;
    }
  }

  static async getGamificationStreaks(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/gamification/streaks`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get gamification streaks', error);
      throw error;
    }
  }

  static async getGamificationEvents(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/gamification/events`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get gamification events', error);
      throw error;
    }
  }

  static async joinGamificationEvent(driverId: string, eventId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/gamification/events/join`, { eventId });
      return {
        data: response.data,
        success: true,
        message: 'Event joined successfully'
      };
    } catch (error) {
      logger.error('Failed to join gamification event', error);
      throw error;
    }
  }

  static async getGamificationTournaments(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/gamification/tournaments`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get gamification tournaments', error);
      throw error;
    }
  }

  static async registerForTournament(driverId: string, tournamentId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/gamification/tournaments/register`, { tournamentId });
      return {
        data: response.data,
        success: true,
        message: 'Registered for tournament successfully'
      };
    } catch (error) {
      logger.error('Failed to register for tournament', error);
      throw error;
    }
  }

  static async getGamificationSocial(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/gamification/social`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get gamification social', error);
      throw error;
    }
  }

  static async shareGamification(driverId: string, shareData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/gamification/social/share`, shareData);
      return {
        data: response.data,
        success: true,
        message: 'Shared successfully'
      };
    } catch (error) {
      logger.error('Failed to share gamification', error);
      throw error;
    }
  }

  static async getGamificationHistory(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/gamification/history`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get gamification history', error);
      throw error;
    }
  }

  static async unlockBadge(driverId: string, badgeId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/gamification/badges/unlock`, { badgeId });
      return {
        data: response.data,
        success: true,
        message: 'Badge unlocked successfully'
      };
    } catch (error) {
      logger.error('Failed to unlock badge', error);
      throw error;
    }
  }

  static async upgradeLevel(driverId: string, levelData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/gamification/levels/upgrade`, levelData);
      return {
        data: response.data,
        success: true,
        message: 'Level upgraded successfully'
      };
    } catch (error) {
      logger.error('Failed to upgrade level', error);
      throw error;
    }
  }

  // ===== EMERGENCY (ERWEITERT) =====
  static async updateEmergencyContact(driverId: string, contactId: string, contactData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.put(`/drivers/${driverId}/emergency/contacts/${contactId}`, contactData);
      return {
        data: response.data,
        success: true,
        message: 'Emergency contact updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update emergency contact', error);
      throw error;
    }
  }

  static async deleteEmergencyContact(driverId: string, contactId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.delete(`/drivers/${driverId}/emergency/contacts/${contactId}`);
      return {
        data: undefined,
        success: true,
        message: 'Emergency contact deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete emergency contact', error);
      throw error;
    }
  }

  static async getEmergencyLocation(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/location`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get emergency location', error);
      throw error;
    }
  }

  static async getEmergencyHistory(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/history`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get emergency history', error);
      throw error;
    }
  }

  static async testEmergency(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/emergency/test`);
      return {
        data: response.data,
        success: true,
        message: 'Emergency test completed successfully'
      };
    } catch (error) {
      logger.error('Failed to test emergency', error);
      throw error;
    }
  }

  static async getEmergencyStatus(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/status`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get emergency status', error);
      throw error;
    }
  }

  static async reportMedicalEmergency(driverId: string, medicalData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/emergency/medical`, medicalData);
      return {
        data: response.data,
        success: true,
        message: 'Medical emergency reported successfully'
      };
    } catch (error) {
      logger.error('Failed to report medical emergency', error);
      throw error;
    }
  }

  static async getAccidents(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/accidents`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get accidents', error);
      throw error;
    }
  }

  static async getBreakdowns(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/breakdowns`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get breakdowns', error);
      throw error;
    }
  }

  static async getThefts(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/thefts`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get thefts', error);
      throw error;
    }
  }

  static async getEmergencyResponseTime(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/response-time`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get emergency response time', error);
      throw error;
    }
  }

  static async submitEmergencyFeedback(driverId: string, feedbackData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/emergency/feedback`, feedbackData);
      return {
        data: undefined,
        success: true,
        message: 'Emergency feedback submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to submit emergency feedback', error);
      throw error;
    }
  }

  static async getEmergencyStatistics(driverId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/emergency/statistics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get emergency statistics', error);
      throw error;
    }
  }

  static async getSafetyScore(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/safety/score`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get safety score', error);
      throw error;
    }
  }

  static async reportSafetyIncident(driverId: string, incidentData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/safety/incident`, incidentData);
      return {
        data: response.data,
        success: true,
        message: 'Safety incident reported successfully'
      };
    } catch (error) {
      logger.error('Failed to report safety incident', error);
      throw error;
    }
  }

  // ===== META GLASSES (ERWEITERT) =====
  static async getMetaGlassesStatus(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/meta-glasses/status`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get meta glasses status', error);
      throw error;
    }
  }

  static async getMetaGlassesSettings(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/meta-glasses/settings`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get meta glasses settings', error);
      throw error;
    }
  }

  static async updateMetaGlassesSettings(driverId: string, settings: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.put(`/drivers/${driverId}/meta-glasses/settings`, settings);
      return {
        data: response.data,
        success: true,
        message: 'Meta glasses settings updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update meta glasses settings', error);
      throw error;
    }
  }

  static async stopMetaGlassesNavigation(driverId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/meta-glasses/navigation/stop`);
      return {
        data: undefined,
        success: true,
        message: 'Meta glasses navigation stopped successfully'
      };
    } catch (error) {
      logger.error('Failed to stop meta glasses navigation', error);
      throw error;
    }
  }

  // ===== VOICE (ERWEITERT) =====
  static async getVoiceHistory(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/voice/history`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get voice history', error);
      throw error;
    }
  }

  static async getVoiceAnalytics(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/voice/analytics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get voice analytics', error);
      throw error;
    }
  }

  // ===== QR (ERWEITERT) =====
  static async verifyQRCode(driverId: string, qrData: {
    qrCode: string;
    type: string;
    location?: { lat: number; lng: number };
  }): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/qr/verify`, qrData);
      return {
        data: response.data,
        success: true,
        message: 'QR code verified successfully'
      };
    } catch (error) {
      logger.error('Failed to verify QR code', error);
      throw error;
    }
  }

  // ===== NOTIFICATIONS (ERWEITERT) =====
  static async getUnreadNotificationsCount(driverId: string): Promise<DriverServiceResponse<number>> {
    try {
      const response = await api.get(`/drivers/${driverId}/notifications/unread-count`);
      return {
        data: response.data.count || 0,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get unread notifications count', error);
      throw error;
    }
  }

  static async markAllNotificationsAsRead(driverId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.put(`/drivers/${driverId}/notifications/read-all`);
      return {
        data: undefined,
        success: true,
        message: 'All notifications marked as read'
      };
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  static async deleteNotification(driverId: string, notificationId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.delete(`/drivers/${driverId}/notifications/${notificationId}`);
      return {
        data: undefined,
        success: true,
        message: 'Notification deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete notification', error);
      throw error;
    }
  }

  static async getNotificationPreferences(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/notifications/preferences`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get notification preferences', error);
      throw error;
    }
  }

  static async updateNotificationPreferences(driverId: string, preferences: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.put(`/drivers/${driverId}/notifications/preferences`, preferences);
      return {
        data: response.data,
        success: true,
        message: 'Notification preferences updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update notification preferences', error);
      throw error;
    }
  }

  // ===== SUBSCRIPTION (ERWEITERT) =====
  static async getSubscriptionUsage(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/subscription/usage`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get subscription usage', error);
      throw error;
    }
  }

  static async getSubscriptionAnalytics(driverId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/subscription/analytics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get subscription analytics', error);
      throw error;
    }
  }

  static async getSubscriptionFeatures(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/subscription/features`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get subscription features', error);
      throw error;
    }
  }

  static async enableSubscriptionFeature(driverId: string, featureId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/subscription/features/enable`, { featureId });
      return {
        data: response.data,
        success: true,
        message: 'Feature enabled successfully'
      };
    } catch (error) {
      logger.error('Failed to enable subscription feature', error);
      throw error;
    }
  }

  static async getSubscriptionUsageLimits(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/subscription/usage/limits`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get subscription usage limits', error);
      throw error;
    }
  }

  static async getSubscriptionUsageCurrent(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/subscription/usage/current`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get subscription usage current', error);
      throw error;
    }
  }

  static async pauseSubscription(driverId: string, pauseData?: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/subscription/pause`, pauseData || {});
      return {
        data: response.data,
        success: true,
        message: 'Subscription paused successfully'
      };
    } catch (error) {
      logger.error('Failed to pause subscription', error);
      throw error;
    }
  }

  static async resumeSubscription(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/subscription/resume`);
      return {
        data: response.data,
        success: true,
        message: 'Subscription resumed successfully'
      };
    } catch (error) {
      logger.error('Failed to resume subscription', error);
      throw error;
    }
  }

  // ===== ORDERS (ERWEITERT) =====
  static async bulkRejectOrders(driverId: string, orderIds: string[], reason?: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/bulk-reject`, { orderIds, reason });
      return {
        data: response.data,
        success: true,
        message: `Successfully rejected ${response.data.successful} out of ${response.data.total} orders`
      };
    } catch (error) {
      logger.error('Failed to bulk reject orders', error);
      throw error;
    }
  }

  static async searchOrders(driverId: string, searchQuery: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/search`, {
        params: { q: searchQuery, page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to search orders', error);
      throw error;
    }
  }

  static async exportOrders(driverId: string, exportData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/export`, {
        params: exportData,
        responseType: 'blob'
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to export orders', error);
      throw error;
    }
  }

  static async setOrderPriority(driverId: string, orderId: string, priority: number): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/${orderId}/priority`, { priority });
      return {
        data: response.data,
        success: true,
        message: 'Order priority updated successfully'
      };
    } catch (error) {
      logger.error('Failed to set order priority', error);
      throw error;
    }
  }

  static async favoriteOrder(driverId: string, orderId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/favorite`);
      return {
        data: undefined,
        success: true,
        message: 'Order favorited successfully'
      };
    } catch (error) {
      logger.error('Failed to favorite order', error);
      throw error;
    }
  }

  static async unfavoriteOrder(driverId: string, orderId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.delete(`/drivers/${driverId}/orders/${orderId}/favorite`);
      return {
        data: undefined,
        success: true,
        message: 'Order unfavorited successfully'
      };
    } catch (error) {
      logger.error('Failed to unfavorite order', error);
      throw error;
    }
  }

  static async getFavoriteOrders(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/favorites`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get favorite orders', error);
      throw error;
    }
  }

  static async getCompletedOrders(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/completed`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get completed orders', error);
      throw error;
    }
  }

  static async getCancelledOrders(driverId: string, page: number = 1, limit: number = 20): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/cancelled`, {
        params: { page, limit }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get cancelled orders', error);
      throw error;
    }
  }

  static async rateOrder(driverId: string, orderId: string, rating: number, comment?: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/rating`, { rating, comment });
      return {
        data: undefined,
        success: true,
        message: 'Order rated successfully'
      };
    } catch (error) {
      logger.error('Failed to rate order', error);
      throw error;
    }
  }

  static async getOrderFeedback(driverId: string, orderId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/${orderId}/feedback`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order feedback', error);
      throw error;
    }
  }

  static async submitOrderFeedback(driverId: string, orderId: string, feedbackData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/feedback`, feedbackData);
      return {
        data: undefined,
        success: true,
        message: 'Order feedback submitted successfully'
      };
    } catch (error) {
      logger.error('Failed to submit order feedback', error);
      throw error;
    }
  }

  static async getOrderAnalytics(driverId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/analytics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order analytics', error);
      throw error;
    }
  }

  static async getOrderHeatmap(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/heatmap`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order heatmap', error);
      throw error;
    }
  }

  static async reportOrderIssue(driverId: string, orderId: string, issueData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/${orderId}/issue`, issueData);
      return {
        data: response.data,
        success: true,
        message: 'Order issue reported successfully'
      };
    } catch (error) {
      logger.error('Failed to report order issue', error);
      throw error;
    }
  }

  static async getOrderIssues(driverId: string, orderId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/${orderId}/issues`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order issues', error);
      throw error;
    }
  }

  static async resolveOrderIssue(driverId: string, orderId: string, resolutionData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/${orderId}/resolve`, resolutionData);
      return {
        data: response.data,
        success: true,
        message: 'Order issue resolved successfully'
      };
    } catch (error) {
      logger.error('Failed to resolve order issue', error);
      throw error;
    }
  }

  static async getOrderSuggestions(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/suggestions`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order suggestions', error);
      throw error;
    }
  }

  static async preAcceptOrder(driverId: string, orderId: string, preAcceptData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/pre-accept`, {
        orderId,
        ...preAcceptData
      });
      return {
        data: response.data,
        success: true,
        message: 'Order pre-accepted successfully'
      };
    } catch (error) {
      logger.error('Failed to pre-accept order', error);
      throw error;
    }
  }

  static async getOrderConflicts(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/conflicts`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order conflicts', error);
      throw error;
    }
  }

  static async swapOrder(driverId: string, orderId: string, swapData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/${orderId}/swap`, swapData);
      return {
        data: response.data,
        success: true,
        message: 'Order swap requested successfully'
      };
    } catch (error) {
      logger.error('Failed to swap order', error);
      throw error;
    }
  }

  static async getOrderPatterns(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/patterns`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order patterns', error);
      throw error;
    }
  }

  static async batchUpdateOrders(driverId: string, updateData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/batch-update`, updateData);
      return {
        data: response.data,
        success: true,
        message: 'Orders updated successfully'
      };
    } catch (error) {
      logger.error('Failed to batch update orders', error);
      throw error;
    }
  }

  static async getOrderMetrics(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/metrics`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order metrics', error);
      throw error;
    }
  }

  static async createOrderReminder(driverId: string, orderId: string, reminderData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/${orderId}/reminder`, reminderData);
      return {
        data: response.data,
        success: true,
        message: 'Order reminder created successfully'
      };
    } catch (error) {
      logger.error('Failed to create order reminder', error);
      throw error;
    }
  }

  static async getOrderReminders(driverId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/reminders`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order reminders', error);
      throw error;
    }
  }

  static async deleteOrderReminder(driverId: string, orderId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.delete(`/drivers/${driverId}/orders/${orderId}/reminder`);
      return {
        data: undefined,
        success: true,
        message: 'Order reminder deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete order reminder', error);
      throw error;
    }
  }

  static async getOrderTimeline(driverId: string, orderId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/${orderId}/timeline`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order timeline', error);
      throw error;
    }
  }

  static async getOrderTracking(driverId: string, orderId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/${orderId}/tracking`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order tracking', error);
      throw error;
    }
  }

  static async reportOrderArrival(driverId: string, orderId: string, arrivalData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/arrival`, arrivalData);
      return {
        data: undefined,
        success: true,
        message: 'Order arrival reported successfully'
      };
    } catch (error) {
      logger.error('Failed to report order arrival', error);
      throw error;
    }
  }

  static async reportOrderDeparture(driverId: string, orderId: string, departureData: any): Promise<DriverServiceResponse<void>> {
    try {
      await api.post(`/drivers/${driverId}/orders/${orderId}/departure`, departureData);
      return {
        data: undefined,
        success: true,
        message: 'Order departure reported successfully'
      };
    } catch (error) {
      logger.error('Failed to report order departure', error);
      throw error;
    }
  }

  static async getOrderRoute(driverId: string, orderId: string): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/orders/${orderId}/route`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get order route', error);
      throw error;
    }
  }

  static async updateOrderRoute(driverId: string, orderId: string, routeData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/orders/${orderId}/route/update`, routeData);
      return {
        data: response.data,
        success: true,
        message: 'Order route updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update order route', error);
      throw error;
    }
  }

  // ===== ACCEPTANCE =====
  static async getAcceptanceStats(driverId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/${driverId}/acceptance/stats`, {
        params: { period }
      });
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get acceptance stats', error);
      throw error;
    }
  }

  // ===== PUSH NOTIFICATIONS =====
  static async getPushPublicKey(): Promise<DriverServiceResponse<string>> {
    try {
      const response = await api.get(`/drivers/push/public-key`);
      return {
        data: response.data.key || response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get push public key', error);
      throw error;
    }
  }

  static async subscribeToPush(driverId: string, subscriptionData: any): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.post(`/drivers/${driverId}/push-subscription`, subscriptionData);
      return {
        data: response.data,
        success: true,
        message: 'Push subscription created successfully'
      };
    } catch (error) {
      logger.error('Failed to subscribe to push', error);
      throw error;
    }
  }

  static async unsubscribeFromPush(driverId: string): Promise<DriverServiceResponse<void>> {
    try {
      await api.delete(`/drivers/${driverId}/push-subscription`);
      return {
        data: undefined,
        success: true,
        message: 'Push subscription removed successfully'
      };
    } catch (error) {
      logger.error('Failed to unsubscribe from push', error);
      throw error;
    }
  }

  // ===== ADVANCED =====
  static async getAdvancedOverview(): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/advanced/overview`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get advanced overview', error);
      throw error;
    }
  }

  static async getAdvancedSchedules(): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/advanced/schedules`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get advanced schedules', error);
      throw error;
    }
  }

  static async getAdvancedPerformance(): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/advanced/performance`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get advanced performance', error);
      throw error;
    }
  }

  static async getAdvancedAnalytics(): Promise<DriverServiceResponse<any>> {
    try {
      const response = await api.get(`/drivers/advanced/analytics`);
      return {
        data: response.data,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get advanced analytics', error);
      throw error;
    }
  }
}
