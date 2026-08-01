import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { OfflineService } from "./offline.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import {
  CreateStationDto, CreateOfflineCourseDto, UpdateOfflineCourseDto, UpdateMemberDto, AuditStationDto,
  SignInCourseDto,
  VerifyByCodeDto,
  CreateProductDto, UpdateProductDto,
  CreateTeacherBookingDto,
  CreateStationOrderDto, CreateSettlementDto,
  AuditCourseDto,
  UpdateOrderStatusDto, CreateTeacherRequestDto, RespondTeacherRequestDto,
  CreateCourseReviewDto, UpdateStationBrandDto,
} from "./offline.dto";
import { CreateTeacherDto, UpdateTeacherDto, SetAvailabilityDto, CreateTeacherFromSignedDto } from "./dto/teacher.dto";

@ApiTags("线下驿站")
@Controller("offline")
export class OfflineController {
  constructor(private svc: OfflineService) {}

  // ───────── 线下驿站 CRUD ─────────

  @Post("stations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建线下驿站" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createStation(@Req() req: Request, @Body() dto: CreateStationDto) {
    return this.svc.createStation(dto, req.user.id);
  }

  @Get("stations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "线下驿站列表（平台管理）" })
  @ApiResponse({ status: 200, description: "成功" })
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
  @ApiResponse({ status: 200, description: "成功" })
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

  @Get("stations/my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的驿站（运营者经营后台地基，非驿站主返回 null）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMyStation(@Req() req: Request) {
    return this.svc.getMyStation(req.user.id);
  }

  @Put("stations/my/brand")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站长更新品牌主页资料（brandStory/photos/讲师阵容·驿-P1）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "非驿站运营者" })
  @ApiBearerAuth()
  updateMyStationBrand(@Req() req: Request, @Body() dto: UpdateStationBrandDto) {
    return this.svc.updateStationBrand(req.user.id, dto);
  }

  @Get("stations/:id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "驿站详情（公开仅 ACTIVE；驿站主可预览本人驿站）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getStation(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getStation(id, req.user?.id);
  }

  @Get("stations/:id/home")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "驿站品牌主页聚合（公开仅 ACTIVE；驿站主可预览本人驿站）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getStationHome(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getStationHome(id, req.user?.id);
  }

