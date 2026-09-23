import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { RedisService } from "../../redis/redis.service";
import { AudioAssetService } from "./audio-asset.service";
import { TtsService } from "./tts.service";
import { AudiobookService } from "./audiobook.service";
import { ClassicSegmentService } from "../classic/classic-segment.service";
import { createFakeStorage } from "./audio-asset.test-utils";

/**
 * 有声读书真实库验证（默认跳过）：XIAOBU_IT_DATABASE_URL=<隔离库>
 * 对象存储为内存替身、合成函数为桩——验证的是复用、鉴权、签名地址与断点逻辑，
 * **不是**真实 TTS 音质、多音字读音或 COS 桶验收。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("有声读书 · 真实库", () => {
  let prisma: PrismaClient;
  let audiobook: AudiobookService;
  let tts: TtsService;
  let synthCalls = 0;
  const tag = `it-ab-${Date.now()}`;
  let segIds: string[] = [];
  let chapterId = "";
  let draftSegId = "";

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    const { storage } = createFakeStorage();
    const assets = new AudioAssetService(prisma as any, new RedisService(), storage as any);
    tts = new TtsService({ getBuffer: async () => null, setBuffer: async () => undefined } as any, assets, {} as any);
    jest.spyOn(tts as any, "doSynthesize").mockImplementation(async () => {
      synthCalls++;
      await new Promise((r) => setTimeout(r, 30));
      return { audio: Buffer.from(`mp3-${synthCalls}`), ttsProvider: "edge", voiceId: (tts as any).providerVoiceId("edge", "xiaoxiao") };
    });
    audiobook = new AudiobookService(prisma as any, tts);
    const segs = new ClassicSegmentService(prisma as any);

    const book = await prisma.classicBook.create({ data: { title: `${tag}-论语`, status: "PUBLISHED" } });
    await prisma.classicCopyright.create({ data: { bookId: book.id, sourceName: "it", license: "PUBLIC-DOMAIN", auditedAt: new Date() } });
    const ch = await prisma.classicChapter.create({ data: { bookId: book.id, title: "学而", content: "學而時習之，不亦說乎？\n有朋自遠方來，不亦樂乎？" } });
    chapterId = ch.id;
    await segs.createSegmentsForChapter(ch.id);
    segIds = (await segs.getSegmentsForChapter(ch.id)).map((s) => s.id);

    const draft = await prisma.classicBook.create({ data: { title: `${tag}-草稿`, status: "DRAFT" } });
    const dch = await prisma.classicChapter.create({ data: { bookId: draft.id, title: "x", content: "未公开的正文。" } });
    await segs.createSegmentsForChapter(dch.id);
    draftSegId = (await segs.getSegmentsForChapter(dch.id))[0].id;
  });

  afterAll(async () => {
    const books = await prisma.classicBook.findMany({ where: { title: { startsWith: tag } }, select: { id: true } });
    const ids = books.map((b) => b.id);
    const chs = (await prisma.classicChapter.findMany({ where: { bookId: { in: ids } }, select: { id: true } })).map((c) => c.id);
    const segs = (await prisma.classicSegment.findMany({ where: { chapterId: { in: chs } }, select: { id: true } })).map((s) => s.id);
    const tda = (await prisma.textDerivedAsset.findMany({ where: { sourceId: { in: segs } }, select: { id: true } })).map((t) => t.id);
    await prisma.audioAsset.deleteMany({ where: { sourceId: { in: [...segs, ...tda] } } });
    await prisma.textDerivedAsset.deleteMany({ where: { id: { in: tda } } });
    await prisma.audioListenProgress.deleteMany({ where: { chapterId: { in: chs } } });
    await prisma.classicSegment.deleteMany({ where: { id: { in: segs } } });
    await prisma.classicChapter.deleteMany({ where: { id: { in: chs } } });
    await prisma.classicCopyright.deleteMany({ where: { bookId: { in: ids } } });
    await prisma.classicBook.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("原文音频：并发 5 次只合成 1 次；再次请求复用、合成次数不变", async () => {
    synthCalls = 0;
    const rs = await Promise.all(Array.from({ length: 5 }, () => audiobook.segmentAudio(segIds[0], "original")));
    expect(new Set(rs.map((r) => r.assetId)).size).toBe(1);
    expect(synthCalls).toBe(1);
    const again = await audiobook.segmentAudio(segIds[0], "original");
    expect(again.reused).toBe(true);
    expect(synthCalls).toBe(1);
    // 播放地址是签名地址，不是存储地址
    expect(again.url).toMatch(/^\/api\/v1\/audiobook\/assets\/[^/]+\/stream\?exp=\d+&sig=[0-9a-f]{64}$/);
    expect(again.url).not.toMatch(/cdn\.test/);
  });

  it("签名地址：正确可取到音频；篡改签名、换资产、过期一律失效", async () => {
    const r = await audiobook.segmentAudio(segIds[0], "original");
    const u = new URL(`http://x${r.url}`);
    const exp = Number(u.searchParams.get("exp"));
    const sig = u.searchParams.get("sig")!;
    const audio = await audiobook.streamAsset(r.assetId, exp, sig);
    expect(audio.toString()).toMatch(/^mp3-/);
    await expect(audiobook.streamAsset(r.assetId, exp, sig.replace(/^./, sig[0] === "a" ? "b" : "a"))).rejects.toThrow(/失效/);
    await expect(audiobook.streamAsset("other-asset", exp, sig)).rejects.toThrow(/失效/);
    const past = Math.floor(Date.now() / 1000) - 5;
    await expect(audiobook.streamAsset(r.assetId, past, audiobook.sign(r.assetId, past))).rejects.toThrow(/失效/);
  });

  it("白话音频：没有当前版本译文时拒绝（不在此代生成、不绕过计次）；有译文后按译文资产生成", async () => {
    await expect(audiobook.segmentAudio(segIds[1], "vernacular")).rejects.toThrow(/还没有白话译文/);
    const seg = await prisma.classicSegment.findUniqueOrThrow({ where: { id: segIds[1] } });
    const tr = await prisma.textDerivedAsset.create({
      data: {
        assetKey: `${tag}-tr`,
        sourceType: "classic_segment",
        sourceId: seg.id,
        contentHash: createHash("sha256").update(seg.content, "utf8").digest("hex").slice(0, 32),
        processingType: "translation",
        result: JSON.stringify({ translation: "有朋友从远方来，不也快乐吗？" }),
        resultHash: "x",
        processingStatus: "completed",
      },
    });
    const r = await audiobook.segmentAudio(segIds[1], "vernacular");
    const row = await prisma.audioAsset.findUniqueOrThrow({ where: { id: r.assetId } });
    expect(row).toMatchObject({ sourceType: "classic_translation", sourceId: tr.id, textType: "vernacular" });
    // 原文修订后，旧译文不再算当前译文
    await prisma.classicSegment.update({ where: { id: seg.id }, data: { content: `${seg.content}！` } });
    await expect(audiobook.segmentAudio(segIds[1], "vernacular")).rejects.toThrow(/还没有白话译文/);
  });

  it("未公开古籍的段落不能合成、不能取地址", async () => {
    await expect(audiobook.segmentAudio(draftSegId, "original")).rejects.toThrow(/不存在/);
  });

  it("断点续听：按段落 ID 记位置；段落不属于该章节拒绝；倍速夹在合法范围", async () => {
    const u = `${tag}-user`;
    expect(await audiobook.getProgress(u, chapterId, "original")).toBeNull();
    await audiobook.saveProgress(u, { chapterId, textType: "original", segmentId: segIds[1], sortOrder: 1, positionMs: 4200, rate: 1.5 });
    expect(await audiobook.getProgress(u, chapterId, "original")).toMatchObject({ segmentId: segIds[1], positionMs: 4200, rate: 1.5 });
    await expect(audiobook.saveProgress(u, { chapterId, textType: "original", segmentId: draftSegId, sortOrder: 0, positionMs: 0, rate: 1 })).rejects.toThrow(/不属于/);
    // 原文与白话各自独立
    expect(await audiobook.getProgress(u, chapterId, "vernacular")).toBeNull();
  });
});
