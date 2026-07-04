import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** 敏感词分类 */
export type SensitiveCategory = "GENERAL" | "COMPLIANCE_A" | "COMPLIANCE_B";

/** 词条元信息（合规扫描器使用） */
export interface SensitiveWordEntry {
  word: string;
  category: SensitiveCategory;
  replacement: string | null;
  remark: string | null;
  enabled: boolean;
}

/**
 * 本地敏感词过滤服务（国学领域专用）
 *
 * ## 选型理由
 * - **为什么自建：** 腾讯云通用审核无法识别国学/中医领域的诈骗话术，
 *   如 "还阴债""做法化解""包治百病""祖传秘方"，这些是平台高风险内容，
 *   必须专用词库兜底
 * - **为什么不送 AI 审核：** 延迟不可接受（>2s），用户发帖/评论需要 <100ms 响应
 * - **为什么是 Set 而非 Trie/AC 自动机：** 当前词库几百条，Set 查重 O(1) 足够；
 *   如果词库过万再换 AC 自动机
 *
 * ## 存储演进（合-P1·2026-07-05）
 * - **DB 真源：** SensitiveWord 表（word 唯一 + category 分级 + B 级 replacement 替换建议），
 *   后台可增删，重启不丢；旧版 Redis 词库在首次启动时一次性迁移入库
 * - **分类语义：**
 *   - GENERAL：通用拦截词，进 check/filter/hasSensitive（UGC 审核漏斗实时拦截）
 *   - COMPLIANCE_A：合规 A 级禁止词（改运/化解/保证/拉人头…），**不进实时拦截**
 *     （含匹配误杀正常文化讨论风险高），供合规扫描器产报告→人工复核处置
 *   - COMPLIANCE_B：合规 B 级替换建议词（算命→命理文化分析…），同上走报告制
 *
 * 不依赖腾讯云 API，纯本地运行。
 */
@Injectable()
export class SensitiveWordService implements OnModuleInit {
  private readonly logger = new Logger(SensitiveWordService.name);
  /** 通用拦截词（仅 GENERAL·实时审核用） */
  private words: Set<string> = new Set();
  /** 全量词条（含合规分级·扫描器用），key = word */
  private entries: Map<string, SensitiveWordEntry> = new Map();

