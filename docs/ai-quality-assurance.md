# 热卜国学平台 — AI 输出质量保障体系

> 更新时间：2026-05-11 | 基于现有 AiAnalysisRecord/PaipanAiService/BotChatLog 扩展

## 一、总体架构

```
                         ┌───────────────────────────┐
                         │     AI 质检编排器          │
                         │   (Quality Orchestrator)   │
                         └─────────────┬─────────────┘
                                       │
     ┌─────────────┬───────────────────┼───────────────────┬─────────────┐
     │             │                   │                   │             │
┌────▼────┐  ┌─────▼──────┐  ┌───────▼───────┐  ┌───────▼──────┐  ┌───▼────┐
│ RAG     │  │ 幻觉检测   │  │  输出评分     │  │ A/B 模型对比 │  │ 反馈   │
│ 增强检索 │  │ Hallucination│  │  Scoring      │  │ Model Compare│  │ 闭环   │
└─────────┘  └────────────┘  └───────────────┘  └──────────────┘  └────────┘
     │             │                   │                   │             │
     │        ┌────▼────┐        ┌─────▼─────┐       ┌─────▼─────┐       │
     │        │ 事实校验 │        │ 自动评分   │       │ DeepSeek   │       │
     │        │ vs 知识库│        │ (0-100)   │       │ vs 其他    │       │
     │        └─────────┘        └───────────┘       └───────────┘       │
     │                                                                   │
     └───────────────────── 知识库（国学经典/命理/中医） ──────────────────┘
```

### 1.1 核心理念

- **RAG 优先**：AI 回答前检索国学知识库，以权威文献为上下文，减少臆造
- **多维度自动评分**：准确性/完整性/可读性/国学专业性 四维打分
- **幻觉检测**：事实声明的知识库反向校验
- **A/B 模型对比**：多模型并行调用，自动选优
- **人工兜底**：低分回答自动进入审核队列

## 二、RAG 增强检索系统

### 2.1 架构

```
用户提问
    │
    ▼
意图识别（八字排盘/古籍解读/中医咨询/通用问答）
    │
    ├─ 八字类 → 检索命理知识库
    ├─ 古籍类 → 检索经典文本库
    ├─ 中医类 → 检索中医知识库
    └─ 通用   → 检索全量知识库
    │
    ▼
向量检索 (Embedding → Milvus/Qdrant)
    │
    ├─ Top-K 召回 (k=10)
    └─ 重排序 (Cross-Encoder Reranker)
    │
    ▼
构建增强 Prompt:
  系统: 你是国学助手，基于以下参考资料回答...
  参考资料: [检索到的文档片段]
  用户问题: {原始问题}
    │
    ▼
LLM 生成 → 带引用标注的输出
```

### 2.2 Prisma 模型

