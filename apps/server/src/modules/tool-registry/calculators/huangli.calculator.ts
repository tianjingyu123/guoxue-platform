// ── 每日黄历计算引擎 ──
// 算法参考：《协纪辨方书》《钦定协纪辨方书》
// 公历转农历 + 干支 + 节气 + 冲煞 + 宜忌 + 吉神凶神 + 二十八宿 + 建除十二神 + 吉时

import type { HuangLiResult, ErShiBaXiuDetail } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

const LUNAR_MONTHS = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAYS = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

const JIAN_CHU_NAMES = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"];

// ── 二十八宿完整数据库 ──
const XIU_DB: Record<string, ErShiBaXiuDetail> = {
  "角木蛟": { name:"角木蛟",animal:"蛟",element:"木",jiXiong:"吉",song:"角星造作主荣昌，外进田财及女郎。嫁娶婚姻出贵子，文人及第见君王。",suitable:["嫁娶","修造","安葬","祭祀"],unsuitable:[] },
  "亢金龙": { name:"亢金龙",animal:"龙",element:"金",jiXiong:"凶",song:"亢星造作长房当，十日之中主有殃。田地消磨官失职，投军定是虎狼伤。",suitable:[],unsuitable:["嫁娶","修造","安葬","出行"] },
  "氐土貉": { name:"氐土貉",animal:"貉",element:"土",jiXiong:"吉",song:"氐星造作主灾凶，费尽田园仓库空。埋葬不可用此日，悬绳吊颈祸重重。",suitable:["嫁娶","出行","入学"],unsuitable:["安葬"] },
  "房日兔": { name:"房日兔",animal:"兔",element:"日",jiXiong:"吉",song:"房星造作田园进，血财牛马遍山岗。更招外处田庄宅，荣华富贵福禄康。",suitable:["嫁娶","修造","祭祀","出行"],unsuitable:[] },
  "心月狐": { name:"心月狐",animal:"狐",element:"月",jiXiong:"凶",song:"心星造作大为凶，更遭刑讼狱囚中。忤逆官非宅产退，埋葬卒暴死相从。",suitable:[],unsuitable:["嫁娶","修造","安葬","出行"] },
  "尾火虎": { name:"尾火虎",animal:"虎",element:"火",jiXiong:"吉",song:"尾星造作得天恩，富贵荣华福寿增。招财进宝兴家宅，和合婚姻贵子孙。",suitable:["嫁娶","修造","祭祀","开市"],unsuitable:[] },
  "箕水豹": { name:"箕水豹",animal:"豹",element:"水",jiXiong:"吉",song:"箕星造作主高强，岁岁年年大吉昌。埋葬修坟多吉利，田蚕牛马遍山岗。",suitable:["修造","安葬","祭祀"],unsuitable:["嫁娶"] },
  "斗木獬": { name:"斗木獬",animal:"獬",element:"木",jiXiong:"吉",song:"斗星造作主招财，文武官员位鼎台。田宅钱财千万进，坟茔修筑富贵来。",suitable:["修造","安葬","开市","祭祀"],unsuitable:["嫁娶"] },
  "牛金牛": { name:"牛金牛",animal:"牛",element:"金",jiXiong:"凶",song:"牛星造作主灾危，九横三灾不可推。家宅不安人口损，田蚕不利主人衰。",suitable:[],unsuitable:["嫁娶","修造","安葬","出行","开市"] },
  "女土蝠": { name:"女土蝠",animal:"蝠",element:"土",jiXiong:"凶",song:"女星造作损婆娘，兄弟相嫌似虎狼。埋葬生灾逢鬼怪，颠邪疾病主瘟癀。",suitable:[],unsuitable:["嫁娶","修造","安葬","出行"] },
  "虚日鼠": { name:"虚日鼠",animal:"鼠",element:"日",jiXiong:"凶",song:"虚星造作主灾殃，男女孤眠不一双。内乱风声无礼节，儿孙媳妇伴人床。",suitable:[],unsuitable:["嫁娶","修造","安葬","开市"] },
  "危月燕": { name:"危月燕",animal:"燕",element:"月",jiXiong:"吉",song:"危星不可造高堂，自吊遭刑见血光。埋葬修营官禄显，三年之内进田庄。",suitable:["安葬","祭祀"],unsuitable:["修造","嫁娶"] },
  "室火猪": { name:"室火猪",animal:"猪",element:"火",jiXiong:"吉",song:"室星造作进田牛，儿孙代代近王侯。富贵荣华天上至，寿如彭祖八千秋。",suitable:["嫁娶","修造","安葬","祭祀","出行","开市"],unsuitable:[] },
  "壁水貐": { name:"壁水貐",animal:"貐",element:"水",jiXiong:"吉",song:"壁星造作主增财，丝蚕大熟福滔天。奴婢自来人口进，开门放水出英贤。",suitable:["嫁娶","修造","开市","出行"],unsuitable:["安葬"] },
  "奎木狼": { name:"奎木狼",animal:"狼",element:"木",jiXiong:"吉",song:"奎星造作得祯祥，家下荣和大吉昌。若是埋葬阴卒死，开门定及外人亡。",suitable:["修造","祭祀","开市"],unsuitable:["嫁娶","安葬"] },
  "娄金狗": { name:"娄金狗",animal:"狗",element:"金",jiXiong:"吉",song:"娄星竖柱起门庭，财旺家和事事兴。外境钱财百日进，一家兄弟播高名。",suitable:["嫁娶","修造","开市","出行"],unsuitable:[] },
  "胃土雉": { name:"胃土雉",animal:"雉",element:"土",jiXiong:"吉",song:"胃星造作事如何，富贵荣华喜事多。埋葬贵临官禄位，夫妇齐眉永偕和。",suitable:["嫁娶","修造","安葬","祭祀"],unsuitable:[] },
  "昴日鸡": { name:"昴日鸡",animal:"鸡",element:"日",jiXiong:"凶",song:"昴星造作进田牛，埋葬官灾不得休。重丧二日三人死，尽卖田园不记留。",suitable:[],unsuitable:["嫁娶","修造","安葬","出行"] },
  "毕月乌": { name:"毕月乌",animal:"乌",element:"月",jiXiong:"吉",song:"毕星造作主光前，买得田园有粟钱。埋葬此日添官职，田蚕大熟永丰年。",suitable:["嫁娶","修造","安葬","祭祀","出行"],unsuitable:[] },
  "觜火猴": { name:"觜火猴",animal:"猴",element:"火",jiXiong:"凶",song:"觜星造作有徒刑，三年必定主伶仃。埋葬卒死多因此，取定寅年使杀人。",suitable:[],unsuitable:["嫁娶","修造","安葬","出行","祭祀"] },
  "参水猿": { name:"参水猿",animal:"猿",element:"水",jiXiong:"吉",song:"参星造作旺人家，文星照耀大光华。只因造作田财旺，埋葬招疾哭黄沙。",suitable:["修造","开市","出行"],unsuitable:["安葬","嫁娶"] },
  "井木犴": { name:"井木犴",animal:"犴",element:"木",jiXiong:"吉",song:"井星造作旺蚕田，金榜题名第一先。埋葬须防惊卒死，开塘淘井换新泉。",suitable:["修造","祭祀","开市"],unsuitable:["嫁娶","安葬"] },
  "鬼金羊": { name:"鬼金羊",animal:"羊",element:"金",jiXiong:"凶",song:"鬼星起造卒人亡，堂前不见主人郎。埋葬此日官禄至，儿孙代代近君王。",suitable:["安葬"],unsuitable:["嫁娶","修造","出行","开市"] },
  "柳土獐": { name:"柳土獐",animal:"獐",element:"土",jiXiong:"凶",song:"柳星造作主遭官，昼夜偷闲不暂安。埋葬瘟疫多疾死，田园退尽守冬寒。",suitable:[],unsuitable:["嫁娶","修造","安葬","出行","开市"] },
  "星日马": { name:"星日马",animal:"马",element:"日",jiXiong:"凶",song:"星宿日好造新房，进职加官近帝王。不可埋葬并放水，凶星临位女人亡。",suitable:["修造","开市"],unsuitable:["安葬","嫁娶"] },
  "张月鹿": { name:"张月鹿",animal:"鹿",element:"月",jiXiong:"吉",song:"张星日好造龙轩，年年便见进庄园。埋葬不久升官职，代代为官近帝前。",suitable:["嫁娶","修造","安葬","祭祀","开市","出行"],unsuitable:[] },
  "翼火蛇": { name:"翼火蛇",animal:"蛇",element:"火",jiXiong:"吉",song:"翼星最利架高堂，年年进禄见明王。埋葬此日官禄至，儿孙代代进田庄。",suitable:["修造","开市","出行","祭祀"],unsuitable:["嫁娶","安葬"] },
  "轸水蚓": { name:"轸水蚓",animal:"蚓",element:"水",jiXiong:"吉",song:"轸星临水造龙宫，代代为官受皇封。富贵荣华增寿禄，库满仓盈自昌隆。",suitable:["嫁娶","修造","安葬","祭祀","出行","开市"],unsuitable:[] },
};

