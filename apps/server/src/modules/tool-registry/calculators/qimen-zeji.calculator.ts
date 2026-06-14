// ── 奇门择吉计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》《遁甲演义》
// 黄道吉日 + 建除十二神 + 神煞择吉

import type { QiMenZeJiResult, ZeJiDate, ZeJiPurpose } from "@guoxue/shared";

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SHENG_XIAO = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];

// 建除十二神（按月支推算日支）
const JIAN_CHU_12 = ["建","除","满","平","定","执","破","危","成","收","开","闭"];

const JIAN_CHU_JI_XIONG: Record<string, { jiXiong: string; suitable: string[]; unsuitable: string[] }> = {
  "建": { jiXiong:"平", suitable:["出行"], unsuitable:["动土","安葬"] },
  "除": { jiXiong:"吉", suitable:["求医","祭祀","搬迁"], unsuitable:["婚嫁"] },
  "满": { jiXiong:"吉", suitable:["开业","签约","入学"], unsuitable:["安葬"] },
  "平": { jiXiong:"平", suitable:["出行","面试"], unsuitable:["动土"] },
  "定": { jiXiong:"吉", suitable:["婚嫁","签约","祭祀"], unsuitable:["出行"] },
  "执": { jiXiong:"平", suitable:["动土","开业"], unsuitable:["搬迁"] },
  "破": { jiXiong:"凶", suitable:[], unsuitable:["婚嫁","开业","搬迁","签约","出行"] },
  "危": { jiXiong:"凶", suitable:["求医"], unsuitable:["婚嫁","开业","搬迁"] },
  "成": { jiXiong:"大吉", suitable:["婚嫁","开业","搬迁","签约","动土","入学","面试"], unsuitable:["安葬"] },
  "收": { jiXiong:"平", suitable:["祭祀","签约"], unsuitable:["出行","开业"] },
  "开": { jiXiong:"大吉", suitable:["婚嫁","开业","搬迁","出行","签约","祭祀","入学","面试"], unsuitable:["安葬"] },
  "闭": { jiXiong:"凶", suitable:["安葬"], unsuitable:["婚嫁","开业","搬迁","出行","面试"] },
};

