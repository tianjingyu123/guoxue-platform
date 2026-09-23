/**
 * 阴盘奇门课书：盘面事实、用神取象与检索信号（2026-09-19，第 13 个工具）
 *
 * ══ 这个模块和前 12 个都不一样，先说清楚为什么 ══
 *
 * 前面那些工具的报告是**格局驱动**的：盘面算出「旺山旺向」「涉害课」「妻财持世」，
 * 拿这个名目去知识库命中一条条目，条目里写好了该说什么。
 *
 * **阴盘奇门没有这样的名目可查。** 它的断法叫取象直读：
 * 看用神落在哪一宫，把那一宫上的天盘干、地盘干、九星、八门、八神各自的象意取出来，
 * 结合所问之事组合成一句话。同一组符号，问病、问婚、问生意读出来是三件事。
 *
 * 所以这里的 signals **不是格局名，而是用神宫上实际出现的那几个符号**
 * （乙、天芮、杜门、六合、空亡……）。知识库回给模型的也不是现成断语，
 * 而是每个符号的**象意扇面**（按人物／身体／物品／场所／行业分列），
 * 由模型按所问之事挑合适的那一支去组合。
 *
 * 换句话说：别的工具是「查答案」，这个工具是「给原料 + 给方法 + 给示范」。
 *
 * ⚠️ tag 必须与这里产出的值一字不差。本项目已经栽过四次
 * （六壬「涉害课」vs「涉害」、阳盘「坤2·西南」vs「坤2宫」、玄空「9运」vs「九运」），
 * 每次单测都是绿的——因为 mock 出来的 signal 是自己写的。所以这些值一律拿真盘跑过。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface YinpanGong {
  index?: number;
  name?: string;
  bagua?: string;
  men?: string;
  shen?: string;
  star?: string;
  tianPan?: string;
  diPan?: string;
  anGan?: string;
  kongWang?: boolean;
  ruMu?: string[];
  jiXing?: string[];
  xingMu?: string[];
  menPo?: boolean;
  maXing?: boolean;
  isZhifu?: boolean;
  isZhishi?: boolean;
}

export interface YinpanResultData {
  gongs?: YinpanGong[];
  dunType?: string;
  juNumber?: number;
  zhiFu?: string;
  zhiShiMen?: string;
  jieQi?: string;
  yongShi?: string;
  meta?: {
    siZhu?: Record<string, { gan: string; zhi: string }>;
    kongWang?: Record<string, string>;
  };
}

/** 九宫方位 */
const PALACE_INFO: Record<number, { dir: string; gua: string }> = {
  1: { dir: "正北", gua: "坎" },
  2: { dir: "西南", gua: "坤" },
  3: { dir: "正东", gua: "震" },
  4: { dir: "东南", gua: "巽" },
  5: { dir: "中央", gua: "中" },
  6: { dir: "西北", gua: "乾" },
  7: { dir: "正西", gua: "兑" },
  8: { dir: "东北", gua: "艮" },
  9: { dir: "正南", gua: "离" },
};

/** 九宫盘的视觉排布（洛书） */
const GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

const s = (v: unknown) => String(v ?? "").trim();
const palaceKey = (n: number) => (PALACE_INFO[n] ? `${PALACE_INFO[n].gua}${n}宫` : `${n}宫`);
const palaceLabel = (n: number) =>
  PALACE_INFO[n] ? `${PALACE_INFO[n].gua}${n}宫（${PALACE_INFO[n].dir}）` : `${n}宫`;

/**
 * 问事类型 → 该取哪些用神。
 *
 * 阴盘取用神比阳盘灵活（年月日时／方位／年命／报数四路），这里实现的是最常用的
 * 「年月日时 + 按事类固定」两路的组合。**日干（自己）永远取**——
 * 无论问什么，问事人自己那一宫都要看，这是所有解读的立足点。
 */
