import { calcWuGe, wuGeInvariantsHold } from "@guoxue/shared/paipan";

/**
 * 五格结构不变量（2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * `shared/paipan/wuge.ts` 原来的外格是 `总格 − 人格 + 1`，
 * 它与同一个函数自己算的天格、地格**自相矛盾**：
 *
 *     天格 + 地格 = 人格 + 外格        ← 由「假添一」直接推出
 *
 * 天格覆盖「姓 + 单姓假添的 1」、地格覆盖「名 + 单名假添的 1」，合起来就是全部四个位置；
 * 人格取「姓末 + 名首」、外格取「姓首 + 名末」，也是同样四个位置的另一种配对。
 * 所以这条等式必然成立——而原式在**单姓单名**与**复姓双名**下不成立。
 *
 * 分歧不小：单姓单名原式恒给外格 1（数理**大吉**），正解给 2（数理**凶**），
 * 400 个常见单姓单名实测 **100% 吉凶相反**。C 端用户看到的前端引擎给的是 2。
 * 而 `xingming-jiexi` 是**已过闸门**的工具，闸门注释还写着「放行的是五格/三才/笔画这一层」。
 *
 * ══ 为什么以前查不出来 ══
 *
 * 原来的 `wuGeInvariantsHold` 第一条写的是
 * 「`外格 = 总格 − 人格 + 1` —— 定义式，四种情形皆成立」，
 * **拿实现自己当规格**：实现怎么写它就怎么成立。
 * 换成上面那条结构恒等式之后才有判别力——它与外格的算法相互独立。
 */
describe("五格结构不变量", () => {
  /** 四种姓名形态 × 笔画组合全枚举（1–24 画覆盖绝大多数汉字） */
  const shapes: { name: string; sur: number[]; giv: number[] }[] = [];
  for (let a = 1; a <= 24; a++) for (let b = 1; b <= 24; b++) {
    shapes.push({ name: "单姓单名", sur: [a], giv: [b] });
    shapes.push({ name: "单姓双名", sur: [a], giv: [b, ((a + b) % 24) + 1] });
    shapes.push({ name: "复姓单名", sur: [a, ((a * 2) % 24) + 1], giv: [b] });
    shapes.push({ name: "复姓双名", sur: [a, ((a * 2) % 24) + 1], giv: [b, ((b * 3) % 24) + 1] });
  }

  it(`反证：四种形态都枚举到了，共 ${shapes.length} 组`, () => {
    expect(new Set(shapes.map((s) => s.name)).size).toBe(4);
    expect(shapes.length).toBe(24 * 24 * 4);
  });

  it("天格 + 地格 = 人格 + 外格（全枚举）", () => {
    const bad: string[] = [];
    for (const s of shapes) {
      const g = calcWuGe({ surnameStrokes: s.sur, givenStrokes: s.giv });
      if (g.tianGe + g.diGe !== g.renGe + g.waiGe) {
        bad.push(`${s.name} 姓${s.sur.join("+")} 名${s.giv.join("+")}：${g.tianGe}+${g.diGe} ≠ ${g.renGe}+${g.waiGe}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(bad).toHaveLength(0);
  });

  it("总格 = 姓总 + 名总（全枚举）", () => {
    const bad: string[] = [];
    for (const s of shapes) {
      const g = calcWuGe({ surnameStrokes: s.sur, givenStrokes: s.giv });
      const want = s.sur.reduce((a, b) => a + b, 0) + s.giv.reduce((a, b) => a + b, 0);
      if (g.zongGe !== want) bad.push(`${s.name}：${g.zongGe} ≠ ${want}`);
    }
    expect(bad).toHaveLength(0);
  });

  it("单姓单名外格恒为 2（姓名各假添的 1 之和），不是 1", () => {
    const wai = new Set<number>();
    for (let a = 1; a <= 24; a++) for (let b = 1; b <= 24; b++) {
      wai.add(calcWuGe({ surnameStrokes: [a], givenStrokes: [b] }).waiGe);
    }
    expect([...wai]).toEqual([2]);
  });

  it("复姓不假添：天格 = 姓两字之和", () => {
    const bad: string[] = [];
    for (let a = 1; a <= 24; a++) for (let b = 1; b <= 24; b++) {
      const g = calcWuGe({ surnameStrokes: [a, b], givenStrokes: [5] });
      if (g.tianGe !== a + b) bad.push(`姓${a}+${b}：天格 ${g.tianGe}`);
    }
    expect(bad).toHaveLength(0);
  });

  it("shared 自带的 wuGeInvariantsHold 对全枚举都成立", () => {
    const bad: string[] = [];
    for (const s of shapes) {
      const r = wuGeInvariantsHold({ surnameStrokes: s.sur, givenStrokes: s.giv });
      if (!r.ok) bad.push(`${s.name} 姓${s.sur.join("+")} 名${s.giv.join("+")}: ${r.broken.join("; ")}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(bad).toHaveLength(0);
  });

  it("反证：把外格改回旧式，恒等式必须报红（证明这条判据不是摆设）", () => {
    // 旧式：外格 = 总格 − 人格 + 1
    const broken: string[] = [];
    for (const s of shapes) {
      const g = calcWuGe({ surnameStrokes: s.sur, givenStrokes: s.giv });
      const oldWai = g.zongGe - g.renGe + 1;
      if (g.tianGe + g.diGe !== g.renGe + oldWai) broken.push(s.name);
    }
    // 旧式应当在「单姓单名」「复姓双名」两种形态上违反
    expect(new Set(broken)).toEqual(new Set(["单姓单名", "复姓双名"]));
  });
});
