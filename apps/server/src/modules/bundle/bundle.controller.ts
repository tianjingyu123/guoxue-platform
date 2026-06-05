import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { BundleService } from "./bundle.service";
import { CreateBundleDto, UpdateBundleDto, BundleQueryDto } from "./bundle.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("课程组合包")
@Controller("bundles")
export class BundleController {
  constructor(
    private readonly svc: BundleService,
    private readonly prisma: PrismaService,
  ) {}

  // ── 管理端 CRUD ──

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建组合包" })
  create(@Body() dto: CreateBundleDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "组合包列表（可按类型/目标筛选）" })
  list(@Query() query: BundleQueryDto) {
    return this.svc.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "组合包详情（含组合项）" })
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新组合包" })
  update(@Param("id") id: string, @Body() dto: UpdateBundleDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除组合包" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  // ── 领取 ──

  @Post(":id/claim")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "分站/运营商领取免费组合包" })
  async claim(@Req() req: Request, @Param("id") bundleId: string) {
    const userId = (req.user as any).id;

    // 先尝试分站
    const station = await this.prisma.station.findFirst({ where: { userId }, select: { id: true } });
    if (station) return this.svc.claimByStation(station.id, bundleId);

    // 再尝试运营商
    const operator = await this.prisma.operator.findFirst({ where: { userId }, select: { id: true } });
    if (operator) return this.svc.claimByOperator(operator.id, bundleId);

    throw new BusinessException(ErrorCode.FORBIDDEN, "当前用户不是分站站长或运营商");
  }

  @Get("my/claimed")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我领取的组合包" })
  async getMyClaimed(@Req() req: Request) {
    const userId = (req.user as any).id;

    const station = await this.prisma.station.findFirst({ where: { userId }, select: { id: true } });
    if (station) return this.svc.getMyStationBundles(station.id);

    const operator = await this.prisma.operator.findFirst({ where: { userId }, select: { id: true } });
    if (operator) return this.svc.getMyOperatorBundles(operator.id);

    return [];
  }
}
