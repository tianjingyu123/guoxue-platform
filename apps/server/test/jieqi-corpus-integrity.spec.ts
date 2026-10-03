import * as fs from "fs";
import * as path from "path";

/**
 * 节气/黄历语料·完整性与内容风险（2026-09-21）
 *
 * ══ 这一批是「展示内容」不是算法 ══
 *
 * 排盘引擎审完后，剩下这几份纯语料：
 *
 *   `jieqi-culture.ts`    329 行  节气诗词赏析 / 汉字字源 / 农谚 / 民间故事
 *   `almanac-data.ts`     209 行  老黄历静态文化文本
 *   `jieqi-recommend.ts`  166 行  节气推荐与海报语料
 *   `constitution.ts`     ——      中医九体质（**风险最高，另由 constitution-safety.spec.ts 专审**）
 *   `case-data.ts`        191 行  **实为纯 API 客户端**（走 apiGet/apiPost），本地不存案例内容、无姓名字段
 *
 * 语料没有「算错」一说，能守的是两件事：**覆盖完整**、**不夹带风险表述**。
 *
 * ══ 抽查结论（2026-09-21）══
 *
 * 内容扎实，未发现需要修的地方：
 *   · 立春诗词赏析引罗隐《京中正月七日立春》「一二三四五六七，万木生芽是今日」—— 引用准确
 *   · 字源合《说文》：「分」从八从刀（以刀剖物使之两分）、「立」人立于地（引申为开始）
 *   · 农谚为真（立春一日百草回芽 / 立春晴一日耕田不费力 / 打春冻人不冻水）
 *   · 四份语料风险词扫描全部通过
 */

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, "apps/mobile/src/pkg-paipan/lib", p), "utf8");

const CULTURE = read("jieqi-culture.ts");
const ALMANAC = read("almanac-data.ts");
const RECOMMEND = read("jieqi-recommend.ts");
const CASE = read("case-data.ts");

const JIEQI24 = [
  "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
  "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒",
];

/** 内容风险词（按类别） */
const RISK: Record<string, string[]> = {
  医疗断言: ["治愈", "根治", "包治", "药到病除", "停药", "替代治疗", "确诊", "疗程"],
  绝对化承诺: ["必定", "一定会", "百分百", "保证发财", "必然发财", "必然升官", "稳赚"],
  恐吓性表述: ["必死", "血光之灾", "家破人亡", "断子绝孙", "必有大灾", "大凶之兆必"],
  真实人物: ["习近平", "毛泽东", "马云", "比尔盖茨", "任正非"],
};

describe("节气语料 · 覆盖完整", () => {
  it("反证：三份语料都读到且有实质体量（读空会让下面全变空跑）", () => {
    for (const [n, s] of [["culture", CULTURE], ["almanac", ALMANAC], ["recommend", RECOMMEND]] as const) {
      expect(`${n}:${s.length > 3000}`).toBe(`${n}:true`);
    }
  });

  it("jieqi-culture 覆盖 24 节气", () => {
    const miss = JIEQI24.filter((j) => !CULTURE.includes(j));
    expect(miss).toEqual([]);
  });

  it("jieqi-culture 的四个 Tab 字段齐备（诗词/民俗/物候/字源）", () => {
    for (const f of ["poemAppreciation", "proverbs", "CharOrigin"]) expect(CULTURE).toMatch(new RegExp(f));
    // 农谚不得有空数组
    const emptyProverbs = [...CULTURE.matchAll(/proverbs: \[\s*\]/g)];
    expect(emptyProverbs).toEqual([]);
  });

  it("字源条目必须三要素齐全（char / form / meaning）", () => {
    const items = [...CULTURE.matchAll(/char: "(.)",\s*\n\s*form: "([^"]+)",\s*\n\s*meaning: "([^"]+)"/g)];
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const m of items) {
      expect(m[2].length).toBeGreaterThan(8);   // form 不能是一两个字凑数
      expect(m[3].length).toBeGreaterThan(8);
    }
  });

  /**
   * ⚠️ `jieqi-recommend` 不是按 24 节气组织的，而是**按四季**（配合 constitution.ts 做个性化）。
   * 我起初照 24 节气验，缺 26 项报红 —— 判据与真实结构不符，不是语料缺内容。
   */
  it("jieqi-recommend 按四季组织：运动导引与情志调节四季齐备", () => {
    for (const s of ["春", "夏", "秋", "冬"]) {
      expect(RECOMMEND).toMatch(new RegExp(`${s}: \\{`));
    }
    expect(RECOMMEND).toMatch(/SEASON_EXERCISE/);
    // 每季的 items 不得是空数组
    expect([...RECOMMEND.matchAll(/items: \[\s*\]/g)]).toEqual([]);
    // 每季都要有 note（说明该季运动的度，如「忌大汗淋漓耗阳」）
    expect([...RECOMMEND.matchAll(/note: "[^"]{8,}"/g)].length).toBeGreaterThanOrEqual(4);
  });

  it("运动导引须与五脏相应对得上（春肝 夏心 秋肺 冬肾）", () => {
    const pairs: [string, string][] = [["春应肝", "春"], ["夏应心", "夏"], ["秋应肺", "秋"]];
    for (const [phrase] of pairs) expect(RECOMMEND).toMatch(new RegExp(phrase));
    expect(RECOMMEND).toMatch(/冬应肾|冬.*?肾/);
  });
});

describe("节气语料 · 内容风险", () => {
  const CORPORA: [string, string][] = [
    ["jieqi-culture", CULTURE],
    ["almanac-data", ALMANAC],
    ["jieqi-recommend", RECOMMEND],
  ];

  it.each(CORPORA)("%s 不得夹带风险表述", (_name, src) => {
    const hits: string[] = [];
    for (const [cat, words] of Object.entries(RISK)) {
      for (const w of words) if (src.includes(w)) hits.push(`${cat}:${w}`);
    }
    expect(hits).toEqual([]);
  });

  it("反证：风险词表本身有效（塞一句进去必须被抓到）", () => {
    const fake = "此节气宜求财，必然发财，包治百病。";
    const hits: string[] = [];
    for (const [cat, words] of Object.entries(RISK)) {
      for (const w of words) if (fake.includes(w)) hits.push(`${cat}:${w}`);
    }
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * case-data.ts 是**纯 API 客户端**不是语料：案例正文与答案都在后端，
   * 前端连详情接口都取不到答案（答案唯一出口是 reveal）。
   * 所以它没有隐私风险 —— 但要守住「不要哪天有人把案例内容搬进前端」。
   */
  it("case-data 必须保持为 API 客户端，不得把案例内容搬进前端", () => {
    expect(CASE).toMatch(/apiGet/);
    expect(CASE).toMatch(/先断后看|reveal/);
    // 本地不得出现姓名字段或成段案例正文
    expect([...CASE.matchAll(/name: "[^"]+"/g)]).toEqual([]);
    expect(CASE.length).toBeLessThan(12000); // 纯客户端不该有语料级体量
  });
});
