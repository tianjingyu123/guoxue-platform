// ── 阳盘命理奇门计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》《遁甲演义》
// 出生时间起奇门命盘，叠加八字+大运+命宫+格局分析
// 复用 calculateQimenYang 真实排盘 + calcBazi 八字引擎

import type { QimenGong } from "@guoxue/shared";
// 入墓/击刑真源走子路径 —— 包根刻意不转发 paipan（并入会顶穿主包体积上限）
import { MU_PALACE, JIXING_PALACE } from "@guoxue/shared/paipan";
import {
  calcBazi, calcNianZhu,
  type BaziInput, type BaziResult,
} from "@guoxue/bazi-engine";
import { calculateQimenYang } from "./qimen.calculator";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GONG_NAMES = ["坎","坤","震","巽","中","乾","兑","艮","离"];

// 地支→九宫索引映射
const ZHI_TO_GONG_IDX: Record<string, number> = {
  "子":0, "丑":7, "寅":7, "卯":2, "辰":3, "巳":3,
  "午":8, "未":1, "申":1, "酉":6, "戌":5, "亥":5,
};

// 五行定义
const GAN_WU_XING: Record<string, string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
};
const GONG_WU_XING: Record<number, string> = { 0:"水",1:"土",2:"木",3:"木",4:"土",5:"金",6:"金",7:"土",8:"火" };

// 宫位→代表地支（用于十二长生计算）
const GONG_ZHI: Record<number, string> = { 0:"子",1:"申",2:"卯",3:"辰",4:"辰",5:"戌",6:"酉",7:"丑",8:"午" };

// 八门五行
const MEN_FULL_WU_XING: Record<string, string> = {
  "休门":"水","死门":"土","伤门":"木","杜门":"木","中门":"土","开门":"金","惊门":"金","生门":"土","景门":"火",
};

// 五行相克: keMap[A] = 被A克的五行
const KE_MAP: Record<string, string> = { "木":"土","土":"水","水":"火","火":"金","金":"木" };

// 十二长生: 每个天干的长生地支
const CHANG_SHENG_ZHI: Record<string, string> = {
  "甲":"亥","乙":"午","丙":"寅","丁":"酉","戊":"寅","己":"酉","庚":"巳","辛":"子","壬":"申","癸":"卯",
};
const CHANG_SHENG_SEQ = ["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"];

/** 计算天干在某地支的十二长生地势 */
function calcDiShi(gan: string, zhi: string): string {
  const csZhi = CHANG_SHENG_ZHI[gan];
  if (!csZhi) return "";
  const csIdx = DI_ZHI.indexOf(csZhi);
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const isYinGan = "乙丁己辛癸".includes(gan);
  const offset = isYinGan ? (csIdx - zhiIdx + 12) % 12 : (zhiIdx - csIdx + 12) % 12;
  return CHANG_SHENG_SEQ[offset] ?? "";
}

/**
 * 判断入墓 / 击刑。
 *
 * 🔴 2026-09-20 改为引用 `@guoxue/shared` 的 `MU_PALACE` / `JIXING_PALACE`。
 *
 * 原先本文件自带两份实现，**与共享奇门引擎直接冲突**：
 *
 * | | 原本文件 | 共享引擎（真源） |
 * |---|---|---|
 * | 入墓 | 宫位五行克天盘干五行 | 干落其墓宫：坤2墓甲癸、乾6墓乙丙戊、艮8墓丁己庚、巽4墓辛壬 |
 * | 击刑 | 只认 戊震3 / 己艮8 / 庚离9 **三个** | 六仪**六个全在**：戊3 己2 庚8 辛9 壬4 癸4 |
 *
 * 两处都不一致：己的击刑宫一个说艮8一个说坤2、庚一个说离9一个说艮8，
 * 而且原实现漏了辛壬癸三个干。共享那一份有竞品黄金基准逐宫核过，取它。
 *
 * 教训与本文件上方那条同族：**同一个概念在仓库里有几份实现，
 * 就有几份里至少 n−1 份是错的**，而每一份单独看都能跑出结果。
 */
