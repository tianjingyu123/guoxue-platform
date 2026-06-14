// ── 流年神煞计算引擎 ──
// 检测日柱与流年之间的神煞关系，共计15+种神煞
// 算法参考：《渊海子平·论神煞》《三命通会·神煞篇》《五行精纪》《星平会海》

import { GAN, ZHI } from "@guoxue/bazi-engine";
import type { LiuNianShenShaResult, ShenShaDetail } from "@guoxue/shared";

// ── 天乙贵人 ──
// 来源：《渊海子平》口诀：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢虎马
const TIAN_YI: Record<string, string[]> = {
  "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"],
  "乙": ["子", "申"], "己": ["子", "申"],
  "丙": ["亥", "酉"], "丁": ["亥", "酉"],
  "辛": ["午", "寅"],
  "壬": ["卯", "巳"], "癸": ["卯", "巳"],
};

// ── 天德贵人 ──
// 来源：《三命通会》月建查天德：正丁二申三壬四辛五亥六甲七癸八寅九丙十乙子巳丑庚
const TIAN_DE: Record<number, string> = { 1: "丁", 2: "申", 3: "壬", 4: "辛", 5: "亥", 6: "甲", 7: "癸", 8: "寅", 9: "丙", 10: "乙", 11: "巳", 12: "庚" };

// ── 月德贵人 ──
// 来源：《三命通会》月建三合局之阳干：寅午戌月丙，申子辰月壬，亥卯未月甲，巳酉丑月庚
const YUE_DE: Record<string, string> = {
  "寅": "丙", "午": "丙", "戌": "丙",
  "申": "壬", "子": "壬", "辰": "壬",
  "亥": "甲", "卯": "甲", "未": "甲",
  "巳": "庚", "酉": "庚", "丑": "庚",
};

// ── 文昌星 ──
// 来源：《星平会海》日干查文昌：甲巳乙午丙戊申丁己酉庚亥辛子壬寅癸卯
const WEN_CHANG: Record<string, string> = {
  "甲": "巳", "乙": "午", "丙": "申", "戊": "申",
  "丁": "酉", "己": "酉", "庚": "亥", "辛": "子",
  "壬": "寅", "癸": "卯",
};

// ── 学堂 ──
// 来源：《三命通会》日干长生位即学堂
const XUE_TANG: Record<string, string> = {
  "甲": "亥", "乙": "午", "丙": "寅", "丁": "酉",
  "戊": "寅", "己": "酉", "庚": "巳", "辛": "子",
  "壬": "申", "癸": "卯",
};

// ── 羊刃 ──
// 来源：《渊海子平》阳干帝旺为羊刃，阴干墓库为羊刃
const YANG_REN: Record<string, string> = {
  "甲": "卯", "丙": "午", "戊": "午", "庚": "酉", "壬": "子",
  "乙": "辰", "丁": "未", "己": "未", "辛": "戌", "癸": "丑",
};

// ── 桃花 ──
const TAO_HUA_MAP: Record<string, string> = {
  "申": "卯", "子": "卯", "辰": "卯", "寅": "午", "午": "午", "戌": "午",
  "亥": "子", "卯": "子", "未": "子", "巳": "酉", "酉": "酉", "丑": "酉",
};

// ── 驿马 ──
const YI_MA_MAP: Record<string, string> = {
  "申": "寅", "子": "寅", "辰": "寅", "寅": "申", "午": "申", "戌": "申",
  "亥": "巳", "卯": "巳", "未": "巳", "巳": "亥", "酉": "亥", "丑": "亥",
};

// ── 华盖 ──
const HUA_GAI_MAP: Record<string, string> = {
  "申": "辰", "子": "辰", "辰": "辰", "寅": "戌", "午": "戌", "戌": "戌",
  "亥": "未", "卯": "未", "未": "未", "巳": "丑", "酉": "丑", "丑": "丑",
};

// ── 将星 ──
const JIANG_XING_MAP: Record<string, string> = {
  "申": "子", "子": "子", "辰": "子", "寅": "午", "午": "午", "戌": "午",
  "亥": "卯", "卯": "卯", "未": "卯", "巳": "酉", "酉": "酉", "丑": "酉",
};

