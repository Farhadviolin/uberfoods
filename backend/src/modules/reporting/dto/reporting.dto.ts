import { ApiProperty } from "@nestjs/swagger";

export class ReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ required: false, nullable: true })
  lastRun: string | null;

  @ApiProperty()
  status: string;
}

export class DashboardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  widgetCount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ required: false, nullable: true })
  lastViewed: string | null;
}

export class ScheduledReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reportName: string;

  @ApiProperty()
  schedule: string;

  @ApiProperty()
  format: string;

  @ApiProperty({ type: [String] })
  recipients: string[];

  @ApiProperty({ required: false, nullable: true })
  nextRun: string | null;

  @ApiProperty()
  status: string;
}
