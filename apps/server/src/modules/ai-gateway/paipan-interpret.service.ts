import { Injectable, Logger } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";
import { AiMessage } from "./adapters/base.adapter";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 排盘 AI 解读 —— 各排盘工具 result 页「AI 解读」区块的统一后端（走 ai-gateway/DeepSeek 链路）。
 *
 * 设计：前端已用本地引擎排好盘，把盘面压成纯文本摘要传来；后端按 tool 选对应术数的
 * 解读侧重（TOOL_REGISTRY），拼系统提示词后交模型基于真实盘面解读（禁止自行推算改盘）。
 * 新工具接入只需在 TOOL_REGISTRY 增一条，前端复用 PaipanAiPanel 组件即可，无需改动本服务其余部分。
 */

/** 术数工具解读画像：中文名 + 该术数解读时应聚焦的角度 */
interface ToolProfile {
  name: string;
  /** 系统提示词中「解读要点」段落，指导模型从该术数专业视角切入 */
  guide: string;
}

/**
 * 支持 AI 解读的工具注册表（key = 前端工具目录名）。
 * 纯工具型（万年历/罗盘/立极尺）无卦象可解读，不在此表，前端也不挂 AI 面板。
 */
const TOOL_REGISTRY: Record<string, ToolProfile> = {
  meihua: {
    name: "梅花易数",
    guide: "从体用生克入手：先定体卦用卦，析体用五行生克比和；再看互卦揭示事情发展中段、变卦揭示结果趋向；结合卦象类象与所占之事给出吉凶趋势与应对建议，可点到应期方位。",
  },
  xiaoliuren: {
    name: "小六壬",
    guide: "围绕所落宫位（大安/留连/速喜/赤口/小吉/空亡）的吉凶属性与五行、所主人事（如大安主安稳、赤口主口舌）展开，结合时辰给出事情态势与趋避提示。",
  },
  kongming: {
    name: "孔明神卦",
    guide: "解读所得签卦的卦辞与寓意，联系求问事项给出方向性指引，语气含蓄、重启发不重断定。",
  },
  ziwei: {
    name: "紫微斗数",
    guide: "以命宫主星与三方四正为纲，析命身格局；点评财帛/官禄/夫妻/迁移等重点宫位星曜组合，谈性格特质、事业财运婚姻的倾向与人生课题。",
  },
  daliuren: {
    name: "大六壬",
    guide: "从四课三传取象：析日辰阴阳、贵神所临、三传发用与传归，结合天将断事之来龙去脉与吉凶应期。",
  },
  jinkoujue: {
    name: "金口诀",
    guide: "以人元/地分/将神/贵神四位为断，析五行生克与神将旺衰，结合所占之事给出成败趋向与时应。",
  },
  jinqianke: {
    name: "金钱课",
    guide: "解读铜钱起出的六爻卦象：辨世应、动爻、六亲用神，结合所问之事析吉凶与变化。",
  },
  xiaochengtu: {
    name: "小成图",
    guide: "以卦爻信息场取象，析卦位对应的人事时空信息，结合所问给出趋势判断。",
  },
  taiyi: {
    name: "太乙神数",
    guide: "从太乙所在与主客算入手，析格局与主客胜负，联系所问事项给出大势判断，定位为传统数术文化解读。",
  },
  zhuge: {
    name: "诸葛神算",
    guide: "解读所得签辞的字面与引申义，联系求问事项给出含蓄的方向性指引与心态建议。",
  },
  yinpan: {
    name: "阴盘奇门",
    guide: "以值符值使、九星八门九宫落宫为纲，取用神所落之宫，析星门神旺衰生克与格局，结合所占之事断吉凶趋避与方位时机。",
  },
  "yinpan-mingli": {
    name: "命理奇门",
    guide: "以命局奇门盘析人生格局：看日干（自身）落宫与用神旺衰，谈性格、事业财运婚姻的倾向与调整方向。",
  },
  feigong: {
    name: "飞宫奇门",
    guide: "依飞盘星门神布局取用神落宫，析格局生克旺衰，结合所占给出趋势与方位建议。",
  },
  chuanren: {
    name: "穿壬",
    guide: "以奇门与六壬合参：奇门定空间格局、六壬明人事来去，综合两盘信息给出更立体的断事视角。",
  },
  shanxiang: {
    name: "玄空山向",
    guide: "以坐山朝向定山向飞星，析当运旺衰、山星水星到宫，谈宅之丁财趋向与形峦配合的调整要点，定位为传统堪舆文化。",
  },
  xuankong: {
    name: "玄空飞星",
    guide: "以运盘及山向飞星九宫布局为纲，辨旺山旺向/上山下水等局，逐宫析星曜组合的吉凶寓意与化解布置要点，定位为传统堪舆文化。",
  },
  bazhai: {
    name: "八宅风水",
    guide: "以命卦宅卦定东西四命/宅，析八方吉凶（生气/延年/天医/伏位为吉，绝命/五鬼/六煞/祸害为凶），给出门主灶与卧房布局的宜忌建议，定位为传统堪舆文化。",
  },
  qiming: {
    name: "起名",
    guide: "结合生辰喜用五行与五格三才数理，评析所推名字的音形义与数理吉凶，说明与命主的契合点及取名思路。",
  },
  xingming: {
    name: "姓名解析",
    guide: "以五格（天/人/地/外/总格）与三才配置为纲，析数理吉凶、性格特质与人生际遇倾向，给出中肯客观的评价。",
  },
  shuzi: {
    name: "数字能量",
    guide: "以号码数字两两组合的磁场（天医/生气/延年/伏位/绝命/五鬼/六煞/祸害）为断，析整体能量倾向，定位为趣味文化解读，不做绝对断言。",
  },
  wuyunliuqi: {
    name: "五运六气",
    guide: "以当年运气盘（岁运/主客气）析气候物候大势与人体易感倾向，给出顺时养生调摄要点，定位为中医运气学说的文化科普，不作诊疗建议。",
  },
};

