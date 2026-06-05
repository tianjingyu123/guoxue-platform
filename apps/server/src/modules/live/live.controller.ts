import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { SkipFormat } from "../../common/skip-format.decorator";
import { LiveService } from "./live.service";
import { CreateRoomDto, UpdateRoomDto, MicManageDto, SlideCreateDto, MuteUserDto, FlashSaleDto, CreateGiftDto, SendGiftDto, SendCommentDto } from "./live.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { StationId } from "../../common/station-id.decorator";

/** 已认证请求，附带 JWT 解析后的 user 信息 */
type AuthRequest = Omit<Request, "user"> & {
  user: { id: string; [key: string]: unknown };
};

@ApiTags("直播")
@Controller("live")
export class LiveController {
  constructor(private svc: LiveService) {}

  // ───────── 直播间 CRUD ─────────

  @Post("rooms")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建直播间" })
  @ApiBearerAuth()
  createRoom(@Req() req: AuthRequest, @Body() dto: CreateRoomDto) {
    return this.svc.createRoom(req.user.id, dto);
  }

  @Get("rooms")
  @ApiOperation({ summary: "获取直播间列表" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "courseId", required: false, type: String, description: "按课程ID过滤" })
  @ApiQuery({ name: "circleId", required: false, type: String, description: "按圈子ID过滤" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listRooms(
    @Query("status") status?: string,
    @Query("courseId") courseId?: string,
    @Query("circleId") circleId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @StationId() stationId?: string,
  ) {
    if (courseId) return this.svc.listCourseRooms(courseId, +page, +pageSize, stationId);
    return this.svc.listRooms(status, +page, +pageSize, circleId, stationId);
  }

  @Get("rooms/:id")
  @ApiOperation({ summary: "获取直播间详情" })
  getRoom(@Param("id") id: string) {
    return this.svc.getRoom(id);
  }

  @Put("rooms/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新直播间" })
  @ApiBearerAuth()
  updateRoom(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateRoomDto) {
    return this.svc.updateRoom(req.user.id, id, dto);
  }

  @Put("rooms/:id/start")
  @UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
  @RequireFeature("live_start")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "开始直播（生成推拉流地址）" })
  @ApiBearerAuth()
  startRoom(@Param("id") id: string) {
    return this.svc.startLive(id);
  }

  @Get("rooms/:id/stream-urls")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取推拉流地址" })
  @ApiBearerAuth()
  getStreamUrls(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.getStreamUrls(id, req.user.id);
  }

  @Get("rooms/:id/play-url")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取观众拉流地址" })
  @ApiBearerAuth()
  playUrl(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.getPlayUrl(id, req.user.id);
  }

  @Put("rooms/:id/end")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "结束直播" })
  @ApiBearerAuth()
  endRoom(@Param("id") id: string) {
    return this.svc.endRoom(id);
  }

  @Put("rooms/:id/replay")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "设置直播回放" })
  @ApiBearerAuth()
  setReplay(@Param("id") id: string, @Body("replayUrl") replayUrl: string) {
    return this.svc.updateStatus(id, "REPLAY", { replayUrl });
  }

  @Delete("rooms/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除直播间（房主或管理员）" })
  @ApiBearerAuth()
  deleteRoom(@Req() req: AuthRequest, @Param("id") id: string) {
    const isAdmin = (req.user as any)?.roles?.some((r: string) => ['SUPER_ADMIN', 'OPERATION_ADMIN'].includes(r));
    return this.svc.deleteRoom(req.user.id, id, isAdmin);
  }

  // ───────── 麦位管理 ─────────

  @Post("rooms/:id/mics")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "用户上麦" })
  @ApiBearerAuth()
  joinMic(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: MicManageDto) {
    return this.svc.joinMic(id, req.user.id, dto.position);
  }

  @Delete("rooms/:id/mics/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "用户下麦（主播或管理员）" })
  @ApiBearerAuth()
  leaveMic(@Param("id") id: string, @Param("userId") userId: string, @Req() req: AuthRequest) {
    return this.svc.leaveMic(id, userId, req.user.id);
  }

  @Put("rooms/:id/mics/manage")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "麦位操作（静音/解除/踢人）" })
  @ApiBearerAuth()
  manageMic(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: MicManageDto) {
    return this.svc.manageMic(id, req.user.id, dto);
  }

  @Get("rooms/:id/mics")
  @ApiOperation({ summary: "获取麦位列表" })
  listMics(@Param("id") id: string) {
    return this.svc.listMics(id);
  }

  // ───────── 预告与预约 ─────────

  @Get("scheduled")
  @ApiOperation({ summary: "获取即将开始的直播预告列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listScheduled(@Query("page") page = 1, @Query("pageSize") pageSize = 10, @StationId() stationId?: string) {
    return this.svc.listScheduled(+page, +pageSize, stationId);
  }

  @Post("rooms/:id/book")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "预约直播" })
  @ApiBearerAuth()
  bookRoom(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.bookRoom(id, req.user.id);
  }

  @Delete("rooms/:id/book")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "取消直播预约" })
  @ApiBearerAuth()
  unbookRoom(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.unbookRoom(id, req.user.id);
  }

  @Get("rooms/:id/bookings")
  @ApiOperation({ summary: "获取直播预约人数" })
  getBookingCount(@Param("id") id: string) {
    return this.svc.getBookingCount(id);
  }

  // ───────── 课件管理 ─────────

  @Post("rooms/:id/slides")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "上传课件" })
  @ApiBearerAuth()
  addSlide(@Param("id") id: string, @Body() dto: SlideCreateDto) {
    return this.svc.addSlide(id, dto);
  }

  @Delete("slides/:slideId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除课件" })
  @ApiBearerAuth()
  removeSlide(@Param("slideId") slideId: string) {
    return this.svc.removeSlide(slideId);
  }

  @Get("rooms/:id/slides")
  @ApiOperation({ summary: "获取课件列表" })
  listSlides(@Param("id") id: string) {
    return this.svc.listSlides(id);
  }

  // ───────── 禁言管理 ─────────

  @Post("rooms/:id/mute")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "禁言用户" })
  @ApiBearerAuth()
  muteUser(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: MuteUserDto) {
    return this.svc.muteUser(id, req.user.id, dto);
  }

  @Delete("rooms/:id/mute/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "解除禁言（主播或管理员）" })
  @ApiBearerAuth()
  unmuteUser(@Param("id") id: string, @Param("userId") userId: string, @Req() req: AuthRequest) {
    return this.svc.unmuteUser(id, userId, req.user.id);
  }

  @Get("rooms/:id/muted-users")
  @ApiOperation({ summary: "获取禁言用户列表" })
  listMutedUsers(@Param("id") id: string) {
    return this.svc.listMutedUsers(id);
  }

  // ───────── 限时秒杀 ─────────

  @Post("rooms/:id/flash-sales")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建秒杀活动" })
  @ApiBearerAuth()
  createFlashSale(@Param("id") id: string, @Body() dto: FlashSaleDto) {
    return this.svc.createFlashSale(id, dto);
  }

  @Post("flash-sales/:saleId/start")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "开始秒杀" })
  @ApiBearerAuth()
  startFlashSale(@Param("saleId") saleId: string) {
    return this.svc.startFlashSale(saleId);
  }

  @Post("flash-sales/:saleId/order")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "秒杀下单" })
  @ApiBearerAuth()
  flashSaleOrder(@Param("saleId") saleId: string, @Req() req: AuthRequest) {
    return this.svc.flashSaleOrder(saleId, req.user.id);
  }

  @Post("flash-sales/:saleId/end")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "结束秒杀" })
  @ApiBearerAuth()
  endFlashSale(@Param("saleId") saleId: string) {
    return this.svc.endFlashSale(saleId);
  }

  @Get("rooms/:id/flash-sales")
  @ApiOperation({ summary: "获取秒杀活动列表" })
  listFlashSales(@Param("id") id: string) {
    return this.svc.listFlashSales(id);
  }

  // ───────── 腾讯云直播回调 ─────────

  @Post("callback")
  @UseGuards(TencentCallbackGuard)
  @SkipFormat()
  @ApiOperation({ summary: "腾讯云直播回调（推流/断流/录制/截图）" })
  handleCallback(@Body() body: Record<string, unknown>) {
    const streamKey = (body.stream_param as string) || (body.StreamName as string) || "";
    const eventType = Number(body.event_type);
    this.svc.handleLiveEvent(streamKey, eventType, body);
    return { code: 0 };
  }

  // ───────── 礼物系统 ─────────

  @Get("gifts")
  @ApiOperation({ summary: "获取礼物列表" })
  listGifts() {
    return this.svc.listGifts();
  }

  @Post("gifts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建礼物（管理员）" })
  @ApiBearerAuth()
  createGift(@Body() dto: CreateGiftDto) {
    return this.svc.createGift(dto);
  }

  @Put("gifts/:giftId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新礼物（管理员）" })
  @ApiBearerAuth()
  updateGift(@Param("giftId") giftId: string, @Body() dto: { name?: string; icon?: string; priceCoin?: number; level?: string; status?: string; sortOrder?: number }) {
    return this.svc.updateGift(giftId, dto);
  }

  @Delete("gifts/:giftId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除礼物（管理员）" })
  @ApiBearerAuth()
  removeGift(@Param("giftId") giftId: string) {
    return this.svc.removeGift(giftId);
  }

  @Post("rooms/:id/gifts")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发送礼物" })
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
  giftRanking(@Param("id") id: string) {
    return this.svc.giftRanking(id);
  }

  // ───────── 评论与点赞 ─────────

  @Post("rooms/:id/comment")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发送直播评论/弹幕" })
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
  @ApiBearerAuth()
  toggleLike(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.toggleLike(id, req.user.id);
  }

  // ───────── 内容审核 ─────────

  @Post("audit/callback")
  @UseGuards(TencentCallbackGuard)
  @SkipFormat()
  @ApiOperation({ summary: "腾讯云CMS审核回调" })
  handleAuditCallback(@Body() body: Record<string, unknown>) {
    const roomId = (body.room_id as string) || (body.data_id as string) || "";
    const screenshotUrl = (body.screenshot_url as string) || (body.url as string) || "";
    const result = (body.suggestion as string) === "pass" ? "PASS" : "BLOCK";
    const label = (body.label as string) || (body.scene as string);
    return this.svc.handleAuditCallback(roomId, screenshotUrl, result, label, body);
  }

  @Get("rooms/:id/audit-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取审核日志" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listAuditLogs(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listAuditLogs(id, +page, +pageSize);
  }
}
