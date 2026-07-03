import { Test } from "@nestjs/testing";
import { OfflineController } from "./offline.controller";
import { OfflineService } from "./offline.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockOfflineSvc = {
  createStation: jest.fn().mockResolvedValue({ id: "s1", name: "北京驿站" }),
  listStations: jest.fn().mockResolvedValue([{ id: "s1", name: "北京驿站" }]),
  discoverStations: jest.fn().mockResolvedValue([{ id: "s1", name: "北京驿站", distance: 2.5 }]),
  getStation: jest.fn().mockResolvedValue({ id: "s1", name: "北京驿站", address: "..." }),
  auditStation: jest.fn().mockResolvedValue({ id: "s1", status: "APPROVED" }),
  getRevenueDashboard: jest.fn().mockResolvedValue({ revenue: 50000, orders: 200 }),
  createOfflineCourse: jest.fn().mockResolvedValue({ id: "oc1", title: "线下国学课" }),
  listOfflineCourses: jest.fn().mockResolvedValue([{ id: "oc1", title: "线下国学课" }]),
  getOfflineCourse: jest.fn().mockResolvedValue({ id: "oc1", title: "线下国学课", registrations: [] }),
  registerCourse: jest.fn().mockResolvedValue({ id: "reg1", courseId: "oc1" }),
  cancelRegistration: jest.fn().mockResolvedValue({ success: true }),
  signInCourse: jest.fn().mockResolvedValue({ id: "reg1", signedIn: true }),
  listRegistrations: jest.fn().mockResolvedValue([{ id: "reg1", userId: "u1" }]),
  createProduct: jest.fn().mockResolvedValue({ id: "p1", name: "驿站商品" }),
  updateProduct: jest.fn().mockResolvedValue({ id: "p1", name: "更新商品" }),
  listProducts: jest.fn().mockResolvedValue([{ id: "p1", name: "驿站商品" }]),
  deleteProduct: jest.fn().mockResolvedValue({ success: true }),
  createTeacherBooking: jest.fn().mockResolvedValue({ id: "tb1", teacherId: "u2" }),
  confirmBooking: jest.fn().mockResolvedValue({ id: "tb1", status: "CONFIRMED" }),
  cancelBooking: jest.fn().mockResolvedValue({ id: "tb1", status: "CANCELLED" }),
  listTeacherBookings: jest.fn().mockResolvedValue([{ id: "tb1", status: "PENDING" }]),
  createOrder: jest.fn().mockResolvedValue({ id: "o1", amount: 200 }),
  listOrders: jest.fn().mockResolvedValue([{ id: "o1", amount: 200 }]),
  updateOrderStatus: jest.fn().mockResolvedValue({ id: "o1", status: "PAID" }),
  createSettlement: jest.fn().mockResolvedValue({ id: "sl1", amount: 10000 }),
  listSettlements: jest.fn().mockResolvedValue([{ id: "sl1", amount: 10000 }]),
  settleStation: jest.fn().mockResolvedValue({ id: "sl1", status: "SETTLED" }),
  listMembers: jest.fn().mockResolvedValue([{ id: "m1", name: "研究员A" }]),
  updateMember: jest.fn().mockResolvedValue({ id: "m1", name: "更新名称" }),
};

