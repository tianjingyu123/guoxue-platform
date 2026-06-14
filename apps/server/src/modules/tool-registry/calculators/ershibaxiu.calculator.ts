// ── 二十八宿计算引擎 ──
// 数据来源：《果老星宗》《星学大成》
// 二十八宿值日 + 禽星演禽

import type { ErShiBaXiuInput, ErShiBaXiuResult, XiuEntry } from "@guoxue/shared";

/** 十天干 */
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;

/** 十二地支 */
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 二十八宿完整数据（东方苍龙 → 南方朱雀 → 西方白虎 → 北方玄武） */
const ALL_XIU: XiuEntry[] = [
  // ── 东方苍龙七宿 ──
  {
    index: 1,
    name: "角木蛟",
    yao: "木",
    qinXing: "角木蛟",
    direction: "东",
    animal: "蛟",
    duShu: "12度",
    jiXiong: "吉",
    yi: "嫁娶、开业、出行、修造",
    ji: "忌安葬",
    meaning:
      "角为东方苍龙之首，龙角高耸主文运昌隆。木蛟性仁，角宿值日主文贵、升迁、诉讼得理，文人遇之文章显达，仕途顺遂。",
  },
  {
    index: 2,
    name: "亢金龙",
    yao: "金",
    qinXing: "亢金龙",
    direction: "东",
    animal: "龙",
    duShu: "9度",
    jiXiong: "凶",
    yi: "送瘟、出殡",
    ji: "忌婚嫁、出行",
    meaning:
      "亢为龙喉，金龙刚烈。亢宿值日多主争斗、破财之事，刚强过刚则折，宜静不宜动，凡事谨慎为佳。",
  },
  {
    index: 3,
    name: "氐土貉",
    yao: "土",
    qinXing: "氐土貉",
    direction: "东",
    animal: "貉",
    duShu: "15度",
    jiXiong: "吉",
    yi: "婚嫁、修造、搬迁、祭祀",
    ji: "忌栽种",
    meaning:
      "氐为龙之前足，土貉主安定积蓄。氐宿值日根基稳固，宜兴土木、结婚姻、迁居室，百事有根有据。",
  },
  {
    index: 4,
    name: "房日兔",
    yao: "日",
    qinXing: "房日兔",
    direction: "东",
    animal: "兔",
    duShu: "5度",
    jiXiong: "吉",
    yi: "祭祀、婚嫁、上任、出行",
    ji: "忌安葬",
    meaning:
      "房为龙腹，日兔象光明通达。房宿为吉宿，值日百事光明，出行得利，官事得理，婚嫁大成。",
  },
  {
    index: 5,
    name: "心月狐",
    yao: "月",
    qinXing: "心月狐",
    direction: "东",
    animal: "狐",
    duShu: "5度",
    jiXiong: "凶",
    yi: "捕猎、出殡",
    ji: "忌婚嫁、出行、远行",
    meaning:
      "心为龙心，月狐性狡多谋。心宿值日人心叵测，易生变故，不宜婚嫁远行，须防口舌是非。",
  },
  {
    index: 6,
    name: "尾火虎",
    yao: "火",
    qinXing: "尾火虎",
    direction: "东",
    animal: "虎",
    duShu: "18度",
    jiXiong: "吉",
    yi: "婚嫁、开业、出行",
    ji: "忌安葬、修造",
    meaning:
      "尾为龙尾，火虎威猛有势。尾宿值日权威加身，宜进取立功，处事果断，不利退守安葬。",
  },
  {
    index: 7,
    name: "箕水豹",
    yao: "水",
    qinXing: "箕水豹",
    direction: "东",
    animal: "豹",
    duShu: "11度",
    jiXiong: "吉",
    yi: "修造、嫁娶、出行",
    ji: "忌栽种",
    meaning:
      "箕为龙尾摇动生风，水豹灵动应变。箕宿值日风调雨顺，出入平安，万事顺遂，唯不利栽种。",
  },
  // ── 南方朱雀七宿 ──
  {
    index: 8,
    name: "井木犴",
    yao: "木",
    qinXing: "井木犴",
    direction: "南",
    animal: "犴",
    duShu: "33度",
    jiXiong: "吉",
    yi: "嫁娶、开业、祭祀、修造",
    ji: "忌安葬",
    meaning:
      "井为天井法度，木犴为公正守法律兽。井宿值日法理昭彰，诉讼得直，宜修造开市，百事吉昌。",
  },
  {
    index: 9,
    name: "鬼金羊",
    yao: "金",
    qinXing: "鬼金羊",
    direction: "南",
    animal: "羊",
    duShu: "2度",
    jiXiong: "凶",
    yi: "送瘟、出殡、祈福",
    ji: "忌嫁娶",
    meaning:
      "鬼为鬼宿幽冥之地，金羊不安。鬼宿值日阴气较重，多生怪异之事，宜祭祀祈福化灾，不宜婚嫁。",
  },
  {
    index: 10,
    name: "柳土獐",
    yao: "土",
    qinXing: "柳土獐",
    direction: "南",
    animal: "獐",
    duShu: "13度",
    jiXiong: "凶",
    yi: "出殡",
    ji: "忌嫁娶、开业",
    meaning:
      "柳为草木之象，土獐性惊易恐。柳宿值日易生惊惶，诸事不宜，唯出殡送葬可免灾祸。",
  },
  {
    index: 11,
    name: "星日马",
    yao: "日",
    qinXing: "星日马",
    direction: "南",
    animal: "马",
    duShu: "6度",
    jiXiong: "吉",
    yi: "上任、婚嫁、出行",
    ji: "忌修造",
    meaning:
      "星为七星高照，日马迅猛奔腾。星宿值日迅速通达，宜远行赴任、求婚嫁娶，得志得时之象。",
  },
  {
    index: 12,
    name: "张月鹿",
    yao: "月",
    qinXing: "张月鹿",
    direction: "南",
    animal: "鹿",
    duShu: "17度",
    jiXiong: "吉",
    yi: "嫁娶、开业、出行、修造",
    ji: "忌安葬",
    meaning:
      "张为天张广开，月鹿祥和瑞应。张宿值日宜宴乐婚嫁、开业庆典，百事和顺，大吉大利。",
  },
  {
    index: 13,
    name: "翼火蛇",
    yao: "火",
    qinXing: "翼火蛇",
    direction: "南",
    animal: "蛇",
    duShu: "18度",
    jiXiong: "凶",
    yi: "送瘟",
    ji: "忌嫁娶、开业、出行、上任",
    meaning:
      "翼为羽翼，火蛇性烈口毒。翼宿值日易生口舌是非，诸事不宜，唯送瘟驱邪可除灾祸。",
  },
  {
    index: 14,
    name: "轸水蚓",
    yao: "水",
    qinXing: "轸水蚓",
    direction: "南",
    animal: "蚓",
    duShu: "17度",
    jiXiong: "吉",
    yi: "嫁娶、修造、上任、出行",
    ji: "忌安葬",
    meaning:
      "轸为车驾，水蚓主载运承载。轸宿值日宜出行搬迁、婚嫁修造，承载万物，百事有成。",
  },
  // ── 西方白虎七宿 ──
  {
    index: 15,
    name: "奎木狼",
    yao: "木",
    qinXing: "奎木狼",
    direction: "西",
    animal: "狼",
    duShu: "16度",
    jiXiong: "吉",
    yi: "修造、嫁娶、出行",
    ji: "忌安葬",
    meaning:
      "奎为天库府藏，木狼主文章武功。奎宿值日文事武功皆宜，修造府库、婚嫁出行，百事亨通。",
  },
  {
    index: 16,
    name: "娄金狗",
    yao: "金",
    qinXing: "娄金狗",
    direction: "西",
    animal: "狗",
    duShu: "12度",
    jiXiong: "吉",
    yi: "婚嫁、修造、出行",
    ji: "忌安葬",
    meaning:
      "娄为聚众合和，金狗忠信守护。娄宿值日宜婚嫁团聚、修造营建，得众人之力，万事可成。",
  },
  {
    index: 17,
    name: "胃土雉",
    yao: "土",
    qinXing: "胃土雉",
    direction: "西",
    animal: "雉",
    duShu: "14度",
    jiXiong: "吉",
    yi: "嫁娶、修造、搬迁",
    ji: "忌栽种",
    meaning:
      "胃为天仓，土雉主蓄藏丰盈。胃宿值日丰收积聚，宜纳财蓄谷、婚嫁修造，不宜栽种。",
  },
  {
    index: 18,
    name: "昴日鸡",
    yao: "日",
    qinXing: "昴日鸡",
    direction: "西",
    animal: "鸡",
    duShu: "11度",
    jiXiong: "凶",
    yi: "出殡",
    ji: "忌嫁娶、开业、出行",
    meaning:
      "昴为旄头，日鸡司晨争斗。昴宿值日多主刑狱争斗之事，宜静守不宜妄动，出殡可化凶。",
  },
  {
    index: 19,
    name: "毕月乌",
    yao: "月",
    qinXing: "毕月乌",
    direction: "西",
    animal: "乌",
    duShu: "17度",
    jiXiong: "吉",
    yi: "嫁娶、修造、祭祀",
    ji: "忌安葬",
    meaning:
      "毕为猎网，月乌主兵戈武备。毕宿值日宜狩猎习武、修造营建，祭祀得福，不利安葬。",
  },
  {
    index: 20,
    name: "觜火猴",
    yao: "火",
    qinXing: "觜火猴",
    direction: "西",
    animal: "猴",
    duShu: "1度",
    jiXiong: "凶",
    yi: "出殡",
    ji: "忌嫁娶、开业、出行",
    meaning:
      "觜为虎口，火猴性躁不安。觜宿值日多主口舌破耗，宜静不宜动，出殡送葬可免灾。",
  },
  {
    index: 21,
    name: "参水猿",
    yao: "水",
    qinXing: "参水猿",
    direction: "西",
    animal: "猿",
    duShu: "10度",
    jiXiong: "吉",
    yi: "嫁娶、修造、出行",
    ji: "忌安葬",
    meaning:
      "参为白虎前身，水猿主聪明智慧。参宿值日宜求学技艺、婚嫁出行，灵动通达之象。",
  },
  // ── 北方玄武七宿 ──
  {
    index: 22,
    name: "斗木獬",
    yao: "木",
    qinXing: "斗木獬",
    direction: "北",
    animal: "獬",
    duShu: "22度",
    jiXiong: "吉",
    yi: "嫁娶、开业、出行、修造",
    ji: "忌安葬",
    meaning:
      "斗为北斗权衡，木獬能辨是非曲直。斗宿值日公平正义，诉讼得直，仕途升迁，百事可行。",
  },
  {
    index: 23,
    name: "牛金牛",
    yao: "金",
    qinXing: "牛金牛",
    direction: "北",
    animal: "牛",
    duShu: "7度",
    jiXiong: "凶",
    yi: "出殡",
    ji: "忌嫁娶、开业、上任、出行",
    meaning:
      "牛为牵牛星，金牛主固执迟滞。牛宿值日多阻碍难行，宜守不宜进，出殡可化凶为安。",
  },
  {
    index: 24,
    name: "女土蝠",
    yao: "土",
    qinXing: "女土蝠",
    direction: "北",
    animal: "蝠",
    duShu: "11度",
    jiXiong: "凶",
    yi: "出殡",
    ji: "忌嫁娶、开业、出行、上任",
    meaning:
      "女为须女侍奉，土蝠主阴晦不祥。女宿值日阴暗不吉，百事不宜，唯出殡可免灾祸。",
  },
  {
    index: 25,
    name: "虚日鼠",
    yao: "日",
    qinXing: "虚日鼠",
    direction: "北",
    animal: "鼠",
    duShu: "10度",
    jiXiong: "凶",
    yi: "出殡、祈福",
    ji: "忌嫁娶、开业、出行",
    meaning:
      "虚为虚耗空虚，日鼠主损耗散财。虚宿值日损耗空虚，宜祭祀祈福不宜兴举大事。",
  },
  {
    index: 26,
    name: "危月燕",
    yao: "月",
    qinXing: "危月燕",
    direction: "北",
    animal: "燕",
    duShu: "15度",
    jiXiong: "凶",
    yi: "出殡",
    ji: "忌嫁娶、开业、上任、出行",
    meaning:
      "危为危楼高悬，月燕主不安动荡。危宿值日危险不安，宜静守不出，出殡可避险厄。",
  },
  {
    index: 27,
    name: "室火猪",
    yao: "火",
    qinXing: "室火猪",
    direction: "北",
    animal: "猪",
    duShu: "17度",
    jiXiong: "吉",
    yi: "嫁娶、修造、搬迁、出行",
    ji: "忌安葬",
    meaning:
      "室为营室宫寝，火猪主家宅兴隆。室宿值日宜修造房屋、婚嫁搬迁，家业昌盛兴旺。",
  },
  {
    index: 28,
    name: "壁水貐",
    yao: "水",
    qinXing: "壁水貐",
    direction: "北",
    animal: "貐",
    duShu: "9度",
    jiXiong: "吉",
    yi: "嫁娶、开业、修造、出行",
    ji: "忌安葬",
    meaning:
      "壁为东壁图书，水貐主文教礼乐。壁宿值日宜读书求学、修造藏书，文明昌盛之象。",
  },
];

