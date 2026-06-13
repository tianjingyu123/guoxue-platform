// ── 生肖运势计算引擎 ──
// 基于太岁关系、日支生克、月令旺衰、神煞辅佐的综合运势分析
// 理论来源：《协纪辨方书》《渊海子平》地支刑冲合害体系

import type { ShengXiaoYunshiResult, ShengXiao, YunshiScores } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const XIAO_LIST: ShengXiao[] = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

// 生肖五行
const XIAO_WUXING: Record<ShengXiao, string> = {
  "鼠": "水", "牛": "土", "虎": "木", "兔": "木",
  "龙": "土", "蛇": "火", "马": "火", "羊": "土",
  "猴": "金", "鸡": "金", "狗": "土", "猪": "水",
};

// 纳音五行（六十甲子纳音，按地支索引）
const NA_YIN: Record<string, string> = {
  "子": "海中金", "丑": "海中金",
  "寅": "炉中火", "卯": "炉中火",
  "辰": "大林木", "巳": "大林木",
  "午": "路旁土", "未": "路旁土",
  "申": "剑锋金", "酉": "剑锋金",
  "戌": "山头火", "亥": "山头火",
};

// 地支关系 — 六合
const LIU_HE: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3,
  4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};
// 三合局
const SAN_HE: Record<number, number[]> = {
  0: [4, 8], 1: [5, 9], 2: [6, 10], 3: [7, 11],
  4: [0, 8], 5: [1, 9], 6: [2, 10], 7: [3, 11],
  8: [0, 4], 9: [1, 5], 10: [2, 6], 11: [3, 7],
};
// 冲
const CHONG: Record<number, number> = {
  0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11,
  6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5,
};
// 害
const HAI: Record<number, number> = {
  0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2,
  3: 4, 4: 3, 10: 9, 9: 10, 8: 11, 11: 8,
};
// 刑
const XING: Record<number, number[]> = {
  0: [3], 1: [10, 7], 2: [5, 8], 3: [0], 4: [4],
  5: [2, 8], 6: [6], 7: [1], 8: [2, 5], 9: [9], 10: [1], 11: [11],
};
// 破
const PO: Record<number, number> = {
  0: 9, 9: 0, 1: 4, 4: 1, 2: 11, 11: 2,
  3: 6, 6: 3, 5: 8, 8: 5, 7: 10, 10: 7,
};
// 三合局名称
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SAN_HE_NAMES: Record<string, string> = {
  "0-4-8": "申子辰水局", "1-5-9": "巳酉丑金局",
  "2-6-10": "寅午戌火局", "3-7-11": "亥卯未木局",
};

// 天乙贵人（日干对应贵人地支）
// 《渊海子平》：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢虎马
const TIAN_YI_GUI_REN: Record<string, number[]> = {
  "甲": [1, 7], "戊": [1, 7], "庚": [1, 7],
  "乙": [0, 8], "己": [0, 8],
  "丙": [11, 9], "丁": [11, 9],
  "壬": [3, 5], "癸": [3, 5],
  "辛": [2, 6],
};

// 桃花（子午卯酉）
const TAO_HUA_MAP: Record<number, number> = {
  0: 3, 1: 6, 2: 6, 3: 0, 4: 9, 5: 9,
  6: 3, 7: 0, 8: 9, 9: 6, 10: 3, 11: 0,
};

// 五行配颜色
const WUXING_COLORS: Record<string, string[]> = {
  "金": ["白色", "银色", "金色"],
  "木": ["绿色", "青色", "翠色"],
  "水": ["黑色", "蓝色", "深蓝"],
  "火": ["红色", "紫色", "粉色"],
  "土": ["黄色", "棕色", "米色"],
};
// 五行方位
const WUXING_DIR: Record<string, string> = {
  "金": "正西", "木": "正东", "水": "正北", "火": "正南", "土": "中央",
};
// 五行相生
const WUXING_SHENG: Record<string, string> = {
  "木": "水", "火": "木", "土": "火", "金": "土", "水": "金",
};
// 五行相克
const WUXING_KE: Record<string, string> = {
  "木": "金", "火": "水", "土": "木", "金": "火", "水": "土",
};

