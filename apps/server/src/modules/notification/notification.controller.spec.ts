import { Test } from "@nestjs/testing";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockNotificationSvc = {
  send: jest.fn().mockResolvedValue({ id: "n1", sent: true }),
  batchSend: jest.fn().mockResolvedValue({ sent: 5, failed: 0 }),
  getUserNotifications: jest.fn().mockResolvedValue([{ id: "n1", title: "新消息" }]),
  getUnreadCount: jest.fn().mockResolvedValue(3),
  markRead: jest.fn().mockResolvedValue({ success: true }),
  markAllRead: jest.fn().mockResolvedValue({ success: true }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  getPreferences: jest.fn().mockResolvedValue({ push: true, email: false }),
  updatePreferences: jest.fn().mockResolvedValue({ push: true, email: true }),
};

describe("NotificationController", () => {
  let ctrl: NotificationController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: mockNotificationSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(NotificationController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /notifications — 发送通知", async () => {
    const dto: any = { userId: "u1", title: "系统通知", content: "欢迎" };
    const result: any = await ctrl.send(dto);
    expect(result.sent).toBe(true);
    expect(mockNotificationSvc.send).toHaveBeenCalled();
  });

  it("POST /notifications/batch — 批量发送", async () => {
    const dto: any = { userIds: ["u1", "u2"], title: "公告", content: "重要通知" };
    const result: any = await ctrl.batchSend(dto);
    expect(result.sent).toBe(5);
    expect(mockNotificationSvc.batchSend).toHaveBeenCalledWith(dto);
  });

  it("GET /notifications — 我的通知列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.myNotifications(req, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockNotificationSvc.getUserNotifications).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("GET /notifications/unread-count — 未读数量", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.unreadCount(req);
    expect(result).toBe(3);
    expect(mockNotificationSvc.getUnreadCount).toHaveBeenCalledWith("u1");
  });

  it("PUT /notifications/:id/read — 标记已读", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.markRead("n1", req);
    expect(result.success).toBe(true);
    expect(mockNotificationSvc.markRead).toHaveBeenCalledWith("n1", "u1");
  });

  it("PUT /notifications/read-all — 全部已读", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.markAllRead(req);
    expect(result.success).toBe(true);
    expect(mockNotificationSvc.markAllRead).toHaveBeenCalledWith("u1");
  });

  it("DELETE /notifications/:id — 删除通知", async () => {
    const result: any = await ctrl.delete("n1");
    expect(result.success).toBe(true);
    expect(mockNotificationSvc.delete).toHaveBeenCalledWith("n1");
  });

  it("GET /notifications/preferences — 获取偏好", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getPreferences(req);
    expect(result.push).toBe(true);
    expect(mockNotificationSvc.getPreferences).toHaveBeenCalledWith("u1");
  });

  it("PUT /notifications/preferences — 更新偏好", async () => {
    const req: any = { user: { id: "u1" } };
    const prefs = { push: true, email: true };
    const result: any = await ctrl.updatePreferences(req, prefs);
    expect(result.email).toBe(true);
    expect(mockNotificationSvc.updatePreferences).toHaveBeenCalledWith("u1", prefs);
  });
});
