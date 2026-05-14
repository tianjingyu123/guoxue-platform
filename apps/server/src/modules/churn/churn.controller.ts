import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ChurnService } from "./churn.service";
import { CreateChurnRuleDto, UpdateChurnRuleDto } from "./churn.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("流失预警")
@Controller()
export class ChurnController {
  constructor(private svc: ChurnService) {}

  @Get("admin/churn/predictions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "流失预测列表" })
  listPredictions(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("riskLevel") riskLevel?: string) {
    return this.svc.getPredictions(page ? +page : 1, pageSize ? +pageSize : 20, riskLevel);
  }

  @Get("admin/churn/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "流失统计" })
  getStats() { return this.svc.getStats(); }

  @Post("admin/churn/calculate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "手动执行流失评分" })
  manualCalculate() { return this.svc.manualCalculate(); }

  @Get("admin/churn/rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "召回规则列表" })
  listRules() { return this.svc.listRules(); }

  @Post("admin/churn/rules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建召回规则" })
  createRule(@Body() dto: CreateChurnRuleDto) { return this.svc.createRule(dto); }

  @Put("admin/churn/rules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新召回规则" })
  updateRule(@Param("id") id: string, @Body() dto: UpdateChurnRuleDto) { return this.svc.updateRule(id, dto); }

  @Delete("admin/churn/rules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除召回规则" })
  deleteRule(@Param("id") id: string) { return this.svc.deleteRule(id); }

  @Get("admin/churn/actions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "召回动作记录" })
  listActions(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("status") status?: string) {
    return this.svc.listActions(page ? +page : 1, pageSize ? +pageSize : 20, status);
  }
}
