import { calculateLiJiChi } from "./lijichi.calculator";

/**
 * 立极尺（鲁班尺/丁兰尺/压白尺）回归（2026-09-19，接续文档 §2.87）
 *
 * ══ 尺长已定案：门公尺 42.9cm、丁兰尺 38.78cm ══
 *
 * 原实现取 40.96cm（＝5.12×8）与 48.0cm（＝4.8×10），**源码无出处**，
 * 40.96 = 2¹²/100 是个拍出来的整数，且与任何在用制式都不符。
 * 定案依据见文件末尾的「吉数尺度」判别检验——不是我挑的期望值，
 * 是一张独立于本实现的外部表，42.9 命中 13/14，原实现只命中 3/14。
 *
 * ══ 另记一处命名冲突 ══
 *
 * 后端这份 `lijichi` 量的是尺寸吉凶（鲁班尺八字、丁兰尺十字、压白九星），
 * 而前端 `pkg-paipan/lijichi` 是**完全不同的工具**——「立极规」，
 * 输入二十四山向与户型图，把山盘叠在平面图上定坐向，供玄空/八宅布局用。
 * 两个毫不相干的工具共用了同一个 toolId，**故本工具没有前端基准可比**，
 * 只能靠内部一致性与典籍常识核。这个冲突本身待处理。
 *
 * ══ 已修的三处 ══
 *
 * ① **负数尺寸被判为吉**。JS 的 `%` 对负数返回负值，`Math.floor(负/5.12)` 得负下标，
 *    `LUBAN_BAZI[负]` 为 undefined，原来的 `|| "本"` 兜底把它变成了「本字·吉」。
 *    后果不止显示：`getRecommended` 扫 `[lengthCm−10, lengthCm+10]`，
 *    输入 5cm 时左端为 −5，**实测推荐列表前十条全是负数尺寸且标为吉**。
 * ② **压白「白」星三处共用一条释义**。九星里白出现三次，一白/六白/八白是
 *    三颗不同的星（贪狼水/武曲金/左辅土），原表以颜色字为键，
 *    实测第 1、6、8 寸返回的说明**一字不差**，全是「一白水星，贪狼」。
 * ③ **`chiType` 完全未生效**，主吉凶写死取鲁班尺。
 *    鲁班尺（门公尺）断阳宅门窗家具，丁兰尺断阴宅神位牌位墓碑；
 *    用户选丁兰尺量墓碑，拿回的却是阳宅那把尺的判断。
 *    两尺周期不同，同一尺寸常常一吉一凶，不能互相顶替。
 */
describe("立极尺：负数与非法尺寸", () => {
  it("非正尺寸直接拒绝，不得兜底成「本」字吉", () => {
    for (const bad of [0, -1, -42.9]) {
      expect(() => calculateLiJiChi({ chiType: "luban", lengthCm: bad })).toThrow();
    }
  });

  it("推荐尺寸不得出现 ≤0 的项（修前输入 5cm 会推出十条负数）", () => {
    for (const cm of [1, 3, 5, 9.5]) {
      const r = calculateLiJiChi({ chiType: "luban", lengthCm: cm }) as any;
      const bad = r.recommended.filter((x: any) => x.lengthCm <= 0);
      expect(`${cm}cm 推出的非正尺寸=${bad.map((x: any) => x.lengthCm).join(",")}`).toBe(`${cm}cm 推出的非正尺寸=`);
    }
  });

  it("推荐项必须确实是吉字，且能被本引擎复现", () => {
    const r = calculateLiJiChi({ chiType: "luban", lengthCm: 200 }) as any;
    for (const rec of r.recommended) {
      const check = calculateLiJiChi({ chiType: "luban", lengthCm: rec.lengthCm }) as any;
      expect(`${rec.lengthCm}→${check.measurement.luBanZi}`).toBe(`${rec.lengthCm}→${rec.luBanZi}`);
      expect(["财", "义", "官", "本"]).toContain(rec.luBanZi);
    }
  });
});

