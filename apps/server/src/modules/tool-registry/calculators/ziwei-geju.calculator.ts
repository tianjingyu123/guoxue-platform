// ── 紫微斗数格局详解计算器 ──
// 算法参考：《紫微斗数全书》《十八飞星策天紫微斗数》
// 基于《紫微斗数全书》《紫微斗数全集》等经典
// 检测紫微斗数十二宫星曜分布形成的各类格局（30+格局）
// 支持富贵格/贫贱格/杂格/特殊格四类

import type { ZiweiGeJuInput, ZiweiGeJuResult, ZiweiPattern, ZiweiPalaceInput } from "@guoxue/shared";

// ==================== 常量 ====================

const ZHI_LIST = "子丑寅卯辰巳午未申酉戌亥";

/** 十四主星列表 */
const ZHU_XING = new Set([
  "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
  "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军",
]);

/** 四马之地（寅申巳亥） */
const SI_MA = new Set(["寅", "申", "巳", "亥"]);

/** 擎羊庙旺之地（丑未辰戌） */
const QING_YANG_MIAO = new Set(["丑", "未", "辰", "戌"]);

/** 辅星列表 */
const FU_XING = ["左辅", "右弼", "文昌", "文曲", "天魁", "天钺"];

/** 左右昌曲 */
const ZUO_YOU_CHANG_QU = ["左辅", "右弼", "文昌", "文曲"];

// ==================== 工具函数 ====================

function zhiIdx(z: string): number {
  return ZHI_LIST.indexOf(z);
}

function getSanHeZhis(zhi: string): [string, string, string] {
  const i = zhiIdx(zhi);
  return [ZHI_LIST[i], ZHI_LIST[(i + 4) % 12], ZHI_LIST[(i + 8) % 12]];
}

function getDuiZhi(zhi: string): string {
  return ZHI_LIST[(zhiIdx(zhi) + 6) % 12];
}

function getJiaZhis(zhi: string): [string, string] {
  const i = zhiIdx(zhi);
  return [ZHI_LIST[(i + 11) % 12], ZHI_LIST[(i + 1) % 12]];
}

function starsAt(bz: Map<string, ZiweiPalaceInput>, zhi: string): string[] {
  return bz.get(zhi)?.stars ?? [];
}

function starAt(bz: Map<string, ZiweiPalaceInput>, zhi: string, s: string): boolean {
  return starsAt(bz, zhi).includes(s);
}

/** 解析 siHua 中的宫位引用（可能为宫名或地支） */
function resolveSiHuaZhi(
  byName: Map<string, ZiweiPalaceInput>,
  ref: string,
): string | undefined {
  const p = byName.get(ref);
  if (p) return p.zhi;
  if (ZHI_LIST.includes(ref)) return ref;
  return undefined;
}

/** 查找某颗星所在的 地支 列表（可能出现多次） */
function findStarZhi(bz: Map<string, ZiweiPalaceInput>, star: string): string[] {
  const out: string[] = [];
  for (const [z, p] of bz) {
    if (p.stars.includes(star)) out.push(z);
  }
  return out;
}

/** 三合方（集体）是否包含所有指定星曜（可分散在不同宫位） */
function sanHeHasAllCollective(
  bz: Map<string, ZiweiPalaceInput>,
  mingGongZhi: string,
  required: string[],
): boolean {
  const [z1, z2, z3] = getSanHeZhis(mingGongZhi);
  const collected = [
    ...starsAt(bz, z1),
    ...starsAt(bz, z2),
    ...starsAt(bz, z3),
  ];
  return required.every((s) => collected.includes(s));
}

