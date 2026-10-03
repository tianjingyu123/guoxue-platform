/**
 * 罗盘圈层数据层（2026-09-19 新建）
 *
 * ══ 为什么单独做这一层 ══
 *
 * 罗盘本质上**就是数据**：每一圈是一串文字按固定角度均匀（或按宿度不均匀）排布，
 * 读盘＝拿真方位去查每一圈落在第几格。画法（SVG/CSS/Canvas）只是表现，
 * 真正的内容在圈层定义里。原先前后端各自散落着几段圈层数组，
 * 两边格数与起算点都对不上（详见文件末尾「已知分歧」），故收敛到这里作单一来源。
 *
 * ══ 一条贯穿全文件的纪律 ══
 *
 * **每一圈都必须配一条可机检的不变量**，否则不收进来。
 * 罗盘圈层最容易出的错不是"内容抄错"，而是**格数、起算点、步长**这三样——
 * 它们错了以后每一格看着都像模像样，不比对根本发现不了。
 * 已经吃过的亏：
 *   · 后端 `degreeToShan` 整盘偏一个山（数组首位是壬、公式下标 0 却指子）；
 *   · 前端 `CHUANSHAN_72` 只给 8 个空亡，剩 64 格塞六十甲子，末四条是前四条的副本；
 *   · 透地龙/分金以 0° 起算，而两层实起于壬山初 337.5°。
 * 三处都能被一条计数或求和的不变量当场拦下。
 *
 * ══ 角度约定 ══
 *
 * 全文件用**罗盘方位角**：正北 0°、顺时针递增、正东 90°、正南 180°、正西 270°。
 * `startDeg` 指该圈**第 0 格的起始边**（不是中心）。
 * 二十四山以子山中心 0° 为准，故其起始边在 352.5°。
 */

// ─────────────────────────── 基础序列 ───────────────────────────

/** 二十四山（自壬起，顺时针）。壬山中心 345°、子山中心 0°。 */
export const SHAN_24 = [
  "壬", "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥",
] as const;
export type Shan24 = (typeof SHAN_24)[number];

const GAN = "甲乙丙丁戊己庚辛壬癸";
const ZHI = "子丑寅卯辰巳午未申酉戌亥";

/** 六十甲子 */
export const JIA_ZI_60: string[] = Array.from(
  { length: 60 },
  (_, i) => GAN[i % 10] + ZHI[i % 12],
);

/** 二十四山中心角度。子（下标 1）为 0°。 */
export function shanCenterDeg(idx: number): number {
  return (((idx - 1) * 15) % 360 + 360) % 360;
}

/** 归一化到 [0, 360) */
export const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

// ─────────────────────────── 圈层契约 ───────────────────────────

export type JiXiong = "吉" | "凶" | "平" | "空亡";

export interface RingCell {
  /** 格内文字 */
  text: string;
  /** 该格吉凶（该层有吉凶体系时给出） */
  jiXiong?: JiXiong;
  /** 附注：所属山、纳音、五行局等 */
  note?: string;
}

export interface LuoPanRing {
  id: string;
  /** 圈层名 */
  name: string;
  /** 用途（风水师实际拿它做什么） */
  usage: string;
  /** 挂在哪一针上 */
  attachTo: "地盘正针" | "人盘中针" | "天盘缝针" | "独立";
  /** 第 0 格起始边的方位角 */
  startDeg: number;
  /** 各格。等分层每格 360/cells 度；不等分层由 `spans` 给出 */
  cells: RingCell[];
  /** 不等分层的各格跨度（与 cells 等长，单位：该层自有的"度"，会按总和归一化到 360°） */
  spans?: number[];
  /** 出处 */
  source: string;
}

export interface RingReading {
  ringId: string;
  ringName: string;
  /** 落在第几格（0 基） */
  index: number;
  cell: RingCell;
  /** 该格的方位角区间 */
  range: [number, number];
}