describe("立极尺：压白九星逐位取义", () => {
  const CUN = 3.03;
  /** 九星次第：一白贪狼水、二黑巨门土、三碧禄存木、四绿文曲木、五黄廉贞土、
   *  六白武曲金、七赤破军金、八白左辅土、九紫右弼火 */
  const WANT = [
    ["一白", "贪狼"], ["二黑", "巨门"], ["三碧", "禄存"], ["四绿", "文曲"], ["五黄", "廉贞"],
    ["六白", "武曲"], ["七赤", "破军"], ["八白", "左辅"], ["九紫", "右弼"],
  ];

  it.each(WANT.map((w, i) => [i + 1, w[0], w[1]] as const))(
    "第%i寸为%s（%s）",
    (cun, name, star) => {
      const r = calculateLiJiChi({ chiType: "cunbai", lengthCm: (cun - 0.5) * CUN }) as any;
      expect(`第${cun}寸=${r.measurement.cunBai}`).toContain(name);
      expect(r.measurement.cunBai).toContain(star);
    },
  );

  it("三处「白」必须给出三条不同释义（修前完全相同）", () => {
    const descs = [1, 6, 8].map(
      (cun) => (calculateLiJiChi({ chiType: "cunbai", lengthCm: (cun - 0.5) * CUN }) as any).measurement.cunBai,
    );
    expect(`不同释义数=${new Set(descs).size}`).toBe("不同释义数=3");
  });

  it("九寸一循环：第 10 寸回到一白，且如实报出「第10寸」", () => {
    const r = calculateLiJiChi({ chiType: "cunbai", lengthCm: 9.5 * CUN }) as any;
    expect(r.measurement.cunBai).toContain("一白");
    // 修前会把第 10 寸说成「第 1 寸」（报的是循环内序号）
    expect(r.measurement.cunBai).toContain("第10寸");
  });
});

describe("立极尺：chiType 决定主吉凶", () => {
  it("同一尺寸下两尺判断相反，主吉凶须随 chiType 切换", () => {
    // 82cm：鲁班尺「本」（阳宅·吉）、丁兰尺「害」（阴宅·凶）。
    // 修前一律返回鲁班尺的判断，用户量墓碑也拿到阳宅那把尺的结论。
    // 60–220cm 区间内这类分歧尺寸共 35 个，不是个别巧合。
    const luban = calculateLiJiChi({ chiType: "luban", lengthCm: 82 }) as any;
    const dinglan = calculateLiJiChi({ chiType: "dinglan", lengthCm: 82 }) as any;
    expect(`${luban.measurement.luBanZi}=${luban.measurement.jiXiong}`).toBe("本=吉");
    expect(`${dinglan.measurement.dingLanZi}=${dinglan.measurement.jiXiong}`).toBe("害=凶");
  });

  it("两尺分歧不是孤例：60–220cm 内鲁班吉·丁兰凶的整数尺寸有数十个", () => {
    let n = 0;
    for (let cm = 60; cm <= 220; cm++) {
      const a = calculateLiJiChi({ chiType: "luban", lengthCm: cm }) as any;
      const b = calculateLiJiChi({ chiType: "dinglan", lengthCm: cm }) as any;
      if (a.measurement.jiXiong === "吉" && b.measurement.jiXiong === "凶") n++;
    }
    expect(n).toBeGreaterThan(20);
  });

  it("三把尺的落字本身与 chiType 无关，永远全算全给", () => {
    const a = calculateLiJiChi({ chiType: "luban", lengthCm: 150 }) as any;
    const b = calculateLiJiChi({ chiType: "dinglan", lengthCm: 150 }) as any;
    expect(a.measurement.luBanZi).toBe(b.measurement.luBanZi);
    expect(a.measurement.dingLanZi).toBe(b.measurement.dingLanZi);
    expect(a.measurement.cunBai).toBe(b.measurement.cunBai);
  });
});

