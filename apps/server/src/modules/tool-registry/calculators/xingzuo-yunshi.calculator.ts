// ── 星座运势计算引擎 ──
// 采用中国二十八宿（星宿）体系 + 节气五行进行运势分析
// 理论来源：
//   《史记·天官书》《汉书·天文志》二十八宿体系
//   《协纪辨方书》二十八宿值日吉凶
//   《开元占经》星宿分野与人事对应

import type { XingZuoYunshiResult, XingZuo, XingZuoScores } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

const XINGZUO_LIST: XingZuo[] = [
  "白羊座", "金牛座", "双子座", "巨蟹座",
  "狮子座", "处女座", "天秤座", "天蝎座",
  "射手座", "摩羯座", "水瓶座", "双鱼座",
];

// 星座元素属性
const ELEMENTS: Record<XingZuo, string> = {
  "白羊座": "火", "金牛座": "土", "双子座": "风", "巨蟹座": "水",
  "狮子座": "火", "处女座": "土", "天秤座": "风", "天蝎座": "水",
  "射手座": "火", "摩羯座": "土", "水瓶座": "风", "双鱼座": "水",
};

// 二十八宿（按值日顺序）
// 每宿含：名称、所属七宿、吉凶、象征、宜、忌、对应星座倾向
const TWENTY_EIGHT_XIU: {
  name: string; group: string; jiXiong: string;
  symbol: string; yi: string[]; ji: string[];
  zodiacAffinity: number[]; // 关联的西方星座索引
  desc: string;
}[] = [
  { name: "角木蛟", group: "东方青龙", jiXiong: "吉", symbol: "龙角", yi: ["嫁娶", "开市", "入学", "出行"], ji: ["丧葬"], zodiacAffinity: [6, 7], desc: "角星造作主荣昌，外进田财及女郎；嫁娶婚姻生贵子，文人及第见君王" },
  { name: "亢金龙", group: "东方青龙", jiXiong: "凶", symbol: "龙颈", yi: ["祭祀", "裁衣"], ji: ["嫁娶", "开市", "出行"], zodiacAffinity: [6, 7], desc: "亢星造作长房衰，十日之中主有殃；田地消磨官失职，投军定是虎狼伤" },
  { name: "氐土貉", group: "东方青龙", jiXiong: "吉", symbol: "龙胸", yi: ["嫁娶", "开市", "交易", "出行"], ji: ["下葬"], zodiacAffinity: [6, 7], desc: "氐星造作主荣昌，嫁娶婚姻生贵子；凡事称心多顺利，贵人相助事皆成" },
  { name: "房日兔", group: "东方青龙", jiXiong: "吉", symbol: "龙腹", yi: ["嫁娶", "开市", "祈福", "入学"], ji: [], zodiacAffinity: [7, 8], desc: "房星造作旺钱财，嫁娶婚姻产贵儿；凡事求谋皆大吉，家门昌盛福自来" },
  { name: "心月狐", group: "东方青龙", jiXiong: "凶", symbol: "龙心", yi: ["祭祀"], ji: ["嫁娶", "开市", "出行", "搬家"], zodiacAffinity: [7, 8], desc: "心星造作大为凶，更遭刑讼狱囚中；忤逆官非田宅退，埋葬卒暴死相从" },
  { name: "尾火虎", group: "东方青龙", jiXiong: "吉", symbol: "龙尾", yi: ["嫁娶", "开市", "造屋", "入学"], ji: ["丧葬"], zodiacAffinity: [7, 8], desc: "尾星造作主添丁，子孙昌盛有财兴；婚姻求财皆顺遂，家门康泰福禄增" },
  { name: "箕水豹", group: "东方青龙", jiXiong: "吉", symbol: "龙箕", yi: ["开市", "交易", "出行", "嫁娶"], ji: [], zodiacAffinity: [8, 9], desc: "箕星造作主高强，年年岁岁大吉昌；婚姻高贵生贵子，功名显达事业长" },

  { name: "斗木獬", group: "北方玄武", jiXiong: "吉", symbol: "南斗", yi: ["嫁娶", "开市", "入学", "出行", "签约"], ji: [], zodiacAffinity: [9, 10], desc: "斗星造作主荣华，加官进爵事业佳；婚姻求财皆大吉，百事顺遂福满家" },
  { name: "牛金牛", group: "北方玄武", jiXiong: "凶", symbol: "牵牛", yi: ["祭祀", "纳财"], ji: ["嫁娶", "开市", "出行", "谈判"], zodiacAffinity: [9, 10], desc: "牛星造作主灾危，田蚕不利主人悲；嫁娶婚姻皆不利，疾病官非口舌随" },
  { name: "女土蝠", group: "北方玄武", jiXiong: "凶", symbol: "织女", yi: ["祭祀", "学艺"], ji: ["嫁娶", "开市", "出行", "动土"], zodiacAffinity: [10, 11], desc: "女星造作损娇娘，兄弟不和主祸殃；埋葬婚姻皆不吉，口舌是非日日忙" },
  { name: "虚日鼠", group: "北方玄武", jiXiong: "凶", symbol: "虚梁", yi: ["祭祀"], ji: ["嫁娶", "开市", "出行", "签约"], zodiacAffinity: [10, 11], desc: "虚星造作主灾殃，男女相争不可当；埋葬婚姻多不利，官非口舌暗中伤" },
  { name: "危月燕", group: "北方玄武", jiXiong: "吉", symbol: "危屋", yi: ["祭祀", "祈福", "安床", "修造"], ji: ["嫁娶", "开市", "远行"], zodiacAffinity: [10, 11], desc: "危星造作主安康，家道兴隆福满堂；凡百所求皆顺遂，出入平安永吉昌" },
  { name: "室火猪", group: "北方玄武", jiXiong: "吉", symbol: "营室", yi: ["嫁娶", "开市", "动土", "出行", "入学"], ji: [], zodiacAffinity: [11, 0], desc: "室星造作进田财，富贵荣华天降来；婚姻求财皆顺遂，生子聪明福满腮" },
  { name: "壁水貐", group: "北方玄武", jiXiong: "吉", symbol: "东壁", yi: ["嫁娶", "开市", "入学", "祈福", "交易"], ji: ["丧葬"], zodiacAffinity: [11, 0], desc: "壁星造作进文章，文人学士姓名扬；科甲连登官显达，婚姻和美福安康" },

  { name: "奎木狼", group: "西方白虎", jiXiong: "吉", symbol: "天奎", yi: ["嫁娶", "开市", "修造", "出行", "交易"], ji: [], zodiacAffinity: [0, 1], desc: "奎星造作主祯祥，家道兴隆大吉昌；婚姻和美生贵子，出入平安福满堂" },
  { name: "娄金狗", group: "西方白虎", jiXiong: "吉", symbol: "天娄", yi: ["嫁娶", "开市", "修造", "入学", "祭祀"], ji: [], zodiacAffinity: [0, 1], desc: "娄星造作进田庄，家道兴隆大吉昌；凡有所求皆顺利，婚姻和合福满堂" },
  { name: "胃土雉", group: "西方白虎", jiXiong: "吉", symbol: "天胃", yi: ["嫁娶", "开市", "入学", "纳财", "出行"], ji: [], zodiacAffinity: [1, 2], desc: "胃星造作主荣昌，家道兴隆福寿长；凡有所求皆大吉，出入顺利万事康" },
  { name: "昴日鸡", group: "西方白虎", jiXiong: "凶", symbol: "昴星", yi: ["祭祀"], ji: ["嫁娶", "开市", "出行", "谈判"], zodiacAffinity: [1, 2], desc: "昴星造作受灾殃，家宅不宁人亦伤；婚姻求财皆不利，官非口舌暗中藏" },
  { name: "毕月乌", group: "西方白虎", jiXiong: "吉", symbol: "天毕", yi: ["嫁娶", "开市", "修造", "出行", "签约"], ji: [], zodiacAffinity: [1, 2], desc: "毕星造作进田财，牛马兴旺福禄来；婚姻求财皆顺利，生子聪明位三台" },
  { name: "觜火猴", group: "西方白虎", jiXiong: "凶", symbol: "觜宿", yi: ["祭祀"], ji: ["嫁娶", "开市", "出行", "动土", "签约"], zodiacAffinity: [2, 3], desc: "觜星造作主灾殃，家宅不宁人口伤；疾病官非来缠绕，婚姻不利事难当" },
  { name: "参水猿", group: "西方白虎", jiXiong: "吉", symbol: "参宿", yi: ["嫁娶", "开市", "出行", "交易"], ji: [], zodiacAffinity: [2, 3], desc: "参星造作旺人家，文星照耀大光华；只因造作田财旺，埋葬招疾丧黄沙" },

  { name: "井木犴", group: "南方朱雀", jiXiong: "吉", symbol: "东井", yi: ["嫁娶", "开市", "祈福", "入学", "交易"], ji: [], zodiacAffinity: [3, 4], desc: "井星造作旺田蚕，金榜题名喜气扬；婚姻求财皆大吉，出入顺利子女昌" },
  { name: "鬼金羊", group: "南方朱雀", jiXiong: "凶", symbol: "舆鬼", yi: ["祭祀", "安葬"], ji: ["嫁娶", "开市", "出行", "搬家", "签约"], zodiacAffinity: [3, 4], desc: "鬼星造作主人亡，堂前不见主人郎；埋葬此日官禄至，儿孙代代近君王" },
  { name: "柳土獐", group: "南方朱雀", jiXiong: "凶", symbol: "柳宿", yi: ["祭祀"], ji: ["嫁娶", "开市", "出行", "动土"], zodiacAffinity: [4, 5], desc: "柳星造作主遭殃，家宅不宁人亦伤；婚姻不利多疾病，官非口舌暗中藏" },
  { name: "星日马", group: "南方朱雀", jiXiong: "吉", symbol: "七星", yi: ["嫁娶", "开市", "入学", "出行", "交易"], ji: [], zodiacAffinity: [4, 5], desc: "星宿造作旺家基，婚姻和合产贵儿；凡事求谋皆大吉，出入平安福禄齐" },
  { name: "张月鹿", group: "南方朱雀", jiXiong: "吉", symbol: "张宿", yi: ["嫁娶", "开市", "祈福", "签约", "出行"], ji: ["下葬"], zodiacAffinity: [4, 5], desc: "张星造作进田财，家道兴隆大吉昌；婚姻求财皆顺利，出入平安福满堂" },
  { name: "翼火蛇", group: "南方朱雀", jiXiong: "吉", symbol: "翼宿", yi: ["嫁娶", "开市", "交易", "出行", "入学"], ji: [], zodiacAffinity: [5, 6], desc: "翼星造作主荣昌，家道兴隆福满堂；贵人接引登高位，出入平安永吉昌" },
  { name: "轸水蚓", group: "南方朱雀", jiXiong: "吉", symbol: "轸宿", yi: ["嫁娶", "开市", "入学", "出行", "交易"], ji: [], zodiacAffinity: [5, 6], desc: "轸星造作旺庄田，入学求官事可全；婚姻求财皆顺遂，出入平安福禄绵" },
];

