import * as fs from "fs";
import * as path from "path";
import { generateNames, namingCharPool } from "../src/modules/paipan/engine/qiming-engine";

/**
 * 起名字库扩充（2026-09-21）闸门
 *
 * 原字库 159 字（手写），按喜用五行/性别筛完只剩几十字，候选翻来覆去；
 * shared 的 6500 字底池又缺语义层，会生成「张筲匾」这种合规却荒唐的名字。
 * 现在：《通用规范汉字表》一二级 6500 字逐字标注（宜/可/忌、人名读音、性别、风格、字义），
 * 起名候选只取「宜」，定字放行「可」。标注依据见 data/naming-lexicon.json 的 _meta。
 *
 * 这里守的是**结构与口径**，不是逐字内容（逐字内容已由两遍独立标注比对：三档一致 92.4%、宜⇄忌对冲 0）。
 */
const ROOT = path.resolve(__dirname, "../../..");
const LEX = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/server/src/modules/paipan/engine/data/naming-lexicon.json"), "utf8")).chars as Record<string, [string, string, string, string[], string, string]>;
const GUIFAN = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/shared/src/paipan/data/guifan-hanzi.json"), "utf8"));
const suit = (c: string) => LEX[c]?.[0];

const BASE = { year: 2026, month: 3, day: 5, hour: 9, minute: 0 } as const;
const run = (o: Record<string, unknown>) =>
  generateNames({ surname: "张", gender: "男", nameType: "double", style: "classic", ...BASE, ...o } as any);
const given = (c: { chars: { char: string }[] }, surname = "张") => c.chars.slice([...surname].length).map((x) => x.char);

describe("起名字库 · 数据", () => {
  it("覆盖《通用规范汉字表》一二级全部 6500 字，字段取值合法", () => {
    const pool = [...GUIFAN.level1, ...GUIFAN.level2];
    expect(pool.length).toBe(6500);
    const bad = pool.filter((c: string) => {
      const e = LEX[c];
      return !e || !["宜", "可", "忌"].includes(e[0]) || !e[1] || !["m", "f", "u"].includes(e[2]) || !e[4];
    });
    expect(bad.join("")).toBe("");
  });

  it("三档都有且规模合理（宜≥900：比原 159 字大一个量级；忌≥2000：日常字与负面字确实占多数）", () => {
    const n = { 宜: 0, 可: 0, 忌: 0 } as Record<string, number>;
    for (const e of Object.values(LEX)) n[e[0]]++;
    expect(n.宜).toBeGreaterThanOrEqual(900);
    expect(n.可).toBeGreaterThanOrEqual(1500);
    expect(n.忌).toBeGreaterThanOrEqual(2000);
  });

  it("现代热门起名字全部为宜（其中昀玥在典籍里一次都没出现，不能因古人没用过就排除）", () => {
    const hot = "梓涵轩宇浩然若瑶晨嘉睿萱芷懿彦昀珩玥绾黛";
    expect([...hot].filter((c) => suit(c) !== "宜").join("")).toBe("");
  });

  it("负面、器物、专用字全部为忌——包括此前生成过的怪名用字", () => {
    const ji = "丧毒劣死病奸盗骗懒丑毯盆桶匾筲锕氘奴婢妾娼鬼煞屎尿屁癌瘤疮";
    expect([...ji].filter((c) => suit(c) !== "忌").join("")).toBe("");
    // 「张喃复、张筲匾、张茎毯、张巽绒、张棰驭、张跞苇……」这批合规却荒唐的用字，一个都不能是宜
    expect([..."筲匾茎毯巽绒棰驭跞跆觇楮"].filter((c) => suit(c) === "宜").join("")).toBe("");
  });

  it("多音字给出人名读音（拼音表每字只存一个读音，长只有 zhǎng）", () => {
    expect(LEX["长"][1]).toBe("cháng");
    expect(LEX["乐"][1]).toBe("lè");
    expect(LEX["朝"][1]).toBe("zhāo");
    expect(LEX["曾"][1]).toBe("zēng");
  });

  it("原 158 个手写精选字全部保留为宜，且排在字库最前（手写字义/诗句优先于生成）", () => {
    const pool = namingCharPool();
    expect(pool.length).toBeGreaterThanOrEqual(900);
    // 手写 159 字里「垚」是规范表三级字，不在 6500 字标注范围内，但手写字照样保留
    const first = pool.slice(0, 159).map((p) => p.char);
    expect(first.slice(0, 3).join("")).toBe("林森楷");
    expect(first.includes("垚")).toBe(true);
    expect(first.filter((c) => c in LEX && suit(c) !== "宜").join("")).toBe("");
    expect(pool.find((p) => p.char === "松")!.poem!.source).toContain("论语");
  });

  it("出处只来自手写字；生成字不附自动出处（典籍四字片段脱离语境会意思相反，如「贤不必以」）", () => {
    const pool = namingCharPool();
    const auto = pool.slice(159).filter((p) => p.poem).map((p) => p.char);
    expect(auto.join("")).toBe("");
    expect(pool.find((p) => p.char === "贤")?.poem).toBeUndefined();
  });
});

