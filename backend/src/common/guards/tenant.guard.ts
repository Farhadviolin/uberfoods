import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

/**
 * Baseline Tenant-Guard:
 * - Extrahiert tenantId aus JWT (req.user.tenantId) oder Header `x-tenant-id`.
 * - Vergleicht optional gegen tenantId in Route-Parametern, Query oder Body.
 * - Verhindert, dass Requests ohne oder mit abweichender tenantId verarbeitet werden.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userTenant = request.user?.tenantId;
    const headerTenant = request.headers["x-tenant-id"] as string | undefined;
    const tenantFromRequest = userTenant || headerTenant;

    if (!tenantFromRequest) {
      throw new ForbiddenException("Tenant scope required");
    }

    const paramTenant =
      request.params?.tenantId ||
      request.query?.tenantId ||
      request.body?.tenantId;
    if (paramTenant && paramTenant !== tenantFromRequest) {
      throw new ForbiddenException("Tenant mismatch");
    }

    // Stempel die tenantId, damit Services sie nutzen können
    request.tenantId = tenantFromRequest;
    return true;
  }
}