// 建除十二神（基于月支+日支）
// 简化版：正月寅为建，二月卯为建... 从月建顺数到日支
const JIAN_CHU: Record<number, string[]> = {
  0: ["开", "闭", "建", "除", "满", "平", "定", "执", "破", "危", "成", "收"],
  1: ["闭", "建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开"],
  2: ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"],
  3: ["除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭", "建"],
  4: ["满", "平", "定", "执", "破", "危", "成", "收", "开", "闭", "建", "除"],
  5: ["平", "定", "执", "破", "危", "成", "收", "开", "闭", "建", "除", "满"],
  6: ["定", "执", "破", "危", "成", "收", "开", "闭", "建", "除", "满", "平"],
  7: ["执", "破", "危", "成", "收", "开", "闭", "建", "除", "满", "平", "定"],
  8: ["破", "危", "成", "收", "开", "闭", "建", "除", "满", "平", "定", "执"],
  9: ["危", "成", "收", "开", "闭", "建", "除", "满", "平", "定", "执", "破"],
  10: ["成", "收", "开", "闭", "建", "除", "满", "平", "定", "执", "破", "危"],
  11: ["收", "开", "闭", "建", "除", "满", "平", "定", "执", "破", "危", "成"],
};

// 建除十二神的宜忌指引
const JIAN_CHU_YIJI: Record<string, { yi: string[]; ji: string[] }> = {
  "建": { yi: ["出行", "谒贵", "上书"], ji: ["动土", "开仓"] },
  "除": { yi: ["除旧布新", "治病", "扫除"], ji: ["求官", "上任"] },
  "满": { yi: ["祈福", "开市", "纳财"], ji: ["下葬", "求医"] },
  "平": { yi: ["修饰垣墙", "平治道涂"], ji: ["开河", "穿井"] },
  "定": { yi: ["签约", "订婚", "纳采"], ji: ["诉讼", "出行"] },
  "执": { yi: ["捕猎", "捉贼"], ji: ["搬家", "远行"] },
  "破": { yi: ["求医", "破屋坏垣"], ji: ["开市", "嫁娶", "入宅"] },
  "危": { yi: ["安床", "祭祀"], ji: ["嫁娶", "开市", "交易"] },
  "成": { yi: ["嫁娶", "开市", "签约", "入学", "出行"], ji: ["诉讼"] },
  "收": { yi: ["纳财", "收债", "种植"], ji: ["丧葬", "治病"] },
  "开": { yi: ["开市", "嫁娶", "出行", "求财", "入学"], ji: ["安葬"] },
  "闭": { yi: ["祭祀", "安门", "修造"], ji: ["开市", "出行", "交易"] },
};

function getShengXiaoFromYear(year: number): ShengXiao {
  return XIAO_LIST[(year - 4) % 12];
}

// 获取太岁关系
function getTaiSuiRelation(xiaoIdx: number, yearIdx: number): {
  name: string; baseScore: number; desc: string;
} {
  if (xiaoIdx === yearIdx) return { name: "值太岁", baseScore: 50, desc: "与太岁相同，宜守不宜攻，凡事谨慎为上，宜行善积德化解" };
  if (CHONG[xiaoIdx] === yearIdx) return { name: "冲太岁", baseScore: 35, desc: "与太岁相冲，变动较大，宜动不宜静，主动求变化解冲力" };
  if (HAI[xiaoIdx] === yearIdx) return { name: "害太岁", baseScore: 45, desc: "与太岁相害，易犯小人、口舌是非，人际关系需格外注意" };
  if (XING[xiaoIdx]?.includes(yearIdx)) return { name: "刑太岁", baseScore: 42, desc: "与太岁相刑，易有是非官非，谨言慎行、遵纪守法" };
  if (PO[xiaoIdx] === yearIdx) return { name: "破太岁", baseScore: 48, desc: "与太岁相破，暗中破坏力量，注意合作、投资中的隐忧" };
  if (LIU_HE[xiaoIdx] === yearIdx) return { name: "六合太岁", baseScore: 90, desc: "与太岁六合，大吉大利，贵人相助，适宜推进重大事项" };
  if (SAN_HE[xiaoIdx]?.includes(yearIdx)) return { name: "三合太岁", baseScore: 85, desc: "与太岁三合，顺风顺水，得道多助，团结合作大有收获" };
  return { name: "无犯太岁", baseScore: 72, desc: "与太岁和平相处，平稳发展，按部就班推进计划" };
}

