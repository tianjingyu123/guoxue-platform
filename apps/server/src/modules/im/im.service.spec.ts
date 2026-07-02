import { Test } from "@nestjs/testing";
import { ImService } from "./im.service";
import { TlsSigService } from "./tlssig.service";
import { ImPolicyService } from "./im-policy.service";

const mockTlsSig = {
  getAppId: jest.fn().mockReturnValue(1400000000),
  genUserSig: jest.fn().mockReturnValue("test-user-sig"),
  genAdminSig: jest.fn().mockReturnValue("test-admin-sig"),
};

// 私信关系策略：默认允许发送、开放全部富媒体权限（不阻断被测的发送/群组用例）
const mockPolicy = {
  evaluateC2C: jest.fn().mockResolvedValue({
    relation: "mutual",
    canSend: true,
    remaining: -1,
    mediaPerms: { image: true, voice: true, file: true },
    hint: "",
  }),
  incrementSent: jest.fn().mockResolvedValue(undefined),
  resetOnReply: jest.fn().mockResolvedValue(undefined),
};

const imOk = { ErrorCode: 0, ActionStatus: "OK" };
const imFail = { ErrorCode: 10003, ErrorInfo: "参数错误", ActionStatus: "FAIL" };

function mockFetch(response: Record<string, any> = imOk) {
  const fn = jest.fn().mockResolvedValue({ json: async () => response });
  global.fetch = fn as any;
  return fn;
}

describe("ImService", () => {
  let svc: ImService;
  let fetchMock: jest.Mock;

  beforeAll(async () => {
    process.env.IM_APP_ID = "1400000000";
    process.env.IM_ADMIN_KEY = "test-admin-key";
    process.env.IM_ADMIN_ID = "admin-001";

    const mod = await Test.createTestingModule({
      providers: [
        ImService,
        { provide: TlsSigService, useValue: mockTlsSig },
        { provide: ImPolicyService, useValue: mockPolicy },
      ],
    }).compile();
    svc = mod.get(ImService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockFetch();
  });

  afterAll(() => {
    delete (global as any).fetch;
  });

  describe("genUserSig", () => {
    it("返回 appId + userId + userSig", () => {
      const result = svc.genUserSig("user-123");
      expect(result.appId).toBe(1400000000);
      expect(result.userId).toBe("user-123");
      expect(result.userSig).toBe("test-user-sig");
      expect(mockTlsSig.genUserSig).toHaveBeenCalledWith("user-123");
    });
  });

  describe("importAccount", () => {
    it("调用 IM 账号导入 API", async () => {
      await svc.importAccount("user-123", "张三", "https://img.com/avatar.jpg");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("im_open_login_svc/account_import"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("user-123"),
        }),
      );
    });

    it("昵称默认使用 userId", async () => {
      await svc.importAccount("user-456");
      expect(fetchMock.mock.calls[0][1].body).toContain("user-456");
    });
  });

  describe("queryAccountState", () => {
    it("查询账号在线状态", async () => {
      await svc.queryAccountState(["user-1", "user-2"]);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("openim/querystate"),
        expect.objectContaining({
          body: expect.stringContaining("user-1"),
        }),
      );
    });
  });

  describe("updateProfile", () => {
    it("更新昵称和头像", async () => {
      await svc.updateProfile("user-123", {
        nickname: "新昵称",
        avatar: "https://img.com/avatar.jpg",
      });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("profile/portrait_set"),
        expect.any(Object),
      );
    });

    it("无更新内容时直接返回", async () => {
      const result = await svc.updateProfile("user-123", {});
      expect(result).toEqual({ message: "无更新内容" });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("createGroup", () => {
    it("创建 Public 群组", async () => {
      await svc.createGroup("circle-001", "国学交流群", "Public", "owner-1");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("group_open_http_svc/create_group"),
        expect.objectContaining({
          body: expect.stringContaining("FreeAccess"),
        }),
      );
    });

    it("非 Public 群组需要审批", async () => {
      await svc.createGroup("circle-002", "私密群", "Private");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("group_open_http_svc/create_group"),
        expect.objectContaining({
          body: expect.stringContaining("NeedPermission"),
        }),
      );
    });
  });

  describe("destroyGroup", () => {
    it("解散群组", async () => {
      await svc.destroyGroup("circle-001");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("group_open_http_svc/destroy_group"),
        expect.objectContaining({
          body: expect.stringContaining("circle-001"),
        }),
      );
    });
  });

  describe("addGroupMembers", () => {
    it("添加群成员", async () => {
      await svc.addGroupMembers("circle-001", ["user-1", "user-2"]);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("group_open_http_svc/add_group_member"),
        expect.any(Object),
      );
    });
  });

  describe("deleteGroupMembers", () => {
    it("删除群成员", async () => {
      await svc.deleteGroupMembers("circle-001", ["user-3"]);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("group_open_http_svc/delete_group_member"),
        expect.objectContaining({
          body: expect.stringContaining("user-3"),
        }),
      );
    });
  });

  describe("sendGroupMsg", () => {
    it("发送群消息", async () => {
      await svc.sendGroupMsg("circle-001", "大家好！");
      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("group_open_http_svc/send_group_msg");
      expect(call[1].body).toContain("大家好");
      expect(call[1].body).toContain("TIMTextElem");
    });
  });

  describe("API 错误处理", () => {
    it("ErrorCode 非 0 时抛出异常", async () => {
      mockFetch(imFail);
      await expect(svc.importAccount("user-1")).rejects.toThrow("IM 操作失败");
    });
  });

  describe("未配置", () => {
    it("缺少凭证时抛出 BadRequestException", async () => {
      delete process.env.IM_ADMIN_KEY;
      const mod = await Test.createTestingModule({
        providers: [
          ImService,
          { provide: TlsSigService, useValue: mockTlsSig },
          { provide: ImPolicyService, useValue: mockPolicy },
        ],
      }).compile();
      const badSvc = mod.get(ImService);
      expect(() => badSvc.genUserSig("user-1")).toThrow("IM 未配置");
    });
  });
});