describe("OfflineController", () => {
  let ctrl: OfflineController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [OfflineController],
      providers: [{ provide: OfflineService, useValue: mockOfflineSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(OfflineController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ─── 驿站 CRUD ───
  it("POST /offline/stations — 创建驿站", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "北京驿站", city: "北京" };
    const result: any = await ctrl.createStation(req, dto);
    expect(result.name).toBe("北京驿站");
  });

  it("GET /offline/stations — 驿站列表", async () => {
    const result: any = await ctrl.listStations(1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("GET /offline/stations/discover — 驿站发现", async () => {
    const result: any = await ctrl.discoverStations("北京", "国学", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockOfflineSvc.discoverStations).toHaveBeenCalled();
  });

  it("GET /offline/stations/:id — 驿站详情", async () => {
    const result: any = await ctrl.getStation("s1");
    expect(result.name).toBe("北京驿站");
  });

  it("PUT /offline/stations/:id/audit — 审核驿站", async () => {
    const dto: any = { status: "APPROVED" };
    const result: any = await ctrl.auditStation("s1", dto);
    expect(result.status).toBe("APPROVED");
  });

  it("GET /offline/stations/:id/revenue-dashboard — 收益看板", async () => {
    const result: any = await ctrl.getRevenueDashboard("s1");
    expect(result.revenue).toBe(50000);
  });

  // ─── 线下课程 ───
  it("POST /offline/courses — 创建课程", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "线下国学课", stationId: "s1" };
    const result: any = await ctrl.createCourse(req, dto);
    expect(result.title).toBe("线下国学课");
  });

  it("GET /offline/courses — 课程列表", async () => {
    const result: any = await ctrl.listCourses("s1", 1, 20);
    expect(result).toHaveLength(1);
  });

  it("GET /offline/courses/:id — 课程详情", async () => {
    const result: any = await ctrl.getCourse("oc1");
    expect(result.title).toBe("线下国学课");
  });

  it("POST /offline/courses/:id/register — 报名课程", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.registerCourse(req, "oc1");
    expect(result.courseId).toBe("oc1");
  });

  it("POST /offline/courses/:id/cancel — 取消报名", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.cancelRegistration(req, "oc1");
    expect(result.success).toBe(true);
  });

  it("POST /offline/courses/sign-in — 扫码签到", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { qrCode: "QR_CODE_123" };
    const result: any = await ctrl.signInCourse(req, dto, "s1");
    expect(result.signedIn).toBe(true);
    expect(mockOfflineSvc.signInCourse).toHaveBeenCalledWith("u1", "s1", "QR_CODE_123");
  });

  it("GET /offline/courses/:id/registrations — 报名列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listRegistrations(req, "oc1", 1, 20);
    expect(result).toHaveLength(1);
    expect(mockOfflineSvc.listRegistrations).toHaveBeenCalledWith("u1", "oc1", 1, 20);
  });

  // ─── 驿站商品 ───
  it("POST /offline/stations/:id/products — 添加商品", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "驿站商品", price: 99 };
    const result: any = await ctrl.createProduct(req, "s1", dto);
    expect(result.name).toBe("驿站商品");
  });

  it("PUT /offline/products/:productId — 更新商品", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "更新商品", price: 129 };
    const result: any = await ctrl.updateProduct(req, "p1", dto);
    expect(result.name).toBe("更新商品");
  });

  it("GET /offline/stations/:id/products — 商品列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listProducts(req, "s1", "ACTIVE", 1, 20);
    expect(result).toHaveLength(1);
    expect(mockOfflineSvc.listProducts).toHaveBeenCalledWith("u1", "s1", { status: "ACTIVE", page: 1, pageSize: 20 });
  });

  it("DELETE /offline/products/:productId — 下架商品", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.deleteProduct(req, "p1");
    expect(result.success).toBe(true);
  });

  // ─── 师资预约 ───
  it("POST /offline/stations/:id/teacher-bookings — 创建预约", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { teacherId: "u2", date: "2025-06-01" };
    const result: any = await ctrl.createTeacherBooking(req, "s1", dto);
    expect(result.id).toBe("tb1");
  });

  it("PUT /offline/teacher-bookings/:bookingId/confirm — 确认预约", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.confirmBooking(req, "tb1");
    expect(result.status).toBe("CONFIRMED");
  });

  it("PUT /offline/teacher-bookings/:bookingId/cancel — 取消预约", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.cancelBooking(req, "tb1");
    expect(result.status).toBe("CANCELLED");
  });

  it("GET /offline/stations/:id/teacher-bookings — 预约列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listTeacherBookings(req, "s1", "u2", "PENDING", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockOfflineSvc.listTeacherBookings).toHaveBeenCalledWith("u1", "s1", { teacherId: "u2", status: "PENDING", page: 1, pageSize: 20 });
  });

  // ─── 订单 ───
  it("POST /offline/stations/:id/orders — 创建订单", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { items: [{ productId: "p1", quantity: 2 }] };
    const result: any = await ctrl.createOrder(req, "s1", dto);
    expect(result.amount).toBe(200);
  });

  it("GET /offline/stations/:id/orders — 订单列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listOrders(req, "s1", "PRODUCT", "PAID", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockOfflineSvc.listOrders).toHaveBeenCalledWith("u1", "s1", { orderType: "PRODUCT", status: "PAID", page: 1, pageSize: 20 });
  });

  it("PUT /offline/orders/:orderId — 更新订单状态", async () => {
    const req: any = { user: { id: "u1" } };
    const dto = { status: "PAID" };
    const result: any = await ctrl.updateOrderStatus(req, "o1", dto);
    expect(result.status).toBe("PAID");
  });

  // ─── 结算 ───
  it("POST /offline/stations/:id/settlements — 创建结算单", async () => {
    const dto: any = { amount: 10000, period: "2025-05" };
    const result: any = await ctrl.createSettlement("s1", dto);
    expect(result.amount).toBe(10000);
  });

  it("GET /offline/stations/:id/settlements — 结算记录", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listSettlements(req, "s1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockOfflineSvc.listSettlements).toHaveBeenCalledWith("u1", "s1", 1, 20);
  });

  it("PUT /offline/settlements/:settlementId/settle — 执行结算", async () => {
    const result: any = await ctrl.settleStation("sl1", "s1");
    expect(result.status).toBe("SETTLED");
  });

  // ─── 研究院成员 ───
  it("GET /offline/institute/members — 研究院成员列表", async () => {
    const result: any = await ctrl.listInstituteMembers(1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("PUT /offline/institute/members/:id — 更新成员", async () => {
    const dto: any = { name: "更新名称" };
    const result: any = await ctrl.updateInstituteMember("m1", dto);
    expect(result.name).toBe("更新名称");
  });
});