// 各用事的特殊吉日规则
const PURPOSE_RULES: Record<ZeJiPurpose, { preferShen: string[]; avoidZhi: string[]; preferTianGan: string[] }> = {
  "婚嫁": { preferShen:["成","开","定"], avoidZhi:[], preferTianGan:["甲","丙","戊","庚","壬"] },
  "开业": { preferShen:["成","开","满"], avoidZhi:[], preferTianGan:[] },
  "搬迁": { preferShen:["成","开","除"], avoidZhi:[], preferTianGan:[] },
  "出行": { preferShen:["开","建","平"], avoidZhi:["破"], preferTianGan:[] },
  "动土": { preferShen:["成","执"], avoidZhi:[], preferTianGan:[] },
  "安葬": { preferShen:["闭"], avoidZhi:["破"], preferTianGan:[] },
  "签约": { preferShen:["成","开","定","收"], avoidZhi:["破"], preferTianGan:[] },
  "求医": { preferShen:["除","危"], avoidZhi:[], preferTianGan:[] },
  "祭祀": { preferShen:["除","开","定","收"], avoidZhi:[], preferTianGan:[] },
  "入学": { preferShen:["成","开","满"], avoidZhi:[], preferTianGan:[] },
  "面试": { preferShen:["成","开","平"], avoidZhi:[], preferTianGan:[] },
  "其他": { preferShen:["成","开"], avoidZhi:["破"], preferTianGan:[] },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function lunarDayToNum(day: number): number {
  return ((day - 1) % 12) + 1;
}

function getJianChuShen(monthZhi: string, dayZhi: string): string {
  const mIdx = DI_ZHI.indexOf(monthZhi);
  const dIdx = DI_ZHI.indexOf(dayZhi);
  const offset = (dIdx - mIdx + 12) % 12;
  return JIAN_CHU_12[offset];
}

function scoreDate(jianChuShen: string, purpose: ZeJiPurpose, dayGan: string): number {
  let score = 50;
  const info = JIAN_CHU_JI_XIONG[jianChuShen];
  if (info.jiXiong === "大吉") score += 25;
  else if (info.jiXiong === "吉") score += 15;
  else if (info.jiXiong === "凶") score -= 30;

  const rules = PURPOSE_RULES[purpose];
  if (rules.preferShen.includes(jianChuShen)) score += 20;
  if (rules.preferTianGan.includes(dayGan)) score += 10;

  // 破日严厉扣分
  if (jianChuShen === "破") score -= 20;
  if (jianChuShen === "闭" && purpose !== "安葬") score -= 10;

  return Math.max(10, Math.min(100, score));
}

export function calculateQiMenZeJi(input: Record<string, unknown>): QiMenZeJiResult {
  const purpose = (input.purpose as ZeJiPurpose) ?? "其他";
  const startStr = (input.dateRange as { start: string; end: string })?.start ?? input.start as string;
  const endStr = (input.dateRange as { start: string; end: string })?.end ?? input.end as string;

  const start = new Date(startStr ?? new Date().toISOString());
  const end = new Date(endStr ?? new Date(Date.now() + 30*86400000).toISOString());
  if (isNaN(start.getTime())) return { input: { purpose, dateRange: { start: startStr ?? "", end: endStr ?? "" } }, dates: [], bestDate: null, summary: "日期范围无效" };
  if (isNaN(end.getTime())) return { input: { purpose: purpose, dateRange: { start: startStr ?? "", end: endStr ?? "" } }, dates: [], bestDate: null, summary: "日期范围无效" };

  const dates: ZeJiDate[] = [];
  const limit = Math.min(60, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const rules = PURPOSE_RULES[purpose];

  for (let i = 0; i < limit; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const dayNum = d.getDate();
    const dayZhi = DI_ZHI[(dayNum - 1) % 12];
    const dayGan = TIAN_GAN[(d.getFullYear() * 365 + d.getMonth() * 30 + dayNum) % 10];
    const monthZhi = DI_ZHI[(d.getMonth()) % 12];
    const jianChu = getJianChuShen(monthZhi, dayZhi);
    const info = JIAN_CHU_JI_XIONG[jianChu];
    const score = scoreDate(jianChu, purpose, dayGan);

    if (rules.avoidZhi.includes(dayZhi)) continue; // 避开不宜日

    const bestHours = DI_ZHI.map((zhi, idx) => {
      const hScore = jianChu === "成" ? 75 + (idx % 3) * 5 : 55 + (idx % 4) * 5;
      return { time: `${(idx*2+1).toString().padStart(2,"0")}:00-${(idx*2+3).toString().padStart(2,"0")}:00`, score: Math.min(100, hScore) };
    }).filter(h => h.score > 0).sort((a,b) => b.score - a.score).slice(0, 4);

    dates.push({
      date: d.toISOString().slice(0, 10),
      lunarDate: `${monthZhi}月${dayGan}${dayZhi}日`,
      score, jiXiong: info.jiXiong,
      shiShen: info.jiXiong !== "凶" ? [jianChu] : [],
      xiongShen: info.jiXiong === "凶" ? [jianChu] : [],
      suitable: info.suitable, unsuitable: info.unsuitable,
      bestHours,
      duanYu: `${jianChu}日（${info.jiXiong}），${info.suitable.length ? `宜${info.suitable.join("、")}` : ""}${info.unsuitable.length ? `忌${info.unsuitable.join("、")}` : ""}。`,
    });
  }

  dates.sort((a, b) => b.score - a.score);
  const bestDate = dates.length > 0 ? dates[0] : null;

  const summary = bestDate
    ? `最佳日期：${bestDate.date}（${bestDate.lunarDate}），${bestDate.jiXiong === "大吉" ? "上上大吉" : bestDate.jiXiong === "吉" ? "吉日可选" : "中等日期"}，${bestDate.duanYu}`
    : "选定日期范围内无合适吉日，建议扩大日期范围。";

  return { input: { purpose, dateRange: { start: startStr ?? "", end: endStr ?? "" } }, dates, bestDate, summary };
}
