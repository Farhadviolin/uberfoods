import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  QueryOptimizer,
  PaginatedResult,
} from "../../common/utils/query-optimizer.util";
import { CacheService } from "../../common/cache/cache.service";
import { MetricsService } from "../../common/services/metrics.service";
import { SanitizationUtil } from "../../common/utils/sanitization.util";
import * as bcrypt from "bcrypt";
import { EmailService } from "../../common/services/email.service";

interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    isOpen?: boolean;
    isClosed?: boolean;
  };
}

interface DeliveryZone {
  id?: string;
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  polygon?: Array<{ lat: number; lng: number }>;
  isActive?: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
}

interface RestaurantUpdateData {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  description?: string;
  imageUrl?: string;
  operatingHours?: OperatingHours;
  deliveryZones?: DeliveryZone[];
  minOrderAmount?: number;
  deliveryFee?: number;
  location?: { lat: number; lng: number };
  cuisine?: string;
  deliveryRadius?: number;
  minimumOrder?: number;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  dineInAvailable?: boolean;
  [key: string]: unknown;
}

interface RestaurantData {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string | null;
  status: string;
  rating?: number | null;
  totalOrders: number;
  avgPrepTime?: number | null;
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number | null;
  estimatedDeliveryTime?: number | null;
  cuisines?: string[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantFindAllResult extends PaginatedResult<RestaurantData> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface RestaurantSettings {
  autoAcceptOrders?: boolean;
  maxConcurrentOrders?: number;
  preparationTimeBuffer?: number;
  maxCapacity?: number;
  currentCapacity?: number;
  [key: string]: unknown;
}

interface PrismaRestaurantLocation {
  restaurantLocation?: {
    findMany?: (args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
    }) => Promise<Array<{ id: string; name: string; [key: string]: unknown }>>;
    findFirst?: (args: {
      where: Record<string, unknown>;
    }) => Promise<{ id: string; name: string; [key: string]: unknown } | null>;
    create?: (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id: string; name: string; [key: string]: unknown }>;
    update?: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ id: string; name: string; [key: string]: unknown }>;
    delete?: (args: {
      where: Record<string, unknown>;
    }) => Promise<{ id: string; name: string; [key: string]: unknown }>;
  };
}

interface OrderWithItems {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  customerId?: string;
  customer?: { name: string };
  items?: Array<{
    dishId: string;
    quantity: number;
    price?: number;
    dish?: {
      id: string;
      name: string;
      category?: string | null;
      price: number;
    };
  }>;
}

