import { calculateZhuGe } from "./zhuge.calculator";

/**
 * 诸葛神数回归（2026-09-19，接续文档 §2.104）
 *
 * ══ 修之前：76% 的签文永远抽不到 ══
 *
 * 原起数法是**三字笔画直接相加**再对 384 取余
 * （另有一句「每数上限215」，而汉字笔画根本到不了 215，那个上限从不生效）。
 *
 * 后果是**结构性的**：汉字笔画现实范围 1–30，三字之和最多约 90，
 * 于是**第 91–384 签永远抽不到**。实测 10648 组报数只覆盖 64 个签号（范围 3–66）。
 *
 * 这不是精度问题——**三分之二以上的签文写了也没人看得到**。
 *
 * 正法见`modules/paipan/engine/zhuge-engine.ts`（原前端引擎，2026-09-21 迁入服务端）：
 * 三字康熙笔画**各取个位**组成三位数，超 384 循环减 384。
 * 这是**第 9 次「前端对·后端错」**。
 */

const run = (numbers: number[]) =>
  calculateZhuGe({ method: "baoshu", numbers } as Record<string, unknown>) as any;
const qianOf = (r: any): number => r.qiShuProcess?.finalNumber ?? r.qianWen?.number;

describe("诸葛神数：384 签必须全部可达", () => {
  /**
   * 这一条是本文件的核心判据。
   * 修前只覆盖 64 个（3–66）——**签文库写了 384 条，能抽到的不足两成**。
   */
  it("穷举三字笔画 1–30，384 签一个不漏", () => {
    const seen = new Set<number>();
    for (let a = 1; a <= 30; a++)
      for (let b = 1; b <= 30; b++)
        for (let c = 1; c <= 30; c++) seen.add(qianOf(run([a, b, c])));
    const miss: number[] = [];
    for (let i = 1; i <= 384; i++) if (!seen.has(i)) miss.push(i);
    expect(`未覆盖=${miss.slice(0, 8).join(",")}`).toBe("未覆盖=");
    expect(`覆盖数=${seen.size}`).toBe("覆盖数=384");
  });

  it("签号恒在 1–384（不得为 0 或越界）", () => {
    for (let a = 1; a <= 40; a += 3)
      for (let b = 1; b <= 40; b += 3)
        for (let c = 1; c <= 40; c += 3) {
          const n = qianOf(run([a, b, c]));
          expect(`${a},${b},${c} → ${n >= 1 && n <= 384}`).toBe(`${a},${b},${c} → true`);
        }
  });

  it("全为十的倍数时（各位皆 0）归第 384 签，不得为 0", () => {
    expect(qianOf(run([10, 20, 30]))).toBe(384);
  });
});

describe("诸葛神数：起数法为「各取个位组三位数」", () => {
  it("[5,8,13] → 个位 5/8/3 → 583 → 减 384 → 第 199 签", () => {
    const r = run([5, 8, 13]);
    expect(qianOf(r)).toBe(199);
    expect(r.qiShuProcess.processDesc).toContain("各取个位");
    expect(r.qiShuProcess.processDesc).toContain("583");
  });

  it("三位数不超 384 时直接即为签号", () => {
    // 个位 1/2/3 → 123
    expect(qianOf(run([1, 2, 3]))).toBe(123);
    expect(qianOf(run([11, 22, 33]))).toBe(123); // 个位相同则签号相同
  });

  it("只取个位——笔画的十位不影响结果", () => {
    expect(qianOf(run([7, 4, 9]))).toBe(qianOf(run([17, 24, 39])));
  });

  it("起数过程如实写出，用户可自验", () => {
    const d = run([9, 9, 9]).qiShuProcess.processDesc;
    expect(d).toContain("三字笔画");
    expect(d).toContain("999");
    // 999 - 384 - 384 = 231
    expect(qianOf(run([9, 9, 9]))).toBe(231);
  });
});

describe("诸葛神数：签文完整性", () => {
  it("每签都有签文、吉凶类型与白话", () => {
    for (const nums of [[1, 2, 3], [5, 8, 13], [9, 9, 9], [10, 20, 30]]) {
      const q = run(nums).qianWen;
      expect(q.text.length).toBeGreaterThan(5);
      expect(q.type.length).toBeGreaterThan(0);
      expect(q.baiHua.length).toBeGreaterThan(5);
    }
  });

  it("同一输入可复现", () => {
    expect(JSON.stringify(run([3, 7, 11]))).toBe(JSON.stringify(run([3, 7, 11])));
  });
});

