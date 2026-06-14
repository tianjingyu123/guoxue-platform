// ── 中六壬计算引擎 ──
// 天罡时定局 + 月将加时 + 课传分析 + 神煞 + 日干支
// 算法参考：《六壬大全》《六壬指南》《六壬视斯》

import type { ZhongLiuRenResult } from "@guoxue/shared";

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const YUE_JIANG_MAP: Record<number, string> = {
  1:"亥",2:"戌",3:"酉",4:"申",5:"未",6:"午",7:"巳",8:"辰",9:"卯",10:"寅",11:"丑",12:"子",
};

const DI_ZHI_WU_XING: Record<string, string> = {
  "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水",
};

// 十二天将（贵神）——按昼夜分阴阳顺逆
const GUI_REN_ORDER_DAY = ["丑","寅","卯","辰","巳","午","未","申","酉","戌","亥","子"];
const GUI_REN_ORDER_NIGHT = ["丑","子","亥","戌","酉","申","未","午","巳","辰","卯","寅"];
const GUI_REN_NAMES: Record<string, { name: string; desc: string; jiXiong: string }> = {
  "子":{name:"天后",desc:"主阴私暗昧、婚姻喜事，女贵人相助。",jiXiong:"吉"},
  "丑":{name:"贵人",desc:"天乙贵人，主权势、官方，遇事得贵人之力。",jiXiong:"吉"},
  "寅":{name:"青龙",desc:"主文书喜信、升迁调动，大利文书考试。",jiXiong:"吉"},
  "卯":{name:"六合",desc:"主婚姻交易、和合之事，利合作签约。",jiXiong:"吉"},
  "辰":{name:"勾陈",desc:"主争斗是非、田土官司，需防纠纷。",jiXiong:"凶"},
  "巳":{name:"螣蛇",desc:"主惊恐怪异、虚惊口舌，防小人暗算。",jiXiong:"凶"},
  "午":{name:"朱雀",desc:"主文书口舌、信息消息，防言语是非。",jiXiong:"平"},
  "未":{name:"太常",desc:"主宴乐饮食、衣帛礼仪，利社交礼仪。",jiXiong:"吉"},
  "申":{name:"白虎",desc:"主血光丧服、疾病凶灾，大凶之将宜化解。",jiXiong:"凶"},
  "酉":{name:"太阴",desc:"主阴私谋划、密谋图事，利暗中筹划。",jiXiong:"平"},
  "戌":{name:"天空",desc:"主虚诈不实、文书契约，防虚假信息。",jiXiong:"凶"},
  "亥":{name:"玄武",desc:"主盗贼遗失、暗昧不明，防财物损失。",jiXiong:"凶"},
};

const KECHUAN_MEANINGS: { name: string; meaning: string; jiXiong: string }[] = [
  { name:"伏吟课", meaning:"天地盘同，主事物静止、原地踏步，宜守不宜攻。", jiXiong:"平" },
  { name:"反吟课", meaning:"天地盘相冲，主反复变动、事有反复，宜快速决断。", jiXiong:"凶" },
  { name:"间传课", meaning:"事有阻隔，需借助中间力量，不可单打独斗。", jiXiong:"平" },
  { name:"顺连课", meaning:"三传顺行，事物一气呵成，顺势推进万事可成。", jiXiong:"吉" },
  { name:"逆连课", meaning:"三传逆行，事有逆势需反向思考，不可硬来。", jiXiong:"凶" },
  { name:"涉害课", meaning:"事有深意，表面简单实则复杂，需深入分析。", jiXiong:"平" },
  { name:"遥克课", meaning:"远方有阻，出行不利，远距离事务多波折。", jiXiong:"平" },
  { name:"昴星课", meaning:"如昴星隐现，真相未明，宜静观其变待水落石出。", jiXiong:"平" },
  { name:"别责课", meaning:"事有特殊缘由，常规方法不通，需另辟蹊径。", jiXiong:"平" },
  { name:"八专课", meaning:"干支同位，事情专一集中，心无旁骛可得。", jiXiong:"吉" },
  { name:"元首课", meaning:"一上克下，天地之道，凡事皆有主次，宜尊上令。", jiXiong:"吉" },
  { name:"重审课", meaning:"一下克上，以下犯上，事需重新审视，宜慎重。", jiXiong:"平" },
  { name:"知一课", meaning:"一上克下或一下克上，事有方向，宜顺势而为。", jiXiong:"吉" },
  { name:"蒿矢课", meaning:"如蓬蒿之箭，看似微弱实则有伤，防小事酿大祸。", jiXiong:"平" },
  { name:"弹射课", meaning:"如弹丸射击，来势虽快但力不足，惊而不险。", jiXiong:"平" },
];

