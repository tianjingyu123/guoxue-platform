import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { LiveService } from "./live.service";
import { CreateRoomDto, UpdateRoomDto } from "./live.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("live")
export class LiveController {
  constructor(private svc: LiveService) {}

  @Post("rooms")
  @UseGuards(JwtAuthGuard)
  createRoom(@Req() req: any, @Body() dto: CreateRoomDto) {
    return this.svc.createRoom(req.user.id, dto);
  }

  @Get("rooms")
  listRooms(@Query("status") status?: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listRooms(status, +page, +pageSize);
  }

  @Get("rooms/:id")
  getRoom(@Param("id") id: string) {
    return this.svc.getRoom(id);
  }

  @Put("rooms/:id")
  @UseGuards(JwtAuthGuard)
  updateRoom(@Param("id") id: string, @Body() dto: UpdateRoomDto) {
    return this.svc.updateRoom(id, dto);
  }

  @Put("rooms/:id/start")
  @UseGuards(JwtAuthGuard)
  startRoom(@Param("id") id: string, @Body() extra?: any) {
    return this.svc.updateStatus(id, "LIVING", extra);
  }

  @Put("rooms/:id/end")
  @UseGuards(JwtAuthGuard)
  endRoom(@Param("id") id: string) {
    return this.svc.endRoom(id);
  }

  @Put("rooms/:id/replay")
  @UseGuards(JwtAuthGuard)
  setReplay(@Param("id") id: string, @Body("replayUrl") replayUrl: string) {
    return this.svc.updateStatus(id, "REPLAY", { replayUrl });
  }

  @Delete("rooms/:id")
  @UseGuards(JwtAuthGuard)
  deleteRoom(@Param("id") id: string) {
    return this.svc.deleteRoom(id);
  }
}
