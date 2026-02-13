import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { MLAssignmentService, AssignmentResult } from "./ml-assignment.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AssignmentHistoryWhereFilter {
  algorithm?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  [key: string]: unknown;
}

export interface TrainingData {
  orders?: Array<Record<string, unknown>>;
  drivers?: Array<Record<string, unknown>>;
  outcomes?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

interface OrderData {
  id: string;
  restaurantLocation?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  [key: string]: unknown;
}

interface AssignmentConstraints {
  maxDistance?: number;
  minRating?: number;
  [key: string]: unknown;
}

interface AssignmentRequest {
  orderId: string;
  algorithm?: "ml" | "genetic" | "greedy" | "hungarian";
  constraints?: {
    maxDistance?: number;
    minRating?: number;
    prioritizeHighValue?: boolean;
    considerTraffic?: boolean;
  };
}

interface BatchAssignmentRequest {
  orders: Array<{
    id: string;
    restaurantLocation: { lat: number; lng: number };
    customerLocation: { lat: number; lng: number };
    priority?: string;
    estimatedValue?: number;
    requiredVehicleType?: string;
    specialRequirements?: string[];
    estimatedPreparationTime?: number;
  }>;
  constraints?: {
    maxAssignmentsPerDriver?: number;
    prioritizeHighValue?: boolean;
    balanceWorkload?: boolean;
    considerTraffic?: boolean;
    region?: string;
  };
  algorithm?: "ml" | "genetic" | "greedy" | "multi_objective";
}

interface ABTestRequest {
  name: string;
  algorithms: string[];
  duration: number; // hours
  sampleSize: number;
  region?: string;
}

@Controller("admin/ml-assignment")
@UseGuards(JwtAuthGuard)
export class MLAssignmentController {
  private readonly logger = new Logger(MLAssignmentController.name);

  constructor(private readonly mlAssignmentService: MLAssignmentService) {}

  // ============================================
  // SINGLE ORDER ASSIGNMENT
  // ============================================

