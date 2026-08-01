import { Test } from "@nestjs/testing";
import { LogisticsService } from "./logistics.service";
import { createHash } from "crypto";

describe("LogisticsService", () => {
  let svc: LogisticsService;
  let fetchMock: jest.Mock;

  afterEach(() => {
    delete process.env.KUAIDI100_API_KEY;
    delete process.env.KUAIDI100_CUSTOMER;
    delete process.env.KUAIDI100_CALLBACK_URL;
    delete process.env.KUAIDI100_SALT;
    delete (global as any).fetch;
  });

  describe("未配置快递100", () => {
    beforeEach(async () => {
      delete process.env.KUAIDI100_API_KEY;
      delete process.env.KUAIDI100_CUSTOMER;
      const mod = await Test.createTestingModule({
        providers: [LogisticsService],
      }).compile();
      svc = mod.get(LogisticsService);
    });

    it("queryTrack 返回未配置信息和空轨迹", async () => {
      const result = await svc.queryTrack("SF123456");
      expect(result).toEqual({
        track: [],
        state: "unknown",
        message: "物流服务未配置",
      });
    });

    it("不发起 HTTP 请求", async () => {
      fetchMock = jest.fn();
      (global as any).fetch = fetchMock;
      await svc.queryTrack("SF123456");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("已配置快递100", () => {
    beforeEach(async () => {
      process.env.KUAIDI100_API_KEY = "test-api-key";
      process.env.KUAIDI100_CUSTOMER = "test-customer";

      const mod = await Test.createTestingModule({
        providers: [LogisticsService],
      }).compile();
      svc = mod.get(LogisticsService);
    });

    beforeEach(() => {
      fetchMock = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({}),
      });
      (global as any).fetch = fetchMock;
    });

    describe("queryTrack 指定公司查询", () => {
      it("查询成功并返回格式化轨迹", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({
            returnCode: "200",
            state: "3",
            ischeck: "1",
            com: "shunfeng",
            nu: "SF1234567890",
            data: [
              { time: "2024-01-01 10:00:00", ftime: "2024-01-01 10:00:00", status: "已揽收", context: "快件已被揽收", location: "深圳" },
              { time: "2024-01-02 12:00:00", ftime: "2024-01-02 12:00:00", status: "运输中", context: "快件在途中", location: "" },
            ],
          }),
        });

        const result = await svc.queryTrack("SF1234567890", "顺丰");

        expect(result).toEqual({
          state: "3",
          isCheck: true,
          company: "shunfeng",
          logisticsNo: "SF1234567890",
          tracks: [
            { time: "2024-01-01 10:00:00", status: "已揽收", location: "深圳" },
            { time: "2024-01-02 12:00:00", status: "运输中", location: "" },
          ],
        });
      });

      it("将中文快递公司名映射为英文编码", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ returnCode: "200", state: "3", ischeck: "1", com: "shunfeng", nu: "SF123", data: [] }),
        });

        await svc.queryTrack("SF123", "顺丰速运");

        const [calledUrl, options] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }];
        const form = new URLSearchParams(options.body);
        expect(calledUrl).toBe("https://poll.kuaidi100.com/poll/query.do");
        expect(options.method).toBe("POST");
        expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
        expect(JSON.parse(form.get("param") || "{}")).toEqual({ com: "shunfeng", num: "SF123" });
      });

      it("映射所有常见快递公司名", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ returnCode: "200", state: "3", ischeck: "1", com: "", nu: "NUM", data: [] }),
        });

        const companies: Array<{ input: string; expected: string }> = [
          { input: "顺丰", expected: "shunfeng" },
          { input: "SF", expected: "shunfeng" },
          { input: "圆通", expected: "yuantong" },
          { input: "YTO", expected: "yuantong" },
          { input: "中通", expected: "zhongtong" },
          { input: "ZTO", expected: "zhongtong" },
          { input: "申通", expected: "shentong" },
          { input: "STO", expected: "shentong" },
          { input: "韵达", expected: "yunda" },
          { input: "YUNDA", expected: "yunda" },
          { input: "百世快递", expected: "baishiwuliu" },
          { input: "京东物流", expected: "jd" },
          { input: "德邦物流", expected: "debangwuliu" },
          { input: "EMS", expected: "ems" },
          { input: "极兔", expected: "jtexpress" },
          { input: "J&T", expected: "jtexpress" },
        ];

        for (const { input, expected } of companies) {
          fetchMock.mockClear();
          await svc.queryTrack("NUM", input);
          const options = fetchMock.mock.calls[0][1] as { body: string };
          const param = JSON.parse(new URLSearchParams(options.body).get("param") || "{}");
          expect(param.com).toBe(expected);
        }
      });

      it("未在映射表中的公司名原样传递", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ returnCode: "200", state: "3", ischeck: "1", com: "other", nu: "NUM", data: [] }),
        });

        await svc.queryTrack("NUM", "不知名快递");
        const options = fetchMock.mock.calls[0][1] as { body: string };
        const param = JSON.parse(new URLSearchParams(options.body).get("param") || "{}");
        expect(param.com).toBe("不知名快递");
      });

      it("按官方契约使用完整 param JSON 计算 32 位大写签名", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ returnCode: "200", state: "3", com: "shunfeng", nu: "SF123", data: [] }),
        });

        await svc.queryTrack("SF123", "顺丰");

        const options = fetchMock.mock.calls[0][1] as { body: string };
        const form = new URLSearchParams(options.body);
        const param = form.get("param") || "";
        const expected = createHash("md5")
          .update(param + "test-api-key" + "test-customer")
          .digest("hex")
          .toUpperCase();
        expect(form.get("customer")).toBe("test-customer");
        expect(form.get("sign")).toBe(expected);
      });

      it("API 返回错误时返回 null 并回退自动识别", async () => {
        // queryWithCompany 返回 null（非 200）
        fetchMock.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({ returnCode: "500", message: "参数错误" }),
        });
        // autoDetect 返回成功
        fetchMock.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            returnCode: "200", state: "3", ischeck: "1", com: "shunfeng", nu: "SF123", data: [],
          }),
        });

        const result = await svc.queryTrack("SF123", "顺丰");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result).toBeTruthy();
      });
    });

    describe("queryTrack 自动识别公司", () => {
      it("不传公司时自动识别成功", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({
            returnCode: "200",
            state: "3",
            ischeck: "1",
            com: "shunfeng",
            nu: "SF123456",
            data: [{ time: "2024-01-01 10:00", ftime: "2024-01-01 10:00", status: "已签收", context: "已签收", location: "北京" }],
          }),
        });

        const result = await svc.queryTrack("SF123456") as any;
        expect(result).toBeTruthy();
        expect(result.logisticsNo).toBe("SF123456");
      });

      it("自动识别 API 返回错误时返回 unknown 状态", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ returnCode: "500", message: "单号不存在" }),
        });

        const result = await svc.queryTrack("INVALID123");
        expect(result).toEqual({ state: "unknown", message: "单号不存在" });
      });

      it("自动识别 API 无 message 字段时使用默认提示", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ returnCode: "500" }),
        });

        const result = await svc.queryTrack("INVALID123");
        expect(result).toEqual({ state: "unknown", message: "查询失败" });
      });
    });

    describe("边界情况", () => {
      it("data 字段为空数组时 tracks 为空", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({
            returnCode: "200", state: "0", ischeck: "0", com: "yuantong", nu: "YT123", data: [],
          }),
        });

        const result = await svc.queryTrack("YT123", "圆通") as any;
        expect(result.tracks).toEqual([]);
      });

      it("字段缺失时使用降级默认值", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({
            returnCode: "200", state: "0", ischeck: "0", com: "yunda", nu: "YD123",
            data: [{ time: "", ftime: "2024-01-01 10:00", status: "", context: "默认文本", location: undefined }],
          }),
        });

        const result = await svc.queryTrack("YD123", "韵达") as any;
        expect(result.tracks[0].time).toBe("2024-01-01 10:00");
        expect(result.tracks[0].status).toBe("默认文本");
        expect(result.tracks[0].location).toBe("");
      });
    });
  });

  describe("轨迹订阅与回调", () => {
    const prisma = { orderLogistics: { updateMany: jest.fn() } } as any;

    beforeEach(() => {
      process.env.KUAIDI100_API_KEY = "test-api-key";
      process.env.KUAIDI100_CALLBACK_URL = "https://api.example.com/callback";
      process.env.KUAIDI100_SALT = "callback-salt";
      prisma.orderLogistics.updateMany.mockResolvedValue({ count: 1 });
      svc = new LogisticsService(prisma);
      fetchMock = jest.fn();
      (global as any).fetch = fetchMock;
      prisma.orderLogistics.updateMany.mockClear();
    });

    it("按官方协议发起订阅，并将重复订阅 501 视为成功", async () => {
      fetchMock.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ result: false, returnCode: "501", message: "重复订阅" }),
      });

      const result = await svc.subscribeTrack("SF123", "顺丰");

      expect(result).toMatchObject({ subscribed: true, configured: true, returnCode: "501" });
      const [url, options] = fetchMock.mock.calls[0] as [string, { method: string; body: string }];
      expect(url).toBe("https://poll.kuaidi100.com/poll");
      expect(options.method).toBe("POST");
      const form = new URLSearchParams(options.body);
      expect(form.get("schema")).toBe("json");
      expect(JSON.parse(form.get("param") || "{}")).toEqual({
        company: "shunfeng",
        number: "SF123",
        key: "test-api-key",
        parameters: {
          callbackurl: "https://api.example.com/callback",
          salt: "callback-salt",
          resultv2: "4",
        },
      });
    });

    it("验签通过后持久化轨迹与签收状态", async () => {
      const param = JSON.stringify({
        lastResult: {
          nu: "SF123",
          state: "3",
          ischeck: "1",
          data: [{ time: "2026-07-23 12:00:00", context: "已签收", location: "郑州" }],
        },
      });
      const sign = createHash("md5").update(param + "callback-salt").digest("hex").toUpperCase();

      await expect(svc.handlePush(param, sign)).resolves.toEqual({ accepted: true, updated: 1 });
      expect(prisma.orderLogistics.updateMany).toHaveBeenCalledWith({
        where: { logisticsNo: "SF123" },
        data: {
          status: "SIGNED",
          trackingData: [{ time: "2026-07-23 12:00:00", status: "已签收", desc: "已签收", location: "郑州" }],
        },
      });
    });

    it("状态码 5（派送中）仍持久化为运输中", async () => {
      const param = JSON.stringify({
        lastResult: {
          nu: "SF123",
          state: "5",
          ischeck: "0",
          data: [{ time: "2026-07-23 12:00:00", context: "正在派送" }],
        },
      });
      const sign = createHash("md5").update(param + "callback-salt").digest("hex").toUpperCase();

      await svc.handlePush(param, sign);

      expect(prisma.orderLogistics.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "OUT_FOR_DELIVERY" }),
      }));
    });

    it("异常与退回状态保留业务语义，不再统一压成运输中", async () => {
      const samples = [
        { code: "2", status: "EXCEPTION" },
        { code: "4", status: "RETURNED" },
        { code: "6", status: "RETURNING" },
      ];

      for (const sample of samples) {
        prisma.orderLogistics.updateMany.mockClear();
        const param = JSON.stringify({
          lastResult: {
            nu: "SF123",
            state: sample.code,
            ischeck: "0",
            data: [{ time: "2026-07-23 12:00:00", context: sample.status }],
          },
        });
        const sign = createHash("md5").update(param + "callback-salt").digest("hex").toUpperCase();

        await svc.handlePush(param, sign);

        expect(prisma.orderLogistics.updateMany).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ status: sample.status }),
        }));
      }
    });

    it("非终态延迟回调不得把已签收或已退回运单倒退", async () => {
      const param = JSON.stringify({
        lastResult: {
          nu: "SF123",
          state: "0",
          ischeck: "0",
          data: [{ time: "2026-07-22 12:00:00", context: "运输中" }],
        },
      });
      const sign = createHash("md5").update(param + "callback-salt").digest("hex").toUpperCase();

      await svc.handlePush(param, sign);

      expect(prisma.orderLogistics.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          logisticsNo: "SF123",
          status: { notIn: ["SIGNED", "RETURNED", "REJECTED"] },
        },
      }));
    });

    it("签名不匹配时拒绝处理且不写数据库", async () => {
      const param = JSON.stringify({ lastResult: { nu: "SF123", data: [] } });
      await expect(svc.handlePush(param, "0".repeat(32))).rejects.toThrow("快递100回调签名验证失败");
      expect(prisma.orderLogistics.updateMany).not.toHaveBeenCalled();
    });
  });
});
