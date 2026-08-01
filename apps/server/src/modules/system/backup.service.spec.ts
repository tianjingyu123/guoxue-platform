import { Test } from "@nestjs/testing";
import * as fs from "fs";
import { BackupService } from "./backup.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("BackupService", () => {
  let svc: BackupService;

  const mockPrisma = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
  const mockRedis = { runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(BackupService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("pruneOldBackups 保留最近份", () => {
    it("超出保留数的旧备份被删除，最近份保留", async () => {
      const now = Date.now();
      // 造 5 份备份，createdAt 由新到旧
      const names = ["b1", "b2", "b3", "b4", "b5"].map((n) => `${n}.sql.gz`);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(names as any);
      mockedFs.statSync.mockImplementation((p: any) => {
        const idx = names.indexOf(String(p).split(/[\\/]/).pop() as string);
        return { size: 1024, birthtime: new Date(now - idx * 3600_000) } as any;
      });
      mockedFs.unlinkSync.mockImplementation(() => undefined);

      const res = await svc.pruneOldBackups(2);
      // 5 份保留最近 2，删除 3
      expect(res).toEqual({ removed: 3, kept: 2 });
      expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(3);
    });

    it("份数未超保留数 → 不删除", async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(["only.sql.gz"] as any);
      mockedFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date() } as any);

      const res = await svc.pruneOldBackups(14);
      expect(res.removed).toBe(0);
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe("scheduledBackup 分布式锁", () => {
    it("经 redis.runExclusive 互斥执行", async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => undefined as any);
      // triggerBackup 内部 spawn 会因测试环境无 pg_dump 失败并返回 success:false，
      // 这里只验证走了分布式锁；失败路径不触发 prune。
      await svc.scheduledBackup();
      expect(mockRedis.runExclusive).toHaveBeenCalledWith("db_backup_daily", 600, expect.any(Function));
    });
  });
});
