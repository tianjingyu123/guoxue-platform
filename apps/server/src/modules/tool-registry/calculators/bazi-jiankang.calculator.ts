// ── 八字健康/疾病预测计算引擎 ──
// 算法参考：《渊海子平》《三命通会》《滴天髓》
// 基于《黄帝内经》五行脏腑对应、十干配脏腑、十二支配经络理论

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GAN: string[] = GAN_RAW as unknown as string[];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ZHI: string[] = ZHI_RAW as unknown as string[];

// ── 五行对应表 ──

const WUXING_SCORE: Record<string, number> = { "金": 0, "木": 0, "水": 0, "火": 0, "土": 0 };

const GAN_WUXING: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
  "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
};

const ZHI_WUXING: Record<string, string> = {
  "寅": "木", "卯": "木", "巳": "火", "午": "火",
  "辰": "土", "戌": "土", "丑": "土", "未": "土",
  "申": "金", "酉": "金", "亥": "水", "子": "水",
};

// 天干脏腑对应
const GAN_ZANGFU: Record<string, { organ: string; wuXing: string }[]> = {
  "甲": [{ organ: "胆", wuXing: "木" }, { organ: "头", wuXing: "木" }],
  "乙": [{ organ: "肝", wuXing: "木" }, { organ: "项", wuXing: "木" }],
  "丙": [{ organ: "小肠", wuXing: "火" }, { organ: "肩", wuXing: "火" }],
  "丁": [{ organ: "心", wuXing: "火" }, { organ: "胸", wuXing: "火" }],
  "戊": [{ organ: "胃", wuXing: "土" }, { organ: "肋", wuXing: "土" }],
  "己": [{ organ: "脾", wuXing: "土" }, { organ: "腹", wuXing: "土" }],
  "庚": [{ organ: "大肠", wuXing: "金" }, { organ: "脐", wuXing: "金" }],
  "辛": [{ organ: "肺", wuXing: "金" }, { organ: "股", wuXing: "金" }],
  "壬": [{ organ: "膀胱", wuXing: "水" }, { organ: "胫", wuXing: "水" }],
  "癸": [{ organ: "肾", wuXing: "水" }, { organ: "足", wuXing: "水" }],
};

// 地支脏腑对应
const ZHI_ZANGFU: Record<string, { organ: string; wuXing: string }[]> = {
  "子": [{ organ: "肾", wuXing: "水" }, { organ: "耳", wuXing: "水" }],
  "丑": [{ organ: "脾", wuXing: "土" }, { organ: "胞", wuXing: "土" }],
  "寅": [{ organ: "胆", wuXing: "木" }, { organ: "手", wuXing: "木" }],
  "卯": [{ organ: "肝", wuXing: "木" }, { organ: "指", wuXing: "木" }],
  "辰": [{ organ: "胃", wuXing: "土" }, { organ: "肩", wuXing: "土" }],
  "巳": [{ organ: "心", wuXing: "火" }, { organ: "面", wuXing: "火" }],
  "午": [{ organ: "小肠", wuXing: "火" }, { organ: "眼", wuXing: "火" }],
  "未": [{ organ: "脾", wuXing: "土" }, { organ: "脊", wuXing: "土" }],
  "申": [{ organ: "大肠", wuXing: "金" }, { organ: "筋", wuXing: "金" }],
  "酉": [{ organ: "肺", wuXing: "金" }, { organ: "精", wuXing: "金" }],
  "戌": [{ organ: "胃", wuXing: "土" }, { organ: "命门", wuXing: "土" }],
  "亥": [{ organ: "膀胱", wuXing: "水" }, { organ: "三焦", wuXing: "水" }],
};

// 脏腑等级评判标准
function judgeLevel(status: string): "健康" | "需注意" | "易患病" {
  if (status === "平衡") return "健康";
  if (status === "过弱" || status === "缺失") return "易患病";
  return "需注意";
}

