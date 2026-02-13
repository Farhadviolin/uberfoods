import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PushNotificationService } from "../services/push-notification.service";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";

@Controller("notifications")
export class PushNotificationController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Post("register")
  @UseGuards(JwtAuthGuard)
  async registerToken(
    @Request() _req: any,
    @Body()
    body: {
      token: string;
      platform: "ios" | "android" | "web";
      deviceId?: string;
      metadata?: any;
    },
  ) {
    await this.pushService.registerToken(
      _req.user.id,
      body.token,
      body.platform,
      body.deviceId,
      body.metadata,
    );

    return { success: true, message: "Token registered successfully" };
  }

  @Post("unregister")
  @UseGuards(JwtAuthGuard)
  async unregisterToken(
    @Request() _req: any,
    @Body() body: { platform: "ios" | "android" | "web"; deviceId?: string },
  ) {
    await this.pushService.unregisterToken(
      _req.user.id,
      body.platform,
      body.deviceId,
    );

    return { success: true, message: "Token unregistered successfully" };
  }

  @Post("send/:userId")
  @UseGuards(JwtAuthGuard)
  async sendToUser(
    @Param("userId") userId: string,
    @Body()
    body: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      image?: string;
      data?: { [key: string]: string };
      actions?: Array<{ action: string; title: string; icon?: string }>;
      priority?: "normal" | "high";
      ttl?: number;
    },
  ) {
    const result = await this.pushService.sendToUser(
      userId,
      {
        title: body.title,
        body: body.body,
        icon: body.icon,
        badge: body.badge,
        image: body.image,
        data: body.data,
        actions: body.actions,
      },
      {
        priority: body.priority,
        ttl: body.ttl,
      },
    );

    return result;
  }

  @Post("broadcast")
  @UseGuards(JwtAuthGuard)
  async sendBroadcast(
    @Request() _req: any,
    @Body()
    body: {
      title: string;
      body: string;
      platform?: "ios" | "android" | "web";
      icon?: string;
      badge?: string;
      image?: string;
      data?: { [key: string]: string };
      priority?: "normal" | "high";
    },
  ) {
    // Check admin permissions (case-insensitive)
    if (_req.user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }

    const result = await this.pushService.sendBroadcast(
      {
        title: body.title,
        body: body.body,
        icon: body.icon,
        badge: body.badge,
        image: body.image,
        data: body.data,
      },
      body.platform,
      {
        priority: body.priority,
      },
    );

    return result;
  }

  @Post("segment")
  @UseGuards(JwtAuthGuard)
  async sendToSegment(
    @Request() _req: any,
    @Body()
    body: {
      segment: {
        platform?: "ios" | "android" | "web";
        userType?: "customer" | "driver" | "restaurant";
        location?: { lat: number; lng: number; radius: number };
        lastActiveAfter?: string;
      };
      notification: {
        title: string;
        body: string;
        icon?: string;
        badge?: string;
        image?: string;
        data?: { [key: string]: string };
      };
      options?: {
        priority?: "normal" | "high";
        ttl?: number;
      };
    },
  ) {
    // Check admin permissions (case-insensitive)
    if (_req.user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }

    const segment = {
      ...body.segment,
      lastActiveAfter: body.segment.lastActiveAfter
        ? new Date(body.segment.lastActiveAfter)
        : undefined,
    };

    const result = await this.pushService.sendToSegment(
      segment,
      body.notification,
      body.options,
    );

    return result;
  }

  @Get("vapid-public-key")
  getVapidPublicKey() {
    return {
      publicKey: this.pushService.getVapidPublicKey(),
    };
  }

  @Get("stats/:timeframe")
  @UseGuards(JwtAuthGuard)
  async getNotificationStats(
    @Param("timeframe") timeframe: "hour" | "day" | "week",
    @Request() _req: any,
  ) {
    // Check admin permissions for detailed stats (case-insensitive)
    if (_req.user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }

    return this.pushService.getNotificationStats(timeframe);
  }

  // Predefined notification templates
  @Post("templates/order-status")
  @UseGuards(JwtAuthGuard)
  async sendOrderStatusNotification(
    @Request() _req: any,
    @Body()
    body: {
      orderId: string;
      status: "confirmed" | "preparing" | "ready" | "picked_up" | "delivered";
      userId: string;
    },
  ) {
    const templates = {
      confirmed: {
        title: "Bestellung bestätigt! 🎉",
        body: "Deine Bestellung wurde bestätigt und wird bald zubereitet.",
        data: {
          type: "order_status",
          orderId: body.orderId,
          status: "confirmed",
        },
      },
      preparing: {
        title: "Deine Bestellung wird zubereitet 👨‍🍳",
        body: "Die Küche hat mit der Zubereitung begonnen.",
        data: {
          type: "order_status",
          orderId: body.orderId,
          status: "preparing",
        },
      },
      ready: {
        title: "Bestellung fertig! 🚀",
        body: "Deine Bestellung ist fertig und wartet auf Abholung.",
        data: { type: "order_status", orderId: body.orderId, status: "ready" },
      },
      picked_up: {
        title: "Bestellung unterwegs! 📦",
        body: "Dein Fahrer ist auf dem Weg zu dir.",
        data: {
          type: "order_status",
          orderId: body.orderId,
          status: "picked_up",
        },
      },
      delivered: {
        title: "Bestellung zugestellt! ✅",
        body: "Guten Appetit! Bewerte bitte deine Bestellung.",
        data: {
          type: "order_status",
          orderId: body.orderId,
          status: "delivered",
        },
      },
    };

    const template = templates[body.status];
    if (!template) {
      throw new BadRequestException(`Invalid order status: ${body.status}`);
    }

    return this.pushService.sendToUser(body.userId, template);
  }

  @Post("templates/driver-assignment")
  @UseGuards(JwtAuthGuard)
  async sendDriverAssignmentNotification(
    @Body()
    body: {
      driverId: string;
      orderId: string;
      pickupAddress: string;
      deliveryAddress: string;
      estimatedTime: number;
    },
  ) {
    const notification = {
      title: "Neue Lieferung! 🚚",
      body: `Neue Lieferung zugewiesen. Abholung: ${body.pickupAddress}. Zustellung: ${body.deliveryAddress}.`,
      data: {
        type: "driver_assignment",
        orderId: body.orderId,
        estimatedTime: body.estimatedTime.toString(),
      },
      actions: [
        { action: "accept", title: "Annehmen" },
        { action: "decline", title: "Ablehnen" },
      ],
    };

    return this.pushService.sendToUser(body.driverId, notification, {
      priority: "high",
    });
  }

  @Post("templates/promotion")
  @UseGuards(JwtAuthGuard)
  async sendPromotionNotification(
    @Request() _req: any,
    @Body()
    body: {
      title: string;
      message: string;
      discountCode?: string;
      validUntil?: string;
      image?: string;
      targetUsers?: string[]; // user IDs, if not specified, broadcast
    },
  ) {
    // Check admin permissions (case-insensitive)
    if (_req.user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }

    const notification = {
      title: `🔥 ${body.title}`,
      body: body.message,
      image: body.image,
      data: {
        type: "promotion",
        discountCode: body.discountCode || "",
        validUntil: body.validUntil || "",
      },
      actions: body.discountCode
        ? [{ action: "use_code", title: "Code verwenden" }]
        : undefined,
    };

    if (body.targetUsers && body.targetUsers.length > 0) {
      return this.pushService.sendToUsers(body.targetUsers, notification);
    } else {
      return this.pushService.sendBroadcast(notification);
    }
  }

  @Post("templates/emergency")
  @UseGuards(JwtAuthGuard)
  async sendEmergencyNotification(
    @Request() _req: any,
    @Body()
    body: {
      title: string;
      message: string;
      emergencyType: "accident" | "delay" | "system_issue" | "safety";
      affectedUsers?: string[];
      location?: { lat: number; lng: number; radius: number };
    },
  ) {
    // Check admin permissions (case-insensitive)
    if (_req.user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }

    const notification = {
      title: `🚨 ${body.title}`,
      body: body.message,
      data: {
        type: "emergency",
        emergencyType: body.emergencyType,
      },
    };

    if (body.affectedUsers && body.affectedUsers.length > 0) {
      return this.pushService.sendToUsers(body.affectedUsers, notification, {
        priority: "high",
      });
    } else if (body.location) {
      return this.pushService.sendToSegment(
        {
          location: body.location,
        },
        notification,
        { priority: "high" },
      );
    } else {
      return this.pushService.sendBroadcast(notification, undefined, {
        priority: "high",
      });
    }
  }
}