/**
 * 读盘：给定真方位，返回该圈落在哪一格。
 *
 * 等分与不等分走同一条路径——不等分层把 `spans` 按总和归一化，
 * 避免二十八宿这类层被误当成等分处理（宿度本就不等，井 33 度、觜 2 度，
 * 按 28 等分去读，角宿会偏出十几度）。
 */
export function readRing(ring: LuoPanRing, deg: number): RingReading {
  const rel = norm360(deg - ring.startDeg);
  const n = ring.cells.length;

  if (!ring.spans) {
    const per = 360 / n;
    const index = Math.min(n - 1, Math.floor(rel / per));
    const from = norm360(ring.startDeg + index * per);
    return {
      ringId: ring.id, ringName: ring.name, index, cell: ring.cells[index],
      range: [from, norm360(from + per)],
    };
  }

  const total = ring.spans.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const width = (ring.spans[i] / total) * 360;
    if (rel < acc + width || i === n - 1) {
      const from = norm360(ring.startDeg + acc);
      return {
        ringId: ring.id, ringName: ring.name, index: i, cell: ring.cells[i],
        range: [from, norm360(from + width)],
      };
    }
    acc += width;
  }
  /* istanbul ignore next — 上面的 i === n-1 分支已兜底 */
  throw new Error(`readRing: ${ring.id} 未命中，deg=${deg}`);
}

// ─────────────────────────── 各圈层 ───────────────────────────

const cell = (text: string, jiXiong?: JiXiong, note?: string): RingCell => ({ text, jiXiong, note });

/**
 * 先天八卦（伏羲卦位）。乾南坤北、离东坎西。
 *
 * 不变量：**对宫两卦六爻全反**（乾☰ 对 坤☷、离☲ 对 坎☵、震☳ 对 巽☴、兑☱ 对 艮☶）。
 */
export const RING_XIANTIAN_BAGUA: LuoPanRing = {
  id: "xiantian-bagua",
  name: "先天八卦",
  usage: "体，定卦气本位",
  attachTo: "独立",
  startDeg: 337.5, // 坤居正北，其格起始边在 337.5°
  source: "伏羲先天八卦方位图",
  cells: [
    cell("坤", undefined, "北"), cell("震", undefined, "东北"),
    cell("离", undefined, "东"), cell("兑", undefined, "东南"),
    cell("乾", undefined, "南"), cell("巽", undefined, "西南"),
    cell("坎", undefined, "西"), cell("艮", undefined, "西北"),
  ],
};

/**
 * 后天八卦（文王卦位）。坎北离南震东兑西。
 *
 * 不变量：**对宫两卦的洛书数相加恒为 10**（坎1–离9、坤2–艮8、震3–兑7、巽4–乾6）。
 */
export const RING_HOUTIAN_BAGUA: LuoPanRing = {
  id: "houtian-bagua",
  name: "后天八卦",
  usage: "用，配九宫飞星与八宅",
  attachTo: "独立",
  startDeg: 337.5,
  source: "文王后天八卦方位图",
  cells: [
    cell("坎", undefined, "北·洛书1"), cell("艮", undefined, "东北·洛书8"),
    cell("震", undefined, "东·洛书3"), cell("巽", undefined, "东南·洛书4"),
    cell("离", undefined, "南·洛书9"), cell("坤", undefined, "西南·洛书2"),
    cell("兑", undefined, "西·洛书7"), cell("乾", undefined, "西北·洛书6"),
  ],
};

/** 三针共用的二十四山格内容（内容相同，差别只在 startDeg） */
const shan24Cells = (): RingCell[] => SHAN_24.map((s) => cell(s));

/**
 * 地盘正针二十四山——立向、格龙的基准圈。
 *
 * 不变量：**子山中心正北 0°、午山中心正南 180°、卯东 90°、酉西 270°**；
 * 二十四山各占 15° 无重无漏。
 */
