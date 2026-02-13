export interface OutboxMessage {
  id: string;
  type: string;
  payload: any;
  createdAt: Date;
}

export interface OutboxPublisher {
  /**
   * Publish a message to the configured destination(s)
   */
  publish(message: OutboxMessage): Promise<void>;

  /**
   * Get publisher status/health
   */
  getStatus(): Promise<{
    healthy: boolean;
    destinations: string[];
    error?: string;
  }>;
}
