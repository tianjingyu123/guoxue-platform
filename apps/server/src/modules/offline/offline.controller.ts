import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { OfflineService } from "./offline.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("offline")
export class OfflineController {
  constructor(private svc: OfflineService) {}

  // 线下驿站
  @Post("stations")
  @UseGuards(JwtAuthGuard)
  createStation(@Req() req: any, @Body() dto: any) {
    return this.svc.createStation(dto, req.user.id);
  }

  @Get("stations")
  listStations(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("city") city?: string, @Query("status") status?: string) {
    return this.svc.listStations(+page, +pageSize, city, status);
  }

  @Get("stations/:id")
  getStation(@Param("id") id: string) {
    return this.svc.getStation(id);
  }

  @Put("stations/:id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  auditStation(@Param("id") id: string, @Body("status") status: string) {
    return this.svc.auditStation(id, status);
  }

  // 线下课程
  @Post("courses")
  @UseGuards(JwtAuthGuard)
  createCourse(@Body() dto: any) {
    return this.svc.createOfflineCourse(dto);
  }

  @Get("courses")
  listCourses(@Query("stationId") stationId: string) {
    return this.svc.listOfflineCourses(stationId);
  }

  // 研究院
  @Get("institute/members")
  listInstituteMembers(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listMembers(+page, +pageSize);
  }

  @Put("institute/members/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  updateInstituteMember(@Param("id") id: string, @Body() dto: any) {
    return this.svc.updateMember(id, dto);
  }
}
