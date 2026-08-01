import { Test, TestingModule } from "@nestjs/testing";
import { WebhookService } from "./webhook.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("WebhookService", () => {
  let svc: WebhookService;
  let prisma: any;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    prisma = {
      webhookSubscription: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      webhookDelivery: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockImplementation((args: any) => Promise.resolve({
          id: `d-${args.create.subscriptionId}`,
          ...args.create,
          status: "PENDING",
          attempts: 0,
          nextAttemptAt: new Date(0),
        })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockImplementation((args: any) => Promise.resolve({
          id: args.where.id,
          ...args.data,
        })),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    svc = module.get<WebhookService>(WebhookService);
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  describe("register", () => {
    it("注册 Webhook 订阅", async () => {
      prisma.webhookSubscription.create.mockResolvedValue({
        id: "w1", event: "ORDER_PAID", url: "https://example.com/hook",
      });
      const result = await svc.register({
        event: "ORDER_PAID", url: "https://example.com/hook", secret: "s3cret",
      });
      expect(result.id).toBe("w1");
    });
  });

  describe("unregister", () => {
    it("取消订阅", async () => {
      const result = await svc.unregister("w1");
      expect(result.success).toBe(true);
      expect(prisma.webhookSubscription.delete).toHaveBeenCalledWith({ where: { id: "w1" } });
    });
  });

  describe("list", () => {
    it("返回订阅列表", async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([
        { id: "w1", event: "ORDER_PAID" },
        { id: "w2", event: "USER_REGISTERED" },
      ]);
      const result = await svc.list();
      expect(result.length).toBe(2);
    });

    it("按事件类型过滤", async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([{ id: "w1" }]);
      await svc.list("ORDER_PAID");
      expect(prisma.webhookSubscription.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.any(Object),
      }));
    });
  });

  describe("toggleActive", () => {
    it("更新订阅启停状态", async () => {
      prisma.webhookSubscription.update.mockResolvedValue({ id: "w1", isActive: false });
      const result = await svc.toggleActive("w1", false);
      expect(result.isActive).toBe(false);
    });
  });

  describe("fire", () => {
    it("向所有活跃订阅发送 Webhook", async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([
        { id: "w1", event: "ORDER_PAID", url: "https://a.com/hook", secret: "s1", maxRetries: 3, isActive: true },
        { id: "w2", event: "ORDER_PAID", url: "https://b.com/hook", secret: null, maxRetries: 3, isActive: true },
      ]);

      await svc.fire("ORDER_PAID", { orderId: "o1" });
      await new Promise((resolve) => setImmediate(resolve));

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith("https://a.com/hook", expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Webhook-Signature": expect.stringContaining("sha256=") }),
      }));
      expect(prisma.webhookDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          subscriptionId_eventKey: {
            subscriptionId: "w1",
            eventKey: "ORDER_PAID:o1",
          },
        },
      }));
      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "DELIVERED" }),
      }));
    });

    it("无匹配订阅时不发送", async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      await svc.fire("ORDER_PAID", {});
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prisma.webhookDelivery.upsert).not.toHaveBeenCalled();
    });

    it("网络失败时保留待重试状态而不阻塞 fire 返回", async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([
        { id: "w1", event: "ORDER_PAID", url: "https://a.com/hook", secret: null, maxRetries: 3, isActive: true },
      ]);
      fetchMock.mockResolvedValue({ ok: false, status: 503 });

      await svc.fire("ORDER_PAID", { orderId: "o-retry" });
      await new Promise((resolve) => setImmediate(resolve));

      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "d-w1" },
        data: expect.objectContaining({
          status: "PENDING",
          lastStatus: 503,
          lastError: "HTTP 503",
        }),
      }));
    });

    it("定时补偿会回收服务重启后遗留的 PROCESSING 任务", async () => {
      const subscription = {
        id: "w1", event: "ORDER_PAID", url: "https://a.com/hook",
        secret: null, maxRetries: 3, isActive: true,
      };
      prisma.webhookDelivery.findMany.mockResolvedValue([{
        id: "d-stale",
        subscriptionId: "w1",
        event: "ORDER_PAID",
        eventKey: "ORDER_PAID:o-stale",
        payload: { event: "ORDER_PAID", timestamp: 1, data: { orderId: "o-stale" } },
        status: "PROCESSING",
        attempts: 1,
        nextAttemptAt: new Date(0),
        lastAttemptAt: new Date(0),
        subscription,
      }]);

      await svc.retryPendingDeliveries();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(prisma.webhookDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: "d-stale" }),
      }));
    });
  });

  describe("retryDelivery", () => {
    it("仅允许重试终态失败且订阅仍启用的投递", async () => {
      prisma.webhookDelivery.findUnique.mockResolvedValue({
        id: "d-failed",
        status: "FAILED",
        attempts: 4,
        nextAttemptAt: new Date(0),
        lastError: "HTTP 503",
        payload: { event: "ORDER_PAID", timestamp: 1, data: { orderId: "o1" } },
        subscription: {
          id: "w1",
          url: "https://a.com/hook",
          secret: null,
          maxRetries: 3,
          isActive: true,
        },
      });

      const result = await svc.retryDelivery("d-failed");
      await new Promise((resolve) => setImmediate(resolve));

      expect(result).toEqual({ success: true, id: "d-failed" });
      expect(prisma.webhookDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "d-failed", status: "FAILED" },
        data: expect.objectContaining({ status: "PENDING", attempts: 0, lastError: null }),
      }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("拒绝重复投递已经成功的事件", async () => {
      prisma.webhookDelivery.findUnique.mockResolvedValue({
        id: "d-delivered",
        status: "DELIVERED",
        subscription: { isActive: true },
      });

      await expect(svc.retryDelivery("d-delivered")).rejects.toThrow("仅终态失败");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("sign", () => {
    it("生成 HMAC-SHA256 签名", () => {
      const sig = WebhookService.sign("hello", "secret");
      expect(sig).toHaveLength(64);
      expect(sig).toMatch(/^[0-9a-f]+$/);
    });

    it("相同输入产生相同签名", () => {
      const sig1 = WebhookService.sign("test", "key");
      const sig2 = WebhookService.sign("test", "key");
      expect(sig1).toBe(sig2);
    });
  });
});
