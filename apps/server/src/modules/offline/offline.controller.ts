import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { OfflineService } from "./offline.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import {
  CreateStationDto, CreateOfflineCourseDto, UpdateMemberDto, AuditStationDto,
  SignInCourseDto,
  CreateProductDto, UpdateProductDto,
  CreateTeacherBookingDto,
  CreateStationOrderDto, CreateSettlementDto,
  AuditCourseDto,
} from "./offline.dto";
import { CreateTeacherDto, UpdateTeacherDto, SetAvailabilityDto } from "./dto/teacher.dto";

@ApiTags("线下驿站")
@Controller("offline")
export class OfflineController {
  constructor(private svc: OfflineService) {}

  // ───────── 线下驿站 CRUD ─────────

  @Post("stations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建线下驿站" })
  @ApiBearerAuth()
  createStation(@Req() req: Request, @Body() dto: CreateStationDto) {
    return this.svc.createStation(dto, req.user.id);
  }

  @Get("stations")
  @ApiOperation({ summary: "线下驿站列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "city", required: false })
  @ApiQuery({ name: "status", required: false })
  listStations(
    @Query("page") page = 1, @Query("pageSize") pageSize = 20,
    @Query("city") city?: string, @Query("status") status?: string,
  ) {
    return this.svc.listStations(+page, +pageSize, city, status);
  }

  @Get("stations/discover")
  @ApiOperation({ summary: "驿站发现（用户端公开搜索）" })
  @ApiQuery({ name: "city", required: false })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  discoverStations(
    @Query("city") city?: string,
    @Query("keyword") keyword?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.discoverStations({ city, keyword, page: +page, pageSize: +pageSize });
  }

  @Get("stations/:id")
  @ApiOperation({ summary: "驿站详情" })
  getStation(@Param("id") id: string) {
    return this.svc.getStation(id);
  }

  @Put("stations/:id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核线下驿站" })
  @ApiBearerAuth()
  auditStation(@Param("id") id: string, @Body() dto: AuditStationDto) {
    return this.svc.auditStation(id, dto.status);
  }

  // ───────── 收益看板 ─────────

  @Get("stations/:id/revenue-dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站收益看板" })
  @ApiBearerAuth()
  getRevenueDashboard(@Param("id") id: string) {
    return this.svc.getRevenueDashboard(id);
  }

  // ───────── 线下课程 ─────────

  @Post("courses")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建线下课程" })
  @ApiBearerAuth()
  createCourse(@Body() dto: CreateOfflineCourseDto) {
    return this.svc.createOfflineCourse(dto);
  }

  @Get("courses")
  @ApiOperation({ summary: "获取驿站课程列表" })
  @ApiQuery({ name: "stationId", required: true })
  listCourses(@Query("stationId") stationId: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listOfflineCourses(stationId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Get("courses/:id")
  @ApiOperation({ summary: "课程详情（含报名列表）" })
  getCourse(@Param("id") id: string) {
    return this.svc.getOfflineCourse(id);
  }

  // ───────── 课程审核（管理后台） ─────────

  @Get("admin/courses/pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "待审核课程列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "stationId", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listPendingCourses(
    @Query("stationId") stationId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listPendingCourses(+page, +pageSize, stationId);
  }

  @Put("admin/courses/:id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核通过/驳回课程" })
  @ApiBearerAuth()
  auditCourse(@Param("id") id: string, @Body() dto: AuditCourseDto) {
    return this.svc.auditCourse(id, dto.auditStatus, dto.reason);
  }

  @Put("admin/courses/:id/recommend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "推荐/取消推荐课程" })
  @ApiBearerAuth()
  toggleRecommend(@Param("id") id: string) {
    return this.svc.toggleRecommend(id);
  }

  @Get("admin/courses/recommended")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "已推荐课程列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listRecommendedCourses(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listRecommendedCourses(+page, +pageSize);
  }

  // ───────── 课程报名 ─────────

  @Post("courses/:id/register")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "报名课程" })
  @ApiBearerAuth()
  registerCourse(@Req() req: Request, @Param("id") id: string) {
    return this.svc.registerCourse(req.user.id, id);
  }

  @Post("courses/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消报名" })
  @ApiBearerAuth()
  cancelRegistration(@Req() req: Request, @Param("id") id: string) {
    return this.svc.cancelRegistration(req.user.id, id);
  }

  @Post("courses/sign-in")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "扫码签到" })
  @ApiBearerAuth()
  signInCourse(@Body() dto: SignInCourseDto, @Query("stationId") stationId: string) {
    return this.svc.signInCourse(stationId, dto.qrCode);
  }

  @Get("courses/:id/registrations")
  @ApiOperation({ summary: "课程报名列表" })
  listRegistrations(@Param("id") id: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listRegistrations(id, Number(page) || 1, Number(pageSize) || 20);
  }

  // ───────── 驿站商品 ─────────

  @Post("stations/:id/products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加驿站商品" })
  @ApiBearerAuth()
  createProduct(@Param("id") id: string, @Body() dto: CreateProductDto) {
    return this.svc.createProduct(id, dto);
  }

  @Put("products/:productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新商品信息" })
  @ApiBearerAuth()
  updateProduct(@Param("productId") productId: string, @Body() dto: UpdateProductDto) {
    return this.svc.updateProduct(productId, dto);
  }

  @Get("stations/:id/products")
  @ApiOperation({ summary: "驿站商品列表" })
  @ApiQuery({ name: "status", required: false })
  listProducts(@Param("id") id: string, @Query("status") status?: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listProducts(id, { status, page, pageSize });
  }

  @Delete("products/:productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "下架商品" })
  @ApiBearerAuth()
  deleteProduct(@Param("productId") productId: string) {
    return this.svc.deleteProduct(productId);
  }

  // ───────── 师资预约 ─────────

  @Post("stations/:id/teacher-bookings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建师资预约" })
  @ApiBearerAuth()
  createTeacherBooking(@Param("id") id: string, @Body() dto: CreateTeacherBookingDto) {
    return this.svc.createTeacherBooking(id, dto);
  }

  @Put("teacher-bookings/:bookingId/confirm")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "确认预约" })
  @ApiBearerAuth()
  confirmBooking(@Param("bookingId") bookingId: string) {
    return this.svc.confirmBooking(bookingId);
  }

  @Put("teacher-bookings/:bookingId/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消预约" })
  @ApiBearerAuth()
  cancelBooking(@Param("bookingId") bookingId: string) {
    return this.svc.cancelBooking(bookingId);
  }

  @Get("stations/:id/teacher-bookings")
  @ApiOperation({ summary: "师资预约列表" })
  @ApiQuery({ name: "teacherId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listTeacherBookings(
    @Param("id") id: string,
    @Query("teacherId") teacherId?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listTeacherBookings(id, { teacherId, status, page: +page, pageSize: +pageSize });
  }

  // ───────── 订单 ─────────

  @Post("stations/:id/orders")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建驿站订单" })
  @ApiBearerAuth()
  createOrder(@Req() req: Request, @Param("id") id: string, @Body() dto: CreateStationOrderDto) {
    return this.svc.createOrder(id, req.user.id, dto);
  }

  @Get("stations/:id/orders")
  @ApiOperation({ summary: "驿站订单列表" })
  @ApiQuery({ name: "orderType", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listOrders(
    @Param("id") id: string,
    @Query("orderType") orderType?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listOrders(id, { orderType, status, page: +page, pageSize: +pageSize });
  }

  @Put("orders/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新订单状态" })
  @ApiBearerAuth()
  updateOrderStatus(@Param("orderId") orderId: string, @Body() dto: { status: string }) {
    return this.svc.updateOrderStatus(orderId, dto.status);
  }

  // ───────── 结算 ─────────

  @Post("stations/:id/settlements")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建结算单" })
  @ApiBearerAuth()
  createSettlement(@Param("id") id: string, @Body() dto: CreateSettlementDto) {
    return this.svc.createSettlement(id, dto);
  }

  @Get("stations/:id/settlements")
  @ApiOperation({ summary: "结算记录" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listSettlements(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listSettlements(id, +page, +pageSize);
  }

  @Put("settlements/:settlementId/settle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "执行结算（标记已结算）" })
  @ApiBearerAuth()
  settleStation(@Param("settlementId") settlementId: string, @Query("stationId") stationId: string) {
    return this.svc.settleStation(stationId, settlementId);
  }

  // ───────── 讲师管理（管理后台） ─────────

  @Post("admin/teachers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "新增讲师" })
  @ApiBearerAuth()
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.svc.createTeacher(dto);
  }

  @Get("admin/teachers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "讲师列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "stationId", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listTeachers(
    @Query("stationId") stationId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listTeachers(stationId, +page, +pageSize);
  }

  @Get("admin/teachers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "讲师详情" })
  @ApiBearerAuth()
  getTeacher(@Param("id") id: string) {
    return this.svc.getTeacher(id);
  }

  @Put("admin/teachers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新讲师信息" })
  @ApiBearerAuth()
  updateTeacher(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.svc.updateTeacher(id, dto);
  }

  @Delete("admin/teachers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除讲师" })
  @ApiBearerAuth()
  deleteTeacher(@Param("id") id: string) {
    return this.svc.deleteTeacher(id);
  }

  @Get("admin/teachers/:id/schedule")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "讲师排期日历（按月）" })
  @ApiBearerAuth()
  @ApiQuery({ name: "month", required: true, description: "月份 如 2026-05" })
  getTeacherSchedule(@Param("id") id: string, @Query("month") month: string) {
    return this.svc.getTeacherSchedule(id, month);
  }

  @Post("admin/teachers/:id/availability")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置讲师可预约时段" })
  @ApiBearerAuth()
  setAvailability(@Param("id") id: string, @Body() dto: SetAvailabilityDto) {
    return this.svc.setTeacherAvailability(id, dto.slots);
  }

  @Get("admin/schedule/conflicts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "冲突检测" })
  @ApiBearerAuth()
  @ApiQuery({ name: "teacherId", required: true })
  @ApiQuery({ name: "date", required: true })
  checkConflicts(@Query("teacherId") teacherId: string, @Query("date") date: string) {
    return this.svc.checkScheduleConflicts(teacherId, date);
  }

  // ───────── 研究院管理 ─────────

  @Get("institute/members")
  @ApiOperation({ summary: "研究院成员列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listInstituteMembers(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listMembers(+page, +pageSize);
  }

  @Put("institute/members/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新研究院成员" })
  @ApiBearerAuth()
  updateInstituteMember(@Param("id") id: string, @Body() dto: UpdateMemberDto) {
    return this.svc.updateMember(id, dto);
  }
}
