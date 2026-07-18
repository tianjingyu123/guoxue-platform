import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";
import { encrypt, resolveAccount } from "../../common/crypto.util";

@Injectable()
export class VideoCreatorService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** 创作者概览 — 汇总用户视频的播放/互动/带货数据 */
  async getOverview(userId: string) {
    const videos = await this.prisma.video.findMany({
      where: { userId, status: "PUBLISHED" },
      select: { id: true, viewCount: true, likeCount: true, commentCount: true, shareCount: true },
    });

    const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
    const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
    const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
    const totalShares = videos.reduce((s, v) => s + v.shareCount, 0);

    // 粉丝数
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { _count: { select: { followers: true } } },
    });
    const followers = user?._count?.followers ?? 0;

    // 收益数据（虚拟币账户）
    const coinAccount = await this.prisma.virtualCoinAccount.findUnique({
      where: { userId },
    });
    const totalEarnings = coinAccount?.totalRecharged ?? 0;
    const pendingEarnings = coinAccount?.frozen ?? 0;
    const withdrawnEarnings = coinAccount?.totalSpent ?? 0;

    // 带货商品关联数
    const productCount = await this.prisma.videoProduct.count({
      where: { video: { userId } },
    });

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      followers,
      totalEarnings,
      pendingEarnings,
      withdrawnEarnings,
      totalSales: productCount,
      totalGMV: 0,
      commission: 0,
      conversionRate: 0,
      viewsTrend: 0,
      likesTrend: 0,
      followersTrend: 0,
      salesTrend: 0,
    };
  }

  /** 我的作品列表 */
  async getMyVideos(userId: string) {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
        status: true,
        visibility: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    });

    return videos.map((v) => ({
      id: v.id,
      title: v.title,
      cover: v.coverUrl,
      views: v.viewCount,
      likes: v.likeCount,
      comments: v.commentCount,
      shares: v.shareCount,
      sales: v._count.products,
      gmv: 0,
      // removed=严重违规已下架（作者列表显示「已下架」）；selfOnly=机审降级仅自己可见（灰色小标）
      status: v.status === "REJECTED" ? "removed" : v.status === "PUBLISHED" ? "published" : "draft",
      selfOnly: v.visibility === "SELF_ONLY",
      publishTime: v.createdAt.toISOString().slice(0, 10),
      products: [] as { id: string; name: string; price: number }[],
    }));
  }

  /** 商品库 — 平台可带货商品 */
  async getProducts() {
    const products = await this.prisma.product.findMany({
      where: { status: "ON_SALE", deletedAt: null },
      take: 50,
      orderBy: { salesCount: "desc" },
      select: { id: true, title: true, price: true, salesCount: true, stock: true, images: true },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.title,
      price: Number(p.price),
      sales: p.salesCount,
      commission: Math.round(Number(p.price) * 0.1),
      stock: p.stock,
      image: p.images?.[0] ?? "",
    }));
  }

  /** 收益预览 — 最近GRANT类型交易记录 */
  async getEarningsPreview(userId: string) {
    const txs = await this.prisma.virtualCoinTransaction.findMany({
      where: { userId, type: "GRANT" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { amountCoin: true, description: true, createdAt: true },
    });

    return txs.map((tx) => ({
      type: "带货佣金",
      amount: tx.amountCoin,
      time: tx.createdAt.toISOString().slice(0, 16).replace("T", " "),
      product: tx.description ?? "",
    }));
  }

  /** 数据分析 — 视频播放趋势 */
  async getAnalytics(userId: string) {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
    const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
    const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
    const totalShares = videos.reduce((s, v) => s + v.shareCount, 0);

    // 按天观看趋势：当前缺少每日播放快照表，无法真实按天拆分。
    // 严禁用 Math.random 编造趋势（违 CLAUDE.md 禁随机铁律）→ 返回空数组，前端隐藏趋势图。
    // TODO(二期): 建 VideoDailyStat 每日快照表后，在此真实按天聚合。
    const viewTrend: { date: string; views: number; likes: number; comments: number }[] = [];

    const videoMetrics = videos.slice(0, 10).map((v) => ({
      id: v.id,
      title: v.title,
      views: v.viewCount,
      likes: v.likeCount,
      comments: v.commentCount,
      shares: v.shareCount,
      duration: `${Math.round((v.duration ?? 0) / 60)}分`,
      uploadDate: v.createdAt.toISOString().slice(0, 10),
    }));

    return { totalViews, totalLikes, totalComments, totalShares, viewTrend, videoMetrics };
  }

  /** 销售数据 */
  async getSales(_userId: string) {
    return {
      totalSales: 0,
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      salesTrend: [] as { date: string; sales: number; revenue: number; orders: number }[],
      topProducts: [] as { id: string; title: string; sales: number; revenue: number; conversion: number }[],
    };
  }

  /** 收益概览 */
  async getRevenueOverview(userId: string) {
    const account = await this.prisma.virtualCoinAccount.findUnique({ where: { userId } });
    return {
      withdrawable: account?.balance ?? 0,
      frozen: account?.frozen ?? 0,
      pending: 0,
      totalRevenue: account?.totalRecharged ?? 0,
      monthRevenue: 0,
    };
  }

  /** 提现记录 — 用 SPEND 类型近似 */
  async getWithdrawHistory(userId: string) {
    const txs = await this.prisma.virtualCoinTransaction.findMany({
      where: { userId, type: "SPEND" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, amountCoin: true, createdAt: true },
    });

    return txs.map((tx) => ({
      id: tx.id,
      amount: tx.amountCoin,
      fee: 0,
      actualAmount: tx.amountCoin,
      method: "银行卡",
      account: "",
      status: "success",
      createdAt: tx.createdAt.toISOString().slice(0, 16).replace("T", " "),
      completedAt: tx.createdAt.toISOString().slice(0, 16).replace("T", " "),
    }));
  }

  /** 收益历史（按月汇总 GRANT 类型） */
  async getEarningsHistory(userId: string) {
    const txs = await this.prisma.virtualCoinTransaction.findMany({
      where: { userId, type: "GRANT" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { amountCoin: true, createdAt: true },
    });

    // 按月聚合
    const monthMap = new Map<string, number>();
    for (const tx of txs) {
      const month = tx.createdAt.toISOString().slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + tx.amountCoin);
    }

    let totalEarnings = 0;
    const records = [...monthMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, earnings], i, arr) => {
        totalEarnings += earnings;
        const prev = arr[i + 1];
        const change = prev ? (((earnings - prev[1]) / prev[1]) * 100).toFixed(0) : "0";
        return {
          id: month,
          month: month.replace("-", "年") + "月",
          earnings,
          orders: 0,
          trend: Number(change) >= 0 ? "up" : "down",
          change: Number(change),
        };
      });

    return {
      totalEarnings,
      monthlyEarnings: records[0]?.earnings ?? 0,
      records,
    };
  }

  /**
   * 提交提现申请 —「申请→审核→打款」真审批流的第一步。
   * 不再即时 SPEND 到账，而是：校验余额充足 → 冻结对应币数（balance→frozen + VirtualCoinFrozen 明细）
   * → 创建 VideoCreatorWithdrawal(PENDING)。三者同事务，保证冻结与申请记录原子一致。
   * 冻结而非仅校验：防止用户在待审期间把这笔币花在别处导致打款时超额。
   */
  async submitWithdraw(userId: string, data: { amount: number; method: string; account: string }) {
    const amount = Math.floor(Number(data.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: "提现金额无效" };
    }
    if (!data.method?.trim() || !data.account?.trim()) {
      return { success: false, message: "请填写提现方式与收款账号" };
    }

    const acct = await this.prisma.virtualCoinAccount.findUnique({ where: { userId } });
    if (!acct || acct.balance < amount) {
      return { success: false, message: "余额不足" };
    }

    await this.prisma.$transaction(async (tx) => {
      // 冻结：可用余额转入冻结，防止待审期间被挪用
      const updated = await tx.virtualCoinAccount.updateMany({
        where: { userId, balance: { gte: amount } }, // 条件更新兜底并发，避免余额被并发扣成负数
        data: { balance: { decrement: amount }, frozen: { increment: amount } },
      });
      if (updated.count === 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "余额不足");
      }

      const acctPlain = data.account.trim();
      const withdrawal = await tx.videoCreatorWithdrawal.create({
        data: {
          userId,
          amountCoin: amount,
          method: data.method.trim(),
          // 双写：明文列过渡期保留（兼容旧读路径/存量），密文列为加密真源（读取优先解密）
          account: acctPlain,
          accountEnc: encrypt(acctPlain),
          status: "PENDING",
        },
      });

      await tx.virtualCoinFrozen.create({
        data: {
          userId,
          amountCoin: amount,
          scene: "WITHDRAW",
          refId: withdrawal.id,
          status: "FROZEN",
        },
      });
    });

    return { success: true, message: "提现申请已提交，等待审核" };
  }

  /** 添加商品关联 — 需验证视频归属权 */
  async addProduct(userId: string, data: { videoId: string; productId: string }) {
    // IDOR 防护：验证视频属于当前用户
    const video = await this.prisma.video.findUnique({
      where: { id: data.videoId },
      select: { userId: true },
    });
    if (!video || video.userId !== userId) {
      return { success: false, message: "只能给自己的视频添加商品" };
    }

    await this.prisma.videoProduct.create({
      data: {
        videoId: data.videoId,
        productId: data.productId,
      },
    });
    return { success: true, message: "商品已关联" };
  }

  /** 读取创作者设置 — 资料(nickname/bio)走 User 主字段，其余偏好存 creatorSettings/notifySettings */
  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, avatar: true, bio: true, notifySettings: true, creatorSettings: true },
    });
    const cs = (user?.creatorSettings as Record<string, any> | null) ?? {};
    const notify = (user?.notifySettings as Record<string, boolean> | null) ?? {};
    return {
      profile: {
        nickname: user?.nickname ?? "",
        avatar: user?.avatar ?? "",
        bio: user?.bio ?? "",
        specialty: cs.specialty ?? "",
        website: cs.website ?? "",
      },
      notify: {
        newFollower: notify.newFollower ?? true,
        newComment: notify.newComment ?? true,
        newOrder: notify.newOrder ?? true,
        newLike: notify.newLike ?? false,
        system: notify.system ?? true,
      },
      privacy: {
        showFollowers: cs.privacy?.showFollowers ?? true,
        showFollowing: cs.privacy?.showFollowing ?? false,
        allowComment: cs.privacy?.allowComment ?? true,
        allowDm: cs.privacy?.allowDm ?? true,
      },
    };
  }

  /** 保存创作者设置 — 资料更新 User 主字段，通知存 notifySettings，专业/网站/隐私存 creatorSettings */
  async saveSettings(
    userId: string,
    data: {
      profile?: { nickname?: string; bio?: string; specialty?: string; website?: string };
      notify?: Record<string, boolean>;
      privacy?: Record<string, boolean>;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creatorSettings: true, notifySettings: true },
    });
    const cs = (user?.creatorSettings as Record<string, any> | null) ?? {};
    const notify = (user?.notifySettings as Record<string, any> | null) ?? {};

    const userUpdate: Record<string, any> = {};
    if (data.profile) {
      if (typeof data.profile.nickname === "string" && data.profile.nickname.trim()) {
        userUpdate.nickname = data.profile.nickname.trim();
      }
      if (typeof data.profile.bio === "string") userUpdate.bio = data.profile.bio;
      cs.specialty = data.profile.specialty ?? cs.specialty ?? "";
      cs.website = data.profile.website ?? cs.website ?? "";
    }
    if (data.privacy) cs.privacy = { ...(cs.privacy ?? {}), ...data.privacy };
    userUpdate.creatorSettings = cs;
    if (data.notify) userUpdate.notifySettings = { ...notify, ...data.notify };

    await this.prisma.user.update({ where: { id: userId }, data: userUpdate });
    return { success: true, message: "设置已保存" };
  }

  // ───────── 管理后台：创作者管理 ─────────

  /** 手机号脱敏（铁律#7：返回值掩码） */
  private maskPhone(phone?: string | null): string {
    if (!phone) return "";
    if (phone.length >= 7) return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
    return phone.replace(/.(?=.{2})/g, "*");
  }

  /** 收款账号脱敏（保留首尾，中段掩码） */
  private maskAccount(account?: string | null): string {
    if (!account) return "";
    const a = account.trim();
    if (a.length <= 4) return a.replace(/.(?=.)/g, "*");
    return `${a.slice(0, 2)}****${a.slice(-2)}`;
  }

  /**
   * 创作者列表（管理员）— 创作者 = 至少发布过 1 个视频的用户。
   * 聚合每位创作者的视频/互动/收益概览。创作者总数有限（视频上传者去重），内存分页可接受。
   */
  async adminListCreators(page = 1, pageSize = 20, keyword?: string) {
    const groups = await this.prisma.video.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _sum: { viewCount: true, likeCount: true, commentCount: true, shareCount: true },
    });
    // 按总播放量降序
    groups.sort((a, b) => (b._sum.viewCount ?? 0) - (a._sum.viewCount ?? 0));

    const userIds = groups.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        phone: true,
        createdAt: true,
        _count: { select: { followers: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let merged = groups
      .map((g) => ({ group: g, user: userMap.get(g.userId) }))
      .filter((x): x is { group: (typeof groups)[number]; user: (typeof users)[number] } => !!x.user);

    if (keyword?.trim()) {
      const kw = keyword.trim().toLowerCase();
      merged = merged.filter(
        (x) => (x.user.nickname ?? "").toLowerCase().includes(kw) || (x.user.phone ?? "").includes(kw),
      );
    }

    const total = merged.length;
    const pageItems = merged.slice((page - 1) * pageSize, page * pageSize);
    const pageUserIds = pageItems.map((x) => x.user.id);

    const [publishedGroups, accounts] = await Promise.all([
      this.prisma.video.groupBy({
        by: ["userId"],
        where: { userId: { in: pageUserIds }, status: "PUBLISHED" },
        _count: { _all: true },
      }),
      this.prisma.virtualCoinAccount.findMany({ where: { userId: { in: pageUserIds } } }),
    ]);
    const pubMap = new Map(publishedGroups.map((g) => [g.userId, g._count._all]));
    const acctMap = new Map(accounts.map((a) => [a.userId, a]));

    const items = pageItems.map(({ group, user }) => {
      const acct = acctMap.get(user.id);
      return {
        userId: user.id,
        nickname: user.nickname ?? "",
        avatar: user.avatar ?? "",
        phone: this.maskPhone(user.phone),
        followers: user._count.followers,
        videoCount: group._count._all,
        publishedCount: pubMap.get(user.id) ?? 0,
        totalViews: group._sum.viewCount ?? 0,
        totalLikes: group._sum.likeCount ?? 0,
        totalComments: group._sum.commentCount ?? 0,
        totalShares: group._sum.shareCount ?? 0,
        balance: acct?.balance ?? 0,
        frozen: acct?.frozen ?? 0,
        totalEarnings: acct?.totalRecharged ?? 0,
        withdrawn: acct?.totalSpent ?? 0,
        joinedAt: user.createdAt.toISOString().slice(0, 10),
      };
    });

    return { items, total, page, pageSize };
  }

  /** 创作者详情（管理员）— 资料 + 数据概览 + 作品列表 */
  async adminGetCreator(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        bio: true,
        phone: true,
        createdAt: true,
        _count: { select: { followers: true } },
      },
    });
    if (!user) {
      return { notFound: true };
    }

    const [videos, acct] = await Promise.all([
      this.prisma.video.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          coverUrl: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.virtualCoinAccount.findUnique({ where: { userId: id } }),
    ]);

    const overview = {
      videoCount: videos.length,
      publishedCount: videos.filter((v) => v.status === "PUBLISHED").length,
      totalViews: videos.reduce((s, v) => s + v.viewCount, 0),
      totalLikes: videos.reduce((s, v) => s + v.likeCount, 0),
      totalComments: videos.reduce((s, v) => s + v.commentCount, 0),
      totalShares: videos.reduce((s, v) => s + v.shareCount, 0),
      followers: user._count.followers,
      balance: acct?.balance ?? 0,
      frozen: acct?.frozen ?? 0,
      totalEarnings: acct?.totalRecharged ?? 0,
      withdrawn: acct?.totalSpent ?? 0,
    };

    return {
      profile: {
        userId: user.id,
        nickname: user.nickname ?? "",
        avatar: user.avatar ?? "",
        bio: user.bio ?? "",
        phone: this.maskPhone(user.phone),
        joinedAt: user.createdAt.toISOString().slice(0, 10),
      },
      overview,
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title ?? "未命名视频",
        cover: v.coverUrl ?? "",
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
        shares: v.shareCount,
        status: v.status,
        publishTime: v.createdAt.toISOString().slice(0, 10),
      })),
    };
  }

  /**
   * 创作者提现申请列表（管理员）。
   * 数据真源：VideoCreatorWithdrawal 申请表，支持「待审→通过/拒绝/打款」全状态流转。
   * 关键字按昵称/手机号过滤：因 VideoCreatorWithdrawal 与 User 无 Prisma 关系（与 VirtualCoinFrozen 同风格的轻量表），
   * 关键字命中先查用户取 id 再过滤申请，最后批量回填用户资料。
   */
  async adminListWithdrawals(rawPage = 1, rawPageSize = 20, keyword?: string, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: any = {};
    if (status?.trim()) where.status = status.trim();

    if (keyword?.trim()) {
      const kw = keyword.trim();
      const matchedUsers = await this.prisma.user.findMany({
        where: {
          OR: [{ nickname: { contains: kw, mode: "insensitive" } }, { phone: { contains: kw } }],
        },
        select: { id: true },
      });
      where.userId = { in: matchedUsers.map((u) => u.id) };
    }

    const [rows, total] = await Promise.all([
      this.prisma.videoCreatorWithdrawal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.videoCreatorWithdrawal.count({ where }),
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, nickname: true, phone: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = rows.map((w) => {
      const u = userMap.get(w.userId);
      return {
        id: w.id,
        userId: w.userId,
        nickname: u?.nickname ?? "",
        avatar: u?.avatar ?? "",
        phone: this.maskPhone(u?.phone),
        amount: w.amountCoin,
        method: w.method,
        // 切读：先解密密文列(回退明文兼容存量)再脱敏
        account: this.maskAccount(resolveAccount(w.accountEnc, w.account)),
        status: w.status,
        reviewNote: w.reviewNote ?? "",
        createdAt: w.createdAt.toISOString().slice(0, 16).replace("T", " "),
        processedAt: w.processedAt ? w.processedAt.toISOString().slice(0, 16).replace("T", " ") : "",
      };
    });

    return { items, total, page, pageSize };
  }

  /**
   * 【四眼·打款专用】取完整收款账户——线下人工打款的唯一明文通道（照 commission.revealPayoutAccount 范式）。
   * 安全约束（每条都是刻意的）：
   * - 仅 APPROVED 可取：未审核/已驳回/已打款的记录不暴露收款账号，最小化明文暴露面；
   * - 防自取：受益人不得为自己取号；
   * - 先留痕后给明文：每次取号写 AuditLog（谁、何时、取了哪条、金额）；审计写失败即拒绝返回，
   *   不允许出现"有人看了账号但查不到是谁"。
   */
  async revealPayoutAccount(id: string, operatorId: string, ip?: string) {
    const w = await this.prisma.videoCreatorWithdrawal.findUnique({ where: { id } });
    if (!w) throw new BusinessException(ErrorCode.NOT_FOUND, "提现申请不存在");
    if (w.userId === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能查看自己提现申请的收款账户");
    }
    if (w.status !== "APPROVED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已审核通过（APPROVED）的申请可查看收款账户");
    }

    // 先留痕再返回：审计失败异常上抛 → 不给明文
    await this.audit.log({
      userId: operatorId,
      action: "REVEAL_PAYOUT_ACCOUNT",
      targetType: "VIDEO_CREATOR_WITHDRAWAL",
      targetId: id,
      detail: `查看创作者提现收款账户（打款用）: withdrawal=${id}, 受益人=${w.userId}, 金额=${w.amountCoin}币, 方式=${w.method}`,
      ip,
    });

    return {
      id: w.id,
      userId: w.userId,
      amountCoin: w.amountCoin,
      method: w.method,
      // 切读：解密密文列(回退明文兼容存量)返回完整明文·仅此端点（列表一律 maskAccount）
      account: resolveAccount(w.accountEnc, w.account),
    };
  }

  /**
   * 审批创作者提现申请（管理员）。
   * action：approve 通过（PENDING→APPROVED，币仍冻结）；pay 打款（仅 APPROVED→PAID，真实扣减冻结币 + SPEND 流水）；
   *         reject 拒绝（PENDING/APPROVED→REJECTED，解冻退回可用余额）。
   * 资金一致性：状态变更、冻结币扣减/释放、流水写入全部同事务；并发用条件 updateMany 防重，防止同一申请被双重打款/双重退款。
   *
   * 🔴 2026-07-17 四眼加固（照 commission 提现范式）：
   * - 防自审自批：受益人不得审批/打款自己的申请（任何动作）；
   * - 禁 PENDING 直付：pay 必须先 APPROVED（此前 PENDING 可一步 PAID = 单人即可出款）；
   * - 审批人≠打款人：pay 时校验 reviewedBy ≠ 当前操作人；
   * - payoutRef 必填 + 判重：模型无唯一约束（不加迁移），以 reviewNote 内嵌 [payoutRef:xxx] 标记查重，
   *   同一流水号第二次打款直接拒绝；pay 不覆盖 reviewedBy（保留审批人身份），打款人记入 reviewNote [paidBy:xxx]。
   */
  async reviewWithdrawal(
    id: string,
    reviewerId: string,
    data: { action: "approve" | "reject" | "pay"; note?: string; payoutRef?: string },
  ) {
    const { action, note } = data;
    if (!["approve", "reject", "pay"].includes(action)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的审批动作");
    }

    return this.prisma.$transaction(async (tx) => {
      const w = await tx.videoCreatorWithdrawal.findUnique({ where: { id } });
      if (!w) throw new BusinessException(ErrorCode.NOT_FOUND, "提现申请不存在");

      // 防自审自批：受益人不得处理自己的提现申请
      if (w.userId === reviewerId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己的提现申请");
      }

      // ── 通过：仅状态流转，币继续冻结 ──
      if (action === "approve") {
        if (w.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅待审核申请可通过");
        const r = await tx.videoCreatorWithdrawal.updateMany({
          where: { id, status: "PENDING" }, // 防重：状态未变才更新
          data: { status: "APPROVED", reviewedBy: reviewerId, reviewNote: note, processedAt: new Date() },
        });
        if (r.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "申请状态已变更，请刷新");
        return { success: true, status: "APPROVED" };
      }

      // ── 拒绝：解冻，退回可用余额 ──
      if (action === "reject") {
        if (w.status !== "PENDING" && w.status !== "APPROVED") {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "仅待审核/已通过申请可拒绝");
        }
        const r = await tx.videoCreatorWithdrawal.updateMany({
          where: { id, status: w.status },
          data: { status: "REJECTED", reviewedBy: reviewerId, reviewNote: note, processedAt: new Date() },
        });
        if (r.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "申请状态已变更，请刷新");

        // 冻结回退：frozen→balance
        await tx.virtualCoinAccount.update({
          where: { userId: w.userId },
          data: { frozen: { decrement: w.amountCoin }, balance: { increment: w.amountCoin } },
        });
        await tx.virtualCoinFrozen.updateMany({
          where: { refId: id, status: "FROZEN" },
          data: { status: "UNFROZEN", resolvedAt: new Date() },
        });
        return { success: true, status: "REJECTED" };
      }

      // ── 打款：仅 APPROVED 可付 + 四眼 + payoutRef 幂等，真实扣减冻结币 + SPEND 流水 ──
      if (w.status !== "APPROVED") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已审核通过（APPROVED）的申请可打款，请先完成审批");
      }
      if (w.reviewedBy && w.reviewedBy === reviewerId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "审批人与打款人不能是同一人（四眼原则）");
      }
      const ref = (data.payoutRef || "").trim();
      if (!ref) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "必须提供打款流水号 payoutRef（银行/支付宝转账凭证号）");
      }
      // 判重：模型无 payoutRef 列（不加迁移），以 reviewNote 内嵌标记查重
      const refMark = `[payoutRef:${ref}]`;
      const dup = await tx.videoCreatorWithdrawal.findFirst({
        where: { status: "PAID", reviewNote: { contains: refMark } },
        select: { id: true },
      });
      if (dup) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, `流水号 ${ref} 已用于申请 ${dup.id}，疑似重复打款`);
      }

      const mergedNote = [w.reviewNote, note].filter((v) => v && v.trim()).join(" | ");
      const r = await tx.videoCreatorWithdrawal.updateMany({
        where: { id, status: "APPROVED" },
        // 不覆盖 reviewedBy：保留审批人身份（四眼可追溯）；打款人以 [paidBy:] 记入备注
        data: {
          status: "PAID",
          reviewNote: `${mergedNote ? `${mergedNote} ` : ""}${refMark}[paidBy:${reviewerId}]`,
          processedAt: new Date(),
        },
      });
      if (r.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "申请状态已变更，请刷新");

      // 冻结币真实扣除：frozen 减少 + 累计消费增加（balance 已在申请时扣除，此处不动）
      const acct = await tx.virtualCoinAccount.update({
        where: { userId: w.userId },
        data: { frozen: { decrement: w.amountCoin }, totalSpent: { increment: w.amountCoin } },
      });
      await tx.virtualCoinFrozen.updateMany({
        where: { refId: id, status: "FROZEN" },
        data: { status: "TRANSFERRED", resolvedAt: new Date() },
      });
      await tx.virtualCoinTransaction.create({
        data: {
          userId: w.userId,
          type: "SPEND",
          amountCoin: -w.amountCoin,
          balanceAfter: acct.balance, // 余额在申请冻结时已扣减，此处为打款后可用余额
          scene: "REFUND",
          refId: id,
          // PII：流水描述不落完整账号，脱敏（解密密文列→脱敏）。金额/scene/refId 逻辑不变
          description: `提现至${w.method} ${this.maskAccount(resolveAccount(w.accountEnc, w.account))}`,
        },
      });
      return { success: true, status: "PAID" };
    });
  }
}
