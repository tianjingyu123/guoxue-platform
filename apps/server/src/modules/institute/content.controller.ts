import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { InstituteContentService } from "./content.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateInstituteContentDto, UpdateInstituteContentDto } from "./dto/content.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("研究院内容资产")
@Controller("admin/institute/contents")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstituteContentController {
  constructor(private readonly svc: InstituteContentService) {}

  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Body() dto: CreateInstituteContentDto, @Req() req: Request) {
    const u = req.user as { id: string };
    return this.svc.create(dto, u.id);
  }

  @Get()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "内容列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "instituteId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  list(
    @Query("instituteId") instituteId?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.list({ instituteId, status, page: +page, pageSize: +pageSize });
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "内容统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "instituteId", required: false })
  getStats(@Query("instituteId") instituteId?: string) {
    return this.svc.getStats(instituteId);
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "内容详情（含购买记录）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  @Put(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新内容" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateInstituteContentDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "归档内容" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Get(":id/purchases")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "购买记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getPurchases(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getPurchaseRecords(id, +page, +pageSize);
  }
}

/**
 * C 端·大师讲堂付费知识库（T9-P0b）
 * 列表/详情公开（OptionalAuth 附带已购标记），购买需登录（国学币原子扣减）。
 */
@ApiTags("研究院内容资产")
@Controller("institute/contents")
export class InstituteContentPublicController {
  constructor(private readonly svc: InstituteContentService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "大师讲堂内容列表（公开·仅已发布）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: false, description: "ARTICLE/VIDEO/DOCUMENT" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  list(
    @Req() req: Request,
    @Query("type") type?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.svc.listPublic({ type, page: +page || 1, pageSize: Math.min(+pageSize || 20, 50) }, userId);
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "内容详情（未购试读/已购全量）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  detail(@Req() req: Request, @Param("id") id: string) {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.svc.getPublic(id, userId);
  }

  @Post(":id/purchase")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "购买内容（国学币扣减·已购永久可读）" })
  @ApiResponse({ status: 201, description: "购买成功" })
  @ApiResponse({ status: 400, description: "余额不足/免费内容无需购买" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 409, description: "重复购买" })
  purchase(@Req() req: Request, @Param("id") id: string) {
    const u = req.user as { id: string };
    return this.svc.purchase(id, u.id);
  }
}
