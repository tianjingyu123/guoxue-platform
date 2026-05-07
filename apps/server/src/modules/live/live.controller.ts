import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { LiveService } from "./live.service";
import { CreateRoomDto, UpdateRoomDto } from "./live.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("直播")
@Controller("live")
export class LiveController {
  constructor(private svc: LiveService) {}

  @Post("rooms")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建直播间" })
  @ApiBearerAuth()
  createRoom(@Req() req: any, @Body() dto: CreateRoomDto) {
    return this.svc.createRoom(req.user.id, dto);
  }

  @Get("rooms")
  @ApiOperation({ summary: "获取直播间列表" })
  @ApiQuery({ name: "status", required: false, type: String, description: "直播状态" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  listRooms(@Query("status") status?: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listRooms(status, +page, +pageSize);
  }

  @Get("rooms/:id")
  @ApiOperation({ summary: "获取直播间详情" })
  getRoom(@Param("id") id: string) {
    return this.svc.getRoom(id);
  }

  @Put("rooms/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新直播间" })
  @ApiBearerAuth()
  updateRoom(@Param("id") id: string, @Body() dto: UpdateRoomDto) {
    return this.svc.updateRoom(id, dto);
  }

  @Put("rooms/:id/start")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "开始直播" })
  @ApiBearerAuth()
  startRoom(@Param("id") id: string, @Body() extra?: any) {
    return this.svc.updateStatus(id, "LIVING", extra);
  }

  @Put("rooms/:id/end")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "结束直播" })
  @ApiBearerAuth()
  endRoom(@Param("id") id: string) {
    return this.svc.endRoom(id);
  }

  @Put("rooms/:id/replay")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "设置直播回放" })
  @ApiBearerAuth()
  setReplay(@Param("id") id: string, @Body("replayUrl") replayUrl: string) {
    return this.svc.updateStatus(id, "REPLAY", { replayUrl });
  }

  @Delete("rooms/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除直播间" })
  @ApiBearerAuth()
  deleteRoom(@Param("id") id: string) {
    return this.svc.deleteRoom(id);
  }
}
