import * as fs from "fs";
import * as path from "path";

/**
 * 七政四余·自造表可推导性核验（2026-09-20）
 *
 * `apps/mobile/src/pkg-paipan/lib/qizheng-engine.ts` 的天文层走 astronomy-engine（VSOP87），
 * 不需要我们复核；需要复核的是它自带的那批**查表**。
 * 这些表几乎全都能从更基本的规则推出来，所以不抄参考书，直接推：
 *
 *  ① 二十八宿五行 = 七曜七循环（木金土日月火水），自角宿起，四周共 28 —— 二十八宿的定义性结构
 *  ② 二十八宿距星黄经严格单调、全程只跨 0° 一次、宿距之和恰为 360°
 *  ③ 六个三合局神煞（桃花/将星/华盖/亡神/劫煞/驿马）= 三合局五行在长生十二宫的固定位置
 *     （沐浴/帝旺/墓/临官/绝/病）——同一三合局的三个支必须给出同一个答案
 *  ④ 禄神 = 日干临官位；羊刃 = 禄前一位
 *  ⑤ 十二宫主镜像对称：日月分治午未，其余五曜各守一对，配对支序号和 ≡ 1 (mod 12)
 *  ⑥ 化曜十干横取：每个干都得到十曜的一个排列，且甲年天禄起火星
 *  ⑦ 恩用仇难 = 五行生克四关系，五行各占其一、自身为 null，5×5 全枚举无缺无重
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/qizheng-engine.ts"), "utf8",
);

const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
type WX = "金" | "木" | "水" | "火" | "土";

/** 抽 Record<string,string> 形式的表 */
function rec(name: string): Record<string, string> {
  const m = new RegExp(`const ${name}[^=]*=\\s*\\{([^}]*)\\}`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  const out: Record<string, string> = {};
  for (const p of m[1].matchAll(/(\S+?):\s*"([^"]+)"/g)) out[p[1]] = p[2];
  return out;
}

// ─── 二十八宿 ───
const MANSIONS = [...SRC.matchAll(
  /\{ name: "(.)", j2000: ([\d.]+), wuxing: "(.)", animal: "(.)" \}/g,
)].map((m) => ({ name: m[1], j2000: +m[2], wuxing: m[3], animal: m[4] }));

describe("七政四余 · 二十八宿", () => {
  it("反证：28 宿全解析到了（解析失败会让下面全变空跑）", () => {
    expect(MANSIONS).toHaveLength(28);
    expect(MANSIONS[0].name).toBe("角");
    expect(MANSIONS[27].name).toBe("轸");
    expect(new Set(MANSIONS.map((m) => m.name)).size).toBe(28);
    expect(new Set(MANSIONS.map((m) => m.animal)).size).toBe(28);
  });

  it("① 五行 = 七曜七循环（木金土日月火水），自角宿起四周", () => {
    const CYCLE = ["木", "金", "土", "日", "月", "火", "水"];
    const bad = MANSIONS.filter((m, i) => m.wuxing !== CYCLE[i % 7]).map((m) => `${m.name}=${m.wuxing}`);
    expect(bad).toEqual([]);
  });

  it("② 距星黄经严格单调、只跨 0° 一次、宿距之和为 360°", () => {
    let wraps = 0, sum = 0;
    for (let i = 0; i < 28; i++) {
      const a = MANSIONS[i].j2000, b = MANSIONS[(i + 1) % 28].j2000;
      const gap = (((b - a) % 360) + 360) % 360;
      expect(gap).toBeGreaterThan(0);   // 不得有零宽或倒序的宿
      expect(gap).toBeLessThan(40);     // 最宽的井宿约 30°，超 40° 必是数据错
      if (b < a) wraps++;
      sum += gap;
    }
    expect(wraps).toBe(1);
    expect(sum).toBeCloseTo(360, 6);
  });

  it("②b 觜宿必须是最窄的一宿（真实天象，编造的数据做不出这个特征）", () => {
    const gaps = MANSIONS.map((m, i) => {
      const b = MANSIONS[(i + 1) % 28].j2000;
      return { name: m.name, gap: (((b - m.j2000) % 360) + 360) % 360 };
    }).sort((x, y) => x.gap - y.gap);
    expect(gaps[0].name).toBe("觜");
    expect(gaps[0].gap).toBeLessThan(2);
  });
});

// ─── 三合局神煞 ───
/** 长生十二宫（阳顺）：局五行的长生起点 */
const CS_START: Record<WX, string> = { 木: "亥", 火: "寅", 土: "寅", 金: "巳", 水: "申" };
const CS_ORDER = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];
/** 三合局：三支 → 局五行 */
const SANHE: [string[], WX][] = [
  [["申", "子", "辰"], "水"], [["寅", "午", "戌"], "火"],
  [["巳", "酉", "丑"], "金"], [["亥", "卯", "未"], "木"],
];
const at = (wx: WX, stage: string) =>
  ZHI[(ZHI.indexOf(CS_START[wx]) + CS_ORDER.indexOf(stage)) % 12];

