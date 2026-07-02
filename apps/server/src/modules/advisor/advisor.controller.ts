import { Controller, Get, Post, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { AdvisorService } from "./advisor.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@ApiTags("智能商业顾问")
@Controller("advisor")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvisorController {
  constructor(
    private readonly svc: AdvisorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("insights")
  @ApiOperation({ summary: "拉取当前用户指定角色的经营建议（主体由服务端解析）" })
  @ApiQuery({ name: "roleType", required: true, description: "STATION_MASTER / STATION_OFFLINE_OWNER" })
  @ApiResponse({ status: 200, description: "成功" })
  async list(@Req() req: Request, @Query("roleType") roleType: string) {
    return this.svc.listInsights(req.user.id, roleType || "");
  }

  @Post("insights/:id/read")
  @ApiOperation({ summary: "标记建议已读" })
  @ApiResponse({ status: 200, description: "成功" })
  async read(@Req() req: Request, @Param("id") id: string) {
    return this.svc.transition(req.user.id, id, "read");
  }

  @Post("insights/:id/act")
  @ApiOperation({ summary: "标记建议已采纳（供效果回访与规则命中率统计）" })
  @ApiResponse({ status: 200, description: "成功" })
  async act(@Req() req: Request, @Param("id") id: string) {
    return this.svc.transition(req.user.id, id, "act");
  }

  @Post("insights/:id/dismiss")
  @ApiOperation({ summary: "忽略建议" })
  @ApiResponse({ status: 200, description: "成功" })
  async dismiss(@Req() req: Request, @Param("id") id: string) {
    return this.svc.transition(req.user.id, id, "dismiss");
  }

  @Post("evaluate")
  @ApiOperation({ summary: "手动触发全量评估（仅超管，验证/演示用）" })
  @ApiResponse({ status: 200, description: "成功" })
  async evaluate(@Req() req: Request) {
    const admin = await this.prisma.userRole.findFirst({
      where: { userId: req.user.id, roleType: "SUPER_ADMIN" },
    });
    if (!admin) throw new BusinessException(ErrorCode.FORBIDDEN, "仅超级管理员可手动触发评估");
    return this.svc.evaluateAll();
  }
}
