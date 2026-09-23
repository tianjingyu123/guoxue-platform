import * as fs from "fs";
import * as path from "path";

/**
 * 天乙贵人·昼夜归属跨引擎矛盾（★43，2026-09-21）
 *
 * ══ 从「可疑」到「定案并修复」══
 *
 * 2026-09-20 只记到「金口诀 B 派把七个干的昼夜也全互换了」，判为「可疑，待竞品实测」。
 * 2026-09-21 把**大六壬**与**紫微斗数**都拉进来横向比，不需要底本就定下来了。
 *
 * **① 壬癸昼夜相反 —— 已定案：大六壬写反了，已修**
 *
 * 原先金口诀 A（壬癸昼卯）与大六壬 standard（壬癸昼巳）相反，两边都自称「甲戊庚牛羊」同一派。
 * 两条独立证据链都指向大六壬：
 *
 *   · **口诀字序**：全仓 5 处引用这句口诀，4 处作「壬癸**兔蛇**藏」
 *     （含 `bazi-books/yuanhaiziping.ts`《渊海子平》、`lixuzhongmingshu.ts`《李虚中命书》两部典籍引文），
 *     大六壬是唯一写「蛇兔」的孤例 —— **字序错在先，数据跟着错**。
 *   · **数据实现**：金口诀 `GUIREN_A` 与紫微斗数的天魁天钺（`KUI`/`YUE`）**10/10 完全一致**，
 *     大六壬是唯一相反的。三处独立实现，两处一致、一处孤例。
 *
 * 已改大六壬 standard 与 ALT 两表的壬癸，并把注释字序改回「兔蛇」。现三处昼夜全一致。
 *
 * **② 同名变法「甲羊戊庚牛」改的干数差 8 倍 —— 保留现状**
 *
 *   大六壬 `GUIREN_*_ALT` 相对 standard **只改甲**（与口诀名相符：甲取羊/未、戊庚取牛/丑）
 *   金口诀 `GUIREN_B` 相对 A 改了 **8 个干**，而位置对与 A 完全相同 —— 名实不符
 *
 * B 表正确该长什么样仍无底本，**不动数据**；下方快照钉住这个差异，防止被默默改掉。
 *
 * **③ 三份实现都没做阳贵/阴贵的干级区分 —— 仍未解**
 *
 * 真正的阳贵体系里 乙与己、丙与丁、壬与癸 的阳贵应各不相同（乙申己子、丙酉丁亥、壬卯癸巳），
 * 而这三组在每份表里都是相同行。需底本或竞品实测，未改。
 *
 * ══ 本闸门守什么 ══
 *
 * ① 已修的三处昼夜一致性（含紫微那处佐证）与口诀字序；②③ 两条未解的做成快照。
 * 位置对的四处跨文件一致性另由 `tianyi-guiren-crossfile.spec.ts` 守着。
 */

const ROOT = path.resolve(__dirname, "../../..");
const JKJ = fs.readFileSync(path.join(ROOT, "packages/shared/src/paipan/jinkoujue-engine.ts"), "utf8");
const DLR = fs.readFileSync(path.join(ROOT, "packages/shared/src/paipan/daliuren-engine.ts"), "utf8");
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

/** 金口诀：GUIREN_A / GUIREN_B → { 干: [昼, 夜] } */
function jkjTable(which: "A" | "B"): Record<string, [string, string]> {
  const blk = new RegExp(`const GUIREN_${which}: Record<string, \\[string, string\\]> = \\{([\\s\\S]*?)\\n\\}`).exec(JKJ);
  if (!blk) throw new Error(`GUIREN_${which} 没解析到`);
  const out: Record<string, [string, string]> = {};
  for (const m of blk[1].matchAll(/(.): \["(.)", "(.)"\]/g)) out[m[1]] = [m[2], m[3]];
  return out;
}
/** 大六壬：GUIREN_DAY(_ALT) / GUIREN_NIGHT(_ALT) → { 干: [昼, 夜] } */
function dlrTable(alt: boolean): Record<string, [string, string]> {
  const suffix = alt ? "_ALT" : "";
  const grab = (name: string) => {
    const m = new RegExp(`const ${name}${suffix}: Record<string, Zhi> = \\{([^}]*)\\}`).exec(DLR);
    if (!m) throw new Error(`${name}${suffix} 没解析到`);
    const o: Record<string, string> = {};
    for (const x of m[1].matchAll(/(.): "(.)"/g)) o[x[1]] = x[2];
    return o;
  };
  const day = grab("GUIREN_DAY"), night = grab("GUIREN_NIGHT");
  const out: Record<string, [string, string]> = {};
  for (const g of GAN) out[g] = [day[g], night[g]];
  return out;
}

const A = jkjTable("A"), B = jkjTable("B");
const DS = dlrTable(false), DA = dlrTable(true);

