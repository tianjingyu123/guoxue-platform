import * as fs from "fs";
import * as path from "path";

/**
 * 字典查询·五音表覆盖（2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * `apps/mobile/src/pkg-paipan2/lib/zidian-engine.ts` 的 `WUYIN_TABLE` 只写了五条规则
 * （gkh / dtnl / bpmf / zh-ch-sh-z-c-s-r / y-w-a-o-e），**漏掉 j、q、x**，
 * 函数末尾一句 `return { yin: '宫', desc: '喉音，五行属土' }` 把它们全兜了。
 *
 * 实测拼音表 20856 字，**3954 字（19.0%）落进这条兜底**（j=1610、x=1325、q=1019）；
 * 抽 26 个常用起名字（江健杰家君金晶嘉佳静秋清强青琴乾小新雪贤心欣宣轩旭学）**全部中招**。
 *
 * 而「宫·喉音」对应 y/w 与零声母，**j/q/x 在任何一派下都不是喉音**——
 * 这不是流派之争，是兜底把「没有规则」变成了「看着有答案」。
 *
 * j/q/x 究竟属哪一音，**从今音判不出来**（中古见系→牙音·角·木，精系→齿音·商·金，
 * 现代拼音已合并）；旧版「字典查询」页不提供五音字段，**拿不到外部基准**。
 * 所以实现改为如实标「待定」并写明两源，不替决策人选派。
 *
 * ══ 本测试守什么 ══
 *
 * ① 全部 21 个声母 + 零声母都必须被**显式**处理，不得再有「无规则却给出确定答案」的情况；
 * ② 「待定」只能出现在 j/q/x 上——换句话说，谁要是把别的声母也推给待定，这里会红。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/zidian-engine.ts"), "utf8",
);

/** 把源码里的规则抄出来跑（与实现同源，所以另配「声母全覆盖」这类独立判据） */
function rules(): [RegExp, string][] {
  const blk = /const WUYIN_TABLE[^=]*=\s*\[([\s\S]*?)\n\]/.exec(SRC);
  if (!blk) throw new Error("WUYIN_TABLE 没解析到");
  return [...blk[1].matchAll(/\[(\/[^/]+\/),\s*'([^']+)'/g)].map(
    (m) => [new RegExp(m[1].slice(1, -1)), m[2]] as [RegExp, string],
  );
}

/** 汉语拼音的全部声母 + 零声母起首 */
const INITIALS = [
  "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h",
  "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w",
  "a", "o", "e",   // 零声母
];

describe("字典查询·五音表覆盖", () => {
  const R = rules();

  it("反证：规则解析到了 5 条（解析失败会让下面全变空跑）", () => {
    expect(R).toHaveLength(5);
    expect(R.map((x) => x[1]).sort()).toEqual(["商", "宫", "徵", "羽", "角"].sort());
  });

  it("除 j/q/x 外，全部声母都有明确规则命中", () => {
    const uncovered = INITIALS.filter((i) => !R.some(([re]) => re.test(i)));
    expect(uncovered.sort()).toEqual(["j", "q", "x"]);
  });

  it("j/q/x 必须如实标「待定」，不得被兜底成宫/土", () => {
    // 源码层面确认：有专门的 j/q/x 分支，且在通用兜底之前
    const jqxBranch = SRC.indexOf('/^[jqx]/');
    const fallback = SRC.indexOf("return { yin: '宫', desc: '喉音，五行属土' }\n}");
    expect(jqxBranch).toBeGreaterThan(-1);
    expect(SRC).toMatch(/yin: '待定'/);
    // 分支必须排在最后那条兜底之前，否则永远走不到
    const lastFallback = SRC.lastIndexOf("yin: '宫'");
    expect(jqxBranch).toBeLessThan(lastFallback);
    void fallback;
  });

  it("「待定」不得蔓延到别的声母（只允许 j/q/x）", () => {
    const branch = /if \(\/\^\[([a-z]+)\]\/\.test\(clean\)\) \{\s*return \{\s*yin: '待定'/.exec(SRC);
    expect(branch).not.toBeNull();
    expect(branch![1]).toBe("jqx");
  });

  it("说明文字里写清了「判不出来」的原因（见系/精系两源）", () => {
    expect(SRC).toMatch(/见系/);
    expect(SRC).toMatch(/精系/);
  });
});