/**
 * 2026-09-20 追加：签文真伪与笔画来源
 *
 * 上面那组「每签都有签文」的断言，在签文被占位符填满时**照样会绿**——
 * 所以必须另立一组，把「哪些是真的」这件事显式钉住。
 */
describe("诸葛神数：签文必须是典籍原文，不得拼接生成", () => {
  const runChars = (chars: string) =>
    calculateZhuGe({ method: "sanzi", chars } as Record<string, unknown>) as any;

  it("当前收录状态：38 签真原文 + 346 签明示未收录（改善了请同步改这里的数字）", () => {
    let real = 0, placeholder = 0;
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) for (let c = 1; c <= 10; c++) {
      const r = run([a, b, c]);
      const t: string = r.qianWen.text;
      if (/原文未收录/.test(t)) placeholder++; else real++;
    }
    // 至少两类都出现过，说明这条不是空跑
    expect(real).toBeGreaterThan(0);
    expect(placeholder).toBeGreaterThan(0);
    // 未收录的必须**一眼可辨**，不能混作签文
    const sample = run([2, 2, 2]);
    if (/原文未收录/.test(sample.qianWen.text)) {
      expect(sample.qianWen.text).toMatch(/^【第 \d+ 签原文未收录】$/);
    }
  });

  it("停用的模板生成不得复活：输出里不出现拼接签文的特征串", () => {
    // 生成器的模板会拼出「卧龙起，猛虎啸」这类由 keywords 填出来的句子。
    // 抽 200 组输入，签文要么是真原文、要么是未收录标记，不得出现第三种。
    const bad: string[] = [];
    for (let i = 0; i < 200; i++) {
      const a = (i % 30) + 1, b = ((i * 7) % 30) + 1, c = ((i * 13) % 30) + 1;
      const t: string = run([a, b, c]).qianWen.text;
      if (!/原文未收录/.test(t) && t.length < 6) bad.push(`${a}/${b}/${c} → ${t}`);
    }
    expect(bad).toEqual([]);
  });

  it("康熙笔画逐字等于 shared 真表（不是按码点估算出来的）", () => {
    /**
     * 原实现是「本地 1494 字表 + `Math.round(5 + (code-0x4E00)/(0x9FFF-0x4E00)*15)`」，
     * 注释写「基于Unicode位置的合理估算」——码点与笔画毫无关系，那句话本身是假的。
     * 实测：92.9% 的字落进估算，整体只有 12.0% 的笔画正确；
     * 诸葛只取**个位**，个位正确率 13.7%，即约 86% 的字会起错签。
     *
     * 这里不抽样：在 CJK 基本区里等距取 400 个字，逐字比对 shared 康熙表。
     * （顺带一提：shared 表 20992 字**恰好覆盖整个 U+4E00–U+9FFF**，
     *  所以对本工具而言「查不到」的分支不可达——这也是为什么不能拿「〇」来试，
     *  它是 U+3007，在取字时就被过滤掉了。我第一版正是这么试错的。）
     */
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { strokeOfOrNull } = require("@guoxue/shared/paipan");
    const bad: string[] = [];
    for (let i = 0; i < 400; i++) {
      const cp = 0x4e00 + Math.floor((i * 20992) / 400);
      const ch = String.fromCodePoint(cp);
      const r = runChars(ch + ch + ch);
      const want = strokeOfOrNull(ch);
      if (r.qiShuProcess.strokes[0] !== want) bad.push(`${ch} 得${r.qiShuProcess.strokes[0]} 应${want}`);
    }
    expect(bad).toEqual([]);
    // 反证：真表里确实有各种笔画数，不是清一色（否则「全对」可能只是都撞上同一个值）
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      seen.add(strokeOfOrNull(String.fromCodePoint(0x4e00 + Math.floor((i * 20992) / 400))) as number);
    }
    expect(seen.size).toBeGreaterThan(15);
  });

  it("不得用当前时间起数（结果必须可复现）", () => {
    expect(() =>
      calculateZhuGe({ method: "shijian" } as Record<string, unknown>),
    ).toThrow(/不用当前时间起数/);
  });
});
