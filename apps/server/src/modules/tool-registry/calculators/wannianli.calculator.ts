// ── 万年历核心计算引擎 ──
// 干支历/节气/建除/二十八宿/黄历宜忌

import type { WanNianLiResult, DayDetail } from "@guoxue/shared";
import { calcRiZhu, calcAllJieQi, getNianZhuYear } from "@guoxue/bazi-engine";
import { Solar } from "lunar-javascript";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const SHENG_XIAO = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
const WEEK_DAYS = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
const NA_YIN = [
  "海中金","炉中火","大林木","路旁土","剑锋金","山头火",
  "涧下水","城头土","白蜡金","杨柳木","泉中水","屋上土",
  "霹雳火","松柏木","流年水","沙中金","山下火","平地木",
  "壁上土","金箔金","覆灯火","天河水","大驿土","钗环金",
  "桑柘木","柘榴木","大海水","石榴木","大海水",
];

// 24节气名（顺序列表，用于遍历）
const JIE_QI_NAMES = ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"];

// 二十八宿值日（按星期循环）
const ER_SHI_BA_XIU = ["角","亢","氐","房","心","尾","箕","斗","牛","女","虚","危","室","壁","奎","娄","胃","昴","毕","觜","参","井","鬼","柳","星","张","翼","轸"];

// 建除十二神（按月支循环）
const JIAN_CHU = ["建","除","满","平","定","执","破","危","成","收","开","闭"];

// 彭祖百忌（按日干和日支）
const PENG_ZU_GAN: Record<string, string> = {
  "甲": "甲不开仓财物耗散", "乙": "乙不栽植千株不长",
  "丙": "丙不修灶必见灾殃", "丁": "丁不剃头头必生疮",
  "戊": "戊不受田田主不祥", "己": "己不破券二比并亡",
  "庚": "庚不经络织机虚张", "辛": "辛不合酱主人不尝",
  "壬": "壬不泱水更难提防", "癸": "癸不词讼理弱敌强",
};
const PENG_ZU_ZHI: Record<string, string> = {
  "子": "子不问卜自惹祸殃", "丑": "丑不冠带主不还乡",
  "寅": "寅不祭祀神鬼不尝", "卯": "卯不穿井水泉不通",
  "辰": "辰不哭泣必主重丧", "巳": "巳不远行财物伏藏",
  "午": "午不苫盖屋主更张", "未": "未不服药毒气入肠",
  "申": "申不安床鬼祟入房", "酉": "酉不宴客醉坐颠狂",
  "戌": "戌不吃犬作怪上床", "亥": "亥不嫁娶不利新郎",
};

/** 计算年干支（考虑立春分界，使用 bazi-engine 天文算法） */
function yearGanZhi(year: number, month: number, day: number): string {
  const nianZhuYear = getNianZhuYear(year, month, day);
  // 甲子年=1984，反推年干支
  const baseYear = 1984;
  const diff = nianZhuYear - baseYear;
  let idx = diff % 60;
  if (idx < 0) idx += 60;
  return TIAN_GAN[idx % 10] + DI_ZHI[idx % 12];
}

