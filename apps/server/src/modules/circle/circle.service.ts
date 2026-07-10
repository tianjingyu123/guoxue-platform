import { Injectable } from "@nestjs/common";
import { CreateCircleDto, UpdateCircleDto, CreatePostDto, JoinCircleDto, UpdateMemberRoleDto } from "./circle.dto";
import { CircleCoreService } from "./services/circle-core.service";
import { CircleMembershipService } from "./services/circle-membership.service";
import { CirclePostService } from "./services/circle-post.service";
import { CircleExpertService } from "./services/circle-expert.service";

/**
 * 圈子服务 Facade（P2-5 坏味道审查·按域拆分·纯搬家零行为变化）。
 * 原 1739 行 God 对象已按域拆为 4 内聚业务域 + 1 共享叶子域（services/）：
 * - CircleCoreService        圈子 CRUD/公告/邀请码/推荐电子书
 * - CircleMembershipService  加入/退出/续费/入圈支付/入圈申请/成员管理/过期清理定时任务（⚠️含资金）
 * - CirclePostService        帖子 CRUD/加精置顶/排行榜/帖子打赏（⚠️含资金）/全平台热帖聚合
 * - CircleExpertService      达人咨询配置/达人预约/成员分组
 * - CircleSharedService      共享叶子（checkOwnership/checkAdmin/ensureMember·被多域注入·破环）
 * 本 facade 仅委托，公共 API（方法签名/返回结构）逐字节不变，controller 及外部消费者零改动。
 * 定时任务（@Cron cleanupExpiredMembers/sendExpirationReminders）归 CircleMembershipService，
 * 由 NestJS schedule 从该 provider 直接发现，facade 不再声明避免重复注册。
 */
@Injectable()
export class CircleService {
  constructor(
    private coreSvc: CircleCoreService,
    private membershipSvc: CircleMembershipService,
    private postSvc: CirclePostService,
    private expertSvc: CircleExpertService,
  ) {}

  // ───────── 圈子 CRUD ─────────

  create(ownerId: string, dto: CreateCircleDto) {
    return this.coreSvc.create(ownerId, dto);
  }

  update(circleId: string, userId: string, dto: UpdateCircleDto) {
    return this.coreSvc.update(circleId, userId, dto);
  }

  getDetail(circleId: string, userId?: string) {
    return this.coreSvc.getDetail(circleId, userId);
  }

