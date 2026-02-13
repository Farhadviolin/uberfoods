import { Injectable } from "@nestjs/common";

@Injectable()
export class AuditService {
  async getLogs(entity: string, limit: number): Promise<any[]> {
    // Stub implementation - audit module is excluded from build
    return [];
  }
}