describe("起名字库 · 引擎", () => {
  it("候选只用「宜」字", () => {
    for (const style of ["classic", "steady", "fresh", "auspicious"]) for (const gender of ["男", "女"]) {
      const r = run({ style, gender });
      expect(r.candidates.length).toBe(24);
      const off = r.candidates.flatMap((c) => given(c)).filter((c) => suit(c) !== "宜");
      expect(off.join("")).toBe("");
    }
  });

  it("定字放行「可」字（用户自选的字不该被字库挡住），但其余位置仍只用宜", () => {
    expect(suit("省")).toBe("可");
    const r = run({ fixChar: "省", fixPosition: "last" });
    // 反证：「同字最多 2 次」上限若把定字也算进去，每次只剩 2 个候选（实测踩过）
    expect(r.candidates.length).toBeGreaterThanOrEqual(20);
    for (const c of r.candidates) {
      const g = given(c);
      expect(g[1]).toBe("省");
      expect(suit(g[0])).toBe("宜");
    }
  });

  it("同一个字在一次结果里最多出现 2 次（反证：去掉上限前实测「浦」占 10 个）", () => {
    for (const style of ["classic", "fresh"]) {
      const cnt = new Map<string, number>();
      for (const c of run({ style }).candidates) for (const ch of given(c)) cnt.set(ch, (cnt.get(ch) ?? 0) + 1);
      expect(Math.max(...cnt.values())).toBeLessThanOrEqual(2);
    }
  });

  it("复姓逐字输出：欧阳 + 名，名字部分从第三位开始", () => {
    const r = run({ surname: "欧阳" });
    for (const c of r.candidates) {
      expect(c.chars[0].char).toBe("欧");
      expect(c.chars[1].char).toBe("阳");
      expect(c.chars.length).toBe(4);
      expect(given(c, "欧阳").every((ch) => suit(ch) === "宜")).toBe(true);
    }
  });

  it("种子：同种子可复现、不同种子换一批；不传种子由输入派生（确定）", () => {
    const names = (seed?: string) => run(seed ? { seed } : {}).candidates.map((c) => given(c).join("")).join(" ");
    expect(names("u1")).toBe(names("u1"));
    expect(names()).toBe(names());
    const a = new Set(names("u1").split(" ")), b = names("u2").split(" ");
    expect(b.filter((x) => a.has(x)).length).toBeLessThan(12); // 大半不同
  });

  it("名字读音用人名读音：含「长」的候选标 cháng", () => {
    const r = run({ fixChar: "长", fixPosition: "middle" });
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) expect(c.chars[1].pinyin).toBe("cháng");
  });
});
