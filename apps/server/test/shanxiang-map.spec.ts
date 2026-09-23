import {
  bearingTo, distanceTo, shanOfBearing, oppositeShan,
  magneticToTrue, trueToMagnetic, readShanxiangMap,
  BA_YAO_SHA, HUANG_QUAN, SHAN_GUA,
  type GeoPoint, type MapFeature,
} from "@guoxue/shared/paipan";

/**
 * 山向地图回归（2026-09-19，接续文档 §2.91）
 *
 * ══ 为什么坚持球面公式 ══
 *
 * 一个山只有 15°。太极点到目标点若有一两公里，**平面直角近似的误差足以跨山**：
 * 经度一度的东西向距离随纬度收缩（cos φ），北纬 40° 已缩到赤道的 0.77 倍。
 * 直接拿经纬度差当直角边算 `atan2(Δlng, Δlat)`，在中高纬度会偏出好几度。
 * 本文件专有一组用例把这个误差量出来——不是理论担心，是实测。
 */

const 北京: GeoPoint = { lat: 39.9042, lng: 116.4074 };
const 赤道: GeoPoint = { lat: 0, lng: 0 };

/** 自某点按真北方位角与距离推出目标点（球面直接解，用于构造基准） */
function destination(from: GeoPoint, bearingDeg: number, meters: number): GeoPoint {
  const R = 6371008.8, d = meters / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (from.lat * Math.PI) / 180, λ1 = (from.lng * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

describe("方位角：球面大圆", () => {
  it("正北/正东/正南/正西四向精确", () => {
    for (const [deg, name] of [[0, "北"], [90, "东"], [180, "南"], [270, "西"]] as const) {
      const p = destination(北京, deg, 1000);
      expect(`${name} 方位=${bearingTo(北京, p).toFixed(2)}`).toBe(`${name} 方位=${deg.toFixed(2)}`);
    }
  });

  it("往返一致：按 θ 推出的点，回算方位仍为 θ（逐 5° 扫一圈）", () => {
    const bad: string[] = [];
    for (let θ = 0; θ < 360; θ += 5) {
      const got = bearingTo(北京, destination(北京, θ, 2000));
      if (Math.abs(((got - θ + 540) % 360) - 180) > 0.01) bad.push(`${θ}→${got.toFixed(3)}`);
    }
    expect(`偏差超限=${bad.join(" ")}`).toBe("偏差超限=");
  });

  it("平面近似在中纬度会跨山——这正是不用它的理由", () => {
    /**
     * 拿「东北 45°、两公里」这个点做对照：
     * 球面公式给出真值，平面近似 `atan2(Δlng, Δlat)` 忽略了 cos φ 收缩。
     */
    const target = destination(北京, 45, 2000);
    const sphere = bearingTo(北京, target);
    const planar = ((Math.atan2(target.lng - 北京.lng, target.lat - 北京.lat) * 180) / Math.PI + 360) % 360;
    const err = Math.abs(sphere - planar);
    expect(`球面=${sphere.toFixed(2)}`).toBe("球面=45.00");
    // 北纬 39.9°，cos φ ≈ 0.767，平面近似偏差约 8–9°，已超过半个山（7.5°）
    expect(`平面近似偏差=${err > 7.5}`).toBe("平面近似偏差=true");
    expect(`两者落在不同山=${shanOfBearing(sphere) !== shanOfBearing(planar)}`).toBe("两者落在不同山=true");
  });

  it("赤道上平面近似误差才可忽略（反证误差源确实是 cos φ）", () => {
    const target = destination(赤道, 45, 2000);
    const sphere = bearingTo(赤道, target);
    const planar = ((Math.atan2(target.lng - 赤道.lng, target.lat - 赤道.lat) * 180) / Math.PI + 360) % 360;
    expect(`赤道偏差<0.1=${Math.abs(sphere - planar) < 0.1}`).toBe("赤道偏差<0.1=true");
  });
});

describe("距离：haversine", () => {
  it("按距离推点再回算，误差在毫米级", () => {
    for (const m of [10, 500, 2000, 50000]) {
      const got = distanceTo(北京, destination(北京, 123, m));
      expect(`${m}m 误差<0.01=${Math.abs(got - m) < 0.01}`).toBe(`${m}m 误差<0.01=true`);
    }
  });

  it("同一点距离为零，且距离对称", () => {
    expect(distanceTo(北京, 北京)).toBeCloseTo(0, 6);
    const p = destination(北京, 37, 1234);
    expect(distanceTo(北京, p)).toBeCloseTo(distanceTo(p, 北京), 6);
  });
});

describe("真北与磁北换算", () => {
  it("往返可逆", () => {
    for (const decl of [-10, -6.5, 0, 3.2, 6]) {
      for (const d of [0, 7.4, 173.4, 359.9]) {
        expect(trueToMagnetic(magneticToTrue(d, decl), decl)).toBeCloseTo(d, 9);
      }
    }
  });

  it("磁偏角足以跨山——故不做隐式换算", () => {
    // 磁北读 0°（子山），西偏 8° 时真北方位为 352°，已退回壬山
    expect(shanOfBearing(0)).toBe("子");
    expect(shanOfBearing(magneticToTrue(0, -8))).toBe("壬");
  });
});

describe("八曜煞与黄泉：口诀不变量", () => {
  it("八曜煞八卦各忌一支，八支互不相同", () => {
    const vals = Object.values(BA_YAO_SHA);
    expect(`卦数=${Object.keys(BA_YAO_SHA).length}`).toBe("卦数=8");
    expect(`忌支去重=${new Set(vals).size}`).toBe("忌支去重=8");
  });

  it("八曜煞逐条对口诀：坎龙坤兔震山猴，巽鸡乾马兑蛇头，艮虎离猪", () => {
    const 口诀: Record<string, string> = {
      坎: "辰", 坤: "卯", 震: "申", 巽: "酉", 乾: "午", 兑: "巳", 艮: "寅", 离: "亥",
    };
    for (const [gua, zhi] of Object.entries(口诀)) {
      expect(`${gua}忌${BA_YAO_SHA[gua]}`).toBe(`${gua}忌${zhi}`);
    }
  });

  it("黄泉八向各配一忌方，且忌方只落四维", () => {
    expect(`向数=${Object.keys(HUANG_QUAN).length}`).toBe("向数=8");
    for (const [xiang, fang] of Object.entries(HUANG_QUAN)) {
      expect(`${xiang}→${["坤", "巽", "艮", "乾"].includes(fang)}`).toBe(`${xiang}→true`);
    }
    // 口诀：庚丁坤上是黄泉，乙丙须防巽水先，甲癸向中忧见艮，辛壬水路怕当乾
    expect(`${HUANG_QUAN["庚"]}${HUANG_QUAN["丁"]}`).toBe("坤坤");
    expect(`${HUANG_QUAN["乙"]}${HUANG_QUAN["丙"]}`).toBe("巽巽");
    expect(`${HUANG_QUAN["甲"]}${HUANG_QUAN["癸"]}`).toBe("艮艮");
    expect(`${HUANG_QUAN["辛"]}${HUANG_QUAN["壬"]}`).toBe("乾乾");
  });

  it("二十四山三山一宫，八宫各三山", () => {
    const cnt: Record<string, number> = {};
    for (const g of Object.values(SHAN_GUA)) cnt[g] = (cnt[g] ?? 0) + 1;
    expect(Object.keys(cnt).length).toBe(8);
    for (const [g, n] of Object.entries(cnt)) expect(`${g}=${n}`).toBe(`${g}=3`);
  });
});

describe("对宫山", () => {
  it("任一山的对宫相差 180°，且对宫之对宫为本山", () => {
    const SHAN = "壬子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥".split("");
    for (const s of SHAN) {
      const o = oppositeShan(s as never);
      expect(`${s} 对宫之对宫=${oppositeShan(o)}`).toBe(`${s} 对宫之对宫=${s}`);
      expect(`${s}≠${o}`).toBe(`${s}≠${o}`);
    }
    expect(oppositeShan("子" as never)).toBe("午");
    expect(oppositeShan("艮" as never)).toBe("坤");
  });
});

describe("整盘判读", () => {
  /** 以北京为太极点，在指定真北方位 1 公里处放一个标注 */
  const featAt = (label: string, deg: number, kind: MapFeature["kind"] = "水"): MapFeature => ({
    label, kind, point: destination(北京, deg, 1000),
  });

  it("各标注的山位由真北方位决定，且距离如实报出", () => {
    const r = readShanxiangMap({
      center: 北京,
      features: [featAt("正北物", 0), featAt("正东物", 90), featAt("正南物", 180)],
    });
    expect(r.readings.map((x) => x.shan).join("")).toBe("子卯午");
    for (const x of r.readings) expect(Math.abs(x.distance - 1000)).toBeLessThan(0.01);
  });

  it("八曜煞：坐子（坎卦）逢辰方，命中；逢他方，不命中", () => {
    const 辰方 = 120; // 辰山中心
    const hit = readShanxiangMap({ center: 北京, zuoShan: "子", features: [featAt("池塘", 辰方, "水")] });
    expect(hit.readings[0].warnings.join()).toContain("八曜煞");
    expect(hit.readings[0].shan).toBe("辰");

    const miss = readShanxiangMap({ center: 北京, zuoShan: "子", features: [featAt("池塘", 90, "水")] });
    expect(miss.readings[0].warnings).toEqual([]);
  });

  it("黄泉只对水路生效：庚向逢坤方水命中，逢坤方建筑不命中", () => {
    const 坤方 = 225;
    const water = readShanxiangMap({ center: 北京, xiangShan: "庚", features: [featAt("来水", 坤方, "水")] });
    expect(water.readings[0].warnings.join()).toContain("黄泉");

    const bldg = readShanxiangMap({ center: 北京, xiangShan: "庚", features: [featAt("楼宇", 坤方, "建筑")] });
    expect(bldg.readings[0].warnings).toEqual([]);
  });

  it("坐向非对宫时给出提示（输入校验）", () => {
    const r = readShanxiangMap({ center: 北京, zuoShan: "子", xiangShan: "酉", features: [] });
    expect(r.notes.join()).toContain("并非对宫");

    const ok = readShanxiangMap({ center: 北京, zuoShan: "子", xiangShan: "午", features: [] });
    expect(ok.notes.join()).not.toContain("并非对宫");
  });

  it("恒提示真北/磁北之别（这是实地比对最容易栽的地方）", () => {
    const r = readShanxiangMap({ center: 北京, features: [] });
    expect(r.notes.join()).toContain("磁偏角");
  });

  it("不产出综合吉凶评分——只陈述命中了哪些成规", () => {
    const r = readShanxiangMap({
      center: 北京, zuoShan: "子", xiangShan: "午",
      features: [featAt("水口", 120, "水"), featAt("高塔", 45, "建筑")],
    });
    // 结果里不得出现「大吉/大凶/评分/总分」这类无从核验的合成结论
    expect(JSON.stringify(r)).not.toMatch(/评分|总分|大吉|大凶/);
  });
});

// ═══════════════════════════════════════════════════════════
// 截图路径（无经纬度时的兜底）
// ═══════════════════════════════════════════════════════════

import { readShanxiangImage, type ImageFeature } from "@guoxue/shared/paipan";

/** 在图上以太极点为心、按真北方位与像素距离放一个标注 */
const imgAt = (label: string, bearingDeg: number, px: number, kind: ImageFeature["kind"] = "水"): ImageFeature => {
  const θ = (bearingDeg * Math.PI) / 180;
  // 反推：bearing = atan2(dx, −dy) ⇒ dx = px·sinθ，dy = −px·cosθ
  return { label, kind, point: { x: 500 + px * Math.sin(θ), y: 500 - px * Math.cos(θ) } };
};
const IMG_CENTER = { x: 500, y: 500 };

describe("截图路径：图像 y 轴朝下", () => {
  it("图上正上方＝正北，正右＝正东，正下＝正南，正左＝正西", () => {
    const r = readShanxiangImage({
      center: IMG_CENTER,
      features: [
        { label: "上", kind: "水", point: { x: 500, y: 300 } },
        { label: "右", kind: "水", point: { x: 700, y: 500 } },
        { label: "下", kind: "水", point: { x: 500, y: 700 } },
        { label: "左", kind: "水", point: { x: 300, y: 500 } },
      ],
    });
    expect(r.readings.map((x) => Math.round(x.bearing))).toEqual([0, 90, 180, 270]);
    expect(r.readings.map((x) => x.shan)).toEqual(["子", "卯", "午", "酉"]);
  });

  it("若把 y 轴当成朝上（atan2(dx, dy)），南北会颠倒——而盘面看着毫无异常", () => {
    const up = readShanxiangImage({ center: IMG_CENTER, features: [{ label: "上", kind: "水", point: { x: 500, y: 300 } }] });
    // 正解为子（正北）；写错方向会得到午（正南）。两者都是合法山位，不测就看不出来
    expect(up.readings[0].shan).toBe("子");
    const wrong = ((Math.atan2(0, -200) * 180) / Math.PI + 360) % 360;
    expect(`写反后=${Math.round(wrong)}`).toBe("写反后=180");
  });

  it("往返一致：按 θ 放点，回算方位仍为 θ（逐 5° 扫一圈）", () => {
    const bad: string[] = [];
    for (let θ = 0; θ < 360; θ += 5) {
      const r = readShanxiangImage({ center: IMG_CENTER, features: [imgAt("p", θ, 300)] });
      if (Math.abs(((r.readings[0].bearing - θ + 540) % 360) - 180) > 1e-6) bad.push(`${θ}`);
    }
    expect(`偏差超限=${bad.join(" ")}`).toBe("偏差超限=");
  });
});

describe("截图路径：图片旋转补偿", () => {
  it("northOffset 把用户转过的角度加回去", () => {
    const f = [{ label: "上", kind: "水" as const, point: { x: 500, y: 300 } }];
    expect(readShanxiangImage({ center: IMG_CENTER, features: f, northOffset: 0 }).readings[0].bearing).toBeCloseTo(0, 9);
    expect(readShanxiangImage({ center: IMG_CENTER, features: f, northOffset: 30 }).readings[0].bearing).toBeCloseTo(30, 9);
    expect(readShanxiangImage({ center: IMG_CENTER, features: f, northOffset: -30 }).readings[0].bearing).toBeCloseTo(330, 9);
  });

  it("旋转足以改变山位（转 30° 后正上方由子变辰）", () => {
    const f = [{ label: "上", kind: "水" as const, point: { x: 500, y: 300 } }];
    expect(readShanxiangImage({ center: IMG_CENTER, features: f }).readings[0].shan).toBe("子");
    expect(readShanxiangImage({ center: IMG_CENTER, features: f, northOffset: 120 }).readings[0].shan).toBe("辰");
  });
});

describe("截图路径：比例尺不猜", () => {
  it("未给比例尺时如实输出像素并标明单位", () => {
    const r = readShanxiangImage({ center: IMG_CENTER, features: [imgAt("水口", 90, 240)] });
    expect(r.readings[0].distanceUnit).toBe("像素");
    expect(Math.round(r.readings[0].distance)).toBe(240);
    expect(r.notes.join()).toContain("未提供比例尺");
  });

  it("给了比例尺才折米，且折算关系正确", () => {
    const r = readShanxiangImage({ center: IMG_CENTER, features: [imgAt("水口", 90, 240)], metersPerPixel: 2.5 });
    expect(r.readings[0].distanceUnit).toBe("米");
    expect(Math.round(r.readings[0].distance)).toBe(600);
    expect(r.notes.join()).toContain("1 像素 = 2.5 米");
  });

  it("恒提示图片不得被拉伸（本工具无从检出）", () => {
    const r = readShanxiangImage({ center: IMG_CENTER, features: [] });
    expect(r.notes.join()).toContain("拉伸");
  });
});

describe("截图路径与地图路径：煞忌判据必须一致", () => {
  /**
   * 两条路共用 `judge`。这组用例是**防分叉**的——
   * 若将来有人给其中一条单独改判据，这里会红。
   * 前后端之间「各自都自洽、合起来不一致」的分歧本轮已遇六次，不能在同一个包里再来一次。
   */
  const 北京点 = 北京;
  it.each([
    ["八曜煞：坐子逢辰方", 120, "水", { zuoShan: "子" as const }],
    ["黄泉：庚向逢坤方水", 225, "水", { xiangShan: "庚" as const }],
    ["黄泉不对建筑生效", 225, "建筑", { xiangShan: "庚" as const }],
    ["未触犯：坐子逢卯方", 90, "水", { zuoShan: "子" as const }],
  ] as const)("%s —— 两条路结论相同", (_label, deg, kind, opts) => {
    const geo = readShanxiangMap({
      center: 北京点, ...opts,
      features: [{ label: "p", kind, point: destination(北京点, deg, 1000) }],
    });
    const img = readShanxiangImage({
      center: IMG_CENTER, ...opts,
      features: [imgAt("p", deg, 300, kind)],
    });
    expect(`山=${img.readings[0].shan}`).toBe(`山=${geo.readings[0].shan}`);
    expect(`警=${img.readings[0].warnings.join("|")}`).toBe(`警=${geo.readings[0].warnings.join("|")}`);
  });

  it("截图路径同样不产出综合吉凶评分", () => {
    const r = readShanxiangImage({
      center: IMG_CENTER, zuoShan: "子", xiangShan: "午",
      features: [imgAt("水口", 120, 300), imgAt("高塔", 45, 200, "建筑")],
    });
    expect(JSON.stringify(r)).not.toMatch(/评分|总分|大吉|大凶/);
  });
});