export const RING_DIPAN: LuoPanRing = {
  id: "dipan-zhengzhen",
  name: "地盘正针二十四山",
  usage: "立向·格龙（基准）",
  attachTo: "地盘正针",
  startDeg: 337.5, // 壬山起始边；壬中心 345、子中心 0
  source: "通行三合/三元盘",
  cells: shan24Cells(),
};

/**
 * 人盘中针二十四山——盘面**逆时针**偏 7.5°，用于消砂（拨砂）。
 *
 * 逆偏意味着中针的山位中心落在地盘山中心**减** 7.5° 处，
 * 故其起始边 = 地盘起始边 − 7.5°。
 */
export const RING_RENPAN: LuoPanRing = {
  id: "renpan-zhongzhen",
  name: "人盘中针二十四山",
  usage: "消砂·拨砂（逆偏 7.5°）",
  attachTo: "人盘中针",
  startDeg: 330,
  source: "赖公中针法",
  cells: shan24Cells(),
};

/**
 * 天盘缝针二十四山——盘面**顺时针**偏 7.5°，用于纳水。
 *
 * 「缝」即其山位中心正对地盘两山交界之缝。
 */
export const RING_TIANPAN: LuoPanRing = {
  id: "tianpan-fengzhen",
  name: "天盘缝针二十四山",
  usage: "纳水·收水（顺偏 7.5°）",
  attachTo: "天盘缝针",
  startDeg: 345,
  source: "杨公缝针法",
  cells: shan24Cells(),
};

/**
 * 三元龙（天元/地元/人元）。挂地盘正针。
 *
 * 天元龙：子午卯酉乾坤艮巽（四正四维）
 * 地元龙：甲庚壬丙辰戌丑未
 * 人元龙：寅申巳亥乙辛丁癸
 *
 * 不变量：**三元各恰八山**，且每卦宫（三山一宫）内天地人各一。
 */
const TIAN_YUAN = new Set(["子", "午", "卯", "酉", "乾", "坤", "艮", "巽"]);
const DI_YUAN = new Set(["甲", "庚", "壬", "丙", "辰", "戌", "丑", "未"]);
export const RING_SANYUAN_LONG: LuoPanRing = {
  id: "sanyuan-long",
  name: "三元龙",
  usage: "玄空定替卦·辨兼向出卦",
  attachTo: "地盘正针",
  startDeg: 337.5,
  source: "三元玄空",
  cells: SHAN_24.map((s) =>
    cell(TIAN_YUAN.has(s) ? "天元" : DI_YUAN.has(s) ? "地元" : "人元", undefined, `${s}山`),
  ),
};

/**
 * 二十四山净阴净阳（纳甲）。挂地盘正针。
 *
 * 阳：乾甲、坤乙、坎（子）癸申辰、离（午）壬寅戌
 * 阴：艮丙、巽辛、震（卯）庚亥未、兑（酉）丁巳丑
 *
 * 不变量：**阴阳各十二山**。
 */
const JING_YANG = new Set(["乾", "甲", "坤", "乙", "子", "癸", "申", "辰", "午", "壬", "寅", "戌"]);
export const RING_JING_YIN_YANG: LuoPanRing = {
  id: "jing-yin-yang",
  name: "二十四山净阴净阳",
  usage: "三合消砂纳水·辨净阴净阳",
  attachTo: "地盘正针",
  startDeg: 337.5,
  source: "纳甲净阴净阳法",
  cells: SHAN_24.map((s) => cell(JING_YANG.has(s) ? "阳" : "阴", undefined, `${s}山`)),
};

/**
 * 二十四节气配二十四山。挂地盘正针。
 *
 * 不变量：**二分二至恰落四正**——子＝冬至（正北）、午＝夏至（正南）、
 * 卯＝春分（正东）、酉＝秋分（正西）。这一条能一眼拦下整层错位。
 */
