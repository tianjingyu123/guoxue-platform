import { calculateLuoPan } from "./luopan.calculator";

/**
 * 电子罗盘回归（2026-09-19，接续文档 §2.88）
 *
 * ══ 背景：这是一个**已在 VERIFIED_TOOLS 里**却整盘偏一个山的工具 ══
 *
 * `dianzi-luopan` 当初以「纯历法/查表类，无流派分歧」为由进的白名单，
 * 没有逐层核过。这次为完善罗盘功能去读它，发现地盘正针整体错位 15°。
 *
 * **判据是它自己前后矛盾**：本文件的 `SHAN_INFO` 自带每山中心度数
 * （子 0°、壬 345°……），把这些度数喂回 `degreeToShan`，理应原样返回该山，
 * 实测 **24/24 全不符，且每个都恰好偏一个山**。不需要任何外部基准。
 *
 * 成因：`SHAN_24[0]` 是壬（中心 345°），而 `Math.floor((deg + 7.5) / 15)`
 * 的下标 0 对应的是**中心 0° 的那个山**，即子。数组与公式错开一位。
 *
 * 影响不止显示：坐山错一位 → 朝向、纳甲、三合水法、三元龙、
 * 穿山/透地/分金全部连带错位。而且越靠近山界越容易被误当成兼向问题。
 *
 * ══ 一并修的四处 ══
 *
 * ② **三针用整山常数偏移**：人盘中针写成 `+1 山`（＝15°）、
 *    天盘缝针写成 `+7 山`（＝**105°**，无从解释）。
 *    三针实差 7.5°（半个山）：中针逆偏用于消砂、缝针顺偏用于纳水。
 *    半山偏移意味着读数只可能是本山或相邻山，且随朝向落在山的前半后半而变，
 *    **不是常数**。写成常数等于宣称「不论朝向在山中何处中针恒进一位」，山的前半段就错。
 * ③ **穿山七十二龙恒取本山中间那条**（`shanIdx * 3 + 1`），与度数无关——
 *    山内三条龙各 5°，被压成一条，穿山定穴最要紧的分辨率没了。
 *    并补上**珠宝/火坑**判定（七十二龙的主要用途，原实现完全没给）。
 * ④ **透地六十龙、百二十分金以 0° 起算**。两层同挂地盘，起于**壬山初 337.5°**，
 *    从子山中心起算等于整层偏 22.5°（近四条龙）。
 * ⑤ **六十四卦、二十八宿只铺清单、无读数**（没有 `currentValue`，等于没读）。
 *    二十八宿另按**真实宿度**分布——宿度本就不等（井 33 度、觜 2 度），
 *    等分是错的。
 */

const SHAN_CENTER: Record<string, number> = {
  壬: 345, 子: 0, 癸: 15, 丑: 30, 艮: 45, 寅: 60, 甲: 75, 卯: 90,
  乙: 105, 辰: 120, 巽: 135, 巳: 150, 丙: 165, 午: 180, 丁: 195, 未: 210,
  坤: 225, 申: 240, 庚: 255, 酉: 270, 辛: 285, 戌: 300, 乾: 315, 亥: 330,
};

/** 关掉磁偏角校正，隔离圈层逻辑（校正另有专项用例） */
const read = (degree: number) =>
  calculateLuoPan({ degree, type: "zonghe", magneticCorrection: false }) as any;
const layer = (r: any, kw: string) =>
  (r.layers ?? []).find((l: any) => l.name.includes(kw))?.currentValue ?? "—";

