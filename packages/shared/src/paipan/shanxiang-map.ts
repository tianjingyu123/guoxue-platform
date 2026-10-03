/**
 * 山向地图：以太极点为心，算周边标注点各落何山、吉凶如何（2026-09-19 新建）
 *
 * ══ 这个功能原本被砍掉了 ══
 *
 * 前端 `pkg-paipan3/luopan/index.vue` 头部记着：
 * 「砍：Leaflet 地图／GPS 反查／立极尺测距（外链 OSM 小程序域名白名单不通，且非罗盘主线）」。
 * 卡点在**底图**，不在算法。本模块只做算法部分——底图换成什么都不影响这里。
 *
 * ══ 算法要点：不能用平面近似 ══
 *
 * 风水看形势要的是「水口在哪个山」「那座塔压哪个山」，
 * 一个山只有 15°，太极点到目标点若有一两公里，**平面直角近似的误差足以跨山**：
 * 经度一度的东西向距离随纬度收缩（cos φ），在北纬 40° 已缩到赤道的 0.77 倍，
 * 直接拿经纬度差当直角边算 atan2，方位角会偏出好几度。
 * 故此处用**球面大圆初始方位角**，不用平面近似。
 *
 * ══ 真北与磁北 ══
 *
 * 地图给的是**真北**方位，罗盘读的是**磁北**。两者差一个磁偏角，
 * 中国境内大致在 −10°（西偏）到 +6°（东偏）之间——**足以跨半个到一个山**。
 * 本模块一律以真北为准，与罗盘读数互转由 `magneticToTrue` / `trueToMagnetic` 显式完成，
 * 不做隐式换算（隐式换算是这类工具最容易埋错的地方）。
 */

import { RING_DIPAN, readRing, norm360, type Shan24 } from "./luopan-rings";