```prisma
// ── 知识库文档 ──
model KnowledgeDoc {
  id          String   @id @default(uuid())
  title       String
  category    String                        // BAZI/ZIWEI/CLASSIC/TCM/FENGSHUI/GENERAL
  source      String                        // 来源书名/作者
  content     String   @db.Text            // 原始文本（分块前的完整内容）
  chunks      KnowledgeChunk[]
  status      String   @default("ACTIVE")   // ACTIVE/DRAFT/ARCHIVED
  version     Int      @default(1)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category, status])
}

// ── 文档分块（Embedding 粒度） ──
model KnowledgeChunk {
  id          String   @id @default(uuid())
  docId       String
  chunkIndex  Int                           // 分块序号
  content     String   @db.Text            // 分块文本（500-1000字）
  embedding   String?                       // 向量（JSON数组，存于专用向量DB时可为空）
  tokenCount  Int                           // token数量
  createdAt   DateTime @default(now())

  doc KnowledgeDoc @relation(fields: [docId], references: [id], onDelete: Cascade)

  @@index([docId, chunkIndex])
}

// ── AI 回答记录（增强） ──
model AiAnswer {
  id              String   @id @default(uuid())
  userId          String
  scene           String                    // BAZI_ANALYSIS/ZIWEI_ANALYSIS/BOT_CHAT/QA
  refId           String?                   // 关联的业务ID（排盘记录ID/问答ID等）
  userQuery       String                    // 用户原始提问
  systemPrompt    String?                   // 系统提示词
  retrievedChunks Json?                     // 检索到的文档片段 [{ chunkId, docTitle, similarity }]
  modelName       String   @default("deepseek-v4-pro")
  answer          String   @db.Text        // AI 原始回答
  tokenUsage      Json?                     // { promptTokens, completionTokens, totalTokens }
  latencyMs       Int?                      // 响应耗时

  // 质量评估
  qualityScore    Float?                    // 综合质量分(0-100)
  qualityDetail   Json?                     // 各维度得分明细
  hallucinationFlags Json?                  // 幻觉标记 [{ claim, evidence, verdict }]

  // 用户反馈
  userRating      Int?                      // 用户评分(1-5)
  userFeedback    String?                   // 用户反馈文本

  // 状态
  reviewStatus    String?  @default("AUTO_PASSED") // AUTO_PASSED/PENDING_REVIEW/REVIEWED/FLAGGED
  reviewedBy      String?
  reviewedAt      DateTime?

  createdAt       DateTime @default(now())

  @@index([userId, createdAt])
  @@index([scene, reviewStatus])
  @@index([qualityScore])
}

// ── AI 质量规则 ──
model AiQualityRule {
  id          String   @id @default(uuid())
  name        String
  scene       String?                       // 适用场景，留空=全局
  dimension   String                        // ACCURACY/COMPLETENESS/READABILITY/PROFESSIONALISM
  ruleType    String                        // REGEX/KEYWORD/LLM_CHECK/STRUCTURAL
  config      Json                          // 规则配置
  weight      Float    @default(1.0)        // 权重
  threshold   Float?                        // 阈值（低于此值触发告警）
  isEnabled   Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([scene, dimension, isEnabled])
}

// ── A/B 模型实验 ──
model AiModelExperiment {
  id          String   @id @default(uuid())
  name        String
  scene       String
  modelA      String                        // 基准模型
  modelB      String                        // 挑战模型
  trafficPct  Int      @default(50)         // 模型B流量占比
  startAt     DateTime
  endAt       DateTime?
  winnerModel String?                       // 最终胜出模型
  status      String   @default("RUNNING")  // RUNNING/COMPLETED/STOPPED
  createdAt   DateTime @default(now())

  @@index([scene, status])
}
```

## 三、多维度自动评分

### 3.1 评分维度

| 维度 | 说明 | 自动评估方式 |
|------|------|------------|
| **准确性** (40%) | 命理/古籍引用是否正确 | 关键事实 vs 知识库校验 |
| **完整性** (25%) | 是否覆盖用户问题的所有方面 | 结构化输出验证（必填字段检查） |
| **可读性** (20%) | 语言流畅、层次清晰、用户友好 | 可读性公式 + LLM 评估 |
| **专业性** (15%) | 是否使用国学专业术语、引用经典 | 术语词典匹配 + LLM 评估 |

### 3.2 评分引擎

