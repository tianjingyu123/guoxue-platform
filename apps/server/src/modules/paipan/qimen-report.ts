/**
 * 奇门遁甲报告：盘面事实、九宫图形与知识库检索信号（2026-09-17）
 *
 * 奇门看「用神落宫」：按所问之事取用神（求财取生门、问官取开门、问人取值符等），
 * 看它落在哪一宫、门星神怎么配，再定方位与时机。比六爻梅花多一个「方位」维度。
 *
 * 数据来源是服务端排盘存库的结构（gongs / dunType / juNumber / zhiFu / zhiShiMen / meta），
 * 不另起一套引擎重算——重算与存库不一致，报告就会和用户看到的盘对不上。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface QimenGong {
  index: number;
  name?: string;
  bagua?: string;
  men?: string;
  shen?: string;
  star?: string;
  tianPan?: string;
  diPan?: string;
  anGan?: string;
  dipanShen?: string;
  changsheng?: { tian?: string; di?: string };
}

export interface QimenResultData {
  gongs?: QimenGong[];
  dunType?: string;
  juNumber?: number;
  zhiFu?: string;
  zhiShiMen?: string;
  /** 元（上元/中元/下元） */
  jieQi?: string;
  yongShi?: string;
  dipanBashen?: string[];
  meta?: {
    siZhu?: Record<string, { gan: string; zhi: string }>;
    kongWang?: Record<string, string>;
    maXingZhi?: string;
    jieQi?: { name?: string; start?: string; end?: string; nextName?: string };
    trueSolar?: { hour: number; minute: number; offsetMin: number };
  };
}

/** 九宫方位（洛书） */
const PALACE_INFO: Record<number, { dir: string; gua: string }> = {
  1: { dir: "北", gua: "坎" },
  2: { dir: "西南", gua: "坤" },
  3: { dir: "东", gua: "震" },
  4: { dir: "东南", gua: "巽" },
  5: { dir: "中", gua: "中" },
  6: { dir: "西北", gua: "乾" },
  7: { dir: "西", gua: "兑" },
  8: { dir: "东北", gua: "艮" },
  9: { dir: "南", gua: "离" },
};

/** 九宫盘的视觉排布（三行三列，洛书方位） */
const GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

function palaceLabel(n: number) {
  const info = PALACE_INFO[n];
  return info ? `${info.gua}${n}宫（${info.dir}）` : `${n}宫`;
}

/** 检索用的宫位键：不带方位括号，便于与知识库 tags 逐字对齐（如「坤2宫」） */
function palaceKey(n: number) {
  const info = PALACE_INFO[n];
  return info ? `${info.gua}${n}宫` : `${n}宫`;
}

function gongOf(data: QimenResultData, n: number): QimenGong | undefined {
  return (data.gongs ?? []).find((g) => Number(g.index) === n);
}

/** 盘面事实（确定性，参与版本哈希） */
export function extractQimenFacts(data: QimenResultData, opts?: { matter?: string; panMethod?: string }) {
  const meta = data.meta ?? {};
  const sz = meta.siZhu ?? {};
  const pillar = (k: string) => (sz[k] ? `${sz[k].gan}${sz[k].zhi}` : "");
  const kw = meta.kongWang ?? {};

  const zhifuGong = (data.gongs ?? []).find((g) => g.star && g.star === data.zhiFu);
  const zhishiGong = (data.gongs ?? []).find((g) => g.men && g.men === data.zhiShiMen);

  return {
    matter: (opts?.matter || "").slice(0, 60) || undefined,
    ju: data.juNumber ? `${data.dunType === "yang" ? "阳遁" : "阴遁"}${data.juNumber}局` : undefined,
    yuan: data.jieQi,
    isYang: data.dunType === "yang",
    jieqi: meta.jieQi?.name ? `${meta.jieQi.name}（${meta.jieQi.start ?? ""} 起）` : undefined,
    sizhu: `${pillar("nian")}年 ${pillar("yue")}月 ${pillar("ri")}日 ${pillar("shi")}时`,
    kongwang: ["nian", "yue", "ri", "shi"]
      .map((k) => (kw[k] ? `${({ nian: "年", yue: "月", ri: "日", shi: "时" } as Record<string, string>)[k]}空 ${kw[k]}` : ""))
      .filter(Boolean)
      .join("　"),
    maXing: meta.maXingZhi,
    zhifuStar: data.zhiFu,
    zhishiMen: data.zhiShiMen,
    /**
     * 值符、值使落在哪一宫——这是奇门断事的落点，原先只把星名门名当检索信号，
     * 「天禽」在坤宫还是在离宫完全不同，却检索到同一批条目。
     */
    zhifuGong: zhifuGong ? palaceKey(zhifuGong.index) : undefined,
    zhishiGong: zhishiGong ? palaceKey(zhishiGong.index) : undefined,
    zhifu: data.zhiFu ? `值符${data.zhiFu}${zhifuGong ? ` 落${palaceLabel(zhifuGong.index)}` : ""}` : undefined,
    zhishi: data.zhiShiMen ? `值使${data.zhiShiMen}${zhishiGong ? ` 落${palaceLabel(zhishiGong.index)}` : ""}` : undefined,
    /** 服务端记录一律按转盘法存储（后端未实现飞盘），与页面选择不一致时要如实说明 */
    panMethodNote:
      opts?.panMethod === "fei"
        ? "页面选择的是飞盘，服务端记录按转盘法存储，本报告依转盘盘面解读"
        : "转盘法",
    palaces: GRID_ORDER.map((n) => {
      const g = gongOf(data, n);
      if (!g) return "";
      const cs = g.changsheng ?? {};
      return `${palaceLabel(n)}：${g.shen ?? ""} ${g.star ?? ""} ${g.men ?? ""}　天盘${g.tianPan ?? ""} 地盘${g.diPan ?? ""}${g.anGan ? ` 暗${g.anGan}` : ""}${cs.tian || cs.di ? `　长生 天${cs.tian ?? "-"}/地${cs.di ?? "-"}` : ""}`;
    }).filter(Boolean),
  };
}

