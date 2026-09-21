import { Injectable, Inject, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PILLAR_LABEL } from "@guoxue/bazi-engine";
import type { BaziResult } from "@guoxue/bazi-engine";
import type { ZiweiResult } from "@guoxue/ziwei-engine";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { MetricsService } from "../../common/metrics.service";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { getSchool } from "./bazi-schools";
import { extractCoupleFacts, formatCoupleFacts, coupleSignals, stripBirthDetails, SCENE_LABEL, SCENE_SIDES, type CoupleScene } from "./couple-facts";
import { PaipanReportKnowledgeService } from "./paipan-report-knowledge.service";
import { safePagination } from "../../common/pagination";
// 合规修复(后端审计P1·R4红线)：通用命理分析主路径原漏挂免责声明，此处统一在返回点追加。
import { RISK_DISCLAIMER } from "../../common/ai-disclaimer";

/** 通用八字分析的 system prompt（保持现行行为，一个字不改） */
const GENERAL_SYSTEM_PROMPT =
  "你是一位精通中国传统八字命理学的资深专家，擅长根据八字排盘结果进行详细专业的命理分析。请用简体中文回答，语言专业但通俗易懂，多举实例，给出实用的人生建议。";

/**
 * AI 排盘解析服务
 *
 * 使用 DeepSeek API（OpenAI 兼容协议）对八字排盘结果进行 AI 命理分析。
 * API Key 从环境变量 DEEPSEEK_API_KEY 读取，未配置时返回友好提示。
 */