type YongKind = "men" | "star" | "gan" | "shen";
const YONGSHEN_BY_MATTER: Record<string, { role: string; kind: YongKind; value: string; why: string }[]> = {
  财: [{ role: "财", kind: "men", value: "生门", why: "问财第一用神看生门落宫" }],
  事业: [{ role: "事业", kind: "men", value: "开门", why: "开门主公开、正事、职位" }],
  工作: [{ role: "事业", kind: "men", value: "开门", why: "开门主公开、正事、职位" }],
  婚姻: [
    { role: "妻", kind: "gan", value: "乙", why: "问婚姻乙为妻" },
    { role: "夫", kind: "gan", value: "庚", why: "问婚姻庚为夫" },
  ],
  感情: [
    { role: "妻", kind: "gan", value: "乙", why: "问感情乙为女方" },
    { role: "夫", kind: "gan", value: "庚", why: "问感情庚为男方" },
  ],
  官司: [
    { role: "公家", kind: "men", value: "开门", why: "开门主官方、法院" },
    { role: "诉讼", kind: "men", value: "惊门", why: "惊门主口舌、诉讼" },
  ],
  疾病: [{ role: "病", kind: "star", value: "天芮", why: "天芮主疾病，落宫即病之所在" }],
  健康: [{ role: "病", kind: "star", value: "天芮", why: "天芮主疾病，落宫即病之所在" }],
  学业: [{ role: "文书", kind: "men", value: "景门", why: "景门主文书、考试" }],
  考试: [{ role: "文书", kind: "men", value: "景门", why: "景门主文书、考试" }],
  出行: [{ role: "行", kind: "men", value: "开门", why: "开门主道路通达" }],
  合作: [{ role: "合", kind: "shen", value: "六合", why: "六合主合作、撮合（八神取象）" }],
};

export interface YinpanYongshen {
  /** 角色，如「自己」「财」「夫」 */
  role: string;
  /** 取的是什么符号，如「日干乙」「生门」 */
  symbol: string;
  /** 为什么取它 */
  why: string;
  /** 落在哪一宫（1-9），找不到为 0 */
  palace: number;
  palaceKey: string;
  palaceLabel: string;
  /** 该宫上的全部符号 */
  symbols: string[];
  /** 该宫的四害与马星 */
  states: string[];
}

export interface YinpanFacts {
  matter: string;
  matterType: string;
  ju: string;
  sizhu: string;
  yongShi: string;
  zhifu: string;
  zhishi: string;
  kongwang: string;
  /** 定局取数明细，供用户自己复核——阴盘掌上可算，这一步最该摊开 */
  juParts: string;
  yongshen: YinpanYongshen[];
  /** 九宫逐宫 */
  gongs: YinpanGong[];
}

/** 从所问之事猜问事类型；猜不出返回空（此时只取日干自己） */
export function guessMatterType(matter: string): string {
  const m = s(matter);
  if (!m) return "";
  const table: [string, RegExp][] = [
    ["财", /财|钱|收入|投资|生意|买卖|利润|资金|亏|赚/],
    ["事业", /事业|工作|职位|升职|跳槽|求职|面试|创业/],
    ["婚姻", /婚|配偶|老公|老婆|丈夫|妻子|结婚|离婚/],
    ["感情", /感情|恋爱|对象|喜欢|追|分手|复合/],
    ["官司", /官司|诉讼|打官司|法院|起诉|纠纷|仲裁/],
    ["疾病", /病|身体|健康|手术|住院|检查|难受/],
    ["学业", /学业|考试|考研|高考|升学|成绩|学习/],
    ["出行", /出行|出差|旅行|搬家|远行|出国/],
    ["合作", /合作|合伙|谈判|签约|项目/],
  ];
  for (const [type, re] of table) if (re.test(m)) return type;
  return "";
}

function gongOf(data: YinpanResultData, n: number) {
  return (data.gongs ?? []).find((g) => Number(g.index) === n);
}

/** 一个宫上出现的全部符号（用于取象与检索） */
function symbolsOf(g: YinpanGong | undefined): string[] {
  if (!g) return [];
  const out: string[] = [];
  // 天盘干可能双干（值符宫），拆开
  for (const ch of s(g.tianPan)) out.push(ch);
  const di = s(g.diPan);
  if (di && !out.includes(di)) out.push(di);
  // 九星可能双星（禽随芮），拆成两个星名
  const star = s(g.star);
  for (const name of star.match(/天./g) ?? []) out.push(name);
  const men = s(g.men);
  if (men) out.push(men.endsWith("门") ? men : `${men}门`);
  const shen = s(g.shen);
  if (shen) out.push(shen);
  return out.filter(Boolean);
}

