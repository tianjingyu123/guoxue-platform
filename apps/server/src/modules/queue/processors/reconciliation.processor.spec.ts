import { Test, TestingModule } from "@nestjs/testing";
import { ReconciliationProcessor, ReconciliationJobData } from "./reconciliation.processor";
import { FinanceService } from "../../finance/finance.service";
import { Job } from "bullmq";

function mockJob(data: ReconciliationJobData): Job<ReconciliationJobData> {
  return { id: "job-1", data, opts: {} } as Job<ReconciliationJobData>;
}

describe("ReconciliationProcessor", () => {
  let processor: ReconciliationProcessor;
  let finance: any;

  beforeEach(async () => {
    finance = {
      triggerReconciliation: jest.fn().mockResolvedValue({
        status: "MATCHED",
        detail: { orderCount: 5 },
      }),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationProcessor,
        { provide: FinanceService, useValue: finance },
      ],
    }).compile();

    processor = mod.get(ReconciliationProcessor);
  });

  describe("process", () => {
    it("逐日对账并汇总结果", async () => {
      const startDate = "2026-05-01";
      const endDate = "2026-05-03";

      await processor.process(mockJob({
        type: "order",
        batchId: "batch-1",
        dateRange: { start: startDate, end: endDate },
      }));

      // 3天日期范围，应调用3次
      expect(finance.triggerReconciliation).toHaveBeenCalledTimes(3);
      expect(finance.triggerReconciliation).toHaveBeenCalledWith({
        source: "queue:order",
        billDate: "2026-05-01",
      });
      expect(finance.triggerReconciliation).toHaveBeenCalledWith({
        source: "queue:order",
        billDate: "2026-05-02",
      });
      expect(finance.triggerReconciliation).toHaveBeenCalledWith({
        source: "queue:order",
        billDate: "2026-05-03",
      });
    });

    it("单日对账", async () => {
      await processor.process(mockJob({
        type: "payment",
        batchId: "batch-2",
        dateRange: { start: "2026-05-10", end: "2026-05-10" },
      }));

      expect(finance.triggerReconciliation).toHaveBeenCalledTimes(1);
    });

    it("对账某日失败时继续处理后续日期", async () => {
      finance.triggerReconciliation
        .mockResolvedValueOnce({ status: "MATCHED", detail: { orderCount: 3 } })
        .mockRejectedValueOnce(new Error("数据库连接失败"))
        .mockResolvedValueOnce({ status: "MATCHED", detail: { orderCount: 2 } });

      await processor.process(mockJob({
        type: "refund",
        batchId: "batch-3",
        dateRange: { start: "2026-05-01", end: "2026-05-03" },
      }));

      // 全部3天都应尝试
      expect(finance.triggerReconciliation).toHaveBeenCalledTimes(3);
    });
  });
});