@Injectable()
export class PaipanAiService {
  private apiKey: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Optional() @Inject(MetricsService) private metrics?: MetricsService,
    @Optional() private coin?: CoinService,
    // 合婚报告要像其余六个工具那样站在已审核的知识条目上，而不是模型自说自话。
    // 标 @Optional 是为了不影响现有单测的构造方式：取不到就退回纯模型作答。
    @Optional() private reportKnowledge?: PaipanReportKnowledgeService,
  ) {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
  }

  /**
   * 对八字排盘结果进行 AI 分析
   * @param userId 用户 ID
   * @param paipanRecordId 排盘记录 ID
   * @param baziResult 排盘结果
   * @param school 流派 id（ziping/mangpai/xinpai）；缺省=现行通用分析，行为完全不变
   * @returns 分析结果
   */
  async analyzeBazi(
    userId: string,
    paipanRecordId: string,
    baziResult: BaziResult,
    school?: string,
  ) {
    // AI 师徒：传入流派时走多流派虚拟师父点评分支（缺省=通用分析，全兼容）
    if (school) {
      return this.analyzeBaziBySchool(userId, paipanRecordId, baziResult, school);
    }
    // 检查是否已有分析记录，避免重复调用 API
    const existing = await this.prisma.aiAnalysisRecord.findFirst({
      where: { userId, paipanRecordId, analyzeType: "GENERAL" },
    });
    if (existing) {
      return {
        id: existing.id,
        analysisContent: existing.analysisContent + RISK_DISCLAIMER,
        createdAt: existing.createdAt,
        isCached: true,
      };
    }

    // 无 API Key 返回友好提示
    if (!this.apiKey) {
      const record = await this.prisma.aiAnalysisRecord.create({
        data: {
          userId,
          paipanRecordId,
          analyzeType: "GENERAL",
          analysisContent: "AI解析服务暂未配置，请联系管理员",
          isCached: false,
        },
      });
      return {
        id: record.id,
        analysisContent: record.analysisContent + RISK_DISCLAIMER,
        createdAt: record.createdAt,
        isCached: false,
      };
    }

    // 构建 prompt 并调用 API
    const prompt = this.buildPrompt(baziResult);
    const { content, tokenUsage } = await this.callDeepSeek(prompt);

    // 保存分析结果
    const record = await this.prisma.aiAnalysisRecord.create({
      data: {
        userId,
        paipanRecordId,
        analyzeType: "GENERAL",
        analysisContent: content,
        tokenUsage: tokenUsage as any,
        isCached: false,
      },
    });

    return {
      id: record.id,
      analysisContent: record.analysisContent + RISK_DISCLAIMER,
      createdAt: record.createdAt,
      isCached: false,
    };
  }

  /** 每用户每日流派点评合计上限（默认 10 次，可用环境变量覆盖） */
  private schoolDailyLimit(): number {
    const n = parseInt(process.env.PAIPAN_SCHOOL_ANALYZE_FREE_DAILY || "10", 10);
    return Number.isInteger(n) && n > 0 ? n : 10;
  }

  /** 追加流派点评单价（国学币/次，默认 30，可用环境变量覆盖——2026-07-03 用户拍板） */
  private schoolPriceCoin(): number {
    const n = parseInt(process.env.PAIPAN_SCHOOL_PRICE_COIN || "30", 10);
    return Number.isInteger(n) && n > 0 ? n : 30;
  }

  /** 是否有效会员（终身会员 memberExpire 为空；到期视为失效）——与 bot.service.consumeQuota 同款判定 */
  private async isActiveMember(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, memberExpire: true },
    });
    if (!user?.memberLevel || user.memberLevel === "NONE") return false;
    return !user.memberExpire || user.memberExpire > new Date();
  }

  /**
   * AI 师徒：多流派虚拟师父点评
   *
   * - 缓存键含 school：同一命盘不同流派各自独立缓存，不互相命中
   * - 每日限额：每用户每日流派点评合计上限（Redis 计数，按天过期），缓存命中不计数
   * - 复用 AiAnalysisRecord 存储，analyzeType=BAZI_SCHOOL，记录 school 字段
   */
  async analyzeBaziBySchool(
    userId: string,
    paipanRecordId: string,
    baziResult: BaziResult,
    school: string,
  ) {
    const schoolDef = getSchool(school);
    if (!schoolDef) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的流派：${school}`);
    }

    // 缓存：同盘同流派已有点评直接返回（缓存键含 school，不同流派不互相命中）
    const existing = await this.prisma.aiAnalysisRecord.findFirst({
      where: { userId, paipanRecordId, analyzeType: "BAZI_SCHOOL", school },
    });
    if (existing) {
      return {
        id: existing.id,
        school: schoolDef.id,
        master: schoolDef.master,
        schoolName: schoolDef.name,
        analysisContent: existing.analysisContent + RISK_DISCLAIMER,
        createdAt: existing.createdAt,
        isCached: true,
      };
    }

    // 每日限额：每用户每日流派点评（school 非空）合计上限，Redis key 按天过期
    const now = new Date();
    const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ttlSeconds = Math.max(60, Math.ceil((endOfDay.getTime() - now.getTime()) / 1000));
    const { count } = await this.redis.incrWithTtl(
      `paipan:school-analyze:${userId}:${dateKey}`,
      ttlSeconds,
    );
    if (count > this.schoolDailyLimit()) {
      throw new BusinessException(ErrorCode.RATE_LIMITED, "今日请师父看盘次数已用完，明日再来");
    }

    // 无 API Key 返回友好提示（与通用分析行为一致）
    if (!this.apiKey) {
      const record = await this.prisma.aiAnalysisRecord.create({
        data: {
          userId,
          paipanRecordId,
          analyzeType: "BAZI_SCHOOL",
          school: schoolDef.id,
          analysisContent: "AI解析服务暂未配置，请联系管理员",
          isCached: false,
        },
      });
      return {
        id: record.id,
        school: schoolDef.id,
        master: schoolDef.master,
        schoolName: schoolDef.name,
        analysisContent: record.analysisContent + RISK_DISCLAIMER,
        createdAt: record.createdAt,
        isCached: false,
      };
    }

    // ── 计费闸门（2026-07-03 用户拍板）：每盘首份流派点评免费（任选一派，体验钩子）；
    //    追加其他流派 → 有效会员免费 / 非会员扣国学币（单价 PAIPAN_SCHOOL_PRICE_COIN，默认 30 币/次）──
    const priceCoin = this.schoolPriceCoin();
    let chargeCoin = 0;
    const schoolCount = await this.prisma.aiAnalysisRecord.count({
      where: { userId, paipanRecordId, analyzeType: "BAZI_SCHOOL" },
    });
    if (schoolCount > 0 && !(await this.isActiveMember(userId))) {
      if (!this.coin) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "计费服务不可用，请稍后再试");
      }
      // 调 AI 前预检余额：明知不足不烧 AI 成本（最终扣减仍以事务内原子扣减为准，防并发透支）
      const { balance } = await this.coin.getBalance(userId);
      if (balance < priceCoin) {
        throw new BusinessException(
          ErrorCode.COIN_BALANCE_INSUFFICIENT,
          `国学币不足，追加师父点评需 ${priceCoin} 币`,
        );
      }
      chargeCoin = priceCoin;
    }

    // 构建流派 prompt 并调用 API（师父人设写入 system prompt）
    const prompt = schoolDef.buildPrompt(baziResult);
    const { content, tokenUsage } = await this.callDeepSeek(prompt, schoolDef.systemPrompt);

    // AI 成功后再扣币：扣币与分析记录创建包在同一事务（原子）——
    // 扣币失败（并发把余额花光）→ 整体回滚，不落记录不返回结果；AI 失败则根本未扣币，无需退币
    let record: { id: string; analysisContent: string; createdAt: Date };
    try {
      record = await this.prisma.$transaction(async (tx) => {
        if (chargeCoin > 0) {
          await this.coin!.spend(
            userId,
            {
              amountCoin: chargeCoin,
              scene: "BOT_CALL",
              refId: paipanRecordId,
              description: `AI师徒·${schoolDef.master}（${schoolDef.name}）追加点评`,
            },
            tx,
          );
        }
        return tx.aiAnalysisRecord.create({
          data: {
            userId,
            paipanRecordId,
            analyzeType: "BAZI_SCHOOL",
            school: schoolDef.id,
            analysisContent: content,
            tokenUsage: tokenUsage as any,
            isCached: false,
          },
        });
      });
    } catch (err) {
      // 并发防重：同盘同流派唯一约束冲突（P2002）——两请求同时越过缓存查询各自生成点评时触发。
      // 事务整体回滚（扣币在事务内，天然不重复扣币），幂等返回已落库的那一份点评。
      if (isUniqueConstraintError(err)) {
        const dup = await this.prisma.aiAnalysisRecord.findFirst({
          where: { userId, paipanRecordId, analyzeType: "BAZI_SCHOOL", school },
        });
        if (dup) {
          return {
            id: dup.id,
            school: schoolDef.id,
            master: schoolDef.master,
            schoolName: schoolDef.name,
            analysisContent: dup.analysisContent,
            createdAt: dup.createdAt,
            isCached: true,
            costCoin: 0,
          };
        }
      }
      // 统一余额不足文案（并发透支兜底路径），message 带单价供前端 toast
      if (err instanceof BusinessException && err.errorCode === ErrorCode.COIN_BALANCE_INSUFFICIENT) {
        throw new BusinessException(
          ErrorCode.COIN_BALANCE_INSUFFICIENT,
          `国学币不足，追加师父点评需 ${priceCoin} 币`,
        );
      }
      throw err;
    }

    return {
      id: record.id,
      school: schoolDef.id,
      master: schoolDef.master,
      schoolName: schoolDef.name,
      analysisContent: record.analysisContent + RISK_DISCLAIMER,
      createdAt: record.createdAt,
      isCached: false,
      costCoin: chargeCoin,
    };
  }

  /** 根据分析记录 ID 获取单条分析 */
  async getAnalysisRecord(id: string, userId: string) {
    const record = await this.prisma.aiAnalysisRecord.findFirst({
      where: { id, userId },
      select: {
        id: true,
        paipanRecordId: true,
        analyzeType: true,
        analysisContent: true,
        modelName: true,
        tokenUsage: true,
        isCached: true,
        createdAt: true,
      },
    });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "分析记录不存在");
    return record;
  }

  /**
   * 根据排盘记录 ID 获取 AI 分析结果
   * @param school 指定流派时返回该流派点评；缺省时排除流派点评，维持通用分析的现行语义
   */
  async getAnalysisByPaipanRecord(paipanRecordId: string, userId: string, school?: string) {
    const record = await this.prisma.aiAnalysisRecord.findFirst({
      where: school
        ? { paipanRecordId, userId, analyzeType: "BAZI_SCHOOL", school }
        : { paipanRecordId, userId, NOT: { analyzeType: "BAZI_SCHOOL" } },
      select: {
        id: true,
        paipanRecordId: true,
        analyzeType: true,
        school: true,
        analysisContent: true,
        modelName: true,
        tokenUsage: true,
        isCached: true,
        createdAt: true,
      },
    });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "该排盘记录暂无 AI 分析结果");
    return {
      ...record,
      master: record.school ? getSchool(record.school)?.master ?? null : null,
    };
  }

  /**
   * 获取某排盘记录的全部 AI 分析（通用 + 各流派点评，含 school/master 标注）
   * 供前端多流派对照展示；附 pricing 计费元数据（首份免费/单价/会员），供前端追加点评确认弹窗
   */
  async getAnalysesByPaipanRecord(paipanRecordId: string, userId: string) {
    const [records, isMember] = await Promise.all([
      this.prisma.aiAnalysisRecord.findMany({
        where: { paipanRecordId, userId },
        select: {
          id: true,
          paipanRecordId: true,
          analyzeType: true,
          school: true,
          analysisContent: true,
          isCached: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      this.isActiveMember(userId),
    ]);
    const items = records.map((r) => {
      const schoolDef = r.school ? getSchool(r.school) : undefined;
      return {
        ...r,
        master: schoolDef?.master ?? null,
        schoolName: schoolDef?.name ?? null,
      };
    });
    return {
      items,
      total: items.length,
      pricing: {
        // 该盘尚无任何流派点评 → 下一份免费（体验钩子）
        firstFree: !records.some((r) => r.analyzeType === "BAZI_SCHOOL"),
        priceCoin: this.schoolPriceCoin(),
        isMember,
      },
    };
  }

  /** 获取用户 AI 分析历史 */
  async getUserAnalysisHistory(
    userId: string,
    rawPage = 1,
    rawPageSize = 20,
    type?: string,
  ) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: any = { userId };
    if (type) where.paipanRecord = { type };

    const [records, total] = await Promise.all([
      this.prisma.aiAnalysisRecord.findMany({
        where,
        select: {
          id: true,
          paipanRecordId: true,
          analyzeType: true,
          isCached: true,
          createdAt: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.aiAnalysisRecord.count({ where }),
    ]);

    return { records, total, page, pageSize };
  }

  /**
   * 对紫微斗数排盘结果进行 AI 分析
   */
  async analyzeZiwei(
    userId: string,
    paipanRecordId: string,
    ziweiResult: ZiweiResult,
  ) {
    const existing = await this.prisma.aiAnalysisRecord.findFirst({
      where: { userId, paipanRecordId, analyzeType: "ZIWEI_GENERAL" },
    });
    if (existing) {
      return {
        id: existing.id,
        analysisContent: existing.analysisContent + RISK_DISCLAIMER,
        createdAt: existing.createdAt,
        isCached: true,
      };
    }

    if (!this.apiKey) {
      const record = await this.prisma.aiAnalysisRecord.create({
        data: {
          userId,
          paipanRecordId,
          analyzeType: "ZIWEI_GENERAL",
          analysisContent: "AI解析服务暂未配置，请联系管理员",
          isCached: false,
        },
      });
      return { id: record.id, analysisContent: record.analysisContent + RISK_DISCLAIMER, createdAt: record.createdAt, isCached: false };
    }

    const prompt = this.buildZiweiPrompt(ziweiResult);
    const { content, tokenUsage } = await this.callDeepSeek(prompt);

    const record = await this.prisma.aiAnalysisRecord.create({
      data: {
        userId,
        paipanRecordId,
        analyzeType: "ZIWEI_GENERAL",
        analysisContent: content,
        tokenUsage: tokenUsage as any,
        isCached: false,
      },
    });

    return { id: record.id, analysisContent: record.analysisContent + RISK_DISCLAIMER, createdAt: record.createdAt, isCached: false };
  }

  /** 构建紫微斗数专业分析 prompt */
  private buildZiweiPrompt(result: ZiweiResult): string {
    const { wuXingJu, mingGong, gongWei, siHua, shenGong, geShi } = result;
    // 存库 resultData 脱敏后 input 可能仅剩重组的 {name,gender,birth}，逐行防御（此前 undefined 直接 500）
    const input = (result.input ?? {}) as Partial<ZiweiResult["input"]> & { birth?: string };
    const birthLine = input.year != null ? `${input.year}年${input.month}月${input.day}日 ${input.hour}时` : input.birth || "未详";
    const lunarLine = input.lunarYearGan ? `${input.lunarYearGan}${input.lunarYearZhi}年${input.lunarMonth}月${input.lunarDay}日 ${input.lunarHour}时` : "未详";

    const gongLines = gongWei.map((g) => {
      const stars = g.stars.map((s) => `${s.name}(${s.wuXing}${s.liangJi === "吉" ? "吉" : s.liangJi === "凶" ? "凶" : ""})`).join("、");
      return `${g.name}（${g.gan}${g.zhi}）：${stars || "无主星"} | 大限 ${g.daXianStart}-${g.daXianEnd}岁`;
    });

    const prompt = `你是精通中国传统紫微斗数的资深命理专家，请根据以下排盘数据进行详细专业的紫微斗数分析。

## 出生信息
- 姓名：${input.name || "未知"}
- 性别：${input.gender || "未详"}
- 出生时间：${birthLine}
- 农历：${lunarLine}
- 五行局：${wuXingJu}
- 命宫：${mingGong.name}（${mingGong.gan}${mingGong.zhi}）
- 身宫：${shenGong}

## 四化
- 化禄：${siHua.huaLu}
- 化权：${siHua.huaQuan}
- 化科：${siHua.huaKe}
- 化忌：${siHua.huaJi}

## 十二宫
${gongLines.join("\n")}

## 格局
${geShi.length > 0 ? geShi.join("、") : "无特殊格局"}

---

请从以下 8 个方面进行详细分析，每个方面 2-4 句话，总篇幅约 1500-2000 字：

1. **命宫与性格**：命宫主星特质、性格优势与不足、行为模式。
2. **事业发展**：官禄宫分析、适合行业、职场贵人与发展方向。
3. **财运分析**：财帛宫解读、正财偏财运、财富积累建议。
4. **婚姻感情**：夫妻宫分析、姻缘特征、感情相处要点。
5. **健康状况**：疾厄宫解读、先天体质、易患疾病与养生建议。
6. **家庭与田宅**：田宅宫、父母宫、子女宫综合分析。
7. **人际与迁移**：迁移宫、交友宫分析，人际关系与外出发展。
8. **大限运势**：当前大限所处宫位的影响、各阶段运势要点与发展建议。

要求：语言专业但不晦涩，结合星曜五行属性给出具体分析，避免空泛套话。`;

    return prompt;
  }

  /** 构建专业八字分析 prompt */
  private buildPrompt(result: BaziResult): string {
    const { siZhu, qiYun, shenSha, geJu, wuXingEnergy, kongWang, shengXiao, fenXiTiShi, taiYuan, mingGong, shenGong } = result;
    // 存库 resultData 脱敏后 input 可能仅剩重组的 {name,gender,birth}，逐行防御（此前 undefined 直接 500）
    const input = (result.input ?? {}) as Partial<BaziResult["input"]> & { birth?: string };
    const birthLine = input.year != null
      ? `${input.year}年${input.month}月${input.day}日 ${input.hour}时${input.minute ?? 0}分`
      : input.birth || "未详";

    // 格式化一柱
    const fmtPillar = (p: typeof siZhu.nian) =>
      `${p.gan}${p.zhi}（${p.nayin}）`;

    // 十神分布
    const shiShenLines = [
      `年干：${siZhu.nian.ganShiShen}  年支：${siZhu.nian.zhiShiShen}`,
      `月干：${siZhu.yue.ganShiShen}  月支：${siZhu.yue.zhiShiShen}`,
      `日干：${siZhu.ri.gan}（日主）  日支：${siZhu.ri.zhiShiShen}`,
      `时干：${siZhu.shi.ganShiShen}  时支：${siZhu.shi.zhiShiShen}`,
    ];

    // 大运
    const daYunLines = qiYun.daYun.map(
      (d) => `${d.ganZhi}（${d.startAge}-${d.endAge}岁）`,
    );

    // 神煞（取前 15 个最关键的）
    const shenShaLines = shenSha
      .slice(0, 15)
      .map((s) => `${s.name}（${PILLAR_LABEL[s.pillar] || s.pillar}，${s.type === "ji" ? "吉" : "凶"}）：${s.desc}`);

    // 藏干
    const cangGanLines = [
      `年支${siZhu.nian.zhi}藏：${siZhu.nian.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
      `月支${siZhu.yue.zhi}藏：${siZhu.yue.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
      `日支${siZhu.ri.zhi}藏：${siZhu.ri.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
      `时支${siZhu.shi.zhi}藏：${siZhu.shi.cangGan.map((c) => `${c.gan}（${c.shiShen}）`).join("、")}`,
    ];

    // 分析提示
    const fenXiLines: string[] = [];
    if (fenXiTiShi.ganHe.length) fenXiLines.push(`天干五合：${fenXiTiShi.ganHe.join("、")}`);
    if (fenXiTiShi.sanHe.length) fenXiLines.push(`地支三合：${fenXiTiShi.sanHe.join("、")}`);
    if (fenXiTiShi.sanHui.length) fenXiLines.push(`地支三会：${fenXiTiShi.sanHui.join("、")}`);
    if (fenXiTiShi.liuChong.length) fenXiLines.push(`地支六冲：${fenXiTiShi.liuChong.join("、")}`);
    if (fenXiTiShi.liuHe.length) fenXiLines.push(`地支六合：${fenXiTiShi.liuHe.join("、")}`);
    if (fenXiTiShi.liuHai.length) fenXiLines.push(`地支六害：${fenXiTiShi.liuHai.join("、")}`);
    if (fenXiTiShi.sanXing.length) fenXiLines.push(`三刑：${fenXiTiShi.sanXing.join("、")}`);

    const prompt = `你是精通中国传统八字命理学的资深专家，请根据以下排盘数据进行详细专业的命理分析。

## 出生信息
- 姓名：${input.name || "未知"}
- 性别：${input.gender || "未详"}
- 出生时间：${birthLine}
- 生肖：${shengXiao}

## 四柱八字
- 年柱：${fmtPillar(siZhu.nian)}
- 月柱：${fmtPillar(siZhu.yue)}
- 日柱：${fmtPillar(siZhu.ri)}
- 时柱：${fmtPillar(siZhu.shi)}
- 空亡：${kongWang}
- 胎元：${fmtPillar(taiYuan)}
- 命宫：${fmtPillar(mingGong)}
- 身宫：${fmtPillar(shenGong)}

## 藏干
${cangGanLines.join("\n")}

## 十神分布
${shiShenLines.join("\n")}

## 五行能量
${wuXingEnergy ? `木 ${wuXingEnergy.mu}% | 火 ${wuXingEnergy.huo}% | 土 ${wuXingEnergy.tu}% | 金 ${wuXingEnergy.jin}% | 水 ${wuXingEnergy.shui}%\n${wuXingEnergy.desc}` : "暂无"}

## 格局分析
${geJu ? `格局：${geJu.name}（${geJu.type === "zheng" ? "正格" : "变格"}）\n用神：${geJu.yongShen}  喜神：${geJu.xiShen}  忌神：${geJu.jiShen}\n描述：${geJu.desc}` : "暂无格局信息"}

## 旺相休囚死
${result.wangXiang}

## 大运走势
起运年龄：${qiYun.startAge}岁  起运时间：${qiYun.desc}
${daYunLines.join("\n")}

## 神煞
${shenShaLines.join("\n")}

## 合冲刑害
${fenXiLines.join("\n") || "无显著合冲刑害关系"}

---

请从以下 8 个方面进行详细分析，每个方面用 2-4 句话，总篇幅约 1500-2000 字：

1. **格局与用神**：分析日主强弱、格局类型，明确用神喜忌。
2. **性格特征**：结合日主五行属性、十神组合和神煞，分析性格优势与不足。
3. **事业发展**：适合的行业领域、职场贵人、创业机遇与风险提示。
4. **财运分析**：正财偏财运走势、财富积累的关键时期、理财建议。
5. **婚姻感情**：姻缘时机、配偶特征、感情相处模式及注意事项。
6. **健康状况**：先天体质强弱、易感疾病、养生调理方向。
7. **大运走势**：当前所处大运的影响、未来运势转折点、各阶段机遇与挑战。
8. **流年建议**：近期流年的吉凶宜忌、开运方向和注意事项。

要求：语言专业严谨但不晦涩，多用生动比喻，给出切实可行的人生建议。`;

    return prompt;
  }

  /**
   * 八字合婚分析
   *
   * @param opts.shared 这份报告要给**两个不同的用户**看（双人合盘邀请流程）。
   *   此时不能把任何一方的生辰与四柱交给模型——报告正文是双方共享的，
   *   模型一旦写出四柱，对方就能反推出生时刻，而产品设计承诺的是「不共享生辰」。
   *   缺省（自己给自己的两个盘做合婚）不受此限，照旧给完整四柱。
   */
  async analyzeHehun(
    userId: string,
    maleResult: BaziResult,
    femaleResult: BaziResult,
    opts?: { shared?: boolean; scene?: CoupleScene },
  ) {
    if (!this.apiKey) {
      return { analysisContent: "AI解析服务暂未配置，请联系管理员" };
    }

    const shared = !!opts?.shared;
    const prompt = shared
      ? await this.buildSharedHehunPrompt(maleResult, femaleResult, opts?.scene ?? "marriage")
      : this.buildHehunPrompt(maleResult, femaleResult);
    const raw = await this.callDeepSeek(prompt);
    // 双人合盘再过一道：模型即便凭空编个出生日期，也不该出现在共享报告里
    const content = shared ? stripBirthDetails(raw.content) : raw.content;
    const tokenUsage = raw.tokenUsage;

    const record = await this.prisma.aiAnalysisRecord.create({
      data: {
        userId,
        paipanRecordId: "hehun",
        analyzeType: "HEHUN",
        analysisContent: content,
        tokenUsage: tokenUsage as any,
        isCached: false,
      },
    });

    return { id: record.id, analysisContent: record.analysisContent + RISK_DISCLAIMER, createdAt: record.createdAt, isCached: false };
  }

  /**
   * 双人合盘的 prompt：模型只拿到引擎算好的「关系」，拿不到任何一方的生辰与四柱。
   *
   * 这么做而不是在 prompt 里叮嘱模型「不要泄露生辰」——**拿不到就写不出来**，
   * 比靠模型守规矩可靠得多。可给与不可给的划线见 couple-facts.ts 的说明。
   */
  private async buildSharedHehunPrompt(male: BaziResult, female: BaziResult, scene: CoupleScene = "marriage"): Promise<string> {
    const coupleFacts = extractCoupleFacts(male, female);
    const facts = formatCoupleFacts(coupleFacts);

    // 依据来自已审核的合婚条目，检索方式与其余六个工具完全一致（tags 精确命中关系信号）
    const hits = this.reportKnowledge
      ? await this.reportKnowledge
          // 多取一些再按场景筛：婚恋条目挂在夫妻宫信号上，任何场景都会命中，
          // 只取 12 条的话名额会被它们占满，真正属于这个场景的条目反而挤不进来
          .findEvidence({ paipanType: "couple", signals: coupleSignals(coupleFacts, scene), limit: 24 })
          .catch(() => [])
      : [];

    // 婚恋专属条目不能串到别的场景去。
    // 它们挂在夫妻宫信号上，而夫妻宫（双方日支的关系）在任何场景都算得出来，
    // 于是亲子、合作的报告里也会冒出「属相相冲不作为否决依据」这类婚恋口径——
    // 场景对了、依据却还是合婚那一套，读起来就是套模板。
    const usable = (scene === "marriage"
      ? hits
      : hits.filter((h) => !/合婚|夫妻宫|婚配/.test(`${h.topic ?? ""}${h.title ?? ""}`))
    ).slice(0, 12);

    // 主线单独提出来：民间「属相相冲不能结婚」影响太大，
    // 报告若把各说法平摆着让人自己选，等于把用户推回原地更慌
    const line = usable.find((h) => h.stance === "platform_line");
    const evidence = usable.filter((h) => h !== line);

    const evidenceBlock = evidence.length
      ? `\n## 可引用的依据（人工审核过的合婚知识条目）\n${evidence
          .map((h, i) => `E${i + 1}［${h.topic}］${h.title}：${h.content.replace(/\s+/g, " ").slice(0, 300)}`)
          .join("\n")}\n`
      : "";

    const lineBlock = line
      ? `\n## 本报告的主线（按这个口径讲，不要另立一套）\n${line.content.replace(/\s+/g, " ").slice(0, 400)}\n`
      : "";

    const [sideA, sideB] = SCENE_SIDES[scene];
    const sceneCn = SCENE_LABEL[scene];
    // 场景决定问的是什么、怎么称呼两边。措辞混了就荒腔走板——
    // 把合作伙伴讲成「感情和睦」，把亲子讲成「婚姻美满」，用户一眼就看出这是套模板
    const SCENE_TASK: Record<CoupleScene, string> = {
      marriage: `1. **五行互补**：双方日主五行的生克方向说明什么，谁在关系里更主动、谁更需要被照顾。
2. **喜用互益**：一方喜用的五行在对方盘里旺不旺，落到相处上是谁能补谁。
3. **夫妻宫与合冲**：双方日支（夫妻宫）的关系，以及其余各柱的合冲刑害各自意味着什么。
4. **相处提醒**：由上面这些关系推出的现实相处建议，具体可行，不说空话。
5. **综合判断**：给出总体评价与最值得留意的一两处，不必强行打分。`,
      partnership: `1. **谁主导、谁出力**：日主生克的方向说明推进中谁更强势、谁更多承担，落到分工上怎么安排。
2. **能力互补**：一方喜用的五行在对方盘里旺不旺，说明谁能补谁的短板，宜怎么分工。
3. **钱与分配**：双方日主同类（比劫）时尤其要讲清「能一起打江山、未必能一起分钱」，以及该把什么写进协议。
4. **摩擦点**：各柱的冲害刑分别提示哪一块容易谈不拢，要提前谈死哪几件事。
5. **综合判断**：说清这段合作的结构与要留意之处；**不预言生意成败**——成败取决于行业、时机、资金与执行。`,
      family: `1. **给予与约束**：长辈一方与晚辈一方日主生克的方向，说明是庇护型还是管束型，各自要防什么。
2. **彼此补益**：一方所需的五行在对方盘里旺不旺，落到照顾与支持上是谁托着谁。
3. **相处的松紧**：各柱的合冲刑害提示哪一块容易亲近、哪一块容易起争执。
4. **相处提醒**：给具体可行的相处建议，讲相处方式，不评判谁对谁错。
5. **综合判断**：说清这段关系的样子；**不预言亲缘厚薄、不谈寿夭**。`,
      colleague: `1. **配合方式**：日主生克的方向说明谁适合定方向、谁适合执行，反过来为什么容易顶牛。
2. **能力互补**：一方所需在对方盘里旺不旺，宜怎么分工。
3. **边界与职责**：各柱的合冲刑害提示哪些方面容易起分歧，职责与汇报线该怎么划清楚。
4. **共事提醒**：具体可行的共事建议。
5. **综合判断**：说清配合的结构与要留意之处，不评价能力高低、不预言升迁。`,
      friend: `1. **相处的松紧**：日主生克与比和说明这段交情是互相照应、还是各有主张。
2. **投缘之处**：一方所需在对方盘里旺不旺，哪一块最谈得来。
3. **需要留空间的地方**：各柱的冲害刑提示哪些话题、哪些牵扯容易伤交情。
4. **相处提醒**：具体可行的建议；若涉及借贷、合伙、共同投资，要提醒按合作的规矩另行约定。
5. **综合判断**：说清这段交情的样子，不排高低、不预言长短。`,
    };

    return `你是精通中国传统命理合盘的资深专家。下面是引擎算好的双方盘面关系，请据此做**${sceneCn}场景**的合盘分析。

两边分别称为「${sideA}」与「${sideB}」，全文一律这样称呼，不要用「男方女方」以外的其他叫法混用，也不要按${sceneCn}以外的场景来讲。

${facts}
${lineBlock}${evidenceBlock}
---

硬性要求（先读这一条）：
1. 出于隐私保护，上面**没有给出任何一方的出生日期与四柱干支**，你也**不得写出、不得推测、不得编造**具体的出生年月日时或年月日时四柱干支。这份报告双方都会看到。
2. 只依据上面列出的关系与依据作答；上面没有的信息就不要讲，不要为了凑篇幅编细节，也不得提及依据之外的书名与门派原话。
3. ${
      line
        ? "遇到各家讲法不一致之处，一律按上面「本报告的主线」的口径讲，并把结论说明白，不要把选择甩回给用户。"
        : "遇到各家讲法不一致之处，给出一个明确的说法并说清理由，不要罗列几种讲法让用户自己选。"
    }
${scene === "marriage" ? "4. **属相相冲不作为否决依据**：属相只是年支一个字，不得据此断定两人不能在一起。" : "4. 不得据属相下断言，也不得把这段关系说成注定成或注定败。"}

请从以下 5 个方面分析，总篇幅约 1000-1500 字：

${SCENE_TASK[scene]}`;
  }

  /** 构建合婚分析 prompt（自己的两个盘，不涉及第二个用户，可含完整四柱） */
  private buildHehunPrompt(male: BaziResult, female: BaziResult): string {
    const fmt = (p: typeof male.siZhu.nian) => `${p.gan}${p.zhi}（${p.nayin}）`;
    const m = male;
    const f = female;
    // 存库 resultData 脱敏后 input 可能仅剩重组的 {name,gender,birth}，逐行防御
    const birthOf = (r: BaziResult) => {
      const i = (r.input ?? {}) as Partial<BaziResult["input"]> & { birth?: string };
      return i.year != null ? `${i.year}年${i.month}月${i.day}日 ${i.hour}时` : i.birth || "未详";
    };

    return `你是精通中国传统八字合婚的资深命理专家，请根据以下两人的八字排盘进行合婚分析。

## 男方八字
- 出生：${birthOf(m)}
- 四柱：${fmt(m.siZhu.nian)} ${fmt(m.siZhu.yue)} ${fmt(m.siZhu.ri)} ${fmt(m.siZhu.shi)}
- 日主：${m.siZhu.ri.gan}
- 格局：${m.geJu?.name || "未定"}  用神：${m.geJu?.yongShen || "未定"}
- 五行：木${m.wuXingEnergy?.mu || 0}% 火${m.wuXingEnergy?.huo || 0}% 土${m.wuXingEnergy?.tu || 0}% 金${m.wuXingEnergy?.jin || 0}% 水${m.wuXingEnergy?.shui || 0}%

## 女方八字
- 出生：${birthOf(f)}
- 四柱：${fmt(f.siZhu.nian)} ${fmt(f.siZhu.yue)} ${fmt(f.siZhu.ri)} ${fmt(f.siZhu.shi)}
- 日主：${f.siZhu.ri.gan}
- 格局：${f.geJu?.name || "未定"}  用神：${f.geJu?.yongShen || "未定"}
- 五行：木${f.wuXingEnergy?.mu || 0}% 火${f.wuXingEnergy?.huo || 0}% 土${f.wuXingEnergy?.tu || 0}% 金${f.wuXingEnergy?.jin || 0}% 水${f.wuXingEnergy?.shui || 0}%

---

请从以下 6 个方面进行合婚分析，总篇幅约 1000-1500 字：

1. **年柱纳音配对**：纳音相生相克关系、年柱天干地支合冲。
2. **日主五行互补**：双方日主五行强弱、喜用神互补程度。
3. **十神互动**：双方八字的十神关系、夫妻宫配合度。
4. **合冲刑害**：双方地支的六合/三合/六冲/六害/三刑关系。
5. **大运同步性**：双方大运走势是否同步、关键年龄段匹配度。
6. **综合建议**：配对总分（满分100）、相处注意事项、最佳婚配时机。`;
  }

  /**
   * 调用 DeepSeek API
   * @param systemPrompt 可选的 system prompt（流派点评传入师父人设）；缺省=通用八字专家，现行行为不变
   */
  async callDeepSeek(prompt: string, systemPrompt: string = GENERAL_SYSTEM_PROMPT): Promise<{ content: string; tokenUsage: { promptTokens: number; completionTokens: number } }> {
    const start = Date.now();
    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      const duration = Date.now() - start;

      if (!response.ok) {
        const errorText = await response.text();
        const reason = `HTTP_${response.status}`;
        this.metrics?.recordExternalApi("deepseek", "chat/completions", false, duration, reason);
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `DeepSeek API 调用失败 (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      this.metrics?.recordExternalApi("deepseek", "chat/completions", true, duration);
      return {
        content: data.choices[0].message.content,
        tokenUsage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (err) {
      const duration = Date.now() - start;
      if (err instanceof BusinessException) throw err;
      const reason = (err as Error).message?.substring(0, 50) ?? "network_error";
      this.metrics?.recordExternalApi("deepseek", "chat/completions", false, duration, reason);
      throw err;
    }
  }
}