const BASE_SYSTEM = `你是「智玄」，热卜国学平台的资深术数导师，深研中华传统术数数十年，功底扎实、断事老到。
用户在平台排盘工具中完成了一次排盘，系统已用平台引擎算出真实盘面（见下方数据，为唯一事实依据，禁止自行推算或更改盘面干支/卦象/星曜）。
解读要求：
1. 以行家视角深入透彻地解读，直接给出明确、笃定的专业判断，条理清晰、层层递进（450-700 字，用小标题分段）；
2. 每一个论断都要落到盘面的具体依据（哪一柱/爻/星/宫/神），讲透其中的生克制化、旺衰承乘之理，做到言之有据、环环相扣，绝不泛泛而谈、空话套话；
3. 措辞果断专业，禁止使用「可能」「也许」「大概」「或许」「应该是」「不好说」等模棱两可、模糊敷衍的字眼——该下的判断就明确下，把象与理讲清楚；
4. 定位为传统术数文化的专业解读，重在阐明盘面之象与理，不渲染焦虑、不做恐吓；涉及婚姻/投资/健康等重大人生抉择时，用一句话提示理性参考即可，不必反复叮嘱；
5. 不重复罗列盘面原始数据（前端已有盘面展示），开门见山直入分析；不编造盘面中没有的信息。`;

@Injectable()
export class PaipanInterpretService {
  private readonly logger = new Logger(PaipanInterpretService.name);

  constructor(private readonly gateway: AiGatewayService) {}

  /** 校验工具是否支持解读，返回画像（不支持抛业务异常） */
  private resolveTool(tool: string): ToolProfile {
    const profile = TOOL_REGISTRY[tool];
    if (!profile) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, `暂不支持该工具的 AI 解读：${tool}`);
    }
    return profile;
  }

  /** 组装解读消息 */
  private buildMessages(profile: ToolProfile, dto: { chart: string; question?: string }): AiMessage[] {
    const system = `${BASE_SYSTEM}

【当前术数】${profile.name}
【解读要点】${profile.guide}`;
    const q = (dto.question || "").trim();
    const userContent = q
      ? `【本次排盘盘面】\n${dto.chart}\n\n请结合上述盘面，重点回答我的问题：${q}`
      : `【本次排盘盘面】\n${dto.chart}\n\n请基于以上盘面，给出一段完整的${profile.name}解读。`;
    return [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ];
  }

  /** 非流式解读（非 H5 端降级路径） */
  async interpret(dto: { tool: string; chart: string; question?: string }, userId?: string): Promise<{ content: string }> {
    const profile = this.resolveTool(dto.tool);
    const result = await this.gateway.chat({
      scene: "paipan_interpret",
      userId,
      messages: this.buildMessages(profile, dto),
      options: { temperature: 0.6, maxTokens: 1600 },
      skipCache: true, // 每盘不同，语义缓存易跨盘误命中串盘
    });
    return { content: result.content || "" };
  }

  /** 流式解读（SSE）：返回文本增量流 */
  prepareStream(dto: { tool: string; chart: string; question?: string }, userId?: string): AsyncIterable<string> {
    const profile = this.resolveTool(dto.tool);
    return this.gateway.chatStream({
      scene: "paipan_interpret",
      userId,
      messages: this.buildMessages(profile, dto),
      options: { temperature: 0.6, maxTokens: 1600 },
      skipCache: true,
    });
  }
}
