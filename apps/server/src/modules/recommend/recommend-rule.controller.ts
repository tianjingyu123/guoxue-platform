import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
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
  list() {
    return this.ruleService.listRules();
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取规则详情" })
  detail(@Param("id") id: string) {
    return this.ruleService.getRule(id);
  }

  @Post()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建推荐规则" })
  create(@Body() dto: CreateRecommendRuleDto) {
    return this.ruleService.createRule(dto);
  }

  @Put(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新推荐规则" })
  update(@Param("id") id: string, @Body() dto: UpdateRecommendRuleDto) {
    return this.ruleService.updateRule(id, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除推荐规则" })
  delete(@Param("id") id: string) {
    return this.ruleService.deleteRule(id);
  }
}
