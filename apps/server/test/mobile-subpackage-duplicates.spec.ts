import * as fs from "fs";
import * as path from "path";

/**
 * 分包重复文件防漂移（2026-09-20）
 *
 * ══ 为什么会有重复 ══
 *
 * 微信小程序**分包之间不能互相 import**，只有主包能共享；而主包已 1.96MB / 上限 2MB，
 * 挪不动。所以 `pkg-paipan` / `pkg-paipan2` / `pkg-paipan3` 各自存了一份同名文件。
 *
 * 这是被迫的重复，风险是**静默漂移**：改了一份忘了另一份，
 * 同一个用户在两个页面会拿到不同的结果，而且没有任何报错。
 * （已有先例：`bazi-engine.ts` 两份视图组装层，闸门 `mobile-bazi-view-duplicate.spec.ts`。）
 *
 * ══ 2026-09-20 全量对比结果 ══
 *
 *   xuankong-data.ts   pkg-paipan ≡ pkg-paipan3   逐字节相同
 *   luopan-data.ts     pkg-paipan ≡ pkg-paipan3   逐字节相同
 *   luopan-rings.ts    pkg-paipan ≡ pkg-paipan3   逐字节相同
 *   date-convert.ts    pkg-paipan ≡ pkg-paipan2   **代码体**相同（注释按分包各自措辞）
 *   meihua-data.ts     pkg-paipan 是转发到 shared 的 8 行，不是副本 —— 不比
 *   bazi-engine.ts     已由 mobile-bazi-view-duplicate.spec.ts 单独守 —— 不重复守
 *
 * ══ 本测试守什么 ══
 *
 * 上述四组必须保持一致。谁只改了一边，这里报红。
 * 真要让两边不同（例如分包定制），就把那组从本表移走并写明理由 —— 那是显式决定，不是漂移。
 */

const ROOT = path.resolve(__dirname, "../../..");
const MOBILE = path.join(ROOT, "apps/mobile/src");
const read = (p: string) => fs.readFileSync(path.join(MOBILE, p), "utf8");

/** 去注释与空白，只留代码体 */
const codeOnly = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s+/g, " ").trim();

/** [文件名, A 分包, B 分包, 比对方式] */
const PAIRS: [string, string, string, "exact" | "code"][] = [
  ["xuankong-data.ts", "pkg-paipan", "pkg-paipan3", "exact"],
  ["luopan-data.ts", "pkg-paipan", "pkg-paipan3", "exact"],
  ["luopan-rings.ts", "pkg-paipan", "pkg-paipan3", "exact"],
  ["date-convert.ts", "pkg-paipan", "pkg-paipan2", "code"],
];

describe("分包重复文件防漂移", () => {
  it("反证：四组文件都真的存在且非空（读不到会让下面全变空跑）", () => {
    for (const [f, a, b] of PAIRS) {
      for (const pkg of [a, b]) {
        const s = read(`${pkg}/lib/${f}`);
        expect(`${pkg}/${f}:${s.length > 200}`).toBe(`${pkg}/${f}:true`);
      }
    }
  });

  it.each(PAIRS)("%s：%s 与 %s 必须一致（%s 比对）", (f, a, b, mode) => {
    const A = read(`${a}/lib/${f}`);
    const B = read(`${b}/lib/${f}`);
    if (mode === "exact") {
      expect(`${f} 逐字节`).toBe(A === B ? `${f} 逐字节` : `${f} 两份已不同`);
    } else {
      expect(codeOnly(A)).toEqual(codeOnly(B));
    }
  });

  it("反证：codeOnly 真能剥掉注释（否则 date-convert 那组等于没比）", () => {
    const A = read("pkg-paipan/lib/date-convert.ts");
    const B = read("pkg-paipan2/lib/date-convert.ts");
    // 原文确实不同（两边注释措辞不一样），剥注释后才相同 —— 说明剥这步生效了
    expect(A).not.toEqual(B);
    expect(codeOnly(A)).toEqual(codeOnly(B));
  });

  it("meihua-data 在 pkg-paipan 里必须仍是转发而非副本", () => {
    const s = read("pkg-paipan/lib/meihua-data.ts");
    expect(s).toMatch(/export \* from '@guoxue\/shared\/paipan\/meihua-data'/);
    expect(s.split("\n").length).toBeLessThan(20); // 一旦被人塞回真数据，这里报红
  });
});
