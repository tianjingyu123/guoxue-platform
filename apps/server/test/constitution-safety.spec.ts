import * as fs from "fs";
import * as path from "path";

/**
 * 中医体质养生·内容安全与自洽（2026-09-21）
 *
 * ══ 为什么单独审这一份 ══
 *
 * 排盘那些语料错了只是「算得不准」，**这一份涉及健康建议**，错了会让人照着吃。
 * 所以在「展示内容」这一批里优先审它。
 *
 * 依据是真标准：《中医体质分类与判定》（中华中医药学会 ZYYXH/T157-2009）九分法。
 * 九个 key 与标准一一对应（平和/气虚/阳虚/阴虚/痰湿/湿热/血瘀/气郁/特禀）。
 *
 * ══ 审出并已处置的两件事 ══
 *
 * **① 宜食清单里混进了中药材**
 *
 *   · 气虚质「**黄芪**」—— 不在《既是食品又是中药材的物质目录》（卫法监发〔2002〕51 号）内，
 *     属中药材，需辨证与剂量。已剔除；余下山药/小米/大枣/鸡肉/南瓜 均为药食同源，补气已足。
 *   · 血瘀质「**桃仁**」—— 同样不在目录内，且**含苦杏仁苷有小毒**，
 *     生活中易与「核桃仁」混淆误食。已剔除；余下山楂/黑木耳/红糖/玫瑰花茶/醋 均为药食同源的活血之品。
 *
 * **② 免责声明两处口径不一致**
 *
 *   同一份 `constitution.ts` 被两个页面消费：
 *     `jieqi/components/health-module.vue` —— 有「养生内容仅供参考，不构成医疗建议。身体不适请及时就医。」
 *     `wuyunliuqi/index.vue`               —— **没有**，却同样展示宜食/忌食/起居/运动/情志五项调养要点
 *   已给后者补上同一句。健康类内容不允许两处口径不同。
 *
 * ══ 通过的部分 ══
 *
 * · 敏感气候因子与体质**逐条自洽**（可推导）：
 *   气虚=寒风（卫外不固）、阳虚=寒湿（阳不化湿）、阴虚=热燥（阴不制阳）、
 *   痰湿=湿、湿热=湿热、血瘀=寒（寒则血凝）、特禀=风燥（过敏原当令）、平和质为空
 * · 24 节气气候标签全覆盖且走势合理（春温风 → 夏热湿 → 秋燥凉 → 冬寒）
 * · 无医疗断言：不出现诊断、治病、剂量、停药、替代治疗一类表述
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/constitution.ts"), "utf8");

const NINE: [string, string][] = [
  ["pinghe", "平和质"], ["qixu", "气虚质"], ["yangxu", "阳虚质"], ["yinxu", "阴虚质"],
  ["tanshi", "痰湿质"], ["shire", "湿热质"], ["xueyu", "血瘀质"], ["qiyu", "气郁质"], ["tebing", "特禀质"],
];
const JIEQI24 = [
  "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
  "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒",
];

/** 解析每个体质的 sensitive / favorFoods / avoidFoods */
function parseItems() {
  const blk = SRC.slice(SRC.indexOf("export const CONSTITUTIONS"), SRC.indexOf("export function constitutionOf"));
  const out: { key: string; name: string; sensitive: string[]; fav: string[]; avoid: string[] }[] = [];
  for (const [key] of NINE) {
    const at = blk.indexOf(`key: "${key}"`);
    if (at < 0) continue;
    const seg = blk.slice(at, at + 1600);
    const grab = (field: string) => {
      const m = new RegExp(`${field}: \\[([^\\]]*)\\]`).exec(seg);
      return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
    };
    const nm = /name: "([^"]+)"/.exec(seg);
    out.push({ key, name: nm ? nm[1] : "", sensitive: grab("sensitive"), fav: grab("favorFoods"), avoid: grab("avoidFoods") });
  }
  return out;
}
const ITEMS = parseItems();

describe("中医体质 · 九分法与标准对应", () => {
  it("反证：九种体质全解析到（解析失败会让下面全变空跑）", () => {
    expect(ITEMS).toHaveLength(9);
    expect(ITEMS.map((x) => x.key)).toEqual(NINE.map(([k]) => k));
    for (const [key, name] of NINE) {
      expect(`${key}:${ITEMS.find((x) => x.key === key)!.name}`).toBe(`${key}:${name}`);
    }
  });

  it("依据必须写明是 ZYYXH/T157-2009 九分法（不是自创分类）", () => {
    expect(SRC).toMatch(/中医体质分类与判定/);
    expect(SRC).toMatch(/ZYYXH\/T157-2009/);
  });
});

describe("中医体质 · 敏感气候因子自洽（可推导）", () => {
  const EXPECT: Record<string, string[]> = {
    pinghe: [],                  // 平和质无偏颇
    qixu: ["寒", "风"],          // 气虚则卫外不固，易受风寒
    yangxu: ["寒", "湿"],        // 阳虚畏寒，阳不化湿
    yinxu: ["热", "燥"],         // 阴不制阳，津液不足畏燥
    tanshi: ["湿"],              // 痰湿内盛，外湿助之
    shire: ["湿", "热"],         // 湿热内蕴
    xueyu: ["寒"],               // 寒则血凝
    qiyu: ["湿"],                // 阴雨气压低，气郁加重
    tebing: ["风", "燥"],        // 过敏原随风燥当令
  };

  it.each(ITEMS.map((x) => [x.name, x.key] as [string, string]))("%s 的敏感因子与体质机理相符", (_n, key) => {
    const got = ITEMS.find((x) => x.key === key)!.sensitive;
    expect(new Set(got)).toEqual(new Set(EXPECT[key]));
  });

  it("寒热不得同时敏感、燥湿不得同时敏感（同一体质不会两头都畏）", () => {
    const bad: string[] = [];
    for (const it of ITEMS) {
      const s = new Set(it.sensitive);
      if (s.has("寒") && s.has("热")) bad.push(`${it.name} 同时畏寒畏热`);
      if (s.has("燥") && s.has("湿")) bad.push(`${it.name} 同时畏燥畏湿`);
    }
    expect(bad).toEqual([]);
  });
});