// ── 劫煞 ──
const JIE_SHA_MAP: Record<string, string> = {
  "申": "巳", "子": "巳", "辰": "巳", "寅": "亥", "午": "亥", "戌": "亥",
  "亥": "申", "卯": "申", "未": "申", "巳": "寅", "酉": "寅", "丑": "寅",
};

// ── 灾煞 ──
const ZAI_SHA_MAP: Record<string, string> = {
  "申": "午", "子": "午", "辰": "午", "寅": "子", "午": "子", "戌": "子",
  "亥": "酉", "卯": "酉", "未": "酉", "巳": "卯", "酉": "卯", "丑": "卯",
};

// ── 红鸾 ──
// 来源：《星平会海》子年起卯逆数十二支
const HONG_LUAN: Record<string, string> = {
  "子": "卯", "丑": "寅", "寅": "丑", "卯": "子", "辰": "亥", "巳": "戌",
  "午": "酉", "未": "申", "申": "未", "酉": "午", "戌": "巳", "亥": "辰",
};

// ── 天喜 ──
// 来源：《星平会海》红鸾的对冲位即天喜
const TIAN_XI: Record<string, string> = {
  "子": "酉", "丑": "申", "寅": "未", "卯": "午", "辰": "巳", "巳": "辰",
  "午": "卯", "未": "寅", "申": "丑", "酉": "子", "戌": "亥", "亥": "戌",
};

// ── 孤辰 ──
const GU_CHEN_MAP: Record<string, string> = {
  "申": "亥", "子": "亥", "辰": "亥", "寅": "巳", "午": "巳", "戌": "巳",
  "亥": "寅", "卯": "寅", "未": "寅", "巳": "申", "酉": "申", "丑": "申",
};

// ── 寡宿 ──
const GUA_SU_MAP: Record<string, string> = {
  "申": "丑", "子": "丑", "辰": "丑", "寅": "未", "午": "未", "戌": "未",
  "亥": "辰", "卯": "辰", "未": "辰", "巳": "戌", "酉": "戌", "丑": "戌",
};

const ZHI_CHONG: Record<string, string> = {
  "子": "午", "丑": "未", "寅": "申", "卯": "酉", "辰": "戌", "巳": "亥",
  "午": "子", "未": "丑", "申": "寅", "酉": "卯", "戌": "辰", "亥": "巳",
};