describe("七政四余 · 三合局神煞（全部由长生十二宫推出）", () => {
  const CASES: [string, string][] = [
    ["TAOHUA_OF", "沐浴"], ["JIANGXING_OF", "帝旺"], ["HUAGAI_OF", "墓"],
    ["WANGSHEN_OF", "临官"], ["JIESHA_OF", "绝"], ["YIMA_OF", "病"],
  ];
  it.each(CASES)("%s = 三合局五行的「%s」位", (name, stage) => {
    const T = rec(name);
    expect(Object.keys(T).sort()).toEqual([...ZHI].sort()); // 反证：12 支齐全
    const bad: string[] = [];
    for (const [trio, wx] of SANHE) {
      const want = at(wx, stage);
      for (const z of trio) if (T[z] !== want) bad.push(`${z}(${wx}局)=${T[z]} 应${want}`);
    }
    expect(bad).toEqual([]);
  });

  it("反证：把「沐浴」换成「冠带」去验桃花，四局必须全不匹配（判据不是空跑）", () => {
    const T = rec("TAOHUA_OF");
    const mism = SANHE.filter(([trio, wx]) => T[trio[0]] !== at(wx, "冠带"));
    expect(mism).toHaveLength(4);
  });
});

// ─── 禄神 / 羊刃 / 文昌 ───
describe("七政四余 · 禄神与羊刃", () => {
  const GAN_WX: WX[] = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  const isYang = (i: number) => i % 2 === 0;
  /** 阴干长生起点（逆行） */
  const YIN_START: Record<WX, string> = { 木: "午", 火: "酉", 土: "酉", 金: "子", 水: "卯" };
  const linGuan = (i: number) => {
    const wx = GAN_WX[i], step = CS_ORDER.indexOf("临官");
    return isYang(i)
      ? ZHI[(ZHI.indexOf(CS_START[wx]) + step) % 12]
      : ZHI[(((ZHI.indexOf(YIN_START[wx]) - step) % 12) + 12) % 12];
  };

  it("④ 禄神 = 日干临官位", () => {
    const T = rec("LU_SHEN");
    expect(Object.keys(T).sort()).toEqual([...GAN].sort());
    const bad = GAN.filter((g, i) => T[g] !== linGuan(i)).map((g) => `${g}=${T[g]}`);
    expect(bad).toEqual([]);
  });

  it("④b 羊刃 = 禄前一位（本实现十干一律顺取一位）", () => {
    const L = rec("LU_SHEN"), Y = rec("YANG_REN");
    const bad = GAN.filter((g) => Y[g] !== ZHI[(ZHI.indexOf(L[g]) + 1) % 12]);
    expect(bad).toEqual([]);
  });

  it("文昌符合口诀「甲乙巳午、丙戊申、丁己酉、庚亥、辛子、壬寅、癸卯」（火土同宫）", () => {
    const W = rec("WENCHANG");
    expect(W).toEqual({
      甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申",
      己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯",
    });
    expect(W["丙"]).toBe(W["戊"]); // 火土同宫的结构特征
    expect(W["丁"]).toBe(W["己"]);
  });
});

// ─── 十二宫主 ───
describe("七政四余 · 十二宫主", () => {
  it("⑤ 日月分治午未，其余五曜各守一对，配对支序号和 ≡ 1 (mod 12)", () => {
    const T = rec("PALACE_LORD");
    expect(Object.keys(T).sort()).toEqual([...ZHI].sort());
    expect(T["午"]).toBe("太阳");
    expect(T["未"]).toBe("太阴");
    const bad: string[] = [];
    for (const z of ZHI) {
      const j = (((1 - ZHI.indexOf(z)) % 12) + 12) % 12;
      if (T[z] !== T[ZHI[j]]) bad.push(`${z}(${T[z]}) ↔ ${ZHI[j]}(${T[ZHI[j]]}) 不成对`);
    }
    // 午未这对是日月分治，本就不同曜；其余五对必须同曜
    expect(bad.sort()).toEqual(["午(太阳) ↔ 未(太阴) 不成对", "未(太阴) ↔ 午(太阳) 不成对"].sort());
    // 五曜各守两宫，日月各守一宫，不重不漏
    const counts: Record<string, number> = {};
    for (const z of ZHI) counts[T[z]] = (counts[T[z]] ?? 0) + 1;
    expect(counts).toEqual({ 太阳: 1, 太阴: 1, 水星: 2, 金星: 2, 火星: 2, 木星: 2, 土星: 2 });
  });
});