  /** 默认通用敏感词库（国学平台场景·首次启动播种入 DB） */
  private readonly defaultWords: string[] = [
    // 广告类
    "加微信", "加我微信", "微信号", "扫码加", "免费领取", "点击链接",
    "加QQ", "QQ群", "加群", "私聊", "看薇", "看签名",
    // 违规类
    "赌博", "博彩", "赌场", "彩票预测", "必中", "包中",
    "贷款", "套现", "办证", "刻章", "发票代开",
    "色情", "约炮", "裸聊", "一夜情",
    // 政治敏感
    "法轮功", "六四", "天安门事件",
    // 邪教
    "全能神", "呼喊派", "东方闪电",
    // ────── 中医审核专项 ──────
    "包治百病", "替代正规医疗", "根治", "永不复发", "保证治愈",
    "祖传秘方", "宫廷秘方", "失传古方", "一针见效", "药到病除",
    // ────── 易经审核专项 ──────
    "改命逆天", "天意不可违", "神仙下凡", "血光之灾", "大劫难逃",
    "煞气冲身", "阴气缠身", "驱邪", "做法化解", "画符驱邪",
    "开光改运", "请神附体", "童子命", "还阴债", "替身法事",
    "六合彩预测", "彩票必中", "赌运亨通", "包化解", "保证灵验",
    // ────── 诈骗恐吓类 ──────
    "破财免灾", "花钱消灾", "命中有一劫", "不化解就会",
    "正宗秘传", "独家秘法", "稳赚不赔",
  ];

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.loadWords();
    this.logger.log(
      `敏感词库已加载: 通用 ${this.words.size} 词 / 全量 ${this.entries.size} 词（含合规分级）`,
    );
  }

  // ─── 检测（仅 GENERAL 通用词·实时审核漏斗） ───

  /** 检测文本是否包含敏感词，返回命中的词 */
  check(text: string): string[] {
    if (!text || this.words.size === 0) return [];
    const hits: string[] = [];
    const lower = text.toLowerCase();
    for (const word of this.words) {
      if (lower.includes(word.toLowerCase())) {
        hits.push(word);
      }
    }
    return hits;
  }

  /** 检测并返回是否命中 */
  hasSensitive(text: string): boolean {
    return this.check(text).length > 0;
  }

  /** 过滤文本中的敏感词（替换为*） */
  filter(text: string): { clean: string; hits: string[] } {
    const hits = this.check(text);
    let clean = text;
    for (const word of hits) {
      const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      clean = clean.replace(re, "*".repeat(word.length));
    }
    return { clean, hits };
  }

  // ─── 合规词库（COMPLIANCE_A/B·扫描器与 AI 生成链路共用） ───

  /** 获取启用中的合规词条（A=禁止 / B=替换建议） */
  getComplianceWords(): Array<{ word: string; level: "A" | "B"; replacement: string | null; remark: string | null }> {
    const out: Array<{ word: string; level: "A" | "B"; replacement: string | null; remark: string | null }> = [];
    for (const e of this.entries.values()) {
      if (!e.enabled) continue;
      if (e.category === "COMPLIANCE_A") out.push({ word: e.word, level: "A", replacement: null, remark: e.remark });
      else if (e.category === "COMPLIANCE_B") out.push({ word: e.word, level: "B", replacement: e.replacement, remark: e.remark });
    }
    return out;
  }

  // ─── 管理 ───

  /** 添加敏感词（默认 GENERAL·可指定合规分级与替换建议） */
  async addWord(word: string, category: SensitiveCategory = "GENERAL", replacement?: string, remark?: string): Promise<void> {
    const w = word.trim();
    if (!w) return;
    await this.prisma.sensitiveWord.upsert({
      where: { word: w },
      create: { word: w, category, replacement: replacement ?? null, remark: remark ?? null },
      update: { category, replacement: replacement ?? null, remark: remark ?? null, enabled: true },
    });
    this.cacheEntry({ word: w, category, replacement: replacement ?? null, remark: remark ?? null, enabled: true });
    this.logger.log(`新增敏感词: ${w} (${category})`);
  }

  /** 批量添加 */
  async addWords(words: string[], category: SensitiveCategory = "GENERAL"): Promise<void> {
    const clean = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
    if (!clean.length) return;
    await this.prisma.sensitiveWord.createMany({
      data: clean.map((word) => ({ word, category })),
      skipDuplicates: true,
    });
    for (const word of clean) {
      if (!this.entries.has(word)) {
        this.cacheEntry({ word, category, replacement: null, remark: null, enabled: true });
      }
    }
    this.logger.log(`新增 ${clean.length} 个敏感词 (${category})`);
  }

  /** 删除敏感词 */
  async removeWord(word: string): Promise<void> {
    await this.prisma.sensitiveWord.deleteMany({ where: { word } });
    this.entries.delete(word);
    this.words.delete(word);
  }

  /** 获取全部通用敏感词（兼容旧接口·仅 GENERAL） */
  listWords(): string[] {
    return [...this.words].sort();
  }

  /** 获取全量词条（含合规分级·后台管理用） */
  listEntries(category?: SensitiveCategory): SensitiveWordEntry[] {
    const all = [...this.entries.values()];
    const filtered = category ? all.filter((e) => e.category === category) : all;
    return filtered.sort((a, b) => a.word.localeCompare(b.word, "zh-Hans-CN"));
  }

  // ─── 内部 ───

  private cacheEntry(e: SensitiveWordEntry) {
    this.entries.set(e.word, e);
    if (e.category === "GENERAL" && e.enabled) this.words.add(e.word);
  }

  private async loadWords() {
    // 首次启动：GENERAL 通用词为空 → 播种默认词库 + 一次性迁移旧版 Redis 词库
    // （注意不能用全表 count：合规词种子 SQL 可能先于首次启动执行）
    const count = await this.prisma.sensitiveWord.count({ where: { category: "GENERAL" } });
    if (count === 0) {
      const legacy = (await this.redis.getJson<string[]>("system:sensitive_words:v1")) ?? [];
      const seed = [...new Set([...this.defaultWords, ...legacy])];
      await this.prisma.sensitiveWord.createMany({
        data: seed.map((word) => ({ word, category: "GENERAL" })),
        skipDuplicates: true,
      });
      this.logger.log(`敏感词库首次播种入 DB: ${seed.length} 词（含旧版 Redis 迁移 ${legacy.length} 词）`);
    }
    const rows = await this.prisma.sensitiveWord.findMany({ where: { enabled: true } });
    this.words = new Set();
    this.entries = new Map();
    for (const r of rows) {
      this.cacheEntry({
        word: r.word,
        category: r.category as SensitiveCategory,
        replacement: r.replacement,
        remark: r.remark,
        enabled: r.enabled,
      });
    }
  }
}
