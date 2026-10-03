import * as fs from "node:fs";
import * as path from "node:path";

/** 十二地支（本测试自持一份，避免依赖被测包的导出面） */
const ZHI = "子丑寅卯辰巳午未申酉戌亥".split("");

/**
 * 跨包基础常数一致性（2026-09-19）
 *
 * ══ 背景 ══
 *
 * 这张地支藏干表原本在本仓库存了**三份**：
 *   1. `packages/bazi-engine/src/constants.ts` 的 `ZHI_CANG`（带 元/余/库 气位标记）
 *   2. `packages/shared/src/paipan/daliuren-engine.ts` 的 `ZHI_CANG_LOCAL`
 *   3. `packages/shared/src/paipan/ganzhi.ts` 的 `ZHI_CANG`
 *
 * 2026-09-19 逐份比对查出两类问题：
 *   · 第 1 份卯多「甲」、酉多「庚」、亥的「甲」误作「戊」（抄表串行），第 2、3 份是对的；
 *   · **巳的气位顺序三份不统一**——1、2 份作「丙戊庚」，第 3 份作「丙庚戊」。
 *     按金长生在巳，庚为中气、戊为余气（土寄），故统一为「丙庚戊」。
 *
 * ══ 处理：能免费合的合掉，跨包那道用测试守 ══
 *
 * 第 2、3 份**在同一个包内**，而 `daliuren-engine.ts` 本就 import 了 `./ganzhi`——
 * 合并零代价，已合（第 2 份删除，改用第 3 份）。
 *
 * 剩下 1 与 3 跨包。`bazi-engine` 与 `shared` **目前互不依赖**（两包 dependencies 均为空），
 * 把其中一份改成 import 另一个包，等于给基础包引入新的包间依赖，
 * 会牵动构建顺序与打包配置——代价大于收益，故保留两份、由本测试卡住。
 * 将来两包本就要产生依赖关系时，再做物理合并不迟。
 *
 * ⚠️ 本测试只保证「两份相同」，不保证「两份都对」。
 * 正确性由 `bazi-engine/src/__tests__/compare-fixes-20260919.test.ts` 里
 * 对《渊海子平》通行表的逐支断言负责。
 */
describe("跨包基础常数：地支藏干", () => {
  /** 从源码里解析对象形式的藏干表（常数是静态字面量，读文件可靠） */
  const parseObjTable = (file: string, re: RegExp): Record<string, string> => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../", file), "utf8");
    const block = src.match(re)?.[1];
    if (!block) return {};
    const out: Record<string, string> = {};
    const row = /([子丑寅卯辰巳午未申酉戌亥]):\s*\[([^\]]*)\]/g;
    for (const m of block.matchAll(row)) {
      out[m[1]] = m[2].replace(/["'\s]/g, "").split(",").filter(Boolean).join("");
    }
    return out;
  };

  /** bazi-engine 那份是数组形式（带气位标记），单独解析 */
  const parseArrTable = (file: string): string[] => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../", file), "utf8");
    const block = src.match(/export const ZHI_CANG[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? "";
    return [...block.matchAll(/\[([^\]]*)\]/g)].map((m) =>
      [...m[1].matchAll(/gan:\s*'([^']+)'/g)].map((x) => x[1]).join(""),
    );
  };
  const engineRows = parseArrTable("packages/bazi-engine/src/constants.ts");

  const daliuren = parseObjTable(
    "packages/shared/src/paipan/daliuren-engine.ts",
    /const ZHI_CANG_LOCAL[^=]*=\s*\{([\s\S]*?)\n\}/,
  );
  const ganzhi = parseObjTable(
    "packages/shared/src/paipan/ganzhi.ts",
    /export const ZHI_CANG[^=]*=\s*\{([\s\S]*?)\n\}/,
  );

  it("两份表都能解析到，且各 12 支", () => {
    expect(`bazi-engine 支数=${engineRows.length}`).toBe("bazi-engine 支数=12");
    expect(`ganzhi 支数=${Object.keys(ganzhi).length}`).toBe("ganzhi 支数=12");
  });

  it("daliuren 不再自持副本（同包已合并到 ganzhi）", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../packages/shared/src/paipan/daliuren-engine.ts"),
      "utf8",
    );
    // 只允许出现在说明性注释里，不得再有 `const ZHI_CANG_LOCAL = {` 这样的定义
    expect(/const\s+ZHI_CANG_LOCAL[^=]*=\s*\{/.test(src)).toBe(false);
  });

  it("跨包两份逐支逐位一致（顺序也算——气位先后本身有含义）", () => {
    ZHI.forEach((zhi, i) => {
      expect(`${zhi}：ganzhi=${ganzhi[zhi]}`).toBe(`${zhi}：ganzhi=${engineRows[i]}`);
    });
  });

  it("巳统一为「丙庚戊」（庚为中气·金长生在巳，戊为余气·土寄）", () => {
    expect(`巳=${engineRows[ZHI.indexOf("巳")]}`).toBe("巳=丙庚戊");
    expect(`巳=${ganzhi["巳"]}`).toBe("巳=丙庚戊");
  });

  it("子卯酉为独气支，各只一位", () => {
    for (const zhi of ["子", "卯", "酉"]) {
      expect(`${zhi} 位数=${engineRows[ZHI.indexOf(zhi)].length}`).toBe(`${zhi} 位数=1`);
      expect(`${zhi} 位数=${ganzhi[zhi].length}`).toBe(`${zhi} 位数=1`);
    }
  });
});
