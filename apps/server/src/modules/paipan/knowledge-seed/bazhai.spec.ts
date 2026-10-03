import { BAZHAI_SEEDS } from "./bazhai";
import { youXingMap } from "../../tool-registry/calculators/bazhai.calculator";

/**
 * 八宅知识条目的自检（2026-09-19）。
 *
 * 为什么要有这组测试：八卦条目里的「四吉方／四凶方」是**手写**的，
 * 八个卦 × 八个方位 = 64 处方位与星名，抄错一处人眼根本看不出来——
 * 而后端原先那张游星表正是这么错的（八行错七行，艮兑两行还一字不差）。
 * 所以这里把条目正文解析出来，与引擎的 `youXingMap` 逐格比对。
 *
 * 另外还检查两件已经栽过跟头的事：
 * - 每个议题有且只有一条 platform_line（少了整个议题不展示，多了会打架）；
 * - tag 不能是永远检索不到的死 tag（真盘扫描见 bazhai-report 的验证脚本）。
 */
describe("八宅知识条目", () => {
  const GUA_DIR: Record<string, string> = {
    坎: "正北", 艮: "东北", 震: "正东", 巽: "东南",
    离: "正南", 坤: "西南", 兑: "正西", 乾: "西北",
  };
  const PARSE = /([坎艮震巽离坤兑乾])(正北|东北|正东|东南|正南|西南|正西|西北)（(生气|天医|延年|伏位|绝命|五鬼|六煞|祸害)）/g;

  it("八卦条目的四吉方／四凶方与引擎逐格一致（64 处）", () => {
    const guaEntries = BAZHAI_SEEDS.filter((s) => s.topic.startsWith("卦象："));
    expect(guaEntries).toHaveLength(8);

    let checked = 0;
    for (const e of guaEntries) {
      const gua = e.topic.replace("卦象：", "");
      const want = youXingMap(gua);
      const seen = new Set<string>();

      for (const m of e.content.matchAll(PARSE)) {
        const [, dirGua, dirWord, star] = m;
        // 方位词要与卦相符（写「巽正北」这种错位也要抓出来）
        expect(`${gua}条·${dirGua}的方位=${dirWord}`).toBe(`${gua}条·${dirGua}的方位=${GUA_DIR[dirGua]}`);
        // 星名要与引擎一致
        expect(`${gua}条·${dirGua}方=${star}`).toBe(`${gua}条·${dirGua}方=${want[dirGua]}`);
        seen.add(dirGua);
        checked++;
      }
      // 八方一个不漏
      expect(`${gua}条覆盖方位数=${seen.size}`).toBe(`${gua}条覆盖方位数=8`);
    }
    expect(checked).toBe(64);
  });

  it("八卦条目的 tag 是「X命」「X宅」两个，与 signals 产出对得上", () => {
    for (const e of BAZHAI_SEEDS.filter((s) => s.topic.startsWith("卦象："))) {
      const gua = e.topic.replace("卦象：", "");
      expect(e.tags.slice().sort()).toEqual([`${gua}命`, `${gua}宅`].sort());
    }
  });

  it("每个议题有且只有一条 platform_line", () => {
    const byKey = new Map<string, number>();
    for (const s of BAZHAI_SEEDS) {
      if (!s.debateKey) continue;
      if (s.stance === "platform_line") byKey.set(s.debateKey, (byKey.get(s.debateKey) ?? 0) + 1);
      else if (!byKey.has(s.debateKey)) byKey.set(s.debateKey, 0);
    }
    expect(byKey.size).toBeGreaterThan(0);
    for (const [key, n] of byKey) expect(`${key} 的 platform_line 条数=${n}`).toBe(`${key} 的 platform_line 条数=1`);
  });

  it("全部条目都挂在 bazhai 下，且都有 tag", () => {
    for (const s of BAZHAI_SEEDS) {
      expect(s.paipanType).toBe("bazhai");
      expect(s.tags.length).toBeGreaterThan(0);
      expect(s.content.length).toBeGreaterThan(50);
    }
  });
});
