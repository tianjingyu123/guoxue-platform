import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

/** 可申请的功能权限类型 */
const CAPABILITY_TYPES = ["LIVE", "VIDEO_UPLOAD", "AUDIO_CALL", "VIDEO_CALL", "PAID_QA", "VOICE_QA"] as const;

@ApiTags("功能权限")
@Controller("capabilities")
export class CapabilityController {
  constructor(private prisma: PrismaService) {}

  /** 圈主申请开通功能 */
  @Post("request")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "申请开通高级功能" })
  async request(@Body() body: { type: string; reason: string }, @Req() req: Request) {
    const userId = req.user?.id;
    if (!userId) throw new Error("未登录");
    if (!CAPABILITY_TYPES.includes(body.type as any)) throw new Error(`不支持的功能类型: ${body.type}`);

    // 检查是否已有申请
    const existing = await this.prisma.capabilityRequest.findFirst({
      where: { userId, type: body.type, status: "PENDING" },
    });
    if (existing) return { message: "已有待审核的申请，请勿重复提交", data: existing };

    const req2 = await this.prisma.capabilityRequest.create({
      data: { userId, type: body.type, reason: body.reason || "" },
    });
    return { code: 200, data: req2, message: "申请已提交，等待审核" };
  }

  /** 用户查看自己的申请状态 */
  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的功能申请" })
  async myRequests(@Req() req: Request) {
    return this.prisma.capabilityRequest.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: "desc" },
    });
  }

  /** 管理员查看待审核申请 */
  @Get("pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "待审核的功能申请（管理员）" })
  async pending() {
    return this.prisma.capabilityRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, nickname: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /** 管理员审批 */
  @Post("review/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "审批功能申请（管理员）" })
  async review(
    @Param("id") id: string,
    @Body() body: { approved: boolean; note?: string },
    @Req() req: Request,
  ) {
    const updated = await this.prisma.capabilityRequest.update({
      where: { id },
      data: {
        status: body.approved ? "APPROVED" : "REJECTED",
        reviewedBy: req.user?.id,
        reviewNote: body.note,
        reviewedAt: new Date(),
      },
    });
    return { code: 200, data: updated, message: body.approved ? "已批准" : "已拒绝" };
  }
}
