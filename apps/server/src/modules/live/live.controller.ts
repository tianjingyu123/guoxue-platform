import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { SkipFormat } from "../../common/skip-format.decorator";
import { LiveService } from "./live.service";
import { LiveQualityService } from "./live-quality.service";
import { CreateRoomDto, UpdateRoomDto, UpdateRoomProductsDto, UpdateLiveWatchProgressDto, MicJoinDto, MicManageDto, SlideCreateDto, MuteUserDto, FlashSaleDto, CreateGiftDto, UpdateGiftDto, SendGiftDto, SendCommentDto } from "./live.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { StationId } from "../../common/station-id.decorator";
import { ThrottleGuard } from "../../common/throttle.guard";

/** 已认证请求，附带 JWT 解析后的 user 信息 */
type AuthRequest = Omit<Request, "user"> & {
  user: Express.User;
};

@ApiTags("直播")
@Controller("live")
export class LiveController {
  constructor(
    private svc: LiveService,
    private qualitySvc: LiveQualityService,
  ) {}

  /** 是否平台管理员（超管/运营）——开播/下播/推流地址在 service 层做「房主或管理员」逻辑校验 */
  private isAdmin(req: AuthRequest): boolean {
    const roles = (req.user as { roles?: string[] }).roles || [];
    return roles.some((r) => r === "SUPER_ADMIN" || r === "OPERATION_ADMIN");
  }

  // ───────── 直播间 CRUD ─────────

