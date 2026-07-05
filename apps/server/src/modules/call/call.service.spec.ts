import { Test, TestingModule } from "@nestjs/testing";
import { CallService } from "./call.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";
import { TrtcService } from "./trtc.service";
import { AppGateway } from "../websocket/websocket.gateway";
import { BusinessException } from "../../common/business.exception";

describe("CallService", () => {
  let svc: CallService;
  let prisma: any;
  let coin: any;
  let revenue: any;
  let trtc: any;
  let ws: any;

  beforeEach(async () => {
    prisma = {
      circle: { findUnique: jest.fn() },
      circleMember: { findFirst: jest.fn() },
      audioCallRecord: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      audioCallBilling: { create: jest.fn() },
      $transaction: jest.fn((arg: any) => typeof arg === "function" ? arg(prisma) : Promise.all(arg)),
    };
    coin = {
      getBalance: jest.fn().mockResolvedValue({ balance: 500, frozen: 0 }),
      spend: jest.fn().mockResolvedValue({ account: { balance: 400 }, record: { id: "tx1" } }),
    };
    revenue = { record: jest.fn().mockResolvedValue({}) };
    trtc = {
      generateRoomId: jest.fn().mockReturnValue("room_abc"),
      genRoomToken: jest.fn().mockReturnValue("token_xyz"),
      getAppId: jest.fn().mockReturnValue("sdk_app_123"),
    };
    ws = { sendToUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { setNX: jest.fn().mockResolvedValue(true), del: jest.fn(), runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) } },
        { provide: CoinService, useValue: coin },
        { provide: RevenueService, useValue: revenue },
        { provide: TrtcService, useValue: trtc },
        { provide: AppGateway, useValue: ws },
      ],
    }).compile();

    svc = module.get<CallService>(CallService);
  });

  describe("create", () => {
    it("不能向自己发起连麦", async () => {
      await expect(svc.create("u1", { calleeId: "u1", circleId: "c1" })).rejects.toThrow(BusinessException);
    });

    it("对方不在圈子中时拒绝", async () => {
      prisma.circle.findUnique.mockResolvedValue({ id: "c1" });
      prisma.circleMember.findFirst.mockResolvedValueOnce({ id: "m1" }).mockResolvedValueOnce(null);
      await expect(svc.create("u1", { calleeId: "u2", circleId: "c1" })).rejects.toThrow("对方不在该圈子中");
    });

    it("对方未开启连麦服务时拒绝", async () => {
      prisma.circle.findUnique.mockResolvedValue({ id: "c1" });
      prisma.circleMember.findFirst
        .mockResolvedValueOnce({ id: "m1" })
        .mockResolvedValueOnce({ callPricePerMinuteCoin: 0 });
      await expect(svc.create("u1", { calleeId: "u2", circleId: "c1" })).rejects.toThrow("对方未开启连麦服务");
    });

    it("余额不足时拒绝", async () => {
      prisma.circle.findUnique.mockResolvedValue({ id: "c1" });
      prisma.circleMember.findFirst
        .mockResolvedValueOnce({ id: "m1" })
        .mockResolvedValueOnce({ callPricePerMinuteCoin: 100 });
      coin.getBalance.mockResolvedValueOnce({ balance: 50, frozen: 0 });
      await expect(svc.create("u1", { calleeId: "u2", circleId: "c1" })).rejects.toThrow("余额不足");
    });

    it("成功创建连麦请求", async () => {
      prisma.circle.findUnique.mockResolvedValue({ id: "c1", name: "国学圈" });
      prisma.circleMember.findFirst
        .mockResolvedValueOnce({ id: "m1" })
        .mockResolvedValueOnce({ callPricePerMinuteCoin: 50 });
      prisma.audioCallRecord.create.mockResolvedValue({
        id: "call1",
        caller: { id: "u1", nickname: "Alice", avatar: null },
        callee: { id: "u2", nickname: "Bob", avatar: null },
      });
      const result = await svc.create("u1", { calleeId: "u2", circleId: "c1" });
      expect(result.id).toBe("call1");
      expect(prisma.audioCallRecord.create).toHaveBeenCalled();
      expect(ws.sendToUser).toHaveBeenCalledWith("u2", "incoming_call", expect.any(Object));
    });
  });

  describe("accept", () => {
    it("通话记录不存在时报错", async () => {
      prisma.audioCallRecord.findUnique.mockResolvedValue(null);
      await expect(svc.accept("u2", "call1")).rejects.toThrow(BusinessException);
    });

    it("非被叫方不能接听", async () => {
      prisma.audioCallRecord.findUnique.mockResolvedValue({ id: "call1", calleeId: "u2", status: "WAITING" });
      await expect(svc.accept("u1", "call1")).rejects.toThrow("只有被呼叫者可以接听");
    });

    it("成功接听并返回房间Token", async () => {
      prisma.audioCallRecord.findUnique.mockResolvedValue({
        id: "call1", callerId: "u1", calleeId: "u2",
        status: "WAITING", pricePerMinuteCoin: 10, roomId: "room_abc",
      });
      prisma.audioCallRecord.update.mockResolvedValue({ id: "call1", status: "IN_PROGRESS" });
      const result = await svc.accept("u2", "call1");
      expect(result.status).toBe("IN_PROGRESS");
      expect(ws.sendToUser).toHaveBeenCalledWith("u1", "call_accepted", expect.objectContaining({ token: "token_xyz" }));
    });
  });

  describe("hangup", () => {
    it("无权操作他人通话", async () => {
      prisma.audioCallRecord.findUnique.mockResolvedValue({ id: "call1", callerId: "u1", calleeId: "u2", status: "IN_PROGRESS" });
      await expect(svc.hangup("u3", "call1")).rejects.toThrow("无权操作该通话");
    });

    it("正常挂断完成结算", async () => {
      const startedAt = new Date(Date.now() - 65000);
      prisma.audioCallRecord.findUnique.mockResolvedValue({
        id: "call1", callerId: "u1", calleeId: "u2",
        status: "IN_PROGRESS", pricePerMinuteCoin: 10, totalCoin: 10,
        startedAt,
      });
      prisma.audioCallRecord.update.mockResolvedValue({ id: "call1", status: "COMPLETED" });
      const result = await svc.hangup("u1", "call1");
      expect(result.status).toBe("COMPLETED");
      expect(coin.spend).toHaveBeenCalled();
      expect(revenue.record).toHaveBeenCalled();
      expect(ws.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe("getStatus", () => {
    it("返回通话状态和当前时长", async () => {
      const startedAt = new Date(Date.now() - 30000);
      prisma.audioCallRecord.findUnique.mockResolvedValue({
        id: "call1", callerId: "u1", calleeId: "u2", status: "IN_PROGRESS",
        pricePerMinuteCoin: 10, startedAt,
        caller: { id: "u1", nickname: "A", avatar: null },
        callee: { id: "u2", nickname: "B", avatar: null },
      });
      const result = await svc.getStatus("call1", "u1");
      expect(result.currentDuration).toBeGreaterThan(0);
      expect(result.callerBalance).toBe(500);
    });
  });

  describe("listCalls", () => {
    it("分页返回通话记录", async () => {
      prisma.audioCallRecord.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
      prisma.audioCallRecord.count.mockResolvedValue(2);
      const result = await svc.listCalls("u1", { page: 1, pageSize: 10 });
      expect(result.calls.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("page 传非数字串不产生 NaN skip（P2-4 分页加固）", async () => {
      prisma.audioCallRecord.findMany.mockResolvedValue([]);
      prisma.audioCallRecord.count.mockResolvedValue(0);
      await svc.listCalls("u1", { page: "abc" as any, pageSize: 10 });
      const arg = prisma.audioCallRecord.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });
});
