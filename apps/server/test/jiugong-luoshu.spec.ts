import * as fs from "fs";
import * as path from "path";

/**
 * 九宫飞泊：洛书配位与幻方（2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * `apps/mobile/src/pkg-paipan/lib/wannianli-engine.ts` 的 `PALACE_ORDER`
 * **9 宫错了 8 宫**（只有中宫的 0 偏移对）：一整套正确的偏移量被安到了错的宫上，
 * 集合对、配对全错。万年历日视图把这个盘按方位标着文昌位／正财位／五黄煞画出来，
 * 用户照着摆书桌床位——中宫=5 时四绿文昌被放到正南（应东南）、
 * 八白正财放到东南（应东北）、九紫喜神放到正北（应正南）。
 *
 * ══ 为什么以前没发现 ══
 *
 * **「九数 1–9 各出现一次」这条一直成立。** 那是**计数型**不变量，
 * 只约束「有多少」不约束「哪个数落在哪个宫」——与穿山七十二龙是同一个坑。
 * 有判别力的不变量必须把「格子」和「它的位置」绑起来。这里用两条：
 *
 * ① **洛书幻方**：九宫任一行、任一列、两条对角线之和恒为 15。
 *    这是纯算术事实，不需要任何术数资料。
 * ② **本仓自相矛盾**：`feigong-engine.ts` 的 `PALACE_FANGWEI` 已经写了正确的
 *    洛书配位（坎1正北、巽4东南…）。同一仓库两处说法对不上，必有一处错。
 *    本测试把它当作第二个证人**读源码比对**，而不是我另抄一份洛书表。
 */

const ROOT = path.resolve(__dirname, "../../..");
const WNL = path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/wannianli-engine.ts");
const FEIGONG = path.join(ROOT, "apps/server/src/modules/paipan/engine/feigong-engine.ts");

/** 从 wannianli 的 PALACE_ORDER 解析出「宫名/方位 → 偏移」 */
function palaceOffsets(): { palace: string; dir: string; key: string; off: number }[] {
  const src = fs.readFileSync(WNL, "utf8");
  const blk = /const PALACE_ORDER[\s\S]*?\n\]/.exec(src);
  if (!blk) throw new Error("PALACE_ORDER 没解析到");
  return [...blk[0].matchAll(
    /palace: "([^"]+)", direction: "([^"]+)", key: "([^"]+)", offset: (-?\d+)/g,
  )].map((m) => ({ palace: m[1], dir: m[2], key: m[3], off: Number(m[4]) }));
}

/** 第二个证人：从 feigong-engine 读「洛书数 → 方位」 */
function feigongLuoshu(): Record<number, string> {
  const src = fs.readFileSync(FEIGONG, "utf8");
  // 只吃到本对象的第一个 `}`。第一版写成 `[^\n]*\n?[^}]*\}` 多吞了下一行的
  // `XIANTIAN_GUA`，先天卦覆盖了方位值，于是比出「洛书8在震」这种鬼话——
  // 又一次「判据报红先确认入参形状」。
  const blk = /const PALACE_FANGWEI[^=]*=\s*\{[^}]*\}/.exec(src);
  if (!blk) throw new Error("PALACE_FANGWEI 没解析到");
  const out: Record<number, string> = {};
  for (const m of blk[0].matchAll(/(\d): "([^"]+)"/g)) out[Number(m[1])] = m[2];
  return out;
}

/** 两处对「中宫」的叫法不同（wannianli 作「中」，feigong 作「中央」），比之前先归一 */
const sameDir = (a: string, b: string) => {
  const n = (s: string) => (s === "中央" ? "中" : s);
  return n(a) === n(b);
};

const wrap9 = (n: number) => ((((n - 1) % 9) + 9) % 9) + 1;

describe("九宫飞泊：洛书配位与幻方", () => {
  const rows = palaceOffsets();
  const fg = feigongLuoshu();

  it("反证：两处都解析到了完整的九宫（否则下面全是空跑）", () => {
    expect(rows).toHaveLength(9);
    expect(Object.keys(fg)).toHaveLength(9);
    expect(new Set(rows.map((r) => r.dir)).size).toBe(9);
    // 反证：feigong 解析出来的必须是**方位**而不是别的东西（第一版把先天卦解析进来了）
    expect(new Set(Object.values(fg))).toEqual(
      new Set(["正北", "东北", "正东", "东南", "正南", "西南", "正西", "西北", "中央"]),
    );
  });

  /**
   * ⚠️ 幻方判据**只在元旦盘（中宫=5）成立**，不要写成「任意中宫都成立」。
   * 飞入别的中宫数时每格加同一个常数，但 `wrap9` 的回绕不是线性的
   * （9 之后跳回 1），行列和随之被打散——中宫=1 时正解也只有 21/12/12。
   * 我第一版就把它写成了对 1~9 全成立，测试当场报红，才没把一条错的判据固化进去。
   */
  it("洛书幻方：元旦盘（中宫=5）八条线之和都必须是 15", () => {
    // PALACE_ORDER 的排列就是九宫显示顺序：巽离坤 / 震中兑 / 艮坎乾（南上）
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const g = rows.map((r) => wrap9(5 + r.off));
    const bad = LINES
      .map((t) => ({ t, sum: t.reduce((s, i) => s + g[i], 0) }))
      .filter((x) => x.sum !== 15)
      .map((x) => `[${x.t.join(",")}] 之和=${x.sum}`);
    expect(bad).toEqual([]);
  });

  it("九数不重不漏（计数型，单独它什么也证明不了——原错表照样通过这条）", () => {
    for (let c = 1; c <= 9; c++) {
      expect(new Set(rows.map((r) => wrap9(c + r.off))).size).toBe(9);
    }
  });

  it("元旦盘：中宫=5 时各宫必须落回洛书本数", () => {
    const want: Record<string, number> = {
      东南: 4, 正南: 9, 西南: 2, 正东: 3, 中: 5, 正西: 7, 东北: 8, 正北: 1, 西北: 6,
    };
    const bad: string[] = [];
    for (const r of rows) {
      const got = wrap9(5 + r.off);
      if (got !== want[r.dir]) bad.push(`${r.palace}(${r.dir}) 得${got} 应${want[r.dir]}`);
    }
    expect(bad).toEqual([]);
  });

  it("与 feigong-engine 的洛书配位一致（同一仓库不得两处说法打架）", () => {
    const bad: string[] = [];
    for (const r of rows) {
      const num = wrap9(5 + r.off);          // 中宫=5 时即该宫洛书本数
      const dirInFeigong = fg[num];
      if (!sameDir(dirInFeigong, r.dir)) {
        bad.push(`${r.palace}：wannianli 说洛书${num}在${r.dir}，feigong 说洛书${num}在${dirInFeigong}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("反证：把任意一宫的偏移改错，幻方判据必须报红（证明它不是摆设）", () => {
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const mutated = rows.map((r, i) => (i === 0 ? { ...r, off: r.off + 1 } : r));
    const g = mutated.map((r) => wrap9(5 + r.off));
    const bad = LINES.filter((t) => t.reduce((s, i) => s + g[i], 0) !== 15);
    expect(bad.length).toBeGreaterThan(0);
  });
});
