/**
 * 大六壬报告：盘面事实、天地盘与四课三传图形、知识库检索信号（2026-09-18）
 *
 * 六壬的路子：月将加时起天盘 → 四课 → 按九宗门取三传 → 看天将与年命 → 断。
 * 与六爻纳甲、梅花体用、奇门落宫又各不相同，因此模板与信号都是独立一套。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface DaliurenGong {
  zhi: string;
  diPan: string;
  tianPan: string;
  tianJiang?: string;
  dunGan?: string;
}

export interface DaliurenKe {
  index: number;
  xiaZhi: string;
  xiaGan?: string;
  shangZhi: string;
  description?: string;
}

export interface DaliurenChuan {
  zhi: string;
  dunGan?: string;
  liuQin?: string;
  tianJiang?: string;
  description?: string;
}

export interface DaliurenResultData {
  zhanShi?: string;
  yueJiang?: string;
  yueJiangZhi?: string;
  dayNight?: string;
  jieQi?: string;
  riGanZhi?: string;
  gongs?: DaliurenGong[];
  siKe?: DaliurenKe[];
  sanChuan?: { chu?: DaliurenChuan; zhong?: DaliurenChuan; mo?: DaliurenChuan };
  zongMen?: string;
  zongMenDesc?: string;
  keJing?: { name: string; number?: number; summary?: string }[];
  kongWang?: string[];
  shenSha?: { name?: string; zhi?: string }[] | string[];
  summary?: string;
}

const KE_LABEL = ["", "一课", "二课", "三课", "四课"];
const CHUAN_LABEL: Record<string, string> = { chu: "初传", zhong: "中传", mo: "末传" };

/** 盘面事实（确定性，参与版本哈希） */
export function extractDaliurenFacts(data: DaliurenResultData, matter?: string) {
  const sc = data.sanChuan ?? {};
  const chuanList = (["chu", "zhong", "mo"] as const)
    .map((k) => {
      const c = sc[k];
      if (!c?.zhi) return "";
      return `${CHUAN_LABEL[k]}：${c.zhi}${c.dunGan ? `（遁${c.dunGan}）` : ""}${c.liuQin ? ` ${c.liuQin}` : ""}${c.tianJiang ? ` 乘${c.tianJiang}` : ""}`;
    })
    .filter(Boolean);

  const shensha = Array.isArray(data.shenSha)
    ? (data.shenSha as any[]).map((s) => (typeof s === "string" ? s : `${s?.name ?? ""}${s?.zhi ? `(${s.zhi})` : ""}`)).filter(Boolean)
    : [];

  return {
    matter: (matter || "").slice(0, 60) || undefined,
    riGanZhi: data.riGanZhi,
    zhanShi: data.zhanShi,
    yueJiang: data.yueJiang && data.yueJiangZhi ? `${data.yueJiang}（${data.yueJiangZhi}）` : data.yueJiang,
    dayNight: data.dayNight,
    jieQi: data.jieQi,
    kongWang: (data.kongWang ?? []).join(""),
    zongMen: data.zongMen,
    zongMenDesc: data.zongMenDesc,
    keti: (data.keJing ?? []).map((k) => `${k.name}${k.summary ? `：${k.summary}` : ""}`),
    siKe: (data.siKe ?? []).map((k) => `${KE_LABEL[k.index] ?? `${k.index}课`}：${k.xiaZhi} 上见 ${k.shangZhi}${k.description ? `（${k.description}）` : ""}`),
    sanChuan: chuanList,
    chuChuan: sc.chu?.zhi,
    chuTianJiang: sc.chu?.tianJiang,
    shensha,
    summary: data.summary,
  };
}

export type DaliurenFacts = ReturnType<typeof extractDaliurenFacts>;