export type QimenFacts = ReturnType<typeof extractQimenFacts>;

export interface QimenChartView {
  ju: string;
  yuan: string;
  grid: {
    palace: number;
    dir: string;
    gua: string;
    shen: string;
    star: string;
    men: string;
    tianPan: string;
    diPan: string;
    anGan: string;
    csTian: string;
    csDi: string;
    isZhifu: boolean;
    isZhishi: boolean;
  }[];
  provenance: { label: string; value: string }[];
}

export function buildQimenChartView(data: QimenResultData, opts?: { matter?: string; panMethod?: string }): QimenChartView {
  const f = extractQimenFacts(data, opts);
  const meta = data.meta ?? {};

  const provenance: { label: string; value: string }[] = [];
  if (f.matter) provenance.push({ label: "所问何事", value: f.matter });
  provenance.push({ label: "四柱", value: f.sizhu });
  if (f.ju) provenance.push({ label: "局数", value: `${f.ju}${f.yuan ? `　${f.yuan}` : ""}` });
  if (f.jieqi) provenance.push({ label: "节气", value: f.jieqi });
  provenance.push({ label: "排盘法", value: f.panMethodNote });
  if (meta.trueSolar) {
    provenance.push({ label: "真太阳时", value: `已校正 ${meta.trueSolar.offsetMin > 0 ? "+" : ""}${meta.trueSolar.offsetMin} 分钟` });
  }
  if (f.zhifu) provenance.push({ label: "值符", value: f.zhifu });
  if (f.zhishi) provenance.push({ label: "值使", value: f.zhishi });
  if (f.maXing) provenance.push({ label: "马星", value: f.maXing });
  if (f.kongwang) provenance.push({ label: "空亡", value: f.kongwang });

  return {
    ju: f.ju ?? "",
    yuan: f.yuan ?? "",
    grid: GRID_ORDER.map((n) => {
      const g = gongOf(data, n) ?? ({ index: n } as QimenGong);
      const info = PALACE_INFO[n];
      const cs = g.changsheng ?? {};
      return {
        palace: n,
        dir: info?.dir ?? "",
        gua: info?.gua ?? "",
        shen: g.shen ?? "",
        star: g.star ?? "",
        men: g.men ?? "",
        tianPan: g.tianPan ?? "",
        diPan: g.diPan ?? "",
        anGan: g.anGan ?? "",
        csTian: cs.tian ?? "",
        csDi: cs.di ?? "",
        isZhifu: !!g.star && g.star === data.zhiFu,
        isZhishi: !!g.men && g.men === data.zhiShiMen,
      };
    }),
    provenance,
  };
}

/** 检索信号：值符 > 值使 > 局数 > 阴阳遁 */
export function qimenSignals(facts: QimenFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const s = (v || "").trim();
    if (s) out.push({ value: s, weight, reason });
  };
  push(facts.zhifuStar, 10, "值符");
  push(facts.zhishiMen, 9, "值使");
  // 落宫与星门同等要紧：同一颗值符落在不同宫，方位与取用完全不同
  push(facts.zhifuGong, 8, "值符落宫");
  push(facts.zhishiGong, 7, "值使落宫");
  push(facts.ju, 6, "局数");
  push(facts.isYang ? "阳遁" : "阴遁", 4, "阴阳遁");
  push(facts.yuan, 3, "元");
  return out;
}