// ─── 化曜 ───
describe("七政四余 · 化曜十干横取", () => {
  /** 抽 const NAME = ["a","b",…] 形式的字符串数组 */
  const arr = (name: string): string[] => {
    const m = new RegExp(`const ${name} = \\[([^\\]]+)\\]`).exec(SRC);
    if (!m) throw new Error(`${name} 没解析到`);
    return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  };
  const names = arr("HUAYAO_NAMES");
  const stars = arr("HUAYAO_STARS");

  it("反证：两张表都解析到且各 10 项互异", () => {
    expect(names).toHaveLength(10);
    expect(stars).toHaveLength(10);
    expect(new Set(names).size).toBe(10);
    expect(new Set(stars).size).toBe(10);
  });

  it("⑥ 每个干横取后都得到十曜的一个排列（不重不漏）", () => {
    for (let s = 0; s < 10; s++) {
      const got = names.map((_, i) => stars[(s + i) % 10]);
      expect(new Set(got).size).toBe(10);
    }
  });

  it("⑥b 甲年天禄起火星（口诀锚点）", () => {
    expect(names[0]).toBe("天禄");
    expect(stars[0]).toBe("火星");
  });

  /**
   * ⑥c 2026-09-20 查实：这不是随意取舍，而是张果星宗《十干化曜》的标准表。
   * 展开横取全表，甲行恰为口诀「禄火 暗孛 福木 耗金 荫土 贵太阴 刑水 印炁 囚计 权罗」，
   * 十干配十曜本就不含太阳。结论：正确，不改。
   */
  it("⑥c 甲行与《十干化曜》口诀逐格相同，太阳本就不入十曜", () => {
    const jia = names.map((_, i) => stars[i]);
    expect(jia).toEqual(["火星", "月孛", "木星", "金星", "土星", "太阴", "水星", "紫气", "计都", "罗睺"]);
    expect(stars).not.toContain("太阳");
    expect(stars).toContain("太阴");
    // 乙行 = 甲行左移一位（横取的定义），确保不是把十条各写各的
    const yi = names.map((_, i) => stars[(1 + i) % 10]);
    expect(yi[0]).toBe("月孛");
    expect(yi[9]).toBe("火星");
  });

  it("十化曜 ↔ 十神一一对应，不重不漏", () => {
    const sh = rec("HUAYAO_SHISHEN");
    expect(Object.keys(sh).sort()).toEqual([...names].sort());
    expect(new Set(Object.values(sh)).size).toBe(10);
  });
});

// ─── 恩用仇难 ───
describe("七政四余 · 恩用仇难（五行生克）", () => {
  const SHENG = rec("SHENG") as Record<WX, WX>;
  const KE = rec("KE") as Record<WX, WX>;
  const WXS: WX[] = ["金", "木", "水", "火", "土"];

  it("反证：生克两表各 5 项且各自构成 5 阶循环", () => {
    expect(Object.keys(SHENG).sort()).toEqual([...WXS].sort());
    expect(Object.keys(KE).sort()).toEqual([...WXS].sort());
    for (const w of WXS) {
      let c: WX = w;
      for (let i = 0; i < 4; i++) { c = SHENG[c]; expect(c).not.toBe(w); }
      expect(SHENG[c]).toBe(w);
    }
    for (const w of WXS) {
      let c: WX = w;
      for (let i = 0; i < 4; i++) { c = KE[c]; expect(c).not.toBe(w); }
      expect(KE[c]).toBe(w);
    }
    // 我克 = 我生之所生（土克水 ⇐ 土生金、金生水）—— 生克两表互相钉死
    for (const w of WXS) expect(KE[w]).toBe(SHENG[SHENG[w]]);
  });

  it("⑦ 5×5 全枚举：每个度主五行下，四关系各恰好一个五行，自身为 null", () => {
    for (const du of WXS) {
      const en = WXS.find((w) => SHENG[w] === du)!;   // 生我
      const yong = SHENG[du];                          // 我生
      const nan = WXS.find((w) => KE[w] === du)!;      // 克我
      const chou = KE[du];                             // 我克
      const roles = new Map<WX, string>();
      for (const w of WXS) {
        const r = w === en ? "恩" : w === yong ? "用" : w === chou ? "仇" : w === nan ? "难" : null;
        if (r) roles.set(w, r);
      }
      expect([...roles.values()].sort()).toEqual(["仇", "恩", "用", "难"].sort());
      expect(roles.has(du)).toBe(false);
      expect(roles.size).toBe(4);
    }
  });
});

