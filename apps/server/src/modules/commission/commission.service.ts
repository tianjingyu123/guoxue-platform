import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  // ───────── 佣金配置管理 ─────────

  async getAllConfigs() {
    return this.prisma.commissionConfig.findMany();
  }

  async updateConfig(key: string, dto: { rateA?: number; rateB?: number; rateC?: number; description?: string }) {
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey: key } });
    if (!config) throw new NotFoundException("配置不存在");
    return this.prisma.commissionConfig.update({
      where: { configKey: key },
      data: {
        ...(dto.rateA !== undefined && { rateA: dto.rateA }),
        ...(dto.rateB !== undefined && { rateB: dto.rateB }),
        ...(dto.rateC !== undefined && { rateC: dto.rateC }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  // ───────── 佣金计算核心 ─────────

  /**
   * 根据订单类型和金额计算佣金
   * 返回 StationEarning 创建所需数据
   */
  async calculateAndRecord(
    orderId: string,
    type: string, // COURSE, PRODUCT, MEMBER, CIRCLE, BOT
    amount: number,
    referrerId?: string,
    tempReferrerId?: string,
    stationId?: string,
  ) {
    // 确定配置key
    const configKey = this.mapTypeToConfigKey(type);
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey } });
    if (!config) return null; // 未配置则不计算

    const effectiveReferrerId = tempReferrerId || referrerId;
    if (!effectiveReferrerId) return null;

    // 查找推荐人的分站
    const station = stationId
      ? await this.prisma.station.findUnique({ where: { id: stationId } })
      : await this.prisma.station.findUnique({ where: { userId: effectiveReferrerId } });

    if (!station) return null;

    const rate = Number(config.rateA); // 站长佣金比例
    const earned = amount * rate;

    // 创建收益记录
    const earning = await this.prisma.stationEarning.create({
      data: {
        stationId: station.id,
        orderId,
        amount,
        rate: config.rateA,
        earned,
        type,
      },
    });

    // 更新分站总收益
    await this.prisma.station.update({
      where: { id: station.id },
      data: { totalEarning: { increment: earned } },
    });

    // 发送收益通知
    await this.prisma.notification.create({
      data: {
        userId: station.userId,
        type: "EARNING",
        title: "新的推广收益",
        content: `您获得一笔 ${type} 推广佣金 ¥${earned.toFixed(2)}（订单金额 ¥${amount}，比例 ${(rate * 100).toFixed(1)}%）`,
        targetType: type,
        targetId: orderId,
      },
    });

    return earning;
  }

  // ───────── 分站收益查询 ─────────

  async getStationEarnings(stationId: string, page = 1, pageSize = 20) {
    const where = { stationId };
    const [earnings, total] = await Promise.all([
      this.prisma.stationEarning.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationEarning.count({ where }),
    ]);
    // 计算累计收益
    const sumResult = await this.prisma.stationEarning.aggregate({
      where,
      _sum: { earned: true },
    });
    return {
      earnings,
      total,
      page,
      pageSize,
      totalEarned: sumResult._sum.earned || 0,
    };
  }

  async getStationBalance(stationId: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { totalEarning: true },
    });
    if (!station) throw new NotFoundException("分站不存在");

    // 计算已提现金额
    const withdrawn = await this.prisma.withdrawal.aggregate({
      where: { stationId, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amount: true },
    });

    const totalEarned = Number(station.totalEarning);
    const totalWithdrawn = Number(withdrawn._sum.amount || 0);
    return {
      totalEarned,
      totalWithdrawn,
      balance: totalEarned - totalWithdrawn,
    };
  }

  // ───────── 提现管理 ─────────

  async applyWithdrawal(userId: string, dto: {
    amount: number;
    bankName?: string;
    bankAccount?: string;
    bankHolder?: string;
    alipayAccount?: string;
    stationId?: string;
  }) {
    // 查找分站
    let stationId = dto.stationId;
    if (!stationId) {
      const station = await this.prisma.station.findUnique({ where: { userId } });
      if (!station) throw new BadRequestException("您还没有分站，无法提现");
      stationId = station.id;
    }

    // 检查余额
    const { balance } = await this.getStationBalance(stationId);
    if (balance < dto.amount) {
      throw new BadRequestException(`余额不足，当前可提现余额 ¥${balance.toFixed(2)}`);
    }

    // 检查最低提现门槛 (¥100)
    const cfg = await this.prisma.commissionConfig.findUnique({ where: { configKey: "withdrawal_min" } });
    const minAmount = cfg ? Number(cfg.rateA) : 100;
    if (dto.amount < minAmount) {
      throw new BadRequestException(`最低提现金额为 ¥${minAmount}`);
    }

    return this.prisma.withdrawal.create({
      data: {
        userId,
        stationId,
        amount: dto.amount,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankHolder: dto.bankHolder,
        alipayAccount: dto.alipayAccount,
        status: "PENDING",
      },
    });
  }

  async listWithdrawals(page = 1, pageSize = 20, status?: string) {
    const where = status ? { status } : {};
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, phone: true } },
          station: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    return { withdrawals, total, page, pageSize };
  }

  async auditWithdrawal(id: string, dto: { status: string; remark?: string }) {
    const w = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!w) throw new NotFoundException("提现记录不存在");
    if (w.status !== "PENDING") throw new BadRequestException("该记录已处理");

    return this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: dto.status,
        remark: dto.remark,
        processedAt: new Date(),
      },
    });
  }

  async getUserWithdrawals(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    return { withdrawals, total, page, pageSize };
  }

  // ───────── 推荐链接 ─────────

  async createReferralLink(userId: string, dto: { targetType: string; targetId: string; channel?: string }) {
    // 生成短码
    const code = this.generateCode();
    return this.prisma.referralLink.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        code,
        channel: dto.channel || "DIRECT",
      },
    });
  }

  async getReferralLinks(userId: string) {
    return this.prisma.referralLink.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async trackClick(code: string) {
    const link = await this.prisma.referralLink.findUnique({ where: { code } });
    if (!link) return null;
    await this.prisma.referralLink.update({
      where: { code },
      data: { clickCount: { increment: 1 } },
    });
    return { referrerId: link.userId, targetType: link.targetType, targetId: link.targetId };
  }

  // ───────── 辅助方法 ─────────

  private mapTypeToConfigKey(type: string): string {
    const map: Record<string, string> = {
      COURSE: "course_basic",
      PRODUCT: "product_platform",
      MEMBER: "station_member",
      CIRCLE_JOIN: "circle_join",
      BOT: "bot_call",
    };
    return map[type] || "product_platform";
  }

  private generateCode(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
