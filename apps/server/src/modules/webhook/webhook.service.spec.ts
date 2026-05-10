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
        { id: "w1", event: "ORDER_PAID", url: "https://a.com/hook", secret: "s1" },
        { id: "w2", event: "ORDER_PAID", url: "https://b.com/hook", secret: null },
      ]);

      await svc.fire("ORDER_PAID", { orderId: "o1" });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith("https://a.com/hook", expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Webhook-Signature": expect.stringContaining("sha256=") }),
      }));
    });

    it("无匹配订阅时不发送", async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      await svc.fire("ORDER_PAID", {});
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