function calcRuMu(tianPanGan: string, gongIdx: number): boolean {
  // gongIdx 是 0-based，共享表用 1-9 宫号
  return (MU_PALACE[gongIdx + 1] ?? []).includes(tianPanGan);
}

function calcJiXing(tianPanGan: string, gongIdx: number): boolean {
  return JIXING_PALACE[tianPanGan] === gongIdx + 1;
}

/** 判断门破：宫位五行克门五行 */
function calcMenPo(men: string, gongIdx: number): boolean {
  // 八门在返回时可能带"门"字也可能不带，统一处理
  const fullMen = men.includes("门") ? men : men + "门";
  const menWx = MEN_FULL_WU_XING[fullMen];
  if (!menWx) return false;
  const gongWx = GONG_WU_XING[gongIdx];
  return KE_MAP[gongWx] === menWx;
}

/** 星门神组合格局匹配 */
const STAR_MEN_SHEN_GEJU = [
  { star:"天心", men:"开门", shen:"值符", name:"龙跃天门", jiXiong:"吉" as const, desc:"天心智慧+开门通达+值符护佑，主贵人有助，事业顺遂。" },
  { star:"天辅", men:"生门", shen:"六合", name:"凤鸣朝阳", jiXiong:"吉" as const, desc:"天辅文昌+生门财运+六合人缘，主学业事业双丰收。" },
  { star:"天蓬", men:"休门", shen:"太阴", name:"潜龙在渊", jiXiong:"平" as const, desc:"休养生息之象，适宜积累力量，不宜冒进求成。" },
  { star:"天英", men:"景门", shen:"九天", name:"鹏程万里", jiXiong:"吉" as const, desc:"志向远大，名声远播。宜向外发展，前程似锦。" },
  { star:"天柱", men:"惊门", shen:"白虎", name:"虎啸风生", jiXiong:"凶" as const, desc:"口舌是非、竞争压力大，宜谨言慎行，防小人暗算。" },
  { star:"天芮", men:"死门", shen:"玄武", name:"病符临宫", jiXiong:"凶" as const, desc:"须注意健康问题，谨慎投资理财，避免破财。" },
  { star:"天冲", men:"伤门", shen:"螣蛇", name:"荆棘载途", jiXiong:"凶" as const, desc:"阻碍重重，易有反复波折。适合以守为攻，等待时机。" },
  { star:"天任", men:"杜门", shen:"九地", name:"稳如泰山", jiXiong:"平" as const, desc:"稳定有余而变通不足，宜守成稳重发展。" },
];

/** 生成宫位解读 */
function interpretGong(gong: QimenGong): string {
  const parts: string[] = [];
  if (gong.kongWang) parts.push("此宫逢空亡，事多虚浮不实");
  if (gong.maXing) parts.push("马星发动，主奔波变动");
  if (gong.isRuMu) parts.push("天盘干入墓，能量受困");
  if (gong.isJiXing) parts.push("击刑在宫，多有是非阻碍");
  if (gong.isMenPo) parts.push("门破，该宫所主之事难成");
  if (gong.changSheng) {
    const cs = gong.changSheng;
    if (["长生","冠带","临官","帝旺"].includes(cs)) parts.push(`地势${cs}，气运旺盛`);
    else if (["衰","病","死","墓","绝"].includes(cs)) parts.push(`地势${cs}，气运衰弱`);
    else parts.push(`地势${cs}，气运平平`);
  }
  if (parts.length === 0) parts.push("此宫平稳，暂无特殊吉凶");
  return `${gong.name}宫（${gong.star}+${gong.men}+${gong.shen}，天盘${gong.tianPan}）。${parts.join("；")}。`;
}

/** 将八字Pillar转为简略干支串 */
function pillarToGanZhi(p: { gan: string; zhi: string }): string {
  return p.gan + p.zhi;
}

