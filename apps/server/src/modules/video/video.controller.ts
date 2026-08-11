import { Request } from "express";
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { SkipFormat } from "../../common/skip-format.decorator";
import { VideoService } from "./video.service";
import {
  CreateVideoDto, UpdateVideoDto, VideoListQueryDto,
  PullUploadDto, ProcessMediaDto, ClipVideoDto,
  UploadSignatureDto, PlaybackStatsQueryDto, AuditVideoDto,
} from "./video.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";
import { StationId } from "../../common/station-id.decorator";
import { Auditable } from "../../common/audit.decorator";

@ApiTags("视频")
@Controller("videos")
export class VideoController {
  constructor(private svc: VideoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建视频" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  create(@Req() req: Request, @Body() dto: CreateVideoDto) {
    const roles = (req.user as { roles?: string[] }).roles || [];
    const isAdmin = roles.some((r) => r === "SUPER_ADMIN" || r === "OPERATION_ADMIN");
    return this.svc.create(req.user.id, dto, isAdmin);
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取视频列表" })
  @ApiResponse({ status: 200, description: "成功返回视频列表" })
  list(@Req() req: Request, @Query() q: VideoListQueryDto, @StationId() stationId?: string) {
    // scope=all（不限开放范围）仅管理员生效——防公共端点带参绕过圈内内容隔离
    const roles = (req.user as { roles?: string[] } | undefined)?.roles || [];
    const isAdmin = roles.some((r) => r === "SUPER_ADMIN" || r === "OPERATION_ADMIN" || r === "CONTENT_AUDITOR");
    const scope = q.scope === "all" && isAdmin ? "all" : undefined;
    return this.svc.list({ circleId: q.circleId, status: q.status, page: +(q.page || 1), pageSize: +(q.pageSize || 20), stationId, scope });
  }

  // ───────── 瀑布流列表/搜索/商品库（公开，必须在 :id 之前）─────────

  @Get("items")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "视频瀑布流列表（含作者/播放量/热度标记；sort=recommend|hot|follow）" })
  @ApiResponse({ status: 200, description: "返回瀑布流格式视频列表" })
  listItems(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("sort") sort?: string,
  ) {
    return this.svc.listItems(+page, +pageSize, { sort, followerId: req.user?.id });
  }

  @Get("search")
  @ApiOperation({ summary: "搜索视频（标题/标签/作者）" })
  @ApiResponse({ status: 200, description: "返回搜索结果" })
  searchVideos(@Query("keyword") keyword?: string, @Query("category") category?: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.searchVideos({ keyword, category, page: +page, pageSize: +pageSize });
  }

  @Get("products")
  @ApiOperation({ summary: "可关联商品库（带货商品列表）" })
  @ApiResponse({ status: 200, description: "返回商品列表" })
  listProducts(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listProducts(+page, +pageSize);
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取视频详情（SELF_ONLY/已下架内容仅作者本人可见）" })
  @ApiResponse({ status: 200, description: "成功返回视频详情" })
  @ApiResponse({ status: 404, description: "视频不存在" })
  detail(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getDetail(id, req.user?.id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新视频" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "视频不存在" })
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateVideoDto) {
    return this.svc.update(req.user.id, id, dto);
  }

  @Put("admin/:id/audit")
  @Auditable({ action: "视频审核", targetType: "VIDEO" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "管理端审核视频（通过/驳回）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "审核成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无审核权限" })
  @ApiResponse({ status: 404, description: "视频不存在" })
  auditVideo(@Param("id") id: string, @Body() dto: AuditVideoDto) {
    return this.svc.audit(id, dto.action, dto.reason);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除视频" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "视频不存在" })
  delete(@Req() req: Request, @Param("id") id: string) {
    return this.svc.delete(req.user.id, id);
  }

  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "点赞/取消点赞视频" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "操作成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  like(@Param("id") id: string, @Req() req: Request) {
    return this.svc.toggleLike(req.user.id, id);
  }

  // ───────── VOD 上传签名 ─────────

  @Post("vod/upload-signature")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取VOD上传签名" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "返回上传签名" })
  @ApiResponse({ status: 401, description: "未认证" })
  getUploadSignature(@Body() dto?: UploadSignatureDto) {
    return this.svc.getUploadSignature(dto);
  }

  // ───────── VOD 播放鉴权 ─────────

  @Get("vod/play-signature/:fileId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取VOD播放器鉴权签名（psign）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "返回播放签名" })
  @ApiResponse({ status: 401, description: "未认证" })
  getPlaySignature(
    @Param("fileId") fileId: string,
    @Query("expire") expire?: string,
  ) {
    return this.svc.getPlaySignature(fileId, Number(expire) || 3600);
  }

  // ───────── VOD URL拉取上传 ─────────

  @Post("vod/pull-upload")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "从URL拉取视频上传到VOD" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "拉取任务创建成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  pullUpload(@Body() dto: PullUploadDto) {
    return this.svc.pullUpload(dto.urls, {
      mediaName: dto.mediaName,
      coverUrl: dto.coverUrl,
      procedure: dto.procedure,
      classId: dto.classId,
    });
  }

  // ───────── VOD 媒资处理 ─────────

  @Post("vod/process/:fileId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "处理媒资（转码+截图+水印+自适应码流）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "任务提交成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  processMedia(
    @Param("fileId") fileId: string,
    @Body() dto?: ProcessMediaDto,
  ) {
    return this.svc.processMedia(fileId, dto);
  }

  // ───────── VOD 视频剪辑 ─────────

  @Post("vod/clip")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "视频剪辑（截取片段生成新视频）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "剪辑任务创建成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  clipVideo(@Body() dto: ClipVideoDto) {
    return this.svc.clipVideo(dto);
  }

  // ───────── VOD 媒资信息 ─────────

  @Get("vod/media/:fileId")
  @ApiOperation({ summary: "获取VOD媒资信息" })
  @ApiResponse({ status: 200, description: "返回媒资信息" })
  getMediaInfo(@Param("fileId") fileId: string) {
    return this.svc.getMediaInfo(fileId);
  }

  @Delete("vod/media/:fileId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除VOD媒资" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  deleteMedia(@Param("fileId") fileId: string) {
    return this.svc.deleteMedia(fileId);
  }

  // ───────── VOD 搜索 ─────────

  @Get("vod/search")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "搜索VOD媒资库" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "返回搜索结果" })
  searchVodMedia(
    @Query("keyword") keyword?: string,
    @Query("offset") offset?: number,
    @Query("limit") limit?: number,
  ) {
    return this.svc.searchVodMedia({ keyword, offset, limit });
  }

  // ───────── VOD 播放统计 ─────────

  @Get("vod/playback-stats/:fileId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取视频播放统计（按天）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "返回播放统计数据" })
  @ApiResponse({ status: 401, description: "未认证" })
  getPlaybackStats(
    @Param("fileId") fileId: string,
    @Query() q: PlaybackStatsQueryDto,
  ) {
    return this.svc.getPlaybackStats(fileId, q.startDate, q.endDate);
  }

  @Get("vod/playback-summary")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取播放统计概览（全站）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "返回播放统计概览" })
  @ApiResponse({ status: 401, description: "未认证" })
  getPlaybackSummary(@Query() q: PlaybackStatsQueryDto) {
    return this.svc.getPlaybackSummary(q.startDate, q.endDate);
  }

  // ───────── VOD 回调 ─────────

  @Post("vod/callback")
  @HttpCode(200)
  @UseGuards(TencentCallbackGuard)
  @SkipFormat()
  @ApiOperation({ summary: "VOD事件回调（转码/截图/上传完成通知）" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  @ApiResponse({ status: 401, description: "签名验证失败" })
  vodCallback(@Body() body: Record<string, unknown>) {
    this.svc.handleVodCallback(body);
    return { code: 0 };
  }

  // ───────── 收藏 ─────────

  @Post(":id/collect")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "收藏/取消收藏视频" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "操作成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  toggleCollect(@Param("id") id: string, @Req() req: Request) {
    return this.svc.toggleCollect(req.user.id, id);
  }

  @Get("collected/mine")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我收藏的视频列表" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "返回收藏列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  listCollected(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listCollected(req.user.id, +page, +pageSize);
  }

  // ───────── 分享 ─────────

  @Post(":id/share")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "记录视频分享" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "分享记录成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  recordShare(@Param("id") id: string) {
    return this.svc.recordShare(id);
  }

  // ───────── 商品关联 ─────────

  @Post(":id/products/:productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加视频商品关联" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "关联成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  addProduct(@Param("id") id: string, @Param("productId") productId: string, @Req() req: Request) {
    return this.svc.addProduct(req.user.id, id, productId);
  }

  @Delete(":id/products/:productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "移除视频商品关联" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "移除成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  removeProduct(@Param("id") id: string, @Param("productId") productId: string, @Req() req: Request) {
    return this.svc.removeProduct(req.user.id, id, productId);
  }

}
