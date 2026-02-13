import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Driver, Order, PerformanceMetrics, GamificationStats } from '../types';
import { logger } from '../utils/logger';

// State interfaces
interface AppState {
  driver: Driver | null;
  orders: {
    pending: Order[];
    active: Order[];
    completed: Order[];
    loading: boolean;
    error: string | null;
  };
  performance: {
    metrics: PerformanceMetrics | null;
    dashboard: any;
    loading: boolean;
  };
  gamification: {
    stats: GamificationStats | null;
    loading: boolean;
  };
  location: {
    current: { lat: number; lng: number } | null;
    lastUpdate: Date | null;
  };
  notifications: {
    items: any[];
    unreadCount: number;
    loading: boolean;
  };
  emergency: {
    isActive: boolean;
    lastAlert: any;
  };
  offline: {
    isOnline: boolean;
    pendingActions: any[];
  };
}

// Actions
type AppAction =
  | { type: 'SET_DRIVER'; payload: Driver }
  | { type: 'UPDATE_DRIVER'; payload: Partial<Driver> }
  | { type: 'SET_ORDERS_LOADING'; payload: boolean }
  | { type: 'SET_ORDERS'; payload: { pending: Order[]; active: Order[]; completed: Order[] } }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { orderId: string; updates: Partial<Order> } }
  | { type: 'REMOVE_ORDER'; payload: string }
  | { type: 'SET_ORDERS_ERROR'; payload: string }
  | { type: 'SET_PERFORMANCE_LOADING'; payload: boolean }
  | { type: 'SET_PERFORMANCE_METRICS'; payload: PerformanceMetrics }
  | { type: 'SET_PERFORMANCE_DASHBOARD'; payload: any }
  | { type: 'SET_GAMIFICATION_LOADING'; payload: boolean }
  | { type: 'SET_GAMIFICATION_STATS'; payload: GamificationStats }
  | { type: 'UPDATE_LOCATION'; payload: { lat: number; lng: number } }
  | { type: 'SET_NOTIFICATIONS'; payload: any[] }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'SET_EMERGENCY_ACTIVE'; payload: boolean }
  | { type: 'SET_EMERGENCY_ALERT'; payload: any }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'ADD_PENDING_ACTION'; payload: any }
  | { type: 'REMOVE_PENDING_ACTION'; payload: string }
  | { type: 'CLEAR_ALL_DATA' };

