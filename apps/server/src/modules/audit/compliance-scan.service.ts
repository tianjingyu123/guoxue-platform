import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { SensitiveWordService } from "./sensitive-word.service";
import { safePagination } from "../../common/pagination";

/** 单个待建扫描记录 */
interface ScanHit {
  targetType: string;
  targetId: string;
  field: string;
  word: string;
  level: "A" | "B";
  suggestion: string | null;
  snippet: string | null;
}

/** 扫描报告 */
export interface ComplianceScanReport {
  scanAt: string;
  durationMs: number;
  /** 各内容域扫描的行数 */
  scanned: Record<string, number>;
  /** 命中总数（含历史已产出的重复命中） */
  totalHits: number;
  /** 本次新增记录数（幂等：同目标同字段同词不重复产出） */
  created: number;
  createdByLevel: { A: number; B: number };
  hitsByLevel: { A: number; B: number };
}

/**
 * 合规违禁词扫描器（合-P1·F2 全站话术定性自查）
 *
 * ## 扫描范围（DB 内容域）
 * - Product：title / intro / detail（商品营销物料·从严）
 * - Course：title / intro
 * - Post（圈子帖）：title / content
 * - CouponTemplate：name
 * - MarketingPage：name / description；MarketingPageComponent：title / config（文案组件配置）
 *
 * ## 白名单豁免（词库文档§使用规则1：古籍原文/学术讨论引用不拦）
 * - ClassicChapter（古籍正文 46 万章）/ Poetry（诗词正文）**不入扫描范围**——
 *   "驱邪""超度""占卜"等词在古籍原文中是正常引用，属引用豁免域
 *
 * ## 分级处置（报告制·非自动下架）
 * - A 级 → 产出 OPEN 记录，建议下架/整改，admin 复核队列人工处置
 * - B 级 → 产出 OPEN 记录附替换建议（suggestion），人工确认后替换
 *
 * ## 幂等
 * - ComplianceScanRecord 四元组唯一约束（targetType+targetId+field+word），
 *   createMany skipDuplicates：同目标同词不重复产出（RESOLVED/IGNORED 的历史记录也不复活）
 */
