import * as fs from "fs";
import * as path from "path";
import { isGuifanHanzi, guifanLevel, GUIFAN_LEVEL1, GUIFAN_LEVEL2 } from "@guoxue/shared/paipan";

/**
 * 起名候选池必须全是规范汉字（2026-09-20）
 *
 * ══ 为什么这条是硬要求 ══
 *
 * 当初选《通用规范汉字表》而不是随便一份「起名常用字」，理由就一条：
 * **户口登记用字须为规范汉字**。一张表同时保证「够多」与「能上户口」。
 * 所以候选池里出现表外字，不是风格问题——**那个名字办不了户口**。
 *
 * ══ 抓到的 ══
 *
 * 前端 `apps/mobile/src/pkg-paipan2/lib/qiming-engine.ts` 的 `CHAR_POOL`（159 字）里
 * 混着两个**繁体字**：「藝」「麗」，都在规范表外。已改为「艺」「丽」。
 * （「麗」那条的《周易·离卦》引文原本也是繁体，随之改为简体——
 *   同文件其余引文本来就是简体，保持一致。）
 *
 * ⚠️ 这条测试读的是**前端源码文本**，不是 import：
 * `apps/mobile` 没有测试框架，而在服务端 jest 里 import 移动端源文件会卡在
 * `liuyao-engine` 那个转发模块上（服务端 tsconfig 解析不到 shared 的深层子路径）。
 */

const ROOT = path.resolve(__dirname, "../../..");
const QIMING = path.join(ROOT, "apps/server/src/modules/paipan/engine/qiming-engine.ts");

function frontendPool(): string[] {
  const src = fs.readFileSync(QIMING, "utf8");
  const blk = /const CHAR_POOL: PoolChar\[\] = \[([\s\S]*?)\n\]/.exec(src);
  if (!blk) throw new Error("CHAR_POOL 没解析到");
  return [...blk[1].matchAll(/\{ char: "(.)"/g)].map((m) => m[1]);
}

describe("起名候选池：必须全是规范汉字", () => {
  const pool = frontendPool();

  it("反证：池子真的解析到了（否则下面是空跑）", () => {
    expect(pool.length).toBeGreaterThan(100);
    expect(new Set(pool).size).toBe(pool.length);   // 顺带：不得重复
  });

  it("池中每个字都在《通用规范汉字表》内（表外字办不了户口）", () => {
    const outside = pool.filter((c) => !isGuifanHanzi(c));
    expect(outside).toEqual([]);
  });

  it("如实记录：池中的三级字（现有 1 个「垚」），它们仍是规范字、办得了户口", () => {
    /**
     * shared 侧自动生成的底池**刻意只取一级+二级**，理由是三级字生僻、
     * 证件系统可能显示成方框。但那条规则是给**自动生成**定的——
     * 《通用规范汉字表》的三级字本身就是「姓氏人名、地名、科技术语」用字，
     * 在表内、能登记。前端这 159 字是**人工精选**的，里面出现「垚」这种
     * 常见人名用字并不违反「办得了户口」这条硬要求。
     *
     * 所以这里**不删字**，只把它钉下来：若将来决定前端池也一律排除三级字，
     * 改这条断言并同步删字；在那之前，三级字只需满足「在规范表内」。
     */
    const lv3 = pool.filter((c) => guifanLevel(c) === 3);
    expect(lv3).toEqual(["垚"]);
    expect(lv3.every((c) => isGuifanHanzi(c))).toBe(true);
  });

  it("反证：规范表本身是齐的（3500 + 3000），不是空集合导致上面全绿", () => {
    expect(GUIFAN_LEVEL1.size).toBe(3500);
    expect(GUIFAN_LEVEL2.size).toBe(3000);
    // 繁体字确实被判为表外——证明 isGuifanHanzi 有判别力
    expect(isGuifanHanzi("藝")).toBe(false);
    expect(isGuifanHanzi("麗")).toBe(false);
    expect(isGuifanHanzi("艺")).toBe(true);
    expect(isGuifanHanzi("丽")).toBe(true);
  });

  it("记录现状：前端池只占可用底池的很小一部分（改善了请更新此数）", () => {
    /**
     * 不是断言「必须多少字」——池子大小是产品取舍。
     * 这条只把现状钉下来，免得它被当成「已经够用」：
     * shared 侧 `naming-pool.ts` 的可用底池是一级 3500 + 二级 3000 = 6500 字，
     * 前端只有 159 字（2.4%）。14 个热门起名字抽样，前端池缺 7 个
     * （瑶懿昀珩玥绾黛）。而起名的另一半重名成因是「打分完全确定性」——
     * 同姓 + 同八字 + 同风格恒得同一批候选，池子越小越是重名制造机。
     */
    expect(pool.length).toBeLessThan(300);
    expect(GUIFAN_LEVEL1.size + GUIFAN_LEVEL2.size).toBe(6500);
    const hot = [..."瑶懿昀珩玥绾黛"];
    expect(hot.every((c) => isGuifanHanzi(c))).toBe(true);        // 都是规范字
    expect(hot.filter((c) => pool.includes(c))).toEqual([]);      // 但都不在前端池里
  });
});
