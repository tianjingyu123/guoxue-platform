/**
 * 八宅宅书：盘面事实、八方图形与检索信号（2026-09-19，第 12 个工具）
 *
 * 八宅与玄空同是看宅，抓手不同：玄空按元运飞星、宅运二十年一变；
 * 八宅按坐山与命卦翻卦定八方，**命卦终身不变**。
 * 因此八宅有个玄空没有的层次——**宅盘管房子、命盘管人**：
 * 宅盘（坐山起游星）定门主灶的位置，命盘（命卦起游星）定这个人该朝哪边坐。
 * 两盘都要出，报告里也分两节讲。
 *
 * 数据来源是服务端存库的 `calculateBaZhai` 结果，不另起引擎重算。
 *
 * ⚠️ 算法在 2026-09-19 大修过（见 bazhai.calculator.ts 顶部）：原先八方游星表
 * 八行错七行、命卦公式错、朝向索引串表、宅命匹配恒 false。现已改由翻卦变爻法现算，
 * 与大游年歌诀、前端实现、阳宅三要的游年表三处互证。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface BazhaiFang {
  direction?: string;
  degreeRange?: string;
  star?: string;
  wuXing?: string;
  jiXiong?: string;
  yiYong?: string[];
  jiHui?: string[];
  desc?: string;
}

export interface BazhaiResultData {
  input?: { birthYear?: number; gender?: string; zuoShan?: string };
  mingGua?: { guaName?: string; guaNum?: number; group?: string; calcProcess?: string };
  zhaiGua?: { guaName?: string; group?: string; zuoShan?: string; chaoXiang?: string };
  zhaiMingMatch?: { isMatch?: boolean; score?: number; desc?: string; suggestion?: string };
  baFang?: BazhaiFang[];
  mingBaFang?: BazhaiFang[];
  mingJiFang?: { direction?: string; star?: string }[];
  menWei?: { direction?: string; star?: string; jiXiong?: string; suggestion?: string };
  zhuWo?: { direction?: string; star?: string; jiXiong?: string; suggestion?: string };
  chuFang?: { direction?: string; star?: string; jiXiong?: string; suggestion?: string };
  geJue?: string;
  duanYu?: string;
}

export interface BazhaiFacts {
  name: string;
  birthYear: number;
  gender: string;
  /** 命卦名，如「坎」 */
  mingGua: string;
  /** 东四命 / 西四命 */
  mingGroup: string;
  mingCalc: string;
  /** 宅卦名（由坐山定） */
  zhaiGua: string;
  /** 东四宅 / 西四宅 */
  zhaiGroup: string;
  zuoShan: string;
  chaoXiang: string;
  isMatch: boolean;
  matchDesc: string;
  /** 宅盘：房子各方位的游星 */
  baFang: BazhaiFang[];
  /** 命盘：这个人各方位的游星 */
  mingBaFang: BazhaiFang[];
  /** 命卦四吉方，按星力排序 */
  mingJiFang: { direction: string; star: string }[];
  menWei: { direction: string; star: string };
  zhuWo: { direction: string; star: string };
  chuFang: { direction: string; star: string };
  /** 宅盘与命盘同为吉的方位——最值得用的地方 */
  bothGood: string[];
}

const s = (v: unknown) => String(v ?? "").trim();
const JI_STARS = ["伏位", "生气", "天医", "延年"];

export function extractBazhaiFacts(data: BazhaiResultData): BazhaiFacts {
  const inp = data?.input ?? {};
  const ming = data?.mingGua ?? {};
  const zhai = data?.zhaiGua ?? {};
  const baFang = data?.baFang ?? [];
  const mingBaFang = data?.mingBaFang ?? [];

  // 两盘都吉的方位：八宅实务里最值得安排起居的地方
  const mingGoodDirs = new Set(
    mingBaFang.filter((f) => JI_STARS.includes(s(f.star))).map((f) => s(f.direction)),
  );
  const bothGood = baFang
    .filter((f) => JI_STARS.includes(s(f.star)) && mingGoodDirs.has(s(f.direction)))
    .map((f) => s(f.direction))
    .filter(Boolean);

  const pos = (p: BazhaiResultData["menWei"]) => ({ direction: s(p?.direction), star: s(p?.star) });

  return {
    name: "",
    birthYear: Number(inp.birthYear ?? 0),
    gender: s(inp.gender),
    mingGua: s(ming.guaName),
    mingGroup: s(ming.group),
    mingCalc: s(ming.calcProcess),
    zhaiGua: s(zhai.guaName),
    zhaiGroup: s(zhai.group),
    zuoShan: s(zhai.zuoShan),
    chaoXiang: s(zhai.chaoXiang),
    isMatch: Boolean(data?.zhaiMingMatch?.isMatch),
    matchDesc: s(data?.zhaiMingMatch?.desc),
    baFang,
    mingBaFang,
    mingJiFang: (data?.mingJiFang ?? []).map((f) => ({ direction: s(f.direction), star: s(f.star) })),
    menWei: pos(data?.menWei),
    zhuWo: pos(data?.zhuWo),
    chuFang: pos(data?.chuFang),
    bothGood,
  };
}

