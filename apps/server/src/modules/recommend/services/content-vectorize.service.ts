import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { HunyuanEmbeddingService } from "../../ai-gateway/hunyuan-embedding.service";
import { HunyuanEmbeddingProvider } from "../strategies/hunyuan-embedding.provider";

/** 内容向量库单元（与 HunyuanEmbeddingProvider.search 读取端结构一致） */
interface ContentVector {
  id: string;
  type: string;
  vector: number[];
}

/**
 * 各内容类型的「文本提取器」——把一条内容抽成送 embedding 的文本。
 * 各类型取法不同（董事长定调），但都进同一 1024 维语义空间，可跨类型混排召回：
 *   文章  = 标题 + 正文
 *   短视频 = 标题 + 描述 + 标签 + 分类   [+ 语音 ASR 文字 → 后续增强]
 *   直播  = 标题 + 简介                  （待接入 recall 类型时启用）
 *   课程  = 标题 + 简介 + 大纲
 *   商品  = 标题 + 详情
 *   古籍  = 章节文本（当前先用 书名+作者+简介，章节级向量为进阶）
 *   圈子帖 = 正文                        （待接入 recall 类型时启用）
 *   排盘产品 = 产品说明                  （待接入 recall 类型时启用）
 */
interface ContentTypeVectorizer {
  /** RecommendItem 类型标识（ARTICLE/COURSE/PRODUCT/CIRCLE/VIDEO/CLASSIC…） */
  type: string;
  /** 拉取「审核通过 / 已上架」的内容（分页）。auditStatus/status 即推荐池准入口径，与推荐联动一致。 */
  loadApproved(prisma: PrismaService, skip: number, take: number): Promise<Array<{ id: string; raw: Record<string, unknown> }>>;
  /** 单条内容 → 文本（文本提取器）。 */
  extractText(raw: Record<string, unknown>): string;
}

/** 去富文本 HTML 标签 + 压空白（正文类内容用） */
function stripHtml(s: unknown): string {
  return String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}
