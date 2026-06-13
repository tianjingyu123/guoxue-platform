import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { RuleService } from "./services/rule.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateRecommendRuleDto, UpdateRecommendRuleDto } from "./recommend.dto";

@ApiTags("推荐运营")
@Controller("admin/recommend/rules")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecommendRuleController {
  constructor(private ruleService: RuleService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有推荐规则" })
  @ApiResponse({ status: 200, description: "成功" })
  list() {
    return this.ruleService.listRules();
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取规则详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  detail(@Param("id") id: string) {
    return this.ruleService.getRule(id);
  }

  @Post()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建推荐规则" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Body() dto: CreateRecommendRuleDto) {
    return this.ruleService.createRule(dto);
  }

  @Put(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新推荐规则" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateRecommendRuleDto) {
    return this.ruleService.updateRule(id, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除推荐规则" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Param("id") id: string) {
    return this.ruleService.deleteRule(id);
  }
}