/**
 * 检索信号。
 *
 * 八宅断宅的抓手按权重排：**宅命相配与否**是全盘定性（相配的宅与不配的宅，
 * 整份建议的走向都不同）；其次是命卦与东西四命（这决定个人吉方，且终身不变）；
 * 再次是宅卦与门主灶三要落在哪颗星上。
 *
 * ⚠️ tag 必须与这里产出的值**一字不差**。读代码猜 tag 已经栽过四次
 * （六壬「涉害课」vs「涉害」、阳盘「坤2·西南」vs「坤2宫」、玄空「9运」vs「九运」），
 * 每次单测都是绿的——因为 mock 出来的 signal 是自己写的。所以这些值一律拿真盘跑过再定。
 */
export function bazhaiSignals(f: BazhaiFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const t = s(v);
    if (t) out.push({ value: t, weight, reason });
  };

  push(f.isMatch ? "宅命相配" : "宅命不配", 10, "宅命配合");
  push(f.mingGua ? `${f.mingGua}命` : undefined, 8, "命卦");
  push(f.mingGroup, 7, "东西四命");
  push(f.zhaiGua ? `${f.zhaiGua}宅` : undefined, 6, "宅卦");
  push(f.zhaiGroup, 6, "东西四宅");

  /**
   * 八星星义，低权重兜底。
   *
   * 🔴 这里原本产出 `大门${star}`／`主卧${star}`／`厨房${star}` 三个复合信号，
   * 拿真盘一跑才发现它们是**恒定值**：每盘八星俱全，门主灶又按星力排序择位，
   * 所以门永远是生气、主永远是天医、灶永远是绝命——三个 tag 不携带任何信息，
   * 反倒让另外 11 个写好的 tag 永远检索不到。已删除。
   *
   * 八宅真正随盘变化的只有：命卦、宅卦、东西四归属、相配与否。
   * 八颗星则每盘都在（变的是它们落在哪个方向，而方向由报告叙述、不作检索键），
   * 所以星义条目用低权重全量带出，供「方位分工」一节取用，不与上面的高权重信号争配额。
   */
  for (const st of ["生气", "天医", "延年", "伏位", "绝命", "五鬼", "六煞", "祸害"]) {
    push(st, 3, "游星星义");
  }
  return out;
}

/** 盘面事实逐条列出，全部来自引擎 */
export function bazhaiFactLines(f: BazhaiFacts): string[] {
  const lines = [
    f.name ? `宅名：${f.name}` : "",
    `命主：${f.birthYear} 年${f.gender}　命卦${f.mingGua}（${f.mingGroup}）`,
    f.mingCalc ? `命卦推算：${f.mingCalc}` : "",
    `宅卦：${f.zhaiGua}（${f.zhaiGroup}）　坐${f.zuoShan}朝${f.chaoXiang}`,
    `宅命配合：${f.isMatch ? "相配" : "不配"}　${f.matchDesc}`,
  ].filter(Boolean);

  // 宅盘：房子的方位分工
  lines.push("— 宅盘（以坐山起游星，管房子）—");
  for (const g of f.baFang) {
    if (!g.direction) continue;
    lines.push(`${s(g.direction)}方：${s(g.star)}（${s(g.jiXiong)}·${s(g.wuXing)}）`);
  }

  // 命盘：这个人的吉凶方
  if (f.mingBaFang.length) {
    lines.push("— 命盘（以命卦起游星，管人）—");
    for (const g of f.mingBaFang) {
      if (!g.direction) continue;
      lines.push(`${s(g.direction)}方：${s(g.star)}（${s(g.jiXiong)}）`);
    }
  }
  if (f.mingJiFang.length) {
    lines.push(`${f.mingGua}命吉方（依次）：${f.mingJiFang.map((x) => `${x.direction}（${x.star}）`).join("　")}`);
  }
  if (f.bothGood.length) {
    lines.push(`宅盘命盘皆吉之方：${f.bothGood.join("、")}　——最宜安排起居之处`);
  } else {
    lines.push("宅盘命盘无共同吉方——起居安排要在两者之间取舍，报告中说明取舍理由");
  }

  lines.push(
    `门主灶：大门${f.menWei.direction}方（${f.menWei.star}）　` +
      `主卧${f.zhuWo.direction}方（${f.zhuWo.star}）　厨房压${f.chuFang.direction}方（${f.chuFang.star}）`,
  );
  return lines;
}

/** 八方图：宅盘与命盘并排，便于看出两盘吉凶重合处 */
export function buildBazhaiChartView(f: BazhaiFacts) {
  const mingByDir = new Map(f.mingBaFang.map((g) => [s(g.direction), g]));
  return {
    kind: "bazhai" as const,
    title: "八方吉凶（宅盘·命盘）",
    cells: f.baFang.map((g) => {
      const dir = s(g.direction);
      const m = mingByDir.get(dir);
      return {
        direction: dir,
        degreeRange: s(g.degreeRange),
        zhaiStar: s(g.star),
        zhaiJiXiong: s(g.jiXiong),
        mingStar: s(m?.star),
        mingJiXiong: s(m?.jiXiong),
        bothGood: f.bothGood.includes(dir),
        wuXing: s(g.wuXing),
      };
    }),
    provenance: [
      { label: "命主", value: `${f.birthYear} 年${f.gender}` },
      { label: "命卦", value: `${f.mingGua}（${f.mingGroup}）` },
      { label: "宅卦", value: `${f.zhaiGua}（${f.zhaiGroup}）` },
      { label: "坐向", value: `坐${f.zuoShan}朝${f.chaoXiang}` },
      { label: "宅命配合", value: f.isMatch ? "相配" : "不配" },
      { label: "游星起法", value: "翻卦变爻法（大游年）" },
    ],
  };
}
