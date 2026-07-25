import { Injectable, Logger } from "@nestjs/common";
import { calcBazi, type BaziInput, type BaziResult } from "@guoxue/bazi-engine";
import { AiGatewayService } from "./ai-gateway.service";
import { AiMessage } from "./adapters/base.adapter";

/**
 * 智玄 AI 助手 —— 平台自建主智能体（区别于 Coze 广场智能体，走 ai-gateway/DeepSeek 链路）。
 *
 * 富消息示范闭环（八字卡）：
 * 1. 轻量意图识别：正则从用户消息里提取生辰（"1990年3月15日早上8点"等）；
 * 2. 识别到 → 内部直调 @guoxue/bazi-engine（与 paipan 模块同一排盘引擎；
 *    不经 PaipanService 是因为 PaipanModule imports AiGatewayModule，反向依赖会成环）；
 * 3. 盘面结果压缩为 bazi-card 结构化载荷（前端 components/agent/cards/bazi-card.vue 渲染），
 *    同时把真实盘面注入 prompt，让模型基于真盘流式输出分析。
 */

/** 八字卡结构化载荷（与前端 bazi-card.vue 的契约） */
export interface BaziCardPayload {
  name?: string;
  gender: "男" | "女";
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  shengXiao: string;
  lunarDate: string;
  kongWang?: string;
  /** 四柱干支（年/月/日/时） */
  siZhu: {
    nian: { gan: string; zhi: string };
    yue: { gan: string; zhi: string };
    ri: { gan: string; zhi: string };
    shi: { gan: string; zhi: string };
  };
  /** 五行能量分布 */
  wuXing?: { mu: number; huo: number; tu: number; jin: number; shui: number };
  geJu?: { name: string; yongShen: string };
}

/** 生辰意图识别结果 */
export interface BirthIntent {
  gender: "男" | "女";
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 用户没写时辰时为 true（分析提示时柱按午时估算） */
  hourAssumed: boolean;
}

/** 十二时辰 → 起始钟点（取时辰中点所在小时，保证落在对应地支时段内） */
const SHICHEN_HOUR: Record<string, number> = {
  子: 0, 丑: 2, 寅: 4, 卯: 6, 辰: 8, 巳: 10,
  午: 12, 未: 14, 申: 16, 酉: 18, 戌: 20, 亥: 22,
};

const ZHIXUAN_SYSTEM = `你是「智玄」，热卜国学平台的官方国学学习向导。你的核心职责不是取代垂直智能体，而是理解用户的兴趣、基础、时间与学习目标，帮助用户找到合适的经典、文章、课程、工具与智能学伴，并制定可执行的学习路线。
回答要求：
1. 先用不超过 2 个问题确认用户目标，再给“从哪里开始—本周做什么—下一步找谁”的路线；
2. 经史子集、诗词、礼乐、蒙学和易学内容均定位为传统文化学习，不做吉凶断言，不渲染焦虑；
3. 推荐平台内容时说明推荐理由，少而精准，不制造销售压力；
4. 涉及重大人生决策（婚姻/投资/健康）时提醒用户理性看待、咨询专业人士；
5. 不编造平台不存在的功能、内容或服务，不确定的信息诚实说明；
6. 用亲切、专业、克制的语气，短段落表达，默认控制在 300 字以内。`;

const BAZI_ANALYSIS_SYSTEM = `你是「智玄」，热卜国学平台的官方 AI 命理助手。用户提供了生辰，系统已用平台排盘引擎完成真实排盘（盘面数据见下方，为唯一事实依据，禁止自行推算或更改干支）。
请基于该盘面输出一段结构化解读（400-600字）：
1. 【命局总览】日主强弱、格局特点（如有格局数据）；
2. 【五行分析】五行分布的偏旺偏弱，喜用倾向；
3. 【性格与潜能】从十神组合谈性格特质与适合的发展方向；
4. 【温馨提示】结尾提醒：以上为传统命理文化解读，仅供参考，不构成决策建议。
不要重复罗列盘面原始数据（前端已有盘面卡片展示），直接进入分析。`;

@Injectable()
export class ZhixuanService {
  private readonly logger = new Logger(ZhixuanService.name);

  constructor(private readonly gateway: AiGatewayService) {}

