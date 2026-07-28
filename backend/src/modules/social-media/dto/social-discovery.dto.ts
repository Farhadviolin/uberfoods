import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SocialDiscoveryQueryDto {
  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class LiveOrderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  restaurant: string;

  @ApiProperty()
  dish: string;

  @ApiProperty({ example: "Anonymous" })
  userName: string;

  @ApiProperty({ format: "date-time" })
  timestamp: string;
}

export class TrendingDishDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  dish: string;

  @ApiProperty()
  restaurantName: string;

  @ApiProperty()
  count: number;

  @ApiProperty({ enum: ["up", "stable"] })
  trend: "up" | "stable";
}

export class SocialFeedPostDto {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    followers: number;
    following: number;
    posts: number;
    isFollowing: boolean;
  };
  content: string;
  images: string[];
  restaurant: string;
  dish: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}
