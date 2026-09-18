import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";
import { maskPhone, maskEmail, maskIdCard } from "../../common/crypto.util";
import {
  FeedbackListQueryDto,
  UpdateFeedbackStatusDto,
  NON_TICKET_TYPES,
} from "./feedback-admin.dto";

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async getFeedbackTypes() {
    const types = [
      { id: "bug", label: "问题反馈", icon: "bug", color: "#ff4d4f", bgColor: "rgba(255,77,79,0.1)" },
      { id: "suggestion", label: "功能建议", icon: "lightbulb", color: "#f59e0b", bgColor: "rgba(245,158,11,0.1)" },
      { id: "complaint", label: "投诉举报", icon: "alert-triangle", color: "#f97316", bgColor: "rgba(249,115,22,0.1)" },
      { id: "other", label: "其他问题", icon: "help-circle", color: "#3b82f6", bgColor: "rgba(59,130,246,0.1)" },
    ];
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: "待处理", color: "#d48806", bg: "rgba(245,158,11,0.1)" },
      processing: { label: "处理中", color: "#2563eb", bg: "rgba(59,130,246,0.1)" },
      resolved: { label: "已解决", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
    };
    return { types, statusConfig };
  }

  async getHistoryFeedbacks(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, content: true, images: true, status: true, createdAt: true },
    });
  }

  async submitFeedback(userId: string, data: { type: string; content: string; contact?: string; images?: string[] }) {
    const fb = await this.prisma.feedback.create({
      data: {
        userId,
        type: data.type,
        content: data.content,
        contact: data.contact,
        images: data.images ?? [],
      },
      select: { id: true, status: true, createdAt: true },
    });
    return { success: true, id: fb.id, status: fb.status };
  }

  // ══════════════════ 管理端（任务包 A · 反馈处理闭环） ══════════════════
  //
  // 设计约束（见 docs/operations/用户反馈与关键路径指标专项-20260918/轻量反馈方案.md §一）：
  //  1. 不改 `Feedback` 表结构；
  //  2. 列表/详情**默认脱敏**，明文与截图走独立接口、独立限流、独立审计；
  //  3. 列表接口**任何情况下不返回未脱敏字段**，即使调用方有查看原文权限
  //     —— 明文只能一条一条取，天然限制批量；
  //  4. `feed_dislike` 是推荐负反馈信号，默认不进工单池。
  //
  // ⚠️ 正则脱敏只降低偶然暴露概率，**不构成保证**。中文写出的号码、全角变体、
  //    截图内容、无模式的敏感陈述都漏得掉。因此访问控制不因"已脱敏"而放宽。

  /** 正文脱敏：手机号 / 邮箱 / 长数字串 / 身份证形。漏网是预期状态，不是缺陷。 */
  private maskContent(text: string | null): string {
    if (!text) return "";
    return text
      .replace(/(?<![0-9])1[3-9]\d{9}(?![0-9])/g, (m) => maskPhone(m))
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, (m) => maskEmail(m))
      .replace(/(?<![0-9])\d{15}(\d{2}[0-9Xx])?(?![0-9])/g, (m) => maskIdCard(m))
      .replace(/(?<![0-9])\d{15,}(?![0-9])/g, (m) => `${m.slice(0, 4)}****${m.slice(-4)}`);
  }

  /** 联系方式脱敏：按形态选 maskPhone / maskEmail，识别不出则只留首尾 */
  private maskContact(contact: string | null): string {
    if (!contact) return "";
    if (contact.includes("@")) return maskEmail(contact);
    if (/^\d{7,}$/.test(contact)) return maskPhone(contact);
    return contact.length <= 2 ? "**" : `${contact[0]}***${contact.slice(-1)}`;
  }

  /** 列表行（脱敏视图）。不含 contact 明文、不含 images 链接。 */
  private toMaskedRow(f: {
    id: string; userId: string; type: string; content: string; contact: string | null;
    images: string[]; status: string; result: string | null; createdAt: Date; updatedAt: Date;
    user?: { nickname: string } | null;
  }) {
    return {
      id: f.id,
      type: f.type,
      status: f.status,
      // 只给昵称与用户 id 后 6 位：跳用户详情走既有用户管理权限，不在本页放开
      userRef: f.userId.slice(-6),
      nickname: f.user?.nickname ?? "",
      contentMasked: this.maskContent(f.content).slice(0, 500),
      contactMasked: this.maskContact(f.contact),
      hasContact: Boolean(f.contact),
      imageCount: f.images?.length ?? 0,
      result: f.result ?? "",
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      // 场景 C 的诊断编号写在正文头部固定格式，这里提取出来单列
      diagnosis: this.extractDiagnosis(f.content),
    };
  }

  /**
   * 从正文头部提取诊断编号（《轻量反馈方案》场景 C 的 C-1 方案：
   * `【诊断编号】<client_diag_id>|<trace_source>`）。
   * 三分类如实标注，不把「缺失」和「全零」混为一谈 —— 全零说明服务端 OTel 没起来，
   * 是另一个问题，不是用户没带编号。
   */
  private extractDiagnosis(content: string | null): {
    id: string | null; source: string | null; state: "valid" | "all_zero" | "missing";
  } {
    const m = /【诊断编号】\s*([0-9a-fA-F]{8,64})(?:\|([a-z_]+))?/.exec(content ?? "");
    if (!m) return { id: null, source: null, state: "missing" };
    const id = m[1];
    return {
      id,
      source: m[2] ?? null,
      state: /^0+$/.test(id) ? "all_zero" : "valid",
    };
  }

  private dayRange(startDate?: string, endDate?: string) {
    const range: { gte?: Date; lt?: Date } = {};
    if (startDate) range.gte = new Date(`${startDate}T00:00:00+08:00`);
    if (endDate) range.lt = new Date(new Date(`${endDate}T00:00:00+08:00`).getTime() + 86_400_000);
    return Object.keys(range).length ? range : undefined;
  }

  /** 管理端列表（脱敏）。默认排除 feed_dislike；signalsOnly=1 时只看这些信号。 */
  async adminList(query: FeedbackListQueryDto) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize);
    const signalsOnly = query.signalsOnly === "1" || query.signalsOnly === "true";

    const where: Prisma.FeedbackWhereInput = {};
    if (query.type) where.type = query.type;
    else if (signalsOnly) where.type = { in: [...NON_TICKET_TYPES] };
    else where.type = { notIn: [...NON_TICKET_TYPES] };
    if (query.status) where.status = query.status;
    const createdAt = this.dayRange(query.startDate, query.endDate);
    if (createdAt) where.createdAt = createdAt;
    // 关键词只匹配正文与 id：不匹配 contact，避免用关键词反查联系方式
    if (query.keyword) {
      where.OR = [
        { content: { contains: query.keyword, mode: "insensitive" } },
        { id: { contains: query.keyword } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
        select: {
          id: true, userId: true, type: true, content: true, contact: true, images: true,
          status: true, result: true, createdAt: true, updatedAt: true,
          user: { select: { nickname: true } },
        },
      }),
    ]);
    return { total, page, pageSize, items: rows.map((r) => this.toMaskedRow(r)) };
  }

  /** 管理端详情（脱敏）。明文与截图另走独立接口。 */
  async adminDetail(id: string) {
    const f = await this.prisma.feedback.findUnique({
      where: { id },
      select: {
        id: true, userId: true, type: true, content: true, contact: true, images: true,
        status: true, result: true, createdAt: true, updatedAt: true,
        user: { select: { nickname: true } },
      },
    });
    if (!f) throw new BusinessException(ErrorCode.NOT_FOUND, "反馈不存在");
    return this.toMaskedRow(f);
  }

  /** 查看联系方式明文（独立接口 + 审计 + 独立限流） */
  async adminRevealContact(id: string) {
    const f = await this.prisma.feedback.findUnique({ where: { id }, select: { contact: true } });
    if (!f) throw new BusinessException(ErrorCode.NOT_FOUND, "反馈不存在");
    return { contact: f.contact ?? "" };
  }

  /** 查看正文原文（独立接口 + 审计 + 独立限流） */
  async adminRevealContent(id: string) {
    const f = await this.prisma.feedback.findUnique({ where: { id }, select: { content: true } });
    if (!f) throw new BusinessException(ErrorCode.NOT_FOUND, "反馈不存在");
    return { content: f.content };
  }

  /** 查看截图（独立接口 + 审计 + 独立限流）。截图内容不可控，等同敏感。 */
  async adminRevealImages(id: string) {
    const f = await this.prisma.feedback.findUnique({ where: { id }, select: { images: true } });
    if (!f) throw new BusinessException(ErrorCode.NOT_FOUND, "反馈不存在");
    return { images: f.images ?? [] };
  }

  /**
   * 状态流转。
   *
   * 约束：
   *  - 置 `resolved` 必须填 `result`；回退到 `pending` 也必须填原因（写进 result）；
   *  - 用 `updateMany + where status=<期望的当前状态>` 做条件更新并校验影响行数，
   *    并发下只有一个人能改成功，后到的会收到「状态已变更」而不是静默覆盖；
   *  - **处理人不写进 Feedback 表**（表里没有这个字段，本任务包不改 schema）。
   *    「谁在什么时候把它改成了什么」由 `@Auditable` 写进 AuditLog，
   *    可在 `views/system/OperationLogList.vue` 按 targetType=FEEDBACK 查到。
   */
  async adminUpdateStatus(id: string, dto: UpdateFeedbackStatusDto) {
    const current = await this.prisma.feedback.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) throw new BusinessException(ErrorCode.NOT_FOUND, "反馈不存在");
    if (current.status === dto.status) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `已经是「${dto.status}」状态`);
    }
    if (dto.status === "resolved" && !dto.result?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结案必须填写处理结果");
    }
    if (dto.status === "pending" && current.status !== "pending" && !dto.result?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "回退到待处理必须填写原因");
    }

    const changed = await this.prisma.feedback.updateMany({
      where: { id, status: current.status },
      data: {
        status: dto.status,
        ...(dto.result?.trim() ? { result: dto.result.trim().slice(0, 1000) } : {}),
      },
    });
    if (changed.count !== 1) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "状态已被他人变更，请刷新后重试");
    }
    return { id, status: dto.status };
  }

  /** 管理端统计：待处理量与诊断编号有效率（后者用于回头验证 traceId 方案是否成立） */
  async adminStats() {
    const [byStatus, byType] = await Promise.all([
      this.prisma.feedback.groupBy({
        by: ["status"],
        where: { type: { notIn: [...NON_TICKET_TYPES] } },
        _count: { _all: true },
      }),
      this.prisma.feedback.groupBy({
        by: ["type"],
        _count: { _all: true },
      }),
    ]);
    // 诊断编号三分类：只扫最近 500 条 bug 类，避免全表扫
    const recent = await this.prisma.feedback.findMany({
      where: { type: "bug" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { content: true },
    });
    const diag = { valid: 0, all_zero: 0, missing: 0 };
    for (const r of recent) diag[this.extractDiagnosis(r.content).state] += 1;

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byType: byType.map((r) => ({ type: r.type, count: r._count._all })),
      diagnosis: { ...diag, sampled: recent.length },
    };
  }
}