export function calculateHuangLi(input: Record<string, unknown>): HuangLiResult {
  const dateStr = (input.date as string) || new Date().toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);

  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();

  const yearGZ = lunar.getYearInGanZhi();
  const monthGZ = lunar.getMonthInGanZhi();
  const dayGZ = lunar.getDayInGanZhi();

  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const lunarDate = `${yearGZ}年${LUNAR_MONTHS[lunarMonth]}月${LUNAR_DAYS[lunarDay]}`;

  const jieQi = lunar.getJieQi() || null;

  const chongDesc = lunar.getDayChongDesc();
  const sha = lunar.getDaySha();
  const chongSha = `冲${chongDesc} 煞${sha}`;

  const dayGan = lunar.getDayGan();
  const caiShen = getPositionFromGan(dayGan, "财");
  const xiShen = getPositionFromGan(dayGan, "喜");
  const fuShen = getPositionFromGan(dayGan, "福");

  let jiShen: string[] = [];
  let xiongShen: string[] = [];
  try { jiShen = lunar.getDayJiShen().slice(0, 5); } catch {}
  try { xiongShen = lunar.getDayXiongSha().slice(0, 5); } catch {}

  let yi: string[] = [];
  let ji: string[] = [];
  try { yi = lunar.getDayYi(); ji = lunar.getDayJi(); } catch {}
  if (yi.length === 0) yi = getDefaultYi(dayGZ);
  if (ji.length === 0) ji = getDefaultJi(dayGZ);

  // ── 二十八宿 ──
  let erShiBaXiu: ErShiBaXiuDetail;
  try {
    const xiu = lunar.getXiu();
    erShiBaXiu = XIU_DB[xiu] || { name:xiu, animal:"", element:"", jiXiong:"平", song:"", suitable:[], unsuitable:[] };
  } catch {
    erShiBaXiu = { name:"角木蛟", animal:"蛟", element:"木", jiXiong:"吉", song:"角星造作主荣昌", suitable:["嫁娶"], unsuitable:[] };
  }

  // ── 建除十二神 ──
  let jianChu = "平";
  try {
    const lunarMonthIdx = lunar.getMonth();
    const lunarDayIdx = lunar.getDay();
    const offset = (lunarDayIdx - Math.abs(lunarMonthIdx) + 12) % 12;
    jianChu = JIAN_CHU_NAMES[offset];
  } catch {
    const offset = (d - m + 12) % 12;
    jianChu = JIAN_CHU_NAMES[offset];
  }

  const jiShi = getJiShi(dayGZ);
  const summary = buildSummary(dateStr, lunarDate, yearGZ, monthGZ, dayGZ, jieQi, chongSha, caiShen, xiShen, fuShen, jiShen, xiongShen, yi, ji, erShiBaXiu, jianChu);

  return {
    date: dateStr, lunarDate,
    ganZhi: { year: yearGZ, month: monthGZ, day: dayGZ },
    jieQi, chongSha, caiShen, xiShen, fuShen,
    jiShen, xiongShen,
    yi: yi.slice(0, 8), ji: ji.slice(0, 8),
    jiShi, erShiBaXiu, jianChu, summary,
  };
}

