import { PaipanService } from "./paipan.service";

/**
 * 山向地图端点回归（2026-09-19，接续文档 §2.91）
 *
 * 算法本身由 `test/shanxiang-map.spec.ts`（19 例）负责，
 * 本文件只验**服务层这一薄层**做对了它该做的三件事：
 *   ① 把 DTO 如实转给引擎；
 *   ② 磁偏角**给了才补**罗盘读数，不给就不补；
 *   ③ 坐标系与真北/磁北之别在响应里说清楚。
 *
 * ②这一条是有意的：凭空假设一个磁偏角，会让用户拿着错的数去现场对盘，
 * 比不给更糟——现场对不上时，用户不会怀疑那个他没输入过的默认值。
 */

/** `shanxiangMap` 是纯计算、不碰任何注入依赖，故构造参数传空即可 */
const svc = new PaipanService({} as never, {} as never);

const 北京 = { lat: 39.9042, lng: 116.4074 };
/** 自北京按真北方位与距离推点（与算法测试同一套构造） */
function destination(bearingDeg: number, meters: number) {
  const R = 6371008.8, d = meters / R, θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (北京.lat * Math.PI) / 180, λ1 = (北京.lng * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}
const feat = (label: string, deg: number, kind = "水") => ({ label, kind, point: destination(deg, 1200) });

describe("山向地图端点：转发与取整", () => {
  it("方位保留一位小数、距离取整到米", () => {
    const r = svc.shanxiangMap({ center: 北京, features: [feat("水口", 120)] }) as any;
    const x = r.readings[0];
    expect(`方位=${x.bearing}`).toBe("方位=120");
    expect(`距离=${x.distance}`).toBe("距离=1200");
    expect(x.shan).toBe("辰");
  });

  it("标注顺序与输入一致，条数不增不减", () => {
    const fs = [feat("甲", 0), feat("乙", 90), feat("丙", 180), feat("丁", 270)];
    const r = svc.shanxiangMap({ center: 北京, features: fs }) as any;
    expect(r.readings.map((x: any) => x.label)).toEqual(["甲", "乙", "丙", "丁"]);
  });

  it("空标注列表不报错，仍给出提示", () => {
    const r = svc.shanxiangMap({ center: 北京, features: [] }) as any;
    expect(r.readings).toEqual([]);
    expect(r.notes.length).toBeGreaterThan(0);
  });
});

describe("山向地图端点：磁偏角给了才补", () => {
  it("不给磁偏角时不得出现 compassBearing，且明说只给真北", () => {
    const r = svc.shanxiangMap({ center: 北京, features: [feat("水口", 120)] }) as any;
    expect(r.readings[0].compassBearing).toBeUndefined();
    expect(r.notes.join()).toContain("未提供磁偏角");
  });

  it("给了磁偏角则补罗盘读数，且与真北相差正是该磁偏角", () => {
    const decl = -6.5;
    const r = svc.shanxiangMap({ center: 北京, features: [feat("水口", 120)], declination: decl }) as any;
    const x = r.readings[0];
    expect(`罗盘读数=${x.compassBearing}`).toBe(`罗盘读数=${120 - decl}`);
    expect(r.notes.join()).toContain("西偏 6.5°");
  });

  it("东偏与西偏的措辞分开（符号写反会被这条拦下）", () => {
    const east = svc.shanxiangMap({ center: 北京, features: [], declination: 3 }) as any;
    const west = svc.shanxiangMap({ center: 北京, features: [], declination: -3 }) as any;
    expect(east.notes.join()).toContain("东偏 3°");
    expect(west.notes.join()).toContain("西偏 3°");
  });
});

describe("山向地图端点：口径声明", () => {
  it("响应标明 WGS-84，并提示 GCJ-02 的偏差足以跨山", () => {
    const r = svc.shanxiangMap({ center: 北京, features: [] }) as any;
    expect(r.coordSystem).toBe("WGS-84");
    expect(r.notes.join()).toContain("GCJ-02");
    expect(r.notes.join()).toContain("跨山");
  });

  it("恒提示真北与磁北之别", () => {
    const r = svc.shanxiangMap({ center: 北京, features: [] }) as any;
    expect(r.notes.join()).toContain("磁偏角");
  });

  it("不产出综合吉凶评分（与算法层同一条纪律）", () => {
    const r = svc.shanxiangMap({
      center: 北京, zuoShan: "子", xiangShan: "午",
      features: [feat("水口", 120), feat("高塔", 45, "建筑")],
    });
    expect(JSON.stringify(r)).not.toMatch(/评分|总分|大吉|大凶/);
  });
});

describe("山向地图端点：煞忌判定透传", () => {
  it("坐子逢辰方 → 八曜煞命中", () => {
    const r = svc.shanxiangMap({ center: 北京, zuoShan: "子", features: [feat("池塘", 120)] }) as any;
    expect(r.readings[0].warnings.join()).toContain("八曜煞");
  });

  it("庚向逢坤方水 → 黄泉命中；同方位建筑 → 不命中", () => {
    const water = svc.shanxiangMap({ center: 北京, xiangShan: "庚", features: [feat("来水", 225, "水")] }) as any;
    const bldg = svc.shanxiangMap({ center: 北京, xiangShan: "庚", features: [feat("楼", 225, "建筑")] }) as any;
    expect(water.readings[0].warnings.join()).toContain("黄泉");
    expect(bldg.readings[0].warnings).toEqual([]);
  });

  it("坐向非对宫时给出输入校验提示", () => {
    const r = svc.shanxiangMap({ center: 北京, zuoShan: "子", xiangShan: "酉", features: [] }) as any;
    expect(r.notes.join()).toContain("并非对宫");
  });
});

describe("截图路径端点", () => {
  const C = { x: 500, y: 500 };
  const at = (label: string, deg: number, px: number, kind = "水") => {
    const θ = (deg * Math.PI) / 180;
    return { label, kind, point: { x: 500 + px * Math.sin(θ), y: 500 - px * Math.cos(θ) } };
  };

  it("未给比例尺时按像素输出并标明单位", () => {
    const r = svc.shanxiangImage({ center: C, features: [at("水口", 90, 240)] }) as any;
    expect(r.readings[0].distanceUnit).toBe("像素");
    expect(r.readings[0].distance).toBe(240);
    expect(r.notes.join()).toContain("未提供比例尺");
  });

  it("给了比例尺才折米，且米制取整、像素留一位小数", () => {
    const m = svc.shanxiangImage({ center: C, features: [at("水口", 90, 240)], metersPerPixel: 2.5 }) as any;
    expect(m.readings[0].distanceUnit).toBe("米");
    expect(m.readings[0].distance).toBe(600);
  });

  it("northOffset 生效：转 120° 后正上方由子变辰", () => {
    const f = [{ label: "上", kind: "水", point: { x: 500, y: 300 } }];
    expect((svc.shanxiangImage({ center: C, features: f }) as any).readings[0].shan).toBe("子");
    expect((svc.shanxiangImage({ center: C, features: f, northOffset: 120 }) as any).readings[0].shan).toBe("辰");
  });

  it("两条路的煞忌结论必须一致（防分叉）", () => {
    const cases = [
      { deg: 120, kind: "水", opts: { zuoShan: "子" } },
      { deg: 225, kind: "水", opts: { xiangShan: "庚" } },
      { deg: 225, kind: "建筑", opts: { xiangShan: "庚" } },
    ];
    for (const c of cases) {
      const geo = svc.shanxiangMap({ center: 北京, ...c.opts, features: [feat("p", c.deg, c.kind)] }) as any;
      const img = svc.shanxiangImage({ center: C, ...c.opts, features: [at("p", c.deg, 300, c.kind)] }) as any;
      expect(`${c.deg}°${c.kind} 山=${img.readings[0].shan}`).toBe(`${c.deg}°${c.kind} 山=${geo.readings[0].shan}`);
      expect(`${c.deg}°${c.kind} 警=${img.readings[0].warnings.join("|")}`)
        .toBe(`${c.deg}°${c.kind} 警=${geo.readings[0].warnings.join("|")}`);
    }
  });

  it("恒提示图片不得被拉伸，且同样不产出吉凶评分", () => {
    const r = svc.shanxiangImage({ center: C, zuoShan: "子", xiangShan: "午", features: [at("水口", 120, 300)] });
    expect(JSON.stringify(r)).not.toMatch(/评分|总分|大吉|大凶/);
    expect((r as any).notes.join()).toContain("拉伸");
  });
});
