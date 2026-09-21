import dict from "./opencc-ts-1.1.9.json";
import variantMap from "./variant-map-1.json";

/**
 * 古籍简体阅读版转换（S03）：确定性、可复核、不改底本。
 *
 * 数据：OpenCC ver.1.1.9 的 TSCharacters / TSPhrases（Apache-2.0，许可证见同目录 OPENCC-LICENSE.txt），
 * 以数据文件形式入库，不新增 npm 依赖（锁文件由多个窗口共用，避免单写者冲突）。
 *
 * 规则（按优先级）：
 * 0. 异体字先归一到标准繁体（variant-map-1.json：OpenCC 地区/日本变体表反向 + Unihan kZVariant 自动收录，
 *    外加按真实数据高频残留人工核定的一批，如 隂→陰、逺→遠、扵→於、徳→德、増→增）；
 *    规范字、本身是独立古汉字的（糸、睪、豊…）、卦名（遯）一律不动，生成规则见 scripts/build-variant-map.py。
 *    归一后再走下面的规则，所以「宫商角徴羽」先成「徵」再被词组表保护；
 *    OpenCC 字表本身产出的个别非规范字（頴→颕）在输出侧再归一一次
 * 1. 词组优先（最长匹配）：如「乾隆」「乾坤」按词组转换，不拆字
 * 2. 平台保留字：多候选字里有古籍/易学专义的，**保留原字**并记录位置待复核，不盲目替换
 *    - 乾：OpenCC 词组表已含乾卦/乾元/乾道/乾坤等 26 条，但词组之外的单字「乾」
 *      （如「乾：元亨利貞」「乾為天」「乾宮」）会被字表首选「干」改义，故单字保留
 *    （「徵」不在此列：OpenCC 词组已覆盖五音义——角徵羽、變徵之聲、流徵、徵音等——
 *      单字「徵」取「征」反而正确：徵召→征召、徵兆→征兆。初判想保留，被词组表数据推翻）
 *    - 夥：古文「多」义（如「夥颐」），与「伙伴」之「伙」不同
 * 3. 单候选字直接转换；其余多候选字取 OpenCC 首选（均为通行规范写法）
 * 4. **只接受等长映射**：输出与原文按码点一一对应，因此简体版上的划线、注释、朗读位置可原样映射回底本
 * 5. 字表里没有的字（罕见字、私用区字、符号）一律不动
 */

export const SIMPLIFIED_POLICY_VERSION = "t2s-opencc-1.1.9-policy-2"; // policy-2：加入异体字归一

/** 平台保留：遇到这些字（且不在已匹配词组内）时保留原字 */
export const KEEP_ORIGINAL: Record<string, string> = {
  乾: "卦名义（乾為天、乾宮）；字表首选「干」会改义",
  夥: "古文「多」义，与「伙伴」之伙不同",
};

/**
 * 平台定规则的转换目标（不计入待复核）：
 * - 餘→馀：《通用规范汉字表》规定「余」「馀」可能混淆时仍用「馀」；古籍里「余」多作第一人称，
 *   真实数据预览（300 章、135 万字）中「餘」出现 616 处，保留繁体影响阅读，改用规范许可的「馀」
 */
export const FIXED_TARGET: Record<string, { to: string; reason: string }> = {
  餘: { to: "馀", reason: "通用规范汉字表：余/馀可能混淆时用馀；古文「余」多为第一人称" },
};

type Dict = { chars: Record<string, string[]>; phrases: Record<string, string>; version: string; sha256: Record<string, string> };
const D = dict as unknown as Dict;

const CHAR_MAP = new Map<string, string>();
for (const [k, v] of Object.entries(D.chars)) {
  const target = v[0];
  // 码点与 UTF-16 长度都相等才收：段落偏移用的是 JS 字符串下标
  if (target && Array.from(k).length === 1 && Array.from(target).length === 1 && k.length === target.length) CHAR_MAP.set(k, target);
}
type VariantMap = { version: string; entries: Record<string, { to: string; src: string[] }> };
const V = variantMap as unknown as VariantMap;
const VARIANT = new Map<string, string>();
for (const [k, e] of Object.entries(V.entries)) {
  // 同样只收码点与 UTF-16 长度都相等的
  if (Array.from(k).length === 1 && Array.from(e.to).length === 1 && k.length === e.to.length) VARIANT.set(k, e.to);
}

