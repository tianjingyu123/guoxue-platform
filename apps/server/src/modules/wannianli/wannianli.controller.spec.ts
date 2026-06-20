import { Test } from "@nestjs/testing";
import { WannianliController } from "./wannianli.controller";
import { WannianliService } from "./wannianli.service";

describe("WannianliController", () => {
  let ctrl: WannianliController;
  let svc: jest.Mocked<WannianliService>;

  const mockDetail = { solarDate: "2026-06-20", lunarDate: "五月初五", ganzhi: "丙午年", jieqi: null };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [WannianliController],
      providers: [{
        provide: WannianliService, useValue: {
          getToday: jest.fn(),
          getByDate: jest.fn(),
          getByDateRange: jest.fn(),
          getFullYear: jest.fn(),
          getByLunarYearMonth: jest.fn(),
          getJieQiByYear: jest.fn(),
          buildDayDetail: jest.fn(),
        },
      }],
    }).compile();
    ctrl = mod.get(WannianliController);
    svc = mod.get(WannianliService) as jest.Mocked<WannianliService>;
  });

  beforeEach(() => jest.clearAllMocks());

  describe("getToday", () => {
    it("返回今日万年历", async () => {
      svc.getToday.mockResolvedValue({ solarDate: new Date() } as any);
      svc.buildDayDetail.mockReturnValue(mockDetail as any);
      const result = await ctrl.getToday();
      expect(svc.buildDayDetail).toHaveBeenCalled();
      expect(result).toEqual(mockDetail);
    });

    it("无今日数据返回 null", async () => {
      svc.getToday.mockResolvedValue(null);
      const result = await ctrl.getToday();
      expect(result).toBeNull();
    });
  });

  describe("getByDate", () => {
    it("有效日期返回详情", async () => {
      svc.getByDate.mockResolvedValue({ solarDate: new Date("2026-01-01") } as any);
      svc.buildDayDetail.mockReturnValue(mockDetail as any);
      const result = await ctrl.getByDate("2026-01-01");
      expect(result).toEqual(mockDetail);
    });

    it("无效日期格式返回 null", async () => {
      const result = await ctrl.getByDate("invalid");
      expect(result).toBeNull();
    });

    it("日期存在但查不到数据返回 null", async () => {
      svc.getByDate.mockResolvedValue(null);
      const result = await ctrl.getByDate("2026-01-01");
      expect(result).toBeNull();
    });
  });

  describe("getRange", () => {
    it("有效范围返回数组", async () => {
      svc.getByDateRange.mockResolvedValue([{ solarDate: new Date() }] as any);
      svc.buildDayDetail.mockReturnValue(mockDetail as any);
      const result = await ctrl.getRange("2026-01-01", "2026-01-02");
      expect(result).toHaveLength(1);
    });

    it("无效日期返回空数组", async () => {
      const result = await ctrl.getRange("bad", "bad");
      expect(result).toEqual([]);
    });
  });

  describe("getFullYear", () => {
    it("有效年份", async () => {
      svc.getFullYear.mockResolvedValue([]);
      const result = await ctrl.getFullYear("2026");
      expect(svc.getFullYear).toHaveBeenCalledWith(2026);
      expect(result).toEqual([]);
    });

    it("无效年份返回空数组", async () => {
      const result = await ctrl.getFullYear("abc");
      expect(result).toEqual([]);
    });
  });

  describe("getByLunar", () => {
    it("按农历查询", async () => {
      svc.getByLunarYearMonth.mockResolvedValue([]);
      const result = await ctrl.getByLunar("2026", "1");
      expect(svc.getByLunarYearMonth).toHaveBeenCalledWith(2026, 1, true);
      expect(result).toEqual([]);
    });

    it("includeLeap=false", async () => {
      svc.getByLunarYearMonth.mockResolvedValue([]);
      await ctrl.getByLunar("2026", "1", "false");
      expect(svc.getByLunarYearMonth).toHaveBeenCalledWith(2026, 1, false);
    });

    it("无效参数返回空数组", async () => {
      const result = await ctrl.getByLunar("x", "y");
      expect(result).toEqual([]);
    });
  });

  describe("getJieQi", () => {
    it("返回节气列表", async () => {
      svc.getJieQiByYear.mockResolvedValue([{ name: "立春", date: "2026-02-04" }] as any);
      const result = await ctrl.getJieQi("2026");
      expect(svc.getJieQiByYear).toHaveBeenCalledWith(2026);
      expect(result).toHaveLength(1);
    });

    it("无效年份返回空数组", async () => {
      const result = await ctrl.getJieQi("xyz");
      expect(result).toEqual([]);
    });
  });
});
