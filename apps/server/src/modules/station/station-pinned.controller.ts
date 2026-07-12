import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { StationPinnedService } from "./station-pinned.service";
import { CatalogQueryDto, SavePinnedBatchDto } from "./station-pinned.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StationMasterGuard } from "../../common/station-master.guard";

/**
 * 分站主推位（S2 主推位管理面板 + S3 选品库 + S1 汇总）
 * 全部接口需登录且为该分站站长（StationMasterGuard 校验 param.stationId 归属）。
 */
@ApiTags("分站主推位")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StationMasterGuard)
@Controller("station-pinned")
export class StationPinnedController {
  constructor(private svc: StationPinnedService) {}

  @Get(":stationId/summary")
  @ApiOperation({ summary: "S1 工作台：9 板块主推位数量汇总" })
  getSummary(@Param("stationId") stationId: string) {
    return this.svc.getSummary(stationId);
  }

  @Get(":stationId/catalog")
  @ApiOperation({ summary: "S3 选品库列表（按板块/首页跨类别/直播特殊）" })
  getCatalog(@Param("stationId") stationId: string, @Query() query: CatalogQueryDto) {
    return this.svc.getCatalog(stationId, query);
  }

  @Get(":stationId")
  @ApiOperation({ summary: "S2 读取 9 板块 × 6 位主推位（已锁位带内容详情）" })
  getBoards(@Param("stationId") stationId: string) {
    return this.svc.getBoards(stationId);
  }

  @Put(":stationId/batch")
  @ApiOperation({ summary: "S2 保存某板块全部主推位（快照式覆盖写）" })
  saveBatch(@Param("stationId") stationId: string, @Body() dto: SavePinnedBatchDto, @Req() req: any) {
    return this.svc.saveBatch(stationId, req.user?.id, dto);
  }

  @Delete(":stationId/:board/:slotIndex")
  @ApiOperation({ summary: "S2 清空某个主推位" })
  removeSlot(
    @Param("stationId") stationId: string,
    @Param("board") board: string,
    @Param("slotIndex", ParseIntPipe) slotIndex: number,
  ) {
    return this.svc.removeSlot(stationId, board, slotIndex);
  }
}