const JIE_QI_FROM_ZI = [
  "冬至", "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明",
  "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋",
  "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪",
];
export const RING_JIE_QI: LuoPanRing = {
  id: "jieqi-24",
  name: "二十四节气",
  usage: "配山定时·察节气方位",
  attachTo: "地盘正针",
  startDeg: 337.5,
  // 数组自壬起，而节气自子起，故壬对应的是最后一个（大雪）
  cells: SHAN_24.map((s, i) => cell(JIE_QI_FROM_ZI[(i + 23) % 24], undefined, `${s}山`)),
  source: "通行二十四山配节气",
};

/**
 * 双山三合五行（十二双山，每格 30°）。挂地盘正针。
 *
 * 申子辰＝水局、亥卯未＝木局、寅午戌＝火局、巳酉丑＝金局；
 * 双山以地支为主、天干四维相配：壬子、癸丑、艮寅、甲卯、乙辰、巽巳、
 * 丙午、丁未、坤申、庚酉、辛戌、乾亥。
 *
 * 不变量：**四局各三个双山，合十二**。
 */
const SAN_HE_JU: Record<string, string> = {
  申: "水局", 子: "水局", 辰: "水局",
  亥: "木局", 卯: "木局", 未: "木局",
  寅: "火局", 午: "火局", 戌: "火局",
  巳: "金局", 酉: "金局", 丑: "金局",
};
const SHUANG_SHAN: [string, string][] = [
  ["壬", "子"], ["癸", "丑"], ["艮", "寅"], ["甲", "卯"], ["乙", "辰"], ["巽", "巳"],
  ["丙", "午"], ["丁", "未"], ["坤", "申"], ["庚", "酉"], ["辛", "戌"], ["乾", "亥"],
];
export const RING_SHUANG_SHAN: LuoPanRing = {
  id: "shuangshan-wuxing",
  name: "双山三合五行",
  usage: "三合水法·定四大局",
  attachTo: "地盘正针",
  startDeg: 337.5, // 壬子双山起于壬山初
  cells: SHUANG_SHAN.map(([a, b]) => cell(`${a}${b}`, undefined, SAN_HE_JU[b])),
  source: "三合派四大水局",
};

/**
 * 穿山七十二龙（每龙 5°）。挂地盘正针，起于壬山初 337.5°。
 *
 * 六十甲子 + 十二空亡＝七十二。空亡落在**八干四维**十二山的中格
 * （壬癸艮甲乙巽丙丁坤庚辛乾），十二地支山则各得三条整龙。
 *
 * 珠宝/火坑：天干为**庚丙丁辛**者为珠宝（可坐），余为火坑，空亡不可坐。
 *
 * 不变量：**珠宝 24 / 火坑 36 / 空亡 12 ＝ 72**。
 * 这一条同时验证了数组排布与珠宝规则两者——
 * 前端那份按「每卦界一个空亡」生成，只得 8 个空亡、剩 64 格塞六十甲子，
 * 末四条成了前四条的副本，用本条一测即挂。
 */
const ZHU_BAO_GAN = new Set(["庚", "丙", "丁", "辛"]);

