import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { VideoService } from "./video.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("视频")
@Controller("videos")
export class VideoController {
  constructor(private svc: VideoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建视频" })
  @ApiBearerAuth()
  create(@Req() req: any, @Body() dto: any) {
    return this.svc.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "获取视频列表" })
  @ApiQuery({ name: "circleId", required: false, type: String, description: "圈子ID" })
  @ApiQuery({ name: "status", required: false, type: String, description: "视频状态" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  list(@Query("circleId") circleId?: string, @Query("status") status?: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.list({ circleId, status, page: +page, pageSize: +pageSize });
  }

  @Get(":id")
  @ApiOperation({ summary: "获取视频详情" })
  detail(@Param("id") id: string) {
    return this.svc.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新视频" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除视频" })
  @ApiBearerAuth()
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "点赞/取消点赞视频" })
  @ApiBearerAuth()
  like(@Param("id") id: string) {
    return this.svc.toggleLike(id);
  }
}