```typescript
// apps/server/src/modules/ai/quality-scorer.service.ts

@Injectable()
export class QualityScorerService {
  constructor(
    private prisma: PrismaService,
    private knowledgeBase: KnowledgeBaseService,
  ) {}

  /** 对 AI 回答进行多维度评分 */
  async scoreAnswer(answer: AiAnswer): Promise<QualityScoreResult> {
    const rules = await this.prisma.aiQualityRule.findMany({
      where: {
        isEnabled: true,
        scene: { in: [answer.scene, null] },
      },
    });

    const scores: DimensionScore[] = [];

    // 1. 准确性评分
    const accuracyScore = await this.scoreAccuracy(answer, rules.filter(r => r.dimension === 'ACCURACY'));
    scores.push(accuracyScore);

    // 2. 完整性评分
    const completenessScore = await this.scoreCompleteness(answer, rules.filter(r => r.dimension === 'COMPLETENESS'));
    scores.push(completenessScore);

    // 3. 可读性评分
    const readabilityScore = this.scoreReadability(answer, rules.filter(r => r.dimension === 'READABILITY'));
    scores.push(readabilityScore);

    // 4. 专业性评分
    const professionalismScore = this.scoreProfessionalism(answer, rules.filter(r => r.dimension === 'PROFESSIONALISM'));
    scores.push(professionalismScore);

    // 加权汇总
    const weights = { ACCURACY: 0.4, COMPLETENESS: 0.25, READABILITY: 0.2, PROFESSIONALISM: 0.15 };
    const overallScore = scores.reduce((sum, s) => sum + s.score * weights[s.dimension], 0);

    const result: QualityScoreResult = {
      overallScore: Math.round(overallScore),
      dimensions: scores,
      reviewNeeded: overallScore < 60, // 低于60分进入人工审核
      flags: this.generateFlags(scores),
    };

    // 更新回答记录
    await this.prisma.aiAnswer.update({
      where: { id: answer.id },
      data: {
        qualityScore: result.overallScore,
        qualityDetail: result as any,
        reviewStatus: result.reviewNeeded ? 'PENDING_REVIEW' : 'AUTO_PASSED',
      },
    });

    return result;
  }

  /** 准确性：关键事实 vs 知识库 */
  private async scoreAccuracy(answer: AiAnswer, rules: AiQualityRule[]): Promise<DimensionScore> {
    // 1. 从回答中提取事实声明 (NER + 模式匹配)
    const claims = this.extractClaims(answer.answer);

    // 2. 在知识库中检索验证每条声明
    let verifiedCount = 0;
    for (const claim of claims) {
      const evidence = await this.knowledgeBase.search(claim.text, { topK: 3, threshold: 0.85 });
      if (evidence.length > 0) verifiedCount++;
    }

    const accuracyRate = claims.length > 0 ? verifiedCount / claims.length : 1.0;

    return {
      dimension: 'ACCURACY',
      score: Math.round(accuracyRate * 100),
      detail: { totalClaims: claims.length, verifiedCount, unverifiedClaims: claims.filter(c => !c.verified).map(c => c.text) },
    };
  }

  /** 可读性：Flesch-Kincaid 中文版 + 格式检查 */
  private scoreReadability(answer: AiAnswer, rules: AiQualityRule[]): DimensionScore {
    const text = answer.answer;

    // 段落长度检查（单段不超过 500 字）
    const paragraphs = text.split(/\n\n+/);
    const longParagraphs = paragraphs.filter(p => p.length > 500);

    // 句子长度检查（单句不超过 80 字）
    const sentences = text.split(/[。！？；]/).filter(Boolean);
    const longSentences = sentences.filter(s => s.length > 80);

    // 格式检查（是否有层级标题、分段、标点规范）
    const hasStructure = /#{1,3}\s/.test(text) || paragraphs.length >= 3;
    const hasMarkdownFormatting = /[*_`-]/.test(text);

    const score = 100
      - longParagraphs.length * 5
      - longSentences.length * 2
      + (hasStructure ? 10 : 0)
      + (hasMarkdownFormatting ? 5 : 0);

    return {
      dimension: 'READABILITY',
      score: Math.max(0, Math.min(100, score)),
      detail: { paragraphs, longParagraphs: longParagraphs.length, longSentences: longSentences.length },
    };
  }

  /** 专业性：国学术语覆盖 */
  private scoreProfessionalism(answer: AiAnswer, rules: AiQualityRule[]): DimensionScore {
    const text = answer.answer;
    // 加载国学术语词典（天干地支、五行、十神、格局等）
    const termDict = this.loadGuoxueTermDict();

    const matchedTerms: string[] = [];
    for (const term of termDict) {
      if (text.includes(term)) matchedTerms.push(term);
    }

    // 期望回答至少覆盖用户问题相关的核心术语
    const score = Math.min(100, matchedTerms.length * 10);

    return {
      dimension: 'PROFESSIONALISM',
      score,
      detail: { matchedTerms, termCount: matchedTerms.length },
    };
  }

  /** 从回答文本中提取事实声明 */
  private extractClaims(text: string): Claim[] {
    const claims: Claim[] = [];
    // 匹配常见的事实声明模式
    const patterns = [
      /《([^》]+)》/g,                         // 古籍引用
      /(\d{4})年/g,                            // 年代声明
      /([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年/g,  // 干支纪年
      /"(.[^"]{10,})"/g,                       // 引用声明
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        claims.push({ text: match[1] || match[0], startPos: match.index, verified: false });
      }
    }
    return claims;
  }

  private generateFlags(scores: DimensionScore[]): string[] {
    const flags: string[] = [];
    for (const s of scores) {
      if (s.score < 40) flags.push(`${s.dimension}_CRITICAL`);
      else if (s.score < 60) flags.push(`${s.dimension}_LOW`);
    }
    return flags;
  }

  private loadGuoxueTermDict(): string[] {
    // 国学垂直领域术语库（从知识库 + 人工整理）
    return [
      '天干', '地支', '五行', '用神', '忌神', '格局', '十神',
      '正官', '偏财', '正印', '食神', '伤官', '七杀', '劫财', '比肩',
      '大运', '流年', '命宫', '身宫', '胎元',
      '甲木', '乙木', '丙火', '丁火', '戊土', '己土', '庚金', '辛金', '壬水', '癸水',
      '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门',
      '天相', '天梁', '七杀', '破军', '禄存', '天马', '左辅', '右弼', '文昌', '文曲',
      '易经', '乾卦', '坤卦', '太极', '阴阳', '八卦', '六十四卦',
    ];
  }
}

