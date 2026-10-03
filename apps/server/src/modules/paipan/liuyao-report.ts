/**
 * 六爻报告：盘面事实、卦面图形与知识库检索信号（2026-09-17）
 *
 * 与八字一样的原则：事实全部来自引擎的确定性计算，模型不参与、也不得改写。
 * 六爻是「一事一断」，因此维度与八字不同：取用神 → 世应 → 旺衰 → 动变 → 应期 → 断语。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

/** computeLiuyao 的返回（@guoxue/shared/paipan），此处只声明用到的字段 */
export interface LiuyaoChartData {
  chart: {
    benName: string;
    bianName: string;
    benShort: string;
    bianShort: string;
    benTag: string;
    bianTag: string;
    palace: string;
    seqLabel: string;
    guashen: string;
    shensha: string[];
    shiPos: number;
    yingPos: number;
    lines: {
      position: number;
      liushen: string;
      benLiuqin: string;
      benGan: string;
      benYao: "yang" | "yin";
      shiying?: "世" | "应";
      movingMark?: "O" | "X";
      bianLiuqin: string;
      bianGan: string;
      bianYao: "yang" | "yin";
      fushen?: string;
      judgment?: string;
    }[];
  };
  keyNotes: { label: string; text: string }[];
  jieGua?: unknown;
  ganzhi: { year: string; month: string; day: string; hour: string };
  kongwang: { year: string; month: string; day: string; hour: string };
  guaci?: { name: string; text: string[] }[];
}

/** 六亲简写 → 全称 */
const LIUQIN_FULL: Record<string, string> = {
  父: "父母",
  兄: "兄弟",
  官: "官鬼",
  财: "妻财",
  孙: "子孙",
};

/** 六神简写 → 全称 */
const LIUSHEN_FULL: Record<string, string> = {
  龙: "青龙",
  雀: "朱雀",
  勾: "勾陈",
  蛇: "螣蛇",
  虎: "白虎",
  武: "玄武",
};

function liuqinOf(s: string) {
  const k = (s || "").trim().split(/\s+/)[0] || "";
  return LIUQIN_FULL[k] || k;
}

function liushenOf(s: string) {
  const k = (s || "").trim();
  return LIUSHEN_FULL[k] || k;
}

