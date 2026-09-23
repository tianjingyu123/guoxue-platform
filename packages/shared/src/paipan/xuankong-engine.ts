/**
 * 玄空飞星核心算法（2026-09-18 迁入 shared）
 *
 * 迁移缘由不是「怕漂移」，是**后端那份算错了**：
 * `apps/server/.../calculators/xuankong.calculator.ts` 按坐山/朝向**本身**的阴阳定顺逆
 * （`shanInfo.yinYang === "阳" ? "顺" : "逆"`），而正确规则是看
 * **入中那颗星所属之宫、与坐山同元龙的那个山**的阴阳。
 *
 * 拿教科书标准案例一比即现形：八运子山午向应为「双星到向」（山 8 与向 8 同会向方离宫）——
 * 前端算得正是如此，后端却算成「旺山旺向」；八组坐向逐宫比对，七组山向盘不一致。
 * 所以这里迁的是**前端那份（正确的）**，后端的错误实现作废。
 *
 * 本文件只含掐指排盘所需的部分；年月日时紫白飞星依赖节气，留在前端。
 */

/** 二十四山（自北顺时针） */
export const XK_MOUNTAINS = [
  "壬", "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥",
] as const;

export type XkMountain = (typeof XK_MOUNTAINS)[number];

/** 每山所属卦宫（洛书数） */
export const XK_MOUNTAIN_PALACE: number[] = [
  1, 1, 1, 8, 8, 8, 3, 3, 3, 4, 4, 4,
  9, 9, 9, 2, 2, 2, 7, 7, 7, 6, 6, 6,
];

/** 每山阴阳（true=阳→顺飞） */
export const XK_MOUNTAIN_YANG: boolean[] = [
  true, false, false, false, true, true, true, false, false, false, true, true,
  true, false, false, false, true, true, true, false, false, false, true, true,
];

/** 每山元龙：0=地元 1=天元 2=人元 */
export const XK_MOUNTAIN_YUAN: number[] = [
  0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2,
  0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2,
];

/** 卦宫（洛书数）→ 三山 [地元, 天元, 人元] 的山索引 */
export const XK_PALACE_MOUNTAINS: Record<number, [number, number, number]> = {
  1: [0, 1, 2],    // 坎 壬子癸
  8: [3, 4, 5],    // 艮 丑艮寅
  3: [6, 7, 8],    // 震 甲卯乙
  4: [9, 10, 11],  // 巽 辰巽巳
  9: [12, 13, 14], // 离 丙午丁
  2: [15, 16, 17], // 坤 未坤申
  7: [18, 19, 20], // 兑 庚酉辛
  6: [21, 22, 23], // 乾 戌乾亥
};

/**
 * 替卦口诀：
 * 子癸并甲申贪狼一路行；壬卯乙未坤五位为巨门；乾亥辰巽巳连戌武曲名；
 * 酉辛丑艮丙天星说破军；寅午庚丁上右弼四星临
 */
const TI_TABLE: Record<string, number> = {
  子: 1, 癸: 1, 甲: 1, 申: 1,
  壬: 2, 卯: 2, 乙: 2, 未: 2, 坤: 2,
  戌: 6, 乾: 6, 亥: 6, 辰: 6, 巽: 6, 巳: 6,
  酉: 7, 辛: 7, 丑: 7, 艮: 7, 丙: 7,
  寅: 9, 午: 9, 庚: 9, 丁: 9,
};

/** 洛书宫位飞泊偏移 */
const palaceOffset = (palace: number): number => (palace - 5 + 9) % 9;

/** 星入中飞泊：返回 palace(1-9) → 星值 */
export function xkFlyStar(center: number, forward: boolean): Record<number, number> {
  const out: Record<number, number> = {};
  for (let p = 1; p <= 9; p++) {
    const off = palaceOffset(p);
    out[p] = forward
      ? ((center - 1 + off) % 9) + 1
      : ((((center - 1 - off) % 9) + 9) % 9) + 1;
  }
  return out;
}

export interface XuankongChart {
  period: number;
  sitting: string;
  facing: string;
  sittingPalace: number;
  facingPalace: number;
  /** palace(1-9) → 星 */
  yunPan: Record<number, number>;
  shanPan: Record<number, number>;
  xiangPan: Record<number, number>;
  shanCenter: number;
  shanForward: boolean;
  xiangCenter: number;
  xiangForward: boolean;
  geju: string;
  gejuGood: boolean;
}

