import { Controller, Get, Delete, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { BrowseHistoryService } from "./browse-history.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { BrowseHistoryQueryDto } from "./browse-history.dto";

@ApiTags("浏览历史")
@Controller("users/me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BrowseHistoryController {
  constructor(private readonly svc: BrowseHistoryService) {}

  @Get("history")
  @ApiOperation({ summary: "获取浏览历史（分页+按类型筛选）" })
  list(@Req() req: Request, @Query() query: BrowseHistoryQueryDto) {
    return this.svc.list(req.user.id, query);
  }

  @Delete("history/:id")
  @ApiOperation({ summary: "删除单条浏览历史" })
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.svc.remove(req.user.id, id);
  }

  @Delete("history")
  @ApiOperation({ summary: "清空全部浏览历史" })
  clearAll(@Req() req: Request) {
    return this.svc.clearAll(req.user.id);
  }
}