  @Put("stations/:id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核线下驿站" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  auditStation(@Param("id") id: string, @Body() dto: AuditStationDto) {
    return this.svc.auditStation(id, dto.status);
  }

  // ───────── 收益看板 ─────────

  @Get("stations/:id/revenue-dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站收益看板" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getRevenueDashboard(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getRevenueDashboard(req.user.id, id);
  }

  // ───────── 线下课程 ─────────

  @Post("courses")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建线下课程" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createCourse(@Req() req: Request, @Body() dto: CreateOfflineCourseDto) {
    return this.svc.createOfflineCourse(req.user.id, dto);
  }

  @Put("courses/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "编辑未开课且无有效报名的线下课程（修改后重新审核）" })
  @ApiResponse({ status: 200, description: "更新成功，课程回到待审核" })
  @ApiResponse({ status: 400, description: "已开课/已有报名/参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  @ApiBearerAuth()
  updateCourse(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateOfflineCourseDto) {
    return this.svc.updateOfflineCourse(req.user.id, id, dto);
  }

  @Get("courses")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "课程列表（公开仅已发布；驿站主登录后可预览本人课程）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "stationId", required: false })
  listCourses(@Req() req: Request, @Query("stationId") stationId?: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listOfflineCourses(stationId, Number(page) || 1, Number(pageSize) || 20, req.user?.id);
  }

  @Get("courses/:id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "课程详情（公开仅已发布；仅返回有效报名数，不返回报名凭证）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getCourse(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getOfflineCourse(id, req.user?.id);
  }

  // ───────── 课程审核（管理后台） ─────────

  @Get("admin/courses/pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "待审核课程列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  auditCourse(@Param("id") id: string, @Body() dto: AuditCourseDto) {
    return this.svc.auditCourse(id, dto.auditStatus, dto.reason);
  }

  @Put("admin/courses/:id/recommend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "推荐/取消推荐课程" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  toggleRecommend(@Param("id") id: string) {
    return this.svc.toggleRecommend(id);
  }

  @Get("admin/courses/recommended")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "已推荐课程列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  registerCourse(@Req() req: Request, @Param("id") id: string) {
    return this.svc.registerCourse(req.user.id, id);
  }

  @Get("courses/:id/my-registration")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我在该课程的报名记录（签到凭证）" })
  @ApiResponse({ status: 200, description: "成功（未报名返回 null）" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMyRegistration(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getMyRegistration(id, req.user.id);
  }

  @Get("my-course-registrations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的线下课报名列表（C4·含本人凭证码）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listMyCourseRegistrations(@Req() req: Request, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listMyCourseRegistrations(req.user.id, Number(page) || 1, Number(pageSize) || 20);
  }

  @Post("courses/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消报名" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  cancelRegistration(@Req() req: Request, @Param("id") id: string) {
    return this.svc.cancelRegistration(req.user.id, id);
  }

  @Post("courses/sign-in")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "扫码签到" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiBearerAuth()
  signInCourse(@Req() req: Request, @Body() dto: SignInCourseDto, @Query("stationId") stationId: string) {
    return this.svc.signInCourse(req.user.id, stationId, dto.qrCode);
  }

  @Post("courses/verify-code")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "输码核销（扫码不便兜底·6位到店核销码）" })
  @ApiResponse({ status: 201, description: "核销成功" })
  @ApiResponse({ status: 400, description: "已核销/已过期/已取消/参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "核销码无效" })
  @ApiBearerAuth()
  signInByCode(@Req() req: Request, @Body() dto: VerifyByCodeDto) {
    return this.svc.signInByCode(req.user.id, dto.courseId, dto.code);
  }

  @Get("courses/:id/registrations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "课程报名列表（驿站主经营后台）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  listRegistrations(@Req() req: Request, @Param("id") id: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listRegistrations(req.user.id, id, Number(page) || 1, Number(pageSize) || 20);
  }

  // ───────── 课后评价（T8 OMO） ─────────

  @Post("courses/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发表课后评价（需本人已签到，一课一评）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "未签到不能评/已评价过本课程/参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createCourseReview(@Req() req: Request, @Param("id") id: string, @Body() dto: CreateCourseReviewDto) {
    return this.svc.createCourseReview(req.user.id, id, dto);
  }

  @Get("courses/:id/reviews")
  @ApiOperation({ summary: "课程评价列表（公开分页，仅昵称+头像脱敏返回）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listCourseReviews(@Param("id") id: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listCourseReviews(id, Number(page) || 1, Number(pageSize) || 20);
  }

  // ───────── 课后同学圈（T8 OMO·驿站主经营后台） ─────────

  @Post("dashboard/courses/:id/study-circle")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "为课程创建同学圈（驿站主·幂等：已建则直接返回 circleId）" })
  @ApiResponse({ status: 201, description: "创建成功/已存在，返回 { circleId }" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "课程不存在" })
  @ApiBearerAuth()
  createStudyCircle(@Req() req: Request, @Param("id") id: string) {
    return this.svc.createStudyCircle(req.user.id, id);
  }

  // ───────── 驿站商品 ─────────

  @Post("stations/:id/products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加驿站商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createProduct(@Req() req: Request, @Param("id") id: string, @Body() dto: CreateProductDto) {
    return this.svc.createProduct(req.user.id, id, dto);
  }

  @Put("products/:productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新商品信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updateProduct(@Req() req: Request, @Param("productId") productId: string, @Body() dto: UpdateProductDto) {
    return this.svc.updateProduct(req.user.id, productId, dto);
  }

  @Get("stations/:id/products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站商品列表（驿站主经营后台）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  @ApiQuery({ name: "status", required: false })
  listProducts(@Req() req: Request, @Param("id") id: string, @Query("status") status?: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listProducts(req.user.id, id, { status, page, pageSize });
  }

  @Delete("products/:productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "下架商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  deleteProduct(@Req() req: Request, @Param("productId") productId: string) {
    return this.svc.deleteProduct(req.user.id, productId);
  }

  // ───────── 师资预约 ─────────

  @Post("stations/:id/teacher-bookings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建师资预约" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createTeacherBooking(@Req() req: Request, @Param("id") id: string, @Body() dto: CreateTeacherBookingDto) {
    return this.svc.createTeacherBooking(req.user.id, id, dto);
  }

  @Put("teacher-bookings/:bookingId/confirm")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "确认预约" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  confirmBooking(@Req() req: Request, @Param("bookingId") bookingId: string) {
    return this.svc.confirmBooking(req.user.id, bookingId);
  }

  @Put("teacher-bookings/:bookingId/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消预约" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  cancelBooking(@Req() req: Request, @Param("bookingId") bookingId: string) {
    return this.svc.cancelBooking(req.user.id, bookingId);
  }

  @Get("stations/:id/teacher-bookings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "师资预约列表（驿站主经营后台）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  @ApiQuery({ name: "teacherId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listTeacherBookings(
    @Req() req: Request,
    @Param("id") id: string,
    @Query("teacherId") teacherId?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listTeacherBookings(req.user.id, id, { teacherId, status, page: +page, pageSize: +pageSize });
  }

  // ───────── 订单 ─────────

  @Post("stations/:id/orders")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站在线订单预留接口（当前 fail-closed）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createOrder(@Req() req: Request, @Param("id") id: string, @Body() dto: CreateStationOrderDto) {
    return this.svc.createOrder(id, req.user.id, dto);
  }

  @Get("stations/:id/orders")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站订单列表（驿站主经营后台）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  @ApiQuery({ name: "orderType", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listOrders(
    @Req() req: Request,
    @Param("id") id: string,
    @Query("orderType") orderType?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listOrders(req.user.id, id, { orderType, status, page: +page, pageSize: +pageSize });
  }

  @Put("orders/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站订单状态预留接口（当前仅支付系统可推进）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updateOrderStatus(@Req() req: Request, @Param("orderId") orderId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.svc.updateOrderStatus(req.user.id, orderId, dto.status);
  }

  // ───────── 结算 ─────────

  @Post("stations/:id/settlements")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驿站自动结算预留接口（当前禁止手填金额）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createSettlement(@Param("id") id: string, @Body() dto: CreateSettlementDto) {
    return this.svc.createSettlement(id, dto);
  }

  @Get("stations/:id/settlements")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "结算记录（驿站主经营后台）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "非该驿站主" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listSettlements(@Req() req: Request, @Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listSettlements(req.user.id, id, +page, +pageSize);
  }

  @Put("settlements/:settlementId/settle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驿站真实打款预留接口（当前 fail-closed）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  settleStation(@Param("settlementId") settlementId: string, @Query("stationId") stationId: string) {
    return this.svc.settleStation(stationId, settlementId);
  }

  // ───────── 讲师管理（管理后台） ─────────

  @Post("admin/teachers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "新增讲师" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.svc.createTeacher(dto);
  }

  @Post("stations/:id/teachers/from-signed")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "从研究院签约讲师库引入讲师（研究院→驿站供给闭环）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "非有效签约讲师/已引入" })
  @ApiResponse({ status: 404, description: "驿站不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createTeacherFromSigned(@Req() req: Request, @Param("id") stationId: string, @Body() dto: CreateTeacherFromSignedDto) {
    return this.svc.createTeacherFromSigned(req.user.id, stationId, dto.sourceUserId, dto.specialties, dto.bio);
  }

  @Get("admin/teachers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "讲师列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getTeacher(@Param("id") id: string) {
    return this.svc.getTeacher(id);
  }

  @Put("admin/teachers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新讲师信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateTeacher(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.svc.updateTeacher(id, dto);
  }

  @Delete("admin/teachers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除讲师" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  deleteTeacher(@Param("id") id: string) {
    return this.svc.deleteTeacher(id);
  }

  @Get("admin/teachers/:id/schedule")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "讲师排期日历（按月）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "month", required: true, description: "月份 如 2026-05" })
  getTeacherSchedule(@Param("id") id: string, @Query("month") month: string) {
    return this.svc.getTeacherSchedule(id, month);
  }

  @Post("admin/teachers/:id/availability")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置讲师可预约时段" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  setAvailability(@Param("id") id: string, @Body() dto: SetAvailabilityDto) {
    return this.svc.setTeacherAvailability(id, dto.slots);
  }

  @Get("admin/schedule/conflicts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "冲突检测" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "teacherId", required: true })
  @ApiQuery({ name: "date", required: true })
  checkConflicts(@Query("teacherId") teacherId: string, @Query("date") date: string) {
    return this.svc.checkScheduleConflicts(teacherId, date);
  }

  // ───────── 公开师资查询 ─────────

  @Get("stations/:id/teachers")
  @ApiOperation({ summary: "驿站讲师列表（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  listPublicTeachers(@Param("id") id: string) {
    return this.svc.listTeachers(id, 1, 50);
  }

  @Get("teachers/:teacherId/availability")
  @ApiOperation({ summary: "讲师可预约时段（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "date", required: false })
  getTeacherAvailability(@Param("teacherId") teacherId: string, @Query("date") date?: string) {
    return this.svc.getTeacherSchedule(teacherId, date || new Date().toISOString().slice(0, 7));
  }

  @Delete("teacher-bookings/:bookingId")
  @ApiOperation({ summary: "取消预约（用户端）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancelTeacherBooking(@Req() req: Request, @Param("bookingId") bookingId: string) {
    return this.svc.cancelBooking(req.user.id, bookingId);
  }

  // ───────── 研究院管理 ─────────

  @Get("institute/members")
  @ApiOperation({ summary: "研究院成员列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listInstituteMembers(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listMembers(+page, +pageSize);
  }

  @Put("institute/members/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新研究院成员" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateInstituteMember(@Param("id") id: string, @Body() dto: UpdateMemberDto) {
    return this.svc.updateMember(id, dto);
  }

  // ── 驿站-老师双向选择 ──

  @Post("stations/:id/teacher-requests")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站发起老师邀约" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createTeacherRequest(@Req() req: Request, @Param("id") stationId: string, @Body() dto: CreateTeacherRequestDto) {
    return this.svc.createTeacherRequest(stationId, req.user.id, dto);
  }

  @Get("stations/:id/teacher-requests")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "驿站邀约列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  listTeacherRequests(@Req() req: Request, @Param("id") stationId: string, @Query("status") status?: string) {
    return this.svc.listTeacherRequests(stationId, req.user.id, status);
  }

  @Put("teacher-requests/:id/respond")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "老师响应邀约（接受/拒绝）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  respondTeacherRequest(@Req() req: Request, @Param("id") id: string, @Body() dto: RespondTeacherRequestDto) {
    return this.svc.respondTeacherRequest(id, req.user.id, dto.status);
  }

  // ── 管理员：教师邀约总览 ──

  @Get("admin/teacher-requests")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理员查看所有教师邀约" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  adminTeacherRequests(
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.adminListTeacherRequests(status, +page, +pageSize);
  }

  // ───────── 平台管理视图（跨驿站只读监控） ─────────

  @Get("admin/checkins")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "核销记录查询（跨驿站签到核销，平台监控）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "stationId", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  adminCheckins(
    @Query("stationId") stationId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.adminListCheckins({ stationId, page: +page, pageSize: +pageSize });
  }

  @Get("admin/products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驿站商品查询（跨驿站商品列表，平台监控）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "stationId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  adminProducts(
    @Query("stationId") stationId?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.adminListProducts({ stationId, status, page: +page, pageSize: +pageSize });
  }

  @Get("admin/bookings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "师资预约查询（跨驿站预约记录，平台监控）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "stationId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  adminBookings(
    @Query("stationId") stationId?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.adminListBookings({ stationId, status, page: +page, pageSize: +pageSize });
  }
}