/**
 * 七十二龙的排布。
 *
 * 🔴 2026-09-19 重做。首版**把六十甲子顺排**（甲子、空、乙丑、丙寅…）就当成了穿山表，
 * 实测**十二个地支山全部不符**。
 *
 * 讽刺的是它的计数全对——72 格、空亡 12、实龙 60、无重复、珠宝 24/火坑 36/空亡 12
 * 一条不差，我写的那几条不变量**全是绿的**。前端窗口要接入时顺手打印前六格才撞见。
 *
 * > **不变量对 ≠ 内容对。**
 * > 我先前立的那批不变量全是**计数型**的，它们约束的是「有多少」，
 * > 不约束「每一格放的是什么」。一张顺排表可以让所有计数都成立而每格全错。
 * > 补救办法是加一条**内容型**不变量（见下），这类不变量必须落在
 * > 「某一格与它所在位置的关系」上，而不是落在总数上。
 *
 * ══ 真实排布规律 ══
 *
 * 硬性特征：**地支山的三条龙，其地支必与山相同**（子山三龙皆带「子」）。
 * 由此可反推出完整规律——
 *
 * 六十甲子按地支分成十二组、每组五条（子组＝甲子丙子戊子庚子壬子）。
 * 每组五条**以该地支山为中心**铺开：
 *   · 前一个干维山的第 3 格 ← 组内第 1 条
 *   · 该地支山的三格        ← 组内第 2、3、4 条
 *   · 后一个干维山的第 1 格 ← 组内第 5 条
 * 干维山的第 2 格为空亡（卦界缝）。
 *
 * 校验：壬山＝癸亥·空·甲子，子山＝丙子戊子庚子，癸山＝壬子·空·乙丑——
 * 子组五条（甲子丙子戊子庚子壬子）恰好连续跨越壬末、子三格、癸首。
 *
 * 二十四山自壬起，奇数位（子丑寅…）为地支山、偶数位（壬癸艮…）为干维山，
 * 首尾相接处亥组的末条落回壬山第 1 格。
 */
const CHUAN_SHAN_72_RAW: string[] = (() => {
  const out: string[] = new Array(72).fill("");
  const ZHI_LIST = [...ZHI];
  for (const zhi of ZHI_LIST) {
    // 该地支在六十甲子中的五条，按序
    const group = JIA_ZI_60.filter((gz) => gz[1] === zhi);
    const shanIdx = SHAN_24.indexOf(zhi as never); // 地支山位次（必为奇数）
    const prev = (shanIdx - 1 + 24) % 24;          // 前一个干维山
    const next = (shanIdx + 1) % 24;               // 后一个干维山
    out[prev * 3 + 2] = group[0];                  // 前干维山第 3 格
    out[shanIdx * 3 + 0] = group[1];
    out[shanIdx * 3 + 1] = group[2];
    out[shanIdx * 3 + 2] = group[3];
    out[next * 3 + 0] = group[4];                  // 后干维山第 1 格
  }
  // 干维山第 2 格留空（卦界缝空亡），上面未赋值故已是空串
  return out;
})();

export const RING_CHUAN_SHAN_72: LuoPanRing = {
  id: "chuanshan-72",
  name: "穿山七十二龙",
  usage: "穿山定穴·辨珠宝火坑",
  attachTo: "地盘正针",
  startDeg: 337.5,
  cells: CHUAN_SHAN_72_RAW.map((gz, i) => {
    const shan = SHAN_24[Math.floor(i / 3)];
    if (!gz) return cell("空", "空亡", `${shan}山·卦界缝，不可坐`);
    const ji: JiXiong = ZHU_BAO_GAN.has(gz[0]) ? "吉" : "凶";
    return cell(gz, ji, `${shan}山·${ji === "吉" ? "珠宝（可坐）" : "火坑（不可坐）"}`);
  }),
  source: "三合盘穿山七十二龙",
};

/**
 * 透地六十龙（每龙 6°）。挂地盘正针，起于壬山初 337.5°。
 *
 * 不变量：**六十条全不重复**，且每条恰占 6°（60 × 6 ＝ 360）。
 * 原后端以 0°（子山中心）起算，整层偏 22.5°、近四条龙。
 */
export const RING_TOU_DI_60: LuoPanRing = {
  id: "toudi-60",
  name: "透地六十龙",
  usage: "格龙乘气·定来龙入首",
  attachTo: "地盘正针",
  startDeg: 337.5,
  cells: JIA_ZI_60.map((gz) => cell(gz)),
  source: "三合盘透地六十龙",
};