/** 计算日干支（bazi-engine 纯数学算法，无时区问题） */
function dayGanZhi(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+08:00");
  const rz = calcRiZhu(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return rz.gan + rz.zhi;
}

/** 计算月干支（年上起月法，年干考虑立春分界） */
function monthGanZhi(year: number, month: number, day = 15): string {
  // 用 getNianZhuYear 获取正确的年柱年份（立春分界）
  const nianYear = getNianZhuYear(year, month, day);
  const baseYear = 1984;
  const diff = nianYear - baseYear;
  let nianIdx = diff % 60;
  if (nianIdx < 0) nianIdx += 60;
  const yGan = nianIdx % 10;
  // 甲己之年丙作首
  const baseGan = [2,4,6,8,0,2,4,6,8,0][yGan]; // 丙寅月为正月
  const mGanIdx = (baseGan + month - 1) % 10;
  const mZhiIdx = (2 + month - 1) % 12; // 寅月为正月
  return TIAN_GAN[mGanIdx] + DI_ZHI[mZhiIdx];
}

/** 计算时干支（日上起时法） */
function hourGanZhi(dayGan: string, hour: number): string {
  const dGan = TIAN_GAN.indexOf(dayGan);
  // 甲己还加甲
  const baseGan = [0,2,4,6,8][Math.floor(dGan / 2)];
  const zhiIdx = Math.floor(hour / 2); // 每2小时一个时辰
  return TIAN_GAN[(baseGan + zhiIdx) % 10] + DI_ZHI[zhiIdx % 12];
}

/** 获取当前所处节气区间（Meeus 天文算法） */
function currentJieQi(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+08:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dateValue = month * 100 + day;

  // 查本年+明年节气（处理跨年边界）
  const allJieQi = calcAllJieQi(year);
  const nextJieQi = calcAllJieQi(year + 1);

  for (let i = 0; i < 24; i++) {
    const jieName = JIE_QI_NAMES[i];
    let jie = allJieQi.get(jieName);
    if (!jie) jie = nextJieQi.get(jieName);
    if (!jie) continue;
    const jieValue = jie.month * 100 + jie.day;

    const prevIdx = (i + 23) % 24;
    const prevName = JIE_QI_NAMES[prevIdx];
    let prevJie = allJieQi.get(prevName);
    if (!prevJie) prevJie = (prevIdx >= 12 ? nextJieQi : allJieQi).get(prevName);
    if (!prevJie) continue;
    const prevValue = prevJie.month * 100 + prevJie.day;

    // 处理跨年：前一个节气月份大于当前节气（跨年）
    const adjustedPrevValue = prevJie.month > jie.month ? prevValue - 1200 : prevValue;

    if (dateValue >= adjustedPrevValue && dateValue < jieValue) {
      return prevName;
    }
  }
  return "冬至";
}

/** 建除值日 */
function jianChuValue(monthZhi: string, dayZhi: string): string {
  const mIdx = DI_ZHI.indexOf(monthZhi);
  const dIdx = DI_ZHI.indexOf(dayZhi);
  const offset = (dIdx - mIdx + 12) % 12;
  return JIAN_CHU[offset];
}

/** 二十八宿值日（按公历日序循环，1900-01-01=角宿日基准） */
function xiuValue(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+08:00");
  // 使用纯数学日差：1900-01-01 = 角宿日
  const baseYear = 1900;
  const dateYear = d.getFullYear(), dateMonth = d.getMonth() + 1, dateDay = d.getDate();
  // 简化：计算从1900-01-01起的天数差
  const baseDate = new Date(Date.UTC(baseYear, 0, 1));
  const targetDate = new Date(Date.UTC(dateYear, dateMonth - 1, dateDay));
  const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);
  let idx = diffDays % 28;
  if (idx < 0) idx += 28;
  return ER_SHI_BA_XIU[idx];
}

/** 纳音 */
function naYinValue(ganZhi: string): string {
  const g = TIAN_GAN.indexOf(ganZhi[0]);
  const z = DI_ZHI.indexOf(ganZhi[1]);
  const idx = (Math.floor(g / 2) * 6 + Math.floor(z / 2)) % 30;
  return NA_YIN[idx] ?? "未知";
}

/** 冲煞 */
function chongSha(dayZhi: string): string {
  const idx = DI_ZHI.indexOf(dayZhi);
  const chongIdx = (idx + 6) % 12;
  return `冲${SHENG_XIAO[chongIdx]}（${TIAN_GAN[chongIdx % 10]}${DI_ZHI[chongIdx]}）煞${["南","东","北","西"][Math.floor(chongIdx / 3) % 4]}`;
}

