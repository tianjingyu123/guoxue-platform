import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AnomalyDetectorService } from "./anomaly-detector.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("🤖 AI异常检测")
@Controller("ai/anomalies")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class AnomalyDetectorController {
  constructor(private readonly detector: AnomalyDetectorService) {}

  @Post("check")
  @ApiOperation({ summary: "立即运行所有检测规则" })
  async runAll() {
    const reports = await this.detector.runAllRules();
    const aiReport = await this.detector.generateReport(reports);
    return { reports, aiReport };
  }

  @Post("check/:ruleId")
  @ApiOperation({ summary: "运行单条检测规则" })
  async runRule(@Param("ruleId") ruleId: string) {
    const report = await this.detector.runRule(ruleId);
    return { report };
  }

  @Get("rules")
  @ApiOperation({ summary: "获取所有检测规则" })
  async getRules() {
    return this.detector.getRules();
  }

  @Post("rules")
  @ApiOperation({ summary: "注册/更新检测规则" })
  async registerRule(
    @Body()
    body: {
      id: string;
      metric: string;
      dimension: "revenue" | "user" | "content" | "performance";
      baselineWindow: number;
      deviationThreshold: number;
      severity: "info" | "warning" | "critical";
      enabled: boolean;
    },
  ) {
    this.detector.registerRule(body);
    return { success: true };
  }
}