// 二十四节气（简化版：按月份近似）
// 用于影响星座的月份能量
const MONTH_ENERGY: Record<number, { name: string; wx: string; desc: string }> = {
  1:  { name: "大寒→立春", wx: "木", desc: "木气初生，万物萌发" },
  2:  { name: "立春→惊蛰", wx: "木", desc: "木气正旺，生机勃勃" },
  3:  { name: "惊蛰→清明", wx: "木", desc: "木气旺盛，春意盎然" },
  4:  { name: "清明→立夏", wx: "火", desc: "木火交替，气温回升" },
  5:  { name: "立夏→芒种", wx: "火", desc: "火气渐长，阳气日盛" },
  6:  { name: "芒种→小暑", wx: "火", desc: "火气最旺，万物繁茂" },
  7:  { name: "小暑→立秋", wx: "土", desc: "火土相接，湿热交蒸" },
  8:  { name: "立秋→白露", wx: "金", desc: "金气初生，秋意渐浓" },
  9:  { name: "白露→寒露", wx: "金", desc: "金气正旺，秋高气爽" },
  10: { name: "寒露→立冬", wx: "金", desc: "金气渐收，万物萧瑟" },
  11: { name: "立冬→大雪", wx: "水", desc: "水气渐长，寒气日盛" },
  12: { name: "大雪→小寒", wx: "水", desc: "水气最旺，万物闭藏" },
};

