/**
 * 紫微斗数报告：盘面事实、十二宫图形与知识库检索信号（2026-09-18）
 *
 * 紫微与八字是两套语言：八字论干支旺衰，紫微论星曜落宫。
 * 全篇骨架是「十二宫 + 三方四正 + 四化」，因此维度按宫位分，不按十神分。
 *
 * 数据来源是服务端排盘存库的结构（wuXingJu / mingGong / gongWei / siHua / shenGong / geShi），
 * 不另起一套引擎重算——重算与存库不一致，报告就会和用户看到的盘对不上。
 *
 * 一条硬约束：**引擎不计算星曜庙旺利陷**。因此事实里不给庙陷，
 * 起盘校验中如实声明，提示词也禁止模型自行断庙陷。宁可少讲一项，不可编一项。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface ZiweiStar {
  name: string;
  type?: string;
  wuXing?: string;
  liangJi?: string;
}

export interface ZiweiGong {
  name: string;
  zhi: string;
  gan: string;
  stars?: ZiweiStar[];
  shenGong?: boolean;
  daXianStart?: number;
  daXianEnd?: number;
  sanFang?: string[];
  duiGong?: string;
  gongQi?: string;
}

export interface ZiweiResultData {
  wuXingJu?: string;
  mingGong?: ZiweiGong;
  gongWei?: ZiweiGong[];
  siHua?: { huaLu?: string; huaQuan?: string; huaKe?: string; huaJi?: string };
  shenGong?: string;
  geShi?: string[];
}

export interface ZiweiInputData {
  name?: string;
  gender?: string;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  lunarMonth?: number;
  lunarDay?: number;
  lunarHour?: string;
  lunarYearGan?: string;
  lunarYearZhi?: string;
}

/** 十二宫的固定顺序（自命宫起，按盘面惯例排列） */
const GONG_ORDER = [
  "命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄",
  "迁移", "交友", "官禄", "田宅", "福德", "父母",
];

/**
 * 十二宫在盘面上的位置：紫微盘按地支固定排布，不随命宫移动。
 * 视觉是 4×4 的回字形，中间两格留给中宫信息。
 */
const ZHI_GRID: string[] = [
  "巳", "午", "未", "申",
  "辰", "", "", "酉",
  "卯", "", "", "戌",
  "寅", "丑", "子", "亥",
];

function gongOf(data: ZiweiResultData, name: string): ZiweiGong | undefined {
  return (data.gongWei ?? []).find((g) => g.name === name);
}

function gongByZhi(data: ZiweiResultData, zhi: string): ZiweiGong | undefined {
  return (data.gongWei ?? []).find((g) => g.zhi === zhi);
}

/**
 * 主星、辅吉杂曜、煞星分开列，读者一眼能看出哪几颗是骨干。
 *
 * 注意不能按 type 分煞：引擎的 type='sisha' 是「非主星非六辅」的统称，
 * 禄存、天马、三台八座、龙池凤阁这些吉曜也在其中——按 type 标煞会把吉星写成煞星，
 * 对懂行的用户是一眼可见的硬伤。吉凶一律以 liangJi 为准。
 */
function splitStars(stars: ZiweiStar[] = []) {
  const main = stars.filter((s) => s.type === "main").map((s) => s.name);
  const rest = stars.filter((s) => s.type !== "main");
  const sisha = rest.filter((s) => s.liangJi === "凶").map((s) => s.name);
  const assist = rest.filter((s) => s.liangJi !== "凶").map((s) => s.name);
  return { main, assist, sisha };
}

function starLine(g?: ZiweiGong): string {
  if (!g) return "";
  const { main, assist, sisha } = splitStars(g.stars);
  const parts = [
    main.length ? `主星${main.join("、")}` : "无主星",
    assist.length ? `辅${assist.join("、")}` : "",
    sisha.length ? `煞${sisha.join("、")}` : "",
  ].filter(Boolean);
  return parts.join("　");
}

/** 四化落宫：生年四化的那颗星坐在哪一宫，是全盘最要紧的线索之一 */
function huaGong(data: ZiweiResultData, star?: string): string {
  const s = (star || "").trim();
  if (!s) return "";
  const g = (data.gongWei ?? []).find((x) => (x.stars ?? []).some((st) => st.name === s));
  return g ? `${s}（在${g.name}·${g.zhi}）` : `${s}（本盘未见此星）`;
}

