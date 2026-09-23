/**
 * 金口诀课书：盘面事实、四位图形与检索信号（2026-09-18）
 *
 * 金口诀（孙膑预测法）的路子：月将加时得将神 → 日干起贵人得贵神 →
 * 五子元遁得人元 → 连同地分成「四位课」，再按阴阳取用爻。
 * **断的重心在用爻**：四位里取出的那一位，就是这件事的着落处。
 *
 * 数据来源是服务端存库的 `computeJinkoujue` 结果（与前端页面同一份算法，
 * 缘由见 shared/paipan/jinkoujue-engine.ts），不另起引擎重算。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface JkjPosition {
  role: string;
  char: string;
  gan?: string;
  starName?: string;
  wuxing?: string;
  yinyang?: string;
  wangShuai?: string;
}

export interface JinkoujueResultData {
  topic?: string;
  dateLabel?: string;
  lunarLabel?: string;
  jieqiRange?: string;
  pillars?: { year?: string; month?: string; day?: string; time?: string };
  yuejiang?: { zhi?: string; name?: string; method?: string };
  difen?: { zhi?: string; method?: string };
  xunKong?: string[];
  siDaKong?: string;
  positions?: JkjPosition[];
  dongYao?: { name?: string; desc?: string; positions?: string }[];
  keTi?: { name?: string; desc?: string; luck?: string }[];
  shenSha?: Record<string, string[]>;
  summary?: string[];
  yongRole?: string;
}

export interface JinkoujueFacts {
  matter: string;
  sizhu: string;
  lunarText: string;
  yuejiang: string;
  yuejiangMethod: string;
  difen: string;
  difenMethod: string;
  /** 用爻所在位（人元/贵神/将神/地分）——断语重心 */
  yongRole: string;
  /** 用爻那一位的配置 */
  yongChar: string;
  yongWuxing: string;
  yongWangShuai: string;
  guiShenStar: string;
  xunKong: string;
  siDaKong: string;
  /** 动爻名（妻动/贼动等，已去重） */
  dongYao: string[];
  keTi: string[];
  positions: JkjPosition[];
  shenSha: Record<string, string[]>;
}

const s = (v: unknown) => String(v ?? "").trim();

export function extractJinkoujueFacts(data: JinkoujueResultData): JinkoujueFacts {
  const pos = data?.positions ?? [];
  const byRole = (r: string) => pos.find((p) => s(p.role) === r);
  const yongRole = s(data?.yongRole);
  const yong = byRole(yongRole);
  const p = data?.pillars ?? {};

  return {
    matter: s(data?.topic),
    sizhu: [p.year, p.month, p.day, p.time].map(s).filter(Boolean).join(" "),
    lunarText: s(data?.lunarLabel),
    yuejiang: data?.yuejiang ? `${s(data.yuejiang.zhi)}（${s(data.yuejiang.name)}）` : "",
    yuejiangMethod: s(data?.yuejiang?.method),
    difen: s(data?.difen?.zhi),
    difenMethod: s(data?.difen?.method),
    yongRole,
    yongChar: yong ? `${s(yong.gan)}${s(yong.char)}` : "",
    yongWuxing: s(yong?.wuxing),
    yongWangShuai: s(yong?.wangShuai),
    guiShenStar: s(byRole("贵神")?.starName),
    xunKong: (data?.xunKong ?? []).map(s).join(""),
    siDaKong: s(data?.siDaKong),
    // 引擎给的动爻带细分来源（如「妻动（干克将）」），报告按类型去重展示
    dongYao: [...new Set((data?.dongYao ?? []).map((x) => s(x.name).replace(/（.*/, "")).filter(Boolean))],
    keTi: (data?.keTi ?? []).map((k) => s(k.name)).filter(Boolean),
    positions: pos,
    shenSha: data?.shenSha ?? {},
  };
}

/**
 * 检索信号。
 *
 * 断语重心在**用爻所在位**（取出的那一位就是事情的着落处），所以权重最高；
 * 其次是四位里最能定性的贵神天将与动爻；月将与地分说的是起课的底子。
 *
 * **tag 必须与这里产出的值一字不差**——读代码猜 tag 已经栽过四次
 * （六壬「涉害课」、阳盘「坤2宫」、玄空「9运 vs 九运」），所以这些值都拿真盘核过。
 */
export function jinkoujueSignals(f: JinkoujueFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const t = s(v);
    if (t) out.push({ value: t, weight, reason });
  };

  push(f.yongRole ? `用在${f.yongRole}` : undefined, 10, "用爻所在位");
  push(f.guiShenStar, 8, "贵神天将");
  for (const d of f.dongYao) push(d, 7, "动爻");
  for (const k of f.keTi.slice(0, 3)) push(k, 6, "课体");
  push(f.yuejiang ? `月将${f.yuejiang.slice(0, 1)}` : undefined, 4, "月将");
  push(f.difen ? `地分${f.difen}` : undefined, 4, "地分");
  return out;
}

/** 盘面事实逐条列出，全部来自引擎 */
export function jinkoujueFactLines(f: JinkoujueFacts): string[] {
  const lines = [
    f.matter ? `所问：${f.matter}` : "",
    f.sizhu ? `四柱：${f.sizhu}` : "",
    f.lunarText ? `农历：${f.lunarText}` : "",
    `月将：${f.yuejiang}（${f.yuejiangMethod}换将）　地分：${f.difen}（${f.difenMethod}）`,
    f.xunKong ? `日空：${f.xunKong}　四大空亡：${f.siDaKong}` : "",
  ].filter(Boolean);

  for (const p of f.positions) {
    lines.push(
      `${s(p.role)}：${s(p.gan)}${s(p.char)}` +
        `${p.starName ? `（${s(p.starName)}）` : ""}　${s(p.wuxing)}${s(p.yinyang)}　${s(p.wangShuai)}` +
        `${s(p.role) === f.yongRole ? "　← 用爻" : ""}`,
    );
  }
  if (f.dongYao.length) lines.push(`动爻：${f.dongYao.join("、")}`);
  if (f.keTi.length) lines.push(`课体：${f.keTi.join("、")}`);
  for (const [role, names] of Object.entries(f.shenSha)) {
    if (names?.length) lines.push(`${role}神煞：${names.join("、")}`);
  }
  return lines;
}

/** 四位课图：人元/贵神/将神/地分自上而下 */
export function buildJinkoujueChartView(f: JinkoujueFacts) {
  return {
    kind: "jinkoujue" as const,
    title: "四位课",
    cells: f.positions.map((p) => ({
      role: s(p.role),
      ganzhi: `${s(p.gan)}${s(p.char)}`,
      star: s(p.starName),
      wuxing: s(p.wuxing),
      yinyang: s(p.yinyang),
      wangShuai: s(p.wangShuai),
      isYong: s(p.role) === f.yongRole,
    })),
    provenance: [
      f.matter ? { label: "所问何事", value: f.matter } : null,
      f.sizhu ? { label: "四柱", value: f.sizhu } : null,
      { label: "月将", value: `${f.yuejiang}　${f.yuejiangMethod}换将` },
      { label: "地分", value: `${f.difen}　${f.difenMethod}` },
      { label: "用爻", value: f.yongRole },
      f.xunKong ? { label: "日空", value: f.xunKong } : null,
    ].filter(Boolean) as { label: string; value: string }[],
  };
}
