import { PrismaClient } from "@prisma/client";
import { AudioAssetService, type AudioAssetRequest } from "./audio-asset.service";
import { TextDerivedAssetService } from "../classic/text-derived-asset.service";
import { RedisService } from "../../redis/redis.service";
import { createFakeStorage } from "./audio-asset.test-utils";
import { PaipanReportKnowledgeService } from "../paipan/paipan-report-knowledge.service";

/**
 * 真实数据库 + 真实 Redis 集成验证（默认跳过）。
 * 运行：XIAOBU_IT_DATABASE_URL=<隔离库> XIAOBU_IT_REDIS_URL=redis://127.0.0.1:6379 pnpm exec jest --runTestsByPath <本文件>
 * 仅允许指向已执行 manual_add_xiaobu_ai_assets 的隔离库，测试会清空相关表中带测试前缀的数据。
 * 对象存储仍为内存替身，不代表 COS 上传已验收。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const redisUrl = process.env.XIAOBU_IT_REDIS_URL;
const run = dbUrl && redisUrl ? describe : describe.skip;

run("AudioAsset / TextDerivedAsset 真实库并发去重", () => {
  let prisma: PrismaClient;
  let redis: RedisService;
  const prefix = `it-${Date.now()}`;

  beforeAll(async () => {
    process.env.REDIS_URL = redisUrl;
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    redis = new RedisService();
  });

  afterAll(async () => {
    await prisma.audioAsset.deleteMany({ where: { sourceId: { startsWith: prefix } } });
    await prisma.textDerivedAsset.deleteMany({ where: { sourceId: { startsWith: prefix } } });
    await prisma.paipanReportKnowledge.deleteMany({ where: { title: { startsWith: prefix } } });
    await prisma.$disconnect();
    await redis.onModuleDestroy();
  });

  it("两个独立服务实例并发同一音频请求：外部合成 1 次、数据库 1 行", async () => {
    const storage = createFakeStorage();
    // 模拟两台 API 进程：各自的服务实例，共享同一数据库和 Redis
    const a = new AudioAssetService(prisma as any, redis, storage.storage as any);
    const b = new AudioAssetService(prisma as any, new RedisService(), storage.storage as any);
    const req: AudioAssetRequest = {
      sourceType: "tts_request",
      sourceId: `${prefix}-audio`,
      text: "天行健，君子以自强不息。",
      textType: "original",
      ttsProvider: "tencent",
      voiceId: "101001",
      synthesisParams: { rate: "0%" },
    };
    let calls = 0;
    const synth = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 300));
      return { audio: Buffer.from("real-db"), ttsProvider: "tencent" as const, voiceId: "101001" };
    };
    const results = await Promise.all([
      a.getOrCreateAudioAsset(req, synth),
      b.getOrCreateAudioAsset(req, synth),
      a.getOrCreateAudioAsset(req, synth),
      b.getOrCreateAudioAsset(req, synth),
    ]);
    expect(calls).toBe(1);
    expect(new Set(results.map((r) => r.assetId)).size).toBe(1);
    expect(await prisma.audioAsset.count({ where: { sourceId: req.sourceId } })).toBe(1);

    // 重启（新实例）后仍复用，合成 0 次
    const c = new AudioAssetService(prisma as any, new RedisService(), storage.storage as any);
    const again = await c.getOrCreateAudioAsset(req, synth);
    expect(calls).toBe(1);
    expect(again.reused).toBe(true);
  });

  it("assetKey 唯一约束在数据库层生效", async () => {
    const data = {
      assetKey: `${prefix}-dup`,
      sourceType: "tts_request",
      sourceId: `${prefix}-dup`,
      textVersion: "x",
      textType: "original",
      ttsProvider: "edge",
      voiceId: "v",
      storageKey: "",
      storageUrl: "",
      contentHash: "",
    };
    await prisma.audioAsset.create({ data });
    await expect(prisma.audioAsset.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("文本派生资产并发同一请求：模型调用 1 次", async () => {
    const t1 = new TextDerivedAssetService(prisma as any, redis);
    const t2 = new TextDerivedAssetService(prisma as any, new RedisService());
    let calls = 0;
    const proc = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 300));
      return { result: '{"translation":"集成"}', model: "it-model" };
    };
    const req = {
      sourceType: "classic_translation",
      sourceId: `${prefix}-text`,
      content: "学而时习之",
      processingType: "translation" as const,
    };
    const results = await Promise.all([t1, t2, t1, t2].map((s) => s.getOrCreateTextAsset(req, proc)));
    expect(calls).toBe(1);
    expect(results.every((r) => r.result.includes("集成"))).toBe(true);
    expect(await prisma.textDerivedAsset.count({ where: { sourceId: req.sourceId } })).toBe(1);
  });

  it("报告知识库真实查询：只命中已审核条目、按标签数组匹配；各派都返回、指定门派加权排第一（2026-09-18 口径）", async () => {
    const svc = new PaipanReportKnowledgeService(prisma as any);
    const tag = `${prefix}-偏财格`;
    const base = { kind: "school_theory" as const, topic: "格局", tags: [tag], content: "要点" };
    const common = await svc.create({ ...base, school: null, title: `${prefix}-通用` }, "it");
    const ziping = await svc.create({ ...base, school: "ziping", title: `${prefix}-子平` }, "it");
    const mangpai = await svc.create({ ...base, school: "mangpai", title: `${prefix}-盲派` }, "it");
    await svc.create({ ...base, school: null, title: `${prefix}-草稿` }, "it");
    for (const r of [common, ziping, mangpai]) await svc.approve(r.id, "it-reviewer");
    const signals = [{ value: tag, weight: 10, reason: "格局" }];
    // 09-18 决策人口径：报告是「各门各派对这个盘怎么看」的汇总，不按门派排除；指定门派只加权靠前。
    // （本用例写于 09-17，按旧口径断言「只返回通用+指定门派」；因需真实库默认跳过，口径改后一直未重跑，09-21 更新）
    const hits = await svc.findEvidence({ paipanType: "bazi", school: "ziping", signals });
    expect(hits.map((h) => h.title).sort()).toEqual([`${prefix}-子平`, `${prefix}-盲派`, `${prefix}-通用`].sort());
    expect(hits[0].title).toBe(`${prefix}-子平`);
    expect(hits.map((h) => h.title)).not.toContain(`${prefix}-草稿`);
    const noSchool = await svc.findEvidence({ paipanType: "bazi", signals });
    expect(noSchool.map((h) => h.title).sort()).toEqual([`${prefix}-子平`, `${prefix}-盲派`, `${prefix}-通用`].sort());
  });
});
