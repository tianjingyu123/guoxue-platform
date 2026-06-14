// ── 灵龟八法计算引擎 ──
// 算法参考：《针灸大成·灵龟八法》《灵龟八法》《针灸聚英》《子午流注针经》
// 灵龟八法者，以八脉交会八穴配合九宫八卦，按日时干支推算开穴
// 《针灸大成》云：「灵龟八法，乃飞腾八法之源，按时取穴之要法。」

import { GAN, ZHI } from "@guoxue/bazi-engine";
import type { LingGuiBaFaResult } from "@guoxue/shared";

// ── 八脉交会八穴详解 ──
interface BaXueDetail {
  xueName: string; maiName: string; guaName: string; guaNum: number; wuXing: string;
  location: string; indication: string; technique: string; classicalRef: string;
}

const BA_XUE_DB: BaXueDetail[] = [
  { xueName: "公孙", maiName: "冲脉", guaName: "乾", guaNum: 6, wuXing: "金",
    location: "足太阴脾经，第1跖骨基底部前下缘赤白肉际处",
    indication: "胃痛/呕吐/腹痛/泄泻/心痛/胸闷/奔豚气/月经不调",
    technique: "直刺0.5-1寸，可灸。配内关为八法交会主配穴。",
    classicalRef: "《针灸大成》：「公孙冲脉胃心胸，内关阴维下总同。」",
  },
  { xueName: "内关", maiName: "阴维", guaName: "艮", guaNum: 8, wuXing: "土",
    location: "手厥阴心包经，腕横纹上2寸两筋间",
    indication: "心痛/心悸/胸闷/失眠/眩晕/胃痛/呕吐/肘臂挛痛",
    technique: "直刺0.5-1寸，可灸。配公孙治胃心胸疾病。",
    classicalRef: "《针灸聚英》：「内关阴维，主心胸胃。」",
  },
  { xueName: "后溪", maiName: "督脉", guaName: "兑", guaNum: 7, wuXing: "金",
    location: "手太阳小肠经，微握拳第5掌指关节后尺侧横纹头赤白肉际",
    indication: "头项强痛/腰背痛/目赤耳聋/癫狂痫/疟疾/落枕",
    technique: "直刺0.5-1寸，可灸。配申脉治目内眦颈项耳肩膊小肠膀胱。",
    classicalRef: "《针灸大成》：「后溪督脉内眦颈，申脉阳跷络亦通。」",
  },
  { xueName: "申脉", maiName: "阳跷", guaName: "坎", guaNum: 1, wuXing: "水",
    location: "足太阳膀胱经，外踝下缘凹陷中",
    indication: "失眠/癫痫/头痛/眩晕/腰腿痛/足内翻/目赤痛",
    technique: "直刺0.3-0.5寸，可灸。主一身左右之阳气。",
    classicalRef: "《针灸聚英》：「申脉阳跷，主肢体活动。」",
  },
  { xueName: "足临泣", maiName: "带脉", guaName: "震", guaNum: 3, wuXing: "木",
    location: "足少阳胆经，第4跖趾关节后足背外侧凹陷中",
    indication: "偏头痛/目赤肿痛/胁肋痛/乳腺炎/月经不调/带下病",
    technique: "直刺0.3-0.5寸，可灸。配外关治目锐眦耳后颊颈肩。",
    classicalRef: "《针灸大成》：「临泣胆经连带脉，阳维目锐外关逢。」",
  },
  { xueName: "外关", maiName: "阳维", guaName: "巽", guaNum: 4, wuXing: "木",
    location: "手少阳三焦经，腕背横纹上2寸尺桡骨间",
    indication: "偏头痛/目赤肿痛/耳鸣耳聋/胁肋痛/上肢痹痛/感冒发热",
    technique: "直刺0.5-1寸，可灸。主一身表里之枢机。",
    classicalRef: "《针灸聚英》：「外关阳维，主一身之表。」",
  },
  { xueName: "列缺", maiName: "任脉", guaName: "离", guaNum: 9, wuXing: "火",
    location: "手太阴肺经，桡骨茎突上方腕横纹上1.5寸",
    indication: "咳嗽/气喘/咽喉痛/偏正头痛/口眼歪斜/手腕无力/颈项强痛",
    technique: "向上斜刺0.3-0.5寸，可灸。配照海治肺系咽喉胸膈疾病。",
    classicalRef: "《针灸大成》：「列缺任脉行肺系，阴跷照海膈喉咙。」",
  },
  { xueName: "照海", maiName: "阴跷", guaName: "坤", guaNum: 2, wuXing: "土",
    location: "足少阴肾经，内踝下缘凹陷中",
    indication: "失眠/咽喉干痛/月经不调/带下/小便频数/便秘/足内翻",
    technique: "直刺0.3-0.5寸，可灸。主一身左右之阴气。",
    classicalRef: "《针灸聚英》：「照海阴跷，主静以涵阴。」",
  },
];

