import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { Request } from "express";
import { PaymentService } from "./payment.service";

@ApiTags("payments")
@Controller("webhooks/stripe")
export class PaymentWebhookController {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {
    const secretKey =
      this.configService.get<string>("STRIPE_SECRET_KEY") ||
      "STRIPE_SECRET_KEY_PLACEHOLDER";
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-10-29.clover",
    });
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: "Stripe Webhook Handler" })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers("stripe-signature") signature?: string,
  ) {
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );
    if (!signature || !webhookSecret) {
      throw new BadRequestException(
        "Stripe webhook signature verification failed: missing signature or secret",
      );
    }

    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException("Stripe webhook requires raw request body");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(
        "Stripe webhook signature verification failed",
      );
    }

    return this.handleSubscriptionEvent(event);
  }

  private async handleSubscriptionEvent(event: Stripe.Event) {
    switch (event.type) {
      case "invoice.payment_succeeded":
        return this.paymentService.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
      case "customer.subscription.created":
        return this.paymentService.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
      case "customer.subscription.updated":
        return this.paymentService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
      case "customer.subscription.deleted":
        return this.paymentService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
      default:
        return { handled: false, type: event.type };
    }
  }
}
