// ── 小六壬计算引擎 ──
// 掌诀推算（道家/江氏/江氏二代三法）

import type { XiaoLiuRenResult, ZhangJuePosition, TuiSuanStep } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

const ZHANG_JUE: { name: string; handPos: string; wuXing: string; direction: string; jiXiong: string; numbers: string; duanYu: string; color: string; xiangYi: { main:string; xunRen:string; shiWu:string; chuXing:string; hunYin:string; qiuCai:string; jianKang:string } }[] = [
  { name:"大安", handPos:"食指根部", wuXing:"木", direction:"正东", jiXiong:"大吉", numbers:"1/5/7", color:"青色", duanYu:"大安事事昌，求财在坤方。失物去不远，宅舍保安康。", xiangYi:{ main:"诸事安稳，光明正大", xunRen:"人在家中未动", shiWu:"物品在原地附近", chuXing:"出行平安顺利", hunYin:"婚姻和谐美满", qiuCai:"财运平稳有进", jianKang:"身体健康无恙" } },
  { name:"留连", handPos:"食指指尖", wuXing:"水", direction:"正南", jiXiong:"凶", numbers:"2/8/10", color:"黑色", duanYu:"留连事难成，求谋日不明。官事宜迟缓，去者未回程。", xiangYi:{ main:"事有阻碍，迟滞未明", xunRen:"人在途中未归", shiWu:"物品被移动难寻", chuXing:"出行不宜远行", hunYin:"婚事多阻碍", qiuCai:"财运低迷", jianKang:"需防小病" } },
  { name:"速喜", handPos:"中指指尖", wuXing:"火", direction:"正南", jiXiong:"中吉", numbers:"3/6/9", color:"红色", duanYu:"速喜喜来临，求财向南行。失物申未午，逢人路上寻。", xiangYi:{ main:"好事临近，喜讯将至", xunRen:"人在路途中", shiWu:"物品可找回", chuXing:"出行见喜事", hunYin:"婚事易成", qiuCai:"财运来得快", jianKang:"身体康复快" } },
  { name:"赤口", handPos:"无名指指尖", wuXing:"金", direction:"正西", jiXiong:"大凶", numbers:"4/7/10", color:"白色", duanYu:"赤口主口舌，官非切要防。失物急去寻，行人有惊慌。", xiangYi:{ main:"口舌是非，官非小灾", xunRen:"人受阻碍难归", shiWu:"物品已失难回", chuXing:"出行有口舌", hunYin:"争吵不和", qiuCai:"破财失财", jianKang:"需防急病" } },
  { name:"小吉", handPos:"无名指根部", wuXing:"木", direction:"东北", jiXiong:"大吉", numbers:"1/5/7", color:"绿色", duanYu:"小吉最吉昌，路上好商量。失物可寻获，行人立便至。", xiangYi:{ main:"万事吉利，顺心如意", xunRen:"人将归", shiWu:"失物可寻回", chuXing:"出行大吉", hunYin:"婚姻美满", qiuCai:"求财有得", jianKang:"身体健康" } },
  { name:"空亡", handPos:"中指根部", wuXing:"土", direction:"西南", jiXiong:"大凶", numbers:"3/6/9", color:"黄色", duanYu:"空亡事不长，阴人多乖张。求财无利益，行人有灾殃。", xiangYi:{ main:"万事落空，徒劳无功", xunRen:"人走失难寻", shiWu:"物品丢失不见", chuXing:"出行不顺", hunYin:"婚事难成", qiuCai:"钱财落空", jianKang:"病情加重" } },
];

// 月日时对应数字
function monthNum(lunarMonth: number): number { return lunarMonth; }
function dayNum(lunarDay: number): number { return lunarDay; }
function hourNum(shiChenIdx: number): number { return shiChenIdx + 1; }

/** 推算掌诀位置 */
function tuiSuan(startIdx: number, count: number): number {
  return (startIdx + count - 1) % 6;
}

