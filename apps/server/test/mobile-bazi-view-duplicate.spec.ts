import * as fs from "fs";
import * as path from "path";

/**
 * 八字视图组装层双副本防漂移（2026-09-20 立，2026-09-21 随第 4 步改写）
 *
 * ══ 原问题 ══
 *
 * `apps/mobile/src/pkg-paipan/lib/bazi-engine.ts` 与 `apps/mobile/src/pkg-paipan2/lib/bazi-engine.ts`
 * 是同一份代码的两个副本（小程序分包之间不能互相 import，主包又已 1.96/2MB 放不下）。
 * 两份只差一处（pkg-paipan 多一张城市纬度表），本测试曾剔掉该差异后逐字比对，防止改一份忘一份。
 *
 * ══ 2026-09-21：pkg-paipan2 那份已删除 ══
 *
 * 它唯一的使用方是起名/姓名解析，二者已迁至服务端（apps/server/src/modules/paipan/engine/，
 * 服务端用的是 pkg-paipan 版——它是超集，computeBazi 部分逐字相同，由金样对照验证过）。
 * 双副本问题因此消失，本测试改为守两件事：
 *   1. pkg-paipan2 里**不得再出现**第二份八字引擎（复活即回到老问题）；
 *   2. 前端仅存的这份与服务端副本逐字一致 —— 由 `paipan-engine-copies.spec.ts` 负责，这里只确认它在册。
 *
 * ══ 2026-09-21 下午：pkg-paipan 那份也已移除 ══
 *
 * 合盘迁服务端、案例提交页改为直接取四柱后，前端不再有 computeBazi 的调用方。
 * 页面仍要用的展示项（结果类型、城市经纬度、农历文本）拆到 `pkg-paipan/lib/bazi-display.ts`，
 * 它与服务端 bazi-engine 的逐段一致由 `paipan-engine-copies.spec.ts` 守。
 */

const ROOT = path.resolve(__dirname, "../../..");
const F1 = path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/bazi-engine.ts");
const F2 = path.join(ROOT, "apps/mobile/src/pkg-paipan2/lib/bazi-engine.ts");
const DISPLAY = path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/bazi-display.ts");

describe("八字视图组装层 · 前端不得再有八字引擎", () => {
  it("两个分包的八字引擎都已移除，不得复活", () => {
    expect(fs.existsSync(F1)).toBe(false);
    expect(fs.existsSync(F2)).toBe(false);
  });

  it("反证：展示辅助文件在，且路径写对了（否则上一条可能是路径写错的空跑）", () => {
    expect(fs.readFileSync(DISPLAY, "utf8")).toMatch(/export function cityLongitude/);
    expect(fs.existsSync(path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/hepan-data.ts"))).toBe(true);
  });

  it("展示辅助与服务端副本的一致性已纳入 paipan-engine-copies 闸门", () => {
    const copies = fs.readFileSync(path.join(__dirname, "paipan-engine-copies.spec.ts"), "utf8");
    expect(copies).toMatch(/bazi-display\.ts/);
    expect(copies).toMatch(/每一段都原样出现在服务端 bazi-engine 里/);
  });
});