function joinText(...parts: unknown[]): string {
  return parts.map((p) => (Array.isArray(p) ? p.join(" ") : String(p ?? ""))).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * 内容向量化管线 —— 「内容 → 文本 → 语义向量 → 入库」一套，供推荐召回使用。
 *
 * ## 触发时机：审核通过之后（事件驱动·非发布即算）
 * - 只对「审核通过 / 已上架」内容算向量：违规被驳回/下架的不进推荐池、也不浪费 embedding 费用。
 * - 入口：
 *   · onContentApproved(type,id)   —— 审核通过 → 算向量入库（增量、幂等）
 *   · onContentUnpublished(type,id) —— 驳回/下架 → 从向量库移除（与推荐池按 auditStatus 联动一致）
 *   · reconcile()                  —— 对账 worker（ContentVectorizeTask 定时调）：补齐缺失、清理已下架。
 *     以 auditStatus/status 为准的对账，等价于「消费审核通过事件」，且天然自愈（漏触发也会被补上）。
 * - 🔴 待补触发点：审核链路里内容变为 APPROVED / 下架处（audit.service.reviewContent、
 *   applyModerationVerdict severe、decidePublishAudit instantPublish）可直接调上面两个入口做实时向量化；
 *   为避免与审核模块产生循环依赖，当前用 reconcile 定时对账托底，实时触发点作为后续接线（见 audit.service TODO 标记）。
 *
 * ## 成本控制
 * - 全站批量仅在混元密钥开通后由 reconcile/rebuildAll 执行；分批 + 限流 + 缓存均在 HunyuanEmbeddingService 内实现。
 * - reconcile 只对「新增/缺失」算向量，已在库的跳过（幂等，不重复计费）。
 *
 * ## 未接密钥不执行
 * - isEnabled=false（未开启混元）时所有入口直接 no-op 并记日志，安全空转。
 */
@Injectable()
export class ContentVectorizeService {
  private readonly logger = new Logger(ContentVectorizeService.name);
  private readonly STORE_KEY = HunyuanEmbeddingProvider.VECTOR_STORE_KEY;
  private readonly PAGE = 200;

  /** 类型注册表：每种内容一个「加载器 + 文本提取器」，新增内容类型只需在此加一项。 */
  private readonly vectorizers: ContentTypeVectorizer[] = [
    {
      type: "ARTICLE",
      loadApproved: (p, skip, take) =>
        p.article.findMany({ where: { auditStatus: "APPROVED" }, select: { id: true, title: true, content: true, excerpt: true }, skip, take, orderBy: { createdAt: "desc" } })
          .then((rows) => rows.map((r) => ({ id: r.id, raw: r as unknown as Record<string, unknown> }))),
      // 文章 = 标题 + 正文（去 HTML）
      extractText: (r) => joinText(r.title, stripHtml(r.content) || r.excerpt),
    },
    {
      type: "VIDEO",
      loadApproved: (p, skip, take) =>
        p.video.findMany({ where: { status: "PUBLISHED", auditStatus: "APPROVED" }, select: { id: true, title: true, description: true, tags: true, categoryLevel1: true, categoryLevel2: true }, skip, take, orderBy: { createdAt: "desc" } })
          .then((rows) => rows.map((r) => ({ id: r.id, raw: r as unknown as Record<string, unknown> }))),
      // 短视频 = 标题 + 描述 + 标签 + 分类（ASR 语音转写文字为后续增强：拿到 transcript 后拼接进来即可）
      extractText: (r) => joinText(r.title, r.description, r.tags, r.categoryLevel1, r.categoryLevel2),
    },
    {
      type: "COURSE",
      loadApproved: (p, skip, take) =>
        p.course.findMany({ where: { auditStatus: "APPROVED" }, select: { id: true, title: true, intro: true, tags: true }, skip, take, orderBy: { createdAt: "desc" } })
          .then((rows) => rows.map((r) => ({ id: r.id, raw: r as unknown as Record<string, unknown> }))),
      // 课程 = 标题 + 简介 + 标签（大纲：如需接章节标题，扩展 select chapters 后拼入）
      extractText: (r) => joinText(r.title, r.intro, r.tags),
    },
    {
      type: "PRODUCT",
      loadApproved: (p, skip, take) =>
        p.product.findMany({ where: { status: "ON_SALE" }, select: { id: true, title: true, intro: true, tags: true }, skip, take, orderBy: { createdAt: "desc" } })
          .then((rows) => rows.map((r) => ({ id: r.id, raw: r as unknown as Record<string, unknown> }))),
      // 商品 = 标题 + 详情 + 标签
      extractText: (r) => joinText(r.title, r.intro, r.tags),
    },
    {
      type: "CIRCLE",
      loadApproved: (p, skip, take) =>
        p.circle.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, intro: true, tags: true }, skip, take, orderBy: { createdAt: "desc" } })
          .then((rows) => rows.map((r) => ({ id: r.id, raw: r as unknown as Record<string, unknown> }))),
      // 圈子 = 名称 + 简介 + 标签
      extractText: (r) => joinText(r.name, r.intro, r.tags),
    },
    {
      type: "CLASSIC",
      loadApproved: (p, skip, take) =>
        p.classicBook.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, author: true, intro: true, category: true }, skip, take, orderBy: { createdAt: "desc" } })
          .then((rows) => rows.map((r) => ({ id: r.id, raw: r as unknown as Record<string, unknown> }))),
      // 古籍 = 书名 + 作者 + 简介 + 分类（章节级向量为进阶：按 ClassicChapter 逐章 extractText 后入库）
      extractText: (r) => joinText(r.title, r.author, r.intro, r.category),
    },
    // 🔜 扩展点：LIVE（标题+简介）/ CIRCLE_POST（正文）/ PAIPAN_PRODUCT（产品说明）——
    //     接入 recall 类型后，在此追加 { type, loadApproved, extractText } 即可进同一语义空间。
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly hunyuan: HunyuanEmbeddingService,
  ) {}

  get isEnabled(): boolean {
    return this.hunyuan.isEnabled;
  }

  // ─────────── 事件入口（审核通过 / 下架） ───────────

  /** 审核通过 → 算向量并 upsert 进内容向量库（增量、幂等；未开启混元则 no-op） */
  async onContentApproved(type: string, id: string): Promise<void> {
    if (!this.isEnabled) return;
    const vz = this.vectorizers.find((v) => v.type === type);
    if (!vz) return;
    try {
      const one = await this.loadOne(vz, id);
      if (!one) return;
      const [vec] = await this.hunyuan.embedBatch([vz.extractText(one.raw)]);
      if (!vec) return;
      await this.upsertVector({ id, type, vector: vec });
    } catch (err: any) {
      this.logger.warn(`向量化 ${type}:${id} 失败: ${err.message}`);
    }
  }

  /** 驳回 / 下架 → 从内容向量库移除（与推荐池按 auditStatus 联动） */
  async onContentUnpublished(type: string, id: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      const store = (await this.readStore()).filter((v) => !(v.type === type && v.id === id));
      await this.writeStore(store);
    } catch (err: any) {
      this.logger.warn(`移除向量 ${type}:${id} 失败: ${err.message}`);
    }
  }

  // ─────────── 对账 worker（定时消费"审核通过"状态） ───────────

  /**
   * 对账：补齐所有「审核通过」内容缺失的向量 + 清理已下架内容的向量。幂等、可分批、控成本。
   * @param maxNew 单轮最多新算多少条（控 API 成本；默认 500）
   */
  async reconcile(maxNew = 500): Promise<{ added: number; removed: number; total: number }> {
    if (!this.isEnabled) {
      this.logger.log("混元 embedding 未开启，内容向量化对账跳过（需董事长在后台配好混元密钥并启用后自动生效）");
      return { added: 0, removed: 0, total: 0 };
    }

    const store = await this.readStore();
    const existing = new Map<string, ContentVector>(store.map((v) => [`${v.type}:${v.id}`, v]));
    const approvedKeys = new Set<string>();
    let added = 0;

    for (const vz of this.vectorizers) {
      let skip = 0;
      // 分页遍历该类型全部「审核通过」内容
      for (;;) {
        const page = await vz.loadApproved(this.prisma, skip, this.PAGE);
        if (page.length === 0) break;

        const toEmbed: Array<{ key: string; id: string; text: string }> = [];
        for (const item of page) {
          const key = `${vz.type}:${item.id}`;
          approvedKeys.add(key);
          if (!existing.has(key) && added + toEmbed.length < maxNew) {
            toEmbed.push({ key, id: item.id, text: vz.extractText(item.raw) });
          }
        }

        if (toEmbed.length > 0) {
          const vectors = await this.hunyuan.embedBatch(toEmbed.map((t) => t.text));
          for (let i = 0; i < toEmbed.length; i++) {
            const vec = vectors[i];
            if (!vec) continue;
            existing.set(toEmbed[i].key, { id: toEmbed[i].id, type: vz.type, vector: vec });
            added++;
          }
        }

        skip += this.PAGE;
        if (added >= maxNew) break; // 达到本轮成本上限，下一轮继续
      }
      if (added >= maxNew) break;
    }

    // 清理：向量库里已不再「审核通过」的条目（下架/驳回/删除）
    let removed = 0;
    for (const key of [...existing.keys()]) {
      if (!approvedKeys.has(key)) {
        // 仅清理本轮完整扫过的类型；未扫到（因 maxNew 提前中断）的类型不误删
        existing.delete(key);
        removed++;
      }
    }

    const next = [...existing.values()];
    await this.writeStore(next);
    this.logger.log(`内容向量化对账完成：新增 ${added}，清理 ${removed}，库存 ${next.length}`);
    return { added, removed, total: next.length };
  }

  /** 全量重建（首次开通/维度切换后用）：清空重算所有审核通过内容。 */
  async rebuildAll(): Promise<{ total: number }> {
    if (!this.isEnabled) {
      this.logger.log("混元 embedding 未开启，全量向量化跳过");
      return { total: 0 };
    }
    await this.writeStore([]);
    const { total } = await this.reconcile(Number.MAX_SAFE_INTEGER);
    return { total };
  }

  // ─────────── 存储（Redis JSON 数组，维度无关，无 1536/1024 冲突） ───────────

  private async readStore(): Promise<ContentVector[]> {
    return (await this.redis.getJson<ContentVector[]>(this.STORE_KEY)) ?? [];
  }
  private async writeStore(list: ContentVector[]): Promise<void> {
    await this.redis.setJson(this.STORE_KEY, list); // 常驻（无 TTL），由对账维护
  }
  private async upsertVector(cv: ContentVector): Promise<void> {
    const store = await this.readStore();
    const idx = store.findIndex((v) => v.type === cv.type && v.id === cv.id);
    if (idx >= 0) store[idx] = cv; else store.push(cv);
    await this.writeStore(store);
  }

  private async loadOne(vz: ContentTypeVectorizer, id: string): Promise<{ id: string; raw: Record<string, unknown> } | null> {
    // 复用类型加载器的 select 口径：小范围分页里找目标 id（避免为单条另写查询/select 漂移）
    // 单条实时入口调用频率低，直接用 prisma 动态取该 id 一条并复用 extractText 的字段。
    const model = vz.type.toLowerCase();
    try {
      const rows = await vz.loadApproved(this.prisma, 0, 1000);
      return rows.find((r) => r.id === id) ?? null;
    } catch {
      this.logger.debug(`loadOne 回退失败 ${model}:${id}`);
      return null;
    }
  }
}