// ─── 大限：行限顺序与年数（★51）───
describe("七政四余 · 大限行限顺序与年数（★51）", () => {
  /**
   * 依据：运限歌诀「命宫十五貌宫十，福德妻宫十一详，官禄十五最高位，迁移止有八年粮，
   * 疾厄七兮共六六，财帛兄弟五年强，田宅子孙并奴仆，四年之半定毫芒」；大限「由命宫开始顺行」。
   * 十二宫按地支逆布，地支顺行时命宫之后依次：相貌 福德 官禄 迁移 疾厄 妻妾 奴仆 男女 田宅 兄弟 财帛。
   *
   * ★51（2026-09-22）：原代码把同一串年数按宫名顺序（地支逆行）安在 财帛→兄弟→…→福德，
   * 宫名与宫位整体反向，并误以为缺的是相貌宫（实缺财帛 5 年）。年数序列本身一直是对的。
   */
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { computeQizheng } = require("../src/modules/paipan/engine/qizheng-engine");
  const ORDER = ["相貌", "福德", "官禄", "迁移", "疾厄", "妻妾", "奴仆", "男女", "田宅", "兄弟", "财帛"];
  const YEARS = [10, 11, 15, 8, 7, 11, 4, 5, 4, 5, 5]; // 奴男田各 4½，整年排作 4/5/4
  const SAMPLES = [
    { year: 1990, month: 3, day: 5, hour: 9, minute: 0, gender: "男" },
    { year: 1988, month: 6, day: 15, hour: 8, minute: 20, gender: "女" },
    { year: 2026, month: 7, day: 3, hour: 21, minute: 45, gender: "男" },
    { year: 1975, month: 12, day: 1, hour: 0, minute: 30, gender: "女" },
  ];

  it("出限后按歌诀顺序走满其余十一宫，年数逐宫对上", () => {
    for (const inp of SAMPLES) {
      const r = computeQizheng(inp);
      const steps = r.daxian.slice(1);
      expect(r.daxian[0].house).toBe("命宫（童限）");
      expect(steps.map((d: any) => d.house).join()).toBe(ORDER.join());
      expect(steps.map((d: any) => d.years).join()).toBe(YEARS.join());
    }
  });

  it("每段大限的宫位地支与盘面该宫一致，且按地支顺行（反证：原逆行写法在这里不成立）", () => {
    for (const inp of SAMPLES) {
      const r = computeQizheng(inp);
      const houseAt = new Map(r.palaces.map((p: any) => [p.zhi, p.house]));
      for (const d of r.daxian.slice(1)) expect(houseAt.get(d.palaceZhi)).toBe(d.house);
      const ZHI = "子丑寅卯辰巳午未申酉戌亥";
      const zs = r.daxian.map((d: any) => ZHI.indexOf(d.palaceZhi));
      for (let i = 1; i < zs.length; i++) expect((zs[i] - zs[i - 1] + 12) % 12).toBe(1);
    }
  });

  it("年段首尾相接，十二宫走完（不再缺一宫、不再止于童限+80）", () => {
    const r = computeQizheng(SAMPLES[0]);
    expect(r.daxian).toHaveLength(12);
    for (let i = 1; i < r.daxian.length; i++) {
      expect(r.daxian[i].startYear).toBe(r.daxian[i - 1].endYear);
      expect(r.daxian[i].startAge).toBe(r.daxian[i - 1].startAge + r.daxian[i - 1].years);
    }
    expect(r.daxianNote).toMatch(/顺行十二宫/);
    expect(r.daxianNote).not.toMatch(/尚未收录/);
  });

  it("结果页仍渲染这句说明", () => {
    const VUE = fs.readFileSync(path.join(ROOT, "apps/mobile/src/pkg-paipan/qizheng/result.vue"), "utf8");
    expect(VUE).toMatch(/natal\.daxianNote/);
  });
});
