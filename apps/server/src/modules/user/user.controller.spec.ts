import { Test } from "@nestjs/testing";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { SystemService } from "../system/system.service";
import { RolesGuard } from "../../common/roles.guard";
import { PersonalDataExportService } from "./personal-data-export.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockUserSvc: Record<string, jest.Mock> = {
  updateProfile: jest.fn().mockResolvedValue({ id: "u1", nickname: "新昵称" } as any),
  getNotifySettings: jest.fn().mockResolvedValue([{ key: "operatorTeam", value: true }] as any),
  updateNotifySettings: jest.fn().mockResolvedValue({ success: true } as any),
  getMySummary: jest.fn().mockResolvedValue({ stats: { following: 2, followers: 3, likes: 4 } } as any),
  getUserById: jest.fn().mockResolvedValue({ id: "u1", nickname: "张三" } as any),
  getUserStats: jest.fn().mockResolvedValue({ articleCount: 10, followerCount: 100 } as any),
  listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as any),
  assignRole: jest.fn().mockResolvedValue({ id: "u1", roles: ["EDITOR"] } as any),
  removeRole: jest.fn().mockResolvedValue({ id: "u1", roles: [] } as any),
  batchUpdateStatus: jest.fn().mockResolvedValue({ updated: 3 } as any),
  updateUserStatus: jest.fn().mockResolvedValue({ id: "u1", status: "BANNED" } as any),
  getMemberPurchases: jest.fn().mockResolvedValue([] as any),
  follow: jest.fn().mockResolvedValue({ success: true } as any),
  unfollow: jest.fn().mockResolvedValue({ success: true } as any),
  getFollowers: jest.fn().mockResolvedValue({ items: [], total: 0 } as any),
  getFollowing: jest.fn().mockResolvedValue({ items: [], total: 0 } as any),
  isFollowing: jest.fn().mockResolvedValue({ following: true } as any),
  pushByTag: jest.fn().mockResolvedValue({ sent: 5 } as any),
  getWhitelist: jest.fn().mockResolvedValue({ items: [], total: 0 } as any),
  addWhitelist: jest.fn().mockResolvedValue({ userId: "u1" } as any),
  removeWhitelist: jest.fn().mockResolvedValue({ success: true } as any),
  getUserProfile: jest.fn().mockResolvedValue({ id: "u1" } as any),
  getInterestStats: jest.fn().mockResolvedValue({ totalUsers: 100 } as any),
  requestAccountDeletion: jest.fn().mockResolvedValue({ message: "已提交" } as any),
  cancelAccountDeletion: jest.fn().mockResolvedValue({ message: "已取消" } as any),
  executeAccountDeletion: jest.fn().mockResolvedValue({ message: "已注销" } as any),
};

const mockSystemSvc = {
  logAudit: jest.fn().mockResolvedValue(undefined),
};

const mockPersonalDataExport = {
  create: jest.fn().mockResolvedValue({ accountId: "u1", selectedTypes: ["profile"] }),
};