export interface GeoPoint {
  /** 纬度（北正南负，度） */
  lat: number;
  /** 经度（东正西负，度） */
  lng: number;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
/** 地球平均半径（米，IUGG 平均半径） */
const EARTH_R = 6371008.8;

/**
 * 球面大圆**初始方位角**（自真北顺时针，度）。
 *
 * 用 `atan2(sinΔλ·cosφ₂, cosφ₁·sinφ₂ − sinφ₁·cosφ₂·cosΔλ)`。
 * 注意这是**初始**方位角：大圆航线上方位角沿途变化，
 * 但风水看的是「从太极点望过去的方向」，取初始方位角正合用。
 */
export function bearingTo(from: GeoPoint, to: GeoPoint): number {
  const φ1 = from.lat * D2R, φ2 = to.lat * D2R;
  const Δλ = (to.lng - from.lng) * D2R;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return norm360(Math.atan2(y, x) * R2D);
}

/** 大圆距离（米），haversine */
export function distanceTo(from: GeoPoint, to: GeoPoint): number {
  const φ1 = from.lat * D2R, φ2 = to.lat * D2R;
  const Δφ = (to.lat - from.lat) * D2R, Δλ = (to.lng - from.lng) * D2R;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 罗盘（磁北）读数 → 真北方位。磁偏角东偏为正。 */
export const magneticToTrue = (magDeg: number, declination: number): number =>
  norm360(magDeg + declination);
/** 真北方位 → 罗盘（磁北）读数 */
export const trueToMagnetic = (trueDeg: number, declination: number): number =>
  norm360(trueDeg - declination);

/** 真北方位 → 地盘正针二十四山 */
export function shanOfBearing(trueDeg: number): Shan24 {
  return readRing(RING_DIPAN, trueDeg).cell.text as Shan24;
}

// ─────────────────────── 形势判定 ───────────────────────

/**
 * 八曜煞（八煞黄泉）。
 *
 * 口诀：「坎龙坤兔震山猴，巽鸡乾马兑蛇头，艮虎离猪为曜煞，宅墓逢之一齐休。」
 * 即：坎宅忌辰、坤忌卯、震忌申、巽忌酉、乾忌午、兑忌巳、艮忌寅、离忌亥。
 *
 * 不变量：**八卦各忌一支，八支互不相同**。
 */
export const BA_YAO_SHA: Record<string, string> = {
  坎: "辰", 坤: "卯", 震: "申", 巽: "酉",
  乾: "午", 兑: "巳", 艮: "寅", 离: "亥",
};

/** 二十四山所属卦宫（三山一宫） */
export const SHAN_GUA: Record<string, string> = {
  壬: "坎", 子: "坎", 癸: "坎", 丑: "艮", 艮: "艮", 寅: "艮",
  甲: "震", 卯: "震", 乙: "震", 辰: "巽", 巽: "巽", 巳: "巽",
  丙: "离", 午: "离", 丁: "离", 未: "坤", 坤: "坤", 申: "坤",
  庚: "兑", 酉: "兑", 辛: "兑", 戌: "乾", 乾: "乾", 亥: "乾",
};

/**
 * 八路四路黄泉（救贫黄泉）。
 *
 * 口诀：「庚丁坤上是黄泉，乙丙须防巽水先，甲癸向中忧见艮，辛壬水路怕当乾。」
 * 即：庚向、丁向忌坤方来去水；乙向、丙向忌巽；甲向、癸向忌艮；辛向、壬向忌乾。
 *
 * 不变量：**八个向各配一个忌方，忌方只落四维（坤巽艮乾）**。
 */
export const HUANG_QUAN: Record<string, string> = {
  庚: "坤", 丁: "坤", 乙: "巽", 丙: "巽",
  甲: "艮", 癸: "艮", 辛: "乾", 壬: "乾",
};

/** 标注类别。黄泉口诀专指水路，故类别不可省 */
export type FeatureKind = "水" | "砂" | "路" | "建筑" | "其他";

/** 地图上标注的一个对象（经纬度路径） */
export interface MapFeature {
  label: string;
  point: GeoPoint;
  kind: FeatureKind;
}

/**
 * 截图上标注的一个对象（像素路径）。
 *
 * 用户自行上传卫星图/平面图截图时没有经纬度，只有像素坐标。
 * 注意**图像 y 轴朝下**，与数学坐标相反，换算方位角时要取负。
 */
export interface ImageFeature {
  label: string;
  /** 像素坐标，原点在图像左上角，x 向右、y 向下 */
  point: { x: number; y: number };
  kind: FeatureKind;
}

export interface FeatureReading {
  label: string;
  kind: FeatureKind;
  /** 自太极点起算的真北方位角 */
  bearing: number;
  /** 距离。经纬度路径为米；截图路径在未给比例尺时为**像素**，见 `distanceUnit` */
  distance: number;
  distanceUnit: "米" | "像素";
  shan: Shan24;
  gua: string;
  /** 命中的煞忌（可能多条），空数组表示未触犯本模块所载诸煞 */
  warnings: string[];
}

/**
 * 煞忌判定核心——**与坐标来源无关**。
 *
 * 抽出来是为了让「地图」与「截图」两条路走同一份判据。
 * 若各写一份，迟早会出现「地图上报黄泉、截图上不报」这种分歧，
 * 而这类分歧在两边各自都自洽的情况下极难发现（本轮已在前后端之间遇到六次）。
 */
function judge(
  bearing: number,
  kind: FeatureKind,
  zuoShan?: Shan24,
  xiangShan?: Shan24,
): { shan: Shan24; gua: string; warnings: string[] } {
  const shan = shanOfBearing(bearing);
  const gua = SHAN_GUA[shan];
  const warnings: string[] = [];

  // 八曜煞：以**坐山所属卦**起，忌某支方位见水见砂
  if (zuoShan) {
    const zuoGua = SHAN_GUA[zuoShan];
    if (BA_YAO_SHA[zuoGua] === shan) {
      warnings.push(`八曜煞：坐${zuoShan}属${zuoGua}卦，忌${shan}方（口诀「${yaoShaMnemonic(zuoGua)}」）`);
    }
  }
  // 黄泉：以**向**起，忌某维方来去水。口诀专指水路，故只对「水」类生效
  if (xiangShan && kind === "水" && HUANG_QUAN[xiangShan] === shan) {
    warnings.push(`八路四路黄泉：${xiangShan}向忌${shan}方水路`);
  }
  return { shan, gua, warnings };
}

/** 两条路共用的收尾提示 */
function commonNotes(
  readings: FeatureReading[],
  zuoShan?: Shan24,
  xiangShan?: Shan24,
): string[] {
  const notes: string[] = [];
  if (zuoShan && xiangShan) {
    const expected = oppositeShan(zuoShan);
    if (expected !== xiangShan) {
      notes.push(`坐${zuoShan}与向${xiangShan}并非对宫（坐${zuoShan}应向${expected}），请核对输入`);
    }
  }
  const hit = readings.filter((r) => r.warnings.length);
  notes.push(hit.length ? `${hit.length} 处标注触犯成规，详见各点提示` : "所列标注未触犯本工具所载八曜煞与黄泉");
  notes.push("方位为真北方位角；罗盘读数为磁北，两者相差一个磁偏角，比对前请先换算");
  return notes;
}

export interface ShanxiangMapInput {
  /** 太极点（宅/穴中心） */
  center: GeoPoint;
  /** 坐山（可选）。给了才能判八曜煞 */
  zuoShan?: Shan24;
  /** 向（可选）。给了才能判黄泉 */
  xiangShan?: Shan24;
  features: MapFeature[];
}

export interface ShanxiangMapResult {
  center: GeoPoint;
  zuoShan?: Shan24;
  xiangShan?: Shan24;
  readings: FeatureReading[];
  /** 汇总提示（不含吉凶断语，只陈述命中了哪些成规） */
  notes: string[];
}

/**
 * 逐点判读（经纬度路径）。
 *
 * **只判本模块载有明确口诀的两类煞**（八曜煞、八路四路黄泉），
 * 且判据都写在上面的常量注释里，可逐条核对。
 * 不做「综合吉凶评分」这类无从核验的合成结论——
 * 地图上一个点是吉是凶，取决于形、势、水法、当运，不是查两张表能定的。
 */
export function readShanxiangMap(input: ShanxiangMapInput): ShanxiangMapResult {
  const { center, zuoShan, xiangShan, features } = input;
  const readings: FeatureReading[] = features.map((f) => {
    const bearing = bearingTo(center, f.point);
    return {
      label: f.label, kind: f.kind, bearing,
      distance: distanceTo(center, f.point), distanceUnit: "米" as const,
      ...judge(bearing, f.kind, zuoShan, xiangShan),
    };
  });
  return { center, zuoShan, xiangShan, readings, notes: commonNotes(readings, zuoShan, xiangShan) };
}

// ─────────────────── 截图路径（无经纬度时的兜底）───────────────────

export interface ShanxiangImageInput {
  /** 太极点在图上的像素位置 */
  center: { x: number; y: number };
  /**
   * 图上正北的朝向（度，自图像正上方顺时针）。
   * 图片正上方即正北时传 0；用户把图转了 30° 则传 30。
   */
  northOffset?: number;
  /**
   * 比例尺：图上一像素对应多少米。给了才按米输出距离，否则输出像素。
   * 不猜——猜一个比例尺会让距离看着很像真的，实则毫无依据。
   */
  metersPerPixel?: number;
  zuoShan?: Shan24;
  xiangShan?: Shan24;
  features: ImageFeature[];
}

export interface ShanxiangImageResult {
  center: { x: number; y: number };
  northOffset: number;
  zuoShan?: Shan24;
  xiangShan?: Shan24;
  readings: FeatureReading[];
  notes: string[];
}

/**
 * 逐点判读（截图路径）。
 *
 * 用户上传卫星图或平面图截图，在图上点太极点与各标注。
 * 与经纬度路径共用同一份煞忌判据（`judge`），只是方位来源不同。
 *
 * **两处易错，都在代码里挡住了：**
 * ① **图像 y 轴朝下**。正上方是 −y，故方位角 `atan2(dx, −dy)`，
 *    写成 `atan2(dx, dy)` 会把南北颠倒——而颠倒后每个标注依然落在某个山上，
 *    盘面看着毫无异常。
 * ② **比例尺不猜**。没给 `metersPerPixel` 就如实输出像素并标明单位，
 *    不按屏幕 DPI 之类拍一个——距离一旦看着像真的，用户就会拿它做判断。
 *
 * ⚠️ 前提：截图的像素须各向同性（常规地图截图满足；被拉伸过的图不满足）。
 * 拉伸图上方位角会失真，本函数无从检出，提示里会点明。
 */
export function readShanxiangImage(input: ShanxiangImageInput): ShanxiangImageResult {
  const { center, northOffset = 0, metersPerPixel, zuoShan, xiangShan, features } = input;
  const unit: "米" | "像素" = metersPerPixel ? "米" : "像素";

  const readings: FeatureReading[] = features.map((f) => {
    const dx = f.point.x - center.x;
    const dy = f.point.y - center.y;
    // 图像 y 轴朝下：正上方为 −y。再叠加用户把图转过的角度
    const bearing = norm360(Math.atan2(dx, -dy) * R2D + northOffset);
    const px = Math.hypot(dx, dy);
    return {
      label: f.label, kind: f.kind, bearing,
      distance: metersPerPixel ? px * metersPerPixel : px,
      distanceUnit: unit,
      ...judge(bearing, f.kind, zuoShan, xiangShan),
    };
  });

  const notes = commonNotes(readings, zuoShan, xiangShan);
  notes.push(
    metersPerPixel
      ? `距离按比例尺 1 像素 = ${metersPerPixel} 米折算`
      : "未提供比例尺，距离单位为像素；如需实距请先在图上标定两点间已知长度",
  );
  notes.push("截图路径要求图片未被拉伸（像素各向同性）；拉伸过的图方位角会失真，本工具无从检出");
  return { center, northOffset, zuoShan, xiangShan, readings, notes };
}

/** 对宫山（相差 180°） */
export function oppositeShan(shan: Shan24): Shan24 {
  const center = readRing(RING_DIPAN, 0).cell.text; // 触发一次读取，确保环已初始化
  void center;
  const idx = RING_DIPAN.cells.findIndex((c) => c.text === shan);
  return RING_DIPAN.cells[(idx + 12) % 24].text as Shan24;
}

function yaoShaMnemonic(gua: string): string {
  const m: Record<string, string> = {
    坎: "坎龙", 坤: "坤兔", 震: "震山猴", 巽: "巽鸡",
    乾: "乾马", 兑: "兑蛇头", 艮: "艮虎", 离: "离猪",
  };
  return m[gua] ?? gua;
}

/**
 * ══ 关于底图 ══
 *
 * 本模块**不依赖任何地图服务**——只吃经纬度、吐方位与山位。
 * 底图用什么（小程序原生 `<map>`、用户自行上传的卫星图截图、离线瓦片）
 * 都不影响这里的结果，换底图不用改算法。
 *
 * ══ 未做（宁缺毋编）══
 *
 * · **综合吉凶评分**：一个点是吉是凶取决于形、势、水法、当运，
 *   不是查两张表能定的，不做。
 * · **三合水法的墓库消砂纳水判定**：需要先确定水口与四大局，
 *   而水口要现场看、不是地图上点一下能定的，留给人工。
 * · **磁偏角模型**：本模块只提供真北↔磁北的显式换算函数，
 *   磁偏角本身由调用方给（IGRF 模型或城市表），不在此处估算。
 */
