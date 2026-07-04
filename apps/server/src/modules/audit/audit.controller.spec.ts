import { Test } from "@nestjs/testing";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { ReportService } from "./report.service";
import { SensitiveWordService } from "./sensitive-word.service";
import { ComplianceScanService } from "./compliance-scan.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockAuditSvc = {
  list: jest.fn().mockResolvedValue([{ id: "log1", action: "CREATE" }]),
  moderateImage: jest.fn().mockResolvedValue({ pass: true }),
  moderateText: jest.fn().mockResolvedValue({ pass: true, blockedLabels: [] }),
  listOperationLogs: jest.fn().mockResolvedValue([{ id: "op1", action: "DELETE" }]),
  getOperationLog: jest.fn().mockResolvedValue({ id: "op1", action: "DELETE", detail: "..." }),
};

const mockReportSvc = {
  submit: jest.fn().mockResolvedValue({ id: "rpt1", status: "PENDING" }),
  list: jest.fn().mockResolvedValue([{ id: "rpt1", reason: "违规" }]),
  handle: jest.fn().mockResolvedValue({ id: "rpt1", status: "RESOLVED" }),
  getTargetStats: jest.fn().mockResolvedValue({ total: 5, pending: 2 }),
};

const mockSensitiveWordSvc = {
  listWords: jest.fn().mockReturnValue(["违禁词1", "违禁词2"]),
  listEntries: jest.fn().mockReturnValue([{ word: "违禁词1", category: "GENERAL", replacement: null, remark: null, enabled: true }]),
  addWord: jest.fn().mockReturnValue({ success: true }),
  addWords: jest.fn().mockReturnValue({ count: 5 }),
  removeWord: jest.fn().mockReturnValue({ success: true }),
  check: jest.fn().mockReturnValue(["违禁词1"]),
};

const mockComplianceScanSvc = {
  scanAll: jest.fn().mockResolvedValue({ totalHits: 3, created: 2, createdByLevel: { A: 1, B: 1 }, hitsByLevel: { A: 2, B: 1 } }),
  listRecords: jest.fn().mockResolvedValue({ items: [{ id: "r1", word: "改运", level: "A", status: "OPEN" }], total: 1, page: 1, pageSize: 20 }),
  stats: jest.fn().mockResolvedValue({ open: { A: 1, B: 0 }, resolved: { A: 0, B: 0 }, ignored: { A: 0, B: 0 } }),
  updateStatus: jest.fn().mockResolvedValue({ id: "r1", status: "RESOLVED" }),
};

describe("AuditController", () => {
  let ctrl: AuditController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: mockAuditSvc },
        { provide: ReportService, useValue: mockReportSvc },
        { provide: SensitiveWordService, useValue: mockSensitiveWordSvc },
        { provide: ComplianceScanService, useValue: mockComplianceScanSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(AuditController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /audit — 审计日志列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.list(q);
    expect(result).toHaveLength(1);
  });

  it("POST /audit/moderate/image — 图片审核", async () => {
    const body: any = { imageUrl: "https://...img.jpg" };
    const result: any = await ctrl.moderateImage(body);
    expect(result.pass).toBe(true);
  });

  it("POST /audit/moderate/text — 文本审核", async () => {
    const body: any = { content: "测试文本" };
    const result: any = await ctrl.moderateText(body);
    expect(result.pass).toBe(true);
  });

  it("POST /audit/reports — 提交举报", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { targetType: "comment", targetId: "c1", reason: "违规" };
    const result: any = await ctrl.submitReport(req, dto);
    expect(result.status).toBe("PENDING");
  });

  it("GET /audit/reports — 举报列表", async () => {
    const result: any = await ctrl.listReports("PENDING", undefined, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("PUT /audit/reports/:id — 处理举报", async () => {
    const dto: any = { result: "已删除" };
    const result: any = await ctrl.handleReport("rpt1", dto);
    expect(result.status).toBe("RESOLVED");
  });

  it("GET /audit/reports/stats/:type/:id — 举报统计", async () => {
    const result: any = await ctrl.getReportStats("comment", "c1");
    expect(result.total).toBe(5);
  });

  it("GET /audit/sensitive-words — 敏感词列表", async () => {
    const result: any = await ctrl.listSensitiveWords();
    expect(result.words).toHaveLength(2);
  });

  it("POST /audit/sensitive-words — 添加敏感词", async () => {
    const result: any = await ctrl.addSensitiveWord({ word: "新违禁词" });
    expect(result.success).toBe(true);
  });

  it("POST /audit/sensitive-words/batch — 批量添加", async () => {
    const result: any = await ctrl.addSensitiveWords({ words: ["词1", "词2"] });
    expect(result.count).toBe(5);
  });

  it("DELETE /audit/sensitive-words/:word — 删除敏感词", async () => {
    const result: any = await ctrl.removeSensitiveWord("违禁词1");
    expect(result.success).toBe(true);
  });

  it("POST /audit/sensitive-words/check — 检测敏感词", async () => {
    const result: any = await ctrl.checkSensitive({ text: "包含违禁词1的内容" });
    expect(result.hasSensitive).toBe(true);
  });

  it("POST /audit/compliance-scan — 手动触发合规扫描", async () => {
    const result: any = await ctrl.triggerComplianceScan();
    expect(result.created).toBe(2);
    expect(mockComplianceScanSvc.scanAll).toHaveBeenCalled();
  });

  it("GET /audit/compliance-scan/records — 复核队列列表", async () => {
    const result: any = await ctrl.listComplianceRecords({ level: "A", status: "OPEN" } as any);
    expect(result.total).toBe(1);
    expect(mockComplianceScanSvc.listRecords).toHaveBeenCalledWith(expect.objectContaining({ level: "A" }));
  });

  it("GET /audit/compliance-scan/stats — 扫描统计", async () => {
    const result: any = await ctrl.complianceStats();
    expect(result.open.A).toBe(1);
  });

  it("PUT /audit/compliance-scan/records/:id/status — 处置记录", async () => {
    const req: any = { user: { id: "admin-1" } };
    const result: any = await ctrl.updateComplianceStatus(req, "r1", { status: "RESOLVED" });
    expect(result.status).toBe("RESOLVED");
    expect(mockComplianceScanSvc.updateStatus).toHaveBeenCalledWith("r1", "RESOLVED", "admin-1");
  });

  it("GET /audit/operation-logs — 操作日志", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.listOperationLogs(q);
    expect(result).toHaveLength(1);
  });

  it("GET /audit/operation-logs/:id — 日志详情", async () => {
    const result: any = await ctrl.getOperationLog("op1");
    expect(result.action).toBe("DELETE");
  });
});
