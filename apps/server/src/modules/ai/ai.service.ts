import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { MemoryCache } from "../../common/cache.util";
import { PrismaService } from "../../prisma/prisma.service";
import { tc3Sign } from "../../common/tc3.util";
import { CircuitBreaker } from "../../common/circuit-breaker";

/**
 * 腾讯云 AI 能力服务（语音识别/OCR/NLP/翻译）
 * 使用 TC3-HMAC-SHA256 签名，纯原生HTTP对接
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly translateCache = new MemoryCache<string>(300);
  private readonly circuitBreaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 30_000, halfOpenSuccessThreshold: 2 });

  constructor(
    private prisma: PrismaService,
  ) {
    this.secretId = process.env.TENCENT_SECRET_ID || "";
    this.secretKey = process.env.TENCENT_SECRET_KEY || "";
    if (!this.secretId) {
      this.logger.warn("腾讯云AI凭证未配置");
    }
  }

  // ───────── TC3 API 调用 ─────────

  private async callApi(service: string, action: string, body: Record<string, unknown>, region?: string, retries = 2): Promise<Record<string, unknown> | null> {
    if (!this.circuitBreaker.isAllowed(service)) {
      this.logger.warn(`AI断路器开启 [${service}/${action}]，请求被拒绝`);
      return null;
    }

    const version = this.getVersion(service);
    const region_ = region || "ap-guangzhou";
    const { host, headers, payloadStr } = tc3Sign({
      secretId: this.secretId,
      secretKey: this.secretKey,
      service,
      action,
      version,
      payload: body,
      region: region_,
    });

    const startedAt = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(`https://${host}`, {
          method: "POST",
          headers,
          body: payloadStr,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await resp.json();
        const response = (data as Record<string, unknown>).Response;
        if (response && typeof response === "object" && "Error" in response) {
          const errData = (response as Record<string, unknown>).Error as Record<string, unknown>;
          const errCode = errData.Code as string;
          // 可重试的服务端错误
          if (attempt < retries && (errCode === "InternalError" || errCode === "RequestLimitExceeded" || errCode === "ResourceInsufficient")) {
            this.logger.warn(`AI API重试 [${action}] 第${attempt + 1}次: ${errCode}`);
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            continue;
          }
          this.logger.error(`AI API错误 [${action}]`, errData);
          this.circuitBreaker.recordFailure(service);
          return null;
        }
        const elapsed = Date.now() - startedAt;
        if (elapsed > 3000) {
          this.logger.warn(`AI API慢请求 [${action}] ${elapsed}ms`);
        }
        this.circuitBreaker.recordSuccess(service);
        return (response || data) as Record<string, unknown>;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const errObj = err as Error;
        if (attempt < retries && (errObj.name === "AbortError" || errObj.name === "TimeoutError" || errObj.message?.includes("fetch"))) {
          this.logger.warn(`AI API网络重试 [${action}] 第${attempt + 1}次`);
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        this.logger.error(`AI API请求失败 [${action}]`, errObj.message);
        this.circuitBreaker.recordFailure(service);
        return null;
      }
    }
    this.circuitBreaker.recordFailure(service);
    return null;
  }

  private getVersion(service: string): string {
    const versions: Record<string, string> = {
      asr: "2019-06-14",
      ocr: "2018-11-19",
      nlp: "2019-04-08",
      tmt: "2018-03-21",
    };
    return versions[service] || "2018-03-21";
  }

  // ───────── 语音识别（ASR） ─────────

  /** 一句话识别（60秒以内） */
  async sentenceRecognition(voiceBase64: string, params?: {
    format?: "wav" | "pcm" | "mp3" | "silk";
    rate?: 8000 | 16000;
    lang?: "16k_zh" | "8k_zh" | "16k_en";
  }) {
    return this.callApi("asr", "SentenceRecognition", {
      ProjectId: 0,
      SubServiceType: 2,
      EngSerViceType: params?.lang || "16k_zh",
      SourceType: 1,
      VoiceFormat: params?.format || "wav",
      UsrAudioKey: randomUUID(),
      Data: voiceBase64,
      DataLen: voiceBase64.length,
    });
  }

  /** 录音文件识别（支持长语音，需要异步轮询） */
  async createRecTask(audioUrl: string, params?: {
    format?: "wav" | "mp3";
    rate?: 8000 | 16000;
    callbackUrl?: string;
  }) {
    const result = await this.callApi("asr", "CreateRecTask", {
      EngineModelType: "16k_zh",
      ChannelNum: 1,
      ResTextFormat: 0,
      SourceType: 0,
      Url: audioUrl,
      CallbackUrl: params?.callbackUrl || "",
    });
    return result?.Data as Record<string, unknown> | undefined;
  }

  /** 查询录音识别结果 */
  async queryRecTask(taskId: number): Promise<Record<string, unknown> | undefined> {
    const result = await this.callApi("asr", "DescribeTaskStatus", { TaskId: taskId });
    return result?.Data as Record<string, unknown> | undefined;
  }

  /** 轮询获取语音识别结果（最长等待60秒） */
  async waitForRecTask(taskId: number, maxRetries = 12, interval = 5000): Promise<Record<string, unknown> | null> {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, interval));
      const status = await this.queryRecTask(taskId) as Record<string, unknown> | null;
      if (status?.StatusStr === "success") return status;
      if (status?.StatusStr === "failed") return null;
    }
    return null; // 超时
  }

  // ───────── 通用 OCR ─────────

  /** 通用印刷体识别 */
  async generalBasicOCR(imageBase64: string) {
    const result = await this.callApi("ocr", "GeneralBasicOCR", {
      ImageBase64: imageBase64,
    });
    return (result?.TextDetections as Array<Record<string, unknown>>) || [];
  }

  /** 通用手写体识别 */
  async generalHandwritingOCR(imageBase64: string) {
    const result = await this.callApi("ocr", "GeneralHandwritingOCR", {
      ImageBase64: imageBase64,
    });
    return (result?.TextDetections as Array<Record<string, unknown>>) || [];
  }

  /** 表格识别 */
  async tableOCR(imageBase64: string) {
    return this.callApi("ocr", "TableOCR", { ImageBase64: imageBase64 });
  }

  /** 古籍识别（通用印刷体适用于仿宋/楷体等古籍常用字体） */
  async ancientBookOCR(imageBase64: string) {
    // 用高精度模式 + 语言提示提升古籍识别准确率
    const result = await this.callApi("ocr", "GeneralAccurateOCR", {
      ImageBase64: imageBase64,
      IsWords: true,
      EnableDetectText: true,
    });
    return (result?.TextDetections as Array<Record<string, unknown>>) || [];
  }

  // ───────── 自然语言处理（NLP） ─────────

  /** 情感分析 */
  async sentimentAnalyze(text: string) {
    const result = await this.callApi("nlp", "SentimentAnalyze", {
      Text: text,
    });
    // Positive/Neutral/Negative
    const r = result as Record<string, unknown> | null;
    return {
      sentiment: (r?.Sentiment as string) || "Neutral",
      positive: (r?.Positive as number) || 0,
      negative: (r?.Negative as number) || 0,
      neutral: (r?.Neutral as number) || 0,
    };
  }

  /** 关键词提取 */
  async extractKeywords(text: string, count = 10) {
    const result = await this.callApi("nlp", "KeywordsExtraction", {
      Text: text,
      Num: count,
    });
    return ((result?.Keywords || []) as Array<Record<string, unknown>>).map((k) => ({
      word: k.Word,
      score: k.Score,
    }));
  }

  /** 文本分类 */
  async classifyText(text: string) {
    const result = await this.callApi("nlp", "ClassifyContent", {
      Title: text.slice(0, 80),
      Content: text,
    });
    const r = result as Record<string, unknown> | null;
    const classes: Array<{ label: string; confidence: number }> = [];
    if (r?.FirstLabel) classes.push({ label: r.FirstLabel as string, confidence: 1 });
    if (r?.SecondLabel) classes.push({ label: r.SecondLabel as string, confidence: 0.8 });
    return classes;
  }

  // ───────── 机器翻译（TMT） ─────────

  /** 文本翻译 */
  async translateText(text: string, sourceLang = "zh", targetLang = "en") {
    const cacheKey = `t:${sourceLang}:${targetLang}:${text}`;
    const cached = this.translateCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const result = await this.callApi("tmt", "TextTranslate", {
      SourceText: text,
      Source: sourceLang,
      Target: targetLang,
      ProjectId: 0,
    });
    const translated = (result?.TargetText as string) || "";
    if (translated) {
      this.translateCache.set(cacheKey, translated, 30 * 60 * 1000);
    }
    return translated;
  }

  /** 批量文本翻译 */
  async translateBatch(texts: string[], sourceLang = "zh", targetLang = "en") {
    const results: string[] = [];
    // 每次最多翻译5000字符
    for (const text of texts) {
      const translated = await this.translateText(text, sourceLang, targetLang);
      results.push(translated);
    }
    return results;
  }

  /** 语种识别 */
  async detectLanguage(text: string) {
    const result = await this.callApi("tmt", "LanguageDetect", {
      Text: text,
      ProjectId: 0,
    });
    const r = result as Record<string, unknown> | null;
    return {
      lang: (r?.Lang as string) || "zh",
      confidence: (r?.Confidence as number) || 0,
    };
  }

  // ───────── AI 调用监控 ─────────

  getCircuitBreakerStatus() {
    const services = ["asr", "ocr", "nlp", "tmt"];
    return services.map((s) => ({ service: s, state: this.circuitBreaker.getState(s) }));
  }

  /** 获取AI使用统计数据 */
  async getAiUsageStats(period: "day" | "week" | "month") {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.logger.log(`获取AI使用统计: period=${period}`);

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const records = await this.prisma.aiAnalysisRecord.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "asc" },
      take: 10000,
    });

    // 模型单价估算（元/千token）
    const modelPrices: Record<string, { inputPer1K: number; outputPer1K: number }> = {
      "deepseek-v4-pro": { inputPer1K: 0.001, outputPer1K: 0.002 },
    };

    let totalCalls = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const byServiceMap: Record<string, { count: number; totalTokens: number; estimatedCost: number }> = {};
    const trendMap: Record<string, { count: number; totalTokens: number }> = {};

    for (const r of records) {
      totalCalls++;
      const service = r.modelName || "unknown";
      const usage = r.tokenUsage as Record<string, unknown>;
      const promptTokens = (usage?.promptTokens as number) || 0;
      const completionTokens = (usage?.completionTokens as number) || 0;
      const tokens = promptTokens + completionTokens;
      totalTokens += tokens;

      const price = modelPrices[r.modelName] || { inputPer1K: 0.001, outputPer1K: 0.002 };
      const cost = (promptTokens * price.inputPer1K + completionTokens * price.outputPer1K) / 1000;
      totalCost += cost;

      if (!byServiceMap[service]) {
        byServiceMap[service] = { count: 0, totalTokens: 0, estimatedCost: 0 };
      }
      byServiceMap[service].count++;
      byServiceMap[service].totalTokens += tokens;
      byServiceMap[service].estimatedCost += cost;

      let dateKey: string;
      if (period === "day") {
        dateKey = `${r.createdAt.getHours().toString().padStart(2, "0")}:00`;
      } else {
        dateKey = `${(r.createdAt.getMonth() + 1).toString().padStart(2, "0")}-${r.createdAt.getDate().toString().padStart(2, "0")}`;
      }
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { count: 0, totalTokens: 0 };
      }
      trendMap[dateKey].count++;
      trendMap[dateKey].totalTokens += tokens;
    }

    const trend = Object.entries(trendMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period,
      totalCalls,
      totalTokens,
      estimatedCost: Math.round(totalCost * 10000) / 10000,
      byService: Object.entries(byServiceMap).map(([service, data]) => ({ service, ...data })),
      trend,
    };
  }

  /** 获取AI调用日志（分页） */
  async getAiCallLogs(page: number, pageSize: number, service?: string) {
    this.logger.log(`查询AI调用日志: page=${page}, pageSize=${pageSize}, service=${service || "all"}`);
    const where: Prisma.AiAnalysisRecordWhereInput = {};
    if (service) {
      where.modelName = service;
    }

    const [records, total] = await Promise.all([
      this.prisma.aiAnalysisRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.aiAnalysisRecord.count({ where }),
    ]);

    return {
      items: records.map((r) => ({
        id: r.id,
        userId: r.userId,
        userNickname: r.user?.nickname || "",
        userAvatar: r.user?.avatar || "",
        analyzeType: r.analyzeType,
        modelName: r.modelName,
        tokenUsage: r.tokenUsage,
        isCached: r.isCached,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 获取AI异常告警 */
  async getAiAbnormalAlerts() {
    this.logger.log("检查AI异常告警");
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const alerts: Array<{ type: string; level: string; message: string; detail: Record<string, unknown>; time: Date }> = [];

    // 1. 单次Token消耗过大（>10000）
    const highTokenRecords = await this.prisma.aiAnalysisRecord.findMany({
      where: { createdAt: { gte: lastDay } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    for (const r of highTokenRecords) {
      const usage = r.tokenUsage as Record<string, unknown>;
      const total = ((usage?.promptTokens as number) || 0) + ((usage?.completionTokens as number) || 0);
      if (total > 10000) {
        alerts.push({
          type: "HIGH_TOKEN_USAGE",
          level: "WARNING",
          message: `单次Token消耗过大: ${total} tokens`,
          detail: { recordId: r.id, userId: r.userId, modelName: r.modelName, tokenUsage: usage },
          time: r.createdAt,
        });
      }
    }

    // 2. 缓存命中率异常（最近1小时缓存未命中率 > 50%）
    const totalCount = await this.prisma.aiAnalysisRecord.count({
      where: { createdAt: { gte: lastHour } },
    });
    if (totalCount > 10) {
      const cacheMissCount = await this.prisma.aiAnalysisRecord.count({
        where: { createdAt: { gte: lastHour }, isCached: false },
      });
      const cacheMissRate = cacheMissCount / totalCount;
      if (cacheMissRate > 0.5) {
        alerts.push({
          type: "CACHE_MISS_HIGH",
          level: "WARNING",
          message: `缓存未命中率偏高: ${(cacheMissRate * 100).toFixed(1)}%`,
          detail: { totalCount, cacheMissCount, cacheMissRate },
          time: now,
        });
      }
    }

    // 3. 调用量异常增长（最近1小时 vs 前一小时）
    const prevHour = new Date(lastHour.getTime() - 60 * 60 * 1000);
    const [currentHourCount, prevHourCount] = await Promise.all([
      this.prisma.aiAnalysisRecord.count({ where: { createdAt: { gte: lastHour } } }),
      this.prisma.aiAnalysisRecord.count({
        where: { createdAt: { gte: prevHour, lt: lastHour } },
      }),
    ]);
    if (prevHourCount > 0 && currentHourCount > prevHourCount * 2 && currentHourCount > 20) {
      alerts.push({
        type: "USAGE_SURGE",
        level: "WARNING",
        message: `调用量异常增长: 最近1小时 ${currentHourCount} 次, 前一小时 ${prevHourCount} 次`,
        detail: {
          currentHourCount,
          prevHourCount,
          growthRate: Number((currentHourCount / prevHourCount).toFixed(2)),
        },
        time: now,
      });
    }

    return {
      total: alerts.length,
      items: alerts.sort((a, b) => b.time.getTime() - a.time.getTime()),
    };
  }

  // ═══════════════════ 圈主助理管理 ═══════════════════

  /** 获取圈主助理审批列表 */
  async getCircleAssistants() {
    const circles = await this.prisma.circle.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        owner: { select: { id: true, nickname: true } },
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { createdAt: "desc" as const },
      take: 1000,
    });

    // 查询每个圈子是否有知识库内容
    const circleIds = circles.map((c) => c.id);
    const knowledgeCounts = circleIds.length > 0
      ? await this.prisma.circleKnowledge.groupBy({
          by: ["circleId"],
          where: { circleId: { in: circleIds }, status: "active" },
          _count: true,
        })
      : [];

    const kMap = new Map(knowledgeCounts.map((k) => [k.circleId, k._count]));

    return circles.map((c) => ({
      circleId: c.id,
      circleName: c.name,
      ownerId: c.ownerId,
      applicantName: c.owner?.nickname || c.ownerId,
      memberCount: c._count.members,
      postCount: c._count.posts,
      knowledgeCount: kMap.get(c.id) || 0,
      status: kMap.has(c.id) ? "APPROVED" : "PENDING",
      createdAt: c.createdAt,
    }));
  }

  /** 审批通过圈主助理 */
  async approveCircleAssistant(circleId: string) {
    // 将 circle 的知识内容标记为 active
    await this.prisma.circleKnowledge.updateMany({
      where: { circleId, status: { not: "active" } },
      data: { status: "active" },
    });
    this.logger.log(`审批通过圈主助理 [circle=${circleId}]`);
    return { circleId, status: "APPROVED" };
  }

  /** 驳回圈主助理 */
  async rejectCircleAssistant(circleId: string, reason?: string) {
    this.logger.log(`驳回圈主助理 [circle=${circleId}] reason=${reason}`);
    return { circleId, status: "REJECTED", reason };
  }

  /** 获取圈子知识库条目 */
  async getKnowledgeBase(circleId: string) {
    const entries = await this.prisma.circleKnowledge.findMany({
      where: { circleId, status: "active" },
      select: { id: true, sourceType: true, content: true, addedBy: true, addedAt: true, updatedAt: true },
      orderBy: { addedAt: "desc" },
    });
    return { circleId, entries, total: entries.length };
  }

  /** 添加知识库条目 */
  async createKnowledgeEntry(circleId: string, data: { title: string; content: string }) {
    const crypto = await import("crypto");
    const contentHash = crypto.createHash("md5").update(data.content).digest("hex");
    const entry = await this.prisma.circleKnowledge.create({
      data: {
        circleId,
        sourceType: "manual",
        content: `[${data.title}] ${data.content}`,
        contentHash,
        addedBy: "ADMIN",
        status: "active",
      },
    });
    this.logger.log(`添加知识库条目 [circle=${circleId}]: ${data.title}`);
    return entry;
  }

  /** 更新知识库条目 */
  async updateKnowledgeEntry(id: string, data: { title?: string; content?: string }) {
    let content: string | undefined;
    if (data.title || data.content) {
      const entry = await this.prisma.circleKnowledge.findUnique({ where: { id }, select: { content: true } });
      if (entry) {
        const title = data.title || entry.content.slice(1, entry.content.indexOf("] "));
        const body = data.content || entry.content.slice(entry.content.indexOf("] ") + 2);
        content = `[${title}] ${body}`;
      }
    }
    return this.prisma.circleKnowledge.update({
      where: { id },
      data: content ? { content } : {},
    });
  }

  /** 删除知识库条目 */
  async deleteKnowledgeEntry(id: string) {
    await this.prisma.circleKnowledge.update({
      where: { id },
      data: { status: "removed" },
    });
    return { deleted: true };
  }

  /** 获取圈子AI使用数据 */
  async getCircleUsage(circleId: string) {
    // 统计该圈子相关的AI调用
    const records = await this.prisma.aiAnalysisRecord.findMany({
      where: {
        analyzeType: { in: ["circle_qa", "classic_qa"] },
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });

    // 统计圈主助理调用（场景为 circle_qa）
    const circleRecords = records.filter((r) => r.analyzeType === "circle_qa");
    const totalConversations = circleRecords.length;
    const totalMessages = circleRecords.length;
    const activeUsers = new Set(circleRecords.map((r) => r.userId)).size;
    const lastCall = circleRecords.length > 0 ? circleRecords[circleRecords.length - 1].createdAt : null;

    const acceptedCount = circleRecords.filter((r) => r.userAccepted === true).length;
    const acceptanceRate = circleRecords.length > 0 ? acceptedCount / circleRecords.length : 0;

    return {
      circleId,
      totalConversations,
      totalMessages,
      activeUsers,
      avgSatisfaction: acceptanceRate,
      lastCallAt: lastCall?.toISOString() ?? null,
    };
  }
}