/** 获取八字简略信息 */
function extractBaziSummary(bz: BaziResult): {
  nian: string; yue: string; ri: string; shi: string;
  shengXiao: string; kongWang: string;
  wuXingEnergy: { mu: number; huo: number; tu: number; jin: number; shui: number; desc: string };
  nianNaYin: string; yueNaYin: string; riNaYin: string; shiNaYin: string;
} {
  return {
    nian: pillarToGanZhi(bz.siZhu.nian),
    yue: pillarToGanZhi(bz.siZhu.yue),
    ri: pillarToGanZhi(bz.siZhu.ri),
    shi: pillarToGanZhi(bz.siZhu.shi),
    shengXiao: bz.shengXiao,
    kongWang: bz.kongWang,
    wuXingEnergy: bz.wuXingEnergy ?? { mu:0, huo:0, tu:0, jin:0, shui:0, desc:"" },
    nianNaYin: bz.siZhu.nian.nayin ?? "",
    yueNaYin: bz.siZhu.yue.nayin ?? "",
    riNaYin: bz.siZhu.ri.nayin ?? "",
    shiNaYin: bz.siZhu.shi.nayin ?? "",
  };
}

export function calculateQimenMingli(input: Record<string, unknown>): Record<string, unknown> {
  // ── 1. 解析输入 ──
  const birthTime = (input.birthTime as string) ?? new Date().toISOString();
  const birthplace = (input.birthplace as string) || undefined;
  const gender = (input.gender as string) === "女" ? "女" : "男";
  const jiGongMode = (input.jiGongMode as string) ?? "kungong";
  const trueSolar = (input.trueSolar as boolean) ?? false;
  const ziShiMode = (input.ziShiMode as string) ?? "traditional";
  const daylightSaving = (input.daylightSaving as boolean) ?? false;

  const d = new Date(birthTime);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  let hour = d.getHours();
  const minute = d.getMinutes();

  // 夏令时调整
  if (daylightSaving) hour = (hour - 1 + 24) % 24;

  // 早晚子时：晚子时(23点后)日柱用次日（预留）

  // ── 2. 八字排盘 ──
  const baziInput: BaziInput = {
    name: "",
    gender: gender as "男" | "女",
    year, month, day, hour, minute,
    city: birthplace,
    useTrueSolarTime: trueSolar,
  };
  const bz = calcBazi(baziInput);

  // ── 3. 主盘排盘：出生时间阳盘奇门 ──
  const birthPlate = calculateQimenYang({
    datetime: birthTime,
    method: "zhuanpan",
    qiJuMethod: "chaibu",
    anGanMethod: "zhishimen-qi",
    useTrueSolar: false,
  });

  // ── 4. 增强九宫信息 ──
  const enhancedGongs: QimenGong[] = birthPlate.gongs.map((g, idx) => {
    const tianPanGan = g.tianPan;
    const gongZhi = GONG_ZHI[idx];
    const enhanced: QimenGong = {
      ...g,
      isRuMu: calcRuMu(tianPanGan, idx),
      isJiXing: calcJiXing(tianPanGan, idx),
      isMenPo: calcMenPo(g.men, idx),
      changSheng: calcDiShi(tianPanGan, gongZhi),
    };

    // 宫位解读
    enhanced.interpretation = interpretGong(enhanced);

    // 分配神煞（如果有的话，后续可通过八字神煞精细匹配）
    if (bz.shenSha && bz.shenSha.length > 0) {
      const relevantSha = bz.shenSha.filter(s => {
        // 简单关联：年支相关神煞→坎1宫，日支相关→离9宫
        if (idx === 0 && s.pillar === "nian") return true;
        if (idx === 8 && s.pillar === "ri") return true;
        return false;
      });
      if (relevantSha.length > 0) {
        enhanced.shenSha = relevantSha.map(s => s.name);
      }
    }

    return enhanced;
  });

  // ── 5. 命宫→九宫映射 ──
  const mingGongPillar = bz.mingGong;
  const mingGongIdx = ZHI_TO_GONG_IDX[mingGongPillar.zhi] ?? 0;
  const mingGongGong = enhancedGongs[mingGongIdx];
  const mingGongInfo = {
    ganZhi: pillarToGanZhi(mingGongPillar),
    gan: mingGongPillar.gan,
    zhi: mingGongPillar.zhi,
    gongIndex: mingGongIdx + 1,
    gongName: GONG_NAMES[mingGongIdx],
    star: mingGongGong.star,
    men: mingGongGong.men,
    shen: mingGongGong.shen,
    ganShiShen: mingGongPillar.ganShiShen,
    zhiShiShen: mingGongPillar.zhiShiShen,
  };

  // ── 6. 身宫→九宫映射 ──
  const shenGongPillar = bz.shenGong;
  const shenGongIdx = ZHI_TO_GONG_IDX[shenGongPillar.zhi] ?? 0;
  const shenGongGong = enhancedGongs[shenGongIdx];
  const shenGongInfo = {
    ganZhi: pillarToGanZhi(shenGongPillar),
    gan: shenGongPillar.gan,
    zhi: shenGongPillar.zhi,
    gongIndex: shenGongIdx + 1,
    gongName: GONG_NAMES[shenGongIdx],
    star: shenGongGong.star,
    men: shenGongGong.men,
    shen: shenGongGong.shen,
    ganShiShen: shenGongPillar.ganShiShen,
    zhiShiShen: shenGongPillar.zhiShiShen,
  };

  // ── 7. 大运格式化 ──
  // （原有 ganZhi60Idx() 只服务于已删除的「大运局数」，一并删除，不留死代码）

  /**
   * 🔴 2026-09-20 修，两处。与阴盘版 `qimen-yin-mingli` 同一处置——
   * **那份在 2026-09-19 就修过了，这份漏掉了**，同一个缺陷在仓库里存活了一天。
   *
   * （值得记一笔：成对的实现要成对地改。修完一个就去 grep 另一个，
   *   否则"已修复"会变成"修了一半"，而后者比没修更难发现。）
   *
   * **一、原先丢掉了大运干支。** 这个数组只给 name/startAge/endAge，
   * 而干支是命理大运最核心的信息，调用方拿不到就没法讲这步运是什么性质。
   * （完整数据一直在 daYunSteps 里，但 daYun 才是断语与展示实际用的那份。）
   *
   * **二、原先有个 `juNumber: (ganZhi60Idx(step.ganZhi) % 9) + 1`，已删除。**
   * 「六十甲子序除九」不对应任何已知规则：
   *   · 公开讲法里奇门命理的大运讲的是**落宫**（一宫十年、阳顺阴逆），
   *     没有「大运局数」这一说；
   *   · 最直接的证据是**本文件自相矛盾**：流年用「地支→宫」（`ZHI_TO_GONG_IDX`，
   *     见第 286 行），大运却另起一套下标算术。
   *     **同一份输出里两种口径，必有一种是编的。**
   *
   * 现改为与流年同口径：大运地支 → 后天八卦宫，可核、可解释。
   */
  const daYun = bz.qiYun.daYun.map(step => ({
    name: `${step.startAge}-${step.endAge}岁`,
    ganZhi: step.ganZhi,
    startAge: step.startAge,
    endAge: step.endAge,
    gongIdx: ZHI_TO_GONG_IDX[step.ganZhi[1]] ?? 0,
  }));

  const daYunSteps = bz.qiYun.daYun.map(step => ({
    name: `${step.startAge}-${step.endAge}岁`,
    ganZhi: step.ganZhi,
    startAge: step.startAge,
    endAge: step.endAge,
    startYear: step.startYear,
    endYear: step.endYear,
    ganShiShen: step.ganShiShen,
    zhiShiShen: step.zhiShiShen,
    liuNian: (step.liuNian ?? []).map(ln => ({
      year: ln.year,
      ganZhi: ln.ganZhi,
      age: ln.age,
    })),
  }));

  // ── 8. 当前流年分析 ──
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentAge = currentYear - year;
  const nianZhu = calcNianZhu(currentYear);
  const liuNianGanZhi = nianZhu.gan + nianZhu.zhi;
  const liuNianGongIdx = ZHI_TO_GONG_IDX[nianZhu.zhi] ?? 0;

  // 找到当前所在的大运
  /**
   * 2026-09-19：大运现为 **10 列**——首列（daYun[0]）是「起运前」，取月柱本身，不是第一步大运。
   * 所以年龄小于起运岁的人会落在首列，措辞上必须区分，不能说成「行某某大运」。
   */
  let currentDaYun = bz.qiYun.daYun[0];
  let isPreQiYun = true;
  for (const dyn of bz.qiYun.daYun) {
    if (currentAge >= dyn.startAge && currentAge <= dyn.endAge) {
      currentDaYun = dyn;
      isPreQiYun = dyn === bz.qiYun.daYun[0];
      break;
    }
  }

  // ── 9. 格局分析 ──
  const geJuList: { name: string; active: boolean; desc: string; jiXiong: string }[] = [];

  // 八字格局
  if (bz.geJu) {
    geJuList.push({
      name: bz.geJu.name,
      active: true,
      desc: bz.geJu.desc,
      jiXiong: "平",
    });
  }

  // 奇门命盘格局：遍历九宫匹配星门神组合
  for (const gong of enhancedGongs) {
    for (const rule of STAR_MEN_SHEN_GEJU) {
      if (gong.star === rule.star && gong.men === rule.men && gong.shen === rule.shen) {
        geJuList.push({
          name: `${rule.name}（落${gong.name}宫）`,
          active: true,
          desc: rule.desc,
          jiXiong: rule.jiXiong,
        });
      }
    }
  }

  // 命宫格局
  geJuList.push({
    name: `${mingGongInfo.gongName}宫命`,
    active: true,
    desc: `命主命宫落${mingGongInfo.gongName}宫（${mingGongInfo.star}+${mingGongInfo.men}+${mingGongInfo.shen}），${mingGongInfo.ganZhi}。此宫为命主先天根基所在。`,
    jiXiong: ["坎","离","震","巽"].includes(mingGongInfo.gongName) ? "吉" : "平",
  });

  // ── 10. 断语生成 ──
  const baziSummary = extractBaziSummary(bz);
  const xiongGongs = enhancedGongs.filter(g =>
    g.isRuMu || g.isJiXing || g.isMenPo
  );

  const duanYu = [
    `命主${gender}，生于${year}年${month}月${day}日${hour}时（公历）。`,
    `八字：${baziSummary.nian} ${baziSummary.yue} ${baziSummary.ri} ${baziSummary.shi}，生肖${baziSummary.shengXiao}。`,
    `命盘：${birthPlate.dunType === "yang" ? "阳遁" : "阴遁"}${birthPlate.juNumber}局，用事${birthPlate.jieQi}，值符${birthPlate.zhiFu}，值使${birthPlate.zhiShiMen}。`,
    `命宫落${mingGongInfo.gongName}宫（${mingGongInfo.ganZhi}，${mingGongInfo.star}+${mingGongInfo.men}+${mingGongInfo.shen}），身宫落${shenGongInfo.gongName}宫（${shenGongInfo.ganZhi}，${shenGongGong.star}+${shenGongGong.men}+${shenGongGong.shen}）。`,
    bz.geJu ? `八字格局：${bz.geJu.name}${bz.geJu.yongShen ? `，用神${bz.geJu.yongShen}` : ""}${bz.geJu.xiShen ? `，喜${bz.geJu.xiShen}` : ""}${bz.geJu.jiShen ? `，忌${bz.geJu.jiShen}` : ""}。` : "",
    `起运：${bz.qiYun.startAge}岁（${bz.qiYun.startYear}年），共${bz.qiYun.daYun.length}步大运。当前${currentAge}岁，${isPreQiYun ? `尚未起运（起运前行月柱${currentDaYun.ganZhi}，${currentDaYun.startAge}-${currentDaYun.endAge}岁）` : `行${currentDaYun.ganZhi}大运（${currentDaYun.startAge}-${currentDaYun.endAge}岁）`}。`,
    `流年${currentYear}年（${liuNianGanZhi}），落${GONG_NAMES[liuNianGongIdx]}宫。`,
    xiongGongs.length > 0
      ? `注意宫位：${xiongGongs.map(g => `${g.name}宫（${g.isRuMu ? "入墓" : ""}${g.isJiXing ? "击刑" : ""}${g.isMenPo ? "门破" : ""}）`).join("、")}。`
      : "命盘九宫整体平和，无重大冲克。",
  ].filter(Boolean).join("");

  // ── 11. 组装 summary ──
  const bzStr = `${baziSummary.nian} ${baziSummary.yue} ${baziSummary.ri} ${baziSummary.shi}`;
  const dunLabel = birthPlate.dunType === "yang" ? "阳遁" : "阴遁";
  const geJuJi = geJuList.filter(g => g.jiXiong === "吉").length;
  const geJuXiong = geJuList.filter(g => g.jiXiong === "凶").length;
  const summary = [
    "┌──────────────────────────────────────┐",
    "│      命理奇门 · 终身盘排盘            │",
    "├──────────────────────────────────────┤",
    "│ 局数：" + (dunLabel + birthPlate.juNumber + "局 · 用事：" + (birthPlate.jieQi || "—")).padEnd(30) + "│",
    "│ 八字：" + bzStr.padEnd(30) + "│",
    "│ 命宫：" + (mingGongInfo.gongName + (mingGongIdx + 1) + "宫（" + mingGongInfo.ganZhi + "·" + mingGongInfo.star + "+" + mingGongInfo.men + "+" + mingGongInfo.shen + "）").padEnd(30) + "│",
    "│ 身宫：" + (shenGongInfo.gongName + (shenGongIdx + 1) + "宫（" + shenGongInfo.ganZhi + "·" + shenGongGong.star + "+" + shenGongGong.men + "+" + shenGongGong.shen + "）").padEnd(30) + "│",
    "│ 起运：" + (bz.qiYun.startAge + "岁 · " + bz.qiYun.daYun.length + "步大运").padEnd(30) + "│",
    "│ 流年：" + (currentYear + "年（" + liuNianGanZhi + "）· 落" + GONG_NAMES[liuNianGongIdx] + (liuNianGongIdx + 1) + "宫").padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 格局：" + (geJuList.length + "个 · 吉" + geJuJi + " 平" + (geJuList.length - geJuJi - geJuXiong) + " 凶" + geJuXiong).padEnd(30) + "│",
    "│ 值符：" + (birthPlate.zhiFu || "—").padEnd(30) + "│",
    "│ 值使：" + (birthPlate.zhiShiMen || "—").padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《烟波钓叟歌》                  │",
    "│       《奇门遁甲秘笈大全》            │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  // ── 12. 组装输出 ──
  return {
    input: { birthTime, birthplace, gender, jiGongMode, trueSolar, ziShiMode, daylightSaving },
    basicInfo: {
      juShu: birthPlate.juNumber,
      dunType: birthPlate.dunType === "yang" ? "阳遁" : "阴遁",
      riGanZhi: baziSummary.ri,
      shiGanZhi: baziSummary.shi,
      gender,
      birthplace,
    },
    gongs: enhancedGongs,
    mingLi: {
      birthTime,
      gender,
      daYun,
      baziSwitch: { available: true, baziRecordId: undefined },
      bazi: baziSummary,
      mingGong: mingGongInfo,
      shenGong: shenGongInfo,
      qiYunInfo: {
        startAge: bz.qiYun.startAge,
        startYear: bz.qiYun.startYear,
        desc: bz.qiYun.desc,
      },
      liuNian: {
        year: currentYear,
        ganZhi: liuNianGanZhi,
        age: currentAge,
        luoGongIndex: liuNianGongIdx + 1,
        luoGongName: GONG_NAMES[liuNianGongIdx],
        daYunGanZhi: currentDaYun.ganZhi,
        daYunStartAge: currentDaYun.startAge,
        daYunEndAge: currentDaYun.endAge,
      },
      daYunSteps,
    },
    geJu: geJuList,
    duanYu,
    summary,
  };
}