/** 一个宫的四害与马星 */
function statesOf(g: YinpanGong | undefined): string[] {
  if (!g) return [];
  const out: string[] = [];
  if (g.kongWang) out.push("空亡");
  if (g.ruMu?.length) out.push("入墓");
  if (g.jiXing?.length) out.push("击刑");
  if (g.menPo) out.push("门迫");
  if (g.maXing) out.push("马星");
  return out;
}

/** 在盘上找某个符号落在哪一宫 */
function findPalace(data: YinpanResultData, kind: YongKind, value: string): number {
  for (const g of data.gongs ?? []) {
    const n = Number(g.index);
    if (kind === "men" && s(g.men) && value.startsWith(s(g.men))) return n;
    if (kind === "star" && s(g.star).includes(value)) return n;
    if (kind === "shen" && s(g.shen) === value) return n;
    if (kind === "gan" && (s(g.tianPan).includes(value) || s(g.diPan) === value)) return n;
  }
  return 0;
}

export function extractYinpanFacts(
  data: YinpanResultData,
  opts?: { matter?: string; juParts?: string },
): YinpanFacts {
  const meta = data.meta ?? {};
  const sz = meta.siZhu ?? {};
  const pillar = (k: string) => (sz[k] ? `${sz[k].gan}${sz[k].zhi}` : "");
  const kw = meta.kongWang ?? {};
  const matter = s(opts?.matter).slice(0, 60);
  const matterType = guessMatterType(matter);

  const build = (role: string, symbol: string, why: string, palace: number): YinpanYongshen => {
    const g = gongOf(data, palace);
    return {
      role, symbol, why,
      palace,
      palaceKey: palace ? palaceKey(palace) : "",
      palaceLabel: palace ? palaceLabel(palace) : "（盘上未见）",
      symbols: symbolsOf(g),
      states: statesOf(g),
    };
  };

  const yongshen: YinpanYongshen[] = [];

  // 日干＝问事人自己，**无论问什么都取**——这是所有解读的立足点
  const riGan = sz["ri"]?.gan ?? "";
  if (riGan) {
    yongshen.push(build("自己", `日干${riGan}`, "年月日时取用神：日干为问事人自己", findPalace(data, "gan", riGan)));
  }

  // 按问事类型追加
  for (const spec of YONGSHEN_BY_MATTER[matterType] ?? []) {
    yongshen.push(build(spec.role, spec.value, spec.why, findPalace(data, spec.kind, spec.value)));
  }

  return {
    matter,
    matterType,
    ju: data.juNumber ? `${data.dunType === "yang" ? "阳遁" : "阴遁"}${data.juNumber}局` : "",
    sizhu: `${pillar("nian")}年 ${pillar("yue")}月 ${pillar("ri")}日 ${pillar("shi")}时`,
    yongShi: s(data.yongShi),
    zhifu: s(data.zhiFu),
    zhishi: s(data.zhiShiMen),
    kongwang: ["nian", "yue", "ri", "shi"]
      .map((k) => (kw[k] ? `${({ nian: "年", yue: "月", ri: "日", shi: "时" } as Record<string, string>)[k]}空${kw[k]}` : ""))
      .filter(Boolean)
      .join("　"),
    juParts: s(opts?.juParts),
    yongshen,
    gongs: data.gongs ?? [],
  };
}

/**
 * 检索信号。
 *
 * **权重设计与别的工具不同**：这里高权重的不是「结论性的名目」，而是
 * **用神宫上的符号**——因为模型要拿它们的象意扇面去组合，符号取不全就无从读起。
 *
 * 常驻信号（取象直读／阴盘起局）保证方法类条目与观点对照每次都在，
 * 这是阴盘特别需要的：它没有格局兜底，方法丢了模型就只能自由发挥。
 */