  /**
   * 轻量生辰意图识别（正则/关键词，识别不出返回 null 走普通对话）。
   * 支持："1990年3月15日早上8点"、"1990-3-15 8:30"、"1990年3月15日辰时"。
   */
  detectBirthIntent(query: string): BirthIntent | null {
    const q = (query || "").trim();
    if (!q) return null;

    // 日期：1990年3月15日 / 1990-3-15 / 1990.3.15 / 1990/3/15
    const dateM = q.match(/(19\d{2}|20\d{2})\s*[年\-./]\s*(\d{1,2})\s*[月\-./]\s*(\d{1,2})\s*[日号]?/);
    if (!dateM) return null;
    const year = Number(dateM[1]);
    const month = Number(dateM[2]);
    const day = Number(dateM[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // 时间只在日期之后找，避免误抓"3点建议"之类
    const tail = q.slice(q.indexOf(dateM[0]) + dateM[0].length);

    let hour = -1;
    let minute = 0;
    let hourAssumed = false;

    // ① 钟点："早上8点"、"下午3点20分"、"8:30"、"20时"
    const hourM = tail.match(/(凌晨|清晨|早上|早晨|上午|中午|下午|傍晚|晚上|夜里|半夜)?\s*(\d{1,2})\s*[点时:：]\s*(?:(\d{1,2})\s*分?)?/);
    if (hourM) {
      let h = Number(hourM[2]);
      const period = hourM[1] || "";
      if (h <= 12) {
        if (/下午|傍晚/.test(period) && h < 12) h += 12;
        else if (/晚上|夜里/.test(period) && h < 12) h += 12;
        else if (/半夜|凌晨/.test(period) && h === 12) h = 0;
        else if (/中午/.test(period) && h < 3) h += 12; // 中午12点/中午1点
      }
      if (h >= 0 && h <= 23) {
        hour = h;
        minute = Math.min(59, Number(hourM[3]) || 0);
      }
    }

    // ② 时辰："辰时"、"子时"
    if (hour < 0) {
      const scM = tail.match(/([子丑寅卯辰巳午未申酉戌亥])时/);
      if (scM) hour = SHICHEN_HOUR[scM[1]];
    }

    // ③ 没写时辰：仅当消息带命理语境关键词才触发（避免普通日期问题误排盘），按午时估算
    if (hour < 0) {
      if (!/八字|排盘|命盘|生辰|命理|运势|五行|出生/.test(q)) return null;
      hour = 12;
      hourAssumed = true;
    }

    // 性别：句中含"女"按女，否则默认男
    const gender: "男" | "女" = /女/.test(q) ? "女" : "男";

    return { gender, year, month, day, hour, minute, hourAssumed };
  }

  /** 内部直调排盘引擎（与 /paipan/bazi 同一引擎） */
  calcBaziCard(intent: BirthIntent): { payload: BaziCardPayload; result: BaziResult } {
    const input: BaziInput = {
      name: "",
      gender: intent.gender,
      year: intent.year,
      month: intent.month,
      day: intent.day,
      hour: intent.hour,
      minute: intent.minute,
    };
    const result = calcBazi(input);
    const p = (pillar: { gan: string; zhi: string }) => ({ gan: pillar.gan, zhi: pillar.zhi });
    const payload: BaziCardPayload = {
      gender: intent.gender,
      year: intent.year,
      month: intent.month,
      day: intent.day,
      hour: intent.hour,
      minute: intent.minute,
      shengXiao: result.shengXiao,
      lunarDate: result.lunarDate,
      kongWang: result.kongWang,
      siZhu: {
        nian: p(result.siZhu.nian),
        yue: p(result.siZhu.yue),
        ri: p(result.siZhu.ri),
        shi: p(result.siZhu.shi),
      },
      wuXing: result.wuXingEnergy
        ? {
            mu: result.wuXingEnergy.mu,
            huo: result.wuXingEnergy.huo,
            tu: result.wuXingEnergy.tu,
            jin: result.wuXingEnergy.jin,
            shui: result.wuXingEnergy.shui,
          }
        : undefined,
      geJu: result.geJu ? { name: result.geJu.name, yongShen: result.geJu.yongShen } : undefined,
    };
    return { payload, result };
  }

  /** 把真实盘面压缩注入 prompt（模型基于真盘分析，杜绝自行排盘幻觉） */
  private buildBaziContext(intent: BirthIntent, result: BaziResult): string {
    const sz = result.siZhu;
    const pillarLine = (label: string, p: { gan: string; zhi: string; ganShiShen: string; zhiShiShen: string; nayin: string }) =>
      `${label}柱 ${p.gan}${p.zhi}（天干${p.ganShiShen}/地支${p.zhiShiShen}·纳音${p.nayin}）`;
    const wx = result.wuXingEnergy;
    const lines = [
      `性别：${intent.gender}；公历 ${intent.year}年${intent.month}月${intent.day}日 ${intent.hour}时${intent.minute}分${intent.hourAssumed ? "（用户未提供时辰，按午时估算，请在分析中说明时柱仅供参考）" : ""}`,
      `农历：${result.lunarDate}；生肖：${result.shengXiao}`,
      [pillarLine("年", sz.nian), pillarLine("月", sz.yue), pillarLine("日", sz.ri), pillarLine("时", sz.shi)].join("；"),
      `日主：${sz.ri.gan}；空亡：${result.kongWang}；旺相：${result.wangXiang}`,
      wx ? `五行能量：木${wx.mu} 火${wx.huo} 土${wx.tu} 金${wx.jin} 水${wx.shui}（${wx.desc}）` : "",
      result.geJu ? `格局：${result.geJu.name}（用神${result.geJu.yongShen}·喜神${result.geJu.xiShen}·忌神${result.geJu.jiShen}）` : "",
      result.qiYun?.desc ? `起运：${result.qiYun.desc}` : "",
    ].filter(Boolean);
    return `【真实盘面数据】\n${lines.join("\n")}`;
  }

  /** 组装对话消息（普通对话 / 八字分析两种 prompt） */
  buildMessages(dto: { query: string; history?: Array<{ role: string; content: string }> }, bazi?: { intent: BirthIntent; result: BaziResult }): AiMessage[] {
    const hist: AiMessage[] = (dto.history || []).slice(-8).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content || "").slice(0, 2000),
    }));
    if (bazi) {
      return [
        { role: "system", content: BAZI_ANALYSIS_SYSTEM },
        { role: "system", content: this.buildBaziContext(bazi.intent, bazi.result) },
        ...hist,
        { role: "user", content: dto.query },
      ];
    }
    return [{ role: "system", content: ZHIXUAN_SYSTEM }, ...hist, { role: "user", content: dto.query }];
  }

  /** 非流式对话（非 H5 端降级路径）：返回富消息数组 */
  async chat(dto: { query: string; history?: Array<{ role: string; content: string }> }, userId?: string) {
    const intent = this.detectBirthIntent(dto.query);
    const messages: Array<{ type: string; content?: string; payload?: unknown }> = [];
    let bazi: { intent: BirthIntent; result: BaziResult } | undefined;

    if (intent) {
      try {
        const { payload, result } = this.calcBaziCard(intent);
        bazi = { intent, result };
        messages.push({ type: "bazi-card", payload });
      } catch (err) {
        // 排盘失败不阻断对话，降级为普通回答
        this.logger.warn(`智玄内联排盘失败，降级普通对话: ${(err as Error).message}`);
      }
    }

    const result = await this.gateway.chat({
      scene: "zhixuan_chat",
      userId,
      messages: this.buildMessages(dto, bazi),
      options: { temperature: 0.6, maxTokens: 1500 },
      skipCache: !!bazi, // 排盘分析按盘生成，语义缓存易串盘
    });
    messages.push({ type: "text", content: result.content || "" });
    return { messages };
  }

  /**
   * 流式对话：返回八字卡（如识别到生辰）+ 文本增量流。
   * 控制器先 write card 事件，再逐块 write chunk。
   */
  prepareStream(dto: { query: string; history?: Array<{ role: string; content: string }> }, userId?: string): {
    card?: BaziCardPayload;
    stream: AsyncIterable<string>;
  } {
    const intent = this.detectBirthIntent(dto.query);
    let bazi: { intent: BirthIntent; result: BaziResult } | undefined;
    let card: BaziCardPayload | undefined;

    if (intent) {
      try {
        const r = this.calcBaziCard(intent);
        bazi = { intent, result: r.result };
        card = r.payload;
      } catch (err) {
        this.logger.warn(`智玄内联排盘失败，降级普通对话: ${(err as Error).message}`);
      }
    }

    const stream = this.gateway.chatStream({
      scene: "zhixuan_chat",
      userId,
      messages: this.buildMessages(dto, bazi),
      options: { temperature: 0.6, maxTokens: 1500 },
      skipCache: !!bazi, // 排盘分析按盘生成；语义缓存（尤其 embedding 降级时）会跨生辰误命中串盘
    });
    return { card, stream };
  }
}
