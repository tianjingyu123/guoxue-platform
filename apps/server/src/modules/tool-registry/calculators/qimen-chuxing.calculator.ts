// ── 奇门出行指导计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》《遁甲演义》
// 基于日时奇门，为出行目的提供时辰+方位指导

interface ChuXingShiChen { shiChen: string; timeRange: string; level: "宜行" | "可行" | "不宜" | "大忌"; direction: string; jiXiong: string; advice: string; }
interface FangWeiJiXiong { fangWei: string; jiXiong: string; men: string; description: string; }
interface QiMenChuXingResult { date: string; shiChenList: ChuXingShiChen[]; fangWeiList: FangWeiJiXiong[]; bestTime: string; bestDirection: string; summary: string; }

const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const SHICHEN_TIME: Record<string, string> = {
  "子":"23:00-01:00","丑":"01:00-03:00","寅":"03:00-05:00","卯":"05:00-07:00",
  "辰":"07:00-09:00","巳":"09:00-11:00","午":"11:00-13:00","未":"13:00-15:00",
  "申":"15:00-17:00","酉":"17:00-19:00","戌":"19:00-21:00","亥":"21:00-23:00",
};
const MEN = ["休","生","伤","杜","景","死","惊","开"];
const MEN_JX: Record<string, string> = {"休":"吉","生":"吉","开":"吉","伤":"凶","杜":"平","景":"平","死":"凶","惊":"凶"};
const DIR = ["正北","东北","正东","东南","正南","西南","正西","西北"];

export function calculateQiMenChuXing(input: Record<string, unknown>): QiMenChuXingResult {
  const year = (input.year as number) || new Date().getFullYear();
  const month = (input.month as number) || new Date().getMonth() + 1;
  const day = (input.day as number) || new Date().getDate();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hour = (input.hour as number) || new Date().getHours();
  const fromDirection = (input.fromDirection as string) || "";
  const toDirection = (input.toDirection as string) || "";
  const purpose = (input.purpose as string) || "出差";

  const date = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const dayGan = GAN[(year + month + day) % 10];
  const juBase = (GAN.indexOf(dayGan) + day) % 9;

  // 12时辰出行指导
  const shiChenList: ChuXingShiChen[] = [];
  for (let i = 0; i < 12; i++) {
    const zhi = ZHI[i];
    const menIdx = (juBase + i) % 8;
    const men = MEN[menIdx];
    const jx = MEN_JX[men];

    let level: "宜行" | "可行" | "不宜" | "大忌";
    if (men === "开" || men === "休" || men === "生") level = "宜行";
    else if (men === "杜" || men === "景") level = "可行";
    else if (men === "伤" || men === "惊") level = "不宜";
    else level = "大忌";

    shiChenList.push({
      shiChen: zhi + "时", timeRange: SHICHEN_TIME[zhi] || "",
      level, direction: DIR[menIdx],
      jiXiong: jx,
      advice: level === "宜行" ? "出行大吉，百事顺遂" : level === "可行" ? "可以出行，注意安全" : level === "不宜" ? "尽量改时，避此时辰" : "切勿出行，必有阻碍",
    });
  }

  // 8方位吉凶
  const fangWeiList: FangWeiJiXiong[] = [];
  for (let i = 0; i < 8; i++) {
    const menIdx = (juBase + i + 2) % 8;
    fangWeiList.push({
      fangWei: DIR[i],
      jiXiong: MEN_JX[MEN[menIdx]],
      men: MEN[menIdx],
      description: `${DIR[i]}方${MEN[menIdx]}门，${MEN_JX[MEN[menIdx]] === "吉" ? "出行可往" : "出行慎往"}`,
    });
  }

  const bestSC = shiChenList.find(s => s.level === "宜行");
  const bestFW = fangWeiList.find(f => f.jiXiong === "吉");

  const summary = `${date}出行${purpose}。最佳时辰：${bestSC?.shiChen || "辰时"}(${bestSC?.timeRange || "07-09"})，`
    + `最佳方向：${bestFW?.fangWei || "正北"}(${bestFW?.men || "开"}门)。`
    + `避开死门惊门时辰和方位。${fromDirection && toDirection ? `从${fromDirection}往${toDirection}需结合具体方位吉凶判断。` : ""}`;

  return { date, shiChenList, fangWeiList, bestTime: bestSC?.shiChen || "辰时", bestDirection: bestFW?.fangWei || "正北", summary };
}
