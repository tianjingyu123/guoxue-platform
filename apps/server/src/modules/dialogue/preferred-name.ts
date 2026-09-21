/**
 * 用户称呼（2026-09-18）
 *
 * 决策人要求：「对话机器人和用户沟通时，用户的称呼怎么确定？有些用户名不适合作为称呼，
 * 对话机器人应该有判断力，不适合的情况，他应该主动和用户商量询问确定称呼，然后自己记忆存储。」
 *
 * 这件事看着小，但直接决定第一句话的观感：
 * 张口叫一声「abc123 您好」，后面讲得再专业，用户也知道对面不是个上心的人。
 *
 * 三步：
 * 1. **判断昵称能不能当称呼**——默认名、ID、乱码、广告、过长、自嘲自贬的，都不合适。
 *    尤其自嘲类（「废物一个」「倒霉蛋」）：当面叫出来是二次伤害，宁可不叫。
 * 2. **不合适就问一次**，用商量的口气，且允许用户不答（「不想说就直接问，我不追着问」）。
 * 3. **问过就记住**，也**只问一次**——追着问称呼比叫错更烦人。
 */

export type NameSource = "asked" | "nickname";

/** 判定结果：不合适时给出原因，供话术选择措辞 */
export type NameVerdict =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "placeholder" | "identifier" | "too_long" | "symbols" | "ad" | "self_deprecating" | "offensive" };

/** 平台与第三方的默认昵称 */
const PLACEHOLDER = /^(微信|QQ|游客|匿名|新)?用户[_\-]?[0-9a-zA-Z]*$|^(用户|游客|匿名|未命名|昵称|nickname|user)$/i;
/** 一眼就是账号 ID 而不是名字：纯字母数字、带连字符的串 */
const IDENTIFIER = /^[0-9a-zA-Z][0-9a-zA-Z_\-.]{3,}$/;
/** 通篇符号表情，读不出来 */
const SYMBOLS_ONLY = /^[^一-龥a-zA-Z]+$/;
/** 广告与联系方式 */
const AD = /(加|\+|➕)?\s*(微信|vx|VX|威信|薇信|Q{1,2}群?|电话|手机|代理|招商|推广|www\.|http)/i;
/**
 * 自嘲自贬：当面叫出来是二次伤害。
 * 用户自己起这种名可能只是玩笑，但由机器人一本正经地叫出口，性质就变了。
 */
const SELF_DEPRECATING = /(废物|垃圾|失败者|倒霉|穷鬼|丑八怪|多余的人|没人爱|孤儿|单身狗|舔狗)/;
/** 明显不雅或攻击性 */
const OFFENSIVE = /(傻|蠢|滚|贱|婊|妈的|去死|杀|操你)/;

/** 称呼最长几个字：超过就不适合在对话里反复叫 */
const MAX_LEN = 8;

/** 这个昵称能不能直接当称呼 */
export function judgeNickname(nickname?: string | null): NameVerdict {
  const raw = (nickname ?? "").trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (PLACEHOLDER.test(raw)) return { ok: false, reason: "placeholder" };
  if (OFFENSIVE.test(raw)) return { ok: false, reason: "offensive" };
  if (SELF_DEPRECATING.test(raw)) return { ok: false, reason: "self_deprecating" };
  if (AD.test(raw)) return { ok: false, reason: "ad" };
  if (SYMBOLS_ONLY.test(raw)) return { ok: false, reason: "symbols" };
  if (IDENTIFIER.test(raw)) return { ok: false, reason: "identifier" };
  if ([...raw].length > MAX_LEN) return { ok: false, reason: "too_long" };
  return { ok: true, name: raw };
}

/**
 * 从用户的回答里认出他想被怎么称呼。
 * 只认明确的表达，认不出就返回 null——猜错了比不猜更尴尬。
 */
export function extractPreferredName(text?: string | null): string | null {
  const t = (text ?? "").trim();
  if (!t || t.length > 40) return null;

  // 明确拒绝：记下来，别再问
  if (/(不用|不必|随便|无所谓|都行|算了|不想说)/.test(t) && t.length <= 12) return null;

  const patterns = [
    /(?:就)?(?:叫|喊|称呼)我(.{1,8}?)(?:就(?:行|好|可以)|吧|即可|$)/,
    /(?:我)?(?:是|姓|叫)(.{1,8}?)(?:就(?:行|好)|吧|$)/,
    /^(.{1,8}?)(?:就(?:行|好|可以)|即可)$/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    const cand = m?.[1]?.trim();
    if (!cand) continue;
    // 抽出来的也要过一遍判定：用户可能说「叫我废物就行」
    const v = judgeNickname(cand);
    if (v.ok) return v.name;
  }
  return null;
}

/**
 * 给模型的称呼指令。
 *
 * @param preferred 已确认的称呼（用户自己定的，优先级最高）
 * @param nickname 平台昵称
 * @param alreadyAsked 是否已经问过（问过就不再问，追着问比叫错更烦人）
 */
export function buildAddressPrompt(opts: {
  preferred?: string | null;
  nickname?: string | null;
  alreadyAsked?: boolean;
}): string {
  const preferred = (opts.preferred ?? "").trim();
  if (preferred) {
    return `【称呼】用户希望你称呼他「${preferred}」，全程这样叫，不要改口，也不要再问称呼的事。`;
  }

  const v = judgeNickname(opts.nickname);
  if (v.ok) {
    return `【称呼】可以称呼他「${v.name}」（来自他的昵称）。若他中途提出换个叫法，以他说的为准。`;
  }

  // 昵称不适合。已经问过一次就别再问了
  if (opts.alreadyAsked) {
    return "【称呼】还不知道怎么称呼他，**不要再问**（已经问过一次）。用「你」就好，不要生造称呼，也不要用他的账号名。";
  }

  const why: Record<Exclude<NameVerdict & { ok: false }, never>["reason"], string> = {
    empty: "他还没设昵称",
    placeholder: "他用的是系统默认昵称",
    identifier: "他的昵称是一串账号名",
    too_long: "他的昵称太长，不好当面叫",
    symbols: "他的昵称全是符号，念不出来",
    ad: "他的昵称里带联系方式",
    self_deprecating: "他的昵称带自嘲意味，当面叫出来不合适",
    offensive: "他的昵称不适合当面叫",
  };

  return [
    `【称呼】${why[v.reason]}，所以你还不知道该怎么称呼他。`,
    "在这一轮回答的**结尾**，用一句话顺口问一下希望你怎么称呼——像朋友之间那样商量，不要做成填表。",
    "**只问这一次**：他说了就照他说的叫；他没答或说随便，就一直用「你」，别再提这件事。",
    "在他回答之前，不要用账号名称呼他，也不要自己编一个称呼。",
  ].join("\n");
}
