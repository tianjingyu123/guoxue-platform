import { Injectable } from "@nestjs/common";
import { OfflineStationService } from "./services/offline-station.service";
import { OfflineCourseService } from "./services/offline-course.service";
import { OfflineCommerceService } from "./services/offline-commerce.service";
import { OfflineTeacherService } from "./services/offline-teacher.service";

/**
 * 线下驿站服务 Facade（P2-5 坏味道审查·按域拆分·纯搬家零行为变化）。
 * 原 1298 行 God 对象已按域拆为 4 内聚业务域 + 1 共享叶子域（services/）：
 * - OfflineStationService  驿站 CRUD/品牌主页/审核开通/发现/研究院成员
 * - OfflineCourseService   线下课程/报名签到/课后评价/同学圈/课程审核/核销监控
 * - OfflineCommerceService 商品/订单/结算/收益看板/商品监控
 * - OfflineTeacherService  师资预约/讲师管理/双向邀约/排期/预约监控
 * - OfflineSharedService   共享叶子（assertStationOwner/loadTeachers·被多域注入·破环）
 * 本 facade 仅委托，公共 API（方法签名/返回结构）逐字节不变，controller 及外部消费者零改动。
 */
@Injectable()
export class OfflineService {
  constructor(
    private stationSvc: OfflineStationService,
    private courseSvc: OfflineCourseService,
    private commerceSvc: OfflineCommerceService,
    private teacherSvc: OfflineTeacherService,
  ) {}

  // ───────── 线下驿站 ─────────

  createStation(dto: { name: string; city: string; address: string; phone: string; cover?: string; depositAmount?: number }, userId: string) {
    return this.stationSvc.createStation(dto, userId);
  }

  listStations(rawPage = 1, rawPageSize = 20, city?: string, status?: string) {
    return this.stationSvc.listStations(rawPage, rawPageSize, city, status);
  }

  getStation(id: string) {
    return this.stationSvc.getStation(id);
  }

  getMyStation(userId: string) {
    return this.stationSvc.getMyStation(userId);
  }

  // ───────── 品牌主页（驿-P1） ─────────

  getStationHome(id: string) {
    return this.stationSvc.getStationHome(id);
  }

  updateStationBrand(userId: string, dto: { brandStory?: string; photos?: string[]; featuredTeacherIds?: string[] }) {
    return this.stationSvc.updateStationBrand(userId, dto);
  }

  auditStation(id: string, status: string) {
    return this.stationSvc.auditStation(id, status);
  }

  // ───────── 驿站发现（用户端） ─────────

  discoverStations(params: { city?: string; keyword?: string; page?: number; pageSize?: number }) {
    return this.stationSvc.discoverStations(params);
  }

  // ───────── 研究院（平台管理视图） ─────────

  listMembers(rawPage = 1, rawPageSize = 20) {
    return this.stationSvc.listMembers(rawPage, rawPageSize);
  }

  updateMember(id: string, dto: { role?: string; status?: string }) {
    return this.stationSvc.updateMember(id, dto);
  }

  // ───────── 线下课程 ─────────

  createOfflineCourse(userId: string, dto: { stationId: string; title: string; cover?: string; intro?: string; teacherId?: string; price?: number; maxStudents: number; startTime: string; endTime: string; location: string }) {
    return this.courseSvc.createOfflineCourse(userId, dto);
  }

  listOfflineCourses(stationId?: string, rawPage = 1, rawPageSize = 20) {
    return this.courseSvc.listOfflineCourses(stationId, rawPage, rawPageSize);
  }

  getOfflineCourse(courseId: string) {
    return this.courseSvc.getOfflineCourse(courseId);
  }

  // ───────── 课程报名 ─────────

  getMyRegistration(courseId: string, userId: string) {
    return this.courseSvc.getMyRegistration(courseId, userId);
  }

  listMyCourseRegistrations(userId: string, rawPage = 1, rawPageSize = 20) {
    return this.courseSvc.listMyCourseRegistrations(userId, rawPage, rawPageSize);
  }

