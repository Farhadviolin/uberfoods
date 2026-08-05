import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { IntegrationsService } from "./integrations.service";

@ApiTags("integrations")
@Controller("integrations")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get("available")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Verfügbare Integrationen" })
  @ApiOkResponse({ isArray: true })
  getAvailableIntegrations() {
    return this.integrationsService.getAvailableIntegrations();
  }

  @Get("connected")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Verbundene Integrationen" })
  @ApiOkResponse({ isArray: true })
  getConnectedIntegrations() {
    return this.integrationsService.getConnectedIntegrations();
  }

  @Get("api-keys")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Aktive API-Schlüssel" })
  @ApiOkResponse({ isArray: true })
  getApiKeys() {
    return this.integrationsService.getApiKeys();
  }

  @Get("webhooks")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Konfigurierte Webhooks" })
  @ApiOkResponse({ isArray: true })
  getWebhooks() {
    return this.integrationsService.getWebhooks();
  }
}
