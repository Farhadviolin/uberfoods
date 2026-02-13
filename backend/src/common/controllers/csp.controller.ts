import { Controller, Post, Body, Logger } from "@nestjs/common";
import { AuditLedgerService } from "../audit/audit-ledger.service";

interface CSPReport {
  "csp-report": {
    "document-uri": string;
    referrer: string;
    "violated-directive": string;
    "effective-directive": string;
    "original-policy": string;
    "blocked-uri": string;
    "status-code": number;
  };
}

@Controller("csp-report")
export class CSPController {
  private readonly logger = new Logger(CSPController.name);

  constructor(private auditLedger: AuditLedgerService) {}

  @Post()
  async reportViolation(@Body() report: CSPReport) {
    this.logger.warn("CSP Violation Report:", JSON.stringify(report, null, 2));

    // Log CSP violation to audit ledger (non-sensitive)
    try {
      await this.auditLedger.appendEntry(
        "system",
        "csp-monitor",
        "csp.violation",
        "security",
        `csp-violation-${Date.now()}`,
        {
          violatedDirective: report["csp-report"]["violated-directive"],
          blockedUri: report["csp-report"]["blocked-uri"],
          documentUri: report["csp-report"]["document-uri"],
          statusCode: report["csp-report"]["status-code"],
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      this.logger.error("Failed to log CSP violation to audit ledger:", error);
    }

    // Return 204 No Content for CSP reports
    return "";
  }
}