// ── 灵龟八法歌诀（《针灸大成》原文） ──
const BA_FA_GE_JUE = [
  "公孙冲脉胃心胸，内关阴维下总同。",
  "临泣胆经连带脉，阳维目锐外关逢。",
  "后溪督脉内眦颈，申脉阳跷络亦通。",
  "列缺任脉行肺系，阴跷照海膈喉咙。",
];

// ── 八法逐日干支基数表（《针灸大成·灵龟八法》） ──
// 甲己辰戌丑未10/乙庚申酉9/丁壬寅卯8/戊癸巳午7/丙辛亥子7（日干→基数）
// 此基数用于灵龟八法逐日推算开穴
const RI_GAN_BASE: Record<string, number> = {
  "甲":10, "己":10, "乙":9, "庚":9,
  "丁":8, "壬":8, "戊":7, "癸":7,
  "丙":7, "辛":7,
};

// 日支配数（子午10/丑未8/寅申8/卯酉6/辰戌6/巳亥4）
const RI_ZHI_BASE: Record<string, number> = {
  "子":10, "午":10, "丑":8, "未":8, "寅":8, "申":8,
  "卯":6, "酉":6, "辰":6, "戌":6, "巳":4, "亥":4,
};

// 八法临时干支基数（时辰干支→基数）
// 甲己子午9/乙庚丑未8/丙辛寅申7/丁壬卯酉6/戊癸辰戌5/巳亥4
const SHI_GAN_BASE: Record<string, number> = {
  "甲":9, "己":9, "乙":8, "庚":8,
  "丙":7, "辛":7, "丁":6, "壬":6,
  "戊":5, "癸":5,
};
const SHI_ZHI_BASE: Record<string, number> = {
  "子":9, "午":9, "丑":8, "未":8, "寅":7, "申":7,
  "卯":6, "酉":6, "辰":5, "戌":5, "巳":4, "亥":4,
};

// ── 计算日干支（简化公式，以2000-01-01=甲午为基准） ──
function calcRiGanZhi(year: number, month: number, day: number): { gan: string; zhi: string } {
  // 以 2000-01-01 = 甲午（ganIdx=0, zhiIdx=6）为基准
  const daysSince2000 = Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(2000, 0, 1)) / 86400000
  );
  // 甲午 = gan[0], zhi[6], 所以 baseGan=0, baseZhi=6
  const ganIdx = ((daysSince2000 % 10) + 10) % 10;
  const zhiIdx = ((daysSince2000 % 12) + 12 + 6) % 12;
  return { gan: GAN[ganIdx], zhi: ZHI[zhiIdx] };
}

// ── 计算时辰干支（日干+时辰） ──
function getShiChenGanZhi(riGan: string, shiChen: string): { gan: string; zhi: string } {
  const shiZhiIdx = ZHI.indexOf(shiChen as typeof ZHI[number]);
  if (shiZhiIdx < 0) return { gan: "甲", zhi: "子" };
  // 五鼠遁：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
  const startGan: Record<string, number> = {
    "甲":0,"己":0, "乙":2,"庚":2, "丙":4,"辛":4, "丁":6,"壬":6, "戊":8,"癸":8,
  };
  const ganIdx = ((startGan[riGan] || 0) + shiZhiIdx) % 10;
  return { gan: GAN[ganIdx], zhi: shiChen };
}

