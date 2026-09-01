import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { AiEventBusService } from "./ai-event-bus.service";
import { QueryEventDto } from "./dto/ai-infra.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("🤖 AI事件总线")
@Controller("ai/events")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class AiEventBusController {
  constructor(private readonly eventBus: AiEventBusService) {}

  @Get()
  @ApiOperation({ summary: "查询事件历史" })
  @ApiResponse({ status: 200, description: "成功" })
  async query(@Query() dto: QueryEventDto) {
    return this.eventBus.query({
      type: dto.type,
      source: dto.source,
      severity: dto.severity,
      status: dto.status,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      limit: dto.limit ? Number(dto.limit) : 50,
      offset: dto.offset ? Number(dto.offset) : 0,
    });
  }

  @Get("stats")
  @ApiOperation({ summary: "事件总线统计" })
  @ApiResponse({ status: 200, description: "成功" })
  async getStats() {
    const [stats, pending, count24h] = await Promise.all([
      this.eventBus.getStats(),
      this.eventBus.getPendingCount(),
      this.eventBus.get24hEventCount(),
    ]);
    return { ...stats, pending, count24h };
  }

}
