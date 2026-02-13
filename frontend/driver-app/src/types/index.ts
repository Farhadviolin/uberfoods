export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  notes?: string;
  createdAt: string;
  driverId?: string | null;
  restaurant: {
    id: string;
    name: string;
    address: string;
    location?: { lat: number; lng: number };
  };
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  items: Array<{
    dish: {
      name: string;
    };
    quantity: number;
    price: number;
  }>;
  customerLocation?: { lat: number; lng: number };
}

export interface Driver {
  id: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  location?: { lat: number; lng: number };
  performance?: DriverPerformance;
  preferences?: DriverPreferences;
  vehicle?: VehicleInfo;
}

export interface DriverPerformance {
  rating: number;
  totalDeliveries: number;
  onTimePercentage: number;
  customerSatisfaction: number;
  averageEarnings: number;
  fatigueLevel: number; // 0-100
  todayStats: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
  };
}

export interface DriverPreferences {
  maxOrdersPerHour: number;
  preferredAreas: string[];
  workingHours: { start: string; end: string };
  autoAcceptThreshold: number;
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface VehicleInfo {
  type: 'car' | 'bike' | 'scooter';
  capacity: number;
  fuelEfficiency: number;
  maintenance?: {
    lastService: string;
    nextService: string;
    issues: string[];
  };
}

export interface AcceptanceScore {
  orderId: string;
  overall: number; // 0-100
  factors: {
    traffic: number;
    earnings: number;
    time: number;
    distance: number;
    performance: number;
    fatigue: number;
  };
  recommendation: 'accept' | 'decline' | 'wait' | 'auto_accept';
  reasoning: string[];
  estimatedEarnings: number;
  estimatedTime: number;
  confidence: number; // 0-100
}

export interface TrafficData {
  currentSpeed: number;
  averageSpeed: number;
  congestionLevel: number; // 0-100
  incidents: TrafficIncident[];
  prediction15min: number; // Geschätzte Fahrtzeit in Minuten
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'weather' | 'event';
  severity: 'low' | 'medium' | 'high';
  location: { lat: number; lng: number };
  description: string;
  estimatedDelay: number; // Minuten
}

export interface RouteOptimization {
  optimizedRoute: Array<{
    location: { lat: number; lng: number };
    type: 'driver' | 'restaurant' | 'customer';
    orderId?: string;
    name?: string;
    estimatedArrival: string;
    action: string;
  }>;
  totalDistance: number;
  totalTime: number;
  fuelConsumption: number;
  earnings: number;
  efficiency: number; // 0-100
}

export interface PerformanceMetrics {
  daily: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
    rating: number;
    acceptanceRate: number;
    onTimeRate: number;
    customerSatisfaction: number;
  };
  weekly: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
    rating: number;
    acceptanceRate: number;
    onTimeRate: number;
    customerSatisfaction: number;
    trend: 'up' | 'down' | 'stable';
  };
  monthly: {
    deliveries: number;
    earnings: number;
    hoursWorked: number;
    rating: number;
    acceptanceRate: number;
    onTimeRate: number;
    customerSatisfaction: number;
    trend: 'up' | 'down' | 'stable';
  };
  streaks: {
    perfectDeliveries: number;
    onTimeStreak: number;
    highRatingStreak: number;
  };
  efficiency: {
    avgDeliveryTime: number; // minutes
    avgEarningsPerHour: number;
    fuelEfficiency: number; // km/l
    routeOptimization: number; // 0-100
  };
}

export interface AICoachingTip {
  id: string;
  type: 'improvement' | 'celebration' | 'warning' | 'tip';
  category: 'timing' | 'routing' | 'communication' | 'safety' | 'efficiency';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  timestamp: Date;
  data?: any;
}

export interface PerformanceTrend {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  period: 'daily' | 'weekly' | 'monthly';
}

export interface GoalProgress {
  id: string;
  type: 'deliveries' | 'earnings' | 'rating' | 'hours';
  target: number;
  current: number;
  progress: number; // 0-100
  deadline: Date;
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
  reward?: string;
}

export interface ARSettings {
  enabled: boolean;
  overlayOpacity: number; // 0-1
  voiceGuidance: boolean;
  hapticFeedback: boolean;
  autoZoom: boolean;
  nightMode: boolean;
  showTraffic: boolean;
  showPointsOfInterest: boolean;
}

export interface ARNavigationStep {
  id: string;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  turnType: 'straight' | 'left' | 'right' | 'slight_left' | 'slight_right' | 'sharp_left' | 'sharp_right' | 'u_turn';
  streetName?: string;
  landmarks?: string[];
  visualCue?: string;
  completed: boolean;
}

export interface AROverlay {
  type: 'navigation' | 'information' | 'warning' | 'celebration';
  position: 'top' | 'center' | 'bottom' | 'left' | 'right';
  content: string;
  icon?: string;
  duration?: number; // auto-hide after X seconds
  priority: 'low' | 'medium' | 'high' | 'critical';
  interactive?: boolean;
  action?: () => void;
}

export interface MetaGlassesState {
  connected: boolean;
  batteryLevel: number;
  temperature: number;
  lastSync: Date;
  arEnabled: boolean;
  currentOverlay?: AROverlay;
  navigationSteps: ARNavigationStep[];
  settings: ARSettings;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'delivery' | 'performance' | 'safety' | 'social' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: AchievementRequirement[];
  rewards: AchievementReward[];
  unlockedAt?: Date;
  progress: number; // 0-100
  isCompleted: boolean;
  isNew?: boolean; // Für neue Errungenschaften
}

export interface AchievementRequirement {
  type: 'deliveries' | 'rating' | 'streak' | 'earnings' | 'hours' | 'distance' | 'efficiency';
  target: number;
  current: number;
  description: string;
}

export interface AchievementReward {
  type: 'badge' | 'xp' | 'bonus' | 'title' | 'unlock';
  value: number | string;
  description: string;
}

export interface DriverLevel {
  level: number;
  xp: number;
  xpToNext: number;
  title: string;
  perks: string[];
  progress: number; // 0-100
}

export interface GamificationStats {
  level: DriverLevel;
  totalXP: number;
  achievements: Achievement[];
  streaks: {
    currentDeliveryStreak: number;
    longestDeliveryStreak: number;
    currentRatingStreak: number;
    longestRatingStreak: number;
    perfectWeekStreak: number;
  };
  badges: string[];
  titles: string[];
  weeklyProgress: {
    deliveries: number;
    earnings: number;
    rating: number;
    xpGained: number;
  };
  leaderboards: {
    position: number;
    totalDrivers: number;
    percentile: number;
  };
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'deliveries' | 'rating' | 'earnings' | 'efficiency' | 'time';
  target: number;
  current: number;
  reward: AchievementReward;
  expiresAt: Date;
  completed: boolean;
  progress: number; // 0-100
}

export interface WeeklyQuest {
  id: string;
  title: string;
  description: string;
  objectives: {
    id: string;
    description: string;
    target: number;
    current: number;
    completed: boolean;
  }[];
  rewards: AchievementReward[];
  expiresAt: Date;
  completed: boolean;
  progress: number; // 0-100
}

