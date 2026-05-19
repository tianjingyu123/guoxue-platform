// ── 奇门符咒化解（移星换斗）计算引擎 ──
// 基于阴盘奇门排盘结果，通过转宫/拆填/添加三法调理
// 参考：《王凤麟道家奇门》、移星换斗理论

import type {
  QiMenFuZhouResult,
  ResolutionPlan,
  ResolutionMethod,
} from "@guoxue/shared";
import { calculateQimenYin } from "./qimen-yin.calculator";
import { calcRiZhu } from "@guoxue/bazi-engine";

// ── 天干物象替代表 ──
const GAN_WU_XIANG: Record<string, { element: string; items: string[]; tabooPlace: string; goodPlace: string }> = {
  "甲": { element:"木", items:["青龙木雕","绿植","木制摆件","毛笔"], tabooPlace:"西北", goodPlace:"东方" },
  "乙": { element:"木", items:["花草盆栽","藤编饰品","丝绸织物","绿萝"], tabooPlace:"西北", goodPlace:"东南" },
  "丙": { element:"火", items:["红色灯笼","蜡烛","骏马图","尖塔水晶"], tabooPlace:"北方", goodPlace:"南方" },
  "丁": { element:"火", items:["红色丝带","油灯","心形饰品","朱砂"], tabooPlace:"北方", goodPlace:"南方" },
  "戊": { element:"土", items:["黄色陶瓷","方形玉器","泰山石","金牛"], tabooPlace:"东方", goodPlace:"中宫" },
  "己": { element:"土", items:["褐色布艺","泥塑","方形桌","黄水晶"], tabooPlace:"东方", goodPlace:"西南" },
  "庚": { element:"金", items:["铜钱","金属刀剑","白色钟表","铁器"], tabooPlace:"南方", goodPlace:"西方" },
  "辛": { element:"金", items:["银饰","水晶球","金属铃铛","白瓷"], tabooPlace:"南方", goodPlace:"西方" },
  "壬": { element:"水", items:["鱼缸","黑色水晶球","水景摆件","墨砚"], tabooPlace:"西南", goodPlace:"北方" },
  "癸": { element:"水", items:["小型喷泉","蓝色玻璃瓶","雨花石","净水"], tabooPlace:"西南", goodPlace:"北方" },
};

// ── 九星化解物品 ──
const STAR_ITEMS: Record<string, { items: string[]; method: ResolutionMethod }> = {
  "天蓬": { items:["水晶球","鱼缸","黑曜石"], method:"添加法" },
  "天芮": { items:["黄色地毯","陶瓷花瓶","泰山石"], method:"添加法" },
  "天冲": { items:["绿植","木制书架","绿色窗帘"], method:"添加法" },
  "天辅": { items:["文昌塔","书籍","毛笔架"], method:"添加法" },
  "天禽": { items:["黄玉","方形桌","中宫镜"], method:"添加法" },
  "天心": { items:["白色水晶","金属风铃","圆形镜"], method:"添加法" },
  "天柱": { items:["金属乐器","铜风铃","白色花瓶"], method:"拆填法" },
  "天任": { items:["方形石","黄色台灯","陶瓷碗"], method:"添加法" },
  "天英": { items:["红色地毯","尖塔水晶","红灯笼"], method:"添加法" },
};

// ── 八门化解法 ──
const MEN_METHOD: Record<string, { method: ResolutionMethod; desc: string }> = {
  "休": { method:"添加法", desc:"休门为吉，宜添加水元素能量，增强贵人运和休息质量。" },
  "生": { method:"添加法", desc:"生门大吉，宜添加土元素，增强财运和生机活力。" },
  "伤": { method:"拆填法", desc:"伤门为凶，需移除尖锐金属物品，填加木质圆润之物化解。" },
  "杜": { method:"转宫法", desc:"杜门阻塞，宜将此宫不利物转至生门方向，疏通能量。" },
  "景": { method:"拆填法", desc:"景门血光，需移除红色过多物品，填加蓝色水元素降火。" },
  "死": { method:"转宫法", desc:"死门大凶，必须将此宫不利物移至生门或开门方向。" },
  "惊": { method:"拆填法", desc:"惊门是非，需移除镜子等反光物，填加厚重之物稳定气场。" },
  "开": { method:"添加法", desc:"开门大吉，宜添加金色物品，增强事业运和贵人运。" },
};