const AMBIGUOUS = new Set(Object.entries(D.chars).filter(([, v]) => v.length > 1).map(([k]) => k));

const PHRASES = new Map<string, string[]>();
let MAX_PHRASE = 1;
for (const [k, v] of Object.entries(D.phrases)) {
  const src = Array.from(k);
  const dst = Array.from(v);
  if (src.length !== dst.length || k.length !== v.length || src.length < 2) continue; // 非等长词组不用，保证位置一一对应
  PHRASES.set(k, dst);
  MAX_PHRASE = Math.max(MAX_PHRASE, src.length);
}

export interface SimplifiedResult {
  text: string;
  /** 与原文码点数一致（恒为 true；若为 false 说明词典被改坏，调用方必须拒用） */
  sameLength: boolean;
  /** 保留原字待复核的位置（码点下标） */
  keptAmbiguous: Array<{ index: number; char: string; reason: string }>;
  changedCount: number;
  /** 其中经异体字归一的字数 */
  variantCount: number;
  policyVersion: string;
  dictVersion: string;
}

export function toSimplified(input: string): SimplifiedResult {
  const orig = Array.from(input);
  // 先把异体字归一到标准繁体，后续词组/保留/单字规则都在归一后的字上判断
  let variantCount = 0;
  const src = orig.map((c) => {
    const t = VARIANT.get(c);
    if (t) variantCount++;
    return t ?? c;
  });
  const out: string[] = new Array(src.length);
  const kept: SimplifiedResult["keptAmbiguous"] = [];

  let i = 0;
  while (i < src.length) {
    let matched = false;
    for (let len = Math.min(MAX_PHRASE, src.length - i); len >= 2; len--) {
      const key = src.slice(i, i + len).join("");
      const hit = PHRASES.get(key);
      if (hit) {
        for (let j = 0; j < len; j++) out[i + j] = hit[j];
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const ch = src[i];
    const fixed = FIXED_TARGET[ch];
    if (fixed && fixed.to.length === ch.length) {
      out[i] = fixed.to;
    } else if (KEEP_ORIGINAL[ch]) {
      out[i] = ch;
      kept.push({ index: i, char: ch, reason: KEEP_ORIGINAL[ch] });
    } else {
      out[i] = CHAR_MAP.get(ch) ?? ch;
    }
    i++;
  }
  // OpenCC 字表本身会产出个别非规范字（如 頴→颕），输出侧再归一一次
  for (let j = 0; j < out.length; j++) {
    const t = VARIANT.get(out[j]);
    if (t) {
      out[j] = CHAR_MAP.get(t) ?? t;
      if (src[j] === orig[j]) variantCount++;
    }
  }
  const text = out.join("");
  let changed = 0;
  for (let j = 0; j < orig.length; j++) if (out[j] !== orig[j]) changed++;
  return {
    text,
    sameLength: Array.from(text).length === orig.length && text.length === input.length,
    keptAmbiguous: kept,
    changedCount: changed,
    variantCount,
    policyVersion: SIMPLIFIED_POLICY_VERSION,
    dictVersion: D.version,
  };
}

/** 词典完整性：入库文件的来源校验和，供测试与运维核对 */
export const SIMPLIFIED_DICT_META = {
  version: D.version,
  sha256: D.sha256,
  ambiguousChars: AMBIGUOUS.size,
  variantVersion: V.version,
  variantEntries: VARIANT.size,
};

/**
 * 把简体版上的码点区间映射回原文：等长转换下就是同一区间，
 * 这里显式提供函数，调用方不要自己假设。
 */
export function mapRangeToOriginal(start: number, end: number): { start: number; end: number } {
  return { start, end };
}
