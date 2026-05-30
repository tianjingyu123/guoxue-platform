import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CsvColumn, generateCsv } from "../../common/csv.util";

const MAX_EXPORT_ROWS = 10000;

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportUsers(filters: { status?: string; keyword?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.keyword) {
      where.OR = [
        { nickname: { contains: filters.keyword, mode: "insensitive" } },
        { phone: { contains: filters.keyword } },
        { email: { contains: filters.keyword, mode: "insensitive" } },
      ];
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const users = await this.prisma.user.findMany({
      where,
      take: MAX_EXPORT_ROWS,
      orderBy: { createdAt: "desc" },
      include: { roles: true },
    });

    const columns: CsvColumn[] = [
      { header: "ID", accessor: (r: any) => r.id },
      { header: "昵称", accessor: (r: any) => r.nickname },
      { header: "手机号", accessor: (r: any) => r.phone || "" },
      { header: "邮箱", accessor: (r: any) => r.email || "" },
      { header: "会员等级", accessor: (r: any) => r.memberLevel },
      { header: "状态", accessor: (r: any) => r.status },
      { header: "角色", accessor: (r: any) => r.roles?.map((ro: any) => ro.roleType).join(";") || "" },
      { header: "实名认证", accessor: (r: any) => (r.identityVerified ? "是" : "否") },
      { header: "注册时间", accessor: (r: any) => r.createdAt?.toISOString() || "" },
    ];

    return generateCsv(users, columns);
  }

  async exportOrders(filters: { status?: string; type?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.OrderWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.type) where.type = filters.type as any;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const orders = await this.prisma.order.findMany({
      where,
      take: MAX_EXPORT_ROWS,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nickname: true, phone: true } } },
    });

    const columns: CsvColumn[] = [
      { header: "订单ID", accessor: (r: any) => r.id },
      { header: "用户", accessor: (r: any) => r.user?.nickname || "" },
      { header: "手机号", accessor: (r: any) => r.user?.phone || "" },
      { header: "类型", accessor: (r: any) => r.type },
      { header: "金额", accessor: (r: any) => r.amount?.toString() || "0" },
      { header: "实付", accessor: (r: any) => r.payAmount?.toString() || "" },
      { header: "状态", accessor: (r: any) => r.status },
      { header: "支付方式", accessor: (r: any) => r.payMethod || "" },
      { header: "支付时间", accessor: (r: any) => r.paidAt?.toISOString() || "" },
      { header: "创建时间", accessor: (r: any) => r.createdAt?.toISOString() || "" },
    ];

    return generateCsv(orders, columns);
  }

  async exportCourses(filters: { auditStatus?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.CourseWhereInput = {};
    if (filters.auditStatus) where.auditStatus = filters.auditStatus;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const courses = await this.prisma.course.findMany({
      where,
      take: MAX_EXPORT_ROWS,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nickname: true } } },
    });

    const columns: CsvColumn[] = [
      { header: "ID", accessor: (r: any) => r.id },
      { header: "标题", accessor: (r: any) => r.title },
      { header: "创建者", accessor: (r: any) => r.user?.nickname || "" },
      { header: "类型", accessor: (r: any) => r.type },
      { header: "价格", accessor: (r: any) => r.price?.toString() || "0" },
      { header: "学员数", accessor: (r: any) => r.studentCount },
      { header: "审核状态", accessor: (r: any) => r.auditStatus },
      { header: "一级分类", accessor: (r: any) => r.categoryLevel1 || "" },
      { header: "二级分类", accessor: (r: any) => r.categoryLevel2 || "" },
      { header: "创建时间", accessor: (r: any) => r.createdAt?.toISOString() || "" },
    ];

    return generateCsv(courses, columns);
  }

  async exportArticles(filters: { auditStatus?: string; circleId?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.ArticleWhereInput = {};
    if (filters.auditStatus) where.auditStatus = filters.auditStatus;
    if (filters.circleId) where.circleId = filters.circleId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const articles = await this.prisma.article.findMany({
      where,
      take: MAX_EXPORT_ROWS,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nickname: true } } },
    });

    const columns: CsvColumn[] = [
      { header: "ID", accessor: (r: any) => r.id },
      { header: "标题", accessor: (r: any) => r.title },
      { header: "作者", accessor: (r: any) => r.user?.nickname || "" },
      { header: "浏览量", accessor: (r: any) => r.viewCount },
      { header: "点赞数", accessor: (r: any) => r.likeCount },
      { header: "评论数", accessor: (r: any) => r.commentCount },
      { header: "审核状态", accessor: (r: any) => r.auditStatus },
      { header: "推首页", accessor: (r: any) => (r.isPushHome ? "是" : "否") },
      { header: "一级分类", accessor: (r: any) => r.categoryLevel1 || "" },
      { header: "创建时间", accessor: (r: any) => r.createdAt?.toISOString() || "" },
    ];

    return generateCsv(articles, columns);
  }

  async exportWithdrawals(filters: { status?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.WithdrawalWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const withdrawals = await this.prisma.withdrawal.findMany({
      where,
      take: MAX_EXPORT_ROWS,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nickname: true, phone: true } } },
    });

    const columns: CsvColumn[] = [
      { header: "ID", accessor: (r: any) => r.id },
      { header: "用户", accessor: (r: any) => r.user?.nickname || "" },
      { header: "手机号", accessor: (r: any) => r.user?.phone || "" },
      { header: "金额", accessor: (r: any) => r.amount?.toString() || "0" },
      { header: "银行", accessor: (r: any) => r.bankName || "" },
      { header: "卡号", accessor: (r: any) => r.bankAccount || "" },
      { header: "开户人", accessor: (r: any) => r.bankHolder || "" },
      { header: "状态", accessor: (r: any) => r.status },
      { header: "备注", accessor: (r: any) => r.remark || "" },
      { header: "申请时间", accessor: (r: any) => r.createdAt?.toISOString() || "" },
      { header: "处理时间", accessor: (r: any) => r.processedAt?.toISOString() || "" },
    ];

    return generateCsv(withdrawals, columns);
  }
}
