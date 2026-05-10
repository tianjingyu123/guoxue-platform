import { Test } from "@nestjs/testing";
import { LogisticsService } from "./logistics.service";

describe("LogisticsService", () => {
  let svc: LogisticsService;
  let fetchMock: jest.Mock;

  afterEach(() => {
    delete process.env.KUAIDI100_API_KEY;
    delete process.env.KUAIDI100_CUSTOMER;
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

        const calledUrl = fetchMock.mock.calls[0][0] as string;
        expect(calledUrl).toContain("shunfeng");
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
          const url = fetchMock.mock.calls[0][0] as string;
          expect(url).toContain(expected);
        }
      });

      it("未在映射表中的公司名原样传递", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({ returnCode: "200", state: "3", ischeck: "1", com: "other", nu: "NUM", data: [] }),
        });

        await svc.queryTrack("NUM", "不知名快递");
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain("不知名快递");
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
});
