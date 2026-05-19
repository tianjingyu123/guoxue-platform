import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards, Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { ContentService } from "./content.service";
import { SystemService } from "../system/system.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto } from "./content.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("内容管理")
@Controller("contents")
export class ContentController {
  private readonly logger = new Logger(ContentController.name);
  constructor(
    private content: ContentService,
    private systemService: SystemService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建内容" })
  @ApiBearerAuth()
  async create(@Body() dto: CreateContentDto, @Req() req: Request) {
    const result = await this.content.create(dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "CREATE",
      targetType: "CONTENT",
      targetId: result.id,
      detail: `创建内容: ${dto.title}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Get()
  @ApiOperation({ summary: "获取内容列表" })
  list(@Query() q: ContentListQueryDto) {
    return this.content.list(q);
  }

  // ───────── 诗词专属 ─────────

  @Get("poem/random")
  @ApiOperation({ summary: "随机获取一首诗词" })
  getRandomPoem() {
    return this.content.getRandomPoem();
  }

  @Get("poem/daily")
  @ApiOperation({ summary: "每日推荐诗词" })
  getDailyPoem() {
    return this.content.getDailyPoem();
  }

  @Get("poem/:id/appreciation")
  @ApiOperation({ summary: "获取诗词注释/赏析" })
  getPoemAppreciation(@Param("id") id: string) {
    return this.content.getPoemAppreciation(id);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取内容详情" })
  detail(@Param("id") id: string) {
    return this.content.detail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新内容" })
  @ApiBearerAuth()
  async update(@Param("id") id: string, @Body() dto: UpdateContentDto, @Req() req: Request) {
    const result = await this.content.update(id, dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "CONTENT",
      targetId: id,
      detail: `更新内容: ${dto.title || id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除内容（管理员）" })
  @ApiBearerAuth()
  async remove(@Param("id") id: string, @Req() req: Request) {
    const result = await this.content.remove(id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "DELETE",
      targetType: "CONTENT",
      targetId: id,
      detail: `删除内容: ${id}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  // ───────── 批量操作 & 统计 ─────────

  @Put("batch/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量更新内容状态" })
  @ApiBearerAuth()
  async batchUpdateStatus(@Body() dto: { ids: string[]; status: string }, @Req() req: Request) {
    const result = await this.content.batchUpdateStatus(dto.ids, dto.status);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "CONTENT",
      detail: `批量更新 ${dto.ids.length} 条内容状态为 ${dto.status}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    return result;
  }

  @Get("stats/overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "内容统计概览" })
  @ApiBearerAuth()
  getStats() {
    return this.content.getStats();
  }

  @Get("featured")
  @ApiOperation({ summary: "精选内容（按浏览量排序）" })
  getFeatured(@Query("type") type?: string) {
    return this.content.getFeatured(type);
  }
}
