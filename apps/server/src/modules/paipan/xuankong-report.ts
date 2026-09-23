/**
 * 玄空飞星宅书：盘面事实、九宫图形与检索信号（2026-09-18）
 *
 * 玄空与前九个工具都不同：**它断的不是人，是一处房子**。
 * 输入是坐向与建造年份，算出运盘、山盘、向盘三层飞星，
 * 再看当令旺星到了哪一宫——到山到向为旺山旺向，反之为上山下水。
 * 所以报告的重心是「哪个方位宜做什么、哪个方位要避」，落到具体方向上。
 *
 * 数据来源是服务端存库的 `calculateXuanKong` 结果（运盘山盘向盘、替卦、格局判定俱全），
 * 不另起引擎重算。
 *
 * ⚠️ 已知风险：前端 `pkg-paipan/xuankong/result.vue` 另有一套内嵌实现，与后端不是同一份。
 * 两套算法早晚漂移（奇门、大六壬已栽过一次），下一轮要统一到 shared。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface XuankongGong {
  gongName?: string;
  direction?: string;
  yunStar?: number;
  shanStar?: number;
  xiangStar?: number;
  shanOrder?: string;
  xiangOrder?: string;
  pattern?: string;
  comment?: string;
}

export interface XuankongResultData {
  input?: { shan?: string; xiang?: string; year?: number; tiGua?: boolean };
  basicInfo?: {
    yuanYun?: number;
    yunRange?: string;
    shanLong?: string;
    xiangLong?: string;
    shanYinYang?: string;
    xiangYinYang?: string;
    tiGuaType?: string;
    yunStarCenter?: number;
    shanStarCenter?: number;
    xiangStarCenter?: number;
  };
  gongs?: XuankongGong[];
  geJu?: { name?: string; active?: boolean; desc?: string }[];
  wangShanWangXiang?: unknown;
  advice?: unknown;
  duanYu?: unknown;
}

export interface XuankongFacts {
  name: string;
  shan: string;
  xiang: string;
  year: number;
  yuanYun: number;
  yunRange: string;
  shanLong: string;
  xiangLong: string;
  tiGuaNote: string;
  /** 成立的格局名，如「旺山旺向」；没有就是空 */
  activeGeJu: string[];
  centers: string;
  gongs: XuankongGong[];
}

const s = (v: unknown) => String(v ?? "").trim();