@Injectable()
export class ComplianceScanService {
  private readonly logger = new Logger(ComplianceScanService.name);
  private readonly BATCH = 500;
  private readonly SNIPPET_RADIUS = 30;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private sensitiveWord: SensitiveWordService,
  ) {}

  /** 每月 1 日 03:30 定扫（多实例互斥） */
  @Cron("30 3 1 * *")
  async monthlyScan() {
    await this.redis.runExclusive("compliance-scan", 3600, async () => {
      try {
        const report = await this.scanAll();
        this.logger.log(`月度合规扫描完成: 新增 ${report.created} 条（A=${report.createdByLevel.A} B=${report.createdByLevel.B}）`);
      } catch (e) {
        this.logger.error(`月度合规扫描失败: ${(e as Error).message}`);
      }
    });
  }

  /** 全站扫描（手动触发端点与月扫共用） */
  async scanAll(): Promise<ComplianceScanReport> {
    const start = Date.now();
    const words = this.sensitiveWord.getComplianceWords();
    if (!words.length) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "合规词库为空，请先执行词库种子 SQL");
    }

    const scanned: Record<string, number> = {};
    const hits: ScanHit[] = [];

    // ── Product（title/intro/detail·未删除）──
    scanned.PRODUCT = await this.scanBatched(
      (cursor) =>
        this.prisma.product.findMany({
          where: { deletedAt: null },
          select: { id: true, title: true, intro: true, detail: true },
          orderBy: { id: "asc" },
          take: this.BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (row) => this.collect(hits, words, "PRODUCT", row.id, { title: row.title, intro: row.intro, detail: row.detail }),
    );

    // ── Course（title/intro·未删除）──
    scanned.COURSE = await this.scanBatched(
      (cursor) =>
        this.prisma.course.findMany({
          where: { deletedAt: null },
          select: { id: true, title: true, intro: true },
          orderBy: { id: "asc" },
          take: this.BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (row) => this.collect(hits, words, "COURSE", row.id, { title: row.title, intro: row.intro }),
    );

    // ── Post 圈子帖（title/content）──
    scanned.POST = await this.scanBatched(
      (cursor) =>
        this.prisma.post.findMany({
          select: { id: true, title: true, content: true },
          orderBy: { id: "asc" },
          take: this.BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (row) => this.collect(hits, words, "POST", row.id, { title: row.title, content: row.content }),
    );

    // ── CouponTemplate（name）──
    scanned.COUPON_TEMPLATE = await this.scanBatched(
      (cursor) =>
        this.prisma.couponTemplate.findMany({
          select: { id: true, name: true },
          orderBy: { id: "asc" },
          take: this.BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (row) => this.collect(hits, words, "COUPON_TEMPLATE", row.id, { name: row.name }),
    );

    // ── MarketingPage（name/description）──
    scanned.MARKETING_PAGE = await this.scanBatched(
      (cursor) =>
        this.prisma.marketingPage.findMany({
          select: { id: true, name: true, description: true },
          orderBy: { id: "asc" },
          take: this.BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (row) => this.collect(hits, words, "MARKETING_PAGE", row.id, { name: row.name, description: row.description }),
    );

    // ── MarketingPageComponent（title/config 文案配置）──
    scanned.MARKETING_PAGE_COMPONENT = await this.scanBatched(
      (cursor) =>
        this.prisma.marketingPageComponent.findMany({
          select: { id: true, title: true, config: true },
          orderBy: { id: "asc" },
          take: this.BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      (row) =>
        this.collect(hits, words, "MARKETING_PAGE_COMPONENT", row.id, {
          title: row.title,
          config: row.config ? JSON.stringify(row.config) : null,
        }),
    );

    // 注意：ClassicChapter / Poetry 为引用豁免域，故意不在扫描范围（见类注释）

    // ── 幂等落库（按级分批 createMany skipDuplicates·统计真实新增数）──
    const aHits = hits.filter((h) => h.level === "A");
    const bHits = hits.filter((h) => h.level === "B");
    const createdA = await this.persist(aHits);
    const createdB = await this.persist(bHits);

    const report: ComplianceScanReport = {
      scanAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      scanned,
      totalHits: hits.length,
      created: createdA + createdB,
      createdByLevel: { A: createdA, B: createdB },
      hitsByLevel: { A: aHits.length, B: bHits.length },
    };
    this.logger.log(`合规扫描完成: ${JSON.stringify(report)}`);
    return report;
  }

  // ─── 复核队列 ───

  /** 扫描记录列表（admin 复核队列） */
  async listRecords(q: { level?: string; status?: string; targetType?: string; word?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize, 100);
    const where: Prisma.ComplianceScanRecordWhereInput = {
      ...(q.level ? { level: q.level } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.targetType ? { targetType: q.targetType } : {}),
      ...(q.word ? { word: { contains: q.word } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.complianceScanRecord.findMany({
        where,
        orderBy: [{ status: "asc" }, { level: "asc" }, { scanAt: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.complianceScanRecord.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 汇总统计（页面顶部计数） */
  async stats() {
    const groups = await this.prisma.complianceScanRecord.groupBy({
      by: ["status", "level"],
      _count: { _all: true },
    });
    const out = { open: { A: 0, B: 0 }, resolved: { A: 0, B: 0 }, ignored: { A: 0, B: 0 } };
    for (const g of groups) {
      const bucket = g.status === "OPEN" ? out.open : g.status === "RESOLVED" ? out.resolved : out.ignored;
      if (g.level === "A") bucket.A += g._count._all;
      else bucket.B += g._count._all;
    }
    return out;
  }

  /** 标记处置（RESOLVED=已整改 / IGNORED=误报忽略·如古籍引用/工艺描述豁免） */
  async updateStatus(id: string, status: "RESOLVED" | "IGNORED" | "OPEN", operatorId: string) {
    const record = await this.prisma.complianceScanRecord.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "扫描记录不存在");
    return this.prisma.complianceScanRecord.update({
      where: { id },
      data: {
        status,
        resolvedBy: status === "OPEN" ? null : operatorId,
        resolvedAt: status === "OPEN" ? null : new Date(),
      },
    });
  }

  // ─── 内部 ───

  /** 分批游标扫描（避免大表全量载内存） */
  private async scanBatched<T extends { id: string }>(
    fetch: (cursor?: string) => Promise<T[]>,
    handle: (row: T) => void,
  ): Promise<number> {
    let cursor: string | undefined;
    let count = 0;
    for (;;) {
      const rows = await fetch(cursor);
      if (!rows.length) break;
      for (const row of rows) handle(row);
      count += rows.length;
      if (rows.length < this.BATCH) break;
      cursor = rows[rows.length - 1].id;
    }
    return count;
  }

  /** 比对一条内容的多个字段，收集命中 */
  private collect(
    hits: ScanHit[],
    words: Array<{ word: string; level: "A" | "B"; replacement: string | null; remark: string | null }>,
    targetType: string,
    targetId: string,
    fields: Record<string, string | null | undefined>,
  ) {
    for (const [field, text] of Object.entries(fields)) {
      if (!text) continue;
      const lower = text.toLowerCase();
      for (const w of words) {
        const idx = lower.indexOf(w.word.toLowerCase());
        if (idx < 0) continue;
        hits.push({
          targetType,
          targetId,
          field,
          word: w.word,
          level: w.level,
          suggestion:
            w.level === "B"
              ? `建议替换为：${w.replacement ?? "（人工拟定）"}`
              : `A级禁止词，建议下架/整改${w.remark ? `（${w.remark}）` : ""}`,
          snippet: this.snippet(text, idx, w.word.length),
        });
      }
    }
  }

  /** 命中上下文片段（前后各 30 字） */
  private snippet(text: string, idx: number, wordLen: number): string {
    const start = Math.max(0, idx - this.SNIPPET_RADIUS);
    const end = Math.min(text.length, idx + wordLen + this.SNIPPET_RADIUS);
    return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
  }

  /** 幂等落库，返回真实新增数 */
  private async persist(hits: ScanHit[]): Promise<number> {
    if (!hits.length) return 0;
    let created = 0;
    // 分块写入，避免单条 createMany 参数超限
    for (let i = 0; i < hits.length; i += 1000) {
      const chunk = hits.slice(i, i + 1000);
      const res = await this.prisma.complianceScanRecord.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      created += res.count;
    }
    return created;
  }
}
