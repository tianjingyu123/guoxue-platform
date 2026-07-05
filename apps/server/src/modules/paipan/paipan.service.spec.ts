import { Test } from "@nestjs/testing";
import { PaipanService } from "./paipan.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

jest.mock("@guoxue/bazi-engine", () => ({
  calcBazi: jest.fn(),
}));
jest.mock("@guoxue/ziwei-engine", () => ({
  calcZiwei: jest.fn(),
}));

import { calcBazi } from "@guoxue/bazi-engine";
import { calcZiwei } from "@guoxue/ziwei-engine";

process.env.ENCRYPTION_KEY = "test-key-for-32-byte-encryption!";

const mockCalcBazi = calcBazi as jest.Mock;
const mockCalcZiwei = calcZiwei as jest.Mock;

const mockPrisma = {
  paipanRecord: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};

const mockRedis = {
  getJson: jest.fn(),
  setJson: jest.fn(),
  del: jest.fn(),
};

describe("PaipanService", () => {
  let svc: PaipanService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        PaipanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(PaipanService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const validBaziDto = { gender: "男" as const, year: 2000, month: 1, day: 15, hour: 8 };
  const mockBaziResult = {
    input: { gender: "男", year: 2000, month: 1, day: 15, hour: 8, minute: 0, name: "", city: "" },
    siZhu: {
      nian: { gan: "庚", zhi: "辰", nayin: "", ganShiShen: "", zhiShiShen: "", cangGan: [] },
      yue: { gan: "丁", zhi: "丑", nayin: "", ganShiShen: "", zhiShiShen: "", cangGan: [] },
      ri: { gan: "甲", zhi: "子", nayin: "", ganShiShen: "", zhiShiShen: "", cangGan: [] },
      shi: { gan: "戊", zhi: "辰", nayin: "", ganShiShen: "", zhiShiShen: "", cangGan: [] },
    },
    qiYun: { startAge: 3, daYun: [], desc: "" },
    shenSha: [], geJu: null, wuXingEnergy: null, kongWang: "", shengXiao: "",
  };

  describe("calcBaziPreview", () => {
    it("缓存命中直接返回", async () => {
      mockRedis.getJson.mockResolvedValue(mockBaziResult);
      const result = await svc.calcBaziPreview(validBaziDto);
      expect(result.siZhu).toBeTruthy();
      expect(mockCalcBazi).not.toHaveBeenCalled();
    });
    it("缓存未命中计算并回填", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockCalcBazi.mockReturnValue(mockBaziResult);
      mockRedis.setJson.mockResolvedValue(undefined);
      const result = await svc.calcBaziPreview(validBaziDto);
      expect(result.siZhu.nian.gan).toBe("庚");
      expect(mockCalcBazi).toHaveBeenCalledTimes(1);
      expect(mockRedis.setJson).toHaveBeenCalled();
    });
  });

  describe("calcBaziAndSave", () => {
    it("排盘并保存成功", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockCalcBazi.mockReturnValue(mockBaziResult);
      mockRedis.setJson.mockResolvedValue(undefined);
      mockPrisma.paipanRecord.create.mockResolvedValue({ id: "rec-1" });
      mockRedis.del.mockResolvedValue(undefined);
      const result = await svc.calcBaziAndSave("user-1", validBaziDto);
      expect(result.id).toBe("rec-1");
      expect(mockRedis.del).toHaveBeenCalled();
    });
    it("缓存结果不重复计算", async () => {
      mockRedis.getJson.mockResolvedValue(mockBaziResult);
      mockPrisma.paipanRecord.create.mockResolvedValue({ id: "rec-2" });
      mockRedis.del.mockResolvedValue(undefined);
      const result = await svc.calcBaziAndSave("user-1", validBaziDto);
      expect(result.id).toBe("rec-2");
      expect(mockCalcBazi).not.toHaveBeenCalled();
    });
  });

  describe("getBaziRecord", () => {
    it("返回排盘记录", async () => {
      mockPrisma.paipanRecord.findFirst.mockResolvedValue({
        id: "rec-1", clientName: "张三", clientBirth: "2000-1-15 8:0",
        inputParams: {}, resultData: {}, createdAt: new Date(),
      });
      const result = await svc.getBaziRecord("rec-1", "user-1");
      expect(result.id).toBe("rec-1");
    });
    it("记录不存在抛出 NotFoundException", async () => {
      mockPrisma.paipanRecord.findFirst.mockResolvedValue(null);
      await expect(svc.getBaziRecord("invalid", "user-1")).rejects.toThrow(BusinessException);
    });
  });

  describe("getUserBaziHistory", () => {
    it("返回分页历史记录", async () => {
      mockPrisma.paipanRecord.findMany.mockResolvedValue([{ id: "rec-1", clientName: "张三", clientBirth: "2000-1-15", createdAt: new Date() }]);
      mockPrisma.paipanRecord.count.mockResolvedValue(1);
      const result = await svc.getUserBaziHistory("user-1");
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("calcZiweiPreview", () => {
    const validZiweiDto = {
      name: "张三", gender: "男" as const, year: 2000, month: 1, day: 15, hour: 8,
      lunarMonth: 1, lunarDay: 1, lunarHour: "子" as const,
      lunarYearGan: "甲" as const, lunarYearZhi: "子" as const,
    };
    const mockZiweiResult = { input: {}, stars: [] };

    it("缓存命中直接返回", async () => {
      mockRedis.getJson.mockResolvedValue(mockZiweiResult);
      const result = await svc.calcZiweiPreview(validZiweiDto);
      expect(result).toEqual(mockZiweiResult);
      expect(mockCalcZiwei).not.toHaveBeenCalled();
    });
    it("缓存未命中计算并回填", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockCalcZiwei.mockReturnValue(mockZiweiResult);
      mockRedis.setJson.mockResolvedValue(undefined);
      const result = await svc.calcZiweiPreview(validZiweiDto);
      expect(result).toEqual(mockZiweiResult);
      expect(mockCalcZiwei).toHaveBeenCalledTimes(1);
    });
  });

  describe("calcZiweiAndSave", () => {
    const validZiweiDto = {
      name: "张三", gender: "男" as const, year: 2000, month: 1, day: 15, hour: 8,
      lunarMonth: 1, lunarDay: 1, lunarHour: "子" as const,
      lunarYearGan: "甲" as const, lunarYearZhi: "子" as const,
    };
    const mockZiweiResult = { input: {}, stars: [] };

    it("紫微排盘并保存成功", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockCalcZiwei.mockReturnValue(mockZiweiResult);
      mockRedis.setJson.mockResolvedValue(undefined);
      mockPrisma.paipanRecord.create.mockResolvedValue({ id: "zw-rec-1" });
      mockRedis.del.mockResolvedValue(undefined);
      const result = await svc.calcZiweiAndSave("user-1", validZiweiDto);
      expect(result.id).toBe("zw-rec-1");
      expect(mockCalcZiwei).toHaveBeenCalledTimes(1);
    });
  });

  describe("getZiweiRecord", () => {
    it("返回紫微排盘记录", async () => {
      mockPrisma.paipanRecord.findFirst.mockResolvedValue({ id: "zw-rec-1", clientName: "张三" });
      const result = await svc.getZiweiRecord("zw-rec-1", "user-1");
      expect(result.id).toBe("zw-rec-1");
    });
    it("记录不存在抛出 NotFoundException", async () => {
      mockPrisma.paipanRecord.findFirst.mockResolvedValue(null);
      await expect(svc.getZiweiRecord("invalid", "user-1")).rejects.toThrow(BusinessException);
    });
  });

  describe("getUserZiweiHistory", () => {
    it("返回用户紫微分页历史", async () => {
      mockPrisma.paipanRecord.findMany.mockResolvedValue([{ id: "zw-rec-1", clientName: "张三", createdAt: new Date() }]);
      mockPrisma.paipanRecord.count.mockResolvedValue(1);
      const result = await svc.getUserZiweiHistory("user-1");
      expect(result.records).toHaveLength(1);
    });
  });

  describe("getAllRecords", () => {
    it("返回所有排盘记录（无筛选）", async () => {
      mockPrisma.paipanRecord.findMany.mockResolvedValue([{ id: "rec-1", clientName: "张三" }]);
      mockPrisma.paipanRecord.count.mockResolvedValue(1);
      const result = await svc.getAllRecords({ page: 1, pageSize: 20 });
      expect(result.records).toHaveLength(1);
    });
    it("按类型筛选", async () => {
      mockPrisma.paipanRecord.findMany.mockResolvedValue([]);
      mockPrisma.paipanRecord.count.mockResolvedValue(0);
      const result = await svc.getAllRecords({ page: 1, pageSize: 20, type: "BAZI" });
      expect(result.total).toBe(0);
    });
    it("按关键字搜索", async () => {
      mockPrisma.paipanRecord.findMany.mockResolvedValue([]);
      mockPrisma.paipanRecord.count.mockResolvedValue(0);
      const result = await svc.getAllRecords({ page: 1, pageSize: 20, keyword: "张三" });
      expect(result.total).toBe(0);
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN/负数进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("getUserBaziHistory: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.paipanRecord.findMany.mockResolvedValue([]);
      mockPrisma.paipanRecord.count.mockResolvedValue(0);
      await svc.getUserBaziHistory("u1", "abc" as any, 20);
      const arg = mockPrisma.paipanRecord.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
    });
  });
});
