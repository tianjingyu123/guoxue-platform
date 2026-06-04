import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { CircleService } from "./circle.service";
import { CreateCircleDto, UpdateCircleDto, CreatePostDto, JoinCircleDto, UpdateMemberRoleDto, ExpertConfigDto } from "./circle.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { StationId } from "../../common/station-id.decorator";
import { SanitizePipe } from "../../common/sanitize.pipe";
import { Request } from "express";

@ApiTags("圈子")
@Controller("circles")
export class CircleController {
  constructor(private circle: CircleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "创建圈子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未认证" })
  create(@Req() req: Request, @Body() dto: CreateCircleDto) {
    return this.circle.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "获取圈子列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "keyword", required: false, type: String, description: "搜索关键词" })
  @ApiQuery({ name: "tag", required: false, type: String, description: "标签筛选" })
  @ApiQuery({ name: "type", required: false, type: String, description: "类型筛选" })
  @ApiResponse({ status: 200, description: "成功返回圈子列表" })
  list(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("keyword") keyword?: string,
    @Query("tag") tag?: string,
    @Query("type") type?: string,
    @StationId() stationId?: string,
  ) {
    return this.circle.listCircles({ page: +page, pageSize: +pageSize, keyword, tag, type, stationId });
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的圈子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "成功返回我的圈子列表" })
  @ApiResponse({ status: 401, description: "未认证" })
  getMyCircles(@Req() req: Request) {
    return this.circle.getMyCircles(req.user.id);
  }

  // ───────── 草稿管理 ─────────

  @Get("drafts")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的草稿列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getMyDrafts(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.circle.getMyDrafts(req.user.id, +page, +pageSize);
  }

  // ───────── 排行榜 ─────────

  @Get("ranking")
  @ApiOperation({ summary: "圈子活跃度排行" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "sortBy", required: false, type: String, description: "排序字段：memberCount/postCount/activityScore" })
  @ApiResponse({ status: 200, description: "成功返回圈子活跃度排行" })
  getCircleRanking(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("sortBy") sortBy?: string,
  ) {
    return this.circle.getCircleRanking(+page, +pageSize, sortBy);
  }

  @Get(":id")
  @UseGuards(StationIsolationGuard)
  @ApiOperation({ summary: "获取圈子详情" })
  @ApiResponse({ status: 200, description: "成功返回圈子详情" })
  @ApiResponse({ status: 404, description: "圈子不存在" })
  detail(@Param("id") id: string, @Req() req?: Request) {
    return this.circle.getDetail(id, req?.user?.id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "更新圈子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "圈子不存在" })
  update(@Param("id") id: string, @Req() req: Request, @Body() dto: UpdateCircleDto) {
    return this.circle.update(id, req.user.id, dto);
  }

  // ───────── 圈子公告 ─────────

  @Get(":id/announcement")
  @ApiOperation({ summary: "获取圈子公告" })
  getAnnouncement(@Param("id") id: string) {
    return this.circle.getAnnouncement(id);
  }

  @Put(":id/announcement")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "设置圈子公告（圈主/管理员）" })
  @ApiBearerAuth()
  setAnnouncement(@Param("id") circleId: string, @Req() req: Request, @Body("content") content: string, @Body("isTop") isTop?: boolean) {
    return this.circle.setAnnouncement(circleId, req.user.id, content, isTop);
  }

  @Get(":id/announcements")
  @ApiOperation({ summary: "获取公告列表（分页）" })
  listAnnouncements(@Param("id") circleId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.circle.listAnnouncements(circleId, +page, +pageSize);
  }

  @Delete(":id/announcement/:announcementId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除公告（圈主/管理员）" })
  @ApiBearerAuth()
  deleteAnnouncement(@Param("id") circleId: string, @Param("announcementId") announcementId: string, @Req() req: Request) {
    return this.circle.deleteAnnouncement(circleId, req.user.id, announcementId);
  }

  // ───────── 圈子邀请 ─────────

  @Post(":id/invite-code")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "生成邀请码" })
  @ApiBearerAuth()
  generateInviteCode(@Param("id") circleId: string, @Req() req: Request, @Body("maxUses") maxUses?: number) {
    return this.circle.generateInviteCode(circleId, req.user.id, maxUses);
  }

  @Post("join-by-code")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "通过邀请码加入圈子" })
  @ApiBearerAuth()
  joinByInviteCode(@Body("code") code: string, @Req() req: Request) {
    return this.circle.joinByInviteCode(code, req.user.id);
  }

  @Get(":id/invite-codes")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的邀请码列表" })
  @ApiBearerAuth()
  listMyInviteCodes(@Param("id") circleId: string, @Req() req: Request) {
    return this.circle.listMyInviteCodes(circleId, req.user.id);
  }

  @Get(":id/invitation-stats")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "邀请统计" })
  @ApiBearerAuth()
  getInvitationStats(@Param("id") circleId: string, @Req() req: Request) {
    return this.circle.getInvitationStats(circleId, req.user.id);
  }

  @Post(":id/join")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "加入圈子（免费圈直接加入，付费圈请先调用 prepare-join）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "加入成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "圈子不存在" })
  @ApiResponse({ status: 409, description: "已是圈子成员" })
  join(@Param("id") id: string, @Req() req: Request, @Body() dto?: JoinCircleDto) {
    return this.circle.join(id, req.user.id, dto);
  }

  @Post(":id/join/prepare")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "准备付费入圈（创建订单/检查余额）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "返回支付信息" })
  prepareJoin(@Param("id") circleId: string, @Req() req: Request, @Body() dto?: { payMethod?: string; referrerId?: string }) {
    return this.circle.prepareJoin(circleId, req.user.id, dto);
  }

  @Post(":id/join/confirm")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "确认付费入圈（支付完成后调用）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "入圈成功" })
  confirmJoin(@Param("id") circleId: string, @Req() req: Request, @Body() dto: { payMethod?: string; orderNo?: string; orderId?: string; referrerId?: string }) {
    return this.circle.confirmJoin(circleId, req.user.id, dto);
  }

  @Get(":id/join/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "查询入圈状态（是否已加入/是否过期）" })
  @ApiBearerAuth()
  getJoinStatus(@Param("id") circleId: string, @Req() req: Request) {
    return this.circle.getJoinStatus(circleId, req.user.id);
  }

  @Post(":id/renew")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "续费年费圈子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "续费成功" })
  renewCircle(@Param("id") circleId: string, @Req() req: Request, @Body() dto?: { payMethod?: string }) {
    return this.circle.renewCircle(circleId, req.user.id, dto);
  }

  @Post(":id/leave")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "退出圈子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "退出成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "未加入该圈子" })
  leave(@Param("id") id: string, @Req() req: Request) {
    return this.circle.leave(id, req.user.id);
  }

  @Get(":id/members")
  @ApiOperation({ summary: "获取圈子成员列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiResponse({ status: 200, description: "成功返回成员列表" })
  members(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.circle.listMembers(id, +page, +pageSize);
  }

  @Put(":id/members/:userId/role")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新成员角色" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "角色更新成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需圈主/管理员）" })
  @ApiResponse({ status: 404, description: "成员或圈子不存在" })
  updateMemberRole(
    @Param("id") circleId: string,
    @Param("userId") targetUserId: string,
    @Req() req: Request,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.circle.updateMemberRole(circleId, req.user.id, targetUserId, dto);
  }

  @Delete(":id/members/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "移除圈子成员" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "移除成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "成员不存在" })
  removeMember(
    @Param("id") circleId: string,
    @Param("userId") targetUserId: string,
    @Req() req: Request,
  ) {
    return this.circle.removeMember(circleId, req.user.id, targetUserId);
  }

  // ───────── 帖子 ─────────

  @Post(":id/posts")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "创建帖子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "发帖成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 404, description: "圈子不存在" })
  createPost(@Param("id") circleId: string, @Req() req: Request, @Body() dto: CreatePostDto) {
    return this.circle.createPost(circleId, req.user.id, dto);
  }

  @Get(":id/posts")
  @ApiOperation({ summary: "获取帖子列表" })
  @ApiQuery({ name: "type", required: false, type: String, description: "帖子类型" })
  @ApiQuery({ name: "isEssence", required: false, type: String, description: "精华帖筛选" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiResponse({ status: 200, description: "成功返回帖子列表" })
  getPosts(
    @Param("id") circleId: string,
    @Query("type") type?: string,
    @Query("isEssence") isEssence?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.circle.getPosts(circleId, { type, isEssence, page: +page, pageSize: +pageSize });
  }

  @Get(":id/posts/:postId")
  @ApiOperation({ summary: "获取帖子详情" })
  @ApiResponse({ status: 200, description: "成功返回帖子详情" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  getPostDetail(@Param("postId") postId: string) {
    return this.circle.getPostDetail(postId);
  }

  @Put(":id/posts/:postId")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "更新帖子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  updatePost(@Param("postId") postId: string, @Req() req: Request, @Body() dto: CreatePostDto) {
    return this.circle.updatePost(postId, req.user.id, dto);
  }

  @Delete(":id/posts/:postId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除帖子" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  deletePost(
    @Param("id") circleId: string,
    @Param("postId") postId: string,
    @Req() req: Request,
  ) {
    return this.circle.deletePost(postId, req.user.id, circleId);
  }

  @Post(":id/posts/:postId/publish")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发布草稿帖子" })
  @ApiBearerAuth()
  publishPost(@Param("id") circleId: string, @Param("postId") postId: string, @Req() req: Request) {
    return this.circle.publishPost(postId, req.user.id);
  }

  @Post(":id/posts/:postId/essence")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "切换帖子精华状态" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "切换成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需管理员）" })
  toggleEssence(@Param("id") circleId: string, @Param("postId") postId: string, @Req() req: Request) {
    return this.circle.toggleEssence(postId, circleId, req.user.id);
  }

  @Post(":id/posts/:postId/top")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "切换帖子置顶状态" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "切换成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需管理员）" })
  toggleTop(@Param("id") circleId: string, @Param("postId") postId: string, @Req() req: Request) {
    return this.circle.toggleTop(postId, circleId, req.user.id);
  }

  // ───────── 达人咨询配置 ─────────

  @Post(":id/expert/config")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "配置达人咨询价格", description: "圈主/嘉宾设置提问价格和连麦价格" })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: "配置成功" })
  @ApiResponse({ status: 401, description: "未认证" })
  @ApiResponse({ status: 403, description: "无权限（需圈主/管理员/嘉宾）" })
  setExpertConfig(@Param("id") circleId: string, @Req() req: Request, @Body() dto: ExpertConfigDto) {
    return this.circle.setExpertConfig(circleId, dto.userId || req.user.id, dto);
  }

  @Get(":id/expert/:userId")
  @ApiOperation({ summary: "获取达人咨询配置", description: "查看某成员的提问/连麦价格设置" })
  @ApiResponse({ status: 200, description: "成功返回达人配置" })
  @ApiResponse({ status: 404, description: "成员或配置不存在" })
  getExpertConfig(@Param("id") circleId: string, @Param("userId") userId: string) {
    return this.circle.getExpertConfig(circleId, userId);
  }

  @Get(":id/experts")
  @ApiOperation({ summary: "圈子达人列表", description: "获取圈子内所有可提问/连麦的达人" })
  @ApiResponse({ status: 200, description: "成功返回达人列表" })
  listExperts(@Param("id") circleId: string) {
    return this.circle.listCircleExperts(circleId);
  }

  @Get(":id/leaderboard")
  @ApiOperation({ summary: "成员贡献榜", description: "按发帖量等指标统计成员贡献排名" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "period", required: false, type: String, description: "统计周期：week/month/all" })
  @ApiResponse({ status: 200, description: "成功返回成员贡献榜" })
  @ApiResponse({ status: 404, description: "圈子不存在" })
  getMemberLeaderboard(
    @Param("id") id: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("period") period?: string,
  ) {
    return this.circle.getMemberLeaderboard(id, +page, +pageSize, period);
  }

  @Get(":id/hot-content")
  @ApiOperation({ summary: "内容热度榜", description: "按点赞数+评论数排序的热门帖子" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回条数，默认10" })
  @ApiResponse({ status: 200, description: "成功返回热门内容列表" })
  @ApiResponse({ status: 404, description: "圈子不存在" })
  getHotContentRanking(
    @Param("id") id: string,
    @Query("limit") limit = 10,
  ) {
    return this.circle.getHotContentRanking(id, +limit);
  }

  // ───────── 成员分组 ─────────

  @Post(":id/member-groups")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建成员分组" })
  @ApiBearerAuth()
  createMemberGroup(@Param("id") circleId: string, @Req() req: Request, @Body("name") name: string, @Body("color") color?: string) {
    return this.circle.createMemberGroup(circleId, req.user.id, name, color);
  }

  @Get(":id/member-groups")
  @ApiOperation({ summary: "获取成员分组列表" })
  listMemberGroups(@Param("id") circleId: string) {
    return this.circle.listMemberGroups(circleId);
  }

  @Put(":id/member-groups/:groupId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新成员分组" })
  @ApiBearerAuth()
  updateMemberGroup(@Param("id") circleId: string, @Param("groupId") groupId: string, @Req() req: Request, @Body("name") name?: string, @Body("color") color?: string) {
    return this.circle.updateMemberGroup(circleId, groupId, req.user.id, name, color);
  }

  @Delete(":id/member-groups/:groupId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除成员分组" })
  @ApiBearerAuth()
  deleteMemberGroup(@Param("id") circleId: string, @Param("groupId") groupId: string, @Req() req: Request) {
    return this.circle.deleteMemberGroup(circleId, groupId, req.user.id);
  }

  @Post(":id/member-groups/:groupId/members")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加成员到分组" })
  @ApiBearerAuth()
  addMembersToGroup(@Param("id") circleId: string, @Param("groupId") groupId: string, @Req() req: Request, @Body("userIds") userIds: string[]) {
    return this.circle.addMembersToGroup(circleId, groupId, req.user.id, userIds);
  }

  @Delete(":id/member-groups/:groupId/members/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "从分组移除成员" })
  @ApiBearerAuth()
  removeMemberFromGroup(@Param("id") circleId: string, @Param("groupId") groupId: string, @Param("userId") targetUserId: string, @Req() req: Request) {
    return this.circle.removeMemberFromGroup(circleId, groupId, req.user.id, targetUserId);
  }

  @Get(":id/member-groups/:groupId/members")
  @ApiOperation({ summary: "获取分组成员列表" })
  getGroupMembers(@Param("id") circleId: string, @Param("groupId") groupId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.circle.getGroupMembers(circleId, groupId, +page, +pageSize);
  }

  // ───────── 公告已读 ─────────

  @Post(":id/announcements/:announcementId/read")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "标记公告已读" })
  @ApiBearerAuth()
  markAnnouncementRead(
    @Param("id") circleId: string,
    @Param("announcementId") announcementId: string,
    @Req() req: Request,
  ) {
    return this.circle.markAnnouncementRead(circleId, announcementId, req.user.id);
  }

  // ───────── 达人预约 ─────────

  @Get("expert/:expertId/slots")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取达人可预约时段", description: "返回达人某日可用的时间段" })
  @ApiBearerAuth()
  getExpertSlots(
    @Param("expertId") expertId: string,
    @Query("date") date?: string,
  ) {
    return this.circle.getExpertSlots(expertId, date);
  }

  @Post("expert/:expertId/bookings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建达人预约" })
  @ApiBearerAuth()
  createExpertBooking(
    @Param("expertId") expertId: string,
    @Req() req: Request,
    @Body() body: { slotDate: string; slotStart: string; slotEnd: string; topic?: string; notes?: string },
  ) {
    return this.circle.createExpertBooking(expertId, req.user.id, body);
  }
}