  listCircles(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    tag?: string;
    type?: string;
    stationId?: string;
  }) {
    return this.coreSvc.listCircles(params);
  }

  getMyCircles(userId: string) {
    return this.coreSvc.getMyCircles(userId);
  }

  getMyCircleStats(userId: string) {
    return this.coreSvc.getMyCircleStats(userId);
  }

  // ───────── 圈子公告 ─────────

  getAnnouncement(circleId: string) {
    return this.coreSvc.getAnnouncement(circleId);
  }

  setAnnouncement(circleId: string, userId: string, content: string, isTop?: boolean) {
    return this.coreSvc.setAnnouncement(circleId, userId, content, isTop);
  }

  listAnnouncements(circleId: string, rawPage = 1, rawPageSize = 20) {
    return this.coreSvc.listAnnouncements(circleId, rawPage, rawPageSize);
  }

  deleteAnnouncement(circleId: string, userId: string, announcementId: string) {
    return this.coreSvc.deleteAnnouncement(circleId, userId, announcementId);
  }

  markAnnouncementRead(circleId: string, announcementId: string, userId: string) {
    return this.coreSvc.markAnnouncementRead(circleId, announcementId, userId);
  }

  // ───────── 圈子邀请 ─────────

  generateInviteCode(circleId: string, userId: string, maxUses = 0) {
    return this.coreSvc.generateInviteCode(circleId, userId, maxUses);
  }

  joinByInviteCode(code: string, inviteeId: string) {
    return this.coreSvc.joinByInviteCode(code, inviteeId);
  }

  listMyInviteCodes(circleId: string, userId: string) {
    return this.coreSvc.listMyInviteCodes(circleId, userId);
  }

  getInvitationStats(circleId: string, userId: string) {
    return this.coreSvc.getInvitationStats(circleId, userId);
  }

  // ───────── 推荐电子书 ─────────

  getRecommendedEbooks(circleId: string, userId: string) {
    return this.coreSvc.getRecommendedEbooks(circleId, userId);
  }

  setRecommendedEbooks(circleId: string, userId: string, ebookIds: string[]) {
    return this.coreSvc.setRecommendedEbooks(circleId, userId, ebookIds);
  }

  // ───────── 成员管理 / 入圈支付 ─────────

  join(circleId: string, userId: string, dto?: JoinCircleDto) {
    return this.membershipSvc.join(circleId, userId, dto);
  }

  getMyJoinRequests(userId: string) {
    return this.membershipSvc.getMyJoinRequests(userId);
  }

  prepareJoin(circleId: string, userId: string, dto?: { payMethod?: string; referrerId?: string }) {
    return this.membershipSvc.prepareJoin(circleId, userId, dto);
  }

  confirmJoin(circleId: string, userId: string, dto: { payMethod?: string; orderNo?: string; orderId?: string; referrerId?: string }) {
    return this.membershipSvc.confirmJoin(circleId, userId, dto);
  }

  renewCircle(circleId: string, userId: string, dto?: { payMethod?: string }) {
    return this.membershipSvc.renewCircle(circleId, userId, dto);
  }

  confirmRenew(circleId: string, userId: string, dto: { orderId?: string; orderNo?: string }) {
    return this.membershipSvc.confirmRenew(circleId, userId, dto);
  }

  getJoinStatus(circleId: string, userId: string) {
    return this.membershipSvc.getJoinStatus(circleId, userId);
  }

  leave(circleId: string, userId: string) {
    return this.membershipSvc.leave(circleId, userId);
  }

  updateMemberRole(circleId: string, operatorId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    return this.membershipSvc.updateMemberRole(circleId, operatorId, targetUserId, dto);
  }

  removeMember(circleId: string, operatorId: string, targetUserId: string) {
    return this.membershipSvc.removeMember(circleId, operatorId, targetUserId);
  }

  listMembers(circleId: string, rawPage = 1, rawPageSize = 20) {
    return this.membershipSvc.listMembers(circleId, rawPage, rawPageSize);
  }

  // ───────── 帖子 ─────────

  createPost(circleId: string, userId: string, dto: CreatePostDto) {
    return this.postSvc.createPost(circleId, userId, dto);
  }

  getMyDrafts(userId: string, rawPage = 1, rawPageSize = 20) {
    return this.postSvc.getMyDrafts(userId, rawPage, rawPageSize);
  }

  publishPost(postId: string, userId: string) {
    return this.postSvc.publishPost(postId, userId);
  }

  updatePost(postId: string, userId: string, dto: Partial<CreatePostDto>) {
    return this.postSvc.updatePost(postId, userId, dto);
  }

  deletePost(postId: string, userId: string, circleId: string) {
    return this.postSvc.deletePost(postId, userId, circleId);
  }

  getPosts(circleId: string, query: { type?: string; isEssence?: string; page?: number; pageSize?: number }) {
    return this.postSvc.getPosts(circleId, query);
  }

  getPostDetail(postId: string) {
    return this.postSvc.getPostDetail(postId);
  }

  toggleEssence(postId: string, circleId: string, userId: string) {
    return this.postSvc.toggleEssence(postId, circleId, userId);
  }

  toggleTop(postId: string, circleId: string, userId: string) {
    return this.postSvc.toggleTop(postId, circleId, userId);
  }

  // ───────── 达人咨询配置 ─────────

  setExpertConfig(circleId: string, userId: string, dto: {
    questionPriceCoin: number;
    questionTimeoutHours: number;
    callPricePerMinuteCoin: number;
    callAvailableHours?: Array<{ day: string; start: string; end: string }>;
  }) {
    return this.expertSvc.setExpertConfig(circleId, userId, dto);
  }

  getExpertConfig(circleId: string, userId: string) {
    return this.expertSvc.getExpertConfig(circleId, userId);
  }

  listCircleExperts(circleId: string) {
    return this.expertSvc.listCircleExperts(circleId);
  }

  listUserConsultServices(userId: string) {
    return this.expertSvc.listUserConsultServices(userId);
  }

  // ───────── 排行榜 ─────────

  getCircleRanking(rawPage = 1, rawPageSize = 20, sortBy?: string) {
    return this.postSvc.getCircleRanking(rawPage, rawPageSize, sortBy);
  }

  getMemberLeaderboard(circleId: string, page = 1, pageSize = 20, period?: string) {
    return this.postSvc.getMemberLeaderboard(circleId, page, pageSize, period);
  }

  getHotContentRanking(circleId: string, limit = 10) {
    return this.postSvc.getHotContentRanking(circleId, limit);
  }

  // ───────── 成员分组 ─────────

  createMemberGroup(circleId: string, userId: string, name: string, color?: string) {
    return this.expertSvc.createMemberGroup(circleId, userId, name, color);
  }

  listMemberGroups(circleId: string) {
    return this.expertSvc.listMemberGroups(circleId);
  }

  updateMemberGroup(circleId: string, groupId: string, userId: string, name?: string, color?: string) {
    return this.expertSvc.updateMemberGroup(circleId, groupId, userId, name, color);
  }

  deleteMemberGroup(circleId: string, groupId: string, userId: string) {
    return this.expertSvc.deleteMemberGroup(circleId, groupId, userId);
  }

  addMembersToGroup(circleId: string, groupId: string, userId: string, userIds: string[]) {
    return this.expertSvc.addMembersToGroup(circleId, groupId, userId, userIds);
  }

  removeMemberFromGroup(circleId: string, groupId: string, userId: string, targetUserId: string) {
    return this.expertSvc.removeMemberFromGroup(circleId, groupId, userId, targetUserId);
  }

  getGroupMembers(circleId: string, groupId: string, rawPage = 1, rawPageSize = 20) {
    return this.expertSvc.getGroupMembers(circleId, groupId, rawPage, rawPageSize);
  }

  // ───────── 达人预约 ─────────

  getExpertSlots(expertId: string, date?: string) {
    return this.expertSvc.getExpertSlots(expertId, date);
  }

  createExpertBooking(
    expertId: string,
    bookerUserId: string,
    body: { slotDate: string; slotStart: string; slotEnd: string; topic?: string; notes?: string },
  ) {
    return this.expertSvc.createExpertBooking(expertId, bookerUserId, body);
  }

  // ───────── 帖子打赏 ─────────

  rewardPost(circleId: string, postId: string, userId: string, amount: number, message?: string) {
    return this.postSvc.rewardPost(circleId, postId, userId, amount, message);
  }

  // ───────── 全局聚合 ─────────

  getGlobalHotPosts(limit = 10) {
    return this.postSvc.getGlobalHotPosts(limit);
  }

  getTodayActivities(limit = 5) {
    return this.postSvc.getTodayActivities(limit);
  }
}