/**
 * 排玄空飞星盘。
 *
 * @param period     元运（1-9）
 * @param sittingIdx 坐山在 XK_MOUNTAINS 中的索引
 * @param useTi      是否起替卦（替卦是特定山向才起的特殊做法，默认不起）
 */
export function computeXuankongChart(period: number, sittingIdx: number, useTi = false): XuankongChart {
  const facingIdx = (sittingIdx + 12) % 24;
  const sittingPalace = XK_MOUNTAIN_PALACE[sittingIdx];
  const facingPalace = XK_MOUNTAIN_PALACE[facingIdx];
  const yuan = XK_MOUNTAIN_YUAN[sittingIdx];
  const yunPan = xkFlyStar(period, true); // 运盘始终顺飞

  /**
   * 定入中星与顺逆。
   *
   * **这里就是后端那份算错的地方**：顺逆不看坐山/朝向本身的阴阳，
   * 而看入中这颗星所属之宫里、与坐山同元龙的那一个山的阴阳。
   */
  const resolve = (palace: number, refMountainIdx: number): { center: number; forward: boolean } => {
    const star = yunPan[palace];
    if (star === 5) {
      // 五无本宫：以本山阴阳定顺逆；下卦取 5，替卦取本山替星
      const c = useTi ? (TI_TABLE[XK_MOUNTAINS[refMountainIdx]] ?? 5) : 5;
      return { center: c, forward: XK_MOUNTAIN_YANG[refMountainIdx] };
    }
    const mIdx = XK_PALACE_MOUNTAINS[star][yuan];
    const center = useTi ? (TI_TABLE[XK_MOUNTAINS[mIdx]] ?? star) : star;
    return { center, forward: XK_MOUNTAIN_YANG[mIdx] };
  };

  const s = resolve(sittingPalace, sittingIdx);
  const x = resolve(facingPalace, facingIdx);
  const shanPan = xkFlyStar(s.center, s.forward);
  const xiangPan = xkFlyStar(x.center, x.forward);

  // 格局：当令星到山到向为旺山旺向，反之为上山下水
  let geju = "平常格局";
  let gejuGood = false;
  const shanAtSit = shanPan[sittingPalace] === period;
  const shanAtFace = shanPan[facingPalace] === period;
  const xiangAtFace = xiangPan[facingPalace] === period;
  const xiangAtSit = xiangPan[sittingPalace] === period;
  if (shanAtSit && xiangAtFace) { geju = "旺山旺向"; gejuGood = true; }
  else if (shanAtFace && xiangAtFace) { geju = "双星会向"; gejuGood = true; }
  else if (shanAtSit && xiangAtSit) { geju = "双星会坐"; gejuGood = false; }
  else if (shanAtFace && xiangAtSit) { geju = "上山下水"; gejuGood = false; }

  return {
    period,
    sitting: XK_MOUNTAINS[sittingIdx],
    facing: XK_MOUNTAINS[facingIdx],
    sittingPalace,
    facingPalace,
    yunPan,
    shanPan,
    xiangPan,
    shanCenter: s.center,
    shanForward: s.forward,
    xiangCenter: x.center,
    xiangForward: x.forward,
    geju,
    gejuGood,
  };
}

/** 三元九运：按年份定当运（每运二十年） */
export function xkYuanYunOf(year: number): number {
  // 1864 起一运，每 20 年一运，九运一循环（180 年）
  const n = Math.floor((year - 1864) / 20) % 9;
  return ((n % 9) + 9) % 9 + 1;
}

/** 元运起止年份，如「2024-2043」 */
export function xkYunRange(year: number): string {
  const start = 1864 + Math.floor((year - 1864) / 20) * 20;
  return `${start}-${start + 19}`;
}

/** 洛书宫号 → 宫名与方位 */
export const XK_PALACE_INFO: Record<number, { name: string; direction: string }> = {
  1: { name: "坎", direction: "正北" },
  2: { name: "坤", direction: "西南" },
  3: { name: "震", direction: "正东" },
  4: { name: "巽", direction: "东南" },
  5: { name: "中", direction: "中央" },
  6: { name: "乾", direction: "西北" },
  7: { name: "兑", direction: "正西" },
  8: { name: "艮", direction: "东北" },
  9: { name: "离", direction: "正南" },
};
