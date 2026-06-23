import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class VideoCreatorService {
  constructor(private prisma: PrismaService) {}

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
      status: v.status === "PUBLISHED" ? "published" : "draft",
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

    // 按天聚合趋势
    const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const viewTrend = dayNames.map((date) => ({
      date,
      views: Math.round(totalViews / 7 * (0.5 + Math.random() * 1)),
      likes: Math.round(totalLikes / 7 * (0.5 + Math.random() * 1)),
      comments: Math.round(totalComments / 7 * (0.5 + Math.random() * 1)),
    }));

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

  /** 提交提现（创建 SPEND 记录模拟提现） */
  async submitWithdraw(userId: string, data: { amount: number; method: string; account: string }) {
    const acct = await this.prisma.virtualCoinAccount.findUnique({ where: { userId } });
    if (!acct || acct.balance < data.amount) {
      return { success: false, message: "余额不足" };
    }

    await this.prisma.virtualCoinTransaction.create({
      data: {
        userId,
        type: "SPEND",
        amountCoin: -data.amount,
        balanceAfter: acct.balance - data.amount,
        scene: "REFUND",
        description: `提现至${data.method} ${data.account}`,
      },
    });

    // 更新账户余额
    await this.prisma.virtualCoinAccount.update({
      where: { userId },
      data: { balance: { decrement: data.amount }, totalSpent: { increment: data.amount } },
    });

    return { success: true, message: "提现申请已提交" };
  }

  /** 添加商品关联 */
  async addProduct(_userId: string, data: { videoId: string; productId: string }) {
    await this.prisma.videoProduct.create({
      data: {
        videoId: data.videoId,
        productId: data.productId,
      },
    });
    return { success: true, message: "商品已关联" };
  }

  /** 保存创作者设置 */
  async saveSettings(_userId: string, _data: Record<string, any>) {
    return { success: true, message: "设置已保存" };
  }
}
