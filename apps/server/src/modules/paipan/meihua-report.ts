/**
 * 梅花易数报告：盘面事实、卦象图形与知识库检索信号（2026-09-17）
 *
 * 梅花的核心是「体用」：体为求测人自身，用为所问之事，
 * 看体用五行生克，再参互卦（事之中间过程）、变卦（结果）、错综（另一面）。
 * 与六爻的纳甲装卦是两套路子，所以模板与信号都不同。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface MeihuaHexagram {
  upper: number;
  lower: number;
  lines: boolean[];
  name: string;
  palace: string;
}

export interface MeihuaComputed {
  ben: MeihuaHexagram;
  hu: MeihuaHexagram;
  bian: MeihuaHexagram;
  cuo: MeihuaHexagram;
  zong: MeihuaHexagram;
  moving: number;
  formula: string;
  tiyong: {
    movingInLower: boolean;
    tiName: string;
    yongName: string;
    tiWx: string;
    yongWx: string;
    relation: string;
  };
  ceShu: number;
}

const YAO_LABEL = ["初", "二", "三", "四", "五", "上"];

/** 体用关系 → 一句话吉凶倾向（传统通行说法，平台自行撰写） */
const RELATION_HINT: Record<string, string> = {
  用生体: "用生体：事来就我，多得外力相助",
  体克用: "体克用：我能掌控事体，虽费力可成",
  比和: "比和：彼此相安，事多平顺",
  体生用: "体生用：我为事耗力，付出较多",
  用克体: "用克体：事体压我，阻力偏大",
};

export function extractMeihuaFacts(data: MeihuaComputed, opts?: { matter?: string; ganzhi?: string; lunar?: string }) {
  const t = data.tiyong;
  return {
    matter: (opts?.matter || "").slice(0, 60) || undefined,
    benGua: data.ben.name,
    benPalace: data.ben.palace,
    huGua: data.hu.name,
    bianGua: data.bian.name,
    cuoGua: data.cuo.name,
    zongGua: data.zong.name,
    moving: data.moving,
    movingText: data.moving >= 1 ? `动爻在${YAO_LABEL[data.moving - 1]}爻` : "无动爻",
    formula: data.formula,
    tiName: t.tiName,
    tiWx: t.tiWx,
    yongName: t.yongName,
    yongWx: t.yongWx,
    relation: t.relation,
    relationHint: RELATION_HINT[t.relation] || t.relation,
    tiPosition: t.movingInLower ? "上卦为体（动爻在下卦）" : "下卦为体（动爻在上卦）",
    ceShu: data.ceShu,
    ganzhi: opts?.ganzhi,
    lunar: opts?.lunar,
  };
}

export type MeihuaFacts = ReturnType<typeof extractMeihuaFacts>;

export interface MeihuaChartView {
  /** 五卦并列：本、互、变、错、综 */
  hexes: { label: string; name: string; palace: string; lines: boolean[]; upperName: string; lowerName: string; highlight: boolean; movingYao: number }[];
  tiyong: { tiName: string; tiWx: string; yongName: string; yongWx: string; relation: string; relationHint: string; tiPosition: string };
  provenance: { label: string; value: string }[];
}

const BAGUA_NAME_BY_NUM = ["", "乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];

const MODE_LABEL: Record<string, string> = {
  time: "时间起卦",
  number1: "数字起卦（前后相加）",
  number2: "数字起卦（三位数）",
  manual: "手动指定卦爻",
  auto: "自动起卦",
};

export function buildMeihuaChartView(
  data: MeihuaComputed,
  opts?: { matter?: string; mode?: string; ganzhi?: string; lunar?: string; jieqi?: string },
): MeihuaChartView {
  const mk = (label: string, h: MeihuaHexagram, highlight = false, movingYao = 0) => ({
    label,
    name: h.name,
    palace: h.palace,
    lines: h.lines,
    upperName: BAGUA_NAME_BY_NUM[h.upper] || "",
    lowerName: BAGUA_NAME_BY_NUM[h.lower] || "",
    highlight,
    movingYao,
  });

  const provenance: { label: string; value: string }[] = [];
  if (opts?.matter) provenance.push({ label: "所问何事", value: opts.matter });
  provenance.push({ label: "起卦方式", value: MODE_LABEL[opts?.mode || "time"] || "时间起卦" });
  provenance.push({ label: "起卦算式", value: data.formula });
  if (opts?.ganzhi) provenance.push({ label: "四柱", value: opts.ganzhi });
  if (opts?.lunar) provenance.push({ label: "农历", value: opts.lunar });
  if (opts?.jieqi) provenance.push({ label: "节气", value: opts.jieqi });
  provenance.push({ label: "动爻", value: data.moving >= 1 ? `${YAO_LABEL[data.moving - 1]}爻` : "无动爻" });
  provenance.push({ label: "本卦卦宫", value: data.ben.palace });
  provenance.push({ label: "测数", value: String(data.ceShu) });

  const t = data.tiyong;
  return {
    hexes: [
      mk("本卦", data.ben, true, data.moving),
      mk("互卦", data.hu),
      mk("变卦", data.bian, true),
      mk("错卦", data.cuo),
      mk("综卦", data.zong),
    ],
    tiyong: {
      tiName: t.tiName,
      tiWx: t.tiWx,
      yongName: t.yongName,
      yongWx: t.yongWx,
      relation: t.relation,
      relationHint: RELATION_HINT[t.relation] || t.relation,
      tiPosition: t.movingInLower ? "上卦为体（动爻在下卦）" : "下卦为体（动爻在上卦）",
    },
    provenance,
  };
}

/** 检索信号：体用关系 > 本卦 > 体卦 > 用卦 > 变卦 > 卦宫 */
export function meihuaSignals(facts: MeihuaFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const s = (v || "").trim();
    if (s) out.push({ value: s, weight, reason });
  };
  push(facts.relation, 10, "体用关系");
  push(facts.benGua, 8, "本卦");
  push(`体${facts.tiName}`, 6, "体卦");
  push(`用${facts.yongName}`, 6, "用卦");
  push(facts.bianGua, 4, "变卦");
  push(facts.huGua, 3, "互卦");
  push(facts.benPalace, 3, "卦宫");
  return out;
}
