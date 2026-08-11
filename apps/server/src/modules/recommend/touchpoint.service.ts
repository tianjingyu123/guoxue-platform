import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../classic/classic-publication-policy";
import { RedisService } from "../../redis/redis.service";

/**
 * 无痕商业化触点 · 机制层（触-P1）
 * 设计真源：docs/design/无痕商业化触点体系-总方案-20260704.md §一
 *
 * 统一「触点卡」结构由服务端裁决后下发，前端只负责渲染与埋点：
 * - 克制引擎（服务端统一，防各页各自为政）：
 *   ① 频控：同一触点对同一用户（或匿名指纹）24h 最多曝光 1 次（redis incrWithTtl）
 *   ② 开关：全局 `touchpoint.enabled` + 单触点 `touchpoint.<scene>.enabled`（ConfigSystem·默认开·配置为 "false" 才关）
 *   ③ 相关性硬门槛：无匹配 SKU 宁可不出（show:false·前端 v-if 隐藏）
 * - 本批仅实现 levelup_course 一个场景作为参考实现，其余场景返回空（诚实降级·触-P2 逐一接入）
 */

/** 触点卡（统一返回结构） */
export interface TouchpointCard {
  /** SKU 类型：course / product / member 等 */
  skuType: string;
  skuId: string;
  title: string;
  /** 理由文案：为什么此刻推（无痕的关键） */
  reason: string;
  cover: string;
  /** 前端跳转路径（原型路径，走 navigateTo 动态表） */
  link: string;
}

/** 触点裁决结果 */
export interface TouchpointResult {
  show: boolean;
  card?: TouchpointCard;
}

/** 触点场景注册表元信息 */
export interface TouchpointMeta {
  /** 中文名（后台展示用） */
  label: string;
  /** SKU 来源说明 */
  skuSource: string;
  /**
   * 状态：
   * - implemented  已在本端点实现召回逻辑
   * - pending      枚举已登记·逻辑待触-P2/P3 实现（端点返回空·诚实降级）
   * - registered   已在别处落地（如会员额度卡/今日学一点）·此处仅登记归档，不经本端点
   */
  status: "implemented" | "pending" | "registered";
}

/**
 * 触点场景枚举（设计文档§二注册表·每页至多一个触点=页面注册制，一页一个 scene）
 */
export const TOUCHPOINTS: Record<string, TouchpointMeta> = {
  /** #4 节气日 → 节气礼盒（SKU源=商品池场景标签「节气时令」·供-P1 已接线 Product.sceneTags） */
  jieqi_gift: { label: "节气礼盒", skuSource: "商品池场景标签「节气时令」", status: "implemented" },
  /** #8 晋级/成就时刻 → 进阶之路：下一门课（本批参考实现） */
  levelup_course: { label: "晋级进阶课", skuSource: "课程库按分类推进阶", status: "implemented" },
  /** #1 古籍读到精彩处 → 本书相关名师精讲课 */
  classic_course: { label: "古籍精讲", skuSource: "本书相关课程", status: "implemented" },
  /** #3 诗词赏析页 → 应景雅物（触-P3） */
  poetry_goods: { label: "诗词雅物", skuSource: "商品池雅物类目（文创/文房/香道/茶具）·场景标签兜底", status: "implemented" },
  /** #6 圈子优质讨论 → 圈主的课程（触-P3） */
  circle_course: { label: "圈子课程", skuSource: "圈主（Circle.ownerId）的已过审课程", status: "implemented" },
  /** #9 结业证书页 → 同系列下一课（触-P3） */
  cert_next_course: { label: "证书下一课", skuSource: "同一级品类课程（排除本课与已购）", status: "implemented" },
  /** #10 咨询结束回执 → 从业者推荐的应景商品（依赖 CRM） */
  consult_goods: { label: "咨询回执商品", skuSource: "从业者推荐（CRM 白标）", status: "pending" },
  /** #5 AI 伴读额度上限 → 书院会员（已在伴读页落地·仅登记） */
  ai_quota_member: { label: "AI额度会员", skuSource: "书院会员", status: "registered" },
  /** #7 今日学一点 → 内容即入口（已在首页落地·仅登记） */
  daily_learn: { label: "今日学一点", skuSource: "内容即入口", status: "registered" },
};

/** 全局开关 ConfigSystem key */
const GLOBAL_SWITCH_KEY = "touchpoint.enabled";
/**
 * 雅物类目关键词（触-P3 #3 诗词雅物·已按生产 ProductCategory 侦察定稿）：
 * 一级类目实为「文创/文房/香道/茶具」（设计稿写作「香品/茶器」），
 * 「香/茶」宽匹配同时覆盖二级类目（线香/香炉/香道工具/茶壶/茶杯/茶席等）。
 */