describe("立极尺：字序与循环（典籍定序）", () => {
  it("鲁班尺八字序为财病离义官劫害本，一周期内逐格命中", () => {
    const WANT = ["财", "病", "离", "义", "官", "劫", "害", "本"];
    const UNIT = 42.9 / 8;
    WANT.forEach((zi, i) => {
      const r = calculateLiJiChi({ chiType: "luban", lengthCm: (i + 0.5) * UNIT }) as any;
      expect(`第${i + 1}格=${r.measurement.luBanZi}`).toBe(`第${i + 1}格=${zi}`);
    });
  });

  it("丁兰尺十字序为丁害旺苦义官死兴失财", () => {
    const WANT = ["丁", "害", "旺", "苦", "义", "官", "死", "兴", "失", "财"];
    const UNIT = 38.78 / 10;
    WANT.forEach((zi, i) => {
      const r = calculateLiJiChi({ chiType: "dinglan", lengthCm: (i + 0.5) * UNIT }) as any;
      expect(`第${i + 1}格=${r.measurement.dingLanZi}`).toBe(`第${i + 1}格=${zi}`);
    });
  });

  it("超过一周期后循环回位（八字尺加一周期落回同字）", () => {
    for (const cm of [30, 77.3, 150]) {
      const a = calculateLiJiChi({ chiType: "luban", lengthCm: cm }) as any;
      const b = calculateLiJiChi({ chiType: "luban", lengthCm: cm + 42.9 }) as any;
      expect(`${cm}→${a.measurement.luBanZi}`).toBe(`${cm}→${b.measurement.luBanZi}`);
    }
  });
});

/**
 * ══ 尺长判别检验：通行「鲁班尺吉数尺度」表 ══
 *
 * 下面这张区间表来自坊间通行的鲁班尺吉数对照（引《鲁班经》一路），
 * **独立于本实现**——若周期取错，区间端点不可能对得上。
 * 拿它当判别式跑各制式：
 *
 * | 制式(cm) | 命中 14 个区间中的 |
 * |----------|---------------------|
 * | **42.9** | **13/14** ← 采用    |
 * | 40.96（原实现） | 3/14         |
 * | 50.4     | 4/14                |
 * | 46.08    | 4/14                |
 * | 42.0     | 5/14                |
 * | 43.2     | 2/14                |
 *
 * 唯一的「不符」在 167–177 段的端点 177cm：本实现算出的吉段止于 176.96cm，
 * 坊间表把它进位写成 177。差 0.04cm，是舍入不是分歧，故该段按 176.9 收尾断言。
 *
 * 50.4 与 46.08 两制确实在用（前者为另一流行制，后者为古籍记载值、
 * 故宫藏鲁班尺实测约 46cm），故保留为 `rulerLength` 可选项；
 * 但**不接受任意数值**——避免再出现一个没有出处的长度。
 */
describe("立极尺：尺长判别检验（外部基准，非手写期望）", () => {
  /** 通行吉数尺度（cm 区间） */
  const JI_RANGES: [number, number][] = [
    [21, 23], [38, 48], [59, 64], [81, 91], [102, 107], [124, 134], [145, 155],
    [167, 176.9], [188, 193], [210, 219], [231, 235], [253, 262], [274, 279], [295, 305],
  ];

  it.each(JI_RANGES)("%s–%s cm 全段落吉字", (lo, hi) => {
    const bad: string[] = [];
    for (let cm = lo; cm <= hi; cm = Math.round((cm + 0.2) * 10) / 10) {
      const r = calculateLiJiChi({ chiType: "luban", lengthCm: cm }) as any;
      if (r.measurement.jiXiong !== "吉") bad.push(`${cm}cm=${r.measurement.luBanZi}`);
    }
    expect(`${lo}–${hi} 非吉=${bad.slice(0, 3).join(",")}`).toBe(`${lo}–${hi} 非吉=`);
  });

  it("原实现的 40.96cm 制不可能通过本检验（反向确认判别力）", () => {
    const BAZI = ["财", "病", "离", "义", "官", "劫", "害", "本"];
    const JI = new Set(["财", "义", "官", "本"]);
    const hit = JI_RANGES.filter(([lo, hi]) => {
      for (let cm = lo; cm <= hi; cm = Math.round((cm + 0.2) * 10) / 10) {
        if (!JI.has(BAZI[Math.min(7, Math.floor((cm % 40.96) / (40.96 / 8)))])) return false;
      }
      return true;
    }).length;
    // 若这条变绿，说明这张表失去了判别力，整个检验作废
    expect(`40.96 命中=${hit}`).toBe("40.96 命中=3");
  });
});

