import { ALL_TOOLS } from "@guoxue/shared";
import * as calcs from "../src/modules/tool-registry/calculators";

/**
 * 计算器体检：不懂那门术也能查出来的硬伤（2026-09-19）
 *
 * ══ 为什么要有这道扫描 ══
 *
 * 本仓库已经查出五种编造实现，而**最好用的识别特征不是理论推敲，是输出里
 * 出现了结构上不可能的值**——这类问题一眼即证，不需要任何流派知识：
 *
 *   · 太乙：十六神落在 **4.5 宫**（`i * 1.5` 的步长），宫位怎么可能是小数
 *   · 奇门山宫：52 条"二十四山"，而且**盘不随时间变**（奇门是时家之学）
 *   · 穿壬：七十二局表与它自己依赖的引擎说法打架
 *
 * 所以把这套检查固化下来，新加的计算器会自动过一遍。
 *
 * ══ 这道扫描的边界，必须说清楚 ══
 *
 * 它**只能证伪、不能证明**。跑过不代表算法对（太乙当年也"跑得过"，
 * 它的 spec 还有两条全绿的结构断言）；跑不过则几乎一定有问题。
 *
 * 另外输入是按 `inputSchema` 自动合成的，**不满足工具真实的输入要求**——
 * 合成输入跑出 NaN 多半是喂错了参数而非算法有错（首轮扫描 27 处告警里，
 * 梅花、小成图等经真实输入复验都是假阳性）。所以这里**只断言那些与输入无关的
 * 结构性不变量**，不断言数值。
 */