// ── 神煞化解法 ──
const SHEN_METHOD: Record<string, { method: ResolutionMethod; desc: string }> = {
  "值符": { method:"添加法", desc:"值符为统领之神，宜在值符宫摆放权威象征物如印章、官印。" },
  "螣蛇": { method:"拆填法", desc:"螣蛇主虚惊怪异，需移除奇形怪状之物，填加方正稳重物品。" },
  "太阴": { method:"添加法", desc:"太阴主阴私密谋，宜添加金属物品增强隐秘守护之力。" },
  "六合": { method:"添加法", desc:"六合为和合之神，宜添加成对物品如双鱼、双鹤，增强合作运。" },
  "白虎": { method:"拆填法", desc:"白虎主血光刑伤，需移除白色尖角物，填加水元素化解煞气。" },
  "玄武": { method:"拆填法", desc:"玄武主盗贼暗昧，需移除黑色杂物，填加明亮灯具提升阳气。" },
  "九地": { method:"添加法", desc:"九地主稳固长久，宜添加厚重稳当之物如石雕、陶罐。" },
  "九天": { method:"添加法", desc:"九天主动力上扬，宜添加高耸之物如塔形摆件、向上灯具。" },
};

// ── 目标→对应宫位映射 ──
const TARGET_GONG_MAP: Record<string, number[]> = {
  "财运": [1, 2, 8],      // 坎(财源)、坤(积蓄)、艮(生门)
  "健康": [1, 3, 9],      // 坎(肾)、震(肝)、离(心)
  "感情": [2, 7, 9],      // 坤(家庭)、兑(婚姻)、离(感情)
  "事业": [6, 7, 8],      // 乾(领导)、兑(口才)、艮(积累)
  "学业": [3, 4, 6],      // 震(行动)、巽(文昌)、乾(功名)
  "综合": [1, 2, 3, 4, 6, 7, 8, 9],
};

// ── 宫位间吉凶关系 ──
function getTransferTarget(fromGongIdx: number): { index: number; name: string } {
  const goodGongs = [8, 1, 6, 3]; // 生门>休门>开门>伤门
  const available = goodGongs.filter(g => g !== fromGongIdx);
  // 优先选不相冲的
  const conflicts: Record<number, number> = { 1:9, 2:8, 3:7, 4:6, 6:4, 7:3, 8:2, 9:1 };
  const noConflict = available.filter(g => conflicts[g] !== fromGongIdx);
  const target = noConflict.length ? noConflict[0] : available[0];
  const nameMap: Record<number, string> = { 1:"坎",2:"坤",3:"震",4:"巽",5:"中",6:"乾",7:"兑",8:"艮",9:"离" };
  return { index: target, name: nameMap[target] };
}

