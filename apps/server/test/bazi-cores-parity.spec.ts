/**
 * 两套八字核心一致性（2026-09-20）
 *
 *   A = `packages/bazi-engine`          —— **后端 / admin / AI 报告**走这套（★1~★13 在这里修的）
 *   B = `packages/shared/paipan/ganzhi` —— **C 端用户看到的盘**走这套
 *       （`apps/mobile/src/lib/paipan/ganzhi.ts` 是纯转发；
 *         `pkg-paipan/lib/bazi-engine.ts`、`pkg-paipan2/lib/bazi-engine.ts`
 *         只是视图组装层，算法都来自 B）
 *
 * ══ 为什么要有这道闸 ══
 *
 * 本项目已经出现 **7 次**「前端对·后端错」或反之（玄空、八宅、阴盘奇门、金口诀、
 * 奇门山宫、五运六气、康熙笔画）。模式每次都一样：两套各自能跑出一个**自洽**的盘，
 * 谁也没跟谁比过，于是用户看到的盘和后台/AI 报告看到的盘不是同一个。
 * 八字是用量最大的工具，这道闸就是防这个。
 *
 * ══ 判据 ══
 *
 * 一律**全枚举**，不抽样——抽样在纳音上栽过：60 个错 40 个，
 * 而抽头几个（甲子旬）恰好全对。日柱直接跑满 1900–2049 共 54787 天。
 * 另有两项不靠对比、直接用**独立推导**核 B 自己：
 * 长生十二宫（由起宫常量按阳顺阴逆推）、空亡（本旬十干支的地支补集）。
 */
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");
/* eslint-disable @typescript-eslint/no-var-requires */
const A = require(path.join(ROOT, "packages/bazi-engine/dist/index.js"));
const AC = require(path.join(ROOT, "packages/bazi-engine/dist/constants.js"));
const B = require(path.join(ROOT, "packages/shared/dist/paipan/ganzhi.js"));

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const JIAZI = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);

/**
 * 2026-09-21 已定案：甲申 / 乙酉 的纳音名统一为**「井泉水」**。
 *
 * 此前 A（bazi-engine）作「井泉水」、B（shared/ganzhi）作「泉中水」，
 * 曾作为「待决策人拍板」的例外放行。定案依据：
 * 《三命通会·论纳音取象》原文即「甲申乙酉井泉水」，「泉中水」属后起讹变。
 * 全仓 20 处「泉中水」已统一为「井泉水」（含 shared/ganzhi、nayin-xiangjie 详解、
 * sanseshu、wannianli、rizhu-lunming、bazi-hehun、tools-catalog 等）。
 *
 * 例外表已按原注释的要求**删除而非留着** —— 下面那条全枚举现在不带任何豁免。
 */