describe("计算器体检：结构上不可能的输出", () => {
  const GAN = "甲乙丙丁戊己庚辛壬癸";
  const ZHI = "子丑寅卯辰巳午未申酉戌亥";
  const fnMap = calcs as unknown as Record<string, (i: any) => unknown>;

  /** 按 inputSchema 合成一组形式上合法的输入 */
  const synth = (schema: any): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, spec] of Object.entries<any>(schema?.properties ?? {})) {
      if (spec.default !== undefined) { out[key] = spec.default; continue; }
      switch (spec.type) {
        case "number":
          if (/year/i.test(key)) out[key] = 1990;
          else if (/month/i.test(key)) out[key] = 6;
          else if (/day/i.test(key)) out[key] = 15;
          else if (/hour/i.test(key)) out[key] = 10;
          else if (/minute/i.test(key)) out[key] = 0;
          else out[key] = Math.min(Math.max(1, spec.min ?? 1), spec.max ?? 9);
          break;
        case "enum": out[key] = spec.values?.[0] ?? ""; break;
        case "boolean": out[key] = false; break;
        case "array": out[key] = []; break;
        default:
          // 干支类入参要喂真干支，否则工具原样回显，扫描会把自己喂的脏值当成 bug
          if (/ganZhi|ganzhi/i.test(key)) out[key] = "甲子";
          else if (/^(gan|riGan|dayGan)$/i.test(key)) out[key] = "甲";
          else if (/^(zhi|riZhi|dayZhi)$/i.test(key)) out[key] = "子";
          else if (/datetime|time/i.test(key)) out[key] = "2026-09-19T14:00:00";
          else if (/date/i.test(key)) out[key] = "2026-09-19";
          else if (/name/i.test(key)) out[key] = "测试";
          else if (/city|place|address/i.test(key)) out[key] = "北京";
          else out[key] = "测试";
      }
    }
    if (!out.datetime && !out.birthTime && !out.date) out.datetime = "2026-09-19T14:00:00";
    return out;
  };

  const fnFor = (id: string) => {
    const want = id.replace(/-/g, "").toLowerCase();
    const name = Object.keys(fnMap).find((n) => n.replace(/^calculate/, "").toLowerCase() === want);
    return name ? fnMap[name] : undefined;
  };

  const runnable = (ALL_TOOLS as any[])
    .map((t) => ({ id: t.id, schema: t.inputSchema, fn: fnFor(t.id) }))
    .filter((x) => typeof x.fn === "function");

  it("扫描面覆盖到足够多的计算器（少了说明命名对不上，扫描形同虚设）", () => {
    expect(runnable.length).toBeGreaterThan(90);
  });

  /**
   * 宫位必是整数。
   * 太乙正是栽在这里——文昌 4.5 宫、地主 7.5 宫，源头是 `i * 1.5` 的步长。
   */
  it("任何名为「宫」的数值都必须是整数", () => {
    const bad: string[] = [];
    const walk = (tool: string, node: any, path: string, d = 0) => {
      if (d > 6 || node == null) return;
      if (typeof node === "number") {
        if (/gong|palace/i.test(path) && Number.isFinite(node) && !Number.isInteger(node)) {
          bad.push(`${tool} ${path}=${node}`);
        }
        return;
      }
      if (Array.isArray(node)) return node.forEach((v, i) => walk(tool, v, `${path}[${i}]`, d + 1));
      if (typeof node === "object") {
        for (const [k, v] of Object.entries(node)) walk(tool, v, path ? `${path}.${k}` : k, d + 1);
      }
    };
    for (const { id, schema, fn } of runnable) {
      try { walk(id, fn!(synth(schema)), ""); } catch { /* 合成输入不合用，跳过 */ }
    }
    expect(`非整数宫位: ${bad.join("｜") || "无"}`).toBe("非整数宫位: 无");
  });

  /**
   * 干支字段必须装干支。
   * 称骨的 `ganZhi` 曾装着「5月」「巳时」，山宫的 `tianPanGan` 装的是九星名。
   * 字段名与内容对不上，下游只要当真就会出错。
   */
  it("名为 ganZhi 的两字字段必须是合法干支", () => {
    const bad: string[] = [];
    const walk = (tool: string, node: any, path: string, d = 0) => {
      if (d > 6 || node == null) return;
      if (typeof node === "string") {
        if (/ganZhi$/i.test(path) && node.length === 2 && (!GAN.includes(node[0]) || !ZHI.includes(node[1]))) {
          bad.push(`${tool} ${path}="${node}"`);
        }
        return;
      }
      if (Array.isArray(node)) return node.forEach((v, i) => walk(tool, v, `${path}[${i}]`, d + 1));
      if (typeof node === "object") {
        for (const [k, v] of Object.entries(node)) walk(tool, v, path ? `${path}.${k}` : k, d + 1);
      }
    };
    for (const { id, schema, fn } of runnable) {
      const inp = synth(schema);
      // 合成输入里出现过的字面量，若原样出现在输出里，那是**回显**而非计算结果，
      // 不该算作算法问题（多个工具把干支当入参收，会把我喂的值原样带出来）
      const echoed = new Set(Object.values(inp).filter((v) => typeof v === "string") as string[]);
      const before = bad.length;
      try { walk(id, fn!(inp), ""); } catch { /* 同上 */ }
      for (let i = bad.length - 1; i >= before; i--) {
        const m = bad[i].match(/="(.+)"$/);
        if (m && echoed.has(m[1])) bad.splice(i, 1);
      }
    }
    // 称骨的月/日/时骨按农历月日时辰计，字段名用了 ganZhi 但装的不是干支——已知，待改名
    const KNOWN = ["chenggu"];
    const real = bad.filter((b) => !KNOWN.some((k) => b.startsWith(k)));
    expect(`非法干支: ${real.join("｜") || "无"}`).toBe("非法干支: 无");
  });

  /** 输出里不该出现把 undefined/NaN 拼进字符串的痕迹 */
  it("输出中不得出现 \"undefined\" / \"NaN\" / \"[object Object]\" 字面量", () => {
    const bad: string[] = [];
    const walk = (tool: string, node: any, path: string, d = 0) => {
      if (d > 6 || node == null) return;
      if (typeof node === "string") {
        if (/^(undefined|NaN|\[object Object\])$/.test(node)) bad.push(`${tool} ${path}="${node}"`);
        return;
      }
      if (Array.isArray(node)) return node.forEach((v, i) => walk(tool, v, `${path}[${i}]`, d + 1));
      if (typeof node === "object") {
        for (const [k, v] of Object.entries(node)) walk(tool, v, path ? `${path}.${k}` : k, d + 1);
      }
    };
    for (const { id, schema, fn } of runnable) {
      try { walk(id, fn!(synth(schema)), ""); } catch { /* 同上 */ }
    }
    // 这两个工具需要八字上下文，合成输入喂不出来——属于输入不合用，非算法问题
    const KNOWN = ["shishen-xiangjie", "yongshen-fenxi"];
    const real = bad.filter((b) => !KNOWN.some((k) => b.startsWith(k)));
    expect(`脏值: ${real.join("｜") || "无"}`).toBe("脏值: 无");
  });

  /**
   * 时家之学的盘必须随时间变化。
   * 奇门山宫正是栽在这里：2020 年与 2026 年给出一模一样的盘，
   * 那不叫排盘，叫查表。
   */
  it("奇门类工具的盘必须随时间变化（时家之学，不变即等于没排）", () => {
    const TIME_BASED = ["qimen", "qimen-yang", "qimen-yin", "feigong-qimen", "daliuren", "xiaoliuren"];
    const bad: string[] = [];
    for (const id of TIME_BASED) {
      const fn = fnFor(id);
      if (!fn) continue;
      const sigs = new Set<string>();
      for (const dt of ["2020-01-01T00:00:00", "2023-06-15T08:00:00", "2026-09-19T14:00:00"]) {
        try { sigs.add(JSON.stringify(fn({ datetime: dt })).slice(0, 2000)); } catch { /* 跳过 */ }
      }
      if (sigs.size === 1) bad.push(id);
    }
    expect(`不随时间变化的时家工具: ${bad.join("、") || "无"}`).toBe("不随时间变化的时家工具: 无");
  });
});