// 易患疾病库（五行对应）
const DISEASE_LIBRARY: Record<string, { name: string; category: string; reason: string; prevention: string }[]> = {
  "木": [
    { name: "肝胆疾病", category: "消化", reason: "木主肝胆，五行失衡易伤肝气", prevention: "少饮酒，保持情绪舒畅，规律作息" },
    { name: "偏头痛", category: "神经系统", reason: "木气上逆，肝阳上亢", prevention: "避免熬夜，按摩太阳穴，饮用菊花茶" },
    { name: "筋骨酸痛", category: "运动系统", reason: "木主筋，木弱则筋失所养", prevention: "适度拉伸运动，补充钙质，艾灸阳陵泉" },
  ],
  "火": [
    { name: "心血管病", category: "循环系统", reason: "火主心脉，火旺耗伤心血", prevention: "低盐低脂饮食，有氧运动，监测血压" },
    { name: "失眠多梦", category: "神经系统", reason: "心火亢盛，扰乱心神", prevention: "睡前泡脚，按摩神门穴，饮用酸枣仁汤" },
    { name: "口腔溃疡", category: "口腔", reason: "火旺上炎，心火上冲", prevention: "多食苦瓜冬瓜，避免辛辣，含漱盐水" },
  ],
  "土": [
    { name: "脾胃虚弱", category: "消化", reason: "土主脾胃，土弱运化失常", prevention: "少食多餐，避免生冷，多食小米山药" },
    { name: "湿气重", category: "代谢", reason: "土不制水，湿邪困脾", prevention: "食薏米赤豆，艾灸足三里，适当出汗" },
    { name: "肥胖浮肿", category: "代谢", reason: "脾虚湿盛，水湿停留", prevention: "控制碳水，坚持运动，按摩丰隆穴" },
  ],
  "金": [
    { name: "呼吸道疾病", category: "呼吸系统", reason: "金主肺，金弱卫外不固", prevention: "晨起深呼吸，多吃百合银耳，避风寒" },
    { name: "皮肤过敏", category: "皮肤", reason: "肺主皮毛，肺气不宣", prevention: "保持皮肤清洁，补充维生素C，避免过敏原" },
    { name: "便秘", category: "消化", reason: "金主大肠，肺与大肠相表里", prevention: "多吃粗纤维，清晨喝温水，按摩天枢穴" },
  ],
  "水": [
    { name: "肾虚腰酸", category: "泌尿", reason: "水主肾，水亏则腰膝酸软", prevention: "节制房事，按摩肾俞穴，食黑豆核桃" },
    { name: "泌尿感染", category: "泌尿", reason: "膀胱湿热，水道不通", prevention: "多饮水不憋尿，注意卫生，食车前草" },
    { name: "耳鸣脱发", category: "感官", reason: "肾开窍于耳，其华在发", prevention: "黑芝麻黑豆养生，避免噪音，按摩听宫穴" },
  ],
};

// 养生建议库
const HEALTH_ADVICE: Record<string, { aspect: string; advice: string; foods: string[]; avoid: string[] }> = {
  "木": { aspect: "肝胆养护", advice: "春季养肝正当时，保持情绪舒畅，适当运动疏肝气", foods: ["芹菜", "枸杞", "山楂", "菊花茶", "绿豆"], avoid: ["酒精", "油炸", "辛辣"] },
  "火": { aspect: "心脉调和", advice: "夏季养心，清心火安心神，避免精神紧张", foods: ["莲子", "百合", "苦瓜", "红枣", "桂圆"], avoid: ["浓茶", "咖啡", "辣椒"] },
  "土": { aspect: "脾胃调理", advice: "长夏健脾祛湿，饮食规律，少食多餐", foods: ["山药", "薏米", "小米", "红枣", "茯苓"], avoid: ["生冷", "甜腻", "暴饮暴食"] },
  "金": { aspect: "肺气宣发", advice: "秋季润肺养阴，深呼吸吐纳，防燥邪伤肺", foods: ["银耳", "百合", "梨", "蜂蜜", "白萝卜"], avoid: ["辛辣", "干燥食物", "吸烟"] },
  "水": { aspect: "肾精固养", advice: "冬季藏精养肾，早睡晚起，避免过劳", foods: ["黑豆", "黑芝麻", "核桃", "山药", "羊肉"], avoid: ["过咸", "熬夜", "过度劳累"] },
};

