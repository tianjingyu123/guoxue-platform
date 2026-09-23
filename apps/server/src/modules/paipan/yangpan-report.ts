/**
 * 阳盘命理奇门报告：盘面事实、图形与检索信号（2026-09-18）
 *
 * 阳盘命理与时家奇门是两件事，报告也不能照抄奇门那一套：
 * 时家奇门问「这件事怎么办、往哪个方位、什么时机」，一事一断；
 * **阳盘命理是拿奇门盘看一个人的一生**——用出生时刻起局，以九宫配人事，
 * 再结合四柱与大运看各个阶段。所以它的盘面事实要同时给两样东西：
 * 奇门的宫位配置（值符值使、门星神、用神落宫）与命理的时间轴（四柱、大运、流年、驿马）。
 *
 * 数据来源是服务端存库的 `QimenResult + mingli`（见 paipan.service.calcYangpan），
 * 不另起引擎重算——重算与存库不一致，报告就会和用户看到的盘对不上。
 *
 * 知识来源上它也横跨两边：检索时同时取 `qimen` 与 `bazi` 两类条目
 * （见 findEvidence 的 paipanType 支持数组）。给它单抄一份既重复又会走样。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";
import type { QimenGong, QimenResultData } from "./qimen-report";

/** 存库的阳盘结果：奇门盘 + 命理信息 */
export interface YangpanResultData extends QimenResultData {
  mingli?: {
    siZhu?: Record<string, { gan: string; zhi: string }>;
    /** 起运：service 存的是 { startAge, startYear, desc } */
    qiYun?: { startAge?: number; startYear?: number; desc?: string };
    shunPai?: boolean;
    maXingZhi?: string;
    daYun?: {
      gan: string;
      zhi: string;
      startAge?: number;
      startYear?: number;
      endYear?: number;
      active?: boolean;
      liuNian?: { year: number; gan: string; zhi: string; age?: number; active?: boolean }[];
    }[];
    trueSolar?: { hour: number; minute: number; offsetMin: number };
  };
}

export interface YangpanFacts {
  /** 奇门部分 */
  zhifu: string;
  zhishi: string;
  zhifuGong: string;
  zhishiGong: string;
  ju: string;
  yuan: string;
  isYang: boolean;
  /** 命理部分 */
  sizhu: string;
  dayGan: string;
  monthZhi: string;
  qiYunDesc: string;
  /** 当前所处大运（没有则空） */
  currentDaYun: string;
  maXingZhi: string;
  /** 九宫配人事：宫位 → 门星神配置，供图形与取象 */
  gongs: { index: number; name: string; men: string; star: string; shen: string; tianPan: string; diPan: string }[];
}

/**
 * 宫位键**必须与奇门条目的 key 一字不差**（见 knowledge-seed/qimen-liuren-ext.ts）。
 * 第一版写成「坤2·西南」，拿真盘一跑才发现对不上条目里的「坤2宫」——
 * 那 18 条落宫条目会一条都检索不到，而单测里 signals 是自己造的，照样全绿。
 * 方位另存一张表，只用于展示，不进 tag。
 */
const PALACE_CN: Record<number, string> = {
  1: "坎1宫", 2: "坤2宫", 3: "震3宫", 4: "巽4宫",
  5: "中5宫", 6: "乾6宫", 7: "兑7宫", 8: "艮8宫", 9: "离9宫",
};

const PALACE_DIR: Record<number, string> = {
  1: "正北", 2: "西南", 3: "正东", 4: "东南",
  5: "中央", 6: "西北", 7: "正西", 8: "东北", 9: "正南",
};

/** 九宫在阳盘命理里各主什么人事——报告据此把宫位讲成人生的一块，而不是只报方位 */
export const GONG_RENSHI: Record<number, string> = {
  1: "事业与智慧", 2: "母亲与后天助力", 3: "兄弟与行动力", 4: "婚姻与人际",
  5: "自身根基", 6: "父亲与贵人", 7: "口舌与享受", 8: "少年与家产", 9: "名声与文书",
};

const s = (v: unknown) => String(v ?? "").trim();

function gongOf(gongs: QimenGong[] | undefined, pick: (g: QimenGong) => boolean): string {
  const g = (gongs ?? []).find(pick);
  return g ? PALACE_CN[g.index] ?? `${g.index}宫` : "";
}

