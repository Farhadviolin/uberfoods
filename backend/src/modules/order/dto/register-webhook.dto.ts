import {
  IsString,
  IsUrl,
  IsArray,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterWebhookDto {
  @ApiProperty({
    description: "Webhook URL to receive order events",
    example: "https://example.com/webhooks/orders",
  })
  @IsUrl({}, { message: "URL must be a valid URL" })
  url: string;

  @ApiPropertyOptional({
    description: "Secret key for webhook signature verification",
    example: "your-secret-key",
  })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({
    description: "List of events to subscribe to",
    example: ["order.created", "order.status.updated", "order.driver.assigned"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    description: "Whether the webhook is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