const ELEGANT_CATEGORY_KEYWORDS = ["文创", "文房", "香", "茶"];
/** 频控窗口：24h */
const FREQ_TTL_SECONDS = 24 * 3600;
/** 频控阈值：24h 最多曝光 1 次 */
const FREQ_LIMIT = 1;

@Injectable()
export class TouchpointService {
  private readonly logger = new Logger(TouchpointService.name);

  constructor(private prisma: PrismaService, private redis: RedisService) {}

  /**
   * 触点统一裁决入口。
   * @param scene   触点场景 key（TOUCHPOINTS 枚举）
   * @param subject 频控主体：userId 或匿名指纹（由 controller 解析）
   * @param userId  登录用户 id（用于个性化召回，可空）
   * @param ctx     场景上下文（如 { category: "易学" }，可空）
   */
  async getTouchpoint(
    scene: string,
    subject: string,
    userId?: string,
    ctx?: Record<string, unknown>,
  ): Promise<TouchpointResult> {
    // 未注册场景：宁缺勿滥，直接不出
    const meta = TOUCHPOINTS[scene];
    if (!meta) return { show: false };

    // ① 频控：同一触点对同一主体 24h 最多曝光 1 次
    const day = this.today();
    const { count } = await this.redis.incrWithTtl(`tp:${scene}:${subject}:${day}`, FREQ_TTL_SECONDS);
    if (count > FREQ_LIMIT) return { show: false };

    // ② 全局开关 + 单触点开关（默认视为开·配置为 "false" 才关）
    if (!(await this.isEnabled(scene))) return { show: false };

    // ③ 场景召回 + 相关性硬门槛：无匹配 SKU 宁可不出
    const card = await this.resolveCard(scene, meta, userId, ctx);
    if (!card) return { show: false };

    return { show: true, card };
  }

  /** 读取全局 + 单触点开关（一次查询·缺省即开） */
  private async isEnabled(scene: string): Promise<boolean> {
    const sceneKey = `touchpoint.${scene}.enabled`;
    try {
      const rows = await this.prisma.configSystem.findMany({
        where: { configKey: { in: [GLOBAL_SWITCH_KEY, sceneKey] } },
        select: { configKey: true, configValue: true },
      });
      const off = (key: string) => rows.find((r) => r.configKey === key)?.configValue === "false";
      return !off(GLOBAL_SWITCH_KEY) && !off(sceneKey);
    } catch (err) {
      // 配置读取异常：触点是锦上添花，出错时宁可不出，绝不阻塞
      this.logger.warn(`触点开关读取失败(${scene}): ${(err as Error).message}`);
      return false;
    }
  }

  /** 按场景召回触点卡（未实现场景诚实降级返回 null） */
  private async resolveCard(
    scene: string,
    meta: TouchpointMeta,
    userId?: string,
    ctx?: Record<string, unknown>,
  ): Promise<TouchpointCard | null> {
    if (meta.status !== "implemented") return null;
    switch (scene) {
      case "classic_course":
        return this.resolveClassicCourse(ctx);
      case "levelup_course":
        return this.resolveLevelupCourse(userId, ctx);
      case "jieqi_gift":
        return this.resolveJieqiGift(ctx);
      case "poetry_goods":
        return this.resolvePoetryGoods();
      case "circle_course":
        return this.resolveCircleCourse(ctx);
      case "cert_next_course":
        return this.resolveCertNextCourse(userId, ctx);
      default:
        return null;
    }
  }