interface DimensionScore {
  dimension: 'ACCURACY' | 'COMPLETENESS' | 'READABILITY' | 'PROFESSIONALISM';
  score: number;
  detail: Record<string, unknown>;
}

interface QualityScoreResult {
  overallScore: number;
  dimensions: DimensionScore[];
  reviewNeeded: boolean;
  flags: string[];
}

interface Claim {
  text: string;
  startPos: number;
  verified: boolean;
}
```

## 四、幻觉检测

### 4.1 检测策略

| 幻觉类型 | 定义 | 检测方法 |
|---------|------|---------|
| **事实错误** | 引用不存在的古籍/错配干支 | 知识库反向检索 + NER 校验 |
| **逻辑矛盾** | 前后矛盾的命理推断 | LLM 自检（self-check） |
| **数值错误** | 干支排盘计算结果错误 | 与 bazi-engine 标准输出对比 |
| **凭空捏造** | 编造不存在的经典引用 | 引用格式正则 + 知识库验证 |

### 4.2 幻觉检测服务

```typescript
// apps/server/src/modules/ai/hallucination-detector.service.ts

@Injectable()
export class HallucinationDetectorService {
  constructor(
    private knowledgeBase: KnowledgeBaseService,
    private aiService: AiService,
  ) {}

  /** 对 AI 回答进行幻觉检测 */
  async detect(answer: AiAnswer): Promise<HallucinationReport> {
    const flags: HallucinationFlag[] = [];

    // 1. 古籍引用校验
    const citations = this.extractCitations(answer.answer);
    for (const cite of citations) {
      const exists = await this.knowledgeBase.verifyCitation(cite.title, cite.excerpt);
      if (!exists) {
        flags.push({
          type: 'FABRICATED_CITATION',
          claim: `《${cite.title}》`,
          evidence: '知识库未找到该古籍或匹配内容',
          verdict: 'HALLUCINATION',
        });
      }
    }

    // 2. 干支/五行事实校验
    const ganzhiClaims = this.extractGanzhiClaims(answer.answer);
    for (const claim of ganzhiClaims) {
      const valid = await this.knowledgeBase.verifyGanzhiClaim(claim);
      if (!valid) {
        flags.push({
          type: 'GANZHI_ERROR',
          claim: claim.text,
          evidence: '干支/五行知识库校验未通过',
          verdict: 'HALLUCINATION',
        });
      }
    }

    // 3. LLM 自检（让另一个 LLM 验证）
    const selfCheckResult = await this.selfCheck(answer);
    flags.push(...selfCheckResult.flags);

    return {
      answerId: answer.id,
      totalFlags: flags.length,
      flags,
      hallucinationScore: this.calculateHallucinationScore(flags, answer.answer),
    };
  }

  /** 提取古籍引用 */
  private extractCitations(text: string): Array<{ title: string; excerpt: string }> {
    const citations: Array<{ title: string; excerpt: string }> = [];
    const regex = /《([^》]{1,30})》[^。]*[：:]["“]([^"”]{5,50})["”]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      citations.push({ title: match[1], excerpt: match[2] });
    }
    return citations;
  }

  /** LLM 自检 */
  private async selfCheck(answer: AiAnswer): Promise<{ flags: HallucinationFlag[] }> {
    const prompt = `请检查以下国学AI回答是否存在事实错误：
---
${answer.answer}
---
请列出所有可能的事实错误或可疑声明。如果回答完全正确，回复"无错误"。`;

    const checkResult = await this.aiService.callLLM(prompt, { temperature: 0.1, maxTokens: 500 });
    // 解析自检结果...
    return { flags: [] };
  }

  private calculateHallucinationScore(flags: HallucinationFlag[], answer: string): number {
    // 基于幻觉数量/严重程度计算 0-100（越高越可信）
    const severityWeights = { FABRICATED_CITATION: 25, GANZHI_ERROR: 20, LOGIC_CONTRADICTION: 15, NUMERIC_ERROR: 10 };
    const totalPenalty = flags.reduce((sum, f) => sum + (severityWeights[f.type] || 5), 0);
    return Math.max(0, 100 - totalPenalty);
  }
}

