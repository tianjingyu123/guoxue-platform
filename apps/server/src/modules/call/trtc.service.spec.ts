import { Test } from "@nestjs/testing";
import { TrtcService } from "./trtc.service";

jest.mock("tls-sig-api-v2", () => ({
  Api: jest.fn().mockImplementation(() => ({
    genPrivateMapKey: jest.fn().mockReturnValue("mock-private-map-key"),
  })),
}));

describe("TrtcService", () => {
  let svc: TrtcService;

  afterEach(() => {
    delete process.env.IM_APP_ID;
    delete process.env.IM_ADMIN_KEY;
  });

  describe("已配置 IM 环境变量", () => {
    beforeEach(async () => {
      process.env.IM_APP_ID = "1400000000";
      process.env.IM_ADMIN_KEY = "test-admin-key";
      jest.clearAllMocks();
      const mod = await Test.createTestingModule({
        providers: [TrtcService],
      }).compile();
      svc = mod.get(TrtcService);
    });

    describe("generateRoomId", () => {
      it("返回以 call_ 前缀的唯一房间 ID", () => {
        const roomId = svc.generateRoomId();
        expect(roomId).toMatch(/^call_\d+_[a-z0-9]+$/);
      });

      it("每次调用生成不同的房间 ID", () => {
        const id1 = svc.generateRoomId();
        const id2 = svc.generateRoomId();
        expect(id1).not.toBe(id2);
      });
    });

    describe("genRoomToken", () => {
      it("返回字符串类型 token", () => {
        const token = svc.genRoomToken("user-123", "room-456");
        expect(typeof token).toBe("string");
        expect(token).toBe("mock-private-map-key");
      });

      it("传递正确的 sdkAppId 和 key 到 Api 构造函数", () => {
        svc.genRoomToken("user-1", "room-1");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Api } = require("tls-sig-api-v2");
        expect(Api).toHaveBeenCalledWith(1400000000, "test-admin-key");
      });

      it("使用默认过期时间 3600 秒和权限位 255", () => {
        svc.genRoomToken("test-user", "test-room");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Api } = require("tls-sig-api-v2");
        const instance = Api.mock.results[0].value;
        expect(instance.genPrivateMapKey).toHaveBeenCalledWith("test-user", 3600, "test-room", 255);
      });

      it("支持自定义 expireSeconds 参数", () => {
        svc.genRoomToken("user-1", "room-1", 7200);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Api } = require("tls-sig-api-v2");
        const instance = Api.mock.results[0].value;
        expect(instance.genPrivateMapKey).toHaveBeenCalledWith("user-1", 7200, "room-1", 255);
      });
    });

    describe("getAppId", () => {
      it("返回配置的 sdkAppId", () => {
        expect(svc.getAppId()).toBe(1400000000);
      });
    });
  });

  describe("未配置 IM 环境变量", () => {
    beforeEach(async () => {
      delete process.env.IM_APP_ID;
      delete process.env.IM_ADMIN_KEY;
      const mod = await Test.createTestingModule({
        providers: [TrtcService],
      }).compile();
      svc = mod.get(TrtcService);
    });

    it("genRoomToken 抛出 IM 未配置异常", () => {
      expect(() => svc.genRoomToken("user-1", "room-1")).toThrow("IM 未配置");
    });

    it("getAppId 返回 0", () => {
      expect(svc.getAppId()).toBe(0);
    });

    it("generateRoomId 不受影响仍可正常生成", () => {
      expect(svc.generateRoomId()).toMatch(/^call_\d+_[a-z0-9]+$/);
    });
  });
});