export interface DaliurenChartView {
  summary: string;
  /** 天地盘：地支十二位，地盘固定、天盘随月将加时旋转 */
  pan: { zhi: string; tianPan: string; tianJiang: string; dunGan: string; isKong: boolean }[];
  /** 四课：自右向左一至四课（传统写法） */
  siKe: { label: string; xia: string; shang: string; desc: string }[];
  /** 三传：自上而下 初 → 中 → 末 */
  sanChuan: { label: string; zhi: string; dunGan: string; liuQin: string; tianJiang: string; isKong: boolean }[];
  keti: { name: string; summary: string }[];
  provenance: { label: string; value: string }[];
}

export function buildDaliurenChartView(data: DaliurenResultData, opts?: { matter?: string; method?: string }): DaliurenChartView {
  const kong = new Set(data.kongWang ?? []);
  const sc = data.sanChuan ?? {};

  const provenance: { label: string; value: string }[] = [];
  if (opts?.matter) provenance.push({ label: "所问何事", value: opts.matter });
  if (data.riGanZhi) provenance.push({ label: "日干支", value: data.riGanZhi });
  if (data.zhanShi) provenance.push({ label: "占时", value: data.zhanShi });
  if (data.yueJiang) {
    provenance.push({ label: "月将", value: `${data.yueJiang}${data.yueJiangZhi ? `（${data.yueJiangZhi}）` : ""}加${data.zhanShi ?? ""}时` });
  }
  if (data.dayNight) provenance.push({ label: "昼夜贵人", value: `${data.dayNight}贵` });
  if (opts?.method) provenance.push({ label: "起课方式", value: opts.method === "qimen" ? "奇门起课" : "传统出时起课" });
  if (data.jieQi) provenance.push({ label: "节气", value: data.jieQi });
  if (data.kongWang?.length) provenance.push({ label: "旬空", value: data.kongWang.join("") });
  if (data.zongMen) provenance.push({ label: "课体", value: `${data.zongMen}${data.zongMenDesc ? `　${data.zongMenDesc}` : ""}` });

  return {
    summary: data.summary ?? "",
    pan: (data.gongs ?? []).map((g) => ({
      zhi: g.zhi,
      tianPan: g.tianPan,
      tianJiang: g.tianJiang ?? "",
      dunGan: g.dunGan ?? "",
      isKong: kong.has(g.tianPan),
    })),
    // 传统四课自右向左书写，页面按一至四课顺序渲染后可右对齐
    siKe: (data.siKe ?? []).map((k) => ({
      label: KE_LABEL[k.index] ?? `${k.index}课`,
      xia: k.xiaZhi,
      shang: k.shangZhi,
      desc: k.description ?? "",
    })),
    sanChuan: (["chu", "zhong", "mo"] as const)
      .map((k) => {
        const c = sc[k];
        if (!c?.zhi) return null;
        return {
          label: CHUAN_LABEL[k],
          zhi: c.zhi,
          dunGan: c.dunGan ?? "",
          liuQin: c.liuQin ?? "",
          tianJiang: c.tianJiang ?? "",
          isKong: kong.has(c.zhi),
        };
      })
      .filter(Boolean) as DaliurenChartView["sanChuan"],
    keti: (data.keJing ?? []).map((k) => ({ name: k.name, summary: k.summary ?? "" })),
    provenance,
  };
}

/** 检索信号：课体 > 初传天将 > 月将 > 昼夜贵 */
export function daliurenSignals(facts: DaliurenFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const s = (v || "").trim();
    if (s) out.push({ value: s, weight, reason });
  };
  push(facts.zongMen, 10, "课体");
  push(facts.chuTianJiang, 7, "初传天将");
  push(facts.chuChuan, 6, "初传");
  push(facts.yueJiang?.replace(/（.*）/, ""), 5, "月将");
  push(facts.dayNight ? `${facts.dayNight}贵` : undefined, 4, "昼夜贵");
  for (const k of facts.keti.slice(0, 3)) {
    const name = k.split("：")[0];
    if (name && name !== facts.zongMen) push(name, 4, "课格");
  }
  return out;
}