// ── 本地类型 ──

interface WuXingHealthItem {
  wuXing: string;
  status: "过旺" | "过弱" | "平衡" | "缺失";
  score: number;
  desc: string;
}

interface ZangFuItem {
  organ: string;
  wuXing: string;
  level: "健康" | "需注意" | "易患病";
  detail: string;
}

interface YiHuanItem {
  name: string;
  category: string;
  probability: "高" | "中" | "低";
  reason: string;
  prevention: string;
}

interface YangShengItem {
  aspect: string;
  advice: string;
  foods: string[];
  avoid: string[];
}

interface BaziJianKangResult {
  summary: string;
  wuXingHealth: WuXingHealthItem[];
  zangFuAnalysis: ZangFuItem[];
  yiHuanList: YiHuanItem[];
  yangShengAdvice: YangShengItem[];
}

// ── 辅助函数 ──

function countWuXing(pillars: string[]): Record<string, number> {
  const counts = { ...WUXING_SCORE };
  for (const p of pillars) {
    if (p.length >= 2) {
      const ganWx = GAN_WUXING[p[0]] || "";
      const zhiWx = ZHI_WUXING[p[1]] || "";
      if (ganWx) counts[ganWx] = (counts[ganWx] || 0) + 2;
      if (zhiWx) counts[zhiWx] = (counts[zhiWx] || 0) + 1;
    }
  }
  return counts;
}

function judgeWuXingStatus(score: number, maxScore: number): WuXingHealthItem["status"] {
  if (score === 0) return "缺失";
  if (score > maxScore * 0.6) return "过旺";
  if (score < maxScore * 0.2) return "过弱";
  return "平衡";
}

// ── 主计算函数 ──