interface HallucinationFlag {
  type: 'FABRICATED_CITATION' | 'GANZHI_ERROR' | 'LOGIC_CONTRADICTION' | 'NUMERIC_ERROR' | 'SUSPICIOUS_CLAIM';
  claim: string;
  evidence: string;
  verdict: 'HALLUCINATION' | 'SUSPICIOUS' | 'CORRECT';
}

interface HallucinationReport {
  answerId: string;
  totalFlags: number;
  flags: HallucinationFlag[];
  hallucinationScore: number;
}
```

## 五、人工审核工作流

### 5.1 触发审核的条件

| 条件 | 动作 |
|------|------|
| 综合质量分 < 60 | 自动进入审核队列 |
| 准确性维度 < 40 | 自动进入审核队列 |
| 幻觉检测标记 ≥ 2 个 | 自动进入审核队列 |
| 用户评分 = 1 星 | 自动进入审核队列 |
| 用户举报 | 立即进入审核队列 |

### 5.2 审核工作流

```
AI回答生成
    │
    ▼
自动评分 + 幻觉检测
    │
    ├─ 高分 + 无幻觉 → AUTO_PASSED → 直接返回用户
    │
    └─ 低分 / 有幻觉 → PENDING_REVIEW
                          │
                    ┌─────▼─────┐
                    │  审核队列   │
                    │ (按优先级)  │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  人工审核   │
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
         通过 (修正后)   驳回        升级
              │           │           │
         返回用户      记录原因     通知管理员
                      通知AI团队   修复知识库
```

### 5.3 审核管理 API

```
GET    /api/v1/admin/ai/review-queue          — 待审核列表
GET    /api/v1/admin/ai/review-queue/:id      — 审核详情
POST   /api/v1/admin/ai/review-queue/:id/approve — 通过（可附修正文本）
POST   /api/v1/admin/ai/review-queue/:id/reject  — 驳回（须填原因）
GET    /api/v1/admin/ai/quality-stats         — 质量统计
GET    /api/v1/admin/ai/flagged-answers       — 标记的回答列表
```

## 六、A/B 模型对比框架

### 6.1 对比流程

```
用户提问
    │
    ├─→ 模型A (基准) 生成回答_A
    └─→ 模型B (挑战) 生成回答_B
    │
    ▼
同时评分 (QualityScorer)
    │
    ▼
盲评对比 (可选：LLM Judge)
    │
    ▼
记录对比结果 → 更新实验统计
    │
    ▼
胜出判定: 回答_B 评分 > 回答_A 评分 × 1.05 → B 胜
```

### 6.2 实现

```typescript
@Injectable()
export class AiModelCompareService {

  /** 并行调用两个模型，对比输出质量 */
  async compareModels(query: string, context: string, experiment: AiModelExperiment): Promise<CompareResult> {
    const [resultA, resultB] = await Promise.all([
      this.callModel(experiment.modelA, query, context),
      this.callModel(experiment.modelB, query, context),
    ]);

    // 双盲评分
    const [scoreA, scoreB] = await Promise.all([
      this.scorer.scoreAnswer(resultA),
      this.scorer.scoreAnswer(resultB),
    ]);

    // LLM Judge 评估（哪个回答更好）
    const judgeResult = await this.llmJudge(query, resultA.answer, resultB.answer);

    return {
      modelA: { name: experiment.modelA, score: scoreA.overallScore, latency: resultA.latencyMs },
      modelB: { name: experiment.modelB, score: scoreB.overallScore, latency: resultB.latencyMs },
      winner: judgeResult.winner,
      judgeReasoning: judgeResult.reasoning,
    };
  }

