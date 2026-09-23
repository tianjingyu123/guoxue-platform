import * as fs from "fs";
import * as path from "path";

/**
 * 合盘干支关系表：可推导规则 + 对称性（2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * `apps/mobile/src/pkg-paipan/lib/hepan-engine.ts` 的三刑原本是一张**单向**字符串表
 * `new Set(["寅巳","巳申","申寅","丑戌","戌未","未丑","子卯","卯子"])`，
 * 调用处 `ZHI_XING.has(yzA + yzB)` 只查一个方向，
 * 十四个有序组合漏了六个：**巳寅、申巳、寅申、戌丑、未戌、丑未**。
 *
 * 这是**合盘**：相刑是对称关系，可把两个人的录入顺序对调，同一对八字就从
 * 「相刑，相处须存敬让」变成无事——分数、断语、风险提示全不一样。
 * 而且它在 `else if` 链里，漏判直接落到「无特殊关系」，偏在**少扣分少提醒**那一侧。
 *
 * 同一文件里 `ganHe`/`zhiLiuHe` 都写了 `a+b ?? b+a`，`GAN_CHONG`/`ZHI_HAI` 都列了双向，
 * 唯独三刑没有——**同一文件内的风格不一致本身就是气味**。
 *
 * ══ 判据 ══
 *
 * 全部**可推导**，不抄外部表：
 *   · 天干五合：两干相隔 5（甲己、乙庚…），化气按土金水木火，恰是五行相生链
 *   · 天干四冲：两干相隔 6，且戊己居中不冲
 *   · 地支六合：两支序数之和 ≡ 1 (mod 12)
 *   · 地支六害：两支序数之和 ≡ 7 (mod 12)
 *   · 地支六冲：两支相隔 6
 *   · 三合局：三支两两相隔 4，局之五行即中支五行
 *   · 天乙贵人：不入辰戌（魁罡）
 *   · 红鸾天喜：天喜必为红鸾对冲
 *   · **凡对称关系的查表，必须双向完整**
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/hepan-engine.ts"), "utf8",
);

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const gi = (g: string) => GAN.indexOf(g);
const zi = (z: string) => ZHI.indexOf(z);

/** 取一个 `new Set([...])` 里的字符串项 */
function setItems(name: string): string[] {
  const m = new RegExp(`const ${name} = new Set\\(\\[([^\\]]*)\\]`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}
/** 取一个对象字面量的 键→首个字符串值 */
function objPairs(name: string): [string, string][] {
  const m = new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  return [...m[1].matchAll(/([一-龥]+):\s*(?:\[)?\s*"([^"]+)"/g)].map((x) => [x[1], x[2]]);
}

describe("合盘干支关系表", () => {
  it("反证：各表都解析到了（否则下面全是空跑）", () => {
    expect(objPairs("GAN_HE")).toHaveLength(5);
    expect(setItems("GAN_CHONG")).toHaveLength(8);
    expect(objPairs("ZHI_LIUHE")).toHaveLength(6);
    expect(setItems("ZHI_HAI")).toHaveLength(12);
    expect(setItems("ZI_XING")).toHaveLength(4);
  });

  it("天干五合：两干相隔 5，化气依土金水木火（五行相生链）", () => {
    const SHENG: Record<string, string> = { 土: "金", 金: "水", 水: "木", 木: "火" };
    const pairs = objPairs("GAN_HE");
    const bad: string[] = [];
    let prev: string | null = null;
    for (const [k, wx] of pairs) {
      const [a, b] = [k[0], k[1]];
      if ((gi(a) + 5) % 10 !== gi(b)) bad.push(`${k} 不相隔 5`);
      if (prev && SHENG[prev] !== wx) bad.push(`化气 ${prev}→${wx} 不合相生链`);
      prev = wx;
    }
    expect(bad).toEqual([]);
  });

  /**
   * ⚠️ 这条我第一版写成「两干相隔 6」，四条反向全红——
   * 甲→庚 是 +6，庚→甲 是 +4，**十干环上 +6 不是对合**，
   * 单方向的算术关系不能直接拿来当对称关系的判据。
   * 与九宫那次「幻方只在元旦盘成立」同类：**不变量本身也要先确认成立范围**。
   * 改用真正对称的表述：同性 + 五行相克，且土居中不冲。
   */
  it("天干四冲：同性相克、土居中不冲、双向完整", () => {
    const WX: Record<string, string> = {
      甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
      己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
    };
    const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
    const yang = (g: string) => "甲丙戊庚壬".includes(g);
    const items = setItems("GAN_CHONG");
    const bad: string[] = [];
    for (const s of items) {
      const [a, b] = [s[0], s[1]];
      if (yang(a) !== yang(b)) bad.push(`${s} 非同性`);
      if (KE[WX[a]] !== WX[b] && KE[WX[b]] !== WX[a]) bad.push(`${s} 五行不相克`);
      if ("戊己".includes(a) || "戊己".includes(b)) bad.push(`${s} 含戊己（土居中不冲）`);
      if (!items.includes(b + a)) bad.push(`${s} 缺反向 ${b + a}`);
      // 无序对上仍应满足「一个方向是 +6」——这才是那条算术关系的正确说法
      if ((gi(a) + 6) % 10 !== gi(b) && (gi(b) + 6) % 10 !== gi(a)) bad.push(`${s} 两个方向都不是 +6`);
    }
    // 反证：四对八条，别因为解析空了而全绿
    expect(new Set(items.map((s) => [s[0], s[1]].sort().join("")))).toHaveProperty("size", 4);
    expect(bad).toEqual([]);
  });

  it("地支六合：两支序数之和 ≡ 1 (mod 12)", () => {
    const bad = objPairs("ZHI_LIUHE")
      .filter(([k]) => (zi(k[0]) + zi(k[1])) % 12 !== 1)
      .map(([k]) => `${k} 之和 ${(zi(k[0]) + zi(k[1])) % 12} ≠ 1`);
    expect(bad).toEqual([]);
  });

  it("地支六害：两支序数之和 ≡ 7 (mod 12)，且双向完整", () => {
    const items = setItems("ZHI_HAI");
    const bad: string[] = [];
    for (const s of items) {
      const [a, b] = [s[0], s[1]];
      if ((zi(a) + zi(b)) % 12 !== 7) bad.push(`${s} 之和 ${(zi(a) + zi(b)) % 12} ≠ 7`);
      if (!items.includes(b + a)) bad.push(`${s} 缺反向 ${b + a}`);
    }
    expect(bad).toEqual([]);
  });

  it("三合局：三支两两相隔 4，局之五行即中支五行", () => {
    const m = /const SANHE[^=]*=\s*\[([\s\S]*?)\n\]/.exec(SRC)!;
    const rows = [...m[1].matchAll(/\["([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"\]/g)];
    expect(rows).toHaveLength(4);       // 反证
    const ZHI_WX: Record<string, string> = {
      子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
      午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
    };
    const bad: string[] = [];
    for (const [, a, b, c, wx] of rows) {
      if ((zi(a) + 4) % 12 !== zi(b) || (zi(b) + 4) % 12 !== zi(c)) bad.push(`${a}${b}${c} 不是等距 4`);
      if (ZHI_WX[b] !== wx) bad.push(`${a}${b}${c} 局气 ${wx}，中支 ${b} 属 ${ZHI_WX[b]}`);
    }
    expect(bad).toEqual([]);
  });

  it("天乙贵人：不入辰戌（魁罡），十干齐备", () => {
    const m = /const TIANYI[^=]*=\s*\{([\s\S]*?)\n\}/.exec(SRC)!;
    const rows = [...m[1].matchAll(/([一-龥]):\s*\["([^"]+)",\s*"([^"]+)"\]/g)];
    expect(rows).toHaveLength(10);      // 反证：十干齐备
    const bad = rows
      .filter(([, , x, y]) => "辰戌".includes(x) || "辰戌".includes(y))
      .map(([, g, x, y]) => `${g}：${x}${y}`);
    expect(bad).toEqual([]);
  });

  it("三刑：改成按组现判，单向字符串表已不复存在（防回退）", () => {
    // 原来的写法一旦回来，这条立刻红
    expect(SRC).not.toMatch(/const ZHI_XING = new Set/);
    expect(SRC).toContain("function zhiXing(");
    expect(SRC).toMatch(/zhiXing\(yzA, yzB\)/);
  });

  it("三刑：三组内容正确，且判定对 144 种有序组合完全对称", () => {
    const m = /const XING_GROUPS[^=]*=\s*\[([\s\S]*?)\n\]/.exec(SRC)!;
    const groups = [...m[1].matchAll(/\[([^\]]+)\]/g)]
      .map((x) => [...x[1].matchAll(/"([^"]+)"/g)].map((y) => y[1]));
    expect(groups).toEqual([["寅", "巳", "申"], ["丑", "戌", "未"], ["子", "卯"]]);

    // 按源码里的同一条规则重算，逐对检查对称性
    const xing = (a: string, b: string) => a !== b && groups.some((g) => g.includes(a) && g.includes(b));
    const bad: string[] = [];
    let hits = 0;
    for (const a of ZHI) for (const b of ZHI) {
      if (xing(a, b) !== xing(b, a)) bad.push(`${a}${b} 与 ${b}${a} 判定不一致`);
      if (xing(a, b)) hits++;
    }
    expect(bad).toEqual([]);
    // 反证：命中数必须是 3×2 + 3×2 + 1×2 = 14，不是 0（否则「完全对称」是因为全不命中）
    expect(hits).toBe(14);
  });

  it("反证：原来那张单向表在对称性上确实是坏的（证明上一条不是走过场）", () => {
    const OLD = ["寅巳", "巳申", "申寅", "丑戌", "戌未", "未丑", "子卯", "卯子"];
    const missing = OLD.filter((s) => !OLD.includes(s[1] + s[0]));
    // ⚠️ 用集合比，不要 sort 后比数组：JS 的 sort() 按 **UTF-16 码元**排中文，
    // 手打的次序几乎一定对不上（本项目栽过，见「手写期望值第五次翻车」）。
    expect(new Set(missing)).toEqual(new Set(["寅巳", "巳申", "申寅", "丑戌", "戌未", "未丑"]));
    expect(missing).toHaveLength(6);
  });

  it("红鸾天喜：天喜必为红鸾对冲，红鸾自年支逆行（子见卯）", () => {
    const hongLuan = (z: string) => ZHI[(3 - zi(z) + 12) % 12];
    const tianXi = (z: string) => ZHI[(zi(hongLuan(z)) + 6) % 12];
    // 与源码里的实现同式（源码就是这两行），此处核的是这两行满足的性质
    expect(SRC).toMatch(/ZHIS\[\(3 - ZHIS\.indexOf\(yearZhi\) \+ 12\) % 12\]/);
    expect(hongLuan("子")).toBe("卯");
    const bad = ZHI.filter((z) => (zi(hongLuan(z)) + 6) % 12 !== zi(tianXi(z)));
    expect(bad).toEqual([]);
    // 逆行：年支进一位，红鸾退一位
    const back = ZHI.filter((z, i) => hongLuan(ZHI[(i + 1) % 12]) !== ZHI[(zi(hongLuan(z)) - 1 + 12) % 12]);
    expect(back).toEqual([]);
  });
});