/** 盘面事实（确定性，参与版本哈希） */
export function extractZiweiFacts(data: ZiweiResultData, input?: ZiweiInputData) {
  const ming = data.mingGong ?? gongOf(data, "命宫");
  const shenName = data.shenGong || (data.gongWei ?? []).find((g) => g.shenGong)?.name || "";
  const shen = shenName ? gongOf(data, shenName) : undefined;
  const sh = data.siHua ?? {};

  const mingStars = splitStars(ming?.stars);
  // 引擎的 sanFang 含命宫自身，命宫已单列，这里只留财帛与官禄（对宫另有 duiGong 一项）
  const sanFang = (ming?.sanFang ?? [])
    .filter((n) => n !== "命宫")
    .map((n) => {
      const g = gongOf(data, n);
      return g ? `${n}（${g.zhi}）：${starLine(g)}` : n;
    });

  return {
    gender: input?.gender,
    /** 农历生日：紫微安星全部按农历月日与时辰，公历只是入口 */
    lunar:
      input?.lunarMonth && input?.lunarDay
        ? `农历${input.lunarMonth}月${input.lunarDay}日 ${input.lunarHour ?? ""}时`
        : undefined,
    yearGanZhi: input?.lunarYearGan && input?.lunarYearZhi ? `${input.lunarYearGan}${input.lunarYearZhi}` : undefined,
    wuXingJu: data.wuXingJu,
    mingGongZhi: ming?.zhi,
    mingGong: ming ? `命宫在${ming.gan}${ming.zhi}　${starLine(ming)}` : undefined,
    mingMainStars: mingStars.main,
    /** 无主星要借对宫，这是紫微的固定处理，必须写明而不是略过 */
    mingNoMainStar: mingStars.main.length === 0,
    duiGong: ming?.duiGong
      ? `对宫${ming.duiGong}（${gongOf(data, ming.duiGong)?.zhi ?? ""}）：${starLine(gongOf(data, ming.duiGong))}`
      : undefined,
    shenGong: shenName,
    shenGongLine: shen ? `身宫在${shenName}（${shen.gan}${shen.zhi}）　${starLine(shen)}` : undefined,
    /** 命身同宫：本性与后天着力处合一，论断口径不同，要单独标出来 */
    shenSameAsMing: !!shenName && shenName === "命宫",
    sanFang,
    huaLu: huaGong(data, sh.huaLu),
    huaQuan: huaGong(data, sh.huaQuan),
    huaKe: huaGong(data, sh.huaKe),
    huaJi: huaGong(data, sh.huaJi),
    huaJiStar: sh.huaJi,
    geShi: data.geShi ?? [],
    gongs: GONG_ORDER.map((name) => {
      const g = gongOf(data, name);
      if (!g) return "";
      const daXian =
        g.daXianStart != null && g.daXianEnd != null ? `　大限${g.daXianStart}-${g.daXianEnd}岁` : "";
      return `${name}（${g.gan}${g.zhi}）：${starLine(g)}${g.shenGong ? "　【身宫】" : ""}${daXian}`;
    }).filter(Boolean),
    /** 引擎未计算庙旺利陷，如实声明；模型据此不得自行断庙陷 */
    miaoXianNote: "本盘未计算星曜庙旺利陷",
  };
}

export type ZiweiFacts = ReturnType<typeof extractZiweiFacts>;

export interface ZiweiChartView {
  wuXingJu: string;
  mingGongZhi: string;
  shenGong: string;
  /** 4×4 回字形：十二宫按地支固定落位，中间四格留白给中宫信息 */
  grid: {
    zhi: string;
    name: string;
    gan: string;
    main: string[];
    assist: string[];
    sisha: string[];
    daXian: string;
    isMing: boolean;
    isShen: boolean;
    /** 命宫三方四正之一，页面高亮成一组 */
    inSanFang: boolean;
  }[];
  siHua: { label: string; star: string; gong: string }[];
  geShi: string[];
  provenance: { label: string; value: string }[];
}

export function buildZiweiChartView(data: ZiweiResultData, input?: ZiweiInputData): ZiweiChartView {
  const f = extractZiweiFacts(data, input);
  const ming = data.mingGong ?? gongOf(data, "命宫");
  const sanFangNames = new Set<string>([...(ming?.sanFang ?? []), "命宫", ming?.duiGong ?? ""].filter(Boolean));

  const provenance: { label: string; value: string }[] = [];
  if (f.yearGanZhi) provenance.push({ label: "生年干支", value: f.yearGanZhi });
  if (f.lunar) provenance.push({ label: "农历生日", value: f.lunar });
  if (f.wuXingJu) provenance.push({ label: "五行局", value: f.wuXingJu });
  if (f.mingGongZhi) provenance.push({ label: "命宫", value: f.mingGongZhi });
  if (f.shenGong) provenance.push({ label: "身宫", value: f.shenGong });
  provenance.push({ label: "星曜亮度", value: `${f.miaoXianNote}，本报告不作庙陷论断` });

  const sh = data.siHua ?? {};
  const siHua = [
    { label: "化禄", star: sh.huaLu ?? "", gong: f.huaLu },
    { label: "化权", star: sh.huaQuan ?? "", gong: f.huaQuan },
    { label: "化科", star: sh.huaKe ?? "", gong: f.huaKe },
    { label: "化忌", star: sh.huaJi ?? "", gong: f.huaJi },
  ].filter((x) => x.star);

  return {
    wuXingJu: f.wuXingJu ?? "",
    mingGongZhi: f.mingGongZhi ?? "",
    shenGong: f.shenGong ?? "",
    grid: ZHI_GRID.map((zhi) => {
      if (!zhi) {
        return { zhi: "", name: "", gan: "", main: [], assist: [], sisha: [], daXian: "", isMing: false, isShen: false, inSanFang: false };
      }
      const g = gongByZhi(data, zhi);
      const s = splitStars(g?.stars);
      return {
        zhi,
        name: g?.name ?? "",
        gan: g?.gan ?? "",
        main: s.main,
        assist: s.assist,
        sisha: s.sisha,
        daXian: g?.daXianStart != null && g?.daXianEnd != null ? `${g.daXianStart}-${g.daXianEnd}` : "",
        isMing: g?.name === "命宫",
        isShen: !!g?.shenGong,
        inSanFang: !!g?.name && sanFangNames.has(g.name),
      };
    }),
    siHua,
    geShi: f.geShi,
    provenance,
  };
}

/** 检索信号：命宫主星 > 格局 > 五行局 > 化忌落宫 */
export function ziweiSignals(facts: ZiweiFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const s = (v || "").trim();
    if (s) out.push({ value: s, weight, reason });
  };
  for (const star of facts.mingMainStars) push(star, 10, "命宫主星");
  if (facts.mingNoMainStar) push("命无主星", 9, "命宫无主星，借对宫");
  for (const g of facts.geShi.slice(0, 4)) push(g, 8, "格局");
  push(facts.wuXingJu, 5, "五行局");
  push(facts.huaJiStar, 5, "生年化忌");
  push(facts.shenGong, 4, "身宫");
  return out;
}