/** 获取时辰 */
function getShiChen(hour: number): { name: string; idx: number } {
  const shiChenNames = ["子时","丑时","寅时","卯时","辰时","巳时","午时","未时","申时","酉时","戌时","亥时"];
  const idx = Math.floor(hour / 2) % 12;
  return { name: shiChenNames[idx], idx };
}

/** 主计算函数 */
export function calculateXiaoLiuRen(input: Record<string, unknown>): XiaoLiuRenResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const method = (input.method as string) ?? "time";
  const reportNumber = input.reportNumber as number | undefined;
  const type = (input.type as string) ?? "daojia";

  const d = new Date(datetime);
  const shiChen = getShiChen(d.getHours());

  // 使用 lunar-javascript 转换公历→农历
  const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const lunar = solar.getLunar();
  const lMonth = lunar.getMonth();
  const lDay = lunar.getDay();

  const yNum = monthNum(lMonth);
  const mNum = dayNum(lDay);
  const hNum = method === "baoshu" && reportNumber ? reportNumber : hourNum(shiChen.idx);

  // 三次推算
  const pos1 = tuiSuan(0, yNum);
  const pos2 = tuiSuan(pos1, mNum);
  const pos3 = tuiSuan(pos2, hNum);

  const steps: TuiSuanStep[] = [
    { step:1, label:"月上起日", from:ZHANG_JUE[0].name as any, count:yNum, to:ZHANG_JUE[pos1].name as any, desc:`从大安起正月，数至${lMonth}月，落${ZHANG_JUE[pos1].name}。` },
    { step:2, label:"日上起时", from:ZHANG_JUE[pos1].name as any, count:mNum, to:ZHANG_JUE[pos2].name as any, desc:`从${ZHANG_JUE[pos1].name}起初一，数至${lDay}日，落${ZHANG_JUE[pos2].name}。` },
    { step:3, label:"时上查掌诀", from:ZHANG_JUE[pos2].name as any, count:hNum, to:ZHANG_JUE[pos3].name as any, desc:`从${ZHANG_JUE[pos2].name}起子时，数至${shiChen.name}，落${ZHANG_JUE[pos3].name}。` },
  ];

  const finalPosition: ZhangJuePosition = {
    index: pos3 + 1,
    name: ZHANG_JUE[pos3].name as any,
    handPosition: ZHANG_JUE[pos3].handPos,
    wuXing: ZHANG_JUE[pos3].wuXing as any,
    direction: ZHANG_JUE[pos3].direction,
    jiXiong: ZHANG_JUE[pos3].jiXiong as any,
    numbers: ZHANG_JUE[pos3].numbers,
    duanYu: ZHANG_JUE[pos3].duanYu,
    xiangYi: ZHANG_JUE[pos3].xiangYi,
    color: ZHANG_JUE[pos3].color,
  };

  const info = ZHANG_JUE[pos3];
  const duanYu = `${info.name}：${info.duanYu}。${info.xiangYi.main}。`;

  return {
    input: { datetime, type: type as any, method: method as any, reportNumber },
    lunarTime: {
      year: `${lunar.getYear()}年（${lunar.getYearShengXiao()}年）`,
      month: lMonth,
      monthName: `${lunar.getMonthInGanZhi()}月（${lMonth}月）`,
      day: lDay,
      dayGanZhi: lunar.getDayInGanZhi(),
      shiChen: shiChen.name,
      shiChenIndex: shiChen.idx,
    },
    isRunYue: lunar.getMonth() < 0,
    zhangJue: ZHANG_JUE.map((zj, i) => ({
      index: i + 1,
      name: zj.name as any, handPosition: zj.handPos,
      wuXing: zj.wuXing as any, direction: zj.direction,
      jiXiong: zj.jiXiong as any, numbers: zj.numbers,
      duanYu: zj.duanYu, xiangYi: zj.xiangYi, color: zj.color,
    })),
    steps,
    finalPosition,
    duanYu,
    tips: info.jiXiong === "大吉" || info.jiXiong === "中吉"
      ? ["所求之事有望成功","宜主动出击","时机较为有利"]
      : ["宜静不宜动","需耐心等待时机","可另择吉日再问"],
  };
}