describe("罗盘：地盘正针（自相矛盾判据）", () => {
  it("把 SHAN_INFO 自带的山中心度数喂回去，须原样返回该山（修前 24/24 全不符）", () => {
    const bad: string[] = [];
    for (const [shan, deg] of Object.entries(SHAN_CENTER)) {
      const got = layer(read(deg), "地盘正针");
      if (got !== shan) bad.push(`${shan}(${deg}°)→${got}`);
    }
    expect(`不符=${bad.join(" ")}`).toBe("不符=");
  });

  it("山界在 7.5 + 15k：界前后各归其山", () => {
    // 子山 352.5–7.5；7.4° 仍属子，7.6° 已入癸
    expect(layer(read(7.4), "地盘正针")).toBe("子");
    expect(layer(read(7.6), "地盘正针")).toBe("癸");
    expect(layer(read(352.6), "地盘正针")).toBe("子");
    expect(layer(read(352.4), "地盘正针")).toBe("壬");
  });

  it("正北为子、正南为午、正东为卯、正西为酉", () => {
    expect(layer(read(0), "地盘正针")).toBe("子");
    expect(layer(read(180), "地盘正针")).toBe("午");
    expect(layer(read(90), "地盘正针")).toBe("卯");
    expect(layer(read(270), "地盘正针")).toBe("酉");
  });

  it("二十四山在周天上各占 15°，无重无漏", () => {
    const span: Record<string, number> = {};
    for (let d = 0; d < 360; d += 0.5) {
      const s = layer(read(d), "地盘正针");
      span[s] = (span[s] ?? 0) + 0.5;
    }
    expect(`山数=${Object.keys(span).length}`).toBe("山数=24");
    for (const [s, deg] of Object.entries(span)) expect(`${s}=${deg}`).toBe(`${s}=15`);
  });
});

describe("罗盘：三针相差 7.5°（非整山常数）", () => {
  it("中针逆偏、缝针顺偏，读数随朝向落在山的前半后半而变", () => {
    // 子山中心 0°：偏北一侧（355°）与偏南一侧（5°）中针/缝针读数不同
    expect(`355° 中针=${layer(read(355), "人盘中针")}`).toBe("355° 中针=子");
    expect(`5° 中针=${layer(read(5), "人盘中针")}`).toBe("5° 中针=癸");
    expect(`355° 缝针=${layer(read(355), "天盘缝针")}`).toBe("355° 缝针=壬");
    expect(`5° 缝针=${layer(read(5), "天盘缝针")}`).toBe("5° 缝针=子");
  });

  it("任一朝向下，中针/缝针只能是本山或其相邻山（修前缝针差 7 个山）", () => {
    const order = Object.keys(SHAN_CENTER); // 与 SHAN_24 同序
    const idx = (s: string) => order.indexOf(s);
    const dist = (a: string, b: string) => Math.min((idx(a) - idx(b) + 24) % 24, (idx(b) - idx(a) + 24) % 24);
    const bad: string[] = [];
    for (let d = 0; d < 360; d += 2.5) {
      const z = layer(read(d), "地盘正针");
      for (const k of ["人盘中针", "天盘缝针"]) {
        const n = layer(read(d), k);
        if (dist(z, n) > 1) bad.push(`${d}°${k}:${z}→${n}`);
      }
    }
    expect(`越界=${bad.slice(0, 3).join(" ")}`).toBe("越界=");
  });

  it("中针与缝针在同一朝向下恒相差一个山（合计 15°）", () => {
    const order = Object.keys(SHAN_CENTER);
    for (const d of [3, 47, 128, 201, 299, 350]) {
      const m = order.indexOf(layer(read(d), "人盘中针"));
      const f = order.indexOf(layer(read(d), "天盘缝针"));
      expect(`${d}° 中缝差=${(m - f + 24) % 24}`).toBe(`${d}° 中缝差=1`);
    }
  });
});

/**
 * 圈层**内容**的正确性（格数、起算点、珠宝火坑分布、错卦对称等）
 * 已由 `test/luopan-rings.spec.ts` 的 86 个用例承担，此处不重复。
 * 本文件余下部分只验**适配层**：计算器是否把数据层的读数如实、完整地转出来。
 */
