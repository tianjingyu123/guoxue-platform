import { Test } from "@nestjs/testing";
import { CoinController } from "./coin.controller";
import { CoinService } from "./coin.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { ActiveUserGuard } from "../../common/active-user.guard";

const mockCoinSvc = {
  getBalance: jest.fn().mockResolvedValue({ coin: 100, bonusCoin: 20 }),
  getTransactions: jest.fn().mockResolvedValue([{ id: "t1", amount: 50 }]),
  getRechargeTiers: jest.fn().mockResolvedValue([{ amount: 6, coin: 60 }]),
  recharge: jest.fn().mockResolvedValue({ id: "r1", amountCoin: 100 }),
  getRecharges: jest.fn().mockResolvedValue([{ id: "r1", userId: "u1", amountCoin: 100 }]),
  spend: jest.fn().mockResolvedValue({ success: true, remaining: 80 }),
  getGifts: jest.fn().mockResolvedValue([{ id: "g1", name: "鲜花", price: 10 }]),
  createGift: jest.fn().mockResolvedValue({ id: "g1", name: "鲜花" }),
  deleteGift: jest.fn().mockResolvedValue({ success: true }),
  sendGift: jest.fn().mockResolvedValue({ success: true }),
  getGiftRank: jest.fn().mockResolvedValue([{ userId: "u1", totalAmount: 500 }]),
};

describe("CoinController", () => {
  let ctrl: CoinController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CoinController],
      providers: [{ provide: CoinService, useValue: mockCoinSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .overrideGuard(ActiveUserGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CoinController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /coin/balance — 获取余额", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getBalance(req);
    expect(result.coin).toBe(100);
    expect(mockCoinSvc.getBalance).toHaveBeenCalledWith("u1");
  });

  it("GET /coin/transactions — 交易流水", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getTransactions(req, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockCoinSvc.getTransactions).toHaveBeenCalledWith("u1", 1, 20, undefined, undefined);
  });

  it("GET /coin/tiers — 充值档位", async () => {
    const result: any = await ctrl.getTiers();
    expect(result).toHaveLength(1);
    expect(mockCoinSvc.getRechargeTiers).toHaveBeenCalled();
  });

  it("POST /coin/admin/recharge — 管理员充值", async () => {
    const dto: any = { userId: "u1", amountCoin: 100, description: "活动赠送" };
    const result: any = await ctrl.adminRecharge(dto);
    expect(result.amountCoin).toBe(100);
    expect(mockCoinSvc.recharge).toHaveBeenCalled();
  });

  it("GET /coin/admin/recharges — 充值记录", async () => {
    const result: any = await ctrl.getRecharges(1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("POST /coin/spend — 消费虚拟币", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { amount: 20, scene: "ASK_QUESTION" };
    const result: any = await ctrl.spend(req, dto);
    expect(result.success).toBe(true);
    expect(mockCoinSvc.spend).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /coin/gifts — 礼物列表", async () => {
    const result: any = await ctrl.getGifts();
    expect(result).toHaveLength(1);
    expect(mockCoinSvc.getGifts).toHaveBeenCalled();
  });

  it("POST /coin/gifts — 创建礼物", async () => {
    const dto: any = { name: "鲜花", icon: "🌺", price: 10 };
    const result: any = await ctrl.createGift(dto);
    expect(result.name).toBe("鲜花");
    expect(mockCoinSvc.createGift).toHaveBeenCalledWith(dto);
  });

  it("DELETE /coin/gifts/:id — 删除礼物", async () => {
    const result: any = await ctrl.deleteGift("g1");
    expect(result.success).toBe(true);
    expect(mockCoinSvc.deleteGift).toHaveBeenCalledWith("g1");
  });

  it("POST /coin/gifts/send — 赠送礼物", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { liveRoomId: "r1", toUserId: "u2", giftId: "g1", quantity: 3 };
    const result: any = await ctrl.sendGift(req, dto);
    expect(result.success).toBe(true);
    expect(mockCoinSvc.sendGift).toHaveBeenCalledWith("u1", "r1", "u2", "g1", 3);
  });

  it("POST /coin/gifts/send — 默认数量为1", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { liveRoomId: "r1", toUserId: "u2", giftId: "g1" };
    await ctrl.sendGift(req, dto);
    expect(mockCoinSvc.sendGift).toHaveBeenCalledWith("u1", "r1", "u2", "g1", 1);
  });

  it("GET /coin/gifts/rank/:liveRoomId — 礼物排行", async () => {
    const result: any = await ctrl.getGiftRank("r1");
    expect(result).toHaveLength(1);
    expect(mockCoinSvc.getGiftRank).toHaveBeenCalledWith("r1");
  });
});
