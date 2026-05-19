import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { PromotionService } from "./promotion.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CreateMaterialDto } from "./dto/promotion.dto";

@ApiTags("推广素材库")
@Controller("station/promotion")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PromotionController {
  constructor(private readonly svc: PromotionService) {}

  @Get("materials")
  @ApiOperation({ summary: "素材列表（按类型/标签筛选）" })
  @ApiQuery({ name: "stationId", required: true })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "tags", required: false })
  listMaterials(@Query("stationId") stationId: string, @Query("type") type?: string, @Query("tags") tags?: string) {
    const tagArr = tags?.split(",").filter(Boolean);
    return this.svc.listMaterials(stationId, type, tagArr);
  }

  @Post("materials")
  @ApiOperation({ summary: "上传/创建素材" })
  create(@Body() dto: CreateMaterialDto) {
    return this.svc.create(dto);
  }

  @Get("materials/:id")
  @ApiOperation({ summary: "素材详情" })
  getDetail(@Param("id") id: string) {
    return this.svc.getDetail(id);
  }

  @Delete("materials/:id")
  @ApiOperation({ summary: "删除素材" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Post("materials/:id/use")
  @ApiOperation({ summary: "记录素材使用" })
  recordUse(@Param("id") id: string) {
    return this.svc.recordUse(id);
  }
}