/** 元运的中文写法，须与知识条目的 tag 一致 */
const YUN_CN: Record<number, string> = { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九" };

const TIGUA_NOTE: Record<string, string> = {
  none: "不起替卦",
  shan: "坐山起替卦",
  xiang: "朝向起替卦",
  both: "山向皆起替卦",
};

export function extractXuankongFacts(data: XuankongResultData): XuankongFacts {
  const b = data?.basicInfo ?? {};
  const inp = data?.input ?? {};
  return {
    name: "",
    shan: s(inp.shan),
    xiang: s(inp.xiang),
    year: Number(inp.year ?? 0),
    yuanYun: Number(b.yuanYun ?? 0),
    yunRange: s(b.yunRange),
    shanLong: s(b.shanLong),
    xiangLong: s(b.xiangLong),
    tiGuaNote: TIGUA_NOTE[s(b.tiGuaType)] ?? s(b.tiGuaType),
    activeGeJu: (data?.geJu ?? []).filter((g) => g.active).map((g) => s(g.name)).filter(Boolean),
    centers: `运星${b.yunStarCenter ?? "-"}　山星${b.shanStarCenter ?? "-"}　向星${b.xiangStarCenter ?? "-"}`,
    gongs: data?.gongs ?? [],
  };
}

/**
 * 检索信号。
 *
 * 玄空断宅的抓手有三个：**当运**（几运的宅，决定哪颗星当令）、
 * **格局**（旺山旺向 / 上山下水 / 双星到向…，这是全盘定性）、
 * **坐向**（哪一山哪一向）。九宫的星曜组合太细、组合数太多，不适合逐个挂条目，
 * 报告里由模型按盘面事实展开即可。
 *
 * ⚠️ tag 必须与这里产出的值一字不差。读代码猜 tag 已经栽过三次
 * （六壬「涉害课」、阳盘「坤2宫」），所以这些值都拿真盘核过。
 */
export function xuankongSignals(f: XuankongFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const t = s(v);
    if (t) out.push({ value: t, weight, reason });
  };

  for (const g of f.activeGeJu) push(g, 10, "格局");

  /**
   * 九宫逐宫的山向星组合（2026-09-19 新增）。
   *
   * 玄空真正落到「这个方位能做什么」这一层的，是山星配向星那八十一句
   * （「山6向8：土金相生，文武全才」「山2向5：二五交加」之类）。
   * 这批断语原先只在前端 `xuankong-data.ts` 的 `COMBO_TEXT` 表里，
   * 后端知识库一条都没有——报告只能讲元运与格局，讲不到具体宫位。
   *
   * 迁入时按平台红线做了改写（见 knowledge-seed/xuankong-combo.ts）：
   * 传统讲法原样存证，另给一段只讲方位宜忌、不预言疾病寿夭的读法。
   *
   * 权重给 7：低于格局与元运（那两层定全盘基调），
   * 但高于坐山朝向——逐宫组合才是用户真正能照着安排起居的东西。
   * 九宫会产出九条，交给报告的「方位分工」一节取用。
   */
  for (const g of f.gongs) {
    const sh = Number(g.shanStar), xg = Number(g.xiangStar);
    if (sh >= 1 && sh <= 9 && xg >= 1 && xg <= 9) push(`山${sh}向${xg}`, 7, `${s(g.gongName)}宫山向组合`);
  }
  // 元运用中文数字：条目里写的是「九运」，这里若产出「9运」就一条都命不中。
  // 同一个坑已经栽过三次（六壬「涉害课」、阳盘「坤2宫」、这里），每次都只有拿真盘跑才看得出来。
  push(f.yuanYun ? `${YUN_CN[f.yuanYun] ?? f.yuanYun}运` : undefined, 8, "元运");
  push(f.shan ? `${f.shan}山` : undefined, 5, "坐山");
  push(f.xiang ? `${f.xiang}向` : undefined, 5, "朝向");
  push(f.tiGuaNote && f.tiGuaNote !== "不起替卦" ? "起替卦" : undefined, 4, "替卦");
  return out;
}

/** 盘面事实逐条列出，全部来自引擎 */
export function xuankongFactLines(f: XuankongFacts): string[] {
  const lines = [
    f.name ? `宅名：${f.name}` : "",
    `坐向：${f.shan}山${f.xiang}向　（坐山${f.shanLong}·朝向${f.xiangLong}）`,
    `元运：${YUN_CN[f.yuanYun] ?? f.yuanYun}运　${f.yunRange}　建造/入伙 ${f.year} 年`,
    `中宫：${f.centers}　${f.tiGuaNote}`,
    f.activeGeJu.length ? `格局：${f.activeGeJu.join("、")}` : "格局：无特殊格局",
  ].filter(Boolean);

  // 九宫逐宫：方位 + 三盘星 + 顺逆，这是玄空报告最要紧的事实
  for (const g of f.gongs) {
    if (!g.gongName) continue;
    lines.push(
      `${g.gongName}宫（${g.direction ?? ""}）：山${g.shanStar ?? "-"} 向${g.xiangStar ?? "-"} 运${g.yunStar ?? "-"}` +
        `${g.shanOrder ? `　山${g.shanOrder}行` : ""}${g.xiangOrder ? ` 向${g.xiangOrder}行` : ""}${g.pattern ? `　${g.pattern}` : ""}`,
    );
  }
  return lines;
}

/** 九宫飞星图 */
export function buildXuankongChartView(f: XuankongFacts) {
  return {
    kind: "xuankong" as const,
    title: "九宫飞星盘",
    cells: f.gongs.map((g) => ({
      name: `${g.gongName ?? ""}宫`,
      direction: g.direction ?? "",
      shanStar: g.shanStar ?? null,
      xiangStar: g.xiangStar ?? null,
      yunStar: g.yunStar ?? null,
      shanOrder: g.shanOrder ?? "",
      xiangOrder: g.xiangOrder ?? "",
      pattern: g.pattern ?? "",
    })),
    provenance: [
      { label: "坐向", value: `${f.shan}山${f.xiang}向` },
      { label: "元运", value: `${f.yuanYun}运　${f.yunRange}` },
      { label: "中宫", value: f.centers },
      { label: "替卦", value: f.tiGuaNote },
      { label: "格局", value: f.activeGeJu.join("、") || "无特殊格局" },
    ],
  };
}
