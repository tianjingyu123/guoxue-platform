import { Test } from "@nestjs/testing";
import { PushService } from "./push.service";
import { WechatService } from "../auth/wechat.service";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const mockWechat = {
  getAccessToken: jest.fn().mockResolvedValue("mock_token"),
};

describe("PushService", () => {
  let svc: PushService;

  beforeAll(async () => {
    process.env.WECHAT_MINI_APP_ID = "wx-mini-test";
    process.env.WECHAT_MP_APP_ID = "wx-mp-test";

    const mod = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: WechatService, useValue: mockWechat },
      ],
    }).compile();
    svc = mod.get(PushService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendMiniSubscribeMsg", () => {
    it("成功发送小程序订阅消息", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ errcode: 0, errmsg: "ok" }),
      });

      const result = await svc.sendMiniSubscribeMsg({
        touser: "openid_001",
        templateId: "tpl_001",
        page: "/pages/index",
        data: { keyword1: { value: "测试" } },
      });

      expect(result).toEqual({ errcode: 0, errmsg: "ok" });
      expect(mockWechat.getAccessToken).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api.weixin.qq.com/cgi-bin/message/subscribe/send"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("openid_001"),
        }),
      );
    });

    it("API 返回错误时抛出异常", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ errcode: 40001, errmsg: "invalid credential" }),
      });

      await expect(
        svc.sendMiniSubscribeMsg({
          touser: "openid_002",
          templateId: "tpl_002",
          page: "",
          data: { keyword1: { value: "失败" } },
        }),
      ).rejects.toThrow("订阅消息发送失败: invalid credential");
    });
  });

  describe("sendMpTemplateMsg", () => {
    it("成功发送公众号模板消息", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ errcode: 0, errmsg: "ok" }),
      });

      const result = await svc.sendMpTemplateMsg({
        touser: "mp_openid_001",
        templateId: "mp_tpl_001",
        url: "https://example.com",
        data: { first: { value: "您好" }, keyword1: { value: "通知" } },
      });

      expect(result).toEqual({ errcode: 0, errmsg: "ok" });
      expect(mockWechat.getAccessToken).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api.weixin.qq.com/cgi-bin/message/template/send"),
        expect.any(Object),
      );
    });

    it("支持带 miniprogram 参数发送", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ errcode: 0, errmsg: "ok" }),
      });

      const result = await svc.sendMpTemplateMsg({
        touser: "mp_openid_002",
        templateId: "mp_tpl_002",
        miniprogram: { appid: "wx-app", pagepath: "/pages/index" },
        data: { first: { value: "测试" } },
      });

      expect(result).toEqual({ errcode: 0, errmsg: "ok" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api.weixin.qq.com/cgi-bin/message/template/send"),
        expect.objectContaining({
          body: expect.stringContaining("miniprogram"),
        }),
      );
    });

    it("API 返回错误时抛出异常", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ errcode: 40003, errmsg: "invalid openid" }),
      });

      await expect(
        svc.sendMpTemplateMsg({
          touser: "invalid_openid",
          templateId: "tpl",
          data: { first: { value: "x" } },
        }),
      ).rejects.toThrow("模板消息发送失败: invalid openid");
    });
  });

  describe("send", () => {
    const baseParams = {
      templateType: "MINI" as const,
      templateId: "tpl_001",
      miniOpenId: "mini_openid_001",
      mpOpenId: undefined,
      deviceToken: undefined,
      page: "/pages/home",
      url: undefined,
      data: { keyword1: { value: "统一发送" } },
    };

    it("路由到 MINI 渠道", async () => {
      const miniSpy = jest.spyOn(svc, "sendMiniSubscribeMsg").mockResolvedValue({
        errcode: 0,
        errmsg: "ok",
      } as any);

      const result = await svc.send(baseParams);

      expect(miniSpy).toHaveBeenCalledWith({
        touser: "mini_openid_001",
        templateId: "tpl_001",
        page: "/pages/home",
        data: { keyword1: { value: "统一发送" } },
      });
      expect(result).toEqual({ errcode: 0, errmsg: "ok" });

      miniSpy.mockRestore();
    });

    it("路由到 MP 渠道", async () => {
      const mpSpy = jest.spyOn(svc, "sendMpTemplateMsg").mockResolvedValue({
        errcode: 0,
        errmsg: "ok",
      } as any);

      const result = await svc.send({
        ...baseParams,
        templateType: "MP",
        miniOpenId: undefined,
        mpOpenId: "mp_openid_001",
        data: { first: { value: "公众号消息" } },
      });

      expect(mpSpy).toHaveBeenCalledWith({
        touser: "mp_openid_001",
        templateId: "tpl_001",
        url: undefined,
        data: { first: { value: "公众号消息" } },
      });
      expect(result).toEqual({ errcode: 0, errmsg: "ok" });

      mpSpy.mockRestore();
    });

    it("路由到 APP 渠道（TPNS 未接入，返回 null）", async () => {
      const loggerSpy = jest.spyOn((svc as any).logger, "log").mockImplementation(() => {});

      const result = await svc.send({
        ...baseParams,
        templateType: "APP",
        miniOpenId: undefined,
        deviceToken: "device_token_001",
        data: { keyword1: { value: "app推送" } },
      });

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith("TPNS推送暂未接入");

      loggerSpy.mockRestore();
    });

    it("无有效渠道时返回 null", async () => {
      const result = await svc.send({
        ...baseParams,
        miniOpenId: undefined,
        mpOpenId: undefined,
        deviceToken: undefined,
      });

      expect(result).toBeNull();
    });

    it("子方法抛出异常时 catch 并返回 null", async () => {
      const miniSpy = jest
        .spyOn(svc, "sendMiniSubscribeMsg")
        .mockRejectedValue(new Error("网络错误"));

      const result = await svc.send(baseParams);

      expect(miniSpy).toHaveBeenCalled();
      expect(result).toBeNull();

      miniSpy.mockRestore();
    });
  });
});