  /**
   * #1 古籍读到精彩处 → 本书相关精讲。
   * 先按书名精确关联课程；没有直接关联时，才按古籍分类召回同类公开课。
   * 两级都无结果就不展示，避免阅读场景被无关销售内容打断。
   */
  private async resolveClassicCourse(ctx?: Record<string, unknown>): Promise<TouchpointCard | null> {
    const bookId = typeof ctx?.bookId === "string" && ctx.bookId ? ctx.bookId : undefined;
    const ctxTitle = typeof ctx?.bookTitle === "string" && ctx.bookTitle ? ctx.bookTitle.trim() : "";
    let book: { title: string; category: string } | null = null;
    if (bookId) {
      book = await this.prisma.classicBook.findFirst({
        where: { id: bookId, ...PUBLIC_CLASSIC_BOOK_WHERE },
        select: { title: true, category: true },
      });
    }
    const title = book?.title || ctxTitle;
    if (!title && !book?.category) return null;

    const direct = title
      ? await this.prisma.course.findFirst({
          where: {
            auditStatus: "APPROVED",
            visibility: "PLATFORM",
            deletedAt: null,
            OR: [
              { title: { contains: title, mode: "insensitive" } },
              { intro: { contains: title, mode: "insensitive" } },
              { tags: { has: title } },
            ],
          },
          select: { id: true, title: true, cover: true },
          orderBy: { studentCount: "desc" },
        })
      : null;

    const course = direct || (book?.category
      ? await this.prisma.course.findFirst({
          where: {
            auditStatus: "APPROVED",
            visibility: "PLATFORM",
            deletedAt: null,
            OR: [
              { categoryLevel1: book.category },
              { categoryLevel2: book.category },
              { tags: { has: book.category } },
            ],
          },
          select: { id: true, title: true, cover: true },
          orderBy: { studentCount: "desc" },
        })
      : null);
    if (!course) return null;

    return {
      skuType: "course",
      skuId: course.id,
      title: course.title,
      reason: title ? `读完《${title}》·继续听讲` : "读到这里·继续听讲",
      cover: course.cover || "",
      link: `/courses/${course.id}`,
    };
  }

  /**
   * #3 诗词雅物（触-P3）：
   * 诗词赏析读完位 → 商品池「雅物类目」（文创/文房/香道/茶具·含二级类目）在售商品销量第一；
   * 类目未命中时兜底取 sceneTags 有任意场景标的在售商品；仍无货返回 null（相关性硬门槛·宁缺勿滥）。
   */
  private async resolvePoetryGoods(): Promise<TouchpointCard | null> {
    const productSelect = { id: true, title: true, images: true } as const;

    // ① 类目召回：匹配雅物类目（一级命中时连带其二级子类目·商品实际挂在二级类目上）
    let product: { id: string; title: string; images: string[] } | null = null;
    const matched = await this.prisma.productCategory.findMany({
      where: { status: "ACTIVE", OR: ELEGANT_CATEGORY_KEYWORDS.map((k) => ({ name: { contains: k } })) },
      select: { id: true },
    });
    if (matched.length) {
      const children = await this.prisma.productCategory.findMany({
        where: { parentId: { in: matched.map((c) => c.id) } },
        select: { id: true },
      });
      const categoryIds = [...new Set([...matched, ...children].map((c) => c.id))];
      product = await this.prisma.product.findFirst({
        where: { status: "ON_SALE", deletedAt: null, categoryId: { in: categoryIds } },
        select: productSelect,
        orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      });
    }

    // ② 兜底：类目体系未命中 → sceneTags 有任意场景标的在售商品（供-P1 白名单标签）
    if (!product) {
      product = await this.prisma.product.findFirst({
        where: { status: "ON_SALE", deletedAt: null, sceneTags: { isEmpty: false } },
        select: productSelect,
        orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      });
    }
    if (!product) return null;

    return {
      skuType: "product",
      skuId: product.id,
      title: product.title,
      reason: "读诗之余·案头雅物",
      cover: product.images?.[0] || "",
      link: `/pkg-shop/detail?id=${product.id}`,
    };
  }

  /**
   * #6 圈子课程（触-P3）：
   * 优质帖尾 → 圈主（Circle.ownerId）的已过审（APPROVED）课程销量第一。
   * ctx.circleId 必传；圈不存在/圈主无课返回 null（宁缺勿滥）。
   */
  private async resolveCircleCourse(ctx?: Record<string, unknown>): Promise<TouchpointCard | null> {
    const circleId = typeof ctx?.circleId === "string" && ctx.circleId ? ctx.circleId : undefined;
    if (!circleId) return null;

    const circle = await this.prisma.circle.findFirst({
      where: { id: circleId, deletedAt: null },
      select: { ownerId: true },
    });
    if (!circle) return null;

    const course = await this.prisma.course.findFirst({
      where: { userId: circle.ownerId, auditStatus: "APPROVED", deletedAt: null },
      select: { id: true, title: true, cover: true },
      orderBy: { studentCount: "desc" },
    });
    if (!course) return null;

    return {
      skuType: "course",
      skuId: course.id,
      title: course.title,
      reason: "圈主的系统课",
      cover: course.cover || "",
      link: `/courses/${course.id}`,
    };
  }

