import { ApiProperty } from "@nestjs/swagger";

export class WorkflowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: Object, required: false })
  trigger: unknown | null;

  @ApiProperty()
  actionCount: number;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  executionCount: number;

  @ApiProperty({ required: false, nullable: true })
  lastExecuted: string | null;
}

export class RuleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  condition: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  executionCount: number;

  @ApiProperty({ required: false, nullable: true })
  lastExecuted: string | null;
}

export class TriggerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  activeWorkflows: number;

  @ApiProperty({ required: false, nullable: true })
  lastFired: string | null;
}

export class ScheduledTaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  schedule: string;

  @ApiProperty({ required: false, nullable: true })
  nextRun: string | null;

  @ApiProperty()
  status: string;
}

export class ExecutionLogDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  details: string;
}