/** 爻位名：初二三四五上 */
const POS_NAME = ["", "初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

/** 引擎结果 → 报告事实（确定性，不经模型；参与报告版本哈希） */
export function extractLiuyaoFacts(data: LiuyaoChartData, matter?: string) {
  const c = data.chart;
  const lines = [...c.lines].sort((a, b) => b.position - a.position); // 自上而下
  const moving = lines.filter((l) => l.movingMark);
  const shiLine = lines.find((l) => l.shiying === "世");
  const yingLine = lines.find((l) => l.shiying === "应");

  return {
    matter: (matter || "").slice(0, 60) || undefined,
    benGua: c.benName,
    bianGua: c.bianName,
    isStatic: moving.length === 0,
    palace: c.palace,
    palaceWuXing: c.benTag,
    guashen: c.guashen,
    shiPos: c.shiPos,
    yingPos: c.yingPos,
    shiLiuqin: shiLine ? liuqinOf(shiLine.benLiuqin) : undefined,
    yingLiuqin: yingLine ? liuqinOf(yingLine.benLiuqin) : undefined,
    ganzhi: `${data.ganzhi.year} ${data.ganzhi.month} ${data.ganzhi.day} ${data.ganzhi.hour}`,
    dayKongWang: data.kongwang.day,
    monthKongWang: data.kongwang.month,
    movingCount: moving.length,
    movingLines: moving.map(
      (l) =>
        `${POS_NAME[l.position]}${liuqinOf(l.benLiuqin)}${l.benLiuqin.replace(/^\S+\s*/, "")}动，变${liuqinOf(l.bianLiuqin)}${l.bianLiuqin.replace(/^\S+\s*/, "")}`,
    ),
    fushen: lines.filter((l) => l.fushen).map((l) => `${POS_NAME[l.position]}：${l.fushen}`),
    lines: lines.map(
      (l) =>
        `${POS_NAME[l.position]} ${liushenOf(l.liushen)} ${liuqinOf(l.benLiuqin)}${l.benLiuqin.replace(/^\S+\s*/, "")}${l.shiying ? `（${l.shiying}）` : ""}${l.movingMark ? `【动】→ ${liuqinOf(l.bianLiuqin)}${l.bianLiuqin.replace(/^\S+\s*/, "")}` : ""}`,
    ),
    shensha: c.shensha ?? [],
    keyNotes: (data.keyNotes ?? []).map((n) => `${n.label}：${n.text}`),
  };
}

export type LiuyaoFacts = ReturnType<typeof extractLiuyaoFacts>;

/** 卦面图形数据（纯展示，不参与版本哈希） */
export interface LiuyaoChartView {
  benName: string;
  bianName: string;
  palace: string;
  palaceWuXing: string;
  guashen: string;
  isStatic: boolean;
  /** 自上而下：上爻 → 初爻，与传统装卦图一致 */
  lines: {
    position: number;
    posName: string;
    liushen: string;
    liuqin: string;
    najia: string;
    yang: boolean;
    shiying: string;
    moving: boolean;
    movingMark: string;
    bianLiuqin: string;
    bianNajia: string;
    bianYang: boolean;
    fushen: string;
  }[];
  provenance: { label: string; value: string }[];
  keyNotes: { label: string; text: string }[];
  shensha: string[];
  guaci: { name: string; text: string[] }[];
}

const METHOD_LABEL: Record<string, string> = {
  coin: "三枚铜钱摇卦",
  auto: "自动起卦（铜钱法）",
  manual: "手动摇卦",
  time: "时间起卦",
  number1: "数字起卦（单数）",
  number2: "数字起卦（双数）",
  guaname: "按卦名起卦",
};

export function buildLiuyaoChartView(data: LiuyaoChartData, opts?: { method?: string; matter?: string }): LiuyaoChartView {
  const c = data.chart;
  const lines = [...c.lines].sort((a, b) => b.position - a.position);
  const najia = (s: string) => (s || "").replace(/^\S+\s*/, "");

  const provenance: { label: string; value: string }[] = [];
  if (opts?.matter) provenance.push({ label: "所问何事", value: opts.matter });
  provenance.push({ label: "起卦方式", value: METHOD_LABEL[opts?.method || ""] || "时间起卦" });
  provenance.push({ label: "四柱", value: `${data.ganzhi.year} ${data.ganzhi.month} ${data.ganzhi.day} ${data.ganzhi.hour}` });
  provenance.push({ label: "日空", value: data.kongwang.day });
  provenance.push({ label: "月空", value: data.kongwang.month });
  provenance.push({ label: "卦宫", value: `${c.palace}宫（${c.benTag}）` });
  provenance.push({ label: "卦序", value: c.seqLabel });
  if (c.guashen) provenance.push({ label: "卦身", value: c.guashen });
  provenance.push({ label: "世应", value: `世在${POS_NAME[c.shiPos]}，应在${POS_NAME[c.yingPos]}` });

  return {
    benName: c.benName,
    bianName: c.bianName,
    palace: c.palace,
    palaceWuXing: c.benTag,
    guashen: c.guashen,
    isStatic: lines.every((l) => !l.movingMark),
    lines: lines.map((l) => ({
      position: l.position,
      posName: POS_NAME[l.position],
      liushen: liushenOf(l.liushen),
      liuqin: liuqinOf(l.benLiuqin),
      najia: `${l.benGan}${najia(l.benLiuqin)}`,
      yang: l.benYao === "yang",
      shiying: l.shiying || "",
      moving: !!l.movingMark,
      movingMark: l.movingMark || "",
      bianLiuqin: l.movingMark ? liuqinOf(l.bianLiuqin) : "",
      bianNajia: l.movingMark ? `${l.bianGan}${najia(l.bianLiuqin)}` : "",
      bianYang: l.bianYao === "yang",
      fushen: l.fushen || "",
    })),
    provenance,
    keyNotes: data.keyNotes ?? [],
    shensha: c.shensha ?? [],
    guaci: (data.guaci ?? []).filter((g) => g.text?.some((t) => t && t.trim())),
  };
}

/**
 * 知识库检索信号：卦宫 > 持世六亲 > 本卦 > 动爻六亲 > 六神 > 世应关系。
 * 与八字一样，命中的条目要能说清「为什么用这条」。
 */
export function liuyaoSignals(facts: LiuyaoFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const s = (v || "").trim();
    if (s) out.push({ value: s, weight, reason });
  };
  push(facts.shiLiuqin ? `${facts.shiLiuqin}持世` : undefined, 10, "持世");
  push(facts.benGua.replace(/\(.*\)$/, ""), 8, "本卦");
  push(`${facts.palace}宫`, 6, "卦宫");
  if (facts.isStatic) push("静卦", 5, "卦体");
  for (const m of facts.movingLines.slice(0, 3)) {
    const liuqin = ["父母", "兄弟", "官鬼", "妻财", "子孙"].find((k) => m.includes(k));
    if (liuqin) push(`${liuqin}发动`, 5, "动爻");
  }
  for (const n of facts.keyNotes.slice(0, 4)) {
    const label = n.split("：")[0];
    if (label) push(label, 3, "卦体要点");
  }
  return out;
}
