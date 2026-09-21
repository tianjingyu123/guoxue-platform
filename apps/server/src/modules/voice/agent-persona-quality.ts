import { PERSONAS } from "../dialogue/dialogue-personas";

/**
 * 圈子/广场语音角色的人设质检（2026-09-18）
 *
 * 决策人要求：「不同的智能体，不同的场景和角色要有不同的名字和性格，要有针对性的区别。」
 *
 * 现有的 `riskCheck` 只管「不许写什么」（保证灵验、付费化解、恐吓…），
 * 缺的是「怎么写才立得住」——放任不管的结果，是每个圈子都冒出一个
 * 「XX助手，热情专业，竭诚为您服务」，六百万用户看到的是同一张脸。
 *
 * 这里做的是**建议而不是拦截**：圈主是付费开通这个助理的人，
 * 平台的位置是帮他把角色写好，不是卡着不让他上。
 * 因此全部输出为 suggestion（tip/warn），审核侧可参考，不阻断提交。
 *
 * 判断标准照平台自己那六个角色的写法来（见 dialogue-personas）：
 * 有来历、有一句话定位、性格落到具体行为、说清楚什么不归它管。
 */

export type SuggestionLevel = "tip" | "warn";

export interface PersonaSuggestion {
  field: "name" | "persona" | "prompt" | "ownerServices";
  level: SuggestionLevel;
  text: string;
}

/** 通用到没有辨识度的名字 */
const GENERIC_NAME = /^(AI|ai|智能)?(小)?(助手|助理|机器人|客服|管家|顾问|老师)$/;
/** 名字里塞了功能说明，读起来不像个名字 */
const NAME_WITH_FUNCTION = /(问答|咨询|服务|系统|平台|机器人)/;

/** 形容词堆砌：只说「很专业很热情」，等于没说 */
const EMPTY_TRAITS = ["专业", "热情", "耐心", "友好", "贴心", "亲切", "细心", "认真", "负责"];

/** 一个角色立得住，至少要交代清楚这几件事 */
const PROMPT_ESSENTIALS: Array<{ re: RegExp; miss: string }> = [
  { re: /不知道|不确定|拿不准|没有把握|无法确定/, miss: "没写「答不上来时怎么办」——助理最容易翻车的就是硬答" },
  { re: /范围|不归|不属于|超出|其他老师|别的板块|引导/, miss: "没写「超出范围怎么办」——不写清楚，它会什么都接" },
  { re: /圈|本圈|群|成员/, miss: "没提到这个圈子本身——角色要知道自己服务的是谁" },
];

/** 平台自有角色的名字，圈子角色不该重名 */
const PLATFORM_NAMES = new Set(Object.values(PERSONAS).map((p) => p.name));

export interface PersonaInput {
  name: string;
  persona: string;
  prompt: string;
  ownerServices?: string[];
}

/**
 * 给圈主的人设建议。
 * @param existingNames 同一站点内其他圈子已在用的角色名，用于提示撞名
 */
export function checkPersonaQuality(input: PersonaInput, existingNames: string[] = []): PersonaSuggestion[] {
  const out: PersonaSuggestion[] = [];
  const name = (input.name || "").trim();
  const persona = (input.persona || "").trim();
  const prompt = (input.prompt || "").trim();

  // ── 名字 ──
  if (GENERIC_NAME.test(name)) {
    out.push({
      field: "name",
      level: "warn",
      text: `「${name}」这样的名字每个圈子都能用，成员记不住也叫不出口。给它一个只属于你这个圈的名字——可以取自圈子的主题、你常说的一句话，或者你自己的字号。`,
    });
  } else if (NAME_WITH_FUNCTION.test(name)) {
    out.push({
      field: "name",
      level: "tip",
      text: `名字里带「${name.match(NAME_WITH_FUNCTION)?.[0]}」更像功能说明而不是名字。平台自己的角色叫小卜、小爻、小简——两三个字、叫得出口、有来历。`,
    });
  }
  if (name.length > 8) {
    out.push({ field: "name", level: "tip", text: "名字偏长，成员在语音里不好称呼；两到四个字最好记。" });
  }
  if (PLATFORM_NAMES.has(name)) {
    out.push({
      field: "name",
      level: "warn",
      text: `「${name}」是平台角色的名字，成员会混淆「这是圈主的助理还是平台的」。请另取一个。`,
    });
  }
  const dup = existingNames.find((n) => n && n.trim() === name);
  if (dup) {
    out.push({ field: "name", level: "tip", text: `已有别的圈子在用「${dup}」这个名字，换一个更容易让成员记住你这一个。` });
  }

  // ── 性格 ──
  if (persona.length < 30) {
    out.push({
      field: "persona",
      level: "warn",
      text: "性格写得太短，模型只能靠猜。写清楚它说话的样子：先说结论还是先讲道理、称呼成员用什么口吻、遇到抬杠怎么接。",
    });
  }
  const hitTraits = EMPTY_TRAITS.filter((t) => persona.includes(t));
  if (hitTraits.length >= 2 && persona.length < 120) {
    out.push({
      field: "persona",
      level: "tip",
      text: `「${hitTraits.join("、")}」这类词每个助理都写，落不到具体行为上。换成它会做的事，比如「先问清楚要问哪一件事，再给判断」「讲完必定补一句这属于哪一派的看法」。`,
    });
  }

  // ── 提示词 ──
  if (prompt.length < 40) {
    out.push({
      field: "prompt",
      level: "warn",
      text: "角色说明太短，助理上线后会什么都答、什么都敢答。至少写清楚：它主要答什么、答不上来时说什么、超出范围引导去哪。",
    });
  } else {
    for (const e of PROMPT_ESSENTIALS) {
      if (!e.re.test(prompt)) out.push({ field: "prompt", level: "tip", text: e.miss });
    }
  }

  // ── 圈主自己的服务 ──
  if (!input.ownerServices?.length) {
    out.push({
      field: "ownerServices",
      level: "tip",
      text: "还没填你自己提供的服务。填上之后，成员问到相关需求时助理会先介绍你的服务，而不是把人往平台其他老师那里引——这个助理是你出钱开的，立场应当站在你这边。",
    });
  }

  return out;
}
