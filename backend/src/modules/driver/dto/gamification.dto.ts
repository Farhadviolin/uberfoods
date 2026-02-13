import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RedeemPointsDto {
  @ApiProperty({ description: "Points amount", example: 1000, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: "Reward ID", example: "reward-123" })
  @IsNotEmpty()
  @IsString()
  rewardId: string;
}

export class UnlockBadgeDto {
  @ApiProperty({ description: "Badge ID", example: "badge-first-delivery" })
  @IsNotEmpty()
  @IsString()
  badgeId: string;
}

export class UpgradeLevelDto {
  @ApiProperty({ description: "Level ID", example: "level-5" })
  @IsNotEmpty()
  @IsString()
  levelId: string;
}

export class ClaimRewardDto {
  @ApiProperty({ description: "Reward ID", example: "reward-123" })
  @IsNotEmpty()
  @IsString()
  rewardId: string;
}

export class JoinEventDto {
  @ApiProperty({ description: "Event ID", example: "event-weekend-challenge" })
  @IsNotEmpty()
  @IsString()
  eventId: string;
}

export class RegisterTournamentDto {
  @ApiProperty({ description: "Tournament ID", example: "tournament-123" })
  @IsNotEmpty()
  @IsString()
  tournamentId: string;
}

export class ShareGamificationDto {
  @ApiProperty({ description: "Achievement ID", example: "achievement-123" })
  @IsNotEmpty()
  @IsString()
  achievementId: string;

  @ApiProperty({ description: "Platform", example: "facebook" })
  @IsNotEmpty()
  @IsString()
  platform: string;
}