/** 计算单日详情 */
function buildDayDetail(dateStr: string): DayDetail {
  const d = new Date(dateStr + "T00:00:00+08:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const nGz = yearGanZhi(year, month, day);
  const yGz = monthGanZhi(year, month, day);
  const dGz = dayGanZhi(dateStr);
  const dGan = dGz[0];
  const dZhi = dGz[1];

  // 12时辰干支
  const shiGzArr: string[] = [];
  for (let h = 0; h < 24; h += 2) {
    shiGzArr.push(hourGanZhi(dGan, h));
  }

  // 简易黄历宜忌（基于建除+二十八宿）
  const jc = jianChuValue(yGz[1], dZhi);
  const { yi, ji } = getYiJi(jc, dGan, dZhi);

  // 使用 lunar-javascript 获取真实农历数据
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  const lunarMonth = Math.abs(lunar.getMonth());
  const isLeap = lunar.getMonth() < 0;

  return {
    solarDate: dateStr,
    lunarDate: `${lunar.getYearInGanZhi()}年${isLeap ? "闰" : ""}${lunarMonth}月${lunar.getDay()}日`,
    nianGanZhi: nGz,
    yueGanZhi: yGz,
    riGanZhi: dGz,
    shiGanZhi: shiGzArr,
    weekDay: WEEK_DAYS[d.getDay()],
    jieQi: currentJieQi(dateStr),
    lunarMonth: `${lunar.getMonthInGanZhi()}月（${isLeap ? "闰" : ""}${lunarMonth}月）`,
    lunarDay: `${lunar.getDayInGanZhi()}日（${lunar.getDay()}日）`,
    isLeap,
    jianChu: (lunar.getZhiXing() || jc) as any,
    erShiBaXiu: (lunar.getXiu() || xiuValue(dateStr)) as any,
    naYin: lunar.getDayNaYin() || naYinValue(dGz),
    jiuXing: ((d.getDay() + 1) % 9 + 1).toString(),
    zhiShen: getZhiShen(dZhi),
    pengZu: `${lunar.getPengZuGan() || (PENG_ZU_GAN[dGan] ?? "")}，${lunar.getPengZuZhi() || (PENG_ZU_ZHI[dZhi] ?? "")}`,
    taiShen: lunar.getDayPositionTai() || getTaiShen(dZhi),
    chongSha: `${lunar.getDayChongDesc() || chongSha(dZhi)}`,
    suiSha: getSuiSha(year),
    yi: lunar.getDayYi().length > 0 ? lunar.getDayYi() : yi,
    ji: lunar.getDayJi().length > 0 ? lunar.getDayJi() : ji,
    jiShen: lunar.getDayJiShen().length > 0 ? lunar.getDayJiShen() : getJiShen(jc, dGan),
    xiongSha: lunar.getDayXiongSha().length > 0 ? lunar.getDayXiongSha() : getXiongSha(jc, dZhi),
    shiChenJiXiong: [],
    score: calcDayScore(jc, dGan, dZhi),
    festivals: [...(lunar.getFestivals() || []), ...(lunar.getOtherFestivals() || [])],
  };
}

// 黄历宜忌规则
function getYiJi(jianChu: string, _dGan: string, _dZhi: string): { yi: string[]; ji: string[] } {
  const yiMap: Record<string, string[]> = {
    "建": ["出行","开市","祭祀","祈福"],
    "除": ["祭祀","祈福","出行","开市","上书"],
    "满": ["祭祀","祈福","嫁娶","动土","开市"],
    "平": ["出行","开市","交易","移徙"],
    "定": ["祭祀","祈福","裁衣","订婚"],
    "执": ["祭祀","祈福","出行"],
    "破": ["求医","治病","拆卸","扫除"],
    "危": ["祭祀","祈福","交易","立券"],
    "成": ["嫁娶","开市","交易","立券","移徙"],
    "收": ["祭祀","祈福","开市","交易"],
    "开": ["嫁娶","开市","出行","移徙","入宅"],
    "闭": ["祭祀","祈福","补垣","塞穴"],
  };
  const jiMap: Record<string, string[]> = {
    "建": ["安葬","行丧"],
    "除": ["嫁娶","安葬"],
    "满": ["安葬","行丧","求医"],
    "平": ["嫁娶","安葬"],
    "定": ["出行","嫁娶","开市"],
    "执": ["开市","动土","嫁娶"],
    "破": ["嫁娶","出行","开市"],
    "危": ["嫁娶","开市","动土"],
    "成": ["诉讼","求医"],
    "收": ["嫁娶","安葬","行丧"],
    "开": ["安葬","行丧"],
    "闭": ["嫁娶","出行","开市"],
  };
  return {
    yi: yiMap[jianChu] ?? [],
    ji: jiMap[jianChu] ?? [],
  };
}

function getZhiShen(dayZhi: string): string {
  const map: Record<string, string> = {
    "子":"金匮","丑":"天德","寅":"白虎","卯":"玉堂",
    "辰":"天牢","巳":"玄武","午":"司命","未":"勾陈",
    "申":"青龙","酉":"明堂","戌":"天刑","亥":"朱雀",
  };
  return map[dayZhi] ?? "未知";
}

function getTaiShen(dayZhi: string): string {
  const map: Record<string, string> = {
    "子":"碓磨房外正北","丑":"厕厨东南","寅":"碓磨炉外西北",
    "卯":"厨灶门外正东","辰":"厨灶炉外正东","巳":"碓磨炉灶占大门",
    "午":"厨灶碓房内正南","未":"仓房厕外正南","申":"碓磨炉外正西",
    "酉":"厨灶门外正西","戌":"厨灶炉外西北","亥":"厨灶床外西北",
  };
  return map[dayZhi] ?? "未知";
}

function getSuiSha(_year: number): string {
  return "岁煞南";
}

function getJiShen(jianChu: string, _dayGan: string): string[] {
  const map: Record<string, string[]> = {
    "建": ["月德","要安"], "除": ["阳德","益后"],
    "满": ["天德","福星"], "平": ["月德","时德"],
    "定": ["三合","临日"], "执": ["阳德","解神"],
    "破": ["驿马","天马"], "危": ["天德","敬安"],
    "成": ["月德","三合","普护"], "收": ["天德","母仓"],
    "开": ["月德","驿马","天后"], "闭": ["天赦","守日"],
  };
  return map[jianChu] ?? [];
}

function getXiongSha(jianChu: string, _dayZhi: string): string[] {
  const map: Record<string, string[]> = {
    "建": ["月煞","大煞"], "除": ["月破","大耗"],
    "满": ["月厌","劫煞"], "平": ["平日不忌"],
    "定": ["死气","月虚"], "执": ["小耗","劫煞"],
    "破": ["月破","大耗","劫煞"], "危": ["月煞","死气"],
    "成": ["小耗"], "收": ["月煞"],
    "开": ["月厌","天吏"], "闭": ["血支","五虚"],
  };
  return map[jianChu] ?? [];
}

function calcDayScore(jianChu: string, _dGan: string, _dZhi: string): number {
  const god = getJiShen(jianChu, "");
  const bad = getXiongSha(jianChu, "");
  return Math.min(100, Math.max(30, 60 + god.length * 10 - bad.length * 5));
}

/** 主计算函数 */
export function calculateWanNianLi(input: Record<string, unknown>): WanNianLiResult {
  const dateStr = (input.date as string)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const endDateStr = (input.endDate as string)?.slice(0, 10) ?? dateStr;

  const days: DayDetail[] = [];
  const current = new Date(dateStr + "T00:00:00+08:00");
  const end = new Date(endDateStr + "T00:00:00+08:00");

  // 按范围生成日数据
  let count = 0;
  while (current <= end && count < 62) {
    const ds = current.toISOString().slice(0, 10);
    days.push(buildDayDetail(ds));
    current.setDate(current.getDate() + 1);
    count++;
  }

  // 节气列表（Meeus 天文算法精确计算）
  const y = new Date(dateStr).getFullYear();
  const allJieQi = calcAllJieQi(y);
  const jieQiList = JIE_QI_NAMES.map((name) => {
    const jq = allJieQi.get(name);
    if (jq) {
      return {
        name,
        date: `${y}-${String(jq.month).padStart(2, "0")}-${String(jq.day).padStart(2, "0")}`,
        time: `${String(jq.hour).padStart(2, "0")}:${String(jq.minute).padStart(2, "0")}:00`,
      };
    }
    return { name, date: "", time: "00:00:00" };
  });

  return {
    input: input as any,
    days,
    jieQiList,
  };
}