// 获取日支与生肖的关系
function getDayRelation(xiaoIdx: number, dayIdx: number): {
  name: string; adj: number; desc: string;
} {
  if (LIU_HE[xiaoIdx] === dayIdx) return { name: "六合日", adj: 12, desc: "今日与生肖六合，人缘极佳，合作顺利" };
  if (SAN_HE[xiaoIdx]?.includes(dayIdx)) return { name: "三合日", adj: 8, desc: "今日与生肖三合，团队协作得当，事半功倍" };
  if (CHONG[xiaoIdx] === dayIdx) return { name: "冲克日", adj: -12, desc: "今日与生肖相冲，诸事不宜，避免重要决策" };
  if (HAI[xiaoIdx] === dayIdx) return { name: "相害日", adj: -6, desc: "今日与生肖相害，注意人际关系中的摩擦" };
  if (XING[xiaoIdx]?.includes(dayIdx)) return { name: "相刑日", adj: -5, desc: "今日与生肖相刑，注意口舌和法律问题" };
  if (PO[xiaoIdx] === dayIdx) return { name: "相破日", adj: -3, desc: "今日与生肖相破，注意细节问题和小人" };
  // 无特殊关系，根据生克判断
  const wx = XIAO_WUXING[XIAO_LIST[xiaoIdx]];
  const dwx = XIAO_WUXING[XIAO_LIST[dayIdx]];
  if (WUXING_SHENG[dwx] === wx) return { name: "生旺日", adj: 5, desc: "日支生助生肖五行，精力充沛，事半功倍" };
  if (WUXING_KE[dwx] === wx) return { name: "受克日", adj: -4, desc: "日支克制生肖五行，略有阻力，需多花心力" };
  if (wx === WUXING_SHENG[dwx]) return { name: "泄气日", adj: 0, desc: "生肖五行生助日支，付出较多，宜助人为乐" };
  if (wx === WUXING_KE[dwx]) return { name: "制胜日", adj: 3, desc: "生肖五行克制日支，信心充足，掌握主动权" };
  if (wx === dwx) return { name: "比和日", adj: 5, desc: "五行相同，相互扶助，一切平稳顺利" };
  return { name: "平和日", adj: 0, desc: "无特殊生克关系，平常度日即可" };
}

// 获取月支与生肖的关系
function getMonthRelation(xiaoIdx: number, monthIdx: number): { adj: number; desc: string } {
  if (LIU_HE[xiaoIdx] === monthIdx) return { adj: 6, desc: "月令六合生肖，当月运势加持" };
  if (SAN_HE[xiaoIdx]?.includes(monthIdx)) return { adj: 4, desc: "月令三合生肖，当月团队力量增强" };
  if (CHONG[xiaoIdx] === monthIdx) return { adj: -6, desc: "月令冲克生肖，当月多变动" };
  if (HAI[xiaoIdx] === monthIdx) return { adj: -3, desc: "月令相害生肖，当月注意人际" };
  const wx = XIAO_WUXING[XIAO_LIST[xiaoIdx]];
  const mwx = XIAO_WUXING[XIAO_LIST[monthIdx]];
  if (WUXING_SHENG[mwx] === wx) return { adj: 3, desc: "月令生助，当月运势向上" };
  if (WUXING_KE[mwx] === wx) return { adj: -2, desc: "月令克制，当月略有阻力" };
  return { adj: 0, desc: "月令平和" };
}

// 检查天乙贵人
function checkTianYi(dayGan: string, xiaoIdx: number): boolean {
  const guiRen = TIAN_YI_GUI_REN[dayGan];
  return guiRen ? guiRen.includes(xiaoIdx) : false;
}

// 检查桃花
function checkTaoHua(xiaoIdx: number, dayIdx: number): boolean {
  return TAO_HUA_MAP[xiaoIdx] === dayIdx;
}

// 建除十二神对应的通用宜忌（合并生肖特定建议）
function getYiJi(jianChu: string, taiSui: string, total: number): { yi: string[]; ji: string[] } {
  const base = JIAN_CHU_YIJI[jianChu] || JIAN_CHU_YIJI["平"];

  const yi = [...base.yi];
  const ji = [...base.ji];

  // 根据太岁关系追加宜忌
  if (taiSui.includes("冲")) {
    yi.push("主动求变", "出差旅行");
    ji.push("原地不动", "墨守成规");
  } else if (taiSui.includes("刑")) {
    yi.push("低调行事", "修身养性");
    ji.push("投资签约", "诉讼争辩");
  } else if (taiSui.includes("害")) {
    yi.push("独处学习", "沟通亲友");
    ji.push("借贷担保", "合作新项目");
  } else if (taiSui.includes("破")) {
    yi.push("检查合同", "稳健理财");
    ji.push("大额投资", "冒险行动");
  } else if (taiSui.includes("值")) {
    yi.push("行善积德", "祈福祭祀");
    ji.push("重大决策", "新项目启动");
  }

  // 根据总分调整数量
  const yiCount = total >= 80 ? 5 : total >= 65 ? 4 : total >= 50 ? 3 : 2;
  const jiCount = total >= 80 ? 2 : total >= 65 ? 3 : total >= 50 ? 3 : 4;

  return {
    yi: yi.slice(0, yiCount),
    ji: ji.slice(0, jiCount),
  };
}

