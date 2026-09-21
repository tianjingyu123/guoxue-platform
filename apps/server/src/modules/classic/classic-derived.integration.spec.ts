import { PrismaClient } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import { ClassicSegmentService } from "./classic-segment.service";
import { TextDerivedAssetService } from "./text-derived-asset.service";
import { ClassicSimplifiedService } from "./classic-simplified.service";
import { ClassicService } from "./classic.service";

/**
 * 古籍派生资产真实库验证（默认跳过）：XIAOBU_IT_DATABASE_URL=<隔离库>
 * 验证：公开口径、原文不被改写、简体版等长可回到原文、并发只生成一份、原文修订后译文判过期。
 * 译文生成用的是桩函数（固定 JSON），**不代表真实模型译文质量已验收**。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("古籍派生资产 · 真实库", () => {
  let prisma: PrismaClient;
  let segments: ClassicSegmentService;
  let textAssets: TextDerivedAssetService;
  let simplified: ClassicSimplifiedService;
  let classic: ClassicService;
  const tag = `it-cls-${Date.now()}`;
  const ORIGINAL = "大哉乾元，萬物資始，乃統天。\n\n雲行雨施，品物流形。\n  其餘諸卦，於是乎備。";
  let publicBookId = "", draftBookId = "", chapterId = "", draftChapterId = "", noLicenseChapterId = "";
  const gatewayCalls: number[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    const redis = new RedisService(); // 未配置 REDIS_URL 时为进程内实现
    segments = new ClassicSegmentService(prisma as any);
    textAssets = new TextDerivedAssetService(prisma as any, redis);
    simplified = new ClassicSimplifiedService(prisma as any, textAssets, segments);
    const gateway: any = {
      chat: jest.fn(async () => {
        gatewayCalls.push(Date.now());
        await new Promise((r) => setTimeout(r, 50));
        return { content: JSON.stringify({ original: "x", translation: "桩译文（非真实模型）", notes: [], source: "" }), model: "stub" };
      }),
    };
    classic = new ClassicService(prisma as any, null as any, redis, gateway, textAssets);

    const mk = async (title: string, status: string, license: string | null) => {
      const b = await prisma.classicBook.create({ data: { title: `${tag}-${title}`, status } });
      if (license) {
        await prisma.classicCopyright.create({ data: { bookId: b.id, sourceName: "it", license, auditedAt: new Date(), auditedBy: "it" } });
      }
      const c = await prisma.classicChapter.create({ data: { bookId: b.id, title: "乾", sortOrder: 1, content: ORIGINAL } });
      return { b, c };
    };
    const pub = await mk("周易", "PUBLISHED", "PUBLIC-DOMAIN");
    const draft = await mk("草稿书", "DRAFT", "PUBLIC-DOMAIN");
    const nolic = await mk("未审版权", "PUBLISHED", "CC-BY-NC-4.0");
    publicBookId = pub.b.id; chapterId = pub.c.id; draftBookId = draft.b.id; draftChapterId = draft.c.id; noLicenseChapterId = nolic.c.id;
  });

  afterAll(async () => {
    const books = await prisma.classicBook.findMany({ where: { title: { startsWith: tag } }, select: { id: true } });
    const ids = books.map((b) => b.id);
    const chs = await prisma.classicChapter.findMany({ where: { bookId: { in: ids } }, select: { id: true } });
    const segs = await prisma.classicSegment.findMany({ where: { chapterId: { in: chs.map((c) => c.id) } }, select: { id: true } });
    await prisma.textDerivedAsset.deleteMany({ where: { sourceId: { in: segs.map((s) => s.id) } } });
    await prisma.classicSegment.deleteMany({ where: { id: { in: segs.map((s) => s.id) } } });
    await prisma.classicChapter.deleteMany({ where: { bookId: { in: ids } } });
    await prisma.classicCopyright.deleteMany({ where: { bookId: { in: ids } } });
    await prisma.classicBook.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("未发布、版权许可不可商用的章节：段落与简体接口一律 404", async () => {
    await expect(segments.assertChapterPublic(draftChapterId)).rejects.toThrow(/不存在/);
    await expect(segments.assertChapterPublic(noLicenseChapterId)).rejects.toThrow(/不存在/);
    await expect(simplified.forChapter(draftChapterId)).rejects.toThrow(/不存在/);
    await expect(segments.assertChapterPublic(chapterId)).resolves.toBeUndefined();
  });

  it("章节简体版：底本不变；每段等长、偏移指回原文；乾元按词组、餘→馀、於→于", async () => {
    const r = await simplified.forChapter(chapterId);
    expect(r.segments.length).toBeGreaterThanOrEqual(3);
    const chapter = await prisma.classicChapter.findUniqueOrThrow({ where: { id: chapterId } });
    expect(chapter.content).toBe(ORIGINAL); // 底本不被改写
    for (const s of r.segments) {
      const originalSlice = ORIGINAL.slice(s.startCharOffset, s.endCharOffset);
      expect(s.text.length).toBe(originalSlice.length);
    }
    const all = r.segments.map((s) => s.text).join("|");
    expect(all).toContain("大哉乾元，万物资始");
    expect(all).toContain("其馀诸卦，于是乎备");
    // 「乾元」命中词组，无单字「乾」，不产生待复核
    expect(r.keptAmbiguousTotal).toBe(0);
  });

  it("段落简体版持久化：并发 5 次只生成 1 份资产，第二次命中", async () => {
    const segs = await segments.getSegmentsForChapter(chapterId);
    const target = segs[0];
    const results = await Promise.all(Array.from({ length: 5 }, () => simplified.forSegment(target.id)));
    expect(new Set(results.map((r) => r.text)).size).toBe(1);
    const rows = await prisma.textDerivedAsset.findMany({ where: { sourceId: target.id, processingType: "simplified" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ processingStatus: "completed", model: "deterministic", strategy: expect.stringMatching(/^t2s-opencc/) });
    expect((await simplified.forSegment(target.id)).cached).toBe(true);
  });

  it("段落译文：none → 生成（桩）→ success，并发只调一次；原文修订后旧译文判 expired、不返回旧正文", async () => {
    const segs = await segments.getSegmentsForChapter(chapterId);
    const target = segs[1];
    expect((await classic.segmentTranslationStatus(target.id)).status).toBe("none");

    gatewayCalls.length = 0;
    await Promise.all(Array.from({ length: 4 }, () => classic.translateSegment(target.id, "u-it")));
    expect(gatewayCalls).toHaveLength(1);
    const ok = await classic.segmentTranslationStatus(target.id);
    expect(ok).toMatchObject({ status: "success", reviewStatus: "none" });
    expect(ok.result.translation).toMatch(/桩译文/);

    // 模拟整理版修订：段落内容变了（哈希随之变化）
    await prisma.classicSegment.update({ where: { id: target.id }, data: { content: `${target.content}（修订）` } });
    const st = await classic.segmentTranslationStatus(target.id);
    expect(st.status).toBe("expired");
    expect(st.result).toBeNull();
  });
});
