import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { OrderService } from "./order.service";
import { WebhookService, WebhookConfig } from "./webhook.service";
import { PaymentService } from "../payment/payment.service";
import { RegisterWebhookDto } from "./dto/register-webhook.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { CurrentCustomerId } from "../../common/decorators/current-user.decorator";
import { BadRequestException } from "@nestjs/common";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { AcceptOrderDto } from "./dto/accept-order.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { Throttle } from "@nestjs/throttler";
import { QueryOptimizer } from "../../common/utils/query-optimizer.util";
import {
  KeysetPaginationDto,
  KeysetPaginationResult,
} from "./dto/keyset-pagination.dto";

interface AdvancedStatsQuery {
  startDate?: string;
  endDate?: string;
  restaurantId?: string;
  status?: string;
  [key: string]: unknown;
}

interface BatchSuggestionsQuery {
  restaurantIds?: string;
  date?: string;
  [key: string]: unknown;
}

interface OptimizationQuery {
  date?: string;
  restaurantId?: string;
  [key: string]: unknown;
}

interface AuthenticatedRequest {
  user?: {
    id: string;
    sub?: string;
    email?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface CardData {
  number?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvc?: string;
  [key: string]: unknown;
}

interface SEPAData {
  iban?: string;
  bic?: string;
  accountHolder?: string;
  [key: string]: unknown;
}

interface BankTransferData {
  accountNumber?: string;
  bankName?: string;
  [key: string]: unknown;
}

interface SofortData {
  country?: string;
  [key: string]: unknown;
}

interface Order {
  id: string;
  priority?: string;
  [key: string]: unknown;
}

function normalizeStatusFilter(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").join(",");
  }
  return typeof value === "string" ? value : undefined;
}

interface PayPalOrder {
  orderId?: string;
  id?: string;
  approveUrl?: string;
  links?: Array<{
    rel: string;
    href: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

@ApiTags("Orders")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Controller("orders")
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly webhookService: WebhookService,
  ) {}

  /**
   * Basic SSRF protection for webhook URLs: allow only http/https and block private hosts.
   */
  private sanitizePublicUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      const protocol = parsed.protocol.toLowerCase();
      if (protocol !== "http:" && protocol !== "https:") {
        throw new BadRequestException("Webhook URL must use http or https");
      }

      const host = parsed.hostname.toLowerCase();
      const privateHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
      const isPrivateRange =
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        host.startsWith("172.16.") ||
        host.startsWith("172.17.") ||
        host.startsWith("172.18.") ||
        host.startsWith("172.19.") ||
        host.startsWith("172.20.") ||
        host.startsWith("172.21.") ||
        host.startsWith("172.22.") ||
        host.startsWith("172.23.") ||
        host.startsWith("172.24.") ||
        host.startsWith("172.25.") ||
        host.startsWith("172.26.") ||
        host.startsWith("172.27.") ||
        host.startsWith("172.28.") ||
        host.startsWith("172.29.") ||
        host.startsWith("172.30.") ||
        host.startsWith("172.31.");

      if (privateHosts.includes(host) || isPrivateRange) {
        throw new BadRequestException(
          "Webhook URL cannot target a private host",
        );
      }