/** 时辰→地支索引 */
function getShiChenIndex(hour: number): number {
  const idx = Math.floor((hour + 1) / 2) % 12;
  return idx === 0 ? 0 : idx;
}

/** 简化日干支计算（按2000年元旦甲子推算） */
function getDayGanZhi(date: Date): { gan: string; zhi: string } {
  const ref = new Date(2000, 0, 1);
  const dayDiff = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  const norm = ((dayDiff % 60) + 60) % 60;
  return { gan: TIAN_GAN[norm % 10], zhi: DI_ZHI[norm % 12] };
}

/** 查天乙贵神（日干定贵人起例） */
function getGuiRenZhi(dayGan: string, isDay: boolean): string {
  const map: Record<string, [string, string]> = {
    "甲":["未","丑"],"戊":["丑","未"],"庚":["丑","未"],
    "乙":["申","子"],"己":["子","申"],
    "丙":["酉","亥"],"丁":["亥","酉"],
    "辛":["午","寅"],"壬":["巳","卯"],"癸":["卯","巳"],
  };
  const [dayGui, nightGui] = map[dayGan] ?? ["丑","未"];
  return isDay ? dayGui : nightGui;
}

export function calculateZhongLiuRen(input: Record<string, unknown>): ZhongLiuRenResult {
  const datetime = new Date(input.datetime as string ?? new Date().toISOString());
  const month = datetime.getMonth() + 1;
  const hour = datetime.getHours();
  const isDay = hour >= 6 && hour < 18;

  // 日干支
  const { gan: riGan, zhi: riZhi } = getDayGanZhi(datetime);

  const yueJiang = YUE_JIANG_MAP[month] ?? "子";
  const shiChen = DI_ZHI[getShiChenIndex(hour)];
  const yueJiangIdx = DI_ZHI.indexOf(yueJiang);
  const shiChenIdx = DI_ZHI.indexOf(shiChen);

  // 天罡 = 月将索引 + 时辰索引
  const tianGangIdx = (yueJiangIdx + shiChenIdx) % 12;
  const tianGang = DI_ZHI[tianGangIdx];

  // 地盘点（从天罡开始排列）
  const diPan = DI_ZHI.map((_, i) => DI_ZHI[(tianGangIdx + i) % 12]);

  // 天盘（从月将开始排列）
  const tianPan = DI_ZHI.map((_, i) => DI_ZHI[(yueJiangIdx + i) % 12]);

  // 贵神临宫（日干→贵人→顺逆布十二天将）
  const guiRenZhi = getGuiRenZhi(riGan, isDay);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const guiRenIdx = DI_ZHI.indexOf(guiRenZhi);
  const guiOrder = isDay ? GUI_REN_ORDER_DAY : GUI_REN_ORDER_NIGHT;

  // 课传分析（多种判断）
  const keChuan = [];
  const tianDiDuizhao = diPan[0] === tianPan[0];

  // 伏吟/反吟
  if (tianDiDuizhao) {
    keChuan.push(KECHUAN_MEANINGS[0]); // 伏吟
  } else if (DI_ZHI.indexOf(diPan[0]) === (DI_ZHI.indexOf(tianPan[0]) + 6) % 12) {
    keChuan.push(KECHUAN_MEANINGS[1]); // 反吟
  }

  // 元首/重审：看天盘地盘的五行生克
  const panGongWx = DI_ZHI_WU_XING[tianPan[0]] ?? "土";
  const diWx = DI_ZHI_WU_XING[diPan[0]] ?? "土";
  const wxOrder = ["木","火","土","金","水"];
  const isSheng = (a: string, b: string) => (wxOrder.indexOf(a) + 1) % 5 === wxOrder.indexOf(b);
  const isKe = (a: string, b: string) => (wxOrder.indexOf(a) + 2) % 5 === wxOrder.indexOf(b);

  if (isKe(panGongWx, diWx)) keChuan.push(KECHUAN_MEANINGS[10]); // 元首（上克下）
  else if (isKe(diWx, panGongWx)) keChuan.push(KECHUAN_MEANINGS[11]); // 重审（下克上）

  // 基于月将→时辰的顺逆
  const yueShiRelation = (shiChenIdx - yueJiangIdx + 12) % 12;
  if (yueShiRelation <= 3 && yueShiRelation > 0) keChuan.push(KECHUAN_MEANINGS[3]); // 顺连
  else if (yueShiRelation >= 9) keChuan.push(KECHUAN_MEANINGS[4]); // 逆连
  else if (yueShiRelation === 6) keChuan.push(KECHUAN_MEANINGS[5]); // 涉害

  // 八专：日干支同气
  if (riGan === DI_ZHI[DI_ZHI.indexOf(riZhi)]) keChuan.push(KECHUAN_MEANINGS[9]);

  if (keChuan.length === 0) keChuan.push(KECHUAN_MEANINGS[2]); // 默认间传

  // 天罡五行旺衰分析
  const tianGangWx = DI_ZHI_WU_XING[tianGang];
  const shiChenWx = DI_ZHI_WU_XING[shiChen];
  const wxSheng = tianGangWx === shiChenWx ? "五行相同，平稳" :
    isSheng(tianGangWx, shiChenWx) ? "天罡生时辰，吉" :
    isSheng(shiChenWx, tianGangWx) ? "时辰生天罡，尚可" :
    isKe(tianGangWx, shiChenWx) ? "天罡克时辰，有所制约" :
    isKe(shiChenWx, tianGangWx) ? "时辰克天罡，不利" : "五行关系复杂";

  // 天罡所临贵神
  const tianGangGuiRen = GUI_REN_NAMES[guiOrder[tianGangIdx]] ?? GUI_REN_NAMES["丑"];
  const shiChenGuiRen = GUI_REN_NAMES[guiOrder[shiChenIdx]] ?? GUI_REN_NAMES["丑"];

  // 断语
  const jiXiongCount = keChuan.filter(k => k.jiXiong === "吉").length;
  const xiongCount = keChuan.filter(k => k.jiXiong === "凶").length;
  const overallJiXiong = jiXiongCount > xiongCount ? "吉" : xiongCount > jiXiongCount ? "凶" : "平";

  const duanYu = [
    `日${riGan}${riZhi}，月将${yueJiang}加时${shiChen}，天罡在${tianGang}（五行${tianGangWx}）。`,
    `天罡${wxSheng}。贵神临${tianGangGuiRen.name}（${tianGangGuiRen.desc.split("，")[0]}）。`,
    `课式：${keChuan.map(k=>k.name).join("、")}。`,
    overallJiXiong === "吉" ? "课传吉利，万事可谋，顺势而行必有所成。" :
    overallJiXiong === "凶" ? "课传多凶，宜静守待时，三思后行，切勿冒进。" :
    "课传中平，吉凶互见，择善固执，稳中求进。",
  ].join("");

  // 建议
  const advice: string[] = [];
  if (tianGangGuiRen.jiXiong === "凶") advice.push(`天罡临${tianGangGuiRen.name}：${tianGangGuiRen.desc}`);
  if (shiChenGuiRen.jiXiong === "凶") advice.push(`时逢${shiChenGuiRen.name}：${shiChenGuiRen.desc}`);
  if (xiongCount > 0) advice.push("课传有凶象，不宜草率决策，重大事项建议择日另占。");
  if (wxSheng.includes("吉")) advice.push("天罡生旺，利积极主动，把握当下时机。");
  if (tianGangIdx % 4 === 0) advice.push("天罡临四正位（子午卯酉），气场强盛，重大决策宜果断。");
  if (tianGangWx === "金" && shiChenWx === "木") advice.push("金木交战之象，防肢体外伤，出行谨慎。");
  if (tianGangWx === "水" && shiChenWx === "火") advice.push("水火未济之象，事多反复，宜耐心等待转机。");
  if (advice.length === 0) advice.push("课式中平，顺势而为，尽人事听天命。");

  return {
    input: { datetime: datetime.toISOString() },
    yueJiang, tianGang, shiChen,
    pan: { diPan: diPan.slice(0, 6), tianPan: tianPan.slice(0, 6) },
    keChuan, duanYu, advice,
  };
}