  /** LLM Judge：盲评两个回答 */
  private async llmJudge(query: string, answerA: string, answerB: string): Promise<{ winner: string; reasoning: string }> {
    const prompt = `你是一个国学AI回答的质量评审专家。请比较以下两个回答（不考虑顺序），从准确性、完整性、可读性、专业性四个维度评判哪个更好。

用户问题: ${query}

回答A:
${answerA}

回答B:
${answerB}

请回复JSON格式: { "winner": "A" | "B" | "TIE", "reasoning": "评判理由" }`;

    const result = await this.aiService.callLLM(prompt, { temperature: 0, maxTokens: 300 });
    return JSON.parse(result);
  }
}
```

## 七、用户反馈闭环

### 7.1 反馈收集

```
用户收到AI回答
    │
    ▼
展示评分组件: ⭐⭐⭐⭐⭐ + [举报错误] [补充信息]
    │
    ├─ 5星 → 记录正面反馈，提升该模型权重
    ├─ 4星 → 记录
    ├─ 3星 → 记录
    ├─ 2星 → 记录 + 标记为"需关注"
    ├─ 1星 → 自动进入审核队列
    └─ 举报 → 立即暂停该回答展示 + 进入审核队列
```

### 7.2 反馈驱动的改进

```typescript
@Injectable()
export class AiFeedbackService {

  /** 分析负面反馈趋势 */
  async analyzeNegativeTrends(days: number = 7): Promise<TrendReport> {
    const sinceDate = dayjs().subtract(days, 'day').toDate();

    const negativeAnswers = await this.prisma.aiAnswer.findMany({
      where: {
        createdAt: { gte: sinceDate },
        OR: [
          { userRating: { lte: 2 } },
          { reviewStatus: 'FLAGGED' },
        ],
      },
    });

    // 按场景分组统计
    const byScene = this.groupBy(negativeAnswers, 'scene');

    // 按错误类型聚类（使用简单的关键词聚类）
    const clusters = this.clusterByErrorType(negativeAnswers);

    return {
      totalNegatives: negativeAnswers.length,
      byScene,
      topErrorClusters: clusters.slice(0, 5),
      recommendation: this.generateRecommendation(clusters),
    };
  }

  /** 反馈驱动的知识库补全建议 */
  async suggestKnowledgeGaps(): Promise<KnowledgeGap[]> {
    // 分析幻觉标记中的知识缺失模式
    const hallucinations = await this.prisma.aiAnswer.findMany({
      where: {
        hallucinationFlags: { not: null },
        reviewStatus: 'REVIEWED',
      },
    });

    const gapPatterns = this.extractGapPatterns(hallucinations);

    return gapPatterns.map(gap => ({
      category: gap.category,
      suggestedTopic: gap.topic,
      missingCitations: gap.citations,
      priority: gap.frequency > 10 ? 'HIGH' : 'MEDIUM',
    }));
  }
}
```

## 八、监控仪表盘

### 8.1 关键质量指标 (KQI)

| 指标 | 计算方式 | 告警阈值 |
|------|---------|---------|
| 自动通过率 | AUTO_PASSED / 总量 | < 80% |
| 平均质量分 | AVG(qualityScore) | < 70 |
| 幻觉率 | 有幻觉标记的回答 / 总量 | > 10% |
| 用户满意度 | AVG(userRating) | < 3.5 |
| 人工审核积压 | PENDING_REVIEW 数量 | > 50 |
| 平均审核时长 | AVG(reviewedAt - createdAt) | > 4h |

### 8.2 Grafana 面板

```promql
# AI 质量分趋势（按场景）
avg(ai_quality_score) by (scene)

# 幻觉率趋势
sum(rate(ai_hallucination_flags_total[1h])) / sum(rate(ai_answers_total[1h]))

# 用户满意度趋势
avg(ai_user_rating) by (scene)

# 审核队列积压
ai_review_queue_size
```

## 九、实现优先级

| 阶段 | 范围 | 预估 |
|------|------|------|
| V1 | 基础评分引擎（准确性+可读性）+ 知识库文档模型 + 古籍引用校验 | 2周 |
| V2 | RAG 检索增强（向量检索 + 重排序）+ 幻觉检测 | 2周 |
| V3 | A/B 模型对比 + LLM Judge + 人工审核工作流 | 1.5周 |
| V4 | 用户反馈闭环 + 知识库自动补全建议 + 质量监控面板 | 1.5周 |