  /**
   * #9 证书下一课（触-P3）：
   * 结业证书页 → 同一级品类（categoryLevel1）下销量第一、且非本课、用户未购的已过审课程。
   * ctx.courseId 必传；本课无一级品类或无同类下一课返回 null（宁缺勿滥）。
   */
  private async resolveCertNextCourse(
    userId?: string,
    ctx?: Record<string, unknown>,
  ): Promise<TouchpointCard | null> {
    const courseId = typeof ctx?.courseId === "string" && ctx.courseId ? ctx.courseId : undefined;
    if (!courseId) return null;

    const current = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { categoryLevel1: true },
    });
    // 本课不存在或无一级品类 → 「同系列」无从谈起，宁可不出
    if (!current?.categoryLevel1) return null;

    // 排除本课 + 用户已购课程（口径与 course.service checkAccess 一致：PAID/COMPLETED 订单）
    const excludeIds = new Set<string>([courseId]);
    if (userId) {
      const orders = await this.prisma.order.findMany({
        where: { userId, type: "COURSE", status: { in: ["PAID", "COMPLETED"] } },
        select: { targetId: true },
      });
      for (const o of orders) if (o.targetId) excludeIds.add(o.targetId);
    }

    const next = await this.prisma.course.findFirst({
      where: {
        auditStatus: "APPROVED",
        deletedAt: null,
        categoryLevel1: current.categoryLevel1,
        id: { notIn: [...excludeIds] },
      },
      select: { id: true, title: true, cover: true },
      orderBy: { studentCount: "desc" },
    });
    if (!next) return null;

    return {
      skuType: "course",
      skuId: next.id,
      title: next.title,
      reason: "进阶之路·下一门",
      cover: next.cover || "",
      link: `/courses/${next.id}`,
    };
  }

  /**
   * #4 节气礼盒（供-P1 接线）：
   * 节气日 → sceneTags 含「节气时令」的在售商品取 1 个（销量优先·上架时间兜底）。
   * ctx.term = 当前节气名（如「冬至」）用于 reason 文案；无货返回 null（相关性硬门槛·宁缺勿滥）。
   */
  private async resolveJieqiGift(ctx?: Record<string, unknown>): Promise<TouchpointCard | null> {
    const term = typeof ctx?.term === "string" && ctx.term ? ctx.term : "节气";
    const product = await this.prisma.product.findFirst({
      where: { status: "ON_SALE", deletedAt: null, sceneTags: { has: "节气时令" } },
      select: { id: true, title: true, images: true },
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
    });
    if (!product) return null;

    return {
      skuType: "product",
      skuId: product.id,
      title: product.title,
      reason: `${term}·应时雅物`,
      cover: product.images?.[0] || "",
      link: `/pkg-shop/detail?id=${product.id}`,
    };
  }

  /**
   * #8 晋级进阶课（参考实现）：
   * 晋级/成就时刻 → 「进阶之路：下一门课」。
   * 召回规则：课程库按分类推进阶（ctx.category 匹配一级品类）·排除已学课程·按热度取第一。
   */
  private async resolveLevelupCourse(
    userId?: string,
    ctx?: Record<string, unknown>,
  ): Promise<TouchpointCard | null> {
    const category = typeof ctx?.category === "string" && ctx.category ? ctx.category : undefined;

    // 排除用户已学课程（有进度记录即视为已学·推「下一门」）
    let learnedIds: string[] = [];
    if (userId) {
      const rows = await this.prisma.courseProgress.findMany({
        where: { userId },
        select: { courseId: true },
        distinct: ["courseId"],
      });
      learnedIds = rows.map((r) => r.courseId);
    }

    const where: Prisma.CourseWhereInput = {
      auditStatus: "APPROVED",
      deletedAt: null,
      ...(category ? { categoryLevel1: category } : {}),
      ...(learnedIds.length ? { id: { notIn: learnedIds } } : {}),
    };
    const course = await this.prisma.course.findFirst({
      where,
      select: { id: true, title: true, cover: true, categoryLevel1: true },
      orderBy: { studentCount: "desc" },
    });
    if (!course) return null;

    return {
      skuType: "course",
      skuId: course.id,
      title: course.title,
      reason: course.categoryLevel1
        ? `你在「${course.categoryLevel1}」更进一步了，这门课正好承接下一程`
        : "晋级之后，进阶之路已为你备好下一课",
      cover: course.cover || "",
      link: `/courses/${course.id}`,
    };
  }

  /** yyyymmdd（频控 key 按自然日分片） */
  private today(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}${mm}${dd}`;
  }
}
