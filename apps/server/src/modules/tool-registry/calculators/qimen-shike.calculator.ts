// ── 奇门时课分析计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》《遁甲演义》
// 针对具体事项的即时奇门排盘与指导

interface ShiKeGongPan { gongWei: string; men: string; xing: string; gan: string; shen: string; keYing: string; level: "吉" | "平" | "凶"; advice: string; }
interface ShiKeJieGuo { bestTime: string; bestDirection: string; bestGongWei: string; avoidTime: string; avoidDirection: string; }
interface QiMenShiKeResult { datetime: string; juInfo: { yangDun: boolean; juShu: number; tianGan: string }; gongPan: ShiKeGongPan[]; jieGuo: ShiKeJieGuo; summary: string; }

const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GONG_LIST = ["坎宫","坤宫","震宫","巽宫","乾宫","兑宫","艮宫","离宫"];
const DIRECTION_MAP: Record<string, string> = { "坎宫":"正北","坤宫":"西南","震宫":"正东","巽宫":"东南","乾宫":"西北","兑宫":"正西","艮宫":"东北","离宫":"正南" };
const MEN_LIST = ["休","生","伤","杜","景","死","惊","开"];
const XING_LIST = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"];
const SHEN_LIST = ["值符","螣蛇","太阴","六合","白虎","玄武","九地","九天"];
const MEN_JI_XIONG: Record<string, string> = { "休":"吉","生":"吉","开":"吉","伤":"凶","杜":"平","景":"平","死":"凶","惊":"凶" };

const MATTER_BEST: Record<string, { men: string; direction: string; time: string }> = {
  "求财":  { men: "生", direction: "正东/东南", time: "生门落宫时辰" },
  "出行":  { men: "开", direction: "西北/正西", time: "开门落宫时辰" },
  "谈判":  { men: "休", direction: "正北", time: "休门落宫时辰" },
  "婚嫁":  { men: "生", direction: "东南/正东", time: "生门+六合落宫" },
  "求职":  { men: "开", direction: "西北", time: "开门+值符落宫" },
  "搬迁":  { men: "生", direction: "正东", time: "生门+九地落宫" },
  "祭祀":  { men: "休", direction: "正北/西南", time: "休门落宫时辰" },
  "谋事":  { men: "开", direction: "西北/正西", time: "开门+九天落宫" },
};

export function calculateQiMenShiKe(input: Record<string, unknown>): QiMenShiKeResult {
  const year = (input.year as number) || new Date().getFullYear();
  const month = (input.month as number) || new Date().getMonth() + 1;
  const day = (input.day as number) || new Date().getDate();
  const hour = (input.hour as number) || new Date().getHours();
  const matterType = (input.matterType as string) || "求财";

  const datetime = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")} ${String(hour).padStart(2,"0")}:00`;
  const jieQiApprox = (month - 1) * 2 + (day > 15 ? 1 : 0);
  const yangDun = jieQiApprox < 11;
  const juShu = (jieQiApprox % 9) + 1;
  const dayGan = GAN[(year + month + day) % 10];
  const hourZhi = ZHI[Math.floor(hour / 2)];
  const tianGan = `${dayGan}${hourZhi}`;

  const gongPan: ShiKeGongPan[] = [];
  for (let i = 0; i < 8; i++) {
    const menIdx = (juShu + i + 3) % 8;
    const xingIdx = (juShu + i) % 9;
    const shenIdx = (juShu + i + 5) % 8;
    const men = MEN_LIST[menIdx];
    const level = MEN_JI_XIONG[men] as "吉" | "平" | "凶";

    gongPan.push({
      gongWei: GONG_LIST[i],
      men, xing: XING_LIST[xingIdx],
      gan: GAN[(GAN.indexOf(dayGan) + i) % 10],
      shen: SHEN_LIST[shenIdx],
      keYing: `${XING_LIST[xingIdx]}加${men}门，${level === "吉" ? "百事可为" : level === "凶" ? "诸事不宜" : "需择机而行"}`,
      level,
      advice: level === "吉" ? `宜${matterType}，可在此方行事` : level === "凶" ? `忌${matterType}，避开此方` : `可谨慎${matterType}`,
    });
  }

  const best = MATTER_BEST[matterType] || MATTER_BEST["求财"];
  const jiGong = gongPan.filter(g => g.level === "吉");
  const bestGong = jiGong.find(g => g.men === best.men) || jiGong[0] || gongPan[0];
  const xiongGong = gongPan.filter(g => g.level === "凶")[0] || gongPan[7];

  const jieGuo: ShiKeJieGuo = {
    bestTime: best.time,
    bestDirection: DIRECTION_MAP[bestGong.gongWei] || best.direction,
    bestGongWei: bestGong.gongWei,
    avoidTime: `${xiongGong.men}门当值之时`,
    avoidDirection: DIRECTION_MAP[xiongGong.gongWei] || "正南",
  };

  const summary = `${datetime}，奇门${yangDun ? "阳遁" : "阴遁"}${juShu}局，时干${tianGan}。`
    + `问${matterType}：吉门落${bestGong.gongWei}(${DIRECTION_MAP[bestGong.gongWei]})，`
    + `${bestGong.men}门+${bestGong.xing}+${bestGong.shen}，${bestGong.keYing}。`
    + `避开${xiongGong.gongWei}${xiongGong.men}门。`;

  return { datetime, juInfo: { yangDun, juShu, tianGan }, gongPan, jieGuo, summary };
}
