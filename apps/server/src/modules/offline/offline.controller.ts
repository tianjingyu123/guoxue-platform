import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { OfflineService } from "./offline.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("线下活动")
@Controller("offline")
export class OfflineController {
  constructor(private svc: OfflineService) {}

  // 线下驿站
  @Post("stations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建线下驿站" })
  @ApiBearerAuth()
  createStation(@Req() req: any, @Body() dto: any) {
    return this.svc.createStation(dto, req.user.id);
  }

  @Get("stations")
  @ApiOperation({ summary: "获取线下驿站列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "city", required: false, type: String, description: "城市" })
  @ApiQuery({ name: "status", required: false, type: String, description: "状态" })
  listStations(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("city") city?: string, @Query("status") status?: string) {
    return this.svc.listStations(+page, +pageSize, city, status);
  }

  @Get("stations/:id")
  @ApiOperation({ summary: "获取线下驿站详情" })
  getStation(@Param("id") id: string) {
    return this.svc.getStation(id);
  }

  @Put("stations/:id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核线下驿站" })
  @ApiBearerAuth()
  auditStation(@Param("id") id: string, @Body("status") status: string) {
    return this.svc.auditStation(id, status);
  }

  // 线下课程
  @Post("courses")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建线下课程" })
  @ApiBearerAuth()
  createCourse(@Body() dto: any) {
    return this.svc.createOfflineCourse(dto);
  }

  @Get("courses")
  @ApiOperation({ summary: "获取线下课程列表" })
  @ApiQuery({ name: "stationId", required: true, type: String, description: "驿站ID" })
  listCourses(@Query("stationId") stationId: string) {
    return this.svc.listOfflineCourses(stationId);
  }

  // 研究院
  @Get("institute/members")
  @ApiOperation({ summary: "获取研究院成员列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listInstituteMembers(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listMembers(+page, +pageSize);
  }

  @Put("institute/members/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新研究院成员信息" })
  @ApiBearerAuth()
  updateInstituteMember(@Param("id") id: string, @Body() dto: any) {
    return this.svc.updateMember(id, dto);
  }
}
