import { IsNotEmpty, IsEnum } from "class-validator";

export class SetOrderPriorityDto {
  @IsNotEmpty()
  @IsEnum(["low", "normal", "high", "urgent"])
  priority: "low" | "normal" | "high" | "urgent";

  @IsNotEmpty()
  @IsEnum([
    "time_critical",
    "vip_customer",
    "high_value",
    "emergency",
    "manual",
  ])
  reason:
    | "time_critical"
    | "vip_customer"
    | "high_value"
    | "emergency"
    | "manual";
}
