import { Injectable } from "@nestjs/common";

type SecurityEvent = {
  ip: string;
  action: string;
  riskLevel: "low" | "medium" | "high";
  createdAt: Date;
};

@Injectable()
export class SecurityService {
  private readonly blacklist = new Set<string>();
  private readonly events: SecurityEvent[] = [];

  isIPWhitelisted(ip: string): boolean {
    return !this.blacklist.has(ip);
  }

  getBlacklist() {
    return Array.from(this.blacklist.values());
  }

  addToBlacklist(ip: string, reason?: string) {
    this.blacklist.add(ip);
    this.events.push({
      ip,
      action: reason ?? "blacklisted",
      riskLevel: "high",
      createdAt: new Date(),
    });
    return { success: true };
  }

  getAnalytics() {
    const eventsBySeverity = this.events.reduce<Record<string, number>>(
      (acc, event) => {
        acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      totalEvents: this.events.length,
      eventsBySeverity,
    };
  }

  detectThreat(ip: string, action: string) {
    const isThreat = this.blacklist.has(ip);
    const riskLevel: "low" | "medium" | "high" = isThreat ? "high" : "low";
    this.events.push({ ip, action, riskLevel, createdAt: new Date() });
    return { isThreat, riskLevel };
  }
}
