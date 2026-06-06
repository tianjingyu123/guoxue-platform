import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("圈子收益分账")
@Controller("circles")
export class CircleRevenueController {
  constructor(private prisma: PrismaService) {}

  /** 圈主查看分账方案 */
  @Get(":circleId/revenue-splits")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查看圈子分账方案" })
  async listSplits(@Param("circleId") circleId: string, @Req() req: Request) {
    await this.ensureOwner(circleId, req.user?.id);
    return this.prisma.circleRevenueSplit.findMany({
      where: { circleId },
      include: { guest: { select: { id: true, nickname: true, avatar: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /** 圈主给嘉宾设置分账比例 */
  @Post(":circleId/revenue-splits")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "设置嘉宾分账比例" })
  async setSplit(
    @Param("circleId") circleId: string,
    @Body() body: { guestId: string; scene: string; splitRate: number },
    @Req() req: Request,
  ) {
    await this.ensureOwner(circleId, req.user?.id);
    if (body.splitRate < 0 || body.splitRate > 1) throw new Error("比例必须在 0-1 之间");

    return this.prisma.circleRevenueSplit.upsert({
      where: { circleId_guestId_scene: { circleId, guestId: body.guestId, scene: body.scene || "ALL" } },
      create: { circleId, guestId: body.guestId, scene: body.scene || "ALL", splitRate: body.splitRate },
      update: { splitRate: body.splitRate, status: "ACTIVE" },
    });
  }

  /** 圈主删除分账 */
  @Delete(":circleId/revenue-splits/:splitId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除嘉宾分账方案" })
  async deleteSplit(
    @Param("circleId") circleId: string,
    @Param("splitId") splitId: string,
    @Req() req: Request,
  ) {
    await this.ensureOwner(circleId, req.user?.id);
    await this.prisma.circleRevenueSplit.update({ where: { id: splitId }, data: { status: "DISABLED" } });
    return { success: true };
  }

  /** 圈主查看收益明细 */
  @Get(":circleId/revenue-records")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "圈子收益明细" })
  async revenueRecords(@Param("circleId") circleId: string, @Req() req: Request) {
    await this.ensureOwner(circleId, req.user?.id);
    return this.prisma.circleRevenueRecord.findMany({
      where: { circleId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /** 嘉宾查看自己的收益 */
  @Get(":circleId/my-earnings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "嘉宾查看自己的收益" })
  async myEarnings(@Param("circleId") circleId: string, @Req() req: Request) {
    return this.prisma.circleGuestEarning.findMany({
      where: { circleId, guestId: req.user?.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  private async ensureOwner(circleId: string, userId?: string) {
    if (!userId) throw new Error("未登录");
    const member = await this.prisma.circleMember.findFirst({
      where: { circleId, userId, role: { in: ["owner", "admin"] } },
    });
    if (!member) throw new Error("只有圈主或管理员可以操作");
  }
}
