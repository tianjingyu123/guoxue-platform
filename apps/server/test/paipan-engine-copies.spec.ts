import * as fs from "fs";
import * as path from "path";

/**
 * 排盘引擎迁后端 · 前后端副本一致（第 4 步）
 *
 * 有些模块前端自己还在用（节气页要节气引擎、多处要 lunar），又是已迁引擎的依赖，
 * 只能两边各放一份。**谁只改一边，同一天的节气/干支两边就会算得不一样**，这里立刻红。
 * 前端那份不再被需要时（相关页面也迁走），从这张表删掉并删前端文件即可。
 *
 * 比对口径：去掉 CR、把服务端的 import 路径还原成前端写法、去掉服务端副本自带的说明头。
 */
const ROOT = path.resolve(__dirname, "../../..");
const FRONT = "apps/mobile/src/pkg-paipan/lib";
const SERVER = "apps/server/src/modules/paipan/engine";

const norm = (s: string) =>
  s
    .replace(/\r/g, "")
    .replace(/from "\.\/vendor\/lunar"/g, 'from "./lunar/index.js"')
    .replace(/from "@guoxue\/shared\/paipan"/g, 'from "@/lib/paipan/ganzhi"');

const PAIRS: [string, string, (s: string) => string][] = [
  [`${FRONT}/jieqi-engine.ts`, `${SERVER}/jieqi-engine.ts`, norm],
  [`${FRONT}/jieqi-data.ts`, `${SERVER}/jieqi-data.ts`, norm],
  // 八字：2026-09-21 前端 bazi-engine.ts 已删（computeBazi 全迁服务端），只剩展示辅助 bazi-display.ts，见下方「逐段包含」用例
  // 合盘数据：前端要场景表（HEPAN_SCENES）与类型，服务端引擎也要
  [`${FRONT}/hepan-data.ts`, `${SERVER}/hepan-data.ts`, norm],
  // 起名数据：前端要风格/定字位置选项与类型，服务端起名引擎也要
  ["apps/mobile/src/pkg-paipan2/lib/qiming-data.ts", `${SERVER}/qiming-data.ts`, norm],
  // 康熙笔画表：服务端引擎目录一份、shared 一份（诸葛用 shared 的 strokeOfOrNull）——两份必须逐字节相同
  ["packages/shared/src/paipan/data/kangxi-strokes.json", `${SERVER}/data/kangxi-strokes.json`, (s) => s.replace(/\r/g, "")],
  // lunar：服务端副本多一段说明头（@ts-nocheck、eslint-disable、文档块，到文档块结尾的「 */」行为止）
  [`${FRONT}/lunar/index.js`, `${SERVER}/vendor/lunar.ts`, (s) => s.replace(/\r/g, "").replace(/^[\s\S]*?\n \*\/\n/, "")],
];

describe("排盘引擎 · 前后端副本逐字一致", () => {
  it.each(PAIRS.map(([a, b, f]) => [path.basename(a), a, b, f] as const))("%s", (_n, a, b, f) => {
    const front = fs.readFileSync(path.join(ROOT, a), "utf8").replace(/\r/g, "");
    const server = f(fs.readFileSync(path.join(ROOT, b), "utf8"));
    expect(server.length).toBeGreaterThan(1000);
    expect(server === front).toBe(true);
  });

  /**
   * 前端为避免把 shared 引擎模块整个打进包，复制了几张展示用常量表。逐值与 shared 原件比对。
   * 做法：剥掉前端文件里的 import/export type 行与类型注解，求值后与 shared 导出比较。
   */
  it.each([
    ["apps/mobile/src/pkg-paipan/lib/qimen-consts.ts", ["RING_PALACES", "GRID_PALACES", "PALACE_NAMES", "PALACE_DIZHI"]],
    ["apps/mobile/src/pkg-paipan/lib/daliuren-types.ts", ["SHENJIANG_NAME"]],
  ] as const)("前端复制的常量与 shared 一致：%s", (file, names) => {
    const shared = require("@guoxue/shared/paipan");
    const src = fs.readFileSync(path.join(ROOT, file), "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter((l) => !/^\s*(import|export type)\b/.test(l))
      .join("\n")
      .replace(/export const (\w+)(: [^=]+)? =/g, "exports.$1 =");
    const exportsObj: Record<string, unknown> = {};
    new Function("exports", src)(exportsObj);
    for (const n of names) {
      expect(`${n}:${JSON.stringify(exportsObj[n])}`).toBe(`${n}:${JSON.stringify(shared[n])}`);
    }
  });

  /**
   * 前端 bazi-display.ts 是服务端 bazi-engine.ts 的**子集摘录**（结果类型、城市经纬度表、农历文本），
   * 不能整文件比，改为：去掉文件头注释后按空行切段，每一段都必须原样出现在服务端副本里。
   * 城市经度决定真太阳时修正，前端输入页取的经度与服务端算盘用的若不一致，同一城市两边时辰会差。
   */
  const BAZI_DISPLAY = "apps/mobile/src/pkg-paipan/lib/bazi-display.ts";
  const displayChunks = () =>
    fs.readFileSync(path.join(ROOT, BAZI_DISPLAY), "utf8")
      .replace(/\r/g, "")
      .replace(/^(\/\/.*\n)+/, "")
      .split(/\n\s*\n/)
      .map((c) => c.trim())
      .filter(Boolean);

  it("前端 bazi-display 每一段都原样出现在服务端 bazi-engine 里", () => {
    const server = fs.readFileSync(path.join(ROOT, `${SERVER}/bazi-engine.ts`), "utf8").replace(/\r/g, "");
    const chunks = displayChunks();
    // 反证用：确认真切到了该切的几段（否则「全部包含」可能是空跑）
    expect(chunks.join("\n")).toMatch(/const CITY_LNG[\s\S]*const CITY_LAT[\s\S]*export function lunarText/);
    expect(chunks.length).toBeGreaterThanOrEqual(6);
    for (const c of chunks) expect(server.includes(c) ? "ok" : c.slice(0, 80)).toBe("ok");
  });

  it("反证：bazi-display 改一个经度必须被抓到", () => {
    const server = fs.readFileSync(path.join(ROOT, `${SERVER}/bazi-engine.ts`), "utf8").replace(/\r/g, "");
    const lng = displayChunks().find((c) => c.includes("const CITY_LNG"))!;
    expect(server.includes(lng)).toBe(true);
    expect(server.includes(lng.replace("北京: 116.4", "北京: 116.5"))).toBe(false);
  });

  it("前端不得再出现八字排盘引擎（computeBazi 只在服务端）", () => {
    expect(fs.existsSync(path.join(ROOT, `${FRONT}/bazi-engine.ts`))).toBe(false);
    expect(fs.readFileSync(path.join(ROOT, BAZI_DISPLAY), "utf8")).not.toMatch(/computeBazi|fourPillars/);
  });

  it("反证：改动一个字符必须被抓到", () => {
    const front = fs.readFileSync(path.join(ROOT, `${FRONT}/jieqi-data.ts`), "utf8").replace(/\r/g, "");
    const tampered = front.replace("立春", "立舂");
    expect(tampered === front).toBe(false);
  });
});