// Initial state
const initialState: AppState = {
  driver: null,
  orders: {
    pending: [],
    active: [],
    completed: [],
    loading: false,
    error: null,
  },
  performance: {
    metrics: null,
    dashboard: null,
    loading: false,
  },
  gamification: {
    stats: null,
    loading: false,
  },
  location: {
    current: null,
    lastUpdate: null,
  },
  notifications: {
    items: [],
    unreadCount: 0,
    loading: false,
  },
  emergency: {
    isActive: false,
    lastAlert: null,
  },
  offline: {
    isOnline: navigator.onLine,
    pendingActions: [],
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DRIVER':
      return { ...state, driver: action.payload };

    case 'UPDATE_DRIVER':
      return {
        ...state,
        driver: state.driver ? { ...state.driver, ...action.payload } : null
      };

    case 'SET_ORDERS_LOADING':
      return {
        ...state,
        orders: { ...state.orders, loading: action.payload }
      };

    case 'SET_ORDERS':
      return {
        ...state,
        orders: {
          ...state.orders,
          pending: action.payload.pending,
          active: action.payload.active,
          completed: action.payload.completed,
          loading: false,
          error: null,
        }
      };

    case 'ADD_ORDER':
      return {
        ...state,
        orders: {
          ...state.orders,
          pending: [action.payload, ...state.orders.pending]
        }
      };

    case 'UPDATE_ORDER':
      const updateOrderInList = (orders: Order[]) =>
        orders.map(order =>
          order.id === action.payload.orderId
            ? { ...order, ...action.payload.updates }
            : order
        );

      return {
        ...state,
        orders: {
          ...state.orders,
          pending: updateOrderInList(state.orders.pending),
          active: updateOrderInList(state.orders.active),
          completed: updateOrderInList(state.orders.completed),
        }
      };

    case 'REMOVE_ORDER':
      return {
        ...state,
        orders: {
          ...state.orders,
          pending: state.orders.pending.filter(o => o.id !== action.payload),
          active: state.orders.active.filter(o => o.id !== action.payload),
          completed: state.orders.completed.filter(o => o.id !== action.payload),
        }
      };

    case 'SET_ORDERS_ERROR':
      return {
        ...state,
        orders: { ...state.orders, error: action.payload, loading: false }
      };

    case 'SET_PERFORMANCE_LOADING':
      return {
        ...state,
        performance: { ...state.performance, loading: action.payload }
      };

    case 'SET_PERFORMANCE_METRICS':
      return {
        ...state,
        performance: { ...state.performance, metrics: action.payload, loading: false }
      };

    case 'SET_PERFORMANCE_DASHBOARD':
      return {
        ...state,
        performance: { ...state.performance, dashboard: action.payload, loading: false }
      };

    case 'SET_GAMIFICATION_LOADING':
      return {
        ...state,
        gamification: { ...state.gamification, loading: action.payload }
      };

    case 'SET_GAMIFICATION_STATS':
      return {
        ...state,
        gamification: { ...state.gamification, stats: action.payload, loading: false }
      };

    case 'UPDATE_LOCATION':
      return {
        ...state,
        location: {
          current: action.payload,
          lastUpdate: new Date()
        }
      };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: action.payload,
          unreadCount: action.payload.filter(n => !n.read).length
        }
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: [action.payload, ...state.notifications.items],
          unreadCount: state.notifications.unreadCount + (action.payload.read ? 0 : 1)
        }
      };

    case 'MARK_NOTIFICATION_READ':
      const updatedNotifications = state.notifications.items.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: updatedNotifications,
          unreadCount: Math.max(0, state.notifications.unreadCount - 1)
        }
      };

    case 'SET_EMERGENCY_ACTIVE':
      return {
        ...state,
        emergency: { ...state.emergency, isActive: action.payload }
      };

    case 'SET_EMERGENCY_ALERT':
      return {
        ...state,
        emergency: { ...state.emergency, lastAlert: action.payload }
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        offline: { ...state.offline, isOnline: action.payload }
      };

    case 'ADD_PENDING_ACTION':
      return {
        ...state,
        offline: {
          ...state.offline,
          pendingActions: [...state.offline.pendingActions, action.payload]
        }
      };

    case 'REMOVE_PENDING_ACTION':
      return {
        ...state,
        offline: {
          ...state.offline,
          pendingActions: state.offline.pendingActions.filter(a => a.id !== action.payload)
        }
      };

    case 'CLEAR_ALL_DATA':
      return initialState;

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setDriver: (driver: Driver) => void;
    updateDriver: (updates: Partial<Driver>) => void;
    setOrdersLoading: (loading: boolean) => void;
    setOrders: (orders: { pending: Order[]; active: Order[]; completed: Order[] }) => void;
    addOrder: (order: Order) => void;
    updateOrder: (orderId: string, updates: Partial<Order>) => void;
    removeOrder: (orderId: string) => void;
    setOrdersError: (error: string) => void;
    setPerformanceLoading: (loading: boolean) => void;
    setPerformanceMetrics: (metrics: PerformanceMetrics) => void;
    setPerformanceDashboard: (dashboard: any) => void;
    setGamificationLoading: (loading: boolean) => void;
    setGamificationStats: (stats: GamificationStats) => void;
    updateLocation: (location: { lat: number; lng: number }) => void;
    setNotifications: (notifications: any[]) => void;
    addNotification: (notification: any) => void;
    markNotificationRead: (notificationId: string) => void;
    setEmergencyActive: (active: boolean) => void;
    setEmergencyAlert: (alert: any) => void;
    setOnlineStatus: (online: boolean) => void;
    addPendingAction: (action: any) => void;
    removePendingAction: (actionId: string) => void;
    clearAllData: () => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Action creators
  const actions = {
    setDriver: (driver: Driver) => dispatch({ type: 'SET_DRIVER', payload: driver }),
    updateDriver: (updates: Partial<Driver>) => dispatch({ type: 'UPDATE_DRIVER', payload: updates }),
    setOrdersLoading: (loading: boolean) => dispatch({ type: 'SET_ORDERS_LOADING', payload: loading }),
    setOrders: (orders: { pending: Order[]; active: Order[]; completed: Order[] }) =>
      dispatch({ type: 'SET_ORDERS', payload: orders }),
    addOrder: (order: Order) => dispatch({ type: 'ADD_ORDER', payload: order }),
    updateOrder: (orderId: string, updates: Partial<Order>) =>
      dispatch({ type: 'UPDATE_ORDER', payload: { orderId, updates } }),
    removeOrder: (orderId: string) => dispatch({ type: 'REMOVE_ORDER', payload: orderId }),
    setOrdersError: (error: string) => dispatch({ type: 'SET_ORDERS_ERROR', payload: error }),
    setPerformanceLoading: (loading: boolean) => dispatch({ type: 'SET_PERFORMANCE_LOADING', payload: loading }),
    setPerformanceMetrics: (metrics: PerformanceMetrics) => dispatch({ type: 'SET_PERFORMANCE_METRICS', payload: metrics }),
    setPerformanceDashboard: (dashboard: any) => dispatch({ type: 'SET_PERFORMANCE_DASHBOARD', payload: dashboard }),
    setGamificationLoading: (loading: boolean) => dispatch({ type: 'SET_GAMIFICATION_LOADING', payload: loading }),
    setGamificationStats: (stats: GamificationStats) => dispatch({ type: 'SET_GAMIFICATION_STATS', payload: stats }),
    updateLocation: (location: { lat: number; lng: number }) => dispatch({ type: 'UPDATE_LOCATION', payload: location }),
    setNotifications: (notifications: any[]) => dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications }),
    addNotification: (notification: any) => dispatch({ type: 'ADD_NOTIFICATION', payload: notification }),
    markNotificationRead: (notificationId: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId }),
    setEmergencyActive: (active: boolean) => dispatch({ type: 'SET_EMERGENCY_ACTIVE', payload: active }),
    setEmergencyAlert: (alert: any) => dispatch({ type: 'SET_EMERGENCY_ALERT', payload: alert }),
    setOnlineStatus: (online: boolean) => dispatch({ type: 'SET_ONLINE_STATUS', payload: online }),
    addPendingAction: (action: any) => dispatch({ type: 'ADD_PENDING_ACTION', payload: action }),
    removePendingAction: (actionId: string) => dispatch({ type: 'REMOVE_PENDING_ACTION', payload: actionId }),
    clearAllData: () => dispatch({ type: 'CLEAR_ALL_DATA' }),
  };

  // Online/offline monitoring
  useEffect(() => {
    const handleOnline = () => actions.setOnlineStatus(true);
    const handleOffline = () => actions.setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    try {
      const stateToPersist = {
        driver: state.driver,
        orders: state.orders,
        performance: state.performance,
        gamification: state.gamification,
        notifications: state.notifications,
        emergency: state.emergency,
        offline: state.offline,
      };
      localStorage.setItem('app_state', JSON.stringify(stateToPersist));
    } catch (error) {
      logger.error('Failed to persist state to localStorage', error);
    }
  }, [state]);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const persistedState = localStorage.getItem('app_state');
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        // Restore state selectively (avoid overwriting real-time data)
        if (parsed.driver) actions.setDriver(parsed.driver);
        if (parsed.notifications) actions.setNotifications(parsed.notifications.items || []);
      }
    } catch (error) {
      logger.error('Failed to load state from localStorage', error);
    }
  }, []);

  const contextValue: AppContextType = {
    state,
    dispatch,
    actions,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the app state
export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

// Utility functions for state management
export class StateUtils {
  static isOrderActive(order: Order): boolean {
    return ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status || '');
  }

  static isOrderCompleted(order: Order): boolean {
    return ['DELIVERED', 'CANCELLED'].includes(order.status || '');
  }

  static calculateOrderPriority(order: Order): 'low' | 'normal' | 'high' | 'urgent' {
    const totalAmount = order.totalAmount || 0;
    const timeSinceCreation = Date.now() - new Date(order.createdAt || Date.now()).getTime();
    const minutesOld = timeSinceCreation / (1000 * 60);

    if (totalAmount > 50 || minutesOld > 30) return 'urgent';
    if (totalAmount > 25 || minutesOld > 15) return 'high';
    if (totalAmount > 10 || minutesOld > 5) return 'normal';
    return 'low';
  }

  static formatDriverStatus(status: string): string {
    const statusMap = {
      'OFFLINE': 'Offline',
      'ONLINE': 'Online',
      'BUSY': 'Beschäftigt',
      'DELIVERING': 'Liefert aus',
      'BREAK': 'Pause',
      'EMERGENCY': 'Notfall'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }

  static getEmergencySeverityColor(severity: string): string {
    const colors = {
      'low': '#28a745',
      'medium': '#ffc107',
      'high': '#fd7e14',
      'critical': '#dc3545'
    };
    return colors[severity as keyof typeof colors] || '#6c757d';
  }
}
