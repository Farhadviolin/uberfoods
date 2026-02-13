import { Injectable } from "@nestjs/common";

@Injectable()
export class RbacService {
  // Placeholder RBAC service
  async getUserPermissions(
    userId: string,
    userRole?: string,
  ): Promise<string[]> {
    // Placeholder implementation
    return [];
  }

  async incrementPermissionDenial(
    userId: string,
    permission: string,
  ): Promise<void> {
    // Placeholder implementation
  }
}