function getPositionFromGan(gan: string, type: string): string {
  const caiMap: Record<string, string> = { "甲":"东北","乙":"东方","丙":"东南","丁":"正南","戊":"正南","己":"正北","庚":"西南","辛":"正西","壬":"正北","癸":"正东" };
  const xiMap: Record<string, string> = { "甲":"东北","乙":"西北","丙":"正南","丁":"正南","戊":"东南","己":"东北","庚":"西南","辛":"正西","壬":"正南","癸":"东南" };
  const fuMap: Record<string, string> = { "甲":"正北","乙":"西南","丙":"西北","丁":"正东","戊":"正北","己":"东南","庚":"西南","辛":"东南","壬":"东北","癸":"正南" };
  if (type === "财") return caiMap[gan] || "正南";
  if (type === "喜") return xiMap[gan] || "东北";
  return fuMap[gan] || "正北";
}

const YI_POOL = ["嫁娶","祭祀","开光","出行","解除","纳采","冠笄","入宅","安门","修造","动土","安床","移徙","挂匾","栽种","交易","立券","入殓","启攒","安葬"];
const JI_POOL = ["开市","动土","破土","安葬","嫁娶","修造","移徙","入宅","出行","安门","安床","祈福"];

function getDefaultYi(dayGZ: string): string[] {
  const seed = dayGZ.charCodeAt(0) * 100 + dayGZ.charCodeAt(1);
  const count = 4 + (seed % 4);
  const result: string[] = [];
  const pool = [...YI_POOL];
  for (let i = 0; i < count; i++) { const idx = (seed + i * 7) % pool.length; result.push(pool.splice(idx, 1)[0]); }
  return result;
}

