import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { PromotionService } from "./promotion.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CreateMaterialDto } from "./dto/promotion.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("推广素材库")
@Controller("station/promotion")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PromotionController {
  constructor(private readonly svc: PromotionService) {}

  @Get("materials")
  @ApiOperation({ summary: "素材列表（按类型/标签筛选）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权访问该分站的推广素材" })
  @ApiQuery({ name: "stationId", required: true })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "tags", required: false })
  listMaterials(
    @Req() req: Request,
    @Query("stationId") stationId: string,
    @Query("type") type?: string,
    @Query("tags") tags?: string,
  ) {
    const tagArr = tags?.split(",").filter(Boolean);
    return this.svc.listMaterials(stationId, req.user.id, type, tagArr);
  }

  @Post("materials")
  @ApiOperation({ summary: "上传/创建素材" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 403, description: "仅分站主可操作" })
  create(@Req() req: Request, @Body() dto: CreateMaterialDto) {
    // stationId 由 service 据 req.user.id 反查，忽略入参中的 stationId，防止越权注入
    return this.svc.create(req.user.id, dto);
  }

  @Get("materials/:id")
  @ApiOperation({ summary: "素材详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 403, description: "无权操作该素材" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getDetail(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getDetail(id, req.user.id);
  }

  @Delete("materials/:id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除素材" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 403, description: "无权操作该素材" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Param("id") id: string, @Req() req: Request) {
    return this.svc.delete(id, req.user.id);
  }

  @Post("materials/:id/use")
  @ApiOperation({ summary: "记录素材使用" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 403, description: "无权操作该素材" })
  recordUse(@Param("id") id: string, @Req() req: Request) {
    return this.svc.recordUse(id, req.user.id);
  }
}