describe("天乙贵人 · 昼夜归属跨引擎（★43）", () => {
  it("反证：四份表都解析到且十干齐全（解析失败会让下面全变空跑）", () => {
    for (const [n, t] of [["金口诀A", A], ["金口诀B", B], ["大六壬std", DS], ["大六壬alt", DA]] as const) {
      expect(`${n}:${Object.keys(t).length}`).toBe(`${n}:10`);
      for (const g of GAN) expect(`${n}.${g}`).toBe(`${n}.${g}`.slice(0, 99)), expect(t[g]).toHaveLength(2);
    }
  });

  it("位置对（无序）四表一致 —— 分歧确实只在昼夜，不在位置", () => {
    const key = (p: [string, string]) => [...p].sort().join("");
    const bad: string[] = [];
    for (const g of GAN) {
      const ks = new Set([key(A[g]), key(B[g]), key(DS[g]), key(DA[g])]);
      if (ks.size !== 1) bad.push(`${g}: ${[...ks].join(" / ")}`);
    }
    expect(bad).toEqual([]);
  });

  /**
   * ★43① 已定案并修复（2026-09-21）：原先金口诀 A 与大六壬 standard 同称「甲戊庚牛羊」
   * 却在壬癸昼夜上相反。判定大六壬写反，依据两条证据链：
   *  · **口诀字序**：全仓 5 处引用，4 处作「壬癸**兔蛇**藏」（含《渊海子平》《李虚中命书》
   *    两部典籍引文），大六壬是唯一写「蛇兔」的孤例 —— 字序错在先，数据跟着错。
   *  · **数据实现**：金口诀 `GUIREN_A` 与紫微斗数天魁天钺 **10/10 完全一致**（壬癸昼卯夜巳），
   *    大六壬是唯一相反的。三处独立实现两处一致、一处孤例。
   * 已改大六壬 standard 与 ALT 两表，现三处昼夜全一致。
   */
  it("★43① 已修：金口诀 A 与大六壬 standard 昼夜十干全一致", () => {
    const diff = GAN.filter((g) => A[g][0] !== DS[g][0] || A[g][1] !== DS[g][1]);
    expect(diff).toEqual([]);
    expect(A["壬"]).toEqual(["卯", "巳"]);
    expect(DS["壬"]).toEqual(["卯", "巳"]);
  });

  it("★43① 佐证：紫微天魁天钺与金口诀 A 也逐干一致（第三处独立实现）", () => {
    const ZW = fs.readFileSync(path.join(ROOT, "apps/server/src/modules/paipan/engine/ziwei-engine.ts"), "utf8");
    const ZHI = "子丑寅卯辰巳午未申酉戌亥".split("");
    const grab = (name: string) => {
      const m = new RegExp(`const ${name}: Record<string, number> = \{([^}]*)\}`).exec(ZW)!;
      const o: Record<string, number> = {};
      for (const x of m[1].matchAll(/(.): (\d+)/g)) o[x[1]] = Number(x[2]);
      return o;
    };
    const kui = grab("KUI"), yue = grab("YUE");
    const bad = GAN.filter((g) => ZHI[kui[g]] !== A[g][0] || ZHI[yue[g]] !== A[g][1]);
    expect(bad).toEqual([]);
  });

  it("口诀字序必须是「壬癸兔蛇藏」，不得写成「蛇兔」（字序错会带着数据一起错）", () => {
    expect(DLR).toMatch(/壬癸兔蛇藏/);
    expect(DLR).not.toMatch(/壬癸蛇兔藏/);
  });

  /** ② 同名变法，大六壬只改甲（名实相符），金口诀改八个 */
  it("★43②：同名「甲羊戊庚牛」，大六壬只改甲，金口诀改了八个干", () => {
    const dlrChanged = GAN.filter((g) => DA[g][0] !== DS[g][0]);
    const jkjChanged = GAN.filter((g) => B[g][0] !== A[g][0]);
    expect(dlrChanged).toEqual(["甲"]);
    // 改动的八个干：甲乙丙丁己辛壬癸（戊庚未动）。用 Set 比，中文 sort() 按 UTF-16 排不可靠。
    expect(new Set(jkjChanged)).toEqual(new Set(["甲", "乙", "丙", "丁", "己", "辛", "壬", "癸"]));
    expect(jkjChanged).toHaveLength(8);
    expect(jkjChanged).not.toContain("戊");
    expect(jkjChanged).not.toContain("庚");
  });

  /**
   * ③ 三份实现都没做「阳贵/阴贵」的干级区分：
   * 真正的阳贵体系里 乙与己、丙与丁、壬与癸 应各不相同（乙申己子、丙酉丁亥、壬卯癸巳），
   * 而这三组在每一份表里都被写成了相同的行。
   */
  it("★43③：乙己 / 丙丁 / 壬癸 在三份表里都是相同行（未做干级区分）", () => {
    for (const [name, t] of [["金口诀A", A], ["金口诀B", B], ["大六壬std", DS]] as const) {
      for (const [x, y] of [["乙", "己"], ["丙", "丁"], ["壬", "癸"]] as const) {
        expect(`${name} ${x}${y}:${t[x].join("")}`).toBe(`${name} ${x}${y}:${t[y].join("")}`);
      }
    }
  });

  /**
   * ★43③ 仍未解：三份实现都没做「阳贵/阴贵」的干级区分
   * （真正的阳贵体系里 乙申己子、丙酉丁亥、壬卯癸巳 应各不相同）。
   * 这一条需要底本或竞品实测，**未改**；上面那条快照盯着它。
   */
  it("留痕：★43③（干级区分）仍未解，需底本或竞品实测", () => {
    // 乙与己的昼贵目前相同 —— 若哪天做了干级区分，这条会红，提醒更新说明
    expect(A["乙"]).toEqual(A["己"]);
  });
});