/**
 * 一百二十分金（每格 3°）。挂地盘正针，起于壬山初 337.5°。
 *
 * 二十四山每山五格，六十甲子走两轮。
 * 每山五格中只取天干为**丙丁庚辛**者为吉（合天星可用），
 * 甲乙戊己壬癸为孤虚空亡。
 *
 * 不变量：**每山恰两格为吉**。
 * 这不是巧合而是算术必然：五格步长与十天干互质地错开，
 * 奇数山落丙丁、偶数山落庚辛，交替出现。写成不变量正好防住起算点被改坏。
 */
const FEN_JIN_JI_GAN = new Set(["丙", "丁", "庚", "辛"]);
export const RING_FEN_JIN_120: LuoPanRing = {
  id: "fenjin-120",
  name: "一百二十分金",
  usage: "分金坐度·辨孤虚",
  attachTo: "地盘正针",
  startDeg: 337.5,
  cells: Array.from({ length: 120 }, (_, i) => {
    const gz = JIA_ZI_60[i % 60];
    const shan = SHAN_24[Math.floor(i / 5)];
    const ji: JiXiong = FEN_JIN_JI_GAN.has(gz[0]) ? "吉" : "凶";
    return cell(gz, ji, `${shan}山第${(i % 5) + 1}格·${ji === "吉" ? "可用" : "孤虚"}`);
  }),
  source: "三合盘一百二十分金",
};

/**
 * 二十八宿（**宿度不等分**）。挂天盘缝针。
 *
 * 宿度本就不等：井宿 33 度、觜宿仅 2 度。按 28 等分（每宿 12.857°）去排，
 * 角宿起点就要偏出十几度，天星拨砂完全用不了——原实现正是等分列出、且无读数。
 *
 * 角宿起于辰位（约 120°），顺行。下列宿度为通行值，合 365 古度，
 * 由 `readRing` 按总和归一化到 360°。
 *
 * 不变量：**二十八宿俱全**，且**井宿跨度 ≥ 觜宿的十倍**（等分实现必挂）。
 */
const XIU_28: [string, number][] = [
  ["角", 12], ["亢", 9], ["氐", 15], ["房", 5], ["心", 5], ["尾", 18], ["箕", 11],
  ["斗", 26], ["牛", 8], ["女", 12], ["虚", 10], ["危", 17], ["室", 16], ["壁", 9],
  ["奎", 16], ["娄", 12], ["胃", 14], ["昴", 11], ["毕", 16], ["觜", 2], ["参", 9],
  ["井", 33], ["鬼", 4], ["柳", 15], ["星", 7], ["张", 18], ["翼", 18], ["轸", 17],
];
export const RING_XIU_28: LuoPanRing = {
  id: "xiu-28",
  name: "二十八宿度",
  usage: "天星拨砂·察宿度吉凶",
  attachTo: "天盘缝针",
  startDeg: 120, // 角宿起于辰位
  cells: XIU_28.map(([n, d]) => cell(n, undefined, `${d}古度`)),
  spans: XIU_28.map(([, d]) => d),
  source: "通行二十八宿宿度",
};

/**
 * 六十四卦（每卦 5.625°）。挂地盘正针，三元盘（蒋盘）核心圈。
 *
 * 按**伏羲先天六十四卦圆图**排：上卦、下卦皆取先天序（乾1兑2离3震4巽5坎6艮7坤8），
 * 圆图以乾居正南、坤居正北。此处以坤为第 0 格、起始边 337.5°（与坤居北相合），
 * 顺时针递增。
 *
 * 不变量：**六十四卦不重不漏**，且**正对两卦六爻全反**（圆图的核心性质）。
 */
/**
 * 八卦爻象位值。**低位＝初爻（下爻）**，阳 1 阴 0。
 * 坤0 震1 坎2 兑3 艮4 离5 巽6 乾7。
 *
 * 这个位序不能随手写反——写反了六十四卦的错卦性质（正对全反）就测不出来，
 * 而那恰是圆图唯一的硬判据。
 */