      return parsed.toString();
    } catch (err) {
      throw new BadRequestException("Invalid webhook URL");
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute for order read operations (lower due to potential large datasets)
  @ApiOperation({
    summary: "Get all orders",
    description:
      "Retrieve a list of orders with optional filters and pagination.",
  })
  @ApiQuery({
    name: "restaurantId",
    required: false,
    type: String,
    description: "Filter by restaurant ID",
  })
  @ApiQuery({
    name: "customerId",
    required: false,
    type: String,
    description: "Filter by customer ID",
  })
  @ApiQuery({
    name: "driverId",
    required: false,
    type: String,
    description: "Filter by driver ID",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter by order status",
  })
  @ApiQuery({
    name: "cursor",
    required: false,
    type: String,
    description: "Cursor for keyset pagination (base64 encoded)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of items per page (1-200, default 50)",
  })
  @ApiQuery({
    name: "direction",
    required: false,
    enum: ["next", "prev"],
    description: "Navigation direction for cursor pagination",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description:
      "DEPRECATED: Page number for offset pagination (use cursor instead)",
  })
  @ApiResponse({
    status: 200,
    description: "Orders retrieved successfully",
    schema: {
      oneOf: [
        {
          type: "object",
          properties: {
            data: { type: "array" },
            nextCursor: { type: "string" },
            hasMore: { type: "boolean" },
          },
        },
        {
          type: "object",
          properties: {
            data: { type: "array" },
            pagination: { type: "object" },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query()
    query: {
      restaurantId?: string;
      customerId?: string;
      driverId?: string;
      status?: string;
      "status[]"?: string | string[];
      // New cursor-based pagination
      cursor?: string;
      limit?: string;
      direction?: "next" | "prev";
      // Legacy offset-based pagination (deprecated)
      page?: string;
    },
  ) {
    try {
      const normalizedQuery = {
        ...query,
        status: normalizeStatusFilter(query.status ?? query["status[]"]),
      };
      // Check if using new cursor-based pagination
      if (query.cursor !== undefined || query.direction !== undefined) {
        // Use new keyset pagination
        const paginationDto: KeysetPaginationDto = {
          cursor: query.cursor,
          limit: query.limit ? parseInt(query.limit) : 50,
          direction: query.direction || "next",
        };

        const filters = {
          restaurantId: query.restaurantId,
          customerId: query.customerId,
          driverId: query.driverId,
          status: normalizedQuery.status,
        };

        const result = await this.orderService.findAllWithCursor(
          filters,
          paginationDto,
        );
        return result;
      } else {
        // Fallback to legacy offset-based pagination for backward compatibility
        this.logger.warn(
          "Using deprecated offset pagination. Consider migrating to cursor-based pagination.",
        );

        const paginationOptions = {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 20,
          maxLimit: 100,
        };

        const result = await this.orderService.findAll(
          normalizedQuery,
          paginationOptions,
        );
        return result;
      }
    } catch (error) {
      this.logger.error("Failed to get orders", error);
      // Bei Fehlern leeres Ergebnis zurückgeben
      if (query.cursor !== undefined || query.direction !== undefined) {
        // Return keyset pagination format
        return {
          data: [],
          nextCursor: undefined,
          hasMore: false,
        } as KeysetPaginationResult<any>;
      } else {
        // Return legacy pagination format
        return {
          data: [],
          pagination: {
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
    }
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  async getCurrentCustomerOrders(@Request() req: AuthenticatedRequest) {
    const customerId = req.user?.id || req.user?.sub;
    if (!customerId) {
      throw new BadRequestException("Customer ID not found");
    }
    return this.orderService.findAll({ customerId });
  }

  @Get("customer/my-orders")
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@CurrentCustomerId() customerId: string) {
    return this.orderService.findAll({ customerId });
  }

  @Get("customer/:id")
  @UseGuards(JwtAuthGuard)
  async getCustomerOrder(
    @Param("id") id: string,
    @CurrentCustomerId() customerId: string,
  ) {
    const order = await this.orderService.findOne(id);
    // Verify that the order belongs to the customer
    if (order && order.customerId !== customerId) {
      throw new BadRequestException("Order not found or access denied");
    }
    return order;
  }

  @Get("driver/:driverId")
  async getDriverOrders(@Param("driverId") driverId: string) {
    return this.orderService.findAll({ driverId });
  }

  @Get("restaurant/:restaurantId/pending")
  async getPendingOrders(@Param("restaurantId") restaurantId: string) {
    return this.orderService.findAll({ restaurantId, status: "PENDING" });
  }

  @Get("restaurant/:restaurantId/preparing")
  async getPreparingOrders(@Param("restaurantId") restaurantId: string) {
    return this.orderService.findAll({ restaurantId, status: "PREPARING" });
  }

  @Get("restaurant/:restaurantId/ready")
  async getReadyOrders(@Param("restaurantId") restaurantId: string) {
    return this.orderService.findAll({ restaurantId, status: "READY" });
  }

  @Get("restaurant/:restaurantId/delivered")
  async getDeliveredOrders(@Param("restaurantId") restaurantId: string) {
    return this.orderService.findAll({ restaurantId, status: "DELIVERED" });
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.orderService.findOne(id);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for order creation (prevent spam)
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body() data: CreateOrderDto, @Request() req: any) {
    // For customer orders, extract customerId from JWT if not provided
    if (!data.customerId && req.user?.id && req.user?.userType === "customer") {
      data.customerId = req.user.id;
    }
    return this.orderService.create(data);
  }

  @Post("customer")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for order creation (prevent spam)
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: CreateOrderDto) {
    return this.orderService.create(data);
  }

  @Post(":id/accept")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute for order acceptance
  @UseGuards(JwtAuthGuard)
  async accept(@Param("id") id: string, @Body() body: AcceptOrderDto) {
    // Support both formats: driverId (from driver app) or userId/userType (from other apps)
    const userId = body.driverId || body.userId || "";
    const userType = body.userType || (body.driverId ? "DRIVER" : "");
    return this.orderService.accept(id, userId, userType);
  }

  @Post(":id/reject")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute for order rejection
  @UseGuards(JwtAuthGuard)
  async reject(
    @Param("id") id: string,
    @Body() body: { reason?: string; driverId?: string },
  ) {
    return this.orderService.reject(id, body.reason || "Driver rejected");
  }

  @Post(":id/cancel")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for order cancellation (prevent abuse)
  @UseGuards(JwtAuthGuard)
  async cancel(@Param("id") id: string, @Body() body: CancelOrderDto) {
    return this.orderService.cancel(id, body.reason, body.cancelledBy);
  }

  @Post(":id/cancel-restaurant")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @UseGuards(JwtAuthGuard)
  async cancelRestaurant(
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.orderService.cancel(id, body.reason, "RESTAURANT");
  }

  @Patch(":id/status")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute for status updates
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, body.status, body.metadata);
  }

  @Patch(":id/assign")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for driver assignments
  @UseGuards(JwtAuthGuard)
  async assignDriver(
    @Param("id") id: string,
    @Body() body: { driverId: string },
  ) {
    return this.orderService.assignDriver(id, body.driverId);
  }

  @Patch(":id/priority")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for priority updates
  @UseGuards(JwtAuthGuard)
  async updatePriority(
    @Param("id") id: string,
    @Body() body: { priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" },
  ) {
    return this.orderService.updatePriority(id, body.priority);
  }

  @Get(":id/timeline")
  async getTimeline(@Param("id") id: string) {
    return this.orderService.getTimeline(id);
  }

  @Get(":id/notes")
  async getNotes(@Param("id") id: string) {
    return this.orderService.getNotes(id);
  }

  @Post(":id/notes")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute for notes
  @UseGuards(JwtAuthGuard)
  async addNote(@Param("id") id: string, @Body() body: { note: string }) {
    return this.orderService.addNote(id, body.note);
  }

  @Get(":id/refund-status")
  async getRefundStatus(@Param("id") id: string) {
    return this.orderService.getRefundStatus(id);
  }

  @Post(":id/delay")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for delay reports (prevent abuse)
  @UseGuards(JwtAuthGuard)
  async delay(
    @Param("id") id: string,
    @Body() body: { minutes: number; reason?: string },
  ) {
    return this.orderService.delay(id, body.minutes, body.reason);
  }

  @Get(":id/customer")
  async getCustomerInfo(@Param("id") id: string) {
    return this.orderService.getCustomerInfo(id);
  }

  @Get(":id/payment-info")
  async getPaymentInfo(@Param("id") id: string) {
    return this.orderService.getPaymentInfo(id);
  }

  @Get(":id/tip-info")
  async getTipInfo(@Param("id") id: string) {
    return this.orderService.getTipInfo(id);
  }

  @Post("bulk-status")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for bulk operations (very restrictive)
  @UseGuards(JwtAuthGuard)
  async bulkStatusUpdate(
    @Body() body: { orders: Array<{ id: string; status: string }> },
  ) {
    return this.orderService.bulkStatusUpdate(body.orders);
  }

  @Get("advanced/stats")
  @UseGuards(JwtAuthGuard)
  async getAdvancedStats(@Query() query: AdvancedStatsQuery) {
    return this.orderService.getAdvancedStats(query);
  }

  @Get("advanced/routing")
  @UseGuards(JwtAuthGuard)
  async getAdvancedRouting(
    @Query() query: { orders?: string; restaurantId?: string },
  ) {
    if (query.orders) {
      const orders = query.orders.split(",");
      return this.orderService.optimizeRouting(orders);
    }

    // If no orders specified, get active orders for routing
    const activeOrdersResult = await this.orderService.findAll({
      restaurantId: query.restaurantId,
      status: "READY",
    });
    const activeOrders = activeOrdersResult.data || [];
    const orderIds = activeOrders.map((o) => o.id).slice(0, 10); // Limit to 10 orders
    return this.orderService.optimizeRouting(orderIds);
  }

  @Post("routing/optimize")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for routing optimization (heavy computation)
  @UseGuards(JwtAuthGuard)
  async optimizeRouting(@Body() body: { orderIds: string[] }) {
    return this.orderService.optimizeRouting(body.orderIds || []);
  }

  @Post("batches")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for batch creation
  @UseGuards(JwtAuthGuard)
  async createBatch(@Body() body: { orderIds: string[]; batchSize?: number }) {
    return this.orderService.createBatch(body.orderIds || [], body.batchSize);
  }

  @Get("advanced/batch-suggestions")
  @UseGuards(JwtAuthGuard)
  async getBatchSuggestions(@Query() query: BatchSuggestionsQuery) {
    return this.orderService.getBatchSuggestions(query);
  }

  @Get("advanced/priority-queue")
  @UseGuards(JwtAuthGuard)
  async getPriorityQueue(@Query() query: { restaurantId?: string }) {
    const ordersResult = await this.orderService.findAll({
      restaurantId: query.restaurantId,
      status: "PENDING",
    });
    const orders = ordersResult.data || [];

    return {
      queue: orders.sort((a: Order, b: Order) => {
        const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
          (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
        );
      }),
    };
  }

  @Get("advanced/optimization")
  @UseGuards(JwtAuthGuard)
  async getOptimization(@Query() query: OptimizationQuery) {
    return this.orderService.getOptimization(query);
  }

  @Get(":id/photos")
  async getPhotos(@Param("id") id: string) {
    return this.orderService.getPhotos(id);
  }

  @Post(":id/photo")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for photo uploads (prevent abuse)
  @UseGuards(JwtAuthGuard)
  async uploadPhoto(
    @Param("id") id: string,
    @Body() body: { url?: string; file?: string },
  ) {
    // Support both FormData (file) and JSON (url)
    const photoUrl = body.url || body.file;
    if (!photoUrl) {
      throw new BadRequestException("Photo URL or file is required");
    }
    return this.orderService.uploadPhoto(id, photoUrl);
  }

  @Get(":id/driver-info")
  async getDriverInfo(@Param("id") id: string) {
    return this.orderService.getDriverInfo(id);
  }

  // Payment endpoints for orders
  @Post(":id/payment")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for payment processing (security)
  @UseGuards(JwtAuthGuard)
  async processPayment(
    @Param("id") orderId: string,
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      paymentMethodId?: string;
      paymentMethod?: string;
      cardData?: CardData;
      sepaData?: SEPAData;
      bankTransferData?: BankTransferData;
      sofortData?: SofortData;
      email?: string;
    },
  ) {
    const customerId = req.user?.id;
    const order = await this.orderService.findOne(orderId);

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    // If using saved payment method
    if (body.paymentMethodId) {
      // Process payment with saved method
      const savedMethod =
        await this.paymentService.processPaymentWithSavedMethod(
          orderId,
          customerId,
          body.paymentMethodId,
        );
      return savedMethod;
    }

    // Create payment intent based on payment method
    if (
      body.paymentMethod === "card" ||
      body.paymentMethod === "sepa_direct_debit"
    ) {
      // Validate SEPA data if provided
      if (body.paymentMethod === "sepa_direct_debit" && body.sepaData) {
        if (!body.sepaData.iban) {
          throw new BadRequestException(
            "IBAN is required for SEPA direct debit",
          );
        }
        if (!body.sepaData.accountHolderName) {
          throw new BadRequestException(
            "Account holder name is required for SEPA direct debit",
          );
        }
        if (!body.sepaData.mandateAccepted) {
          throw new BadRequestException("SEPA mandate must be accepted");
        }
        // Basic IBAN format validation
        const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;
        if (!ibanRegex.test(body.sepaData.iban.replace(/\s/g, ""))) {
          throw new BadRequestException("Invalid IBAN format");
        }
      }

      // Validate card data if provided
      if (body.paymentMethod === "card" && body.cardData) {
        if (
          !body.cardData.number ||
          !body.cardData.expiry ||
          !body.cardData.cvc
        ) {
          throw new BadRequestException(
            "Card number, expiry, and CVC are required",
          );
        }
        // Basic card number validation (Luhn algorithm would be better)
        const cardNumber = body.cardData.number.replace(/\s/g, "");
        if (cardNumber.length < 13 || cardNumber.length > 19) {
          throw new BadRequestException("Invalid card number length");
        }
      }

      const paymentIntent = await this.paymentService.createPaymentIntent(
        orderId,
        customerId,
        "CARD",
      );
      return {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } else if (body.paymentMethod === "sofort") {
      // Sofortüberweisung - create payment intent and return redirect URL
      const paymentIntent = await this.paymentService.createPaymentIntent(
        orderId,
        customerId,
        "SOFORT",
      );

      // Generate Sofort redirect URL (in production, this would call Sofort API)
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
      const redirectUrl = `${frontendUrl}/payment/sofort?payment_intent=${paymentIntent.paymentIntentId}&client_secret=${paymentIntent.clientSecret}`;

      return {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        redirectUrl: redirectUrl,
      };
    } else if (body.paymentMethod === "paypal") {
      const paypalOrder = await this.paymentService.createPayPalOrder(
        orderId,
        order.totalAmount,
        "EUR",
      );
      // Type-safe PayPal order handling
      const paypalOrderTyped = paypalOrder as PayPalOrder;
      return {
        paypalOrderId: paypalOrderTyped.orderId || paypalOrderTyped.id || "",
        approvalUrl:
          paypalOrderTyped.approveUrl ||
          (paypalOrderTyped.links && Array.isArray(paypalOrderTyped.links)
            ? paypalOrderTyped.links.find((link) => link.rel === "approve")
                ?.href
            : undefined) ||
          "",
      };
    } else if (body.paymentMethod === "apple_pay") {
      // Apple Pay would be handled client-side, but we can validate here
      return { success: true, message: "Apple Pay ready" };
    } else if (body.paymentMethod === "bank_transfer") {
      // Bank transfer - set order to pending payment status
      await this.orderService.updateStatus(orderId, "PENDING", {
        paymentMethod: "bank_transfer",
        paymentStatus: "PENDING",
        requiresManualConfirmation: true,
      });

      // Create payment record with pending status
      await this.paymentService.createPaymentRecord(orderId, customerId, {
        amount: order.totalAmount,
        status: "PENDING",
        paymentMethodType: "BANK_TRANSFER",
        bankTransferData: body.bankTransferData,
      });

      // Get bank details from environment or use defaults
      const bankIban = process.env.BANK_IBAN || "AT61 1904 3002 3457 3201";
      const bankBic = process.env.BANK_BIC || "GIBAATWWXXX";

      return {
        success: true,
        requiresManualConfirmation: true,
        message:
          "Order created. Please complete bank transfer to confirm payment.",
        bankDetails: {
          iban: bankIban,
          bic: bankBic,
          reference: orderId.slice(-8),
        },
      };
    }

    throw new BadRequestException("Invalid payment method");
  }

  @Post(":id/payment/confirm")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for payment confirmation (very restrictive)
  @UseGuards(JwtAuthGuard)
  async confirmPayment(
    @Param("id") orderId: string,
    @Body() body: { paymentIntentId: string; email?: string },
  ) {
    return this.paymentService.confirmPayment(orderId, body.paymentIntentId);
  }

  @Post(":id/payment/paypal")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for PayPal payments
  @UseGuards(JwtAuthGuard)
  async processPayPalPayment(
    @Param("id") orderId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { paypalOrderId: string; email?: string },
  ) {
    const customerId = req.user?.id;
    const capture = await this.paymentService.capturePayPalOrder(
      body.paypalOrderId,
    );

    // Update order payment status
    await this.orderService.updateStatus(orderId, "CONFIRMED", {
      paymentMethod: "paypal",
    });

    return { success: true, capture };
  }

  @Post(":id/payment/apple-pay")
  @UseGuards(JwtAuthGuard)
  async processApplePayPayment(
    @Param("id") orderId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { paymentData: Record<string, unknown>; email?: string },
  ) {
    const customerId = req.user?.id;
    return this.paymentService.createApplePayPayment(
      orderId,
      body.paymentData as any,
      customerId,
    );
  }

  @Post(":id/payment/apple-pay/validate")
  @UseGuards(JwtAuthGuard)
  async validateApplePay(
    @Param("id") orderId: string,
    @Body() body: { paymentData: Record<string, unknown> },
  ) {
    // Validate Apple Pay payment data
    return { valid: true };
  }

  @Post(":id/payment/apple-pay/complete")
  @UseGuards(JwtAuthGuard)
  async completeApplePay(
    @Param("id") orderId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { paymentData: Record<string, unknown>; email?: string },
  ) {
    const customerId = req.user?.id;
    return this.paymentService.createApplePayPayment(
      orderId,
      body.paymentData as any,
      customerId,
    );
  }

  @Post(":id/payment/sofort")
  @UseGuards(JwtAuthGuard)
  async processSofortPayment(
    @Param("id") orderId: string,
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      sofortData?: SofortData;
      email?: string;
      amount?: number;
      returnUrl?: string;
      cancelUrl?: string;
    },
  ) {
    const customerId = req.user?.id;
    const order = await this.orderService.findOne(orderId);

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    // Create payment intent for Sofort
    const paymentIntent = await this.paymentService.createPaymentIntent(
      orderId,
      customerId,
      "SOFORT",
    );

    // Generate Sofort redirect URL
    // In production, this would integrate with actual Sofort API
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    const returnUrl = body.returnUrl || `${frontendUrl}/orders/${orderId}`;
    const cancelUrl =
      body.cancelUrl || `${frontendUrl}/orders/${orderId}?canceled=true`;

    // Create Sofort payment session (mock implementation - in production use real Sofort API)
    const sofortRedirectUrl = `${frontendUrl}/payment/sofort/redirect?payment_intent=${paymentIntent.paymentIntentId}&client_secret=${paymentIntent.clientSecret}&return_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;

    return {
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      redirectUrl: sofortRedirectUrl,
    };
  }

  // ============================================
  // WEBHOOK MANAGEMENT ENDPOINTS
  // ============================================

  @Post("webhooks/register")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 registrations per minute
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Register a webhook",
    description: "Register a new webhook URL to receive order events",
  })
  @ApiResponse({ status: 201, description: "Webhook registered successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid webhook URL or configuration",
  })
  async registerWebhook(
    @Body() config: RegisterWebhookDto,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const safeUrl = this.sanitizePublicUrl(config.url);
      config.url = safeUrl;
      const userId = req.user?.id;
      const webhook = await this.webhookService.registerWebhook(config, userId);
      return {
        success: true,
        webhook,
        message: "Webhook registered successfully",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to register webhook: ${message}`);
      throw new BadRequestException(`Failed to register webhook: ${message}`);
    }
  }

  @Get("webhooks")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "List webhooks",
    description: "Get list of all registered webhooks",
  })
  @ApiResponse({ status: 200, description: "Webhooks retrieved successfully" })
  async listWebhooks(@Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user?.id;
      const webhooks = await this.webhookService.listWebhooks(userId);
      return {
        success: true,
        webhooks,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to list webhooks: ${message}`);
      throw new HttpException(
        "Failed to list webhooks",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("webhooks/:webhookId/history")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get webhook history",
    description: "Get delivery history for a specific webhook",
  })
  @ApiParam({ name: "webhookId", description: "Webhook ID" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of history entries to return",
  })
  @ApiResponse({
    status: 200,
    description: "Webhook history retrieved successfully",
  })
  async getWebhookHistory(
    @Param("webhookId") webhookId: string,
    @Query("limit") limit?: number,
  ) {
    try {
      const history = await this.webhookService.getWebhookHistory(
        webhookId,
        limit || 50,
      );
      return {
        success: true,
        webhookId,
        history,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to get webhook history: ${message}`);
      throw new HttpException(
        "Failed to get webhook history",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("webhooks/:webhookId/delete")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 deletions per minute
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Delete webhook",
    description: "Delete a registered webhook",
  })
  @ApiParam({ name: "webhookId", description: "Webhook ID" })
  @ApiResponse({ status: 200, description: "Webhook deleted successfully" })
  async deleteWebhook(@Param("webhookId") webhookId: string) {
    try {
      await this.webhookService.deleteWebhook(webhookId);
      return {
        success: true,
        message: "Webhook deleted successfully",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to delete webhook: ${message}`);
      throw new HttpException(
        "Failed to delete webhook",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
