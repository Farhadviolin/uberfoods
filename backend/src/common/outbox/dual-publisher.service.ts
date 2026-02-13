import { Injectable, Logger } from "@nestjs/common";
import { OutboxPublisher, OutboxMessage } from "./publisher.interface";

@Injectable()
export class DualPublisherService implements OutboxPublisher {
  private readonly logger = new Logger(DualPublisherService.name);
  private dualPublishEnabled = process.env.FEATURE_DUAL_PUBLISH === "true";

  constructor(
    private primaryPublisher: OutboxPublisher,
    private secondaryPublisher?: OutboxPublisher,
  ) {
    this.logger.log(
      `Dual publisher initialized: enabled=${this.dualPublishEnabled}`,
    );
  }

  async publish(message: OutboxMessage): Promise<void> {
    // Always publish to primary
    await this.primaryPublisher.publish(message);

    // Optionally publish to secondary (for multi-region testing)
    if (this.dualPublishEnabled && this.secondaryPublisher) {
      try {
        await this.secondaryPublisher.publish(message);
        this.logger.debug(
          `Dual-published message ${message.id} to both destinations`,
        );
      } catch (error) {
        // Log but don't fail - secondary publish is best effort
        this.logger.warn(
          `Secondary publish failed for message ${message.id}:`,
          error.message,
        );
      }
    }
  }

  async getStatus() {
    const primaryStatus = await this.primaryPublisher.getStatus();
    let secondaryStatus = null;

    if (this.secondaryPublisher) {
      try {
        secondaryStatus = await this.secondaryPublisher.getStatus();
      } catch (error) {
        secondaryStatus = {
          healthy: false,
          destinations: [],
          error: error.message,
        };
      }
    }

    return {
      healthy: primaryStatus.healthy, // Overall health based on primary
      destinations: [
        ...primaryStatus.destinations,
        ...(secondaryStatus?.destinations || []),
      ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
      dualPublishEnabled: this.dualPublishEnabled,
      primaryHealthy: primaryStatus.healthy,
      secondaryConfigured: !!this.secondaryPublisher,
      secondaryHealthy: secondaryStatus?.healthy || false,
    };
  }
}
