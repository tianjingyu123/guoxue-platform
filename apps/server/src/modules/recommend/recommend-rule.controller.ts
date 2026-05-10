import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
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
  constructor(
    private prisma: PrismaService,
    private ruleService: RuleService,
  ) {}

  @Get()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有推荐规则" })
  async list() {
    return this.prisma.recommendRule.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取规则详情" })
  async detail(@Param("id") id: string) {
    return this.prisma.recommendRule.findUniqueOrThrow({ where: { id } });
  }

  @Post()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建推荐规则" })
  async create(@Body() dto: CreateRecommendRuleDto) {
    const rule = await this.prisma.recommendRule.create({
      data: {
        scene: dto.scene ?? "ALL",
        targetType: dto.targetType,
        targetId: dto.targetId,
        ruleType: dto.ruleType,
        ruleValue: dto.ruleValue,
        priority: dto.priority ?? 0,
        conditionJson: dto.conditionJson,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        remark: dto.remark,
        createdBy: dto.createdBy ?? "admin",
      },
    });

    await this.ruleService.clearCache();
    return rule;
  }

  @Put(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新推荐规则" })
  async update(@Param("id") id: string, @Body() dto: UpdateRecommendRuleDto) {
    const rule = await this.prisma.recommendRule.update({
      where: { id },
      data: {
        scene: dto.scene,
        targetType: dto.targetType,
        targetId: dto.targetId,
        ruleType: dto.ruleType,
        ruleValue: dto.ruleValue,
        priority: dto.priority,
        conditionJson: dto.conditionJson,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        remark: dto.remark,
      },
    });

    await this.ruleService.clearCache();
    return rule;
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除推荐规则" })
  async delete(@Param("id") id: string) {
    await this.prisma.recommendRule.delete({ where: { id } });
    await this.ruleService.clearCache();
    return { success: true };
  }
}