/** 主计算函数 */
export function calculateQiMenFuZhou(input: Record<string, unknown>): QiMenFuZhouResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const target = (input.target as string) ?? "综合";
  const description = input.description as string | undefined;

  // 先排阴盘奇门
  const qimenResult = calculateQimenYin({ datetime });

  const d = new Date(datetime);
  const riZhu = calcRiZhu(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const riGan = riZhu.gan;

  // ── 生成化解方案 ──
  const plans: ResolutionPlan[] = [];

  for (const gong of qimenResult.gongs) {
    if (gong.name === "中") continue;

    // 判断此宫是否需要化解
    const hasBadGuai = gong.isRuMu || gong.isJiXing || gong.isMenPo;
    const hasBadMen = ["伤","死","惊","杜"].includes(gong.men);
    const hasKongWang = gong.kongWang;

    // 用神宫（时干落宫、日干落宫）
    const isYongShen = gong.tianPan === riGan || gong.diPan === riGan;

    // 是否在目标关联宫位中
    const targetGongs = TARGET_GONG_MAP[target] ?? [1,2,3,4,6,7,8,9];
    const isTargetRelated = targetGongs.includes(gong.index);

    // 需要化解的判断
    let needsResolution = false;
    let severity = 0;
    let problems: string[] = [];
    let symbols: string[] = [];

    if (hasBadGuai) {
      if (gong.isRuMu) { problems.push("天干入墓，能量禁锢"); symbols.push(gong.tianPan + "入墓"); severity += 3; }
      if (gong.isJiXing) { problems.push("地支击刑，矛盾激化"); symbols.push("击刑"); severity += 2; }
      if (gong.isMenPo) { problems.push("八门门破，吉门失吉"); symbols.push(gong.men + "门破"); severity += 2; }
      needsResolution = true;
    }

    if (hasBadMen) {
      problems.push(`${gong.men}门为凶门，主${gong.men === "死" ? "大凶" : gong.men === "伤" ? "伤害" : gong.men === "惊" ? "惊恐" : "阻塞"}`);
      symbols.push(gong.men + "门");
      severity += gong.men === "死" ? 5 : 3;
      needsResolution = true;
    }

    if (hasKongWang && isTargetRelated) {
      problems.push("宫位逢空亡，目标能量落空");
      symbols.push("空亡");
      severity += 3;
      needsResolution = true;
    }

    // 隐干凶兆
    if (gong.yinGan && ["庚","辛","壬","癸"].includes(gong.yinGan)) {
      const yinGanIssues: Record<string, string> = {
        "庚":"隐干庚金暗藏阻碍",
        "辛":"隐干辛金暗藏错误",
        "壬":"隐干壬水暗藏动荡",
        "癸":"隐干癸水暗藏污秽",
      };
      problems.push(yinGanIssues[gong.yinGan]);
      symbols.push("隐" + gong.yinGan);
      severity += 2;
      needsResolution = true;
    }

    // 用神宫被克
    if (isYongShen && (hasBadGuai || hasBadMen)) {
      severity += 2;
      problems.push("此宫为用神宫位（日干/时干所落），影响更加直接");
    }

    if (!needsResolution) continue;

    severity = Math.min(10, Math.max(1, severity));

    // ── 确定化解方法 ──
    let method: ResolutionMethod = "添加法";
    let methodDesc = "";

    // 优先用转宫法（死门/杜门重大问题）
    if (gong.men === "死" || (gong.men === "杜" && gong.isRuMu)) {
      method = "转宫法";
      methodDesc = `此宫问题较重（${gong.men}门${gong.isRuMu ? "入墓" : ""}），宜用转宫法，将不利能量转移至吉宫。`;
    } else if (problems.some(p => p.includes("癸") || p.includes("脏") || p.includes("污"))) {
      method = "拆填法";
      methodDesc = "此宫有癸水浊气，宜先拆后填：清除对应方位脏乱杂物，再添加化解物品。";
    } else if (gong.men === "伤" || gong.men === "惊") {
      method = "拆填法";
      methodDesc = `${gong.men}门为凶，宜用拆填法：移除引发问题的物品，填加中和能量之物。`;
    } else {
      method = "添加法";
      methodDesc = "此宫以添加法调理即可，摆放对应物品增强正能量，压制不利因素。";
    }

    // ── 生成步骤 ──
    const steps: string[] = [];
    const items: ResolutionPlan["items"] = [];

    if (method === "转宫法") {
      const targetGong = getTransferTarget(gong.index);
      steps.push(
        `1. 将${gong.name}宫（${gong.index}宫）方向的所有杂物清理干净`,
        `2. 在${gong.name}宫方向摆放${STAR_ITEMS[gong.star]?.items[0] ?? "水晶球"}作为过渡`,
        `3. 在${targetGong.name}宫（${targetGong.index}宫）方向摆放对应化解物品`,
        `4. 连续摆放100日内不可移动`,
      );
      items.push({
        name: STAR_ITEMS[gong.star]?.items[0] ?? "水晶球",
        quantity: "1个",
        placement: `先放${gong.name}宫（过渡），再移至${targetGong.name}宫`,
      });
    }

    if (method === "拆填法") {
      const ganItems = gong.yinGan ? GAN_WU_XIANG[gong.yinGan] : null;
      const tianGanItems = GAN_WU_XIANG[gong.tianPan];
      steps.push(
        `1. 检查${gong.name}宫方位，移除${ganItems?.items.join("、") ?? "尖锐及脏乱物品"}`,
        `2. 彻底清洁该区域`,
        `3. 在该方位摆放${tianGanItems.items.slice(0, 2).join("、")}等物品`,
        `4. 可配合${STAR_ITEMS[gong.star]?.items[1] ?? "圆形摆件"}调和气场`,
      );
      items.push(
        { name: tianGanItems.items[0], quantity: "1-2件", placement: `${gong.name}宫${tianGanItems.goodPlace}` },
        { name: STAR_ITEMS[gong.star]?.items[1] ?? tianGanItems.items[1], quantity: "1件", placement: `${gong.name}宫中央` },
      );
    }

    if (method === "添加法") {
      const tianGanItems = GAN_WU_XIANG[gong.tianPan];
      const starItem = STAR_ITEMS[gong.star]?.items[0];
      steps.push(
        `1. 在${gong.name}宫（${tianGanItems.goodPlace}方位）摆放${tianGanItems.items[0]}`,
        starItem ? `2. 在${gong.name}宫添加${starItem}增强本宫正能量` : "2. 保持该方位整洁明亮",
        `3. 摆放物定时清理，100日内保持原位`,
      );
      items.push(
        { name: tianGanItems.items[0], quantity: "1件", placement: `${gong.name}宫${tianGanItems.goodPlace}` },
      );
      if (starItem) items.push({ name: starItem, quantity: "1件", placement: `${gong.name}宫中央` });
    }

    // 生成预期效果
    const expectedEffect = (() => {
      if (method === "转宫法") return "能量转移至吉宫后，问题有望在30-60日内明显改善。";
      if (method === "拆填法") return "移除不利因素并添加正能量后，45日内可见转机。";
      return "持续添加正能量，21日内气场开始转变。";
    })();

    plans.push({
      gongIndex: gong.index,
      gongName: gong.name,
      problem: problems.join("；"),
      problemSymbols: symbols,
      severity,
      method,
      methodDesc,
      steps,
      items,
      targetGong: method === "转宫法" ? getTransferTarget(gong.index) : undefined,
      expectedEffect,
      duration: "100日内不可移动摆放物，到期后可调整",
    });
  }

  // ── 按严重度排序，最多取3个 ──
  plans.sort((a, b) => b.severity - a.severity);
  const topPlans = plans.slice(0, 3);

  // ── 执行顺序 ──
  const orderSteps = topPlans.map((p, i) => `${i + 1}. 先处理${p.gongName}宫 → ${p.method}`);

  // ── 禁忌 ──
  const taboos = [
    "同时调理不可超过3处，否则能量分散无效",
    "摆放物100日内不可移动、触碰、清洁",
    "摆放时心怀正念，不可戏谑轻慢",
    "此法为道家秘传，心术不正者不传不用",
    "调理期间避免在调理方位大兴土木",
    "午夜子时（23:00-1:00）不宜进行调理操作",
  ];

  const duanYu = `奇门符咒化解（移星换斗）：时值${qimenResult.dunType === "yang" ? "阳" : "阴"}遁${qimenResult.juNumber}局。针对"${target}"目标，共需调理${topPlans.length}处宫位。${topPlans.map(p => `${p.gongName}宫用${p.method}（${p.problem.slice(0, 20)}...）`).join("；")}。调理后${topPlans[0]?.severity >= 7 ? "需耐心等待能量转换，切忌急躁干预" : "短期内可有明显改善"}。摆放完毕后默念心愿三遍，以意导气，以气化煞。`;

  return {
    input: { datetime, target: target as any, description },
    panInfo: {
      juNumber: qimenResult.juNumber,
      dunType: qimenResult.dunType,
      yongShi: qimenResult.yongShi,
      zhiFu: qimenResult.zhiFu,
      zhiShiMen: qimenResult.zhiShiMen,
    },
    plans: topPlans,
    executionOrder: orderSteps.join("\n"),
    duanYu,
    taboos,
    validityReminder: "本化解方案基于当前时辰奇门盘制定，有效期为调理后100日。100日后如有需要可重新排盘调整。",
  };
}