  @Post("rooms")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建直播间" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  createRoom(@Req() req: AuthRequest, @Body() dto: CreateRoomDto) {
    const roles = (req.user as { roles?: string[] }).roles || [];
    const isAdmin = roles.some((r) => r === "SUPER_ADMIN" || r === "OPERATION_ADMIN");
    return this.svc.createRoom(req.user.id, dto, isAdmin);
  }

  @Get("rooms")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取直播间列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "courseId", required: false, type: String, description: "按课程ID过滤" })
  @ApiQuery({ name: "circleId", required: false, type: String, description: "按圈子ID过滤" })
  @ApiQuery({ name: "scope", required: false, type: String, description: "all=不限开放范围（仅管理员生效·管理端用）" })
  @ApiQuery({ name: "followed", required: false, type: Boolean, description: "仅返回当前用户已关注主播的直播" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listRooms(
    @Query("status") status?: string,
    @Query("courseId") courseId?: string,
    @Query("circleId") circleId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @StationId() stationId?: string,
    @Query("scope") scope?: string,
    @Req() req?: Request,
    @Query("followed") followed?: string,
  ) {
    if (courseId) return this.svc.listCourseRooms(courseId, +page, +pageSize, stationId);
    // scope=all（不限开放范围）仅管理员生效——防公共端点带参绕过圈内内容隔离
    const roles = (req?.user as { roles?: string[] } | undefined)?.roles || [];
    const isAdmin = roles.some((r) => r === "SUPER_ADMIN" || r === "OPERATION_ADMIN" || r === "CONTENT_AUDITOR");
    const wantsFollowed = followed === "1" || followed === "true";
    const followedByUserId = wantsFollowed ? (req?.user?.id || null) : undefined;
    return this.svc.listRooms(status, +page, +pageSize, circleId, stationId, scope === "all" && isAdmin ? "all" : undefined, followedByUserId);
  }

  @Get("my-rooms")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播端我的直播 — 经营概览 + 当前用户作为主播的全部直播间" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMyRooms(@Req() req: AuthRequest) {
    return this.svc.getMyRooms(req.user.id);
  }

  @Get("earnings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播端收益统计 — 带货 + 打赏，按周期(7d/30d/90d)" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "range", required: false, enum: ["7d", "30d", "90d"] })
  @ApiBearerAuth()
  getEarnings(@Req() req: AuthRequest, @Query("range") range = "7d") {
    return this.svc.getEarnings(req.user.id, range);
  }

  @Get("products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播带货商品库 — 平台在售商品(filter: all/on/off)" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "filter", required: false, type: String })
  @ApiBearerAuth()
  getLiveProducts(@Query("filter") filter?: string) {
    return this.svc.getLiveProducts(filter);
  }

  @Get("settings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播直播间设置 — 资料 + 通知/隐私偏好" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getStreamerSettings(@Req() req: AuthRequest) {
    return this.svc.getStreamerSettings(req.user.id);
  }

  @Put("settings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "保存主播直播间设置" })
  @ApiResponse({ status: 200, description: "保存成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  saveStreamerSettings(@Req() req: AuthRequest, @Body() body: {
    profile?: { name?: string; desc?: string; cover?: string };
    notify?: Record<string, boolean>;
    privacy?: Record<string, boolean>;
  }) {
    return this.svc.saveStreamerSettings(req.user.id, body);
  }

  @Get("reviews")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播端直播评价 — 评分分布 + 评价列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiQuery({ name: "filter", required: false, type: String })
  @ApiBearerAuth()
  getStreamerReviews(@Req() req: AuthRequest, @Query("filter") filter?: string) {
    return this.svc.getStreamerReviews(req.user.id, filter);
  }

  @Post("reviews/:reviewId/reply")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "回复直播评价（仅评价所属直播间的房主）" })
  @ApiResponse({ status: 201, description: "回复成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅房主可回复" })
  @ApiResponse({ status: 404, description: "评价不存在" })
  @ApiBearerAuth()
  replyReview(@Param("reviewId") reviewId: string, @Req() req: AuthRequest, @Body("reply") reply: string) {
    return this.svc.replyStreamerReview(req.user.id, reviewId, reply);
  }

  @Get("team")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播端直播团队 — 团队成员 + 可邀请成员" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getStreamerTeam(@Req() req: AuthRequest) {
    return this.svc.getStreamerTeam(req.user.id);
  }

  @Get("console/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播端直播控制台 — 实时统计/弹幕/连麦/商品/提词器" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权访问" })
  @ApiBearerAuth()
  getConsoleData(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.getConsoleData(id, req.user.id);
  }

  @Get("rooms/:id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取直播间详情（SELF_ONLY/已下架直播间仅主播本人可见）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRoom(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getRoom(id, req.user?.id);
  }

  @Put("rooms/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新直播间" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updateRoom(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateRoomDto) {
    // 平台管理员（超管/运营）可编辑任意直播间——与开播/下播「房主或管理员」口径一致
    return this.svc.updateRoom(req.user.id, id, dto, this.isAdmin(req));
  }

  @Put("rooms/:id/products")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "保存本场带货商品及展示顺序（房主或管理员）" })
  @ApiResponse({ status: 200, description: "保存成功" })
  @ApiResponse({ status: 400, description: "商品已下架、数量超限或参数错误" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权管理该直播间" })
  @ApiResponse({ status: 404, description: "直播间不存在" })
  @ApiBearerAuth()
  updateRoomProducts(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateRoomProductsDto) {
    return this.svc.updateRoomProducts(req.user.id, id, dto.productIds, this.isAdmin(req));
  }

  @Put("rooms/:id/start")
  @UseGuards(JwtAuthGuard, FeatureFlagGuard)
  @RequireFeature("live_start")
  @ApiOperation({ summary: "开始直播（房主或管理员·生成推拉流地址）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限（仅房主本人或管理员）" })
  @ApiBearerAuth()
  startRoom(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.startLive(id, req.user.id, this.isAdmin(req));
  }

  @Get("rooms/:id/stream-urls")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取推拉流地址" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getStreamUrls(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.getStreamUrls(id, req.user.id, this.isAdmin(req));
  }

  @Get("rooms/:id/play-url")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取公开直播的观众拉流地址（可选登录）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  playUrl(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getPlayUrl(id, req.user?.id);
  }

  @Put("rooms/:id/end")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "结束直播（房主或管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限（仅房主本人或管理员）" })
  @ApiBearerAuth()
  endRoom(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.endRoom(id, req.user.id, this.isAdmin(req));
  }

  @Put("rooms/:id/replay")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置直播回放" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  setReplay(@Param("id") id: string, @Body("replayUrl") replayUrl: string) {
    return this.svc.updateStatus(id, "REPLAY", { replayUrl });
  }

  @Put("rooms/:id/replay-chapters")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "标注回放章节点（仅主播本人·[{t 秒, title}]·随房间详情返回）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "仅主播本人可操作" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  setReplayChapters(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body("chapters") chapters: Array<{ t?: number; title?: string }>,
  ) {
    return this.svc.setReplayChapters(req.user.id, id, chapters || []);
  }

  @Get("rooms/:id/watch-progress")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取当前用户的直播回放观看进度" })
  @ApiResponse({ status: 200, description: "成功；没有记录时返回零进度" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "直播间或回放不存在" })
  @ApiBearerAuth()
  getWatchProgress(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.svc.getWatchProgress(req.user.id, id);
  }

  @Put("rooms/:id/watch-progress")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "幂等保存当前用户的直播回放观看进度" })
  @ApiResponse({ status: 200, description: "保存成功；重复或乱序请求返回已有进度" })
  @ApiResponse({ status: 400, description: "当前房间没有可观看回放或参数无效" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 404, description: "直播间不存在" })
  @ApiBearerAuth()
  saveWatchProgress(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: UpdateLiveWatchProgressDto,
  ) {
    return this.svc.saveWatchProgress(req.user.id, id, dto);
  }

  @Delete("rooms/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除直播间（房主或管理员）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  deleteRoom(@Req() req: AuthRequest, @Param("id") id: string) {
    const isAdmin = req.user?.roles?.some((r) => ['SUPER_ADMIN', 'OPERATION_ADMIN'].includes(r));
    return this.svc.deleteRoom(req.user.id, id, isAdmin);
  }

  // ───────── 麦位管理 ─────────

  @Post("rooms/:id/mics")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "申请上麦（需主播批准）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  joinMic(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: MicJoinDto) {
    return this.svc.joinMic(id, req.user.id, dto.position);
  }

  @Delete("rooms/:id/mics/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "用户下麦（主播或管理员）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  leaveMic(@Param("id") id: string, @Param("userId") userId: string, @Req() req: AuthRequest) {
    return this.svc.leaveMic(id, userId, req.user.id);
  }

  @Put("rooms/:id/mics/manage")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "主播或管理员处理申请、静音、解除静音或踢人" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  manageMic(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: MicManageDto) {
    return this.svc.manageMic(id, req.user.id, dto, this.isAdmin(req));
  }

  @Get("rooms/:id/mics")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取麦位列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  listMics(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.listMics(id, req.user.id, this.isAdmin(req));
  }

  @Get("rooms/:id/rtc-config")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "获取直播连麦临时 TRTC 票据（仅主播或已获批嘉宾）" })
  @ApiBearerAuth()
  getRtcConfig(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.getRtcConfig(id, req.user.id);
  }

  // ───────── 预告与预约 ─────────

  @Get("scheduled")
  @ApiOperation({ summary: "获取即将开始的直播预告列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listScheduled(@Query("page") page = 1, @Query("pageSize") pageSize = 10, @StationId() stationId?: string) {
    return this.svc.listScheduled(+page, +pageSize, stationId);
  }

  @Post("rooms/:id/book")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "预约直播" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  bookRoom(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.bookRoom(id, req.user.id);
  }

  @Delete("rooms/:id/book")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消直播预约" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  unbookRoom(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.unbookRoom(id, req.user.id);
  }

  @Get("rooms/:id/bookings")
  @ApiOperation({ summary: "获取直播预约人数" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getBookingCount(@Param("id") id: string) {
    return this.svc.getBookingCount(id);
  }

  // ───────── 课件管理 ─────────

  @Post("rooms/:id/slides")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "上传课件" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  addSlide(@Param("id") id: string, @Body() dto: SlideCreateDto) {
    return this.svc.addSlide(id, dto);
  }

  @Delete("slides/:slideId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除课件" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  removeSlide(@Param("slideId") slideId: string) {
    return this.svc.removeSlide(slideId);
  }

  @Get("rooms/:id/slides")
  @ApiOperation({ summary: "获取课件列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  listSlides(@Param("id") id: string) {
    return this.svc.listSlides(id);
  }

  // ───────── 禁言管理 ─────────

  @Post("rooms/:id/mute")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "禁言用户（主播或管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限（仅主播本人或管理员）" })
  @ApiBearerAuth()
  muteUser(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: MuteUserDto) {
    return this.svc.muteUser(id, req.user.id, dto, this.isAdmin(req));
  }

  @Delete("rooms/:id/mute/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "解除禁言（主播或管理员）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  unmuteUser(@Param("id") id: string, @Param("userId") userId: string, @Req() req: AuthRequest) {
    return this.svc.unmuteUser(id, userId, req.user.id, this.isAdmin(req));
  }

  @Get("rooms/:id/muted-users")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取禁言用户列表（主播或管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限（仅主播本人或管理员）" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiBearerAuth()
  listMutedUsers(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.listMutedUsers(id, req.user.id, this.isAdmin(req));
  }

  // ───────── 限时秒杀 ─────────

  @Post("rooms/:id/flash-sales")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建秒杀活动" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createFlashSale(@Param("id") id: string, @Body() dto: FlashSaleDto) {
    return this.svc.createFlashSale(id, dto);
  }

  @Post("flash-sales/:saleId/start")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "开始秒杀" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  startFlashSale(@Param("saleId") saleId: string) {
    return this.svc.startFlashSale(saleId);
  }

  @Post("flash-sales/:saleId/order")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "秒杀下单" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  flashSaleOrder(@Param("saleId") saleId: string, @Req() req: AuthRequest) {
    return this.svc.flashSaleOrder(saleId, req.user.id);
  }

  @Post("flash-sales/:saleId/end")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "结束秒杀" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  endFlashSale(@Param("saleId") saleId: string) {
    return this.svc.endFlashSale(saleId);
  }

  @Get("rooms/:id/flash-sales")
  @ApiOperation({ summary: "获取秒杀活动列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  listFlashSales(@Param("id") id: string) {
    return this.svc.listFlashSales(id);
  }

  // ───────── 腾讯云直播回调 ─────────

  @Post("callback")
  @UseGuards(TencentCallbackGuard)
  @SkipFormat()
  @ApiOperation({ summary: "腾讯云直播回调（推流/断流/录制/截图）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  handleCallback(@Body() body: Record<string, unknown>) {
    const streamKey = (body.stream_param as string) || (body.StreamName as string) || "";
    const eventType = Number(body.event_type);
    this.svc.handleLiveEvent(streamKey, eventType, body);
    return { code: 0 };
  }

  // ───────── 礼物系统 ─────────

  @Get("gifts")
  @ApiOperation({ summary: "获取礼物列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listGifts() {
    return this.svc.listGifts();
  }

  @Post("gifts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建礼物（管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  createGift(@Body() dto: CreateGiftDto) {
    return this.svc.createGift(dto);
  }

  @Put("gifts/:giftId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新礼物（管理员）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  updateGift(@Param("giftId") giftId: string, @Body() dto: UpdateGiftDto) {
    return this.svc.updateGift(giftId, dto);
  }

  @Delete("gifts/:giftId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除礼物（管理员）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  removeGift(@Param("giftId") giftId: string) {
    return this.svc.removeGift(giftId);
  }

  @Post("rooms/:id/gifts")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发送礼物" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  sendGift(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() dto: SendGiftDto,
  ) {
    return this.svc.sendGift(id, req.user.id, dto.giftId, dto.quantity || 1);
  }

  @Get("rooms/:id/gift-ranking")
  @ApiOperation({ summary: "直播间礼物排行榜" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  giftRanking(@Param("id") id: string) {
    return this.svc.giftRanking(id);
  }

  // ───────── 画质分档商业化（C5·时长包/额度）─────────

  @Get("quality-packages")
  @ApiOperation({ summary: "画质时长包列表（高清/超清·公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  listQualityPackages() {
    return this.qualitySvc.listPackages();
  }

  @Get("quota")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的画质额度（高清/超清剩余分钟）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMyQuota(@Req() req: AuthRequest) {
    return this.qualitySvc.getQuota(req.user.id);
  }

  @Get("quota/records")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的画质额度流水（购买/核销明细）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getMyQuotaRecords(@Req() req: AuthRequest, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.qualitySvc.listRecords(req.user.id, +page, +pageSize);
  }

  @Post("quality-packages/:id/purchase")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "购买画质时长包（国学币支付·原子扣币增额度）" })
  @ApiResponse({ status: 201, description: "购买成功" })
  @ApiResponse({ status: 400, description: "余额不足/时长包不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  purchaseQualityPackage(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.qualitySvc.purchasePackage(req.user.id, id);
  }

  // ───────── 评论与点赞 ─────────

  @Post("rooms/:id/comment")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发送直播评论/弹幕" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  sendComment(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() dto: SendCommentDto,
  ) {
    return this.svc.sendComment(id, req.user.id, dto.content);
  }

  @Post("rooms/:id/like")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "直播点赞" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  toggleLike(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.toggleLike(id, req.user.id);
  }

  // ───────── 内容审核 ─────────

  @Post("audit/callback")
  @UseGuards(TencentCallbackGuard)
  @SkipFormat()
  @ApiOperation({ summary: "腾讯云CMS审核回调" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  handleAuditCallback(@Body() body: Record<string, unknown>) {
    const roomId = (body.room_id as string) || (body.data_id as string) || "";
    const screenshotUrl = (body.screenshot_url as string) || (body.url as string) || "";
    const result = (body.suggestion as string) === "pass" ? "PASS" : "BLOCK";
    const label = (body.label as string) || (body.scene as string);
    return this.svc.handleAuditCallback(roomId, screenshotUrl, result, label, body);
  }

  // ───────── 推流配置 ─────────

  @Get("stream-config")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取推流配置（地址、密钥、推荐参数）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  getStreamConfig(@Req() req: AuthRequest) {
    return this.svc.getStreamConfig(req.user.id);
  }

  // ───────── 内容审核 ─────────

  @Get("rooms/:id/audit-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取审核日志" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listAuditLogs(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listAuditLogs(id, +page, +pageSize);
  }

  // ───────── 公开浏览端点 ─────────

  @Get("hosts")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "主播列表" })
  @ApiQuery({ name: "filter", required: false })
  getHosts(@Query("filter") filter?: string, @Req() req?: Request) {
    return this.svc.getHosts(filter, req?.user?.id);
  }

  @Get("replays")
  @ApiOperation({ summary: "回放列表" })
  getReplays(@Query("sortBy") sortBy?: string) {
    return this.svc.getReplays(sortBy);
  }

  @Get("preview/:id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "直播预告详情" })
  getPreview(@Param("id") id: string, @Req() req?: Request) {
    return this.svc.getPreview(id, req?.user?.id);
  }

  @Get("replay/:id")
  @ApiOperation({ summary: "回放详情" })
  getReplayDetail(@Param("id") id: string) {
    return this.svc.getReplayDetail(id);
  }

  @Get("end/:id")
  @ApiOperation({ summary: "直播结束统计" })
  getEndRoom(@Param("id") id: string) {
    return this.svc.getEndRoom(id);
  }
}