  registerCourse(userId: string, courseId: string) {
    return this.courseSvc.registerCourse(userId, courseId);
  }

  cancelRegistration(userId: string, courseId: string) {
    return this.courseSvc.cancelRegistration(userId, courseId);
  }

  signInCourse(operatorUserId: string, stationId: string, qrCode: string) {
    return this.courseSvc.signInCourse(operatorUserId, stationId, qrCode);
  }

  signInByCode(operatorUserId: string, courseId: string, code: string) {
    return this.courseSvc.signInByCode(operatorUserId, courseId, code);
  }

  listRegistrations(operatorUserId: string, courseId: string, rawPage = 1, rawPageSize = 20) {
    return this.courseSvc.listRegistrations(operatorUserId, courseId, rawPage, rawPageSize);
  }

  // ───────── 课后评价（T8 OMO） ─────────

  createCourseReview(userId: string, courseId: string, dto: { rating: number; content?: string }) {
    return this.courseSvc.createCourseReview(userId, courseId, dto);
  }

  listCourseReviews(courseId: string, rawPage = 1, rawPageSize = 20) {
    return this.courseSvc.listCourseReviews(courseId, rawPage, rawPageSize);
  }

  // ───────── 课后同学圈（T8 OMO） ─────────

  createStudyCircle(userId: string, courseId: string) {
    return this.courseSvc.createStudyCircle(userId, courseId);
  }

  // ───────── 驿站商品 ─────────

  createProduct(userId: string, stationId: string, dto: { name: string; price: number; stock?: number; isPlatform?: boolean }) {
    return this.commerceSvc.createProduct(userId, stationId, dto);
  }

  updateProduct(userId: string, productId: string, dto: { name?: string; price?: number; stock?: number; status?: string }) {
    return this.commerceSvc.updateProduct(userId, productId, dto);
  }

  listProducts(operatorUserId: string, stationId: string, params?: { status?: string; page?: number; pageSize?: number }) {
    return this.commerceSvc.listProducts(operatorUserId, stationId, params);
  }

  deleteProduct(userId: string, productId: string) {
    return this.commerceSvc.deleteProduct(userId, productId);
  }

  // ───────── 师资预约 ─────────

  createTeacherBooking(userId: string, stationId: string, dto: { teacherId: string; courseId?: string; bookingDate: string; remark?: string }) {
    return this.teacherSvc.createTeacherBooking(userId, stationId, dto);
  }

  confirmBooking(userId: string, bookingId: string) {
    return this.teacherSvc.confirmBooking(userId, bookingId);
  }

  cancelBooking(userId: string, bookingId: string) {
    return this.teacherSvc.cancelBooking(userId, bookingId);
  }

  listTeacherBookings(operatorUserId: string, stationId: string, params?: { teacherId?: string; status?: string; page?: number; pageSize?: number }) {
    return this.teacherSvc.listTeacherBookings(operatorUserId, stationId, params);
  }

  // ───────── 订单 ─────────

  createOrder(stationId: string, userId: string, dto: { orderType: string; targetId: string; amount: number }) {
    return this.commerceSvc.createOrder(stationId, userId, dto);
  }

  listOrders(operatorUserId: string, stationId: string, params?: { orderType?: string; status?: string; page?: number; pageSize?: number }) {
    return this.commerceSvc.listOrders(operatorUserId, stationId, params);
  }

  updateOrderStatus(userId: string, orderId: string, status: string) {
    return this.commerceSvc.updateOrderStatus(userId, orderId, status);
  }

  // ───────── 结算 ─────────

  createSettlement(stationId: string, dto: { period: string; totalIncome: number }) {
    return this.commerceSvc.createSettlement(stationId, dto);
  }

  listSettlements(operatorUserId: string, stationId: string, rawPage = 1, rawPageSize = 20) {
    return this.commerceSvc.listSettlements(operatorUserId, stationId, rawPage, rawPageSize);
  }

  settleStation(stationId: string, settlementId: string) {
    return this.commerceSvc.settleStation(stationId, settlementId);
  }