/** 二十八禽星序列（用于演禽推时禽） */
const XIU_QIN = ALL_XIU.map((x) => x.qinXing);

/**
 * 计算日干支
 * 基于儒略日推算，基准：2000-01-01 = JD 2451545
 */
function calcDayGanZhi(date: Date): string {
  const jd = Math.floor((date.getTime() - new Date("2000-01-01").getTime()) / 86400000) + 2451545;
  const gzIdx = ((jd + 49) % 60 + 60) % 60;
  return GAN[gzIdx % 10] + ZHI[gzIdx % 12];
}

/**
 * 二十八宿值日 + 禽星演禽
 *
 * 输入 date（日期）或 xiuNumber（宿序号）指定查询目标，
 * 返回当日值宿、日干支、禽星值日、演禽关系、28宿速查表及综合解读。
 */
export function calculateErShiBaXiu(input: Record<string, unknown>): ErShiBaXiuResult {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { date, xiuNumber, year: _year } = input as unknown as ErShiBaXiuInput;

  // ── 确定值日宿 ──
  let xiu: XiuEntry;
  if (typeof xiuNumber === "number" && xiuNumber >= 1 && xiuNumber <= 28) {
    xiu = ALL_XIU[xiuNumber - 1];
  } else if (date) {
    // 二十八宿周日循环：从基准日期推算偏移天数
    const d = new Date(date);
    const base = new Date("2024-01-01"); // 2024-01-01 = 角宿值日
    const diffDays = Math.floor((d.getTime() - base.getTime()) / 86400000);
    const xiuIdx = ((diffDays % 28) + 28) % 28;
    xiu = ALL_XIU[xiuIdx];
  } else {
    // 今日
    const today = new Date();
    const base = new Date("2024-01-01");
    const diffDays = Math.floor((today.getTime() - base.getTime()) / 86400000);
    xiu = ALL_XIU[((diffDays % 28) + 28) % 28];
  }

  // ── 日干支 ──
  const targetDate = date ? new Date(date) : new Date();
  const ganZhi = calcDayGanZhi(targetDate);

  // ── 禽星演禽 ──
  const riQin = xiu.qinXing;
  const shiQinIdx = (XIU_QIN.indexOf(riQin) + 4) % 28;
  const shiQin = XIU_QIN[shiQinIdx];

  const yanQin = {
    riQin,
    shiQin,
    relation: riQin === shiQin ? "比和" : "相生",
  };

  // ── 综合解读 ──
  const analysis = [
    `${date || "今日"}（${ganZhi}日），值日星宿：${xiu.name}。`,
    `禽星${riQin}值日。`,
    xiu.jiXiong === "吉"
      ? `此日宜${xiu.yi}等事宜。`
      : `此日宜慎行，${xiu.ji}。`,
    xiu.meaning,
  ].join("");

  // 按方位分组
  const dirGroups: Record<string, XiuEntry[]> = {};
  for (const x of ALL_XIU) {
    if (!dirGroups[x.direction]) dirGroups[x.direction] = [];
    dirGroups[x.direction].push(x);
  }
  const dirNames: Record<string, string> = { "东": "东方苍龙", "南": "南方朱雀", "西": "西方白虎", "北": "北方玄武" };

  // 构建 box-drawing 摘要
  const lines: string[] = [
    `┌─ 二十八宿值日 ─────────────────`,
    `│ 日期：${date || targetDate.toISOString().split("T")[0]} 干支：${ganZhi}`,
    `│ 值日星宿：${xiu.name}（${xiu.jiXiong}） 七曜：${xiu.yao} 方位：${xiu.direction}`,
    `│ 禽星：${riQin}值日 时禽：${shiQin}（${riQin === shiQin ? "比和" : "相生"}）`,
    `│`,
    `├─ 当值宜忌 ──────────────────`,
    `│ 宜：${xiu.yi}`,
    `│ 忌：${xiu.ji}`,
    `│ ${xiu.meaning}`,
    `│`,
    `├─ 二十八宿总览 ────────────────`,
  ];

  for (const [dir, xius] of Object.entries(dirGroups)) {
    lines.push(`│ ▸ ${dirNames[dir] || dir}七宿（${dir}）`);
    for (const x of xius) {
      const mark = x.name === xiu.name ? " ← 当值" : "";
      lines.push(`│   ${String(x.index).padStart(2, " ")}. ${x.name.padEnd(6, " ")} ${x.yao} ${x.jiXiong.padEnd(2, " ")} ${x.duShu.padEnd(5, " ")}${mark}`);
    }
  }

  lines.push(`│`);
  lines.push(`├─ 古籍出处 ──────────────────`);
  lines.push(`│ 《果老星宗》—— 唐·张果，二十八宿与星命之学的奠基`);
  lines.push(`│ 《星学大成》—— 明·万民英，集二十八宿星学之大成`);
  lines.push(`│ 《史记·天官书》—— 西汉·司马迁，最早系统记载二十八宿`);
  lines.push(`│ 《淮南子·天文训》—— 「星分度：角十二，亢九…」，二十八宿古度`);
  lines.push(`│ 二十八宿为华夏最古天文坐标体系，远在殷商已见雏形。`);
  lines.push(`│`);
  lines.push(`└─ 择日提示 ──────────────────`);
  lines.push(`   二十八宿值日以28天为周期循环，角宿为起算基准。`);
  lines.push(`   吉宿值日适嫁娶/开业/出行，凶宿值日宜静不宜动。`);
  lines.push(`   禽星演禽可推日禽/时禽/月禽/年禽，与七政四余合参更妙。`);
  const summary = lines.join("\n");

  return {
    currentXiu: xiu,
    date: date || targetDate.toISOString().split("T")[0],
    ganZhi,
    qinXingZhiRi: riQin,
    yanQin,
    fullTable: ALL_XIU.map((x) => ({
      index: x.index,
      name: x.name,
      yao: x.yao,
      qinXing: x.qinXing,
      direction: x.direction,
      jiXiong: x.jiXiong,
    })),
    analysis,
    summary,
  } as ErShiBaXiuResult & { summary: string };
}