describe("中医体质 · 节气气候表", () => {
  const CLIMATE = (() => {
    const blk = /JIEQI_CLIMATE: Record<string, ClimateTag\[\]> = \{([\s\S]*?)\n\}/.exec(SRC)![1];
    const o: Record<string, string[]> = {};
    for (const m of blk.matchAll(/(\S+?): \[([^\]]*)\]/g)) {
      o[m[1]] = [...m[2].matchAll(/"(.)"/g)].map((x) => x[1]);
    }
    return o;
  })();

  it("24 节气全覆盖，每个节气 1–3 个气候因子", () => {
    expect(Object.keys(CLIMATE).sort()).toEqual([...JIEQI24].sort());
    for (const [jq, tags] of Object.entries(CLIMATE)) {
      expect(`${jq}:${tags.length >= 1 && tags.length <= 3}`).toBe(`${jq}:true`);
      for (const t of tags) expect(["寒", "热", "温", "凉", "燥", "湿", "风"]).toContain(t);
    }
  });

  it("四季走势合理：夏三月必含热、冬三月必含寒、秋三月必含燥", () => {
    const bad: string[] = [];
    for (const jq of ["立夏", "小满", "芒种", "夏至", "小暑", "大暑"]) {
      if (!CLIMATE[jq].includes("热")) bad.push(`${jq} 不含热`);
    }
    for (const jq of ["立冬", "小雪", "大雪", "冬至", "小寒", "大寒"]) {
      if (!CLIMATE[jq].includes("寒")) bad.push(`${jq} 不含寒`);
    }
    for (const jq of ["立秋", "处暑", "白露", "秋分", "寒露", "霜降"]) {
      if (!CLIMATE[jq].includes("燥")) bad.push(`${jq} 不含燥`);
    }
    expect(bad).toEqual([]);
  });

  it("同一节气不得既寒又热（气候标签自相矛盾）", () => {
    const bad = Object.entries(CLIMATE)
      .filter(([, t]) => t.includes("寒") && t.includes("热"))
      .map(([jq]) => jq);
    expect(bad).toEqual([]);
  });
});

describe("中医体质 · 内容安全", () => {
  /** 已知不在《既是食品又是中药材的物质目录》（卫法监发〔2002〕51 号）的品目 */
  const NOT_FOOD = ["黄芪", "桃仁", "当归", "人参", "附子", "麻黄", "细辛", "半夏", "川乌", "草乌", "番泻叶", "大黄"];

  it("宜食/忌食清单里不得出现中药材（黄芪、桃仁曾混入，已剔除）", () => {
    const hits: string[] = [];
    for (const it of ITEMS) {
      for (const f of [...it.fav, ...it.avoid]) {
        for (const drug of NOT_FOOD) if (f.includes(drug)) hits.push(`${it.name}：${f}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("每个体质的宜食至少 3 项（剔除药材后不能只剩一两样）", () => {
    for (const it of ITEMS) expect(`${it.name}宜食${it.fav.length}项`).toBe(`${it.name}宜食${Math.max(it.fav.length, 3)}项`);
  });

  it("不得出现医疗断言（诊断/治疗/剂量/停药/替代治疗）—— 只查代码，注释讲理由不算", () => {
    const FORBIDDEN = [
      "治愈", "根治", "药到病除", "停药", "代替药物", "替代治疗", "包治",
      "诊断为", "确诊", "剂量", "服用剂量", "每日三次", "疗程",
    ];
    // 剥注释：剔除黄芪那条注释里写了「需辨证与剂量」，那是解释为什么剔除，不是给用户的断言
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(FORBIDDEN.filter((w) => code.includes(w))).toEqual([]);
    // 反证：注释里确实有「剂量」二字，说明剥注释这步真的生效了
    expect(SRC).toMatch(/剂量/);
  });

  it("两个消费页面都必须有免责声明（wuyunliuqi 曾缺）", () => {
    const pages = [
      "apps/mobile/src/pkg-paipan/jieqi/components/health-module.vue",
      "apps/mobile/src/pkg-paipan/wuyunliuqi/index.vue",
    ];
    for (const p of pages) {
      const v = fs.readFileSync(path.join(ROOT, p), "utf8");
      expect(`${path.basename(p)}:${/不构成医疗建议/.test(v)}`).toBe(`${path.basename(p)}:true`);
      expect(`${path.basename(p)}:${/及时就医/.test(v)}`).toBe(`${path.basename(p)}:true`);
    }
  });

  it("反证：把一味药材塞回清单，上面那条必须抓到", () => {
    const fake = { name: "测试质", fav: ["山药", "黄芪"], avoid: [] };
    const hits = [...fake.fav, ...fake.avoid].filter((f) => NOT_FOOD.some((d) => f.includes(d)));
    expect(hits).toEqual(["黄芪"]);
  });
});