export function calculateLiuNianShenSha(input: Record<string, unknown>): LiuNianShenShaResult {
  const yearPillar = (input.yearPillar as string) || "";
  const dayPillar = (input.dayPillar as string) || "戊辰";
  const year = (input.year as number) || new Date().getFullYear();

  const riGan = dayPillar[0] || "戊";
  const riZhi = dayPillar[1] || "辰";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nianGan = yearPillar ? yearPillar[0] : "甲";
  const nianZhi = yearPillar ? yearPillar[1] : "子";

  const liuNianZhi = ZHI[(year - 4) % 12];
  const liuNianGan = GAN[(year - 4) % 10];
  const monthNum = new Date().getMonth() + 1;

  const shenShaList: ShenShaDetail[] = [];

  // ═══════════ 年煞类 ═══════════
  // 1. 太岁
  shenShaList.push({
    name: "太岁",
    position: `${liuNianGan}${liuNianZhi}`,
    jiXiong: "平",
    description: `${year}年太岁在${liuNianZhi}方，值年太岁为一年之主宰，统领诸神。宜安奉太岁祈福纳祥，不宜在太岁方动土修造。《渊海子平》云："太岁乃年中天子，不可犯之。"`,
  });

  // 2. 岁破
  const suiPo = ZHI_CHONG[liuNianZhi] || "";
  if (riZhi === suiPo || nianZhi === suiPo) {
    const target = riZhi === suiPo ? "日支" : "年支";
    const zhi = riZhi === suiPo ? riZhi : nianZhi;
    shenShaList.push({
      name: "岁破",
      position: `${target}${zhi}冲太岁${liuNianZhi}`,
      jiXiong: "大凶",
      description: `${target}${zhi}冲犯太岁${liuNianZhi}为岁破煞，乃流年第一大凶煞。《三命通会》云："岁破者，太岁所冲之辰也。"主变动、破财、伤灾、口舌官非，务必安奉太岁化解。冲太岁之年不宜结婚、搬家、创业。`,
    });
  }

  // 3. 日柱伏吟（日柱与流年干支相同）
  if (riGan === liuNianGan && riZhi === liuNianZhi) {
    shenShaList.push({
      name: "日柱伏吟",
      position: `日柱${dayPillar}与流年${liuNianGan}${liuNianZhi}相同`,
      jiXiong: "凶",
      description: `日柱与流年干支完全相同为伏吟，主忧思烦恼、进退维谷、事多反复。宜静不宜动，不宜做重大决定。但若日主旺相，亦可借伏吟之力深耕深作。`,
    });
  }

  // ═══════════ 吉神类 ═══════════
  // 4. 天乙贵人
  const tianYiZhis = TIAN_YI[riGan] || [];
  if (tianYiZhis.includes(liuNianZhi)) {
    shenShaList.push({
      name: "天乙贵人",
      position: `流年${liuNianZhi}`,
      jiXiong: "大吉",
      description: `流年逢天乙贵人（${liuNianZhi}），乃第一大吉神。《三命通会》云："天乙贵人，遇之则功名早达，官禄易进。"今年贵人运旺，易得长辈、领导提携，事业顺遂，逢凶化吉。宜积极社交拓展人脉。`,
    });
  }

  // 5. 天德贵人
  const tianDeGan = TIAN_DE[monthNum];
  if (tianDeGan && liuNianGan === tianDeGan) {
    shenShaList.push({
      name: "天德贵人",
      position: `流年天干${liuNianGan}`,
      jiXiong: "大吉",
      description: `流年逢天德贵人（天干${liuNianGan}合天德），乃天地德秀之气。《星平会海》云："天德者，天之福德也。"主逢凶化吉、化险为夷，纵有灾厄亦能化解。今年行事多得无形之力护佑。`,
    });
  }

  // 6. 月德贵人
  const yueDeGan = YUE_DE[liuNianZhi];
  if (yueDeGan && riGan === yueDeGan) {
    shenShaList.push({
      name: "月德贵人",
      position: `日干${riGan}合月德`,
      jiXiong: "大吉",
      description: `日干${riGan}为月德贵人，乃太阴之德。《渊海子平》云："月德者，乃母系之庇佑也。"今年女性贵人运旺，易得女性长辈或同事相助，事业生活皆顺。月德临身，诸事少忧。`,
    });
  }

  // 7. 文昌星
  const wenChangZhi = WEN_CHANG[riGan];
  if (wenChangZhi && liuNianZhi === wenChangZhi) {
    shenShaList.push({
      name: "文昌星",
      position: `流年${liuNianZhi}`,
      jiXiong: "吉",
      description: `流年逢文昌星（${liuNianZhi}），主文运昌盛学业有成。《星平会海》云："文昌入命，才学过人。"今年利于考试升学、职称评定、写作创作、科研学术。学生族和文职工作者运势尤佳。`,
    });
  }

  // 8. 学堂
  const xueTangZhi = XUE_TANG[riGan];
  if (xueTangZhi && liuNianZhi === xueTangZhi) {
    shenShaList.push({
      name: "学堂",
      position: `流年${liuNianZhi}`,
      jiXiong: "吉",
      description: `流年值学堂（${liuNianZhi}为日干${riGan}长生之位），主学习领悟力强。《三命通会》云："学堂者，如人读书在学堂。"今年学习新知识、掌握新技能格外得心应手，是进修深造的好时机。`,
    });
  }

  // 9. 将星
  const jiangXingZhi = JIANG_XING_MAP[riZhi];
  if (jiangXingZhi && liuNianZhi === jiangXingZhi) {
    shenShaList.push({
      name: "将星",
      position: `流年${liuNianZhi}`,
      jiXiong: "吉",
      description: `流年逢将星（${liuNianZhi}），主领导才能凸显威权在握。《三命通会》云："将星者，大将之权星也。"今年适合担任领导职务、主持重大项目、在团队中发挥核心作用。宜大胆决策展现实力。`,
    });
  }

  // 10. 红鸾
  const hongLuanZhi = HONG_LUAN[nianZhi];
  if (hongLuanZhi && liuNianZhi === hongLuanZhi) {
    shenShaList.push({
      name: "红鸾",
      position: `流年${liuNianZhi}`,
      jiXiong: "吉",
      description: `流年逢红鸾星（${liuNianZhi}），主婚嫁喜事感情良缘。《星平会海》云："红鸾入命，婚喜临门。"单身者今年桃花运旺极易脱单，恋爱中适合订婚结婚，已婚者感情甜蜜升温。宜参与喜庆活动沾喜气。`,
    });
  }

  // 11. 天喜
  const tianXiZhi = TIAN_XI[nianZhi];
  if (tianXiZhi && liuNianZhi === tianXiZhi) {
    shenShaList.push({
      name: "天喜",
      position: `流年${liuNianZhi}`,
      jiXiong: "吉",
      description: `流年逢天喜星（${liuNianZhi}），主添丁进口喜庆临门。《五行精纪》云："天喜照命，喜事自来。"今年利生育子女、乔迁新居、开业庆典。各种喜庆之事接踵而至，宜多参与聚会分享喜悦。`,
    });
  }

  // ═══════════ 平煞类 ═══════════
  // 12. 桃花
  const taoHuaZhi = TAO_HUA_MAP[riZhi];
  if (taoHuaZhi && liuNianZhi === taoHuaZhi) {
    shenShaList.push({
      name: "桃花",
      position: `流年${liuNianZhi}`,
      jiXiong: "平",
      description: `流年逢桃花星（${liuNianZhi}），主异性缘旺社交活跃。《渊海子平》云："桃花者，男女情欲之象。"单身者今年是脱单良机，宜扩大社交圈；已婚者须保持距离防烂桃花，以礼相待即可化解。`,
    });
  }

  // 13. 驿马
  const yiMaZhi = YI_MA_MAP[riZhi];
  if (yiMaZhi && liuNianZhi === yiMaZhi) {
    shenShaList.push({
      name: "驿马",
      position: `流年${liuNianZhi}`,
      jiXiong: "平",
      description: `流年逢驿马星（${liuNianZhi}），主动荡奔波变动频繁。《三命通会》云："驿马者，奔走驰驱之象。"今年宜出行远游、搬家迁居、更换工作、开拓新市场。不宜安逸守成，动中求财为上策。`,
    });
  }

  // 14. 华盖
  const huaGaiZhi = HUA_GAI_MAP[riZhi];
  if (huaGaiZhi && liuNianZhi === huaGaiZhi) {
    shenShaList.push({
      name: "华盖",
      position: `流年${liuNianZhi}`,
      jiXiong: "平",
      description: `流年逢华盖星（${liuNianZhi}），主孤独清高、艺术才华。《三命通会》云："华盖者，大帝之伞盖也。"今年利于学术研究、艺术创作、修行悟道。但人际交往可能偏少，需主动维护重要关系防疏远。`,
    });
  }

  // ═══════════ 凶煞类 ═══════════
  // 15. 劫煞
  const jieShaZhi = JIE_SHA_MAP[riZhi];
  if (jieShaZhi && liuNianZhi === jieShaZhi) {
    shenShaList.push({
      name: "劫煞",
      position: `流年${liuNianZhi}`,
      jiXiong: "凶",
      description: `流年逢劫煞（${liuNianZhi}），主破财盗窃、意外灾祸。《五行精纪》云："劫煞者，劫夺之神也。"今年需防盗防骗，不宜露财炫富。出行注意安全防范，重要文件做好备份。可佩戴五行护身符化解。`,
    });
  }

  // 16. 灾煞
  const zaiShaZhi = ZAI_SHA_MAP[riZhi];
  if (zaiShaZhi && liuNianZhi === zaiShaZhi) {
    shenShaList.push({
      name: "灾煞",
      position: `流年${liuNianZhi}`,
      jiXiong: "大凶",
      description: `流年逢灾煞（${liuNianZhi}），主血光意外、突发灾厄。《三命通会》云："灾煞者，灾祸之煞也。"今年需特别注意出行交通安全，避免高危活动。不宜登山涉水等冒险运动。家中宜备急救药品，注意用火用电安全。`,
    });
  }

  // 17. 羊刃
  const yangRenZhi = YANG_REN[riGan];
  if (yangRenZhi && liuNianZhi === yangRenZhi) {
    shenShaList.push({
      name: "羊刃",
      position: `流年${liuNianZhi}`,
      jiXiong: "凶",
      description: `流年逢羊刃（日干${riGan}羊刃在${liuNianZhi}），主血光争执、性格刚暴。《渊海子平》云："羊刃者，刚强凶恶之物。"今年易与人发生争执冲突，需克制情绪少惹是非。注意刀伤利器，不宜动手术（若非必要）。`,
    });
  }

  // 18. 孤辰
  const guChenZhi = GU_CHEN_MAP[riZhi];
  if (guChenZhi && liuNianZhi === guChenZhi) {
    shenShaList.push({
      name: "孤辰",
      position: `流年${liuNianZhi}`,
      jiXiong: "小凶",
      description: `流年逢孤辰（${liuNianZhi}），主孤独寂寞、人际关系疏离。《五行精纪》云："孤辰者，孤寡之象。"今年可能感觉朋友渐少、知音难觅。宜主动联络旧友，参加团体活动，避免自我封闭。独处时间可用于学习充电。`,
    });
  }

  // 19. 寡宿
  const guaSuZhi = GUA_SU_MAP[riZhi];
  if (guaSuZhi && liuNianZhi === guaSuZhi) {
    shenShaList.push({
      name: "寡宿",
      position: `流年${liuNianZhi}`,
      jiXiong: "小凶",
      description: `流年逢寡宿（${liuNianZhi}），主感情冷淡、婚恋不顺。《三命通会》云："寡宿者，独守空房之象。"单身者今年脱单难度较大不必强求，已婚者需多陪伴伴侣避免感情降温。宜培养兴趣爱好充实自我。`,
    });
  }

  // ── 汇总统计 ──
  const daJi = shenShaList.filter(s => s.jiXiong === "大吉");
  const ji = shenShaList.filter(s => s.jiXiong === "吉");
  const ping = shenShaList.filter(s => s.jiXiong === "平");
  const xiong = shenShaList.filter(s => s.jiXiong.includes("凶"));

  // 构建 box-drawing 摘要
  const summary = [
    `┌─ 流年神煞 ─────────────────`,
    `│ ${year}年（${liuNianGan}${liuNianZhi}年） 日主：${riGan}坐${riZhi}`,
    `│ 共查得 ${shenShaList.length} 个流年神煞`,
    `│ 大吉${daJi.length} · 吉${ji.length} · 平${ping.length} · 凶${xiong.length}`,
    ``,
    `├─ 吉神 ────────────────────`,
    ...(daJi.length + ji.length > 0
      ? [...daJi, ...ji].map(s =>
          `│ ▣ ${s.name.padEnd(6, " ")} ${s.jiXiong.padEnd(4, " ")} ${s.description.slice(0, 55)}${s.description.length > 55 ? "…" : ""}`
        )
      : [`│ （无吉神入命，今年宜低调保守）`]
    ),
    ``,
    `├─ 凶煞 ────────────────────`,
    ...(xiong.length > 0
      ? xiong.map(s =>
          `│ △ ${s.name.padEnd(6, " ")} ${s.jiXiong.padEnd(4, " ")} ${s.description.slice(0, 55)}${s.description.length > 55 ? "…" : ""}`
        )
      : [`│ （无凶煞入命，今年运势平稳）`]
    ),
    ...(ping.length > 0 ? [
      ``,
      `├─ 平煞 ────────────────────`,
      ...ping.map(s =>
        `│ ○ ${s.name.padEnd(6, " ")} ${s.jiXiong.padEnd(4, " ")} ${s.description.slice(0, 55)}${s.description.length > 55 ? "…" : ""}`
      ),
    ] : []),
    ``,
    `├─ 古籍出处 ──────────────────`,
    `│ 《渊海子平》—— 宋·徐大升，论神煞之吉凶`,
    `│ 《三命通会·神煞篇》—— 明·万民英，神煞体系最详备`,
    `│ 《五行精纪》—— 宋·廖中，专论神煞之古本`,
    `│ 《星平会海》—— 明·杨淙，星命与神煞之综合`,
    `│ 神煞乃八字中重要参断体系，`,
    `│ 以日柱为主，对照流年地支判断吉凶。`,
    `│ 吉神逢之顺遂，凶煞见之宜化解——`,
    `│ 佩戴五行护身符、行善积德均可有效化解凶煞。`,
    ``,
    `└─ 命理提示 ──────────────────`,
    `   「神煞不可专执」——《三命通会》原文警示。`,
    `   神煞须结合格局、旺衰、用神综合判断，`,
    `   吉神被克则吉而不吉，凶煞被制则凶而不凶。`,
    `   流年神煞为当年运势之参考，非定数也。`,
  ].filter(Boolean).join("\n");

  return { shenShaList, summary };
}