const ELEMENT_COLORS: Record<string, string[]> = {
  "火": ["红色", "橙色", "紫红色", "珊瑚色"],
  "土": ["棕色", "米色", "卡其色", "橄榄绿"],
  "风": ["白色", "浅蓝", "银色", "薄荷绿"],
  "水": ["蓝色", "黑色", "深紫", "海军蓝"],
};

// 星座配对（基于元素互补）
const BEST_MATCH: Record<number, number[]> = {
  0: [4, 8], 1: [5, 9], 2: [6, 10], 3: [7, 11],
  4: [0, 8], 5: [1, 9], 6: [2, 10], 7: [3, 11],
  8: [0, 4], 9: [1, 5], 10: [2, 6], 11: [3, 7],
};

// 五行元素与四元素对应
const ELEMENT_WUXING: Record<string, string> = {
  "火": "火", "土": "土", "风": "木", "水": "水",
};

// 根据月/日判断星座
const XINGZUO_DATES: [number, number][] = [
  [3, 21], [4, 20], [5, 21], [6, 22], [7, 23], [8, 23],
  [9, 23], [10, 24], [11, 23], [12, 22], [1, 20], [2, 19],
];

function getXingZuoFromDate(month: number, day: number): XingZuo {
  for (let i = 0; i < 12; i++) {
    const [sm, sd] = XINGZUO_DATES[i];
    const [em, ed] = XINGZUO_DATES[(i + 1) % 12];
    if (em > sm) {
      if ((month === sm && day >= sd) || (month === em && day < ed) || (month > sm && month < em))
        return XINGZUO_LIST[i];
    } else {
      if ((month === sm && day >= sd) || (month > sm) || (month < em) || (month === em && day < ed))
        return XINGZUO_LIST[i];
    }
  }
  return "摩羯座";
}

