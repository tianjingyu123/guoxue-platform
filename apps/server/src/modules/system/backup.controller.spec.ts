import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { BackupController } from "./backup.controller";
import { BackupService } from "./backup.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockService: Record<string, jest.Mock> = {
  triggerBackup: jest.fn(),
  listBackups: jest.fn(),
  getLatestBackup: jest.fn(),
  uploadLatestToCos: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("BackupController", () => {
  let ctrl: BackupController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [{ provide: BackupService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(BackupController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("手动触发备份", async () => {
    mockService.triggerBackup.mockResolvedValue({ success: true, fileName: "backup_2025.sql.gz" });
    const result: any = await ctrl.triggerBackup();
    expect(result.success).toBe(true);
    expect(result.fileName).toContain(".sql.gz");
  });

  it("列出备份文件", async () => {
    mockService.listBackups.mockResolvedValue([
      { fileName: "backup_001.sql.gz", size: 1024000, createdAt: new Date() },
    ]);
    const result: any = await ctrl.listBackups();
    expect(result).toHaveLength(1);
  });

  it("最新备份状态", async () => {
    mockService.getLatestBackup.mockResolvedValue({
      fileName: "backup_latest.sql.gz", status: "completed", finishedAt: new Date(),
    });
    const result: any = await ctrl.getLatestBackup();
    expect(result.status).toBe("completed");
  });

  it("上传备份到COS", async () => {
    mockService.uploadLatestToCos.mockResolvedValue({ uploaded: true, url: "https://cos.example.com/backup.sql.gz" });
    const result: any = await ctrl.uploadToCos();
    expect(result.uploaded).toBe(true);
    expect(result.url).toContain("cos");
  });
});
