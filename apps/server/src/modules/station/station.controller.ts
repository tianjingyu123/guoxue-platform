import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { StationService } from "./station.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("station")
export class StationController {
  constructor(private svc: StationService) {}

  // 分站
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  createStation(@Req() req: any, @Body() dto: any) {
    return this.svc.createStation(req.user.id, dto);
  }

  @Get()
  listStations(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listStations(+page, +pageSize);
  }

  @Get(":id")
  getStation(@Param("id") id: string) {
    return this.svc.getStation(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  updateStation(@Param("id") id: string, @Body() dto: any) {
    return this.svc.updateStation(id, dto);
  }

  @Get(":id/earnings")
  getEarnings(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getStationEarnings(id, +page, +pageSize);
  }

  // 运营商
  @Post("operator")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  createOperator(@Req() req: any, @Body() dto: any) {
    return this.svc.createOperator(req.user.id, dto);
  }

  @Get("operator/list")
  listOperators(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listOperators(+page, +pageSize);
  }
}