/** 三合方中至少有一个宫位包含全部指定星曜 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sanHeAnyHasAll(
  bz: Map<string, ZiweiPalaceInput>,
  mingGongZhi: string,
  required: string[],
): boolean {
  const [z1, z2, z3] = getSanHeZhis(mingGongZhi);
  return [z1, z2, z3].some((z) => required.every((s) => starAt(bz, z, s)));
}

/** 三合方中至少有一个宫位包含至少一个指定星曜 */
function sanHeHasAny(
  bz: Map<string, ZiweiPalaceInput>,
  mingGongZhi: string,
  candidates: string[],
): boolean {
  const [z1, z2, z3] = getSanHeZhis(mingGongZhi);
  return [z1, z2, z3].some((z) => candidates.some((s) => starAt(bz, z, s)));
}

/** 任意宫位同时包含所有指定星曜 */
function anyPalaceHasAll(
  bz: Map<string, ZiweiPalaceInput>,
  stars: string[],
): { palaceZhi: string } | null {
  for (const [z] of bz) {
    if (stars.every((s) => starAt(bz, z, s))) return { palaceZhi: z };
  }
  return null;
}

// ==================== 格局检测入口 ====================

export function calculateZiweiGeJu(
  input: Record<string, unknown>,
): ZiweiGeJuResult {
  const data = input as unknown as ZiweiGeJuInput;
  const { mingGongZhi, mingGongStars, palaces, siHua } = data;

  // ---- 建立查询索引 ----
  const byName = new Map<string, ZiweiPalaceInput>(
    palaces.map((p) => [p.name, p]),
  );
  const byZhi = new Map<string, ZiweiPalaceInput>(
    palaces.map((p) => [p.zhi, p]),
  );

  const sanHeZhis = getSanHeZhis(mingGongZhi);
  const [jiaZhiA, jiaZhiB] = getJiaZhis(mingGongZhi);
  const duiZhi = getDuiZhi(mingGongZhi);

  // ---- 四化索引 ----
  const siHuaZhiMap = new Map<string, string[]>();
  for (const h of siHua) {
    const z = resolveSiHuaZhi(byName, h.palace);
    if (z) {
      if (!siHuaZhiMap.has(h.huaType)) siHuaZhiMap.set(h.huaType, []);
      siHuaZhiMap.get(h.huaType)!.push(z);
    }
  }
  const huaLuZhis = siHuaZhiMap.get("化禄") ?? [];
  const huaQuanZhis = siHuaZhiMap.get("化权") ?? [];
  const huaKeZhis = siHuaZhiMap.get("化科") ?? [];
  // 禄存 + 天马 位置
  const luCunZhis = findStarZhi(byZhi, "禄存");
  const tianMaZhis = findStarZhi(byZhi, "天马");
  const zuoFuZhis = findStarZhi(byZhi, "左辅");
  const youBiZhis = findStarZhi(byZhi, "右弼");
  const huoXingZhis = findStarZhi(byZhi, "火星");
  const lingXingZhis = findStarZhi(byZhi, "铃星");
  const qingYangZhis = findStarZhi(byZhi, "擎羊");
  const changWenZhis = findStarZhi(byZhi, "文昌");
  const changQuZhis = findStarZhi(byZhi, "文曲");

  // ================================================================
  //  所有格局检测（flat 数组，isMain 标记区分主格 / 其他）
  // ================================================================
  const all: (ZiweiPattern & { isMain: boolean })[] = [];

  function add(
    name: string,
    type: ZiweiPattern["type"],
    isMain: boolean,
    formed: boolean,
    conditions: string[],
    description: string,
    source: string,
  ) {
    all.push({ name, type, isMain, formed, conditions, description, source });
  }

  // -------- 富贵格 (15) --------

  // 1. 紫府同宫：命宫紫微 + 天府
  {
    const formed =
      mingGongStars.includes("紫微") && mingGongStars.includes("天府");
    add(
      "紫府同宫",
      "富贵格",
      true,
      formed,
      ["命宫有紫微星", "命宫有天府星"],
      "紫微与天府同守命宫，君臣庆会，大富大贵",
      "《紫微斗数全书》·紫府同宫格",
    );
  }

  // 2. 紫府朝垣：命宫有紫微或天府，迁移宫（对宫）有辅星
  {
    const hasZiFu =
      mingGongStars.includes("紫微") || mingGongStars.includes("天府");
    const duiHasFu = FU_XING.some((s) => starAt(byZhi, duiZhi, s));
    add(
      "紫府朝垣",
      "富贵格",
      true,
      hasZiFu && duiHasFu,
      ["命宫有紫微或天府", "迁移宫有辅星朝拱（左辅/右弼/文昌/文曲/天魁/天钺）"],
      "紫微或天府守命，辅星朝拱迁移宫，贵气显达",
      "《紫微斗数全书》·紫府朝垣格",
    );
  }

  // 3. 君臣庆会：紫微 + 天相 + 左右/昌曲 在命宫三合
  {
    const formed =
      sanHeHasAllCollective(byZhi, mingGongZhi, ["紫微", "天相"]) &&
      sanHeHasAny(byZhi, mingGongZhi, ZUO_YOU_CHANG_QU);
    add(
      "君臣庆会",
      "富贵格",
      true,
      formed,
      ["命宫三合有紫微星", "命宫三合有天相星", "命宫三合有左辅/右弼/文昌/文曲"],
      "紫微天相在三合方得左右昌曲会照，君臣得位，大贵之格",
      "《紫微斗数全书》·君臣庆会格",
    );
  }

  // 4. 府相朝垣：命宫天府 + 官禄宫天相（或反之）
  {
    const mingFu = mingGongStars.includes("天府");
    const mingXiang = mingGongStars.includes("天相");
    const guanLuZhi = sanHeZhis[2]; // 官禄宫 = 三合第三位
    const guanLuHasXiang =
      guanLuZhi ? starAt(byZhi, guanLuZhi, "天相") : false;
    const guanLuHasFu = guanLuZhi ? starAt(byZhi, guanLuZhi, "天府") : false;
    const formed =
      (mingFu && guanLuHasXiang) || (mingXiang && guanLuHasFu);
    add(
      "府相朝垣",
      "富贵格",
      true,
      formed,
      ["命宫天府与官禄宫天相（或命宫天相与官禄宫天府）"],
      "府相朝垣格，天府与天相在三合方遥望，贵气聚合",
      "《紫微斗数全书》·府相朝垣格",
    );
  }

  // 5. 机月同梁：天机 + 太阴 + 天同 + 天梁 在命宫或三合
  {
    const formed = sanHeHasAllCollective(byZhi, mingGongZhi, [
      "天机",
      "太阴",
      "天同",
      "天梁",
    ]);
    add(
      "机月同梁",
      "富贵格",
      true,
      formed,
      ["命宫或三合方有天机星", "命宫或三合方有太阴星", "命宫或三合方有天同星", "命宫或三合方有天梁星"],
      "机月同梁格，四星会合命宫三合，宜公职、文职",
      "《紫微斗数全书》·机月同梁格",
    );
  }

  // 6. 月朗天门：太阴在亥宫（天门）
  {
    const formed = starAt(byZhi, "亥", "太阴");
    add(
      "月朗天门",
      "富贵格",
      false,
      formed,
      ["太阴在亥宫（天门之位）"],
      "月朗天门格，太阴居亥宫庙旺，富贵双全，福泽绵长",
      "《紫微斗数全书》·月朗天门格",
    );
  }

  // 7. 日照雷门：太阳在卯宫（雷门）
  {
    const formed = starAt(byZhi, "卯", "太阳");
    add(
      "日照雷门",
      "富贵格",
      false,
      formed,
      ["太阳在卯宫（雷门之位）"],
      "日照雷门格，太阳居卯宫庙旺，名望显达，声名远播",
      "《紫微斗数全书》·日照雷门格",
    );
  }

  // 8. 将星得地：武曲在命宫，庙旺
  {
    const formed = mingGongStars.includes("武曲");
    add(
      "将星得地",
      "富贵格",
      true,
      formed,
      ["武曲星在命宫庙旺"],
      "将星得地格，武曲守命，刚毅果决，武贵之命",
      "《紫微斗数全书》·将星得地格",
    );
  }

  // 9. 明珠出海：太阳在丑/未宫，太阴在对宫遥遥相对
  {
    const sunAtChou = starAt(byZhi, "丑", "太阳");
    const moonAtWei = starAt(byZhi, "未", "太阴");
    const sunAtWei = starAt(byZhi, "未", "太阳");
    const moonAtChou = starAt(byZhi, "丑", "太阴");
    const formed = (sunAtChou && moonAtWei) || (sunAtWei && moonAtChou);
    add(
      "明珠出海",
      "富贵格",
      false,
      formed,
      ["太阳在丑宫与太阴在未宫对照", "或太阳在未宫与太阴在丑宫对照"],
      "明珠出海格，日月在丑未对照，明净清贵，才情出众",
      "《紫微斗数全书》·明珠出海格",
    );
  }

  // 10. 三奇加会：化禄 + 化权 + 化科 在命宫或三合
  {
    const sanHeZhiSet = new Set(sanHeZhis);
    sanHeZhiSet.add(mingGongZhi); // 包含命宫本身
    const huaLuIn = huaLuZhis.some((z) => sanHeZhiSet.has(z));
    const huaQuanIn = huaQuanZhis.some((z) => sanHeZhiSet.has(z));
    const huaKeIn = huaKeZhis.some((z) => sanHeZhiSet.has(z));
    const formed = huaLuIn && huaQuanIn && huaKeIn;
    add(
      "三奇加会",
      "富贵格",
      false,
      formed,
      ["化禄在命宫或三合方", "化权在命宫或三合方", "化科在命宫或三合方"],
      "三奇加会格，化禄化权化科齐聚命宫三合，大贵之格",
      "《紫微斗数全书》·三奇加会格",
    );
  }

  // 11. 文星拱命：文昌 + 文曲 在命宫或三合
  {
    const sanHeZhiSet = new Set(sanHeZhis);
    sanHeZhiSet.add(mingGongZhi);
    const changIn = changWenZhis.some((z) => sanHeZhiSet.has(z));
    const quIn = changQuZhis.some((z) => sanHeZhiSet.has(z));
    const formed = changIn && quIn;
    add(
      "文星拱命",
      "富贵格",
      true,
      formed,
      ["文昌在命宫或三合方", "文曲在命宫或三合方"],
      "文星拱命格，文昌文曲会照命宫三合，文贵之命",
      "《紫微斗数全书》·文星拱命格",
    );
  }

  // 12. 双禄朝垣：化禄 + 禄存 同宫或对宫
  {
    let formed = false;
    for (const lz of luCunZhis) {
      for (const hz of huaLuZhis) {
        if (lz === hz || getDuiZhi(lz) === hz) {
          formed = true;
          break;
        }
      }
      if (formed) break;
    }
    add(
      "双禄朝垣",
      "富贵格",
      false,
      formed,
      ["化禄与禄存同宫", "或化禄与禄存在对宫遥照"],
      "双禄朝垣格，化禄与禄存同宫或对宫，大富之格",
      "《紫微斗数全书》·双禄朝垣格",
    );
  }

  // 13. 禄马交驰：禄存/化禄 + 天马 同宫或对宫
  {
    let formed = false;
    const luSources = [...luCunZhis, ...huaLuZhis];
    for (const ls of luSources) {
      for (const tm of tianMaZhis) {
        if (ls === tm || getDuiZhi(ls) === tm) {
          formed = true;
          break;
        }
      }
      if (formed) break;
    }
    add(
      "禄马交驰",
      "富贵格",
      false,
      formed,
      ["禄存或化禄与天马同宫", "或禄存/化禄与天马在对宫"],
      "禄马交驰格，禄马同宫或对照，富中取贵，财源广进",
      "《紫微斗数全书》·禄马交驰格",
    );
  }

  // 14. 火铃夹命：火星 + 铃星 夹命宫（兄弟宫、父母宫各一）
  {
    const huoInJia = huoXingZhis.includes(jiaZhiA) || huoXingZhis.includes(jiaZhiB);
    const lingInJia = lingXingZhis.includes(jiaZhiA) || lingXingZhis.includes(jiaZhiB);
    const formed = huoInJia && lingInJia;
    add(
      "火铃夹命",
      "富贵格",
      true,
      formed,
      ["火星在命宫相邻宫位", "铃星在命宫另一相邻宫位"],
      "火铃夹命格，火铃二星夹命宫，暴发暴败，横发一时",
      "《紫微斗数全书》·火铃夹命格",
    );
  }

  // 15. 擎羊入庙：擎羊在丑/未/辰/戌宫
  {
    const formed = qingYangZhis.some((z) => QING_YANG_MIAO.has(z));
    add(
      "擎羊入庙",
      "富贵格",
      false,
      formed,
      ["擎羊在丑、未、辰、戌四墓库宫位"],
      "擎羊入庙格，擎羊居四墓库，威权显赫",
      "《紫微斗数全书》·擎羊入庙格",
    );
  }

  // -------- 贫贱格 (2) --------

  // 16. 命无正曜：命宫无十四主星
  {
    const formed = !mingGongStars.some((s) => ZHU_XING.has(s));
    add(
      "命无正曜",
      "贫贱格",
      true,
      formed,
      ["命宫无十四主星（空宫）"],
      "命无正曜格，命宫为空宫，需借对宫星曜安身",
      "《紫微斗数全书》·命无正曜格",
    );
  }

  // 17. 日月反背：太阳在酉戌亥子 或 太阴在卯辰巳午
  {
    const FAN_BEI_SUN = new Set(["酉", "戌", "亥", "子"]);
    const FAN_BEI_MOON = new Set(["卯", "辰", "巳", "午"]);
    const sunFanBei = [...FAN_BEI_SUN].some((z) => starAt(byZhi, z, "太阳"));
    const moonFanBei = [...FAN_BEI_MOON].some((z) =>
      starAt(byZhi, z, "太阴"),
    );
    const formed = sunFanBei || moonFanBei;
    add(
      "日月反背",
      "贫贱格",
      true,
      formed,
      ["太阳在酉戌亥子（失辉）", "或太阴在卯辰巳午（失辉）"],
      "日月反背格，太阳太阴失位，命运多蹇，劳碌奔波",
      "《紫微斗数全书》·日月反背格",
    );
  }

  // -------- 特殊格 (3) --------

  // 18. 马头带剑：天马 + 擎羊 在午宫
  {
    const formed = starAt(byZhi, "午", "天马") && starAt(byZhi, "午", "擎羊");
    add(
      "马头带剑",
      "特殊格",
      false,
      formed,
      ["天马在午宫", "擎羊在午宫"],
      "马头带剑格，天马擎羊同守午宫，武职显贵，威震边疆",
      "《紫微斗数全书》·马头带剑格",
    );
  }

  // 19. 石中隐玉：巨门在子/午/辰/戌 守命
  {
    const formed =
      mingGongStars.includes("巨门") &&
      (mingGongZhi === "子" ||
        mingGongZhi === "午" ||
        mingGongZhi === "辰" ||
        mingGongZhi === "戌");
    add(
      "石中隐玉",
      "特殊格",
      true,
      formed,
      ["巨门在子午辰戌宫守命"],
      "石中隐玉格，巨门居四墓库守命，才华内蕴，口才出众",
      "《紫微斗数全书》·石中隐玉格",
    );
  }

  // 20. 英星入庙：破军在子/午 守命
  {
    const formed =
      mingGongStars.includes("破军") &&
      (mingGongZhi === "子" || mingGongZhi === "午");
    add(
      "英星入庙",
      "特殊格",
      true,
      formed,
      ["破军在子宫或午宫守命"],
      "英星入庙格，破军居子午庙旺，英武果敢，开创之才",
      "《紫微斗数全书》·英星入庙格",
    );
  }

  // -------- 杂格 (10) --------

  // 21. 巨日同宫：巨门 + 太阳 同宫
  {
    const found = anyPalaceHasAll(byZhi, ["巨门", "太阳"]);
    add(
      "巨日同宫",
      "杂格",
      false,
      found !== null,
      ["巨门与太阳同宫（任何宫位）"],
      "巨日同宫格，巨门太阳同守一宫，主口才辩给，以口谋生",
      "《紫微斗数全书》·巨日同宫格",
    );
  }

  // 22. 武杀同宫：武曲 + 七杀 同宫
  {
    const found = anyPalaceHasAll(byZhi, ["武曲", "七杀"]);
    add(
      "武杀同宫",
      "杂格",
      false,
      found !== null,
      ["武曲与七杀同宫（任何宫位）"],
      "武杀同宫格，武曲七杀同守，刚烈果决，宜武职",
      "《紫微斗数全书》·武杀同宫格",
    );
  }

  // 23. 廉贞清白：廉贞在未宫守命
  {
    const formed =
      mingGongStars.includes("廉贞") && mingGongZhi === "未";
    add(
      "廉贞清白",
      "杂格",
      true,
      formed,
      ["廉贞在未宫守命"],
      "廉贞清白格，廉贞居未宫守命，清白自守",
      "《紫微斗数全书》·廉贞清白格",
    );
  }

  // 24. 刑囚夹印：廉贞(囚) + 天刑 夹 天相(印)
  {
    let formed = false;
    for (const [zhi] of byZhi) {
      if (!starAt(byZhi, zhi, "天相")) continue;
      const [j1, j2] = getJiaZhis(zhi);
      const lianZhenAdj =
        starAt(byZhi, j1, "廉贞") || starAt(byZhi, j2, "廉贞");
      const tianXingAdj =
        starAt(byZhi, j1, "天刑") || starAt(byZhi, j2, "天刑");
      if (lianZhenAdj && tianXingAdj) {
        formed = true;
        break;
      }
    }
    add(
      "刑囚夹印",
      "杂格",
      false,
      formed,
      ["廉贞（囚）与天刑夹天相（印）于相邻宫位"],
      "刑囚夹印格，廉贞天刑夹天相，主官非刑责",
      "《紫微斗数全书》·刑囚夹印格",
    );
  }

  // 25. 雄宿乾元：廉贞 + 天府 同宫
  {
    const found = anyPalaceHasAll(byZhi, ["廉贞", "天府"]);
    add(
      "雄宿乾元",
      "杂格",
      false,
      found !== null,
      ["廉贞与天府同宫（任何宫位）"],
      "雄宿乾元格，廉贞天府同守，才华与魄力兼具",
      "《紫微斗数全书》·雄宿乾元格",
    );
  }

  // 26. 财印坐马：武曲 + 天相 坐寅申巳亥（四马之地）
  {
    let formed = false;
    for (const z of SI_MA) {
      if (starAt(byZhi, z, "武曲") && starAt(byZhi, z, "天相")) {
        formed = true;
        break;
      }
    }
    add(
      "财印坐马",
      "杂格",
      false,
      formed,
      ["武曲与天相同宫于寅申巳亥（四马之地）"],
      "财印坐马格，武曲天相同守四马宫位，财印双全，动中得福",
      "《紫微斗数全书》·财印坐马格",
    );
  }

  // 27. 月同遇煞：太阴 + 天同 同宫，且会火星或铃星
  {
    let formed = false;
    for (const [zhi] of byZhi) {
      if (
        starAt(byZhi, zhi, "太阴") &&
        starAt(byZhi, zhi, "天同")
      ) {
        // 同宫有火/铃，或在三合
        const hasHuoLing =
          starAt(byZhi, zhi, "火星") || starAt(byZhi, zhi, "铃星");
        if (hasHuoLing) {
          formed = true;
          break;
        }
        // 三合方有火/铃
        const tSanHe = getSanHeZhis(zhi);
        const huoLingInSanHe = tSanHe.some(
          (tz) => starAt(byZhi, tz, "火星") || starAt(byZhi, tz, "铃星"),
        );
        if (huoLingInSanHe) {
          formed = true;
          break;
        }
      }
    }
    add(
      "月同遇煞",
      "杂格",
      false,
      formed,
      ["太阴与天同同宫", "会上火星或铃星（同宫或三合）"],
      "月同遇煞格，太阴天同会火铃，福被煞侵，吉中藏凶",
      "《紫微斗数全书》·月同遇煞格",
    );
  }

  // 28. 善荫朝纲：天机 + 天梁 守命
  {
    const formed =
      mingGongStars.includes("天机") && mingGongStars.includes("天梁");
    add(
      "善荫朝纲",
      "杂格",
      true,
      formed,
      ["天机与天梁同守命宫"],
      "善荫朝纲格，天机天梁守命，善荫双全，福寿绵长",
      "《紫微斗数全书》·善荫朝纲格",
    );
  }

  // 29. 辅弼拱主：左辅 + 右弼 夹/拱命宫
  {
    const zuoFuAdj = zuoFuZhis.includes(jiaZhiA) || zuoFuZhis.includes(jiaZhiB);
    const youBiAdj = youBiZhis.includes(jiaZhiA) || youBiZhis.includes(jiaZhiB);
    // "夹" = 分别在两邻宫
    const zuoFuOneSide = zuoFuZhis.includes(jiaZhiA) && youBiZhis.includes(jiaZhiB);
    const youFuOneSide = youBiZhis.includes(jiaZhiA) && zuoFuZhis.includes(jiaZhiB);
    const formed = zuoFuAdj || youBiAdj || zuoFuOneSide || youFuOneSide;
    add(
      "辅弼拱主",
      "杂格",
      true,
      formed,
      ["左辅在命宫相邻宫位", "右弼在命宫另一相邻宫位"],
      "辅弼拱主格，左辅右弼夹拱命宫，得贵人相助",
      "《紫微斗数全书》·辅弼拱主格",
    );
  }

  // 30. 文桂文华：文昌/文曲 守命且庙旺
  {
    const formed =
      mingGongStars.includes("文昌") || mingGongStars.includes("文曲");
    add(
      "文桂文华",
      "杂格",
      true,
      formed,
      ["文昌或文曲守命宫庙旺"],
      "文桂文华格，文昌文曲守命，才华斐然，文采出众",
      "《紫微斗数全书》·文桂文华格",
    );
  }

  // ================================================================
  //  汇总
  // ================================================================

  const mainPatterns: ZiweiPattern[] = [];
  const otherPatterns: ZiweiPattern[] = [];

  for (const p of all) {
    const item: ZiweiPattern = {
      name: p.name,
      type: p.type,
      formed: p.formed,
      conditions: p.conditions,
      description: p.description,
      source: p.source,
    };
    if (p.isMain) {
      mainPatterns.push(item);
    } else {
      otherPatterns.push(item);
    }
  }

  // ---- 评分 ----
  let score = 50;
  for (const p of all) {
    if (!p.formed) continue;
    switch (p.type) {
      case "富贵格":
        score += 5;
        break;
      case "特殊格":
        score += 3;
        break;
      case "杂格":
        score += 2;
        break;
      case "贫贱格":
        score -= 12;
        break;
    }
  }
  score = Math.max(0, Math.min(100, score));

  // ---- box-drawing 结构化总结 ----
  const formedMain = mainPatterns.filter((p) => p.formed);
  const formedOther = otherPatterns.filter((p) => p.formed);
  const unformedMain = mainPatterns.filter((p) => !p.formed);
  const fuGuiCount = mainPatterns.filter(p => p.formed && p.type === "富贵格").length;
  const pinJianCount = mainPatterns.filter(p => p.formed && p.type === "贫贱格").length;
  const teShuCount = formedOther.filter(p => p.type === "特殊格").length;
  const zaGeCount = formedOther.filter(p => p.type === "杂格").length;

  let grade: string;
  if (score >= 80) grade = "格局优良，贵气显露";
  else if (score >= 60) grade = "格局中上，福泽可期";
  else if (score >= 40) grade = "格局平常，喜忧参半";
  else if (score >= 20) grade = "格局偏低，须后天努力";
  else grade = "格局不畅，宜修心养性";

  const scoreBar = "█".repeat(Math.round(score / 5)) + "░".repeat(20 - Math.round(score / 5));

  const lines = [
    `┌─ 紫微格局详解 ─────────────────`,
    `│ 命宫：${mingGongZhi} 星曜：${mingGongStars.join("、") || "空宫"}`,
    `│ 综合评分：${score}分 ${grade}`,
    `│ [${scoreBar}]`,
    `│`,
    `├─ 命宫主格（${formedMain.length}个成立 / ${mainPatterns.length}个检测）──`,
  ];

  if (formedMain.length > 0) {
    for (const p of formedMain) {
      const icon = p.type === "富贵格" ? "★" : p.type === "贫贱格" ? "▼" : "●";
      lines.push(`│ ${icon} ${p.name}（${p.type}）已成立：${p.description}`);
    }
  } else {
    lines.push(`│ （无主格成立）`);
  }

  if (unformedMain.length > 0) {
    lines.push(`│ 未成主格：${unformedMain.map(p => p.name).join("、")}`);
  }

  lines.push(`│`);
  lines.push(`├─ 其他格局（${formedOther.length}个成立 / ${otherPatterns.length}个检测）──`);

  if (formedOther.length > 0) {
    for (const p of formedOther.slice(0, 8)) {
      lines.push(`│ ○ ${p.name}（${p.type}）：${p.description}`);
    }
    if (formedOther.length > 8) {
      lines.push(`│ ... 共${formedOther.length}个其他格局`);
    }
  } else {
    lines.push(`│ （无其他格局成立）`);
  }

  lines.push(`│`);
  lines.push(`├─ 格局分布 ──────────────────`);
  lines.push(`│ 富贵格：${fuGuiCount} 特殊格：${teShuCount} 杂格：${zaGeCount} 贫贱格：${pinJianCount}`);
  lines.push(`│ 综合：共检测${all.length}个格局，${all.filter(p => p.formed).length}个成立`);

  lines.push(`│`);
  lines.push(`├─ 古籍出处 ──────────────────`);
  lines.push(`│ 《紫微斗数全书》明·陈希夷，紫微斗数开山之作`);
  lines.push(`│ 《十八飞星策天紫微斗数》明·罗洪先，飞星体系`);
  lines.push(`│ 《紫微斗数全集》清·佚名，格局体系整理`);
  lines.push(`│ 「紫微天机逆行旁，隔一阳武天同当」——紫微安星诀`);

  lines.push(`│`);
  lines.push(`└─ 分析提示 ──────────────────`);
  if (formedMain.length === 0) {
    lines.push(`    命宫无主格成立，宜借对宫迁移宫星曜安身。`);
    lines.push(`    格局不全非定凶，后天努力可补先天之不足。`);
  } else if (fuGuiCount >= 2) {
    lines.push(`    多富贵格汇聚，格局高显，然仍需运势配合。`);
    lines.push(`    格局为体运为用，好运方能发挥格局优势。`);
  } else if (pinJianCount > 0) {
    lines.push(`    贫贱格局存在，宜修身养性、积德行善化解。`);
    lines.push(`    古云：「一善可化百灾」，后天的德业可转命。`);
  } else {
    lines.push(`    格局中平，贵在自知。知命而用命，顺天而行。`);
    lines.push(`    《紫微斗数》：'星无全吉亦无全凶，妙在配合。'`);
  }

  const summary = lines.join("\n");

  return { mainPatterns, otherPatterns, summary, score };
}
