import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { StationPickService } from "./station-pick.service";
import { AddStationPickDto, ReorderPicksDto, StationPickConfigDto } from "./station-pick.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StationMasterGuard } from "../../common/station-master.guard";

@ApiTags("站长精选")
@Controller("station-pick")
export class StationPickController {
  constructor(private svc: StationPickService) {}

  @Get(":stationId/items")
  @ApiOperation({ summary: "获取分站精选内容列表（公开）" })
  getItems(@Param("stationId") stationId: string) {
    return this.svc.getItems(stationId);
  }

  @Post(":stationId/items")
  @UseGuards(JwtAuthGuard, StationMasterGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "添加精选内容" })
  addPick(@Param("stationId") stationId: string, @Body() dto: AddStationPickDto) {
    return this.svc.addPick(stationId, dto);
  }

  @Delete(":stationId/items/:pickId")
  @UseGuards(JwtAuthGuard, StationMasterGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "移除精选内容" })
  removePick(@Param("stationId") stationId: string, @Param("pickId") pickId: string) {
    return this.svc.removePick(stationId, pickId);
  }

  @Put(":stationId/items/reorder")
  @UseGuards(JwtAuthGuard, StationMasterGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "批量调整排序" })
  reorderPicks(@Param("stationId") stationId: string, @Body() dto: ReorderPicksDto) {
    return this.svc.reorderPicks(stationId, dto.items);
  }

  @Get(":stationId/quota")
  @UseGuards(JwtAuthGuard, StationMasterGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查看配额使用情况" })
  getQuota(@Param("stationId") stationId: string) {
    return this.svc.getQuota(stationId);
  }

  // ───────── 管理员接口 ─────────

  @Get("admin/:stationId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理员查看分站精选" })
  adminGetPicks(@Param("stationId") stationId: string) {
    return this.svc.adminGetPicks(stationId);
  }

  @Delete("admin/:stationId/items/:pickId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理员强制删除精选" })
  adminRemovePick(@Param("pickId") pickId: string) {
    return this.svc.adminRemovePick(pickId);
  }

  @Put("admin/:stationId/config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理员修改精选配置" })
  adminSetConfig(@Param("stationId") stationId: string, @Body() config: StationPickConfigDto) {
    return this.svc.adminSetConfig(stationId, config as Record<string, any>);
  }
}