describe("UserController", () => {
  let ctrl: UserController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserSvc },
        { provide: SystemService, useValue: mockSystemSvc },
        { provide: PersonalDataExportService, useValue: mockPersonalDataExport },
      ],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(UserController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const mockReq = () => ({ user: { id: "u1" }, ip: "127.0.0.1" } as any);

  it("PUT /users/profile — 更新个人资料", async () => {
    const result: any = await ctrl.updateProfile(mockReq(), { nickname: "新昵称" });
    expect(result.nickname).toBe("新昵称");
  });

  it("GET /users/notify-settings?scope=operator — 获取运营商通知偏好", async () => {
    const result: any = await ctrl.getNotifySettings(mockReq(), "operator");
    expect(result[0].key).toBe("operatorTeam");
    expect(mockUserSvc.getNotifySettings).toHaveBeenCalledWith("u1", "operator");
  });

  it("PUT /users/notify-settings — 更新运营商通知偏好", async () => {
    const dto = { key: "operatorTeam", value: false } as any;
    const result: any = await ctrl.updateNotifySettings(mockReq(), dto);
    expect(result.success).toBe(true);
    expect(mockUserSvc.updateNotifySettings).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /users/me/summary — 当前用户个人中心统计", async () => {
    const result: any = await ctrl.getMySummary(mockReq());
    expect(result.stats.likes).toBe(4);
    expect(mockUserSvc.getMySummary).toHaveBeenCalledWith("u1");
  });

  it("POST /users/me/data-export — 只导出当前登录用户所选数据", async () => {
    const result: any = await ctrl.createPersonalDataExport(mockReq(), { types: ["profile"] });
    expect(result.accountId).toBe("u1");
    expect(mockPersonalDataExport.create).toHaveBeenCalledWith("u1", ["profile"]);
  });

  it("GET /users/:id — 获取用户详情", async () => {
    const result: any = await ctrl.getUser("u1");
    expect(result.nickname).toBe("张三");
  });

  it("GET /users/:id/stats — 获取用户统计", async () => {
    const result: any = await ctrl.getUserStats("u1");
    expect(result.followerCount).toBe(100);
  });

  it("GET /users — 用户列表", async () => {
    const result: any = await ctrl.listUsers({});
    expect(result.items).toHaveLength(0);
  });

  it("POST /users/:id/roles — 分配角色", async () => {
    const result: any = await ctrl.assignRole("u1", { roleType: "EDITOR" } as any, mockReq());
    expect(result.roles).toContain("EDITOR");
  });

  it("DELETE /users/:id/roles/:roleType — 移除角色", async () => {
    const result: any = await ctrl.removeRole("u1", "EDITOR" as any, { bindId: undefined }, mockReq());
    expect(result.roles).toHaveLength(0);
  });

  it("PUT /users/:id/status — 更新用户状态（带理由）", async () => {
    const result: any = await ctrl.updateUserStatus("u1", { status: "BANNED", reason: "违规发布" } as any, mockReq());
    expect(result.status).toBe("BANNED");
    expect(mockUserSvc.updateUserStatus).toHaveBeenCalledWith("u1", "BANNED", "违规发布", "u1", "127.0.0.1");
  });

  it("GET /users/:id/purchases — 购买记录", async () => {
    const result: any = await ctrl.getMemberPurchases("u1", mockReq());
    expect(result).toHaveLength(0);
  });

  it("POST /users/:id/follow — 关注用户", async () => {
    const result: any = await ctrl.follow(mockReq(), "u2");
    expect(result.success).toBe(true);
  });

  it("DELETE /users/:id/follow — 取消关注", async () => {
    const result: any = await ctrl.unfollow(mockReq(), "u2");
    expect(result.success).toBe(true);
  });

  it("GET /users/:id/followers — 粉丝列表", async () => {
    const result: any = await ctrl.getFollowers("u1");
    expect(result.items).toHaveLength(0);
  });

  it("GET /users/:id/following — 关注列表", async () => {
    const result: any = await ctrl.getFollowing("u1");
    expect(result.items).toHaveLength(0);
  });

  it("GET /users/:id/is-following — 是否关注", async () => {
    const result: any = await ctrl.isFollowing(mockReq(), "u2");
    expect(result.following).toBe(true);
  });

  it("POST /users/push/by-tag — 按标签推送", async () => {
    const result: any = await ctrl.pushByTag({ tag: "vip", title: "测试", content: "内容" });
    expect(result.sent).toBe(5);
  });

  it("GET /users/whitelist — 白名单列表", async () => {
    const result: any = await ctrl.getWhitelist();
    expect(result.items).toHaveLength(0);
  });

  it("POST /users/whitelist — 添加白名单并透传原因", async () => {
    const result: any = await ctrl.addWhitelist({ userId: "u1", reason: "上线联调" });
    expect(result.userId).toBe("u1");
    expect(mockUserSvc.addWhitelist).toHaveBeenCalledWith("u1", "上线联调");
  });

  it("DELETE /users/whitelist/:userId — 移除白名单", async () => {
    const result: any = await ctrl.removeWhitelist("u1");
    expect(result.success).toBe(true);
  });

  it("GET /users/:id/profile — 用户画像", async () => {
    const result: any = await ctrl.getUserProfile("u1");
    expect(result.id).toBe("u1");
  });

  it("PUT /users/batch/status — 批量更新用户状态（带理由）", async () => {
    const result: any = await ctrl.batchUpdateStatus({ ids: ["u1", "u2"], status: "DISABLED", reason: "批量封禁" }, mockReq());
    expect(result.updated).toBe(3);
    expect(mockUserSvc.batchUpdateStatus).toHaveBeenCalledWith(["u1", "u2"], "DISABLED", "批量封禁", "u1", "127.0.0.1");
  });

  it("GET /users/:id/purchases — 非本人非管理员无权查看", () => {
    const req = { user: { id: "u1", roles: ["USER"] }, ip: "127.0.0.1" } as any;
    expect(() => ctrl.getMemberPurchases("u2", req)).toThrow("无权查看");
  });

  it("GET /users/:id/purchases — 管理员可查看他人购买记录", async () => {
    const req = { user: { id: "admin1", roles: ["SUPER_ADMIN"] }, ip: "127.0.0.1" } as any;
    const result: any = await ctrl.getMemberPurchases("u2", req);
    expect(result).toHaveLength(0);
  });

  it("GET /users/stats/interests — 用户兴趣品类统计", async () => {
    const result: any = await ctrl.getInterestStats();
    expect(result.totalUsers).toBe(100);
  });

  it("POST /users/delete-request — 申请注销账号", async () => {
    const result: any = await ctrl.requestAccountDeletion(mockReq());
    expect(result.message).toBe("已提交");
  });

  it("POST /users/delete-cancel — 取消注销申请", async () => {
    const result: any = await ctrl.cancelAccountDeletion(mockReq());
    expect(result.message).toBe("已取消");
  });

  it("POST /users/:id/delete-execute — 管理员执行注销", async () => {
    const result: any = await ctrl.executeAccountDeletion("u1");
    expect(result.message).toBe("已注销");
  });
});