export function calculateXingZuoYunshi(input: Record<string, unknown>): XingZuoYunshiResult {
  let xingZuo: XingZuo;
  if (input.xingZuo) {
    xingZuo = input.xingZuo as XingZuo;
  } else if (input.birthMonth && input.birthDay) {
    xingZuo = getXingZuoFromDate(input.birthMonth as number, input.birthDay as number);
  } else {
    xingZuo = "白羊座";
  }

  const dateStr = (input.date as string) || new Date().toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();

  const xzIdx = XINGZUO_LIST.indexOf(xingZuo);
  const element = ELEMENTS[xingZuo];
  const wx = ELEMENT_WUXING[element] || "土";

  // 1. 确定当日的二十八宿值日
  // 二十八宿按固定顺序循环值日，以1900年1月1日（角宿值日）为基准推算
  const baseDate = new Date(1900, 0, 1);
  const targetDate = new Date(y, m - 1, d);
  const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (24 * 3600 * 1000));
  const xiuIdx = ((daysDiff % 28) + 28) % 28;
  const currentXiu = TWENTY_EIGHT_XIU[xiuIdx];

  // 2. 节气月份能量
  const monthEnergy = MONTH_ENERGY[m] || { name: "平月", wx: "土", desc: "时节平稳" };

  // 3. 星座与星宿的亲和度
  const affinity = currentXiu.zodiacAffinity.includes(xzIdx);
  const affinityBonus = affinity ? 10 : 0;

  // 4. 五行生克关系
  const xiuWx = currentXiu.group.includes("青龙") ? "木" : currentXiu.group.includes("朱雀") ? "火" : currentXiu.group.includes("白虎") ? "金" : "水"; // 四象五行
  const wxSheng: Record<string, string> = { "木": "水", "火": "木", "土": "火", "金": "土", "水": "金" };
  const wxKe: Record<string, string> = { "木": "金", "火": "水", "土": "木", "金": "火", "水": "土" };
  const wxBonus = wxSheng[wx] === xiuWx ? 8 : wxKe[wx] === xiuWx ? -8 : wx === xiuWx ? 5 : 0;

  // 5. 农历日期能量（月相影响）
  const lunarDay = lunar.getDay();
  const dayBonus = lunarDay <= 7 ? 3 : lunarDay <= 15 ? 5 : lunarDay <= 22 ? 0 : -2;

  // 6. 综合评分（100% 确定性算法，零随机数）
  const baseScore = 60; // 基准分
  const xiuScore = currentXiu.jiXiong === "吉" ? 15 : currentXiu.jiXiong === "凶" ? -10 : 0;
  const total = Math.min(95, Math.max(20, Math.round(
    baseScore + xiuScore + affinityBonus + wxBonus + dayBonus
  )));

  // 7. 分类评分
  // 事业：星宿吉凶 + 青龙/白虎（行动力）vs 玄武/朱雀
  const careerBonus = currentXiu.group.includes("青龙") || currentXiu.group.includes("白虎") ? 6 : currentXiu.group.includes("玄武") ? -3 : 3;
  // 财运：吉宿加持
  const wealthBonus = currentXiu.jiXiong === "吉" ? 5 : -3;
  // 感情：与星座的亲和度 + 月相
  const loveBonus = affinity ? 8 : lunarDay >= 13 && lunarDay <= 17 ? 3 : -2;
  // 健康：五行平衡
  const healthBonus = wx === xiuWx ? 4 : wxKe[wx] === xiuWx ? -5 : 0;

  const scores: XingZuoScores = {
    total,
    career: Math.min(95, Math.max(20, total + careerBonus)),
    wealth: Math.min(95, Math.max(20, total + wealthBonus)),
    love: Math.min(95, Math.max(20, total + loveBonus)),
    health: Math.min(95, Math.max(20, total + healthBonus)),
  };

  // 8. 幸运色/幸运数/配对星座（基于当日星宿）
  const colors = ELEMENT_COLORS[element];
  const luckyColor = colors[xiuIdx % colors.length];
  const luckyNumber = ((xiuIdx % 9) + 1);
  const partners = BEST_MATCH[xzIdx];
  const partnerIdx = partners[xiuIdx % partners.length];

  // 9. 综合断语
  const scoreLevel = total >= 80 ? "上佳" : total >= 65 ? "良好" : total >= 50 ? "平稳" : total >= 35 ? "偏弱" : "低迷";
  const summaryParts: string[] = [];

  summaryParts.push(`${xingZuo}（${element}象）今日值「${currentXiu.name}」${currentXiu.group}第${(xiuIdx % 7) + 1}宿，星宿评级「${currentXiu.jiXiong}」。`);
  summaryParts.push(`${currentXiu.desc}。`);

  if (affinity) {
    summaryParts.push(`当前星宿与${xingZuo}高度契合，运势得到星宿加持。`);
  }
  summaryParts.push(`时值${monthEnergy.name}（${monthEnergy.desc}），${wxBonus > 0 ? "五行相生，运势加分。" : wxBonus < 0 ? "五行相克，需多用心力。" : "五行平和。"}`);
  summaryParts.push(`综合运势${scoreLevel}（${total}分）。`);

  const summary = summaryParts.join("");

  // 建议
  const yi = currentXiu.yi.slice(0, total >= 70 ? 5 : total >= 55 ? 3 : 2);
  const ji = currentXiu.ji.slice(0, total >= 70 ? 1 : 3);

  let advice = "";
  if (total >= 80) {
    advice = "星宿大吉，宜积极推进重要事务，尤其适合" + yi.slice(0, 2).join("、") + "。";
  } else if (total >= 65) {
    advice = "运势良好，适合按计划推进，注意避开" + (ji.length > 0 ? ji[0] : "无特殊禁忌") + "。";
  } else if (total >= 50) {
    advice = "运势平稳，适合处理日常事务，不宜" + (ji.length > 0 ? ji.slice(0, 1).join("、") : "冒进") + "。";
  } else if (total >= 35) {
    advice = "今日宜守不宜攻，重点注意" + (ji.length > 0 ? ji.join("、") : "保持低调") + "，静待时机。";
  } else {
    advice = "星宿不利，建议避免重要决策和行动，" + (ji.length > 0 ? "尤其不宜" + ji.join("、") + "。" : "保持谨慎。");
  }

  return {
    input: { xingZuo, birthMonth: input.birthMonth as number, birthDay: input.birthDay as number, date: dateStr },
    xingZuo,
    element,
    date: dateStr,
    scores,
    lucky: {
      color: luckyColor,
      number: luckyNumber,
      xingZuoPartner: XINGZUO_LIST[partnerIdx],
    },
    summary,
    advice,
  };
}
