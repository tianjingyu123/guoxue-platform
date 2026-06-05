import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface EntitlementItem {
  type: string;          // STATION / CIRCLE_MEMBER / INSTITUTE_MEMBER / VIP_MEMBER / OPERATOR
  typeLabel: string;     // 中文标签
  targetId: string;      // 实体ID
  targetName: string;    // 实体名称
  expireAt: Date | null; // 到期时间
  status: string;        // ACTIVE / EXPIRING / EXPIRED
  daysRemaining: number; // 剩余天数
  autoRenew: boolean;    // 是否自动续费
}

@Injectable()
export class RenewalService {
  constructor(private prisma: PrismaService) {}

  /** 获取用户所有权益和有效期 */
  async getMyEntitlements(userId: string): Promise<EntitlementItem[]> {
    const now = new Date();
    const items: EntitlementItem[] = [];

    // 1. 分站
    const station = await this.prisma.station.findFirst({
      where: { userId },
      select: { id: true, name: true, expireAt: true, status: true },
    });
    if (station) {
      items.push(this.formatItem("STATION", "分站站长", station.id, station.name, station.expireAt, station.status === "ACTIVE"));
    }

    // 2. 圈子成员（用户加入的所有圈子）
    const circleMembers = await this.prisma.circleMember.findMany({
      where: { userId },
      include: { circle: { select: { id: true, name: true, type: true } } },
    });
    for (const cm of circleMembers) {
      items.push(this.formatItem(
        "CIRCLE_MEMBER",
        `${cm.circle.name}`,
        cm.circleId,
        cm.circle.name,
        cm.expireAt || null,
        true,
      ));
    }

    // 3. 研究院成员
    const instituteMember = await this.prisma.instituteMember.findFirst({
      where: { userId },
      include: { institute: { select: { id: true, name: true } } },
    });
    if (instituteMember) {
      items.push(this.formatItem(
        "INSTITUTE_MEMBER",
        "研究院成员",
        instituteMember.instituteId,
        instituteMember.institute.name,
        instituteMember.expireAt || null,
        instituteMember.status === "ACTIVE",
      ));
    }

    // 4. VIP会员
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberExpire: true, memberLevel: true },
    });
    if (user?.memberLevel && user.memberLevel !== "NONE" && user.memberExpire) {
      items.push(this.formatItem(
        "VIP_MEMBER",
        `${user.memberLevel}会员`,
        userId,
        `${user.memberLevel}会员`,
        user.memberExpire,
        user.memberExpire > now,
      ));
    }

    // 5. 运营商
    const operator = await this.prisma.operator.findFirst({
      where: { userId },
      select: { id: true, expireAt: true, level: true },
    });
    if (operator) {
      items.push(this.formatItem(
        "OPERATOR",
        `${operator.level}运营商`,
        operator.id,
        `${operator.level}运营商`,
        operator.expireAt || null,
        operator.expireAt ? operator.expireAt > now : true,
      ));
    }

    // 按到期时间排序：即将到期排前面
    return items.sort((a, b) => {
      if (!a.expireAt) return 1;
      if (!b.expireAt) return -1;
      return a.expireAt.getTime() - b.expireAt.getTime();
    });
  }

  /** 续费历史 */
  async getMyRenewalHistory(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [records, total] = await Promise.all([
      this.prisma.renewalRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.renewalRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
  }

  /** 创建续费记录（支付成功后调用） */
  async createRenewalRecord(params: {
    userId: string;
    targetType: string;
    targetId: string;
    amount: number;
    periodDays: number;
    prevExpireAt: Date;
    newExpireAt: Date;
    orderId?: string;
  }) {
    return this.prisma.renewalRecord.create({ data: params });
  }

  private formatItem(
    type: string,
    typeLabel: string,
    targetId: string,
    targetName: string,
    expireAt: Date | null,
    isActive: boolean,
  ): EntitlementItem {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let status = "ACTIVE";
    let daysRemaining = 999;

    if (!expireAt) {
      status = "ACTIVE";
      daysRemaining = 999;
    } else if (expireAt < now) {
      status = "EXPIRED";
      daysRemaining = Math.floor((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (expireAt <= thirtyDaysLater) {
      status = "EXPIRING";
      daysRemaining = Math.floor((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      status = "ACTIVE";
      daysRemaining = Math.floor((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (!isActive) status = "INACTIVE";

    return { type, typeLabel, targetId, targetName, expireAt, status, daysRemaining, autoRenew: false };
  }

  /** 获取即将到期（30天内）的用户列表（供通知系统使用） */
  async getExpiringUsers() {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 分站到期
    const expiringStations = await this.prisma.station.findMany({
      where: { expireAt: { gte: now, lte: thirtyDaysLater }, status: "ACTIVE" },
      select: { id: true, name: true, userId: true, expireAt: true },
    });

    // 研究院到期
    const expiringInstituteMembers = await this.prisma.instituteMember.findMany({
      where: { expireAt: { gte: now, lte: thirtyDaysLater }, status: "ACTIVE" },
      select: { id: true, institute: { select: { name: true } }, userId: true, expireAt: true },
    });

    // VIP到期
    const expiringVip = await this.prisma.user.findMany({
      where: { memberExpire: { gte: now, lte: thirtyDaysLater }, memberLevel: { not: "NONE" } },
      select: { id: true, nickname: true, memberExpire: true, memberLevel: true },
    });

    return { expiringStations, expiringInstituteMembers, expiringVip };
  }

  /** 管理员查看所有续费记录 */
  async getAdminHistory(page = 1, pageSize = 20, type?: string) {
    const where: any = {};
    if (type) where.targetType = type;
    const [records, total] = await Promise.all([
      this.prisma.renewalRecord.findMany({
        where,
        include: { user: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.renewalRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
  }
}
