import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ContentService } from "./content.service";
import { SystemService } from "../system/system.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto } from "./content.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("内容管理")
@Controller("contents")
export class ContentController {
  constructor(
    private content: ContentService,
    private systemService: SystemService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建内容" })
  @ApiBearerAuth()
  async create(@Body() dto: CreateContentDto, @Req() req: any) {
    const result = await this.content.create(dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "CREATE",
      targetType: "CONTENT",
      targetId: result.id,
      detail: `创建内容: ${dto.title}`,
      ip: req.ip,
    }).catch(() => {});
    return result;
  }

  @Get()
  @ApiOperation({ summary: "获取内容列表" })
  list(@Query() q: ContentListQueryDto) {
    return this.content.list(q);
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
  async update(@Param("id") id: string, @Body() dto: UpdateContentDto, @Req() req: any) {
    const result = await this.content.update(id, dto);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "CONTENT",
      targetId: id,
      detail: `更新内容: ${dto.title || id}`,
      ip: req.ip,
    }).catch(() => {});
    return result;
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除内容（管理员）" })
  @ApiBearerAuth()
  async remove(@Param("id") id: string, @Req() req: any) {
    const result = await this.content.remove(id);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "DELETE",
      targetType: "CONTENT",
      targetId: id,
      detail: `删除内容: ${id}`,
      ip: req.ip,
    }).catch(() => {});
    return result;
  }
}