describe("八字两套核心一致性（后端 bazi-engine vs 前端 shared/ganzhi）", () => {
  it("反证：两套都加载到了，且导出的是能用的东西", () => {
    expect(typeof A.calcRiZhu).toBe("function");
    expect(typeof B.dayGanzhi).toBe("function");
    expect(Array.isArray(AC.ZHI_CANG)).toBe(true);
    expect(AC.ZHI_CANG).toHaveLength(12);
    expect(Object.keys(B.ZHI_CANG)).toHaveLength(12);
  });

  it("藏干：12 支逐支一致", () => {
    // A 是按支序的数组、元素 {gan,shiShen}；B 是按支名的对象、元素字符串。
    // 形状不同，先归一再比——不先确认形状的话这里会 12/12 全红（我第一次就是）。
    const bad: string[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (AC.ZHI_CANG[i] ?? []).map((x: { gan: string }) => x.gan).join("");
      const b = (B.ZHI_CANG[ZHI[i]] ?? []).join("");
      if (a !== b) bad.push(`${ZHI[i]}：A=${a} B=${b}`);
    }
    expect(bad).toEqual([]);
  });

  it("纳音：60 甲子全枚举完全一致（手写表 vs 闭式），无任何豁免", () => {
    const bad: string[] = [];
    for (const gz of JIAZI) {
      const a = AC.NA_YIN[gz];
      const b = B.naYin(gz[0], gz[1]);
      if (a !== b) bad.push(`${gz}：A=${a} B=${b}`);
    }
    expect(bad).toEqual([]);
  });

  it("甲申乙酉已统一为「井泉水」（典籍用字），两套核心都不得再出现「泉中水」", () => {
    for (const gz of ["甲申", "乙酉"]) {
      expect(`${gz}:${AC.NA_YIN[gz]}`).toBe(`${gz}:井泉水`);
      expect(`${gz}:${B.naYin(gz[0], gz[1])}`).toBe(`${gz}:井泉水`);
    }
    // 反证：全表里「泉中水」这个名字已经不存在（不是靠归一化抹平的）
    const names = new Set(JIAZI.map((gz) => AC.NA_YIN[gz]));
    expect(names.has("泉中水")).toBe(false);
    expect(names.has("井泉水")).toBe(true);
  });

  it("十神：10 干 × 10 干 全枚举一致", () => {
    const bad: string[] = [];
    for (const d of GAN) for (const o of GAN) {
      const a = A.calcShiShen(d, o);
      const b = B.shiShenShort(d, o);
      if (a !== b) bad.push(`日${d}对${o}：A=${a} B=${b}`);
    }
    expect(bad).toEqual([]);
  });

  it("长生十二宫：10 干 × 12 支 全枚举，B 与「起宫常量阳顺阴逆」独立推导一致", () => {
    const YANG = new Set(["甲", "丙", "戊", "庚", "壬"]);
    const bad: string[] = [];
    for (const g of GAN) for (const z of ZHI) {
      const start = ZHI.indexOf(AC.CHANG_SHENG[g]);
      const step = YANG.has(g) ? 1 : -1;
      const idx = (((ZHI.indexOf(z) - start) * step) % 12 + 12) % 12;
      const a = AC.DI_SHI[idx];
      const b = B.changSheng(g, z);
      if (a !== b) bad.push(`${g}${z}：推导=${a} B=${b}`);
    }
    expect(bad).toEqual([]);
  });

  it("日柱：1900-01-01 ~ 2049-12-31 逐日全枚举一致", () => {
    const bad: string[] = [];
    let n = 0;
    const d = new Date(Date.UTC(1900, 0, 1));
    const end = Date.UTC(2050, 0, 1);
    while (d.getTime() < end) {
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate();
      n++;
      const a = A.calcRiZhu(y, m, dd).ganZhi;
      const bz = B.dayGanzhi(y, m, dd, 12);
      if (a !== bz.gan + bz.zhi && bad.length < 20) bad.push(`${y}-${m}-${dd}：A=${a} B=${bz.gan}${bz.zhi}`);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    expect(n).toBeGreaterThan(54000);   // 反证：真的跑满了
    expect(bad).toEqual([]);
  });

  it("时柱：10 日干 × 24 小时 全枚举一致", () => {
    const bad: string[] = [];
    for (const g of GAN) for (let h = 0; h < 24; h++) {
      const a = A.calcShiZhu(g, h).ganZhi;
      const bz = B.hourGanzhi(g, h);
      if (a !== bz.gan + bz.zhi) bad.push(`日干${g} ${h}时：A=${a} B=${bz.gan}${bz.zhi}`);
    }
    expect(bad).toEqual([]);
  });

  it("年柱：1900–2050 × 每月 1/4/5/15 日（跨立春两侧）一致", () => {
    const bad: string[] = [];
    for (let y = 1900; y <= 2050; y++) for (let m = 1; m <= 12; m++) for (const dd of [1, 4, 5, 15]) {
      const a = A.calcNianZhu(y, m, dd, 12, 0).ganZhi;
      const bz = B.yearGanzhi(y, m, dd, 12, 0);
      if (a !== bz.gan + bz.zhi) bad.push(`${y}-${m}-${dd}：A=${a} B=${bz.gan}${bz.zhi}`);
    }
    expect(bad).toEqual([]);
  });

  /**
   * 月柱每算一次都要过节气，单点约 7ms，跑满 1950–2050 逐年要 41 秒——
   * 占整个服务端测试套的两成，太贵。这里**隔三年取一年**（34 年 × 12 月 × 5 日 ≈ 2040 点），
   * 交节分界的覆盖不受影响（分界逻辑与年份无关，换年只是换一组节气时刻）。
   * 全量 6060 点已在 `artifacts/paipan-compare-20260919/bazi-cores-compare.cjs` 跑过并通过，
   * 这里留的是抓回归的密度，不是首次核验的密度。
   */
  it("月柱：1950–2050 隔三年取样 × 每月 1/6/7/15/22 日（跨交节两侧）一致", () => {
    const bad: string[] = [];
    for (let y = 1950; y <= 2050; y += 3) for (let m = 1; m <= 12; m++) for (const dd of [1, 6, 7, 15, 22]) {
      const sz = A.calcSiZhu({ year: y, month: m, day: dd, hour: 12, minute: 0 });
      const a = sz.yue.gan + sz.yue.zhi;   // 返回的是 {nian,yue,ri,shi}，每柱只有 gan/zhi
      const bz = B.monthGanzhi(y, m, dd, 12, 0);
      if (a !== bz.gan + bz.zhi) bad.push(`${y}-${m}-${dd}：A=${a} B=${bz.gan}${bz.zhi}`);
    }
    expect(bad).toEqual([]);
  });

  it("空亡：60 甲子全枚举，B 与「本旬地支补集」独立推导一致（不查表）", () => {
    const bad: string[] = [];
    for (let i = 0; i < 60; i++) {
      const gz = JIAZI[i];
      const b = B.kongWangOf(gz[0], gz[1]).join("");
      const head = i - (i % 10);
      const used = new Set<string>();
      for (let k = 0; k < 10; k++) used.add(ZHI[(head + k) % 12]);
      const expected = ZHI.filter((z) => !used.has(z)).join("");
      if (b !== expected) bad.push(`${gz}：B=${b} 推导=${expected}`);
    }
    expect(bad).toEqual([]);
  });
});
