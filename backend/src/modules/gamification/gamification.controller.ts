import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { GamificationService } from "./gamification.service";

@ApiTags("gamification")
@Controller("gamification")
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get gamification stats" })
  @ApiResponse({ status: 200, description: "Stats retrieved" })
  async getStats(@GetUser("id") userId?: string) {
    return this.gamificationService.getStatsForUser(userId);
  }

  @Get("achievements")
  @ApiOperation({ summary: "Get achievements" })
  @ApiResponse({ status: 200, description: "Achievements retrieved" })
  async getAchievements() {
    return this.gamificationService.getAchievements();
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "Get leaderboard" })
  @ApiResponse({ status: 200, description: "Leaderboard retrieved" })
  async getLeaderboard(
    @Query("type") type = "level",
    @Query("limit") limit = "10",
  ) {
    const parsedLimit = Number.parseInt(limit, 10);
    return this.gamificationService.getLeaderboard(type, Number.isNaN(parsedLimit) ? 10 : parsedLimit);
  }
}