  @Post("assign")
  async assignOrder(@Body() assignmentRequest: AssignmentRequest) {
    try {
      const { orderId, algorithm = "ml", constraints } = assignmentRequest;

      // Get order details from database
      const order = await this.getOrderDetails(orderId);
      if (!order) {
        throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
      }

      // Get available drivers
      const availableDrivers = await this.getAvailableDrivers(
        order,
        constraints,
      );

      if (availableDrivers.length === 0) {
        throw new HttpException(
          "No available drivers found",
          HttpStatus.BAD_REQUEST,
        );
      }

      // Perform assignment based on algorithm
      let assignment;
      switch (algorithm) {
        case "ml":
          assignment = await this.mlAssignmentService.assignOrder(
            order,
            availableDrivers,
          );
          break;
        case "genetic":
          assignment =
            await this.mlAssignmentService.geneticAlgorithmAssignment(
              order,
              availableDrivers,
            );
          break;
        case "greedy":
          assignment = await this.mlAssignmentService.greedyAssignment(
            order,
            availableDrivers,
          );
          break;
        default:
          assignment = await this.mlAssignmentService.assignOrder(
            order,
            availableDrivers,
          );
      }

      return {
        success: true,
        assignment,
        algorithm,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error("Failed to assign order", error);
      throw new HttpException(
        "Failed to assign order",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // BATCH ORDER ASSIGNMENT
  // ============================================

  @Post("assign-batch")
  async assignOrderBatch(@Body() batchRequest: BatchAssignmentRequest) {
    try {
      const {
        orders,
        constraints = {},
        algorithm = "multi_objective",
      } = batchRequest;

      // Convert orders to OrderData format
      const orderData = orders.map((order) => ({
        id: order.id,
        restaurantLocation: order.restaurantLocation,
        customerLocation: order.customerLocation,
        priority: order.priority || "normal",
        estimatedValue: order.estimatedValue || 0,
        requiredVehicleType: order.requiredVehicleType,
        specialRequirements: order.specialRequirements || [],
        timeWindow: undefined, // Would be calculated
        estimatedPreparationTime: order.estimatedPreparationTime || 15,
      }));

      // Get available drivers for the region
      const availableDrivers = await this.getAvailableDriversForBatch(
        constraints.region,
      );

      const batchData = {
        orders: orderData,
        availableDrivers,
        constraints,
      };

      const assignments =
        await this.mlAssignmentService.assignOrderBatch(batchData);

      return {
        success: true,
        assignments,
        algorithm,
        totalOrders: orders.length,
        totalAssignments: assignments.length,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error("Failed to assign order batch", error);
      throw new HttpException(
        "Failed to assign order batch",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // ASSIGNMENT HISTORY & ANALYTICS
  // ============================================

  @Get("history")
  async getAssignmentHistory(
    @Query("limit") limit = 50,
    @Query("algorithm") algorithm?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    try {
      const where: AssignmentHistoryWhereFilter = {};

      if (algorithm) where.algorithm = algorithm;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const history = await this.mlAssignmentService.getAssignmentHistory(
        where as any,
        Number(limit),
      );

      return {
        history,
        total: history.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get assignment history", error);
      throw new HttpException(
        "Failed to get assignment history",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("analytics")
  async getAssignmentAnalytics(
    @Query("period") period = "day",
    @Query("algorithm") algorithm?: string,
    @Query("region") region?: string,
  ) {
    try {
      const analytics = await this.mlAssignmentService.getAssignmentAnalytics(
        period,
        algorithm,
        region,
      );

      return {
        analytics,
        period,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get assignment analytics", error);
      throw new HttpException(
        "Failed to get assignment analytics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance")
  async getAlgorithmPerformance(
    @Query("algorithms") algorithms?: string[],
    @Query("period") period = "week",
  ) {
    try {
      const performance =
        await this.mlAssignmentService.compareAlgorithmPerformance(
          algorithms || ["ml", "genetic", "greedy"],
          period,
        );

      return {
        performance,
        period,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get algorithm performance", error);
      throw new HttpException(
        "Failed to get algorithm performance",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // A/B TESTING
  // ============================================

  @Post("ab-test")
  async startABTest(@Body() testRequest: ABTestRequest) {
    try {
      const test = await this.mlAssignmentService.runABTest(testRequest);

      return {
        success: true,
        test,
        message: "A/B test started successfully",
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to start A/B test", error);
      throw new HttpException(
        "Failed to start A/B test",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("ab-test/:id")
  async getABTestResults(@Param("id") testId: string) {
    try {
      const test = await this.mlAssignmentService.getABTestResults(testId);

      if (!test) {
        throw new HttpException("A/B test not found", HttpStatus.NOT_FOUND);
      }

      return {
        test,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get A/B test results ${testId}`, error);
      throw new HttpException(
        "Failed to get A/B test results",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("ab-tests")
  async getABTests(
    @Query("status") status?: string,
    @Query("limit") limit = 20,
  ) {
    try {
      const tests = await this.mlAssignmentService.getABTests(
        status,
        Number(limit),
      );

      return {
        tests,
        total: tests.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get A/B tests", error);
      throw new HttpException(
        "Failed to get A/B tests",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // ALGORITHM MANAGEMENT
  // ============================================

  @Get("algorithms")
  async getAvailableAlgorithms() {
    try {
      const algorithms = [
        {
          id: "ml",
          name: "Machine Learning",
          description: "Uses trained ML model for optimal assignments",
          strengths: ["High accuracy", "Learns from data", "Adaptive"],
          weaknesses: ["Requires training data", "Computationally intensive"],
          status: "active",
        },
        {
          id: "genetic",
          name: "Genetic Algorithm",
          description: "Evolutionary optimization approach",
          strengths: [
            "Good for complex constraints",
            "Explores multiple solutions",
          ],
          weaknesses: ["Slower convergence", "Parameter tuning required"],
          status: "active",
        },
        {
          id: "greedy",
          name: "Greedy Algorithm",
          description: "Fast heuristic-based assignment",
          strengths: ["Very fast", "Simple to implement", "Good for real-time"],
          weaknesses: ["May not find optimal solution", "Limited exploration"],
          status: "active",
        },
        {
          id: "hungarian",
          name: "Hungarian Algorithm",
          description: "Optimal assignment for cost minimization",
          strengths: ["Guaranteed optimal", "Mathematically proven"],
          weaknesses: ["O(n³) complexity", "Limited scalability"],
          status: "active",
        },
        {
          id: "multi_objective",
          name: "Multi-Objective Optimization",
          description: "Balances multiple competing objectives",
          strengths: ["Handles complex trade-offs", "Flexible constraints"],
          weaknesses: ["Complex implementation", "Performance intensive"],
          status: "active",
        },
      ];

      return {
        algorithms,
        total: algorithms.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get available algorithms", error);
      throw new HttpException(
        "Failed to get available algorithms",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("algorithms/:id/train")
  async trainAlgorithm(
    @Param("id") algorithmId: string,
    @Body() trainingData?: TrainingData,
  ) {
    try {
      const training = await this.mlAssignmentService.trainAlgorithm(
        algorithmId,
        (trainingData || { orders: [], drivers: [], assignments: [] }) as any,
      );

      return {
        success: true,
        training,
        algorithm: algorithmId,
        message: "Algorithm training started",
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to train algorithm ${algorithmId}`, error);
      throw new HttpException(
        "Failed to train algorithm",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // UTILITY ENDPOINTS
  // ============================================

  @Get("drivers/available")
  async getAvailableDriversForAssignment(
    @Query("orderId") orderId?: string,
    @Query("region") region?: string,
    @Query("limit") limit = 20,
  ) {
    try {
      let order;
      if (orderId) {
        order = await this.getOrderDetails(orderId);
      }

      const drivers = await this.getAvailableDrivers(
        order,
        { region },
        Number(limit),
      );

      return {
        drivers,
        total: drivers.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get available drivers", error);
      throw new HttpException(
        "Failed to get available drivers",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("simulation")
  async runAssignmentSimulation(
    @Query("orders") ordersCount = 10,
    @Query("drivers") driversCount = 20,
    @Query("algorithm") algorithm = "ml",
  ) {
    try {
      const simulation = await this.mlAssignmentService.runAssignmentSimulation(
        Number(ordersCount),
        Number(driversCount),
        algorithm,
      );

      return {
        simulation,
        algorithm,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to run assignment simulation", error);
      throw new HttpException(
        "Failed to run assignment simulation",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async getOrderDetails(orderId: string) {
    // This would be injected as a service, but for now using direct import
    const order = await this.mlAssignmentService.getOrderDetails(orderId);
    return order;
  }

  private async getAvailableDrivers(
    order?: OrderData,
    constraints?: AssignmentConstraints,
    limit = 50,
  ) {
    return this.mlAssignmentService.getAvailableDrivers(
      order as any,
      constraints,
      limit,
    );
  }

  private async getAvailableDriversForBatch(region?: string) {
    return this.mlAssignmentService.getAvailableDriversForBatch(region);
  }
}
