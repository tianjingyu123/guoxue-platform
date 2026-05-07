import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { VideoService } from "./video.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("videos")
export class VideoController {
  constructor(private svc: VideoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: any) {
    return this.svc.create(req.user.id, dto);
  }

  @Get()
  list(@Query("circleId") circleId?: string, @Query("status") status?: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.list({ circleId, status, page: +page, pageSize: +pageSize });
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.svc.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  like(@Param("id") id: string) {
    return this.svc.toggleLike(id);
  }
}
