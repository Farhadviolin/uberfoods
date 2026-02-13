import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SecurityService } from "./security.service";

@ApiTags("security")
@Controller("security")
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get("ip/blacklist")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get blacklisted IPs" })
  @ApiResponse({ status: 200, description: "Blacklist retrieved" })
  getBlacklist() {
    return { ips: this.securityService.getBlacklist() };
  }

  @Post("ip/blacklist")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add IP to blacklist" })
  @ApiResponse({ status: 201, description: "IP blacklisted" })
  addToBlacklist(@Body() body: { ip: string; reason?: string }) {
    return this.securityService.addToBlacklist(body.ip, body.reason);
  }

  @Get("analytics")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get security analytics" })
  @ApiResponse({ status: 200, description: "Analytics retrieved" })
  getAnalytics() {
    return this.securityService.getAnalytics();
  }

  @Post("threats/detect")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Detect security threats" })
  @ApiResponse({ status: 200, description: "Threats detected" })
  detectThreat(@Body() body: { ip: string; action: string }) {
    return this.securityService.detectThreat(body.ip, body.action);
  }
}