const TRIGRAM_BITS: Record<string, number> = {
  坤: 0b000, 震: 0b001, 坎: 0b010, 兑: 0b011,
  艮: 0b100, 离: 0b101, 巽: 0b110, 乾: 0b111,
};
const BITS_TO_TRIGRAM = new Map(Object.entries(TRIGRAM_BITS).map(([n, b]) => [b, n]));

/** 六十四卦本名（键＝上卦名＋下卦名） */
const GUA_64_NAME: Record<string, string> = {
  "乾乾": "乾", "乾兑": "履", "乾离": "同人", "乾震": "无妄", "乾巽": "姤", "乾坎": "讼", "乾艮": "遁", "乾坤": "否",
  "兑乾": "夬", "兑兑": "兑", "兑离": "革", "兑震": "随", "兑巽": "大过", "兑坎": "困", "兑艮": "咸", "兑坤": "萃",
  "离乾": "大有", "离兑": "睽", "离离": "离", "离震": "噬嗑", "离巽": "鼎", "离坎": "未济", "离艮": "旅", "离坤": "晋",
  "震乾": "大壮", "震兑": "归妹", "震离": "丰", "震震": "震", "震巽": "恒", "震坎": "解", "震艮": "小过", "震坤": "豫",
  "巽乾": "小畜", "巽兑": "中孚", "巽离": "家人", "巽震": "益", "巽巽": "巽", "巽坎": "涣", "巽艮": "渐", "巽坤": "观",
  "坎乾": "需", "坎兑": "节", "坎离": "既济", "坎震": "屯", "坎巽": "井", "坎坎": "坎", "坎艮": "蹇", "坎坤": "比",
  "艮乾": "大畜", "艮兑": "损", "艮离": "贲", "艮震": "颐", "艮巽": "蛊", "艮坎": "蒙", "艮艮": "艮", "艮坤": "剥",
  "坤乾": "泰", "坤兑": "临", "坤离": "明夷", "坤震": "复", "坤巽": "升", "坤坎": "师", "坤艮": "谦", "坤坤": "坤",
};

/** 六位反序（加一倍法的核心运算） */
const reverse6 = (x: number): number => {
  let r = 0;
  for (let i = 0; i < 6; i++) r |= ((x >> i) & 1) << (5 - i);
  return r;
};

/**
 * 先天序 n（乾1 … 坤64）→ 六爻位值。
 *
 * 邵雍加一倍法给出的关系：`v = 63 − reverse6(n − 1)`。
 * 校验：n=1 → v=63（乾）、n=64 → v=0（坤）、n=2 → v=31（上兑下乾＝夬）。
 */
const xianTianNoToBits = (n: number): number => 63 - reverse6(n - 1);

/**
 * 伏羲六十四卦圆图。
 *
 * 🔴 2026-09-19 重做。首版按「六爻二进制自 0 递增到 63」排，
 * 看着也是六十四卦不重不漏，但**正对两卦不是错卦**——
 * 第 0 格与第 32 格只差一个比特（坤 ↔ 豫），而圆图的定义性质正是六爻全反。
 * 这是「格数对、内容全、排布错」的典型：不测对称性根本看不出来。
 *
 * 正解是两个半圆：
 *   · 乾（先天序 1）居正南、坤（64）居正北；
 *   · 自南顺时针为**阴生**半圆，姤(33) → 坤(64)；
 *   · 自北顺时针为**阳生**半圆，复(32) → 乾(1)。
 * 以正北的坤为第 0 格，顺时针编号：
 *   i=0 → n=64；i∈[1,32] → n=33−i；i∈[33,63] → n=i。
 * 由此 i 与 i+32 恒为错卦（本文件测试逐格验证）。
 */