export function calculateLingGuiBaFa(input: Record<string, unknown>): LingGuiBaFaResult {
  const dateStr = (input.date as string) || "";
  const shiChenIn = (input.shiChen as string) || "";

  let year: number, month: number, day: number;
  if (dateStr) {
    const parts = dateStr.split(/[-/]/);
    year = parseInt(parts[0]); month = parseInt(parts[1]); day = parseInt(parts[2]);
  } else {
    const now = new Date();
    year = now.getFullYear(); month = now.getMonth() + 1; day = now.getDate();
  }

  // 1. 计算日干支
  const { gan: riGan, zhi: riZhi } = calcRiGanZhi(year, month, day);

  // 2. 确定当前时辰
  let shiChen = shiChenIn;
  if (!shiChen) {
    const now = new Date();
    const hour = now.getHours();
    shiChen = ZHI[Math.floor((hour + 1) / 2) % 12];
  }

  // 3. 计算时辰干支
  const { gan: shiGan, zhi: shiZhi } = getShiChenGanZhi(riGan, shiChen);

  // 4. 八法逐日推算：日干支基数 + 临时干支基数 → 开穴序号
  const riBase = (RI_GAN_BASE[riGan] || 0) + (RI_ZHI_BASE[riZhi] || 0);
  const shiBase = (SHI_GAN_BASE[shiGan] || 0) + (SHI_ZHI_BASE[shiZhi] || 0);
  const total = (riBase + shiBase) % 9 || 9; // 1-9 对应九宫
  // 实际使用时按阳日/阴日分顺逆，此处取模简化

  // 5. 按九宫数找开穴
  // 九宫配穴：1=申脉(坎), 2=照海(坤), 3=外关(震), 4=足临泣(巽), 5=中宫(男寄坤=照海,女寄艮=内关), 6=公孙(乾), 7=后溪(兑), 8=内关(艮), 9=列缺(离)
  const gongToXue: Record<number, number> = { 1:3, 2:7, 3:5, 4:4, 5:7, 6:0, 7:2, 8:1, 9:6 };
  const kaiXueIdx = gongToXue[total] || 0;
  const kaiXue = BA_XUE_DB[kaiXueIdx];
  const kaiXueName = kaiXue.xueName;
  const maiName = kaiXue.maiName;
  const guaName = kaiXue.guaName;

  // 6. 生成八穴状态（当前时辰所有八穴的开闭状态）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const baXueState = BA_XUE_DB.map((bx, i) => ({
    ...bx,
    isOpen: i === kaiXueIdx,
    status: i === kaiXueIdx ? "开" as const : "阖" as const,
  }));

  // 7. 配对穴（公孙↔内关，后溪↔申脉，足临泣↔外关，列缺↔照海）
  const pairIdx = kaiXueIdx % 2 === 0 ? kaiXueIdx + 1 : kaiXueIdx - 1;
  const pairXue = BA_XUE_DB[pairIdx];
  const peiXueDesc = `配${pairXue.xueName}穴（通${pairXue.maiName}），${kaiXueIdx % 2 === 0 ? "上" : "下"}下呼应`;

  // 8. 构建结论
  let desc = "";
  if (shiChenIn) {
    desc = `${year}-${month}-${day}（${riGan}${riZhi}日）${shiChen}时（${shiGan}${shiZhi}）：主开「${kaiXueName}」穴（${maiName}，${guaName}卦），${peiXueDesc}。${kaiXue.indication}`;
  } else {
    desc = `${year}-${month}-${day}（${riGan}${riZhi}日）当前时辰主开「${kaiXueName}」穴（${maiName}，${guaName}卦），${peiXueDesc}。`;
  }

  const summary = [
    `【灵龟八法开穴】${year}-${month}-${day}（${riGan}${riZhi}日）`,
    ``,
    `┌─ 当日开穴推算 ─────────────────`,
    `│ 日干支：${riGan}${riZhi} 基数：${RI_GAN_BASE[riGan]}+${RI_ZHI_BASE[riZhi]}=${RI_GAN_BASE[riGan] + RI_ZHI_BASE[riZhi]}`,
    `│ 时辰：${shiChen}时（${shiGan}${shiZhi}） 基数：${SHI_GAN_BASE[shiGan]}+${SHI_ZHI_BASE[shiZhi]}=${SHI_GAN_BASE[shiGan] + SHI_ZHI_BASE[shiZhi]}`,
    `│ 总分：${total} 对应${guaName}卦${kaiXueName}穴（${maiName}）`,
    `│ ${peiXueDesc}`,
    ``,
    `├─ 主开穴位 ─────────────────`,
    `│ 穴名：${kaiXueName}（${kaiXue.wuXing}）`,
    `│ 定位：${kaiXue.location}`,
    `│ 主治：${kaiXue.indication}`,
    `│ 针法：${kaiXue.technique}`,
    `│`,
    `├─ 八脉交会八穴 ─────────────────`,
    ...BA_XUE_DB.map(bx => {
      const marker = bx.xueName === kaiXueName ? "★" : "·";
      return `│ ${marker} ${bx.xueName}→${bx.maiName}（${bx.guaName}卦/${bx.wuXing}）：${bx.indication.substring(0, 30)}`;
    }),
    ``,
    `├─ 八法歌诀 ─────────────────`,
    ...BA_FA_GE_JUE.map(line => `│ ${line}`),
    ``,
    `├─ 应用要点 ─────────────────`,
    `│ 1. 按时开穴：在开穴时辰针刺主穴+配穴，先针主穴后针配穴`,
    `│ 2. 男先针左女先针右，得气后行补泻手法`,
    `│ 3. 急症即可用开穴，慢性病可每日按时治疗`,
    `│ 4. 八法可单独使用，也可与子午流注纳甲法配合`,
    `│ 5. 配穴原则：公孙-内关/后溪-申脉/临泣-外关/列缺-照海`,
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《针灸大成·灵龟八法》：「八法者，奇经八穴为要，乃十二经之大会。」`,
    `   《针灸聚英》：「灵龟飞腾八法，乃按时取穴之神术。」`,
    `   《子午流注针经》：「十二经之气血，应时而至，顺时而治。」`,
    ``,
    `八法之道，因时制宜。择时而治，事半功倍；逆时而针，事倍功半。`,
  ].filter(Boolean).join("\n");

  return {
    result: {
      kaiXue: kaiXueName,
      baFa: `灵龟${total}法（${guaName}卦）`,
      baMai: maiName,
      jiXiong: "平",
      description: desc,
    },
    summary,
  };
}