export function calculateBaziJianKang(input: Record<string, unknown>): BaziJianKangResult {
  const yearPillar = (input.yearPillar as string) || "甲子";
  const monthPillar = (input.monthPillar as string) || "甲子";
  const dayPillar = (input.dayPillar as string) || "甲子";
  const hourPillar = (input.hourPillar as string) || "甲子";
  const gender = (input.gender as string) || "男";

  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

  // 1. 五行力量统计
  const wxCounts = countWuXing(pillars);
  const maxScore = Math.max(...Object.values(wxCounts), 1);

  const wuXingHealth: WuXingHealthItem[] = ["金", "木", "水", "火", "土"].map(wx => {
    const score = wxCounts[wx] || 0;
    const status = judgeWuXingStatus(score, maxScore);
    const descMap: Record<string, string> = {
      "过旺": `${wx}气过旺，需用克泄之法平衡`,
      "过弱": `${wx}气偏弱，宜补${wx}之生气`,
      "平衡": `${wx}气中和，脏腑功能协调`,
      "缺失": `${wx}气缺失，亟需培补${wx}之气`,
    };
    return { wuXing: wx, status, score, desc: descMap[status] };
  });

  // 2. 脏腑分析（从天干地支提取涉及的脏腑）
  const zangFuMap = new Map<string, ZangFuItem>();
  const seenOrgans = new Set<string>();

  for (const p of pillars) {
    if (p.length >= 2) {
      const gan = p[0];
      const zhi = p[1];

      for (const zf of GAN_ZANGFU[gan] || []) {
        const wxStatus = wuXingHealth.find(w => w.wuXing === zf.wuXing);
        const level = judgeLevel(wxStatus?.status || "平衡");
        if (!seenOrgans.has(zf.organ)) {
          seenOrgans.add(zf.organ);
          zangFuMap.set(zf.organ, { organ: zf.organ, wuXing: zf.wuXing, level, detail: `天干${gan}配${zf.organ}，${level === "健康" ? "功能正常" : level === "需注意" ? "宜多加调理" : "需重点防护"}` });
        }
      }

      for (const zf of ZHI_ZANGFU[zhi] || []) {
        const wxStatus = wuXingHealth.find(w => w.wuXing === zf.wuXing);
        const level = judgeLevel(wxStatus?.status || "平衡");
        if (!seenOrgans.has(zf.organ)) {
          seenOrgans.add(zf.organ);
          zangFuMap.set(zf.organ, { organ: zf.organ, wuXing: zf.wuXing, level, detail: `地支${zhi}配${zf.organ}，${level === "健康" ? "功能正常" : level === "需注意" ? "宜多加调理" : "需重点防护"}` });
        }
      }
    }
  }

  const zangFuAnalysis = Array.from(zangFuMap.values());

  // 3. 易患疾病分析
  const yiHuanList: YiHuanItem[] = [];
  for (const wx of wuXingHealth) {
    if (wx.status === "过旺" || wx.status === "过弱" || wx.status === "缺失") {
      const probability = wx.status === "缺失" ? "高" : wx.status === "过旺" ? "高" : "中";
      const diseases = DISEASE_LIBRARY[wx.wuXing] || [];
      for (const d of diseases) {
        yiHuanList.push({ ...d, probability });
      }
    }
  }

  // 4. 养生建议
  const yangShengAdvice: YangShengItem[] = [];
  for (const wx of wuXingHealth) {
    if (wx.status === "过旺" || wx.status === "过弱" || wx.status === "缺失") {
      const advice = HEALTH_ADVICE[wx.wuXing];
      if (advice) yangShengAdvice.push(advice);
    }
  }
  // 即使五行平衡也添加通用建议
  if (yangShengAdvice.length === 0) {
    yangShengAdvice.push(HEALTH_ADVICE["土"]); // 脾胃为后天之本
  }

  // 5. 生成总结
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const problemWx = wuXingHealth.filter(w => w.status !== "平衡");
  const problemOrgans = zangFuAnalysis.filter(z => z.level !== "健康").slice(0, 5);
  const topDiseases = yiHuanList.slice(0, 4);
  const topAdvice = yangShengAdvice.slice(0, 3);

  const summary = [
    "┌─ 八字健康分析 ─────────────────────┐",
    `│ 四柱：${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}`.padEnd(36) + "│",
    `│ 性别：${gender === "男" ? "男士" : "女士"}`.padEnd(36) + "│",
    "├─ 五行力量 ─────────────────────────┤",
    ...wuXingHealth.map(w => `│ ${w.wuXing}：${w.score}（${w.status}） ${w.desc.slice(0, 12)}`.padEnd(36) + "│"),
    "├─ 重点关注脏腑 ─────────────────────┤",
    ...(problemOrgans.length > 0
      ? problemOrgans.map(z => `│ ${z.organ}（${z.wuXing}/${z.level}）`.padEnd(36) + "│")
      : ["│ 脏腑功能协调，无明显问题            │"]),
    "├─ 易患疾病 ─────────────────────────┤",
    ...(topDiseases.length > 0
      ? topDiseases.map(d => `│ ${d.name}（${d.probability}风险）`.padEnd(36) + "│")
      : ["│ 暂无明显易患疾病                    │"]),
    "├─ 养生建议 ─────────────────────────┤",
    ...topAdvice.map(a => `│ ${a.aspect}：${a.advice.slice(0, 20)}`.padEnd(36) + "│"),
    "├─ 出处 ─────────────────────────────┤",
    "│ 《黄帝内经》《渊海子平》《三命通会》│",
    "└────────────────────────────────────┘",
  ].join("\n");

  return { summary, wuXingHealth, zangFuAnalysis, yiHuanList, yangShengAdvice };
}