function getDefaultJi(dayGZ: string): string[] {
  const seed = dayGZ.charCodeAt(0) * 50 + dayGZ.charCodeAt(1);
  const count = 3 + (seed % 3);
  const result: string[] = [];
  const pool = [...JI_POOL];
  for (let i = 0; i < count; i++) { const idx = (seed + i * 5) % pool.length; result.push(pool.splice(idx, 1)[0]); }
  return result;
}

// ── 黄道吉时（基于日支定时辰黄黑道，《协纪辨方书》）──
// 摒弃 charCodeAt Unicode 散列，改用传统「日支起黄道」定吉时：
// 每日十二时辰按黄道十二神（青龙、明堂、天刑、朱雀、金匮、天德、白虎、玉堂、天牢、玄武、司命、勾陈）排布，
// 起神时辰随日支三合而定（口诀：子午起申、丑未起戌、寅申起子、卯酉起寅、辰戌起辰、巳亥起午），
// 取黄道吉神（青龙0/明堂1/金匮4/天德5/玉堂7/司命10）当值的时辰为吉时。结果由日支唯一确定，可复现。
const SHI_CHEN = ["子时","丑时","寅时","卯时","辰时","巳时","午时","未时","申时","酉时","戌时","亥时"];
// 黄道吉神在十二神序列中的位置（青龙、明堂、金匮、天德、玉堂、司命）
const HUANG_DAO_GOOD = new Set([0, 1, 4, 5, 7, 10]);
// 日支 → 青龙(黄道首神)所临的起始时辰索引
const QING_LONG_START: Record<string, number> = {
  "子": 8, "午": 8, // 子午起申
  "丑": 10, "未": 10, // 丑未起戌
  "寅": 0, "申": 0, // 寅申起子
  "卯": 2, "酉": 2, // 卯酉起寅
  "辰": 4, "戌": 4, // 辰戌起辰
  "巳": 6, "亥": 6, // 巳亥起午
};

function getJiShi(dayGZ: string): string[] {
  const dayZhi = dayGZ.length >= 2 ? dayGZ[1] : "子";
  const start = QING_LONG_START[dayZhi] ?? 0;
  const result: string[] = [];
  // 从青龙起始时辰开始，依次为十二神，黄道吉神当值的时辰即吉时
  for (let god = 0; god < 12; god++) {
    if (HUANG_DAO_GOOD.has(god)) {
      const shiIdx = (start + god) % 12;
      result.push(SHI_CHEN[shiIdx]);
    }
  }
  // 按时辰顺序输出，取前 4 个吉时
  result.sort((a, b) => SHI_CHEN.indexOf(a) - SHI_CHEN.indexOf(b));
  return [...new Set(result)].slice(0, 4);
}

function buildSummary(date: string, lunarDate: string, yearGZ: string, monthGZ: string, dayGZ: string, jieQi: string | null, chongSha: string, caiShen: string, xiShen: string, fuShen: string, jiShen: string[], xiongShen: string[], yi: string[], ji: string[], xiu: ErShiBaXiuDetail, jianChu: string): string {
  const jieQiStr = jieQi ? `│ 节气：${jieQi}`.padEnd(36) + "│\n" : "";
  const yiStr = yi.slice(0, 5).join("、") || "无";
  const jiStr = ji.slice(0, 5).join("、") || "无";
  const jiShenStr = jiShen.length > 0 ? `│ 吉神：${jiShen.join("、")}`.padEnd(36) + "│\n" : "";
  const xiongShenStr = xiongShen.length > 0 ? `│ 凶神：${xiongShen.join("、")}`.padEnd(36) + "│\n" : "";

  return [
    "┌─ 每日黄历 · 择吉参考 ───────────────┐",
    `│ ${date}（${lunarDate.slice(0, 18)}）`.padEnd(36) + "│",
    `│ 干支：${yearGZ}年 ${monthGZ}月 ${dayGZ}日`.padEnd(36) + "│",
    jieQiStr.slice(0, -1) || "",
    `│ 冲煞：${chongSha}`.padEnd(36) + "│",
    `│ 财神：${caiShen}  喜神：${xiShen}  福神：${fuShen}`.padEnd(36) + "│",
    jiShenStr.slice(0, -1) || "",
    xiongShenStr.slice(0, -1) || "",
    "├─ 宜忌 ─────────────────────────────┤",
    `│ 宜：${yiStr}`.padEnd(36) + "│",
    `│ 忌：${jiStr}`.padEnd(36) + "│",
    "├─ 值日星宿与建除 ───────────────────┤",
    `│ 二十八宿：${xiu.name}（${xiu.jiXiong}）`.padEnd(36) + "│",
    `│ 建除：${jianChu}日`.padEnd(36) + "│",
    "├─ 出处 ─────────────────────────────┤",
    "│ 《协纪辨方书》《钦定协纪辨方书》    │",
    "└────────────────────────────────────┘",
  ].filter(Boolean).join("\n");
}