export function yinpanSignals(f: YinpanFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const seen = new Set<string>();
  const push = (v: string | undefined, weight: number, reason: string) => {
    const t = s(v);
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push({ value: t, weight, reason });
  };

  // 常驻：方法与观点对照。阴盘没有格局兜底，方法条目必须每次都在。
  push("取象直读", 10, "断法总纲");
  push("阴盘起局", 9, "起局与源流");

  // 用神宫上的符号——这是取象的原料，权重最高的一批
  for (const y of f.yongshen) {
    for (const st of y.states) push(st, 9, `${y.role}宫四害`);
    for (const sym of y.symbols) push(sym, 8, `${y.role}宫符号（${y.symbol}落${y.palaceKey || "?"}）`);
  }

  // 值符值使所临的星门：全盘的主事者，即便不在用神宫也要带出象意
  push(f.zhifu, 5, "值符所临之星");
  push(f.zhishi ? (f.zhishi.endsWith("门") ? f.zhishi : `${f.zhishi}门`) : undefined, 5, "值使所临之门");

  // 拆补移：有调整需求时才有意义，常驻低权重
  push("拆补移", 4, "调整手段");
  return out;
}

/** 盘面事实逐条列出，全部来自引擎 */
export function yinpanFactLines(f: YinpanFacts): string[] {
  const lines = [
    f.matter ? `所问：${f.matter}${f.matterType ? `（判为「${f.matterType}」类）` : "（未能判别类型，只取日干自己）"}` : "",
    `起局：${f.ju}　用时 ${f.yongShi}`,
    f.juParts ? `定局取数：${f.juParts}` : "",
    `四柱：${f.sizhu}`,
    f.kongwang ? `空亡：${f.kongwang}` : "",
    `值符${f.zhifu}　值使${f.zhishi}`,
  ].filter(Boolean);

  // 用神：这是全篇的重心，逐个摆开
  lines.push("— 用神落宫（取象的落脚处）—");
  for (const y of f.yongshen) {
    lines.push(
      `【${y.role}】${y.symbol} → ${y.palaceLabel}　（${y.why}）\n` +
        `　　宫上符号：${y.symbols.join("、") || "（无）"}` +
        `${y.states.length ? `　　四害：${y.states.join("、")}` : "　　四害：无"}`,
    );
  }

  // 九宫全貌
  lines.push("— 九宫全盘 —");
  for (const n of GRID_ORDER) {
    const g = gongOf({ gongs: f.gongs }, n);
    if (!g) continue;
    const st = statesOf(g);
    lines.push(
      `${palaceLabel(n)}：${s(g.shen)} ${s(g.star)} ${s(g.men)}　天盘${s(g.tianPan)} 地盘${s(g.diPan)}` +
        `${g.anGan ? ` 暗${s(g.anGan)}` : ""}${st.length ? `　【${st.join("、")}】` : ""}`,
    );
  }
  return lines;
}

/** 九宫图：标出用神宫与四害 */
export function buildYinpanChartView(f: YinpanFacts) {
  const yongByPalace = new Map<number, string[]>();
  for (const y of f.yongshen) {
    if (!y.palace) continue;
    yongByPalace.set(y.palace, [...(yongByPalace.get(y.palace) ?? []), y.role]);
  }

  return {
    kind: "yinpan" as const,
    title: "阴盘九宫",
    cells: GRID_ORDER.map((n) => {
      const g = gongOf({ gongs: f.gongs }, n);
      return {
        palace: n,
        name: PALACE_INFO[n]?.gua ?? "",
        direction: PALACE_INFO[n]?.dir ?? "",
        shen: s(g?.shen),
        star: s(g?.star),
        men: s(g?.men),
        tianPan: s(g?.tianPan),
        diPan: s(g?.diPan),
        anGan: s(g?.anGan),
        states: statesOf(g),
        /** 这一宫是谁的用神宫，空数组表示不是 */
        yongshenRoles: yongByPalace.get(n) ?? [],
        isZhifu: Boolean(g?.isZhifu),
        isZhishi: Boolean(g?.isZhishi),
      };
    }),
    provenance: [
      f.matter ? { label: "所问", value: f.matter } : null,
      { label: "起局", value: f.ju },
      f.juParts ? { label: "定局取数", value: f.juParts } : null,
      { label: "四柱", value: f.sizhu },
      { label: "值符值使", value: `${f.zhifu} / ${f.zhishi}` },
      { label: "起局法", value: "阴盘：年月日时取数除九，不查节气，逐时辰换盘" },
    ].filter(Boolean) as { label: string; value: string }[],
  };
}