const GUA_64_CIRCLE: RingCell[] = Array.from({ length: 64 }, (_, i) => {
  const n = i === 0 ? 64 : i <= 32 ? 33 - i : i;
  const v = xianTianNoToBits(n);
  const upper = BITS_TO_TRIGRAM.get((v >> 3) & 0b111)!;
  const lower = BITS_TO_TRIGRAM.get(v & 0b111)!;
  return cell(GUA_64_NAME[`${upper}${lower}`], undefined, `上${upper}下${lower}`);
});

export const RING_GUA_64: LuoPanRing = {
  id: "gua-64",
  name: "六十四卦（先天圆图）",
  usage: "三元易卦风水·蒋盘核心",
  attachTo: "地盘正针",
  // 坤格中心正对正北 0°，每卦 5.625°，故第 0 格起始边在 −2.8125°
  startDeg: 357.1875,
  cells: GUA_64_CIRCLE,
  source: "伏羲六十四卦圆图",
};

// ─────────────────────────── 盘制 ───────────────────────────

export type PlateType = "sanyuan" | "sanhe" | "zonghe" | "jianyi";

export const ALL_RINGS: LuoPanRing[] = [
  RING_XIANTIAN_BAGUA, RING_HOUTIAN_BAGUA,
  RING_DIPAN, RING_RENPAN, RING_TIANPAN,
  RING_SANYUAN_LONG, RING_JING_YIN_YANG, RING_JIE_QI, RING_SHUANG_SHAN,
  RING_CHUAN_SHAN_72, RING_TOU_DI_60, RING_FEN_JIN_120,
  RING_XIU_28, RING_GUA_64,
];

/**
 * 各盘制的圈层组成。
 *
 * · **三合盘（杨公盘）**——主特征是三层二十四山（正针/中针/缝针），
 *   配穿山、透地、分金、双山五行；不含易卦层。
 * · **三元盘（蒋盘·易盘）**——主特征是六十四卦圈，一般只有地盘一层二十四山。
 * · **综合盘**——三合三元兼备，内容最全。
 * · **简易盘**——只留二十四山与度数，快速定向。
 */
export const PLATE_RINGS: Record<PlateType, string[]> = {
  sanhe: [
    "houtian-bagua", "dipan-zhengzhen", "renpan-zhongzhen", "tianpan-fengzhen",
    "jing-yin-yang", "shuangshan-wuxing", "chuanshan-72", "toudi-60", "fenjin-120", "xiu-28",
  ],
  sanyuan: [
    "xiantian-bagua", "houtian-bagua", "dipan-zhengzhen", "sanyuan-long", "gua-64", "jieqi-24",
  ],
  zonghe: ALL_RINGS.map((r) => r.id),
  jianyi: ["houtian-bagua", "dipan-zhengzhen"],
};

export function ringsOf(plate: PlateType): LuoPanRing[] {
  const ids = new Set(PLATE_RINGS[plate]);
  return ALL_RINGS.filter((r) => ids.has(r.id));
}

/** 读整盘：给定真方位与盘制，返回该盘每一圈的读数 */
export function readPlate(plate: PlateType, trueDeg: number): RingReading[] {
  return ringsOf(plate).map((r) => readRing(r, trueDeg));
}

/**
 * ══ 已知分歧与未收录 ══
 *
 * **二十四天星**（挂天盘缝针）：各家所列星名出入较大，未取得可互证的两个来源，
 * 故**不收**。宁可缺一层，也不摆一层看着像、实际编的。
 *
 * **透地六十龙的吉凶（珠宝/火坑）**：七十二龙的珠宝火坑判据明确（庚丙丁辛），
 * 六十龙一路说法不一，此处只给龙名不给吉凶。
 *
 * **六十四卦圆图的旋转起点**：本实现以坤居正北、乾居正南（伏羲圆图通例）。
 * 蒋盘实物另有以特定卦对准某山的做法，待取得实盘基准后再定，
 * 当前实现的**卦序与对宫全反性质**是对的，只是整体旋转量待核。
 */