export function calculateShengXiaoYunshi(input: Record<string, unknown>): ShengXiaoYunshiResult {
  let shengXiao: ShengXiao;
  const birthYear = input.birthYear as number | undefined;
  if (input.shengXiao) {
    shengXiao = input.shengXiao as ShengXiao;
  } else if (birthYear) {
    shengXiao = getShengXiaoFromYear(birthYear);
  } else {
    shengXiao = "龙";
  }

  const dateStr = (input.date as string) || new Date().toISOString().split("T")[0];
  const [y, m] = dateStr.split("-").map(Number);
  const solar = Solar.fromYmd(y, m, parseInt(dateStr.split("-")[2]));
  const lunar = solar.getLunar();

  const yearZhi = lunar.getYearZhi();
  const yearIdx = ZHI_LIST.indexOf(yearZhi);
  const xiaoIdx = XIAO_LIST.indexOf(shengXiao);
  const dayZhi = lunar.getDayZhi();
  const dayIdx = ZHI_LIST.indexOf(dayZhi);
  const monthZhi = lunar.getMonthZhi();
  const monthIdx = ZHI_LIST.indexOf(monthZhi);
  const dayGan = lunar.getDayGan();

  // 1. 太岁关系（权重0.4）
  const taiSui = getTaiSuiRelation(xiaoIdx, yearIdx);

  // 2. 日支关系（权重0.3）
  const dayRel = getDayRelation(xiaoIdx, dayIdx);

  // 3. 月令关系（权重0.15）
  const monthRel = getMonthRelation(xiaoIdx, monthIdx);

  // 4. 神煞加持（权重0.15）
  let shenShaBonus = 0;
  const shenShaDetails: string[] = [];
  if (checkTianYi(dayGan, xiaoIdx)) {
    shenShaBonus += 8;
    shenShaDetails.push("天乙贵人照临，逢凶化吉");
  }
  if (checkTaoHua(xiaoIdx, dayIdx)) {
    shenShaBonus += 3;
    shenShaDetails.push("桃花入命，人缘感情运佳");
  }

  // 综合计算（加权）
  const totalBase =
    taiSui.baseScore * 0.45 +
    (50 + dayRel.adj) * 0.30 +
    (50 + monthRel.adj) * 0.15 +
    (50 + shenShaBonus) * 0.10;

  const total = Math.min(98, Math.max(15, Math.round(totalBase)));

  // 分类评分（基于地支关系的维度变化）
  // 事业：延年/官星方向 — 日支与生肖的生克、三合
  const careerAdj = dayRel.adj + (SAN_HE[xiaoIdx]?.includes(dayIdx) ? 5 : 0);
  // 财运：财富方向 — 日支生助、三合
  const wealthAdj = (WUXING_SHENG[XIAO_WUXING[XIAO_LIST[dayIdx]]] === XIAO_WUXING[shengXiao] ? 5 : 0)
    + (LIU_HE[xiaoIdx] === dayIdx ? 5 : 0);
  // 感情：六合/桃花
  const loveAdj = (LIU_HE[xiaoIdx] === dayIdx ? 10 : 0)
    + (checkTaoHua(xiaoIdx, dayIdx) ? 5 : 0)
    + (CHONG[xiaoIdx] === dayIdx ? -8 : 0);
  // 健康：五行平衡
  const healthAdj = (CHONG[xiaoIdx] === dayIdx ? -10 : 0)
    + (HAI[xiaoIdx] === dayIdx ? -5 : 0)
    + (WUXING_SHENG[XIAO_WUXING[XIAO_LIST[dayIdx]]] === XIAO_WUXING[shengXiao] ? 4 : 0);

  const scores: YunshiScores = {
    total,
    career: Math.min(98, Math.max(15, total + careerAdj)),
    wealth: Math.min(98, Math.max(15, total + wealthAdj)),
    love: Math.min(98, Math.max(15, total + loveAdj)),
    health: Math.min(98, Math.max(15, total + healthAdj)),
  };

  // 五行配幸运色、幸运数
  const wx = XIAO_WUXING[shengXiao];
  const shengWx = WUXING_SHENG[wx]; // 生我之五行
  // 幸运色：用生我之五行（如木生火，火命用绿色）
  const luckyColors = WUXING_COLORS[shengWx] || WUXING_COLORS[wx];
  // 幸运数字基于五行: 水1/6 火2/7 木3/8 金4/9 土5/0
  const wxNumbers: Record<string, number[]> = {
    "水": [1, 6], "火": [2, 7], "木": [3, 8], "金": [4, 9], "土": [5, 0],
  };
  const luckyNumbers = wxNumbers[shengWx] || wxNumbers[wx];
  const luckyColor = luckyColors[0]; // 取第一个
  const luckyNumber = luckyNumbers[Math.abs(dayIdx) % 2]; // 基于日支的确定性选择
  const luckyDirection = WUXING_DIR[shengWx] || WUXING_DIR[wx];
  const partnerIdx = LIU_HE[xiaoIdx] ?? ((xiaoIdx + 4) % 12);
  const luckyPartner = XIAO_LIST[partnerIdx];

  // 建除十二神 → 宜忌
  const jianChuName = JIAN_CHU[monthIdx]?.[dayIdx] ?? "平";
  const yiJi = getYiJi(jianChuName, taiSui.name, total);

  // 综合断语
  const naYin = NA_YIN[yearZhi] || "未知";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const shenShaStr = shenShaDetails.length > 0 ? shenShaDetails.join("，") + "。" : "";
  const scoreLabel = total >= 80 ? "大吉" : total >= 65 ? "较佳" : total >= 50 ? "平稳" : total >= 35 ? "偏弱" : "低迷";
  // 构建 box-drawing 摘要
  const scoreBar = "█".repeat(Math.round(total / 10)) + "░".repeat(10 - Math.round(total / 10));
  const summary = [
    `┌─ 生肖运势 ─────────────────`,
    `│ ${dateStr} ${shengXiao}（${wx}命·${naYin}纳音）`,
    `│ 综合评分：${total}分 ${scoreLabel} [${scoreBar}]`,
    ``,
    `├─ 评分明细 ──────────────────`,
    `│ 太岁关系：${taiSui.name}（${taiSui.desc}）`,
    `│ 日支关系：${dayRel.name}（${dayRel.desc}）`,
    `│ 建除：${jianChuName}日`,
    ...(shenShaDetails.length > 0 ? [`│ 神煞：${shenShaDetails.join("、")}`] : []),
    `│ 事业：${scores.career}分 财运：${scores.wealth}分 感情：${scores.love}分 健康：${scores.health}分`,
    ``,
    `├─ 宜忌 ────────────────────`,
    `│ 宜：${yiJi.yi.join("、") || "无特别建议"}`,
    `│ 忌：${yiJi.ji.join("、") || "无特别禁忌"}`,
    ``,
    `├─ 幸运指南 ──────────────────`,
    `│ 幸运色：${luckyColor}  幸运数：${luckyNumber}  贵人方：${luckyDirection}`,
    `│ 良缘生肖：${luckyPartner}`,
    ``,
    `├─ 古籍出处 ──────────────────`,
    `│ 《协纪辨方书》—— 清·允禄等，建除/神煞择日之权威`,
    `│ 《渊海子平》—— 地支刑冲合害体系之源头`,
    `│ 太岁为一年之主宰，生肖与太岁关系影响全年运势基调。`,
    ``,
    `└─ 运势提示 ──────────────────`,
    `   生肖运势为年运大趋势，具体到个人须结合八字全局。`,
    `   太岁冲犯之年，宜安奉太岁祈福。`,
    `   综合评分${total}分，${total >= 65 ? "运势向好可积极作为" : total >= 50 ? "平稳过渡为佳" : "宜保守行事待机而动"}。`,
  ].join("\n");

  return {
    input: { shengXiao, birthYear, date: dateStr },
    shengXiao,
    date: dateStr,
    yearZhi,
    taiSuiRelation: `${taiSui.name}（${taiSui.desc}）`,
    scores,
    lucky: {
      color: luckyColor,
      number: luckyNumber,
      direction: luckyDirection,
      partner: luckyPartner,
    },
    yiJi,
    summary,
  };
}
