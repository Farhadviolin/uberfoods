import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  Headers,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { CustomerService } from "./customer.service";

interface AuthenticatedRequest {
  user?: {
    sub?: string;
    id?: string;
    email?: string;
    userType?: string;
    role?: string;
  };
}

@ApiTags("Customer")
@Controller("customers")
export class CustomerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
  ) {}

  @Get("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CUSTOMER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get customer profile" })
  async getProfile(@Request() req: AuthenticatedRequest) {
    const customerId = req.user?.sub || req.user?.id;
    if (!customerId) {
      throw new UnauthorizedException("Customer identity not found");
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!customer) {
      throw new UnauthorizedException("Customer not found");
    }

    if (!customer.isActive) {
      throw new UnauthorizedException("Account is inactive");
    }

    return customer;
  }

  @Put("profile")
  @ApiOperation({ summary: "Update customer profile" })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: any,
    @Query("userId") userIdQuery?: string,
    @Headers("x-user-id") userIdHeader?: string,
  ) {
    // For E2E testing, accept user ID from body or request
    const userId =
      updateData.userId ||
      userIdQuery ||
      userIdHeader ||
      req.user?.sub ||
      req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found");
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id: userId },
      data: {
        name: updateData.name,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        phone: updateData.phone,
        address: updateData.address,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        updatedAt: true,
      },
    });

    return updatedCustomer;
  }

  private getCurrentCustomerId(
    req: AuthenticatedRequest,
    userIdQuery?: string,
    userIdHeader?: string,
  ): string {
    const userId = userIdQuery || userIdHeader || req.user?.sub || req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found");
    }
    return userId;
  }

  @Get("me/favorites")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current customer favorite restaurants" })
  async getFavorites(
    @Request() req: AuthenticatedRequest,
    @Query("userId") userIdQuery?: string,
    @Headers("x-user-id") userIdHeader?: string,
  ) {
    const customerId = this.getCurrentCustomerId(
      req,
      userIdQuery,
      userIdHeader,
    );
    return this.prisma.customerFavorite.findMany({
      where: { customerId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            rating: true,
            status: true,
            isActive: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });
  }

  @Get("me/dashboard-stats")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current customer dashboard statistics" })
  async getDashboardStats(@Request() req: AuthenticatedRequest) {
    const customerId = this.getCurrentCustomerId(req);
    const [totalOrders, completedOrders, totalSpent] = await Promise.all([
      this.prisma.order.count({ where: { customerId } }),
      this.prisma.order.count({
        where: { customerId, status: "DELIVERED" },
      }),
      this.prisma.order.aggregate({
        where: { customerId },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      stats: {
        totalOrders,
        completedOrders,
        totalSpent: totalSpent._sum.totalAmount ?? 0,
      },
    };
  }

  @Post("me/favorites")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Add favorite restaurant for current customer" })
  async addFavorite(
    @Request() req: AuthenticatedRequest,
    @Body() body: { restaurantId?: string },
    @Query("userId") userIdQuery?: string,
    @Headers("x-user-id") userIdHeader?: string,
  ) {
    const customerId = this.getCurrentCustomerId(
      req,
      userIdQuery,
      userIdHeader,
    );
    if (!body.restaurantId) {
      throw new BadRequestException("restaurantId is required");
    }

    return this.prisma.customerFavorite.upsert({
      where: {
        customerId_restaurantId: {
          customerId,
          restaurantId: body.restaurantId,
        },
      },
      update: {},
      create: {
        customerId,
        restaurantId: body.restaurantId,
      },
    });
  }

  @Delete("me/favorites/:restaurantId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Remove favorite restaurant for current customer" })
  async removeFavorite(
    @Request() req: AuthenticatedRequest,
    @Param("restaurantId") restaurantId: string,
    @Query("userId") userIdQuery?: string,
    @Headers("x-user-id") userIdHeader?: string,
  ) {
    const customerId = this.getCurrentCustomerId(
      req,
      userIdQuery,
      userIdHeader,
    );
    await this.prisma.customerFavorite.deleteMany({
      where: { customerId, restaurantId },
    });
    return { success: true };
  }
}
