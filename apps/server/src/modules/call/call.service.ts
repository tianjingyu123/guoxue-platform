import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";
import { TrtcService } from "./trtc.service";
import { AppGateway } from "../websocket/websocket.gateway";

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private coin: CoinService,
    private revenue: RevenueService,
    private trtc: TrtcService,
    private wsGateway: AppGateway,
  ) {}

  /** 发起连麦请求 */
  async create(callerId: string, dto: { calleeId: string; circleId: string }) {
    if (callerId === dto.calleeId) throw new ConflictException("不能向自己发起连麦");

    // 验证圈子
    const circle = await this.prisma.circle.findUnique({ where: { id: dto.circleId } });
    if (!circle) throw new NotFoundException("圈子不存在");

    // 验证双方均为圈子成员
    const [callerMember, calleeMember] = await Promise.all([
      this.prisma.circleMember.findFirst({ where: { circleId: dto.circleId, userId: callerId } }),
      this.prisma.circleMember.findFirst({ where: { circleId: dto.circleId, userId: dto.calleeId } }),
    ]);
    if (!callerMember) throw new BadRequestException("您不在该圈子中");
    if (!calleeMember) throw new BadRequestException("对方不在该圈子中");

    // 验证被叫方设置了连麦价格
    const pricePerMinute = calleeMember.callPricePerMinuteCoin;
    if (pricePerMinute <= 0) throw new BadRequestException("对方未开启连麦服务");

    // 检查余额（至少够1分钟）
    const balance = await this.coin.getBalance(callerId);
    if (balance.balance < pricePerMinute) {
      throw new BadRequestException(`余额不足，每分钟费用为${pricePerMinute}币，当前余额${balance.balance}币`);
    }

    // 创建TRTC房间
    const roomId = this.trtc.generateRoomId();

    // 创建通话记录
    const call = await this.prisma.audioCallRecord.create({
      data: {
        callerId,
        calleeId: dto.calleeId,
        circleId: dto.circleId,
        pricePerMinuteCoin: pricePerMinute,
        roomId,
        status: "WAITING",
      },
      include: {
        caller: { select: { id: true, nickname: true, avatar: true } },
        callee: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    // 推送通知给被叫方
    this.wsGateway.sendToUser(dto.calleeId, "incoming_call", {
      callId: call.id,
      caller: call.caller,
      circleName: circle.name,
      pricePerMinute,
    });

    return call;
  }

  /** 接听连麦 */
  async accept(calleeId: string, callId: string) {
    const call = await this.prisma.audioCallRecord.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException("通话记录不存在");
    if (call.calleeId !== calleeId) throw new BadRequestException("只有被呼叫者可以接听");
    if (call.status !== "WAITING") throw new BadRequestException("通话状态不允许接听");

    // 再次检查余额
    const balance = await this.coin.getBalance(call.callerId);
    if (balance.balance < call.pricePerMinuteCoin) {
      // 余额不足，自动取消
      await this.prisma.audioCallRecord.update({
        where: { id: callId },
        data: { status: "CANCELLED", endedAt: new Date() },
      });
      this.wsGateway.sendToUser(call.callerId, "call_cancelled", { callId, reason: "余额不足" });
      this.wsGateway.sendToUser(call.calleeId, "call_cancelled", { callId, reason: "对方余额不足" });
      throw new BadRequestException("余额不足，通话已取消");
    }

    // 生成TRTC房间Token
    const callerToken = this.trtc.genRoomToken(call.callerId, call.roomId!);
    const calleeToken = this.trtc.genRoomToken(call.calleeId, call.roomId!);

    const updated = await this.prisma.audioCallRecord.update({
      where: { id: callId },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    // 推送接听成功通知
    this.wsGateway.sendToUser(call.callerId, "call_accepted", {
      callId,
      roomId: call.roomId,
      token: callerToken,
      sdkAppId: this.trtc.getAppId(),
    });
    this.wsGateway.sendToUser(call.calleeId, "call_accepted", {
      callId,
      roomId: call.roomId,
      token: calleeToken,
      sdkAppId: this.trtc.getAppId(),
    });

    return updated;
  }

  /** 挂断连麦 */
  async hangup(userId: string, callId: string) {
    const call = await this.prisma.audioCallRecord.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException("通话记录不存在");
    if (call.callerId !== userId && call.calleeId !== userId) {
      throw new ForbiddenException("无权操作该通话");
    }
    if (call.status !== "IN_PROGRESS" && call.status !== "WAITING") {
      throw new BadRequestException("通话状态不允许挂断");
    }

    const now = new Date();
    let durationSeconds = 0;
    let totalCoin = 0;

    if (call.status === "IN_PROGRESS" && call.startedAt) {
      durationSeconds = Math.ceil((now.getTime() - call.startedAt.getTime()) / 1000);
      // 不足1分钟按1分钟计
      const minutes = Math.ceil(durationSeconds / 60);
      totalCoin = minutes * call.pricePerMinuteCoin;

      // 最后一分钟扣费
      await this.coin.spend(call.callerId, {
        amountCoin: totalCoin - call.totalCoin,
        scene: "AUDIO_CALL",
        refId: callId,
        description: `连麦通话结束结算（${minutes}分钟）`,
      });

      // 收益分佣
      this.revenue.record({
        userId: call.calleeId,
        scene: "AUDIO_CALL",
        refId: callId,
        amountCoin: totalCoin,
      }).catch((err) => this.logger.warn("通话回调处理失败", err));
    }

    const updated = await this.prisma.audioCallRecord.update({
      where: { id: callId },
      data: {
        status: "COMPLETED",
        durationSeconds,
        totalCoin: totalCoin > 0 ? totalCoin : call.totalCoin,
        endedAt: now,
      },
    });

    // 推送挂断通知
    this.wsGateway.sendToUser(call.callerId, "call_ended", { callId, durationSeconds, totalCoin });
    this.wsGateway.sendToUser(call.calleeId, "call_ended", { callId, durationSeconds, totalCoin });

    return updated;
  }

  /** 每分钟定时扣费（由定时任务调用，分布式锁防重叠） */
  @Cron(CronExpression.EVERY_MINUTE)
  async billingTick() {
    const lockKey = "cron:lock:billing_tick";
    const locked = await this.redis.setNX(lockKey, "1", 55);
    if (!locked) return;

    try {
      await this._billingTickImpl();
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async _billingTickImpl() {
    const activeCalls = await this.prisma.audioCallRecord.findMany({
      where: { status: "IN_PROGRESS", startedAt: { not: null } },
    });

    // 批量查询余额（按用户去重）
    const callerIds = [...new Set(activeCalls.map(c => c.callerId))];
    const balanceMap = new Map<string, number>();
    await Promise.all(callerIds.map(async (uid) => {
      const bal = await this.coin.getBalance(uid);
      balanceMap.set(uid, bal.balance);
    }));

    for (const call of activeCalls) {
      try {
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - call.startedAt!.getTime()) / 1000);
        const currentMinute = Math.floor(elapsedSeconds / 60) + 1;
        const previouslyBilledMinutes = Math.floor(call.totalCoin / call.pricePerMinuteCoin);
        if (currentMinute <= previouslyBilledMinutes) continue;

        // 获取当前余额（从批量查询结果）
        const balance = balanceMap.get(call.callerId) ?? 0;

        // 余额不足：预警或挂断
        if (balance < call.pricePerMinuteCoin) {
          // 余额耗尽，强制挂断
          this.wsGateway.sendToUser(call.callerId, "call_balance_insufficient", {
            callId: call.id,
            message: "余额不足，通话即将自动挂断",
          });
          await this.forceHangup(call.id, call.callerId, call.calleeId);
          continue;
        }

        // 余额仅够1分钟：预警
        if (balance < call.pricePerMinuteCoin * 2) {
          this.wsGateway.sendToUser(call.callerId, "call_low_balance", {
            callId: call.id,
            balance: balance,
            message: "余额即将不足，请及时充值",
          });
        }

        // 扣除当前分钟费用
        const updated = await this.coin.spend(call.callerId, {
          amountCoin: call.pricePerMinuteCoin,
          scene: "AUDIO_CALL",
          refId: call.id,
          description: `连麦第${currentMinute}分钟扣费`,
        });

        // 生成扣费明细
        await this.prisma.audioCallBilling.create({
          data: {
            callRecordId: call.id,
            billingMinute: currentMinute,
            coinDeducted: call.pricePerMinuteCoin,
            balanceBefore: updated.account.balance + call.pricePerMinuteCoin,
            balanceAfter: updated.account.balance,
          },
        });

        // 更新通话总消费
        await this.prisma.audioCallRecord.update({
          where: { id: call.id },
          data: { totalCoin: { increment: call.pricePerMinuteCoin } },
        });
      } catch (err: unknown) {
        this.logger.error(`连麦扣费失败 callId=${call.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  /** 强制挂断（余额耗尽时） */
  private async forceHangup(callId: string, callerId: string, calleeId: string) {
    const call = await this.prisma.audioCallRecord.findUnique({ where: { id: callId } });
    if (!call || call.status !== "IN_PROGRESS") return;

    const now = new Date();
    const durationSeconds = call.startedAt ? Math.ceil((now.getTime() - call.startedAt.getTime()) / 1000) : 0;

    await this.prisma.audioCallRecord.update({
      where: { id: callId },
      data: { status: "COMPLETED", durationSeconds, endedAt: now },
    });

    this.wsGateway.sendToUser(callerId, "call_ended", { callId, reason: "余额耗尽" });
    this.wsGateway.sendToUser(calleeId, "call_ended", { callId, reason: "对方余额耗尽" });
  }

  /** 查询通话状态 */
  async getStatus(callId: string, userId: string) {
    const call = await this.prisma.audioCallRecord.findUnique({
      where: { id: callId },
      include: {
        caller: { select: { id: true, nickname: true, avatar: true } },
        callee: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!call) throw new NotFoundException("通话记录不存在");
    if (call.callerId !== userId && call.calleeId !== userId) {
      throw new ForbiddenException("无权查看该通话");
    }

    let currentDuration = 0;
    let currentCost = 0;
    if (call.status === "IN_PROGRESS" && call.startedAt) {
      currentDuration = Math.ceil((Date.now() - call.startedAt.getTime()) / 1000);
      currentCost = Math.ceil(currentDuration / 60) * call.pricePerMinuteCoin;
    }

    const balance = await this.coin.getBalance(call.callerId);

    return {
      ...call,
      currentDuration,
      currentCost,
      callerBalance: balance.balance,
    };
  }

  /** 获取用户的通话记录 */
  async listCalls(userId: string, dto: { status?: string; page?: number; pageSize?: number }) {
    const page = dto.page || 1;
    const pageSize = dto.pageSize || 20;
    const where: Prisma.AudioCallRecordWhereInput = {
      OR: [{ callerId: userId }, { calleeId: userId }],
    };
    if (dto.status) where.status = dto.status;

    const [calls, total] = await Promise.all([
      this.prisma.audioCallRecord.findMany({
        where,
        include: {
          caller: { select: { id: true, nickname: true, avatar: true } },
          callee: { select: { id: true, nickname: true, avatar: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.audioCallRecord.count({ where }),
    ]);

    return { calls, total, page, pageSize };
  }
}
