import * as fs from "fs";
import * as path from "path";

/**
 * 生肖姓名学·地支关系对称性（★39，2026-09-21）
 *
 * ══ 为什么只查这一面 ══
 *
 * `apps/mobile/src/pkg-paipan2/lib/shengxiao-naming.ts` 的字根喜忌本身是流派性内容
 * （哪个字根算「得食」「得所」），不去判对错。
 * 但它的 `reason` 明确引用了**三合 / 六合 / 相冲 / 相害**——这四个都是**对称关系**，
 * 正是 ★29（合盘三刑单向查表，对调两人结论就变）同一类风险。
 *
 * ══ ★39 抓到的 ══
 *
 * **卯戌六合只在「狗」那一边登记**：狗的 fav 有 `{ group: "卯兔", reason: "卯戌六合" }`，
 * 而兔的 fav 里没有戌狗（兔的 note 也只提三合）。实测影响：
 *
 *   属狗者用含卯兔字根的字（卯柳卿迎逸月兔）→ +1
 *   属兔者用含戌狗字根的字（戌狗成城诚盛国献然狄猛）→ 0
 *
 * 「成、城、诚、盛、国、然」都是极常用的起名字，属兔的用户因此少拿加分，直接影响推荐排序。
 * 已补 `{ group: "戌狗", reason: "卯戌六合" }` 并更新 note。
 *
 * ══ 一并查清、但不改的两件事（留给决策人）══
 *
 * 1. **寅亥（虎↔猪）与巳申（蛇↔猴）两对六合，两边都没登记**。
 *    与卯戌不同，这两对是**对称地缺**，且都属「合中带刑/破」
 *    （寅亥合而带破、巳申合而带刑），不少流派确实不取。属流派取舍，未动。
 *
 * 2. **同一生肖在表里有两个字根组，引用时混用**：
 *    - bad（相冲/相害）一律用单字**部首组**「马」「羊」
 *    - fav（三合/六合/三会）一律用**生肖组**「午马」「未羊」（虎/龙的 fav 用「马」是例外）
 *    两组覆盖互有出入：`马` = 部首马/馬 + 骏驰骁腾冯许；`午马` = 午马骏驰许冯骑腾竹南火杵。
 *    后果：**「午」这个字，属鼠者不报子午相冲**——而「午」正是该表自己在 `午马` 组里列的第一个字；
 *    同理「未」对属鼠者不报子未相害。
 *    未改：改用 `午马` 会丢掉骐骥驹驿这些马部首字，两个方向都有得失，选哪个当准是流派/数据决定。
 *
 * ══ 本测试守什么 ══
 *
 * 四种对称关系的**双向一致性**——谁只在一边登记，这里报红。
 * 对称地缺（如寅亥、巳申）不算违规，因为那是取舍；单边登记才是。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/shengxiao-naming.ts"), "utf8",
);

const ZHI = "子丑寅卯辰巳午未申酉戌亥".split("");
const SX = "鼠牛虎兔龙蛇马羊猴鸡狗猪".split("");
const zhiOf = (s: string) => ZHI[SX.indexOf(s)];
const SANHE = [["申", "子", "辰"], ["寅", "午", "戌"], ["巳", "酉", "丑"], ["亥", "卯", "未"]];
const LIUHE: Record<string, string> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};
const HAI: Record<string, string> = {
  子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅",
  卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉",
};
const chong = (a: string, b: string) => (ZHI.indexOf(a) - ZHI.indexOf(b) + 12) % 12 === 6;
const sanhe = (a: string, b: string) => a !== b && SANHE.some((g) => g.includes(a) && g.includes(b));

/** 解析 SHENGXIAO_RULES：生肖 → { fav: [{group, reason}], bad: [...] } */
function parseRules(): Record<string, { fav: { group: string; reason: string }[]; bad: { group: string; reason: string }[] }> {
  const out: Record<string, { fav: { group: string; reason: string }[]; bad: { group: string; reason: string }[] }> = {};
  for (const sx of SX) {
    const blk = new RegExp(`\\n  ${sx}: \\{([\\s\\S]*?)\\n  \\},`).exec(SRC);
    if (!blk) throw new Error(`生肖 ${sx} 没解析到`);
    const favBlk = /fav: \[([\s\S]*?)\n    \]/.exec(blk[1]);
    const badBlk = /bad: \[([\s\S]*?)\n    \]/.exec(blk[1]);
    const grab = (t: string | undefined) =>
      t ? [...t.matchAll(/\{ group: "(\S+?)", reason: "([^"]+)" \}/g)].map((m) => ({ group: m[1], reason: m[2] })) : [];
    out[sx] = { fav: grab(favBlk?.[1]), bad: grab(badBlk?.[1]) };
  }
  return out;
}
const RULES = parseRules();

/** 组名 → 生肖（既认「午马」也认单字「马」） */
function groupToSx(g: string): string | null {
  if (g.length === 2 && ZHI.includes(g[0]) && SX.includes(g[1])) return g[1];
  if (g.length === 1 && SX.includes(g)) return g;
  return null;
}
/** 生肖 s 的表里对生肖 t 的引用 */
function refOf(s: string, t: string): { side: "fav" | "bad"; reason: string } | null {
  for (const e of RULES[s].fav) if (groupToSx(e.group) === t) return { side: "fav", reason: e.reason };
  for (const e of RULES[s].bad) if (groupToSx(e.group) === t) return { side: "bad", reason: e.reason };
  return null;
}

describe("生肖姓名学 · 地支关系对称性", () => {
  it("反证：12 生肖规则全解析到，每个都有 fav 与 bad（解析失败会让下面全变空跑）", () => {
    expect(Object.keys(RULES).sort()).toEqual([...SX].sort());
    for (const s of SX) {
      expect(`${s}.fav`).toBe(RULES[s].fav.length > 0 ? `${s}.fav` : `${s}.fav 为空`);
      expect(`${s}.bad`).toBe(RULES[s].bad.length > 0 ? `${s}.bad` : `${s}.bad 为空`);
    }
  });

  it("★39 四种对称关系不得单边登记（一边有、另一边无 = 方向不同结论不同）", () => {
    const bad: string[] = [];
    for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
      const a = SX[i], b = SX[j], za = zhiOf(a), zb = zhiOf(b);
      const rel = sanhe(za, zb) ? "三合" : LIUHE[za] === zb ? "六合" : chong(za, zb) ? "相冲" : HAI[za] === zb ? "相害" : null;
      if (!rel) continue;
      const sa = refOf(a, b)?.side ?? "—";
      const sb = refOf(b, a)?.side ?? "—";
      if (sa !== sb) bad.push(`${rel} ${a}↔${b}：${a}表=${sa} ${b}表=${sb}`);
    }
    expect(bad).toEqual([]);
  });

  it("reason 里声称的关系必须与地支实际关系相符", () => {
    const bad: string[] = [];
    for (const s of SX) for (const e of [...RULES[s].fav, ...RULES[s].bad]) {
      const t = groupToSx(e.group);
      if (!t) continue;
      const za = zhiOf(s), zb = zhiOf(t);
      const checks: [string, boolean][] = [
        ["三合", sanhe(za, zb)], ["六合", LIUHE[za] === zb],
        ["相冲", chong(za, zb)], ["相害", HAI[za] === zb],
      ];
      for (const [kw, ok] of checks) if (e.reason.includes(kw) && !ok) bad.push(`${s}→${t} 称「${kw}」但 ${za}${zb} 不是：${e.reason}`);
    }
    expect(bad).toEqual([]);
  });

  it("★39 具体：卯戌六合必须两边都登记（兔这边曾漏）", () => {
    expect(refOf("狗", "兔")).toEqual({ side: "fav", reason: "卯戌六合" });
    expect(refOf("兔", "狗")).toEqual({ side: "fav", reason: "卯戌六合" });
  });

  it("三合 12/12 全覆盖（每个生肖的两个三合伙伴都在 fav 里）", () => {
    const bad: string[] = [];
    for (const s of SX) {
      const z = zhiOf(s);
      const mates = SANHE.find((g) => g.includes(z))!.filter((x) => x !== z).map((x) => SX[ZHI.indexOf(x)]);
      for (const m of mates) if (refOf(s, m)?.side !== "fav") bad.push(`${s} 缺三合 ${m}`);
    }
    expect(bad).toEqual([]);
  });

  /**
   * 快照：寅亥、巳申两对六合两边都没登记（对称地缺 = 流派取舍，不算违规）。
   * 钉住现状，免得将来单边补上一个又制造新的不对称。
   */
  it("待决快照：寅亥（虎猪）、巳申（蛇猴）两对六合仍是两边都不登记", () => {
    for (const [a, b] of [["虎", "猪"], ["蛇", "猴"]] as [string, string][]) {
      expect(`${a}→${b}`).toBe(refOf(a, b) === null ? `${a}→${b}` : `${a}→${b} 已单边登记`);
      expect(`${b}→${a}`).toBe(refOf(b, a) === null ? `${b}→${a}` : `${b}→${a} 已单边登记`);
    }
  });

  /**
   * 2026-09-21 定案（原为待决项）：**地支关系一律用生肖组，意象引用保留部首组**。
   *
   * 原状：bad（相冲/相害）用单字部首组「马」「羊」，fav（三合/六合/三会）用生肖组「午马」「未羊」。
   * 两组覆盖互有出入 —— `马` = 部首马/馬 + 骏驰骁腾冯许；`午马` = 午马骏驰许冯骑腾竹南火杵（原无部首项）。
   * 后果：**「午」这个字，属鼠者不报子午相冲**，而「午」正是该表自己在 `午马` 组里列的第一个字。
   *
   * 定案没有在两组间取舍，而是走了第三条路：`hitRoot` 本就是「部首 ∪ 扩展字」的并集，
   * 于是**给生肖组补上部首项**（午马 += 马/馬，未羊 += 羊），它就成为严格超集 —— 两向都不丢。
   * 然后把五处**地支关系**的引用改成生肖组：
   *   鼠 子午相冲 / 鼠 子未相害 / 牛 丑午相害 / 牛 丑未相冲 / 虎 寅午戌三合
   *
   * **龙的「龙马精神」仍用部首组「马」**：那是意象引用不是地支关系，
   * 用生肖组会把「南/竹/杵」也算成龙马精神，属误伤。
   *
   * 已验证：原「马」组 16 字零丢失；新增命中恰为 午/南/竹/杵；龙未被误伤；评分仍在 −3~3。
   */
  it("地支关系一律用生肖组（午马/未羊），不得退回单字部首组", () => {
    const bad: string[] = [];
    for (const s of SX) {
      for (const e of [...RULES[s].fav, ...RULES[s].bad]) {
        const t = groupToSx(e.group);
        if (!t) continue;
        const isDizhiReason = /三合|六合|三会|相冲|相害/.test(e.reason);
        if (isDizhiReason && e.group.length === 1) bad.push(`${s}→${e.group}（${e.reason}）用了部首组`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("生肖组必须含部首项，否则改用生肖组会丢掉部首字（骐骥驹驿）", () => {
    const blk = /const ROOT_RADICALS: Record<string, string\[\]> = \{([\s\S]*?)\n\}/.exec(SRC)!;
    expect(blk[1]).toMatch(/午马: \["马", "馬"\]/);
    expect(blk[1]).toMatch(/未羊: \["羊"\]/);
  });

  it("龙的「龙马精神」是意象引用，仍用部首组「马」（用生肖组会把南/竹/杵误算进来）", () => {
    const dragon = RULES["龙"].fav.find((e) => e.reason.includes("龙马精神"));
    expect(dragon).toBeDefined();
    expect(dragon!.group).toBe("马");
  });

  it("反证：若把生肖组的部首项去掉，骐骥驹驿这类马部首字就不再命中相冲", () => {
    // 生肖组的扩展字串里确实没有这些字 —— 所以部首项不可或缺
    const extra = /午马: "([^"]+)"/.exec(SRC)![1];
    for (const c of ["骐", "骥", "驹", "驿"]) expect(`${c}在扩展字里:${extra.includes(c)}`).toBe(`${c}在扩展字里:false`);
  });
});
