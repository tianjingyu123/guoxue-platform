import { Test } from "@nestjs/testing";
import { QueueService } from "./queue.service";
import { getQueueToken } from "@nestjs/bullmq";

describe("QueueService", () => {
  let svc: QueueService;
  let notificationQueue: any;
  let aiCallbackQueue: any;
  let reconciliationQueue: any;

  beforeEach(async () => {
    notificationQueue = {
      add: jest.fn(),
      addBulk: jest.fn(),
      getJob: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
    };
    aiCallbackQueue = {
      add: jest.fn(),
      addBulk: jest.fn(),
      getJob: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
    };
    reconciliationQueue = {
      add: jest.fn(),
      addBulk: jest.fn(),
      getJob: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: getQueueToken("notification"), useValue: notificationQueue },
        { provide: getQueueToken("ai-callback"), useValue: aiCallbackQueue },
        { provide: getQueueToken("reconciliation"), useValue: reconciliationQueue },
      ],
    }).compile();
    svc = mod.get(QueueService);
  });

  describe("add", () => {
    it("添加任务到通知队列", async () => {
      notificationQueue.add.mockResolvedValue({ id: "job-1", name: "send-push" });

      const result = await svc.add("notification", "send-push", { userId: "u1", title: "通知" });
      expect(result.id).toBe("job-1");
      expect(notificationQueue.add).toHaveBeenCalledWith("send-push", { userId: "u1", title: "通知" }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      });
    });

    it("添加延迟任务", async () => {
      notificationQueue.add.mockResolvedValue({ id: "job-2", name: "remind" });

      await svc.add("notification", "remind", { userId: "u1" }, { delay: 60000, priority: 1 });
      expect(notificationQueue.add).toHaveBeenCalledWith("remind", { userId: "u1" }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        delay: 60000,
        priority: 1,
      });
    });

    it("添加任务到AI回调队列", async () => {
      aiCallbackQueue.add.mockResolvedValue({ id: "job-3", name: "ai-callback" });

      const result = await svc.add("ai-callback", "chat-complete", { messageId: "m1" });
      expect(result.id).toBe("job-3");
    });

    it("添加任务到对账队列", async () => {
      reconciliationQueue.add.mockResolvedValue({ id: "job-4", name: "reconcile" });

      const result = await svc.add("reconciliation", "daily-reconcile", { date: "2026-01-01" });
      expect(result.id).toBe("job-4");
    });
  });

  describe("addBulk", () => {
    it("批量添加任务", async () => {
      notificationQueue.addBulk.mockResolvedValue([
        { id: "job-1" }, { id: "job-2" },
      ]);

      const jobs = [
        { name: "task-a", data: { x: 1 } },
        { name: "task-b", data: { x: 2 }, opts: { priority: 10 } },
      ];
      const result = await svc.addBulk("notification", jobs);
      expect(result).toHaveLength(2);
      expect(notificationQueue.addBulk).toHaveBeenCalledWith([
        expect.objectContaining({ name: "task-a", data: { x: 1 } }),
        expect.objectContaining({ name: "task-b", data: { x: 2 } }),
      ]);
    });
  });

  describe("getJob", () => {
    it("查询任务状态", async () => {
      notificationQueue.getJob.mockResolvedValue({ id: "job-1", name: "send-push", progress: 50 });

      const result = await svc.getJob("notification", "job-1");
      expect(result).toBeDefined();
      expect(result!.id).toBe("job-1");
    });

    it("任务不存在返回undefined", async () => {
      notificationQueue.getJob.mockResolvedValue(undefined);
      const result = await svc.getJob("notification", "job-99");
      expect(result).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("返回单个队列统计", async () => {
      notificationQueue.getWaitingCount.mockResolvedValue(5);
      notificationQueue.getActiveCount.mockResolvedValue(2);
      notificationQueue.getCompletedCount.mockResolvedValue(100);
      notificationQueue.getFailedCount.mockResolvedValue(3);
      notificationQueue.getDelayedCount.mockResolvedValue(1);

      const result = await svc.getStats("notification");
      expect(result).toEqual({ waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1 });
    });
  });

  describe("getAllStats", () => {
    it("返回所有队列统计", async () => {
      notificationQueue.getWaitingCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getCompletedCount.mockResolvedValue(0);
      notificationQueue.getFailedCount.mockResolvedValue(0);
      notificationQueue.getDelayedCount.mockResolvedValue(0);

      aiCallbackQueue.getWaitingCount.mockResolvedValue(1);
      aiCallbackQueue.getActiveCount.mockResolvedValue(0);
      aiCallbackQueue.getCompletedCount.mockResolvedValue(50);
      aiCallbackQueue.getFailedCount.mockResolvedValue(0);
      aiCallbackQueue.getDelayedCount.mockResolvedValue(0);

      reconciliationQueue.getWaitingCount.mockResolvedValue(0);
      reconciliationQueue.getActiveCount.mockResolvedValue(1);
      reconciliationQueue.getCompletedCount.mockResolvedValue(30);
      reconciliationQueue.getFailedCount.mockResolvedValue(0);
      reconciliationQueue.getDelayedCount.mockResolvedValue(0);

      const result = await svc.getAllStats();
      expect(result.notification).toBeDefined();
      expect(result["ai-callback"]).toBeDefined();
      expect(result.reconciliation).toBeDefined();
    });
  });
});