export function extractYangpanFacts(data: YangpanResultData): YangpanFacts {
  const gongs = data?.gongs ?? [];
  const ml = data?.mingli ?? {};
  const sz = ml.siZhu ?? data?.meta?.siZhu ?? {};
  const pillar = (k: string) => (sz[k] ? `${sz[k].gan}${sz[k].zhi}` : "");

  const zhifu = s(data?.zhiFu);
  const zhishi = s(data?.zhiShiMen);
  const cur = (ml.daYun ?? []).find((d) => d.active);

  return {
    zhifu,
    zhishi,
    zhifuGong: gongOf(gongs, (g) => s(g.star).includes(zhifu) && !!zhifu),
    zhishiGong: gongOf(gongs, (g) => s(g.men) === zhishi && !!zhishi),
    ju: data?.juNumber ? `${data.dunType === "yin" ? "阴遁" : "阳遁"}${data.juNumber}局` : "",
    yuan: s(data?.jieQi),
    isYang: data?.dunType !== "yin",
    sizhu: ["nian", "yue", "ri", "shi"].map(pillar).filter(Boolean).join(" "),
    dayGan: s(sz.ri?.gan),
    monthZhi: s(sz.yue?.zhi),
    qiYunDesc: s(ml.qiYun?.desc),
    currentDaYun: cur ? `${cur.gan}${cur.zhi}` : "",
    maXingZhi: s(ml.maXingZhi ?? data?.meta?.maXingZhi),
    gongs: gongs
      .filter((g) => g.index !== 5 || s(g.men) || s(g.star))
      .map((g) => ({
        index: g.index,
        name: `${PALACE_CN[g.index] ?? `${g.index}宫`}${PALACE_DIR[g.index] ? `·${PALACE_DIR[g.index]}` : ""}`,
        men: s(g.men),
        star: s(g.star),
        shen: s(g.shen),
        tianPan: s(g.tianPan),
        diPan: s(g.diPan),
      })),
  };
}

/**
 * 检索信号。
 *
 * 奇门那一半与 `qimenSignals` 保持同样的取值（值符星名、值使门名、阴阳遁、元），
 * 这样已有的 62 条奇门条目直接就能用上；命理那一半取日主与月令，
 * 对上的是 130 条八字条目。**两边的 tag 都必须与各自引擎的产出一字不差**，
 * 差一个字就是死条目，而单测里 signals 是自己造的、写错也全绿。
 */
export function yangpanSignals(f: YangpanFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const t = s(v);
    if (t) out.push({ value: t, weight, reason });
  };

  // 奇门一半
  push(f.zhifu, 10, "值符");
  push(f.zhishi, 9, "值使");
  push(f.zhifuGong, 8, "值符落宫");
  push(f.zhishiGong, 7, "值使落宫");
  push(f.ju, 5, "局数");
  push(f.isYang ? "阳遁" : "阴遁", 4, "阴阳遁");
  push(f.yuan, 3, "元");

  // 命理一半：日主与月令是八字条目最主要的两个挂点
  push(f.dayGan, 8, "日主");
  push(f.monthZhi ? `${f.monthZhi}月` : undefined, 4, "月令");
  return out;
}

/** 宫位键配上方位，只用于展示 */
const dirOf = (key: string) => {
  const idx = Object.entries(PALACE_CN).find(([, v]) => v === key)?.[0];
  const dir = idx ? PALACE_DIR[Number(idx)] : "";
  return dir ? `（${dir}）` : "";
};

/** 盘面事实逐条列出，供报告第一节直接展示（全部来自引擎，模型不得改写） */
export function yangpanFactLines(f: YangpanFacts): string[] {
  const lines: string[] = [];
  if (f.sizhu) lines.push(`四柱：${f.sizhu}`);
  if (f.ju) lines.push(`局数：${f.ju}${f.yuan ? `　${f.yuan}` : ""}`);
  if (f.zhifu) lines.push(`值符：${f.zhifu}${f.zhifuGong ? `　落${f.zhifuGong}${dirOf(f.zhifuGong)}` : ""}`);
  if (f.zhishi) lines.push(`值使：${f.zhishi}${f.zhishiGong ? `　落${f.zhishiGong}${dirOf(f.zhishiGong)}` : ""}`);
  if (f.qiYunDesc) lines.push(`起运：${f.qiYunDesc}`);
  if (f.currentDaYun) lines.push(`当前大运：${f.currentDaYun}`);
  if (f.maXingZhi) lines.push(`驿马：${f.maXingZhi}`);
  return lines;
}
