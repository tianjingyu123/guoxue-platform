import { ToolRegistryService } from "./tool-registry.service";
import { REMOVED_WRONG, VERIFIED_TOOLS } from "./verification-gate";

/**
 * Mock 端点的正确性闸门（2026-09-19，接续文档 §2.83）
 *
 * ══ 补这道闸门的起因 ══
 *
 * `POST /tools/:id/calculate` 一直守着 `REMOVED_WRONG` / `VERIFIED_TOOLS` 两张表，
 * 算错的工具会被挡下并说明理由。但 `GET /tools/:id/mock` **无鉴权、无闸门**——
 * 四个已确认算错、实现已删除的工具（taiyi / jinkoujue / xuankong-feixing / qimen-yin），
 * mock 文件都还躺在 `packages/shared/src/mock/` 里，2.5–5KB 一份，
 * 字段齐全，长得和真盘一模一样。
 *
 * 也就是说，同一个 taiyi：
 *   · 走 `/calculate` → 明确拒绝，告诉你十六神落在非整数宫、三算公式是拍的；
 *   · 走 `/mock`      → 递给你一份完整的太乙盘，调用方无从分辨。
 *
 * 决策人立过的规矩是「不得用 mock 假装某个能力已经接上」。
 * 一份结构完整的假盘摆在公开接口上，比直接报错危险得多——
 * 报错至少会让人去查，假盘只会让人照着它做决定。
 */
describe("ToolRegistryService：mock 端点须与 /calculate 守同一道闸门", () => {
  const svc = new ToolRegistryService();

  /** 这四个的实现已按算错删除，mock 必须同步下架 */
  const DELETED = ["taiyi", "jinkoujue", "xuankong-feixing", "qimen-yin"];

  it.each(DELETED)("%s：实现已删除，mock 一并拒发", (toolId) => {
    expect(REMOVED_WRONG[toolId]).toBeDefined(); // 前提：确实在下架名单里
    expect(() => svc.getMockData(toolId)).toThrow();
  });

  it("拒绝理由要带上具体错因，而不是笼统的「不可用」", () => {
    try {
      svc.getMockData("taiyi");
      throw new Error("本该抛出");
    } catch (e) {
      const msg = String((e as Error).message);
      // 错因原文出自 REMOVED_WRONG，调用方据此能判断是配置问题还是算法问题
      expect(msg).toContain("十六神落宫算出非整数");
      expect(msg).toContain("示例数据同步下架");
    }
  });

  it("下架名单里的每一个，只要挂了 mock 文件就必须被拦住", () => {
    // 防回归：将来再往 REMOVED_WRONG 加条目时，不会漏掉 mock 这一路
    const leaked = Object.keys(REMOVED_WRONG).filter((id) => {
      try {
        return svc.getMockData(id) !== null;
      } catch {
        return false;
      }
    });
    expect(`漏网=${leaked.join(",")}`).toBe("漏网=");
  });

  it("放行的 mock 必须自带 __mock 标记，不能裸发盘面", () => {
    const data = svc.getMockData("bazi") as Record<string, unknown>;
    expect(data).not.toBeNull();
    expect(data.__mock).toBe(true);
    expect(String(data.__notice)).toContain("非真实排盘结果");
    // 真正的盘面被降一层，调用方不可能顺手当成 /calculate 的返回直接用
    expect(data.data).toBeDefined();
  });

  it("verified 字段如实反映该工具当前是否被 /calculate 放行", () => {
    const bazi = svc.getMockData("bazi") as Record<string, unknown>;
    expect(bazi.verified).toBe(VERIFIED_TOOLS.has("bazi"));
    expect(bazi.verified).toBe(true);

    // 未核验的工具即便有 mock，也要老实标 false，不得让人以为能用
    const unverified = ["qimen-fuzhou", "qimen-acupuncture", "company-naming"]
      .filter((id) => !VERIFIED_TOOLS.has(id) && !REMOVED_WRONG[id]);
    expect(unverified.length).toBeGreaterThan(0);
    for (const id of unverified) {
      const d = svc.getMockData(id) as Record<string, unknown> | null;
      if (d) expect(`${id}.verified=${d.verified}`).toBe(`${id}.verified=false`);
    }
  });

  /**
   * 2026-09-20 补：白名单 id 必须与分发表 case 严格对得上。
   *
   * 起因是一次误报——我拿 `wuyunliuqi` 去调，闸门拒了，一瞬间以为是
   * 「核验过的工具被自己的闸门挡住」。实际是我写错 id（表里是 `wuyun-liuqi`）。
   * 但这个误会指出了一个真实存在的失效模式：**闸门与分发表是两处各自维护的字符串**，
   * 拼写一旦分叉，症状是「核验通过的工具永远出不了结果」，
   * 而且错误信息会说「尚未核验」——**指向完全错误的方向**，排查时极易被带偏。
   *
   * 这条用例把两处钉在一起：白名单里有的，分发表必须接得住。
   */
  it("VERIFIED_TOOLS 的每个 id 在分发表里都有对应 case", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "tool-calculation.service.ts"), "utf8");
    const cases = new Set([...src.matchAll(/case "([a-z0-9-]+)"/g)].map((m) => m[1]));
    // 反证：查法本身有效（随便挑一个在用的 id 必须查得到）
    expect(cases.has("bazi")).toBe(true);
    const missing = [...VERIFIED_TOOLS].filter((id) => !cases.has(id));
    expect(`分发缺失=${missing.join(",") || "无"}`).toBe("分发缺失=无");
  });

  it("没有 mock 文件的工具返回 null，不编造", () => {
    expect(svc.getMockData("根本不存在的工具")).toBeNull();
  });

  it("缓存不得把闸门绕过去（先取一次再取，仍须拒绝）", () => {
    // 闸门在缓存检查之前，所以反复调用不会因命中缓存而放行
    expect(() => svc.getMockData("taiyi")).toThrow();
    expect(() => svc.getMockData("taiyi")).toThrow();
  });
});