  // ───────── 收益看板 ─────────

  getRevenueDashboard(stationId: string) {
    return this.commerceSvc.getRevenueDashboard(stationId);
  }

  // ───────── 课程审核 ─────────

  auditCourse(courseId: string, auditStatus: string, reason?: string) {
    return this.courseSvc.auditCourse(courseId, auditStatus, reason);
  }

  toggleRecommend(courseId: string) {
    return this.courseSvc.toggleRecommend(courseId);
  }

  listPendingCourses(rawPage = 1, rawPageSize = 20, stationId?: string) {
    return this.courseSvc.listPendingCourses(rawPage, rawPageSize, stationId);
  }

  listRecommendedCourses(rawPage = 1, rawPageSize = 20) {
    return this.courseSvc.listRecommendedCourses(rawPage, rawPageSize);
  }

  // ───────── 讲师管理 ─────────

  createTeacher(dto: { name: string; stationId: string; avatar?: string; specialties?: string[]; bio?: string }) {
    return this.teacherSvc.createTeacher(dto);
  }

  createTeacherFromSigned(userId: string, stationId: string, sourceUserId: string, specialties?: string[], bio?: string) {
    return this.teacherSvc.createTeacherFromSigned(userId, stationId, sourceUserId, specialties, bio);
  }

  listTeachers(stationId?: string, rawPage = 1, rawPageSize = 20) {
    return this.teacherSvc.listTeachers(stationId, rawPage, rawPageSize);
  }

  getTeacher(id: string) {
    return this.teacherSvc.getTeacher(id);
  }

  updateTeacher(id: string, dto: { name?: string; avatar?: string; specialties?: string[]; bio?: string; status?: string }) {
    return this.teacherSvc.updateTeacher(id, dto);
  }

  deleteTeacher(id: string) {
    return this.teacherSvc.deleteTeacher(id);
  }

  getTeacherSchedule(teacherId: string, month: string) {
    return this.teacherSvc.getTeacherSchedule(teacherId, month);
  }

  checkScheduleConflicts(teacherId: string, date: string) {
    return this.teacherSvc.checkScheduleConflicts(teacherId, date);
  }

  setTeacherAvailability(teacherId: string, slots: string[]) {
    return this.teacherSvc.setTeacherAvailability(teacherId, slots);
  }

  // ───────── 驿站-老师双向选择 ─────────

  createTeacherRequest(stationId: string, userId: string, body: {
    teacherId?: string; courseTitle?: string; courseIntro?: string; proposedFee?: number; proposeDate?: string;
  }) {
    return this.teacherSvc.createTeacherRequest(stationId, userId, body);
  }

  listTeacherRequests(stationId: string, userId: string, status?: string) {
    return this.teacherSvc.listTeacherRequests(stationId, userId, status);
  }

  respondTeacherRequest(id: string, userId: string, status: string) {
    return this.teacherSvc.respondTeacherRequest(id, userId, status);
  }

  getTeacherRequestsForTeacher(teacherId: string, status?: string) {
    return this.teacherSvc.getTeacherRequestsForTeacher(teacherId, status);
  }

  /** 管理员查看所有教师邀约 */
  adminListTeacherRequests(status?: string, rawPage = 1, rawPageSize = 20) {
    return this.teacherSvc.adminListTeacherRequests(status, rawPage, rawPageSize);
  }

  // ───────── 平台管理视图（跨驿站只读监控） ─────────

  /** 核销记录（跨驿站签到核销，平台监控）— status=SIGNED_IN */
  adminListCheckins(params?: { stationId?: string; page?: number; pageSize?: number }) {
    return this.courseSvc.adminListCheckins(params);
  }

  /** 驿站商品（跨驿站列表，平台监控）*/
  adminListProducts(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    return this.commerceSvc.adminListProducts(params);
  }

  /** 师资预约（跨驿站列表，平台监控）*/
  adminListBookings(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    return this.teacherSvc.adminListBookings(params);
  }
}