interface DishData {
  id: string;
  name: string;
  category?: string | null;
  price: number;
}

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private metricsService: MetricsService,
    private emailService: EmailService,
  ) {}

  /**
   * Invalidate restaurant cache
   */
  private invalidateRestaurantCache() {
    // Invalidate all restaurant-related cache keys using pattern matching
    this.cacheService.deletePattern("restaurants:.*");
    this.logger.debug("Invalidated restaurant cache");
  }

  /**
   * Generates a secure temporary password (12 characters, mixed charset)
   */
  private generateTemporaryPassword(): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const allChars = uppercase + lowercase + numbers;

    let password = "";
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    // Fill remaining characters
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle password to avoid predictable positions
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  async findAll(
    filters?: { status?: string; isActive?: boolean },
    paginationOptions?: { page: number; limit: number; maxLimit?: number },
  ) {
    const startTime = Date.now();

    try {
      const pagination = QueryOptimizer.normalizePagination(paginationOptions);

      // Create cache key based on filters and pagination
      const cacheKey = `restaurants:${JSON.stringify(filters || {})}:${pagination.page}:${pagination.limit}`;

      // Try to get from cache first
      const cachedResult =
        this.cacheService.get<RestaurantFindAllResult>(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Cache hit for restaurants: ${cacheKey}`);
        this.metricsService.incrementCounter("restaurant.findAll.cache_hit");
        return cachedResult;
      }

      // Get total count for pagination
      const total = await this.prisma.restaurant.count({ where: filters });

      // Optimized query using select instead of include with pagination
      const restaurants = await this.prisma.restaurant.findMany({
        where: filters,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          phone: true,
          email: true,
          imageUrl: true,
          status: true,
          rating: true,
          totalOrders: true,
          avgPrepTime: true,
          minOrderAmount: true,
          deliveryFee: true,
          freeDeliveryThreshold: true,
          estimatedDeliveryTime: true,
          cuisines: true,
          tags: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          dishes: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              isAvailable: true,
            },
            where: { isAvailable: true },
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      const result = QueryOptimizer.createPaginatedResponse(
        restaurants,
        total,
        pagination.page,
        pagination.limit,
      );

      // Cache the result for 5 minutes
      this.cacheService.set(cacheKey, result, 300000);
      this.logger.debug(`Cached restaurants result: ${cacheKey}`);

      // Record metrics
      const duration = Date.now() - startTime;
      this.metricsService.incrementCounter("restaurant.findAll.success");
      this.metricsService.recordHistogram(
        "restaurant.findAll.duration",
        duration,
      );

      return result;
    } catch (error) {
      this.logger.warn(
        "Failed to get restaurants with relations, trying without relations",
        error,
      );
      // Fallback: Versuche ohne Relations
      try {
        const pagination =
          QueryOptimizer.normalizePagination(paginationOptions);
        const total = await this.prisma.restaurant.count({ where: filters });

        const restaurants = await this.prisma.restaurant.findMany({
          where: filters,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { createdAt: "desc" },
        });

        return QueryOptimizer.createPaginatedResponse(
          restaurants,
          total,
          pagination.page,
          pagination.limit,
        );
      } catch (fallbackError) {
        this.logger.error(
          "Failed to get restaurants, returning empty paginated result",
          fallbackError,
        );
        // Letzter Fallback: Leeres paginiertes Result
        const duration = Date.now() - startTime;
        this.metricsService.incrementCounter("restaurant.findAll.error");
        this.metricsService.recordHistogram(
          "restaurant.findAll.error_duration",
          duration,
        );
        return QueryOptimizer.createPaginatedResponse([], 0, 1, 20);
      }
    }
  }

  async findOne(id: string) {
    // Check cache first
    const cacheKey = `restaurant:${id}`;
    const cachedResult = this.cacheService.get<any>(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Cache hit for restaurant: ${id}`);
      return cachedResult;
    }

    // Optimized query using select instead of include
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        email: true,
        imageUrl: true,
        status: true,
        rating: true,
        totalOrders: true,
        avgPrepTime: true,
        minOrderAmount: true,
        deliveryFee: true,
        freeDeliveryThreshold: true,
        estimatedDeliveryTime: true,
        cuisines: true,
        tags: true,
        location: true,
        deliveryZones: true,
        operatingHours: true,
        settings: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        dishes: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isAvailable: true,
            isActive: true,
            category: true,
            tags: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        staff: {
          select: {
            id: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    // Cache for 5 minutes
    this.cacheService.set(cacheKey, restaurant, 300000);
    return restaurant;
  }

  async create(data: {
    name: string;
    email: string;
    address: string;
    phone?: string;
    description?: string;
    imageUrl?: string;
    operatingHours?: OperatingHours;
    deliveryZones?: DeliveryZone[];
    minOrderAmount?: number;
    deliveryFee?: number;
    location?: { lat: number; lng: number };
    cuisine?: string;
    deliveryRadius?: number;
    minimumOrder?: number;
    deliveryAvailable?: boolean;
    pickupAvailable?: boolean;
    dineInAvailable?: boolean;
  }) {
    // Basic validation (DTO validates too, but keep extra safety)
    if (!data.name || !data.email || !data.address) {
      throw new BadRequestException(
        "Name, E-Mail und Adresse sind erforderlich",
      );
    }

    const normalizedEmail = data.email.trim().toLowerCase();

    // Prevent duplicate restaurants by email
    const existing = await this.prisma.restaurant.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException(
        "Restaurant mit dieser E-Mail existiert bereits",
      );
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const result = await this.prisma.restaurant.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        address: data.address,
        phone: data.phone,
        description: data.description,
        imageUrl: data.imageUrl,
        operatingHours: data.operatingHours as any,
        deliveryZones: data.deliveryZones as any,
        minOrderAmount: data.minOrderAmount || data.minimumOrder || 0,
        deliveryFee: data.deliveryFee || 2.5,
        location: data.location
          ? { lat: data.location.lat, lng: data.location.lng }
          : undefined,
        cuisines: data.cuisine ? [data.cuisine] : [],
        password: hashedPassword,
        mustChangePassword: true,
        welcomeEmailSent: false,
      },
    });

    // Send welcome email with credentials (best-effort)
    let welcomeEmailSent = false;
    if (this.emailService) {
      try {
        welcomeEmailSent = await this.emailService.sendWelcomeEmail(
          result.email,
          result.name,
          temporaryPassword,
          "restaurant",
        );

        if (welcomeEmailSent) {
          await this.prisma.restaurant.update({
            where: { id: result.id },
            data: { welcomeEmailSent: true, welcomeEmailSentAt: new Date() },
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to send welcome email to restaurant ${result.id}:`,
          error,
        );
      }
    } else {
      this.logger.warn("EmailService not available - welcome email not sent");
    }

    // Invalidate cache after creation
    this.invalidateRestaurantCache();
    this.cacheService.delete(`restaurant:${result.id}`);

    const { password: _, ...restaurantWithoutPassword } = result;

    return {
      ...restaurantWithoutPassword,
      temporaryPassword,
      welcomeEmailSent,
    };
  }

  async update(id: string, data: RestaurantUpdateData) {
    await this.findOne(id);

    const result = await this.prisma.restaurant.update({
      where: { id },
      data: data as any,
    });

    // Invalidate cache after update
    this.invalidateRestaurantCache();
    this.cacheService.delete(`restaurant:${id}`);

    return result;
  }

  async delete(id: string) {
    const result = await this.prisma.restaurant.delete({
      where: { id },
    });

    // Invalidate cache after deletion
    this.invalidateRestaurantCache();
    this.cacheService.delete(`restaurant:${id}`);

    return result;
  }

  async toggleStatus(id: string) {
    const restaurant = await this.findOne(id);
    const result = await this.prisma.restaurant.update({
      where: { id },
      data: { isActive: !restaurant.isActive },
    });

    // Invalidate cache after status change
    this.invalidateRestaurantCache();
    this.cacheService.delete(`restaurant:${id}`);

    return result;
  }

  async getStatus(id: string) {
    const restaurant = await this.findOne(id);
    const currentHours = await this.getCurrentOperatingHours(id);
    const queueStatus = await this.getQueueStatus(id);

    // Calculate busyness based on queue length and current capacity
    let busyness = "low";
    if (queueStatus.queueLength > 20) busyness = "high";
    else if (queueStatus.queueLength > 10) busyness = "medium";

    // Calculate average preparation time based on recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: {
        restaurantId: id,
        status: "DELIVERED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      select: {
        createdAt: true,
        deliveredAt: true,
      },
      take: 20,
    });

    let avgPrepTime = restaurant.avgPrepTime || 15;
    if (recentOrders.length > 0) {
      const prepTimes = recentOrders
        .filter((order) => order.deliveredAt && order.createdAt)
        .map(
          (order) =>
            (new Date(order.deliveredAt!).getTime() -
              new Date(order.createdAt).getTime()) /
            (1000 * 60),
        );

      if (prepTimes.length > 0) {
        avgPrepTime =
          prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length;
      }
    }

    // Get current active orders
    const activeOrders = await this.prisma.order.count({
      where: {
        restaurantId: id,
        status: { in: ["CONFIRMED", "PREPARING", "READY"] },
      },
    });

    return {
      status: restaurant.status,
      isActive: restaurant.isActive,
      isOpen: currentHours.isOpen,
      operatingHours: currentHours.hours,
      busyness,
      queueLength: queueStatus.queueLength,
      estimatedWaitTime: queueStatus.estimatedWaitTime,
      avgPrepTime: Math.round(avgPrepTime),
      activeOrders,
      capacity: {
        current: activeOrders,
        max: 50, // Configurable max capacity
        utilizationPercent: Math.round((activeOrders / 50) * 100),
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { status },
    });
  }

  async getOperatingHours(id: string) {
    const restaurant = await this.findOne(id);
    return restaurant.operatingHours;
  }

  async updateOperatingHours(id: string, hours: OperatingHours) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { operatingHours: hours },
    });
  }

  async getCurrentOperatingHours(id: string) {
    const restaurant = await this.findOne(id);
    const hours = restaurant.operatingHours as OperatingHours | null;
    const now = new Date();
    const dayOfWeek = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    return {
      isOpen: hours?.[dayOfWeek]?.isOpen || false,
      hours: hours?.[dayOfWeek] || null,
      currentTime: now.toISOString(),
    };
  }

  async getDeliveryZones(id: string) {
    const restaurant = await this.findOne(id);
    return restaurant.deliveryZones;
  }

  async getActiveDeliveryZones(id: string) {
    const restaurant = await this.findOne(id);
    const zones = (restaurant.deliveryZones as DeliveryZone[]) || [];
    return Array.isArray(zones)
      ? zones.filter((z: DeliveryZone) => z.isActive !== false)
      : [];
  }

  async updateDeliveryZones(id: string, zones: DeliveryZone[]) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { deliveryZones: zones as any },
    });
  }

  async validateDeliveryZone(
    id: string,
    location: { lat: number; lng: number },
  ) {
    const restaurant = await this.findOne(id);
    const zones = (restaurant.deliveryZones as DeliveryZone[]) || [];

    if (!Array.isArray(zones)) {
      return { isValid: false, message: "No delivery zones configured" };
    }

    // Simple point-in-polygon check (simplified)
    const validZone = zones.find((zone: DeliveryZone) => {
      if (!zone.polygon || !Array.isArray(zone.polygon)) return false;
      // Basic validation - in production use proper geospatial library
      return zone.isActive !== false;
    });

    return {
      isValid: !!validZone,
      zone: validZone,
    };
  }

  async getDeliveryFee(id: string, location?: { lat: number; lng: number }) {
    const restaurant = await this.findOne(id);
    return {
      baseFee: restaurant.deliveryFee,
      freeDeliveryThreshold: restaurant.freeDeliveryThreshold,
      estimatedFee: restaurant.deliveryFee,
    };
  }

  async calculateDeliveryFee(
    id: string,
    data: { lat: number; lng: number; orderAmount: number },
  ) {
    const restaurant = await this.findOne(id);
    const fee = restaurant.deliveryFee || 2.5;

    // Check free delivery threshold
    if (
      restaurant.freeDeliveryThreshold &&
      data.orderAmount >= restaurant.freeDeliveryThreshold
    ) {
      return { fee: 0, isFree: true };
    }

    // Distance-based calculation (simplified)
    // In production, use actual distance calculation
    return {
      fee,
      isFree: false,
      breakdown: {
        baseFee: fee,
        distanceFee: 0,
        total: fee,
      },
    };
  }

  async getMinimumOrder(id: string) {
    const restaurant = await this.findOne(id);
    return {
      minimumOrder: restaurant.minOrderAmount,
    };
  }

  async updateMinimumOrder(id: string, amount: number) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { minOrderAmount: amount },
    });
  }

  async validateMinimumOrder(id: string, orderAmount: number) {
    const restaurant = await this.findOne(id);
    return {
      isValid: orderAmount >= restaurant.minOrderAmount,
      minimumOrder: restaurant.minOrderAmount,
      currentAmount: orderAmount,
      difference: Math.max(0, restaurant.minOrderAmount - orderAmount),
    };
  }

  async getCapacity(id: string) {
    const restaurant = await this.findOne(id);
    const settings = (restaurant.settings as RestaurantSettings) || {};
    return {
      currentCapacity: settings?.currentCapacity || 0,
      maxCapacity: settings?.maxCapacity || 100,
      availableCapacity:
        (settings?.maxCapacity || 100) - (settings?.currentCapacity || 0),
    };
  }

  async getCurrentCapacity(id: string) {
    // Count active orders for this restaurant
    const activeOrders = await this.prisma.order.count({
      where: {
        restaurantId: id,
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING", "READY"],
        },
      },
    });

    const restaurant = await this.findOne(id);
    const settings = (restaurant.settings as RestaurantSettings) || {};
    const maxCapacity = settings?.maxCapacity || 100;

    return {
      currentCapacity: activeOrders,
      maxCapacity,
      availableCapacity: Math.max(0, maxCapacity - activeOrders),
      isAtCapacity: activeOrders >= maxCapacity,
    };
  }

  async updateCapacity(
    id: string,
    data: { maxCapacity: number; currentCapacity?: number },
  ) {
    const restaurant = await this.findOne(id);
    const settings = (restaurant.settings as RestaurantSettings) || {};

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        settings: {
          ...settings,
          maxCapacity: data.maxCapacity,
          currentCapacity: data.currentCapacity ?? settings.currentCapacity,
        } as any,
      },
    });
  }

  async reserveCapacity(id: string, amount: number = 1) {
    const current = await this.getCurrentCapacity(id);

    if (current.availableCapacity < amount) {
      throw new BadRequestException(
        `Insufficient capacity. Available: ${current.availableCapacity}, Requested: ${amount}`,
      );
    }

    const restaurant = await this.findOne(id);
    const settings = (restaurant.settings as RestaurantSettings) || {};

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        settings: {
          ...settings,
          currentCapacity: (Number(settings.currentCapacity) || 0) + amount,
        } as any,
      },
    });
  }

  async getQueueStatus(id: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId: id,
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING"],
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            dish: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    // Calculate estimated wait time more accurately
    let estimatedWaitTime = 0;
    orders.forEach((order, index) => {
      // Base time for preparation + time already in queue
      const baseTime = order.items.length * 5; // 5 minutes per item
      const queuePositionTime = index * 3; // 3 minutes per position ahead
      const orderWaitTime = Math.max(baseTime + queuePositionTime, 10); // Minimum 10 minutes

      if (index < 10) {
        // Only calculate for first 10 orders for accuracy
        estimatedWaitTime += orderWaitTime;
      }
    });

    // Average wait time calculation
    const avgWaitTime =
      orders.length > 0 ? estimatedWaitTime / Math.min(orders.length, 10) : 0;

    // Group orders by status for better overview
    const pendingOrders = orders.filter((o) => o.status === "PENDING");
    const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED");
    const preparingOrders = orders.filter((o) => o.status === "PREPARING");

    return {
      queueLength: orders.length,
      estimatedWaitTime: Math.round(avgWaitTime),
      breakdown: {
        pending: pendingOrders.length,
        confirmed: confirmedOrders.length,
        preparing: preparingOrders.length,
      },
      nextOrderReadyIn:
        preparingOrders.length > 0
          ? Math.round(avgWaitTime * 0.3)
          : Math.round(avgWaitTime * 0.7),
      orders: orders.slice(0, 5).map((order, index) => ({
        // Only return first 5 for privacy
        id: order.id,
        customerName: order.customer.name || "Anonymous",
        itemCount: order.items.length,
        totalAmount: order.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        queuePosition: index + 1,
        status: order.status,
        estimatedReadyTime: Math.round(
          avgWaitTime * ((index + 1) / orders.length),
        ),
        createdAt: order.createdAt,
      })),
      lastUpdated: new Date().toISOString(),
    };
  }

  async joinQueue(id: string, orderId: string, customerId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            dish: true,
          },
        },
      },
    });

    if (!order || order.restaurantId !== id) {
      throw new NotFoundException("Order not found");
    }

    // Verify customer owns the order
    if (customerId && order.customerId !== customerId) {
      throw new NotFoundException("Order not found");
    }

    const queuePosition = await this.getQueuePosition(id, orderId);
    const estimatedWaitTime = await this.getEstimatedWaitTime(id);

    // Calculate more detailed wait time based on order complexity
    const orderComplexity = order.items.reduce((complexity, item) => {
      // More complex dishes take longer
      const dishName = item.dish.name.toLowerCase();
      if (dishName.includes("pizza") || dishName.includes("pasta"))
        complexity += 2;
      else if (dishName.includes("burger") || dishName.includes("sandwich"))
        complexity += 1;
      else complexity += 1.5;

      return complexity * item.quantity;
    }, 0);

    const adjustedWaitTime = Math.round(
      estimatedWaitTime * (orderComplexity / order.items.length),
    );

    // Notify customer of queue position (would integrate with notification system)
    // await this.notificationService.notifyQueuePosition(order.customerId, {
    //   restaurantId: id,
    //   orderId,
    //   queuePosition,
    //   estimatedWaitTime: adjustedWaitTime,
    // });

    return {
      orderId,
      queuePosition,
      estimatedWaitTime: adjustedWaitTime,
      orderComplexity: Math.round(orderComplexity * 10) / 10,
      status: order.status,
      joinedAt: order.createdAt,
      expectedReadyTime: new Date(
        Date.now() + adjustedWaitTime * 60 * 1000,
      ).toISOString(),
      notifications: {
        sms: true,
        push: true,
        email: false,
      },
    };
  }

  private async getQueuePosition(
    restaurantId: string,
    orderId: string,
  ): Promise<number> {
    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING"],
        },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const position = orders.findIndex((o) => o.id === orderId);
    return position >= 0 ? position + 1 : -1;
  }

  private async getEstimatedWaitTime(restaurantId: string): Promise<number> {
    const queueStatus = await this.getQueueStatus(restaurantId);
    return queueStatus.estimatedWaitTime;
  }

  async getEstimatedDeliveryTime(
    id: string,
    location?: { lat: number; lng: number },
  ) {
    const restaurant = await this.findOne(id);
    return {
      estimatedTime: restaurant.estimatedDeliveryTime || 30,
      unit: "minutes",
    };
  }

  async getAnalytics(id: string, period: string = "week") {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId: id,
        createdAt: { gte: startDate },
      },
      include: {
        items: true,
      },
    });

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      period,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      ordersByStatus: this.groupBy(orders, "status"),
      topDishes: this.getTopDishes(orders),
    };
  }

  async getPerformance(id: string) {
    const restaurant = await this.findOne(id);
    const orders = await this.prisma.order.findMany({
      where: { restaurantId: id },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    return {
      rating: restaurant.rating,
      totalOrders: restaurant.totalOrders,
      avgPrepTime: restaurant.avgPrepTime,
      recentOrders: orders.length,
      completionRate: this.calculateCompletionRate(orders),
    };
  }

  async getRatingsSummary(id: string) {
    const reviews = await this.prisma.review.findMany({
      where: { restaurantId: id },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        distribution: {},
      };
    }

    const distribution = reviews.reduce(
      (acc, review) => {
        acc[review.rating] = (acc[review.rating] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    const average =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    return {
      average: Math.round(average * 10) / 10,
      count: reviews.length,
      distribution,
    };
  }

  private groupBy<T extends Record<string, unknown>>(
    array: T[],
    key: string,
  ): Record<string, number> {
    return array.reduce(
      (result, item) => {
        const group = String(item[key] || "unknown");
        result[group] = (result[group] || 0) + 1;
        return result;
      },
      {} as Record<string, number>,
    );
  }

  private getTopDishes(orders: OrderWithItems[]) {
    const dishCounts: Record<string, number> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        dishCounts[item.dishId] =
          (dishCounts[item.dishId] || 0) + item.quantity;
      });
    });

    return Object.entries(dishCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([dishId, count]) => ({ dishId, count }));
  }

  private calculateCompletionRate(orders: OrderWithItems[]): number {
    if (orders.length === 0) return 0;
    const completed = orders.filter((o) => o.status === "DELIVERED").length;
    return Math.round((completed / orders.length) * 100);
  }

  async getReports(
    restaurantId: string,
    range: string = "30days",
    type: string = "overview",
  ) {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
      include: {
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                category: true,
                price: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const dishes = await this.prisma.dish.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
      },
    });

    // Revenue data
    const dailyRevenue = this.groupRevenueByDay(orders);
    const weeklyRevenue = this.groupRevenueByWeek(orders);
    const monthlyRevenue = this.groupRevenueByMonth(orders);

    // Orders data
    const ordersByStatus = this.groupOrdersByStatus(orders);
    const ordersByTime = this.groupOrdersByHour(orders);

    // Dishes data
    const topSellingDishes = this.getTopSellingDishes(orders, dishes);
    const categoryBreakdown = this.getCategoryBreakdown(orders, dishes);

    // Customers data
    const customerData = this.getCustomerData(orders);

    // Locations data (if multi-location)
    const locationsData = await this.getLocationsData(restaurantId, startDate);

    return {
      revenue: {
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
      },
      orders: {
        byStatus: ordersByStatus,
        byTime: ordersByTime,
      },
      dishes: {
        topSelling: topSellingDishes,
        categoryBreakdown: categoryBreakdown,
      },
      customers: customerData,
      locations: locationsData,
    };
  }

  private groupRevenueByDay(orders: OrderWithItems[]) {
    const grouped = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status === "DELIVERED") {
        const date = new Date(order.createdAt).toISOString().split("T")[0];
        grouped.set(date, (grouped.get(date) || 0) + order.totalAmount);
      }
    });
    return Array.from(grouped.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private groupRevenueByWeek(orders: OrderWithItems[]) {
    const grouped = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status === "DELIVERED") {
        const date = new Date(order.createdAt);
        const weekStart = new Date(
          date.setDate(date.getDate() - date.getDay()),
        );
        const weekKey = weekStart.toISOString().split("T")[0];
        grouped.set(weekKey, (grouped.get(weekKey) || 0) + order.totalAmount);
      }
    });
    return Array.from(grouped.entries())
      .map(([week, revenue]) => ({ week, revenue }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private groupRevenueByMonth(orders: OrderWithItems[]) {
    const grouped = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status === "DELIVERED") {
        const date = new Date(order.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        grouped.set(monthKey, (grouped.get(monthKey) || 0) + order.totalAmount);
      }
    });
    return Array.from(grouped.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private groupOrdersByStatus(orders: OrderWithItems[]) {
    const grouped = new Map<string, number>();
    orders.forEach((order) => {
      grouped.set(order.status, (grouped.get(order.status) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  }

  private groupOrdersByHour(orders: OrderWithItems[]) {
    const grouped = new Map<number, number>();
    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      grouped.set(hour, (grouped.get(hour) || 0) + 1);
    });
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: grouped.get(hour) || 0,
    }));
  }

  private getTopSellingDishes(orders: OrderWithItems[], dishes: DishData[]) {
    const dishCounts = new Map<string, { quantity: number; revenue: number }>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const dishId = item.dishId;
        const price = item.price || item.dish?.price || 0;
        const existing = dishCounts.get(dishId) || { quantity: 0, revenue: 0 };
        dishCounts.set(dishId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + price * item.quantity,
        });
      });
    });

    return Array.from(dishCounts.entries())
      .map(([dishId, data]) => {
        const dish = dishes.find((d) => d.id === dishId);
        return {
          name: dish?.name || "Unknown",
          quantity: data.quantity,
          revenue: data.revenue,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }

  private getCategoryBreakdown(orders: OrderWithItems[], dishes: DishData[]) {
    const categoryRevenue = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status === "DELIVERED") {
        order.items.forEach((item) => {
          const dish = dishes.find((d) => d.id === item.dishId);
          const category = dish?.category || "Other";
          categoryRevenue.set(
            category,
            (categoryRevenue.get(category) || 0) + item.price * item.quantity,
          );
        });
      }
    });
    return Array.from(categoryRevenue.entries()).map(([category, revenue]) => ({
      category,
      revenue,
    }));
  }

  private getCustomerData(orders: OrderWithItems[]) {
    // MVP: Simplified customer data - would need customer info from orders
    const topCustomers: Array<{
      name: string;
      orders: number;
      revenue: number;
    }> = [];

    // Simple new vs returning logic (first order in period = new)
    const firstOrderDates = new Map<string, Date>();
    orders.forEach((order) => {
      const customerId = order.customerId;
      const orderDate = new Date(order.createdAt);
      const existing = firstOrderDates.get(customerId);
      if (!existing || orderDate < existing) {
        firstOrderDates.set(customerId, orderDate);
      }
    });

    const periodStart =
      orders.length > 0
        ? new Date(
            Math.min(...orders.map((o) => new Date(o.createdAt).getTime())),
          )
        : new Date();

    let newCustomers = 0;
    let returningCustomers = 0;
    firstOrderDates.forEach((firstDate) => {
      if (firstDate >= periodStart) {
        newCustomers++;
      } else {
        returningCustomers++;
      }
    });

    return {
      newVsReturning: {
        new: newCustomers,
        returning: returningCustomers,
      },
      topCustomers,
    };
  }

  private async getLocationsData(
    restaurantId: string,
    startDate: Date,
  ): Promise<
    Array<{
      location: { id: string; name: string };
      orders: number;
      revenue: number;
    }>
  > {
    // MVP: Simplified implementation
    return [];
  }

  async getLocations(restaurantId: string) {
    const locations =
      (await (
        this.prisma as unknown as PrismaRestaurantLocation
      ).restaurantLocation?.findMany?.({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
      })) || [];

    // Calculate stats for each location
    return Promise.all(
      locations.map(async (location) => {
        const orders = await this.prisma.order.findMany({
          where: {
            restaurantId,
            // In production, filter by locationId when that field exists
          },
        });

        const totalOrders = orders.length;
        const totalRevenue = orders
          .filter((o) => o.status === "DELIVERED")
          .reduce((sum, o) => sum + o.totalAmount, 0);

        return {
          id: location.id,
          name: location.name,
          address: location.address,
          city: location.city,
          postalCode: location.postalCode,
          country: location.country,
          phone: location.phone,
          email: location.email,
          isActive: location.isActive,
          operatingHours: location.operatingHours,
          managerId: location.managerId,
          managerName: location.managerName,
          totalOrders,
          totalRevenue,
        };
      }),
    );
  }

  async createLocation(
    restaurantId: string,
    data: {
      name: string;
      address: string;
      city: string;
      postalCode: string;
      country: string;
      phone: string;
      email: string;
      isActive?: boolean;
    },
  ) {
    // Security: Sanitize user input to prevent XSS
    const sanitizedName = SanitizationUtil.sanitizeString(data.name, false);
    const sanitizedAddress = SanitizationUtil.sanitizeString(
      data.address,
      false,
    );
    const sanitizedCity = SanitizationUtil.sanitizeString(data.city, false);
    const sanitizedPostalCode = SanitizationUtil.sanitizeString(
      data.postalCode,
      false,
    );
    const sanitizedCountry = SanitizationUtil.sanitizeString(
      data.country,
      false,
    );
    const sanitizedPhone = SanitizationUtil.sanitizeString(data.phone, false);
    const sanitizedEmail = SanitizationUtil.sanitizeString(data.email, false);

    return (
      this.prisma as unknown as PrismaRestaurantLocation
    ).restaurantLocation?.create?.({
      data: {
        restaurantId,
        name: sanitizedName,
        address: sanitizedAddress,
        city: sanitizedCity,
        postalCode: sanitizedPostalCode,
        country: sanitizedCountry,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        isActive: data.isActive ?? true,
      },
    });
  }

  async toggleLocationStatus(restaurantId: string, locationId: string) {
    const location = await (
      this.prisma as unknown as PrismaRestaurantLocation
    ).restaurantLocation?.findFirst?.({
      where: { id: locationId, restaurantId },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    return (
      this.prisma as unknown as PrismaRestaurantLocation
    ).restaurantLocation?.update?.({
      where: { id: locationId },
      data: { isActive: !location.isActive },
    });
  }

  async deleteLocation(restaurantId: string, locationId: string) {
    const location = await (
      this.prisma as unknown as PrismaRestaurantLocation
    ).restaurantLocation?.findFirst?.({
      where: { id: locationId, restaurantId },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    return (
      this.prisma as unknown as PrismaRestaurantLocation
    ).restaurantLocation?.delete?.({
      where: { id: locationId },
    });
  }

  /**
   * AR Menu: generate lightweight 3D menu metadata for a restaurant.
   * The actual 3D assets would be handled by a dedicated asset pipeline.
   */
  async generateARMenu(restaurantId: string) {
    const restaurant = await this.findOne(restaurantId);
    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    const dishes = await this.prisma.dish.findMany({
      where: { restaurantId },
      select: { id: true, name: true, imageUrl: true, price: true },
      take: 25,
      orderBy: { createdAt: "desc" as "asc" | "desc" },
    });

    return {
      restaurantId,
      generatedAt: new Date().toISOString(),
      status: "generated",
      models: dishes.map((dish) => ({
        dishId: dish.id,
        name: dish.name,
        thumbnail: dish.imageUrl,
        // Placeholder URLs for AR assets
        glbUrl: `/assets/ar/${dish.id}.glb`,
        usdzUrl: `/assets/ar/${dish.id}.usdz`,
        price: dish.price,
      })),
    };
  }

  /**
   * Return cached/generated AR models for a restaurant.
   */
  async getARModels(restaurantId: string) {
    // In production this would read from object storage/CDN
    const restaurant = await this.findOne(restaurantId);
    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    const dishes = await this.prisma.dish.findMany({
      where: { restaurantId },
      select: { id: true, name: true, imageUrl: true, price: true },
      take: 50,
    });

    return dishes.map((dish) => ({
      dishId: dish.id,
      name: dish.name,
      thumbnail: dish.imageUrl,
      glbUrl: `/assets/ar/${dish.id}.glb`,
      usdzUrl: `/assets/ar/${dish.id}.usdz`,
      price: dish.price,
    }));
  }

  /**
   * Recipe integration: provide recipe metadata for restaurant dishes.
   */
  async getRecipes(restaurantId: string) {
    const restaurant = await this.findOne(restaurantId);
    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    const dishes = await this.prisma.dish.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        metadata: true,
      },
      take: 50,
    });

    return dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      summary: dish.description,
      imageUrl: dish.imageUrl,
      ingredients:
        ((dish.metadata as Record<string, unknown>)?.ingredients as string[]) ||
        [],
      steps:
        ((dish.metadata as Record<string, unknown>)?.steps as string[]) || [],
      calories: (dish.metadata as Record<string, unknown>)?.calories as
        | number
        | undefined,
      price: dish.price,
    }));
  }
}
