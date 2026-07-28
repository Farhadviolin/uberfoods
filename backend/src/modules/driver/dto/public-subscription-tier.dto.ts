import { ApiProperty } from "@nestjs/swagger";

export class PublicSubscriptionTierDto {
  @ApiProperty({ enum: ["BASIC", "PRO", "FULLTIME", "ENTERPRISE"] })
  tier: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  displayCommission: string;

  @ApiProperty({ type: [String] })
  features: string[];

  @ApiProperty()
  isPopular: boolean;

  @ApiProperty()
  isActive: boolean;
}

export class PublicSubscriptionTiersResponseDto {
  @ApiProperty({ type: [PublicSubscriptionTierDto] })
  tiers: PublicSubscriptionTierDto[];
}
