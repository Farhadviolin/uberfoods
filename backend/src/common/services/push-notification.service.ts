import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import * as webpush from "web-push";
import { PrismaService } from "../../prisma/prisma.service";

interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: { [key: string]: string };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface NotificationRecipient {
  userId: string;
  platform: "ios" | "android" | "web";
  token: string;
  deviceId?: string;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private vapidKeys: webpush.VapidKeys;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeFirebase();
    this.initializeWebPush();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = {
        type: "service_account",
        project_id: this.configService.get("FIREBASE_PROJECT_ID"),
        private_key_id: this.configService.get("FIREBASE_PRIVATE_KEY_ID"),
        private_key: this.configService
          .get("FIREBASE_PRIVATE_KEY")
          ?.replace(/\\n/g, "\n"),
        client_email: this.configService.get("FIREBASE_CLIENT_EMAIL"),
        client_id: this.configService.get("FIREBASE_CLIENT_ID"),
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: this.configService.get(
          "FIREBASE_CLIENT_X509_CERT_URL",
        ),
      };

      if (serviceAccount.project_id) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as any),
        });
        this.logger.log("Firebase Admin initialized successfully");
      } else {
        this.logger.warn("Firebase credentials not configured");
      }
    } catch (error) {
      this.logger.error("Failed to initialize Firebase", error);
    }
  }

  /**
   * Get user location from database
   */
  private async getUserLocation(
    userId: string,
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      // Try to get customer location from addresses
      const customer = await this.prisma.customer.findUnique({
        where: { id: userId },
        include: {
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
        },
      });

      if (customer?.addresses?.[0]) {
        const addr = customer.addresses[0];
        if (addr.latitude && addr.longitude) {
          return { lat: addr.latitude, lng: addr.longitude };
        }
      }

      // Try to get driver location
      const driver = await this.prisma.driver.findUnique({
        where: { id: userId },
        select: { location: true },
      });

      if (driver?.location) {
        const loc = driver.location as any;
        if (loc.lat && loc.lng) {
          return { lat: loc.lat, lng: loc.lng };
        }
        if (loc.latitude && loc.longitude) {
          return { lat: loc.latitude, lng: loc.longitude };
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get user location for ${userId}:`, error);
      return null;
    }
  }

  private initializeWebPush() {
    try {
      this.vapidKeys = {
        subject:
          this.configService.get("VAPID_SUBJECT") ||
          "mailto:admin@hmor-food-delivery.com",
        publicKey: this.configService.get("VAPID_PUBLIC_KEY"),
        privateKey: this.configService.get("VAPID_PRIVATE_KEY"),
      };

      if (this.vapidKeys.publicKey && this.vapidKeys.privateKey) {
        webpush.setVapidDetails(
          this.vapidKeys.subject,
          this.vapidKeys.publicKey,
          this.vapidKeys.privateKey,
        );
        this.logger.log("Web Push VAPID keys configured successfully");
      } else {
        this.logger.warn("VAPID keys not configured");
      }
    } catch (error) {
      this.logger.error("Failed to initialize Web Push", error);
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(
    userId: string,
    notification: PushNotification,
    options?: {
      priority?: "normal" | "high";
      ttl?: number;
      collapseKey?: string;
    },
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    try {
      const recipients = await this.getUserTokens(userId);
      if (recipients.length === 0) {
        return { success: false, sent: 0, failed: 0 };
      }

      const results = await Promise.allSettled(
        recipients.map((recipient) =>
          this.sendToDevice(recipient, notification, options),
        ),
      );

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      // Log notification
      await this.logNotification(userId, notification, sent, failed);

      return { success: sent > 0, sent, failed };
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}`, error);
      return { success: false, sent: 0, failed: 1 };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: PushNotification,
    options?: any,
  ): Promise<{ total: number; sent: number; failed: number }> {
    const results = await Promise.all(
      userIds.map((userId) => this.sendToUser(userId, notification, options)),
    );

    const total = userIds.length;
    const sent = results.reduce((sum, r) => sum + r.sent, 0);
    const failed = results.reduce((sum, r) => sum + r.failed, 0);

    return { total, sent, failed };
  }

  /**
   * Send broadcast notification to all users
   */
  async sendBroadcast(
    notification: PushNotification,
    targetPlatform?: "ios" | "android" | "web",
    options?: any,
  ): Promise<{ sent: number; failed: number }> {
    try {
      const whereClause: any = {};
      if (targetPlatform) {
        whereClause.platform = targetPlatform;
      }

      const allTokens = await this.prisma.pushSubscription.findMany({
        where: whereClause,
        take: 10000, // Limit for performance
      });

      const results = await Promise.allSettled(
        allTokens.map((token) => {
          // PushSubscription has endpoint, p256dh, auth for web push
          // Determine platform from endpoint or use 'web' as default
          const platform = token.endpoint.startsWith(
            "https://fcm.googleapis.com",
          )
            ? "android"
            : token.endpoint.startsWith("https://api.push.apple.com")
              ? "ios"
              : "web";
          const recipient: NotificationRecipient = {
            userId: token.userId,
            platform: platform as any,
            token: token.endpoint, // Use endpoint as token for web push
          };
          return this.sendToDevice(recipient, notification, options);
        }),
      );

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      this.logger.log(
        `Broadcast notification sent: ${sent} successful, ${failed} failed`,
      );
      return { sent, failed };
    } catch (error) {
      this.logger.error("Broadcast notification failed", error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Send notification based on user segment
   */
  async sendToSegment(
    segment: {
      platform?: "ios" | "android" | "web";
      userType?: "customer" | "driver" | "restaurant";
      location?: { lat: number; lng: number; radius: number };
      lastActiveAfter?: Date;
    },
    notification: PushNotification,
    options?: any,
  ): Promise<{ sent: number; failed: number }> {
    try {
      // Build query for segment
      const whereClause: any = {};

      // PushSubscription doesn't have platform field - filter by endpoint pattern
      // if (segment.platform) {
      //   whereClause.platform = segment.platform;
      // }

      if (segment.userType) {
        // Filter by userRole field
        whereClause.userRole = segment.userType.toUpperCase();
      }

      // lastActiveAfter filtering not available in PushSubscription model
      // if (segment.lastActiveAfter) {
      //   whereClause.updatedAt = { gte: segment.lastActiveAfter };
      // }

      // Remove user relation query as PushSubscription doesn't have user relation
      const segmentTokens = await this.prisma.pushSubscription.findMany({
        where: whereClause,
        take: 5000,
      });

      const results = await Promise.allSettled(
        segmentTokens.map(async (token) => {
          // Location filtering
          if (segment.location) {
            try {
              const userLocation = await this.getUserLocation(token.userId);

              if (userLocation && segment.location) {
                const distance = this.calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  segment.location.lat,
                  segment.location.lng,
                );

                const radiusKm = segment.location.radius || 10;
                if (distance > radiusKm) {
                  this.logger.debug(
                    `Skipping notification for user ${token.userId} - outside radius (${distance.toFixed(2)}km > ${radiusKm}km)`,
                  );
                  return Promise.reject("Outside geographic segment");
                }
              }
            } catch (error) {
              this.logger.warn(
                `Failed to filter by location for user ${token.userId}:`,
                error,
              );
              // Continue with notification if location filtering fails
            }
          }

          // Determine platform from endpoint
          const platform = token.endpoint.startsWith(
            "https://fcm.googleapis.com",
          )
            ? "android"
            : token.endpoint.startsWith("https://api.push.apple.com")
              ? "ios"
              : "web";
          const recipient: NotificationRecipient = {
            userId: token.userId,
            platform: platform as any,
            token: token.endpoint, // Use endpoint as token for web push
          };
          return this.sendToDevice(recipient, notification, options);
        }),
      );

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return { sent, failed };
    } catch (error) {
      this.logger.error("Segment notification failed", error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Register device token for push notifications
   */
  async registerToken(
    userId: string,
    token: string,
    platform: "ios" | "android" | "web",
    deviceId?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      // For web push, token contains endpoint, p256dh, and auth
      // Parse if it's a JSON string, otherwise use as endpoint
      let endpoint = token;
      let p256dh = "";
      let auth = "";

      if (platform === "web" && token.includes('"endpoint"')) {
        try {
          const subscription = JSON.parse(token);
          endpoint = subscription.endpoint;
          p256dh = subscription.keys?.p256dh || "";
          auth = subscription.keys?.auth || "";
        } catch {
          // If parsing fails, use token as endpoint
        }
      }

      await this.prisma.pushSubscription.upsert({
        where: {
          userId, // userId is unique in schema
        },
        update: {
          endpoint,
          p256dh: p256dh || undefined,
          auth: auth || undefined,
          userRole:
            platform === "ios"
              ? "CUSTOMER"
              : platform === "android"
                ? "DRIVER"
                : "CUSTOMER",
        },
        create: {
          userId,
          endpoint,
          p256dh: p256dh || "",
          auth: auth || "",
          userRole:
            platform === "ios"
              ? "CUSTOMER"
              : platform === "android"
                ? "DRIVER"
                : "CUSTOMER",
        },
      });

      this.logger.debug(`Token registered for user ${userId} on ${platform}`);
    } catch (error) {
      this.logger.error("Failed to register token", error);
      throw error;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterToken(
    userId: string,
    platform: "ios" | "android" | "web",
    deviceId?: string,
  ): Promise<void> {
    try {
      await this.prisma.pushSubscription.deleteMany({
        where: {
          userId,
          // platform and deviceId not in schema - delete by userId only
        },
      });

      this.logger.debug(`Token unregistered for user ${userId} on ${platform}`);
    } catch (error) {
      this.logger.error("Failed to unregister token", error);
      throw error;
    }
  }

  /**
   * Send notification to specific device
   */
  private async sendToDevice(
    recipient: NotificationRecipient,
    notification: PushNotification,
    options?: any,
  ): Promise<void> {
    try {
      if (recipient.platform === "web") {
        await this.sendWebPush(recipient, notification, options);
      } else {
        await this.sendMobilePush(recipient, notification, options);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send to device ${recipient.deviceId}`,
        error,
      );
      throw error;
    }
  }

  private async sendMobilePush(
    recipient: NotificationRecipient,
    notification: PushNotification,
    options?: any,
  ): Promise<void> {
    try {
      const message = {
        token: recipient.token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          priority: options?.priority === "high" ? "high" : "normal",
          ttl: options?.ttl || 3600 * 1000, // 1 hour
          collapseKey: options?.collapseKey,
          notification: {
            icon: notification.icon,
            color: "#FF6B35",
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: notification.badge ? parseInt(notification.badge) : 1,
              sound: "default",
              category: "GENERAL",
            },
          },
        },
      };

      await admin.messaging().send(message as any);
    } catch (error: any) {
      // Handle invalid tokens
      if (error.code === "messaging/registration-token-not-registered") {
        await this.prisma.pushSubscription.deleteMany({
          where: {
            userId: recipient.userId,
            endpoint: recipient.token, // Use endpoint instead of token
          },
        });
      }
      throw error;
    }
  }

  private async sendWebPush(
    recipient: NotificationRecipient,
    notification: PushNotification,
    options?: any,
  ): Promise<void> {
    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || "/icon-192x192.png",
        badge: notification.badge || "/badge-72x72.png",
        image: notification.image,
        data: notification.data,
        actions: notification.actions,
        requireInteraction: true,
        silent: false,
      });

      await webpush.sendNotification(recipient.token as any, payload, {
        TTL: options?.ttl || 86400, // 24 hours
        urgency: options?.priority === "high" ? "high" : "normal",
      });
    } catch (error) {
      // Handle expired subscriptions
      if (error.statusCode === 410) {
        await this.prisma.pushSubscription.deleteMany({
          where: {
            userId: recipient.userId,
            endpoint: recipient.token, // Use endpoint instead of token
          },
        });
      }
      throw error;
    }
  }

  private async getUserTokens(
    userId: string,
  ): Promise<NotificationRecipient[]> {
    try {
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId },
      });

      return subscriptions.map((sub) => {
        // Determine platform from endpoint
        const platform = sub.endpoint.startsWith("https://fcm.googleapis.com")
          ? "android"
          : sub.endpoint.startsWith("https://api.push.apple.com")
            ? "ios"
            : "web";
        return {
          userId: sub.userId,
          platform: platform as any,
          token: sub.endpoint, // Use endpoint as token
        };
      });
    } catch (error) {
      this.logger.error("Failed to get user tokens", error);
      return [];
    }
  }

  private async logNotification(
    userId: string,
    notification: PushNotification,
    sent: number,
    failed: number,
  ): Promise<void> {
    try {
      // Log notification (simplified - Notification model doesn't have sentCount, failedCount, etc.)
      await this.prisma.notification.create({
        data: {
          userId,
          type: "PUSH",
          title: notification.title,
          message: notification.body,
          data: { sent, failed } as any,
        },
      });
    } catch (error) {
      this.logger.error("Failed to log notification", error);
    }
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get VAPID public key for web push subscriptions
   */
  getVapidPublicKey(): string {
    return this.vapidKeys.publicKey;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(timeframe: "hour" | "day" | "week" = "day") {
    try {
      const startDate = new Date();
      switch (timeframe) {
        case "hour":
          startDate.setHours(startDate.getHours() - 1);
          break;
        case "day":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
      }

      const stats = await this.prisma.notification.aggregate({
        where: {
          createdAt: { gte: startDate },
          type: "PUSH",
        },
        _count: true,
      });

      const totalSubscriptions = await this.prisma.pushSubscription.count();

      // Calculate sent/failed from notification data field (simplified)
      const notifications = await this.prisma.notification.findMany({
        where: {
          createdAt: { gte: startDate },
          type: "PUSH",
        },
        select: { data: true },
      });

      let totalSent = 0;
      let totalFailed = 0;
      notifications.forEach((notif) => {
        if (notif.data && typeof notif.data === "object") {
          const data = notif.data as any;
          totalSent += data.sent || 0;
          totalFailed += data.failed || 0;
        }
      });

      return {
        timeframe,
        totalNotifications: stats._count,
        totalSent,
        totalFailed,
        deliveryRate:
          totalSent + totalFailed > 0
            ? (totalSent / (totalSent + totalFailed)) * 100
            : 0,
        activeSubscriptions: totalSubscriptions,
      };
    } catch (error) {
      this.logger.error("Failed to get notification stats", error);
      return {
        timeframe,
        totalNotifications: 0,
        totalSent: 0,
        totalFailed: 0,
        deliveryRate: 0,
        activeSubscriptions: 0,
      };
    }
  }
}
