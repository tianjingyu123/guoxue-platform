import { Test } from "@nestjs/testing";
import { WebhookController } from "./webhook.controller";
import { WebhookService } from "./webhook.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockWebhookSvc = {
  register: jest.fn().mockResolvedValue({ id: "w1", event: "ORDER_PAID", url: "https://..." }),
  list: jest.fn().mockResolvedValue([{ id: "w1", event: "ORDER_PAID" }]),
  listDeliveries: jest.fn().mockResolvedValue([{ id: "d1", status: "FAILED" }]),
  retryDelivery: jest.fn().mockResolvedValue({ success: true, id: "d1" }),
  toggleActive: jest.fn().mockResolvedValue({ id: "w1", isActive: false }),
  unregister: jest.fn().mockResolvedValue({ success: true }),
};

describe("WebhookController", () => {
  let ctrl: WebhookController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [{ provide: WebhookService, useValue: mockWebhookSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(WebhookController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /webhooks — 注册Webhook", async () => {
    const body = { event: "ORDER_PAID" as any, url: "https://example.com/hook" };
    const result: any = await ctrl.register(body);
    expect(result.id).toBe("w1");
    expect(mockWebhookSvc.register).toHaveBeenCalledWith(body);
  });

  it("GET /webhooks — 订阅列表", async () => {
    const result: any = await ctrl.list("ORDER_PAID" as any);
    expect(result).toHaveLength(1);
    expect(mockWebhookSvc.list).toHaveBeenCalledWith("ORDER_PAID");
  });

  it("GET /webhooks/deliveries — 投递审计", async () => {
    const result: any = await ctrl.listDeliveries("w1", "FAILED", "20");
    expect(result).toHaveLength(1);
    expect(mockWebhookSvc.listDeliveries).toHaveBeenCalledWith({
      subscriptionId: "w1",
      status: "FAILED",
      take: 20,
    });
  });

  it("POST /webhooks/deliveries/:id/retry — 人工重试", async () => {
    const result: any = await ctrl.retryDelivery("d1");
    expect(result.success).toBe(true);
    expect(mockWebhookSvc.retryDelivery).toHaveBeenCalledWith("d1");
  });

  it("POST /webhooks/:id/toggle — 启用/禁用", async () => {
    const result: any = await ctrl.toggle("w1", { isActive: false });
    expect(result.isActive).toBe(false);
    expect(mockWebhookSvc.toggleActive).toHaveBeenCalledWith("w1", false);
  });

  it("DELETE /webhooks/:id — 删除订阅", async () => {
    const result: any = await ctrl.unregister("w1");
    expect(result.success).toBe(true);
    expect(mockWebhookSvc.unregister).toHaveBeenCalledWith("w1");
  });
});