describe("罗盘：盘制组成与适配", () => {
  it("四种盘制层数递增，且综合盘含三针、三元盘含易卦层", () => {
    const names = (t: string) =>
      ((calculateLuoPan({ degree: 173.4, type: t, magneticCorrection: false }) as any).layers ?? [])
        .map((l: any) => l.name);

    const jianyi = names("jianyi"), sanyuan = names("sanyuan"), sanhe = names("sanhe"), zonghe = names("zonghe");
    expect(jianyi.length).toBeLessThan(sanyuan.length);
    expect(sanyuan.length).toBeLessThan(sanhe.length);
    expect(sanhe.length).toBeLessThan(zonghe.length);

    // 三合盘三针俱全、无易卦；三元盘有易卦、只一层二十四山
    expect(sanhe.filter((n: string) => n.includes("二十四山")).length).toBe(4); // 三针 + 净阴净阳
    expect(sanhe.some((n: string) => n.includes("六十四卦"))).toBe(false);
    expect(sanyuan.some((n: string) => n.includes("六十四卦"))).toBe(true);
    expect(sanyuan.some((n: string) => n.includes("中针") || n.includes("缝针"))).toBe(false);
  });

  it("每层都带读数、层序连续、用途注明所挂之针", () => {
    const layers = (calculateLuoPan({ degree: 173.4, type: "zonghe", magneticCorrection: false }) as any).layers;
    layers.forEach((l: any, i: number) => {
      expect(`第${i + 1}层 index=${l.index}`).toBe(`第${i + 1}层 index=${i + 1}`);
      expect(String(l.currentValue ?? "").length).toBeGreaterThan(0);
      expect(l.data.length).toBeGreaterThan(0);
      if (l.name !== "周天360°") expect(l.usage).toContain("挂");
    });
  });

  it("有吉凶体系的层，读数须带出吉凶与附注（修前只给一个裸字面）", () => {
    const layers = (calculateLuoPan({ degree: 173.4, type: "zonghe", magneticCorrection: false }) as any).layers;
    const find = (kw: string) => layers.find((l: any) => l.name.includes(kw))?.currentValue ?? "";
    expect(find("穿山七十二龙")).toMatch(/珠宝|火坑|空亡/);
    expect(find("一百二十分金")).toMatch(/可用|孤虚/);
    expect(find("三元龙")).toMatch(/天元|地元|人元/);
    expect(find("双山三合五行")).toMatch(/水局|木局|火局|金局/);
  });

  it("抽样实盘：173.4° 坐午向子，各层读数自洽", () => {
    const r = calculateLuoPan({ degree: 173.4, type: "zonghe", magneticCorrection: false }) as any;
    expect(`${r.shanAnalysis.zuoShan}→${r.shanAnalysis.chaoXiang}`).toBe("午→子");
    const find = (kw: string) => r.layers.find((l: any) => l.name.includes(kw))?.currentValue ?? "";
    expect(find("地盘正针")).toBe("午");
    expect(find("先天八卦")).toContain("乾");      // 先天乾居南
    expect(find("后天八卦")).toContain("离");      // 后天离居南
    expect(find("二十四节气")).toContain("夏至");  // 午＝夏至
    expect(find("三元龙")).toContain("天元");      // 午为天元龙
  });
});

describe("罗盘：坐向与磁偏角", () => {
  it("朝向恒为坐山之对宫（相差 180°）", () => {
    for (const [shan, deg] of Object.entries(SHAN_CENTER)) {
      const r = read(deg);
      const opp = SHAN_CENTER[r.shanAnalysis.chaoXiang as string];
      // 模 360 的夹角应恰为 180°（此前这里我自己把算式写错，对 180 的情形恒得 180）
      expect(`${shan} 对宫差=${((opp - deg) % 360 + 360) % 360}`).toBe(`${shan} 对宫差=180`);
    }
  });

  it("开启磁偏角校正会改变真方位（说明校正确实生效）", () => {
    const off = calculateLuoPan({ degree: 0, type: "zonghe", magneticCorrection: false }) as any;
    const on = calculateLuoPan({ degree: 0, type: "zonghe", magneticCorrection: true, longitude: 116.4, latitude: 39.9 }) as any;
    expect(off.degreeInfo.magneticDeclination).toBe(0);
    expect(on.degreeInfo.magneticDeclination).not.toBe(0);
    expect(on.degreeInfo.trueDegree).not.toBe(off.degreeInfo.trueDegree);
  });
});