describe("立极尺：四小字（《鲁班经》三十二字/四十字）", () => {
  it("鲁班尺每大字下四小字，逐格命中", () => {
    const XZ: Record<string, string[]> = {
      财: ["财德", "宝库", "六合", "迎福"], 病: ["退财", "公事", "牢执", "孤寡"],
      离: ["长库", "劫财", "官鬼", "失脱"], 义: ["添丁", "益利", "贵子", "大吉"],
      官: ["顺科", "横财", "进益", "富贵"], 劫: ["死别", "退口", "离乡", "财失"],
      害: ["灾至", "死绝", "病临", "口舌"], 本: ["财至", "登科", "进宝", "兴旺"],
    };
    const SUB = 42.9 / 32;
    Object.entries(XZ).forEach(([zi, subs], gi) => {
      subs.forEach((xz, si) => {
        const cm = (gi * 4 + si) * SUB + SUB / 2;
        const r = calculateLiJiChi({ chiType: "luban", lengthCm: cm }) as any;
        expect(`${cm.toFixed(2)}cm=${r.measurement.luBanZi}·${r.measurement.luBanDetail.slice(2, 7)}`)
          .toContain(`${zi}·${xz}`);
      });
    });
  });

  it("丁兰尺四十小字，逐格命中", () => {
    const XZ: Record<string, string[]> = {
      丁: ["福星", "及第", "财旺", "登科"], 害: ["口舌", "病临", "死绝", "灾至"],
      旺: ["天德", "喜事", "进宝", "纳福"], 苦: ["失脱", "官鬼", "劫财", "无嗣"],
      义: ["大吉", "财旺", "益利", "天库"], 官: ["富贵", "进宝", "横财", "顺科"],
      死: ["离乡", "死别", "退丁", "失财"], 兴: ["登科", "贵子", "添丁", "兴旺"],
      失: ["孤寡", "牢执", "公事", "退财"], 财: ["迎福", "六合", "进宝", "财德"],
    };
    const SUB = 38.78 / 40;
    Object.entries(XZ).forEach(([zi, subs], gi) => {
      subs.forEach((xz, si) => {
        const cm = (gi * 4 + si) * SUB + SUB / 2;
        const r = calculateLiJiChi({ chiType: "dinglan", lengthCm: cm }) as any;
        expect(r.measurement.dingLanDetail).toContain(`${zi}·${xz}`);
      });
    });
  });
});

describe("立极尺：制式切换", () => {
  it("三种在用制式给出不同落字，说明制式确实生效", () => {
    const got = ["42.9", "50.4", "46.08"].map(
      (k) => (calculateLiJiChi({ chiType: "luban", lengthCm: 200, rulerLength: k }) as any).measurement.luBanZi,
    );
    expect(`42.9/50.4/46.08 → ${got.join("/")}`).toBe("42.9/50.4/46.08 → 劫/本/离");
  });

  it("不接受没有出处的任意长度（含原来的 40.96）", () => {
    for (const bad of ["40.96", "44", "0"]) {
      expect(() => calculateLiJiChi({ chiType: "luban", lengthCm: 200, rulerLength: bad })).toThrow(/制式只支持/);
    }
  });

  it("缺省即 42.9 制", () => {
    const a = calculateLiJiChi({ chiType: "luban", lengthCm: 200 }) as any;
    const b = calculateLiJiChi({ chiType: "luban", lengthCm: 200, rulerLength: "42.9" }) as any;
    expect(a.measurement.luBanZi).toBe(b.measurement.luBanZi);
  });
});
