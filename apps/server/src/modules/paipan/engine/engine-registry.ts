/**
 * 排盘引擎注册表：tool → { 入参校验, 执行 }。
 *
 * 引擎源码与前端曾经运行的是**同一份**（迁移时逐字搬入，仅改 import 路径），
 * 由 test/paipan-engine-golden.spec.ts 以迁移前的全枚举金样守护对等性。
 *
 * 入参一律收「墙上时间」分量（年月日时分），在北京时区段内用 `new Date(y, m-1, d, h, mi)` 构造，
 * 与前端结果页原先的构造方式一致 —— 这正是中国手机上的行为。
 */
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { paiTaiyi } from "./taiyi-engine";
import { paiXiaoChengTu } from "./xiaochengtu-engine";
import { paiZhuge, zhugeVerdict } from "./zhuge-engine";
import { computeWuyun } from "./wuyunliuqi-engine";
import { paiFeigong } from "./feigong-engine";
import { paiJinKouJue } from "./jinkoujue-engine";
import { computeLiuren, computeLiuyao, computeMeihua, computeQimen, mingliJu, trueSolarTime } from "@guoxue/shared/paipan";
import { Solar } from "./vendor/lunar";
import { computeQimenLocal } from "./qimen-adapter";
import { paiChuanren, SHENGXIAO } from "./chuanren-engine";
import { paiShanxiang } from "./shanxiang-engine";
import { computeZiwei, toZiweiChart } from "./ziwei-engine";
import { computeHepan } from "./hepan-engine";
import { HEPAN_SCENES } from "./hepan-data";
import { computeQizheng } from "./qizheng-engine";
import { analyzeName } from "./xingming-engine";
import { generateNames } from "./qiming-engine";
import { computeBazi } from "./bazi-engine";
import { filterChars, lookupText, plazaFacets, type RemoteEntry } from "./zidian-engine";
import { getLunar as xlrLunar, getSizhu as xlrSizhu, paiPan as paiXiaoliuren } from "./xiaoliuren-engine";

type Body = Record<string, unknown>;

export interface EngineDef<A> {
  parse(body: Body): A;
  run(args: A): unknown;
}

function bad(msg: string): never {
  throw new BusinessException(ErrorCode.BAD_REQUEST, msg);
}

function int(body: Body, key: string, min: number, max: number): number {
  const n = Number(body[key]);
  if (!Number.isInteger(n) || n < min || n > max) bad(`参数 ${key} 无效`);
  return n;
}

function oneOf<T extends string>(body: Body, key: string, set: readonly T[], fallback: T): T {
  const v = body[key];
  if (v === undefined || v === null || v === "") return fallback;
  return (set as readonly unknown[]).includes(v) ? (v as T) : bad(`参数 ${key} 无效`);
}

/** 墙上时间 → 年月日时分（日需真实存在：2 月 30 日之类直接拒绝，不让 Date 静默进位） */
export function wallClock(body: Body) {
  const year = int(body, "year", 1000, 3000);
  const month = int(body, "month", 1, 12);
  const day = int(body, "day", 1, 31);
  const hour = int(body, "hour", 0, 23);
  const minute = int(body, "minute", 0, 59);
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > dim) bad("参数 day 无效");
  return { year, month, day, hour, minute };
}

/** 可选整数：缺省返回 undefined，给了就必须合法 */
function optInt(body: Body, key: string, min: number, max: number): number | undefined {
  const v = body[key];
  if (v === undefined || v === null || v === "") return undefined;
  return int(body, key, min, max);
}

/** 可缺省时分的墙上时间（小成图等前端原映射是 `Number(p.hour) || 0`） */
function wallClockLoose(body: Body) {
  const hour = optInt(body, "hour", 0, 23) ?? 0;
  const minute = optInt(body, "minute", 0, 59) ?? 0;
  return { ...wallClock({ ...body, hour, minute }) };
}

const TAIYI_PAN_SHI = ["year", "month", "day", "hour"] as const;
const TAIYI_SUAN_FA = ["tongzong", "zhijin", "jinjing"] as const;

const ZHIS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 解析 "YYYY-MM-DD HH:mm"（与姓名/起名页原 parseBirth 同一正则） */
function parseBirth(birth: unknown): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const m = String(birth ?? "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: Number(m[4]), minute: Number(m[5]) };
}

const XCT_METHODS = ["manual", "yao", "guaming", "number1", "number2", "time", "auto"] as const;

export const ENGINES: Record<string, EngineDef<any>> = {
  /** 太乙神数（默认值与前端结果页原逻辑一致：盘式 hour、算法 zhijin） */
  taiyi: {
    parse: (b) => ({
      ...wallClock(b),
      panShi: oneOf(b, "panShi", TAIYI_PAN_SHI, "hour"),
      suanFa: oneOf(b, "suanFa", TAIYI_SUAN_FA, "zhijin"),
    }),
    run: (a) =>
      paiTaiyi({ date: new Date(a.year, a.month - 1, a.day, a.hour, a.minute), panShi: a.panShi, suanFa: a.suanFa }),
  },

  /**
   * 小成图。请求体即前端结果页 payload（m=起卦方式 zg=中宫 u/l=上下卦 dong=动爻 lines=六爻串 n1–n3=数字），
   * 映射与前端 xiaochengtu/result.vue 迁移前逐字等价（缺省时分取 0、zg 非 zhengyu 即 sizheng）。
   */
  xiaochengtu: {
    parse: (b) => {
      const lines = typeof b.lines === "string" && /^[01]{6}$/.test(b.lines) ? b.lines : "";
      return {
        ...wallClockLoose(b),
        method: oneOf(b, "m", XCT_METHODS, "time"),
        zhonggong: b.zg === "zhengyu" ? "zhengyu" : "sizheng",
        topic: b.topic ? String(b.topic).slice(0, 100) : undefined,
        upper: optInt(b, "u", 1, 8),
        lower: optInt(b, "l", 1, 8),
        dong: optInt(b, "dong", 1, 6),
        lines: lines ? lines.split("").map((c) => c === "1") : undefined,
        num1: optInt(b, "n1", 1, 1e9),
        num2: optInt(b, "n2", 1, 1e9),
        num3: optInt(b, "n3", 1, 1e9),
      };
    },
    run: ({ year, month, day, hour, minute, ...opts }) =>
      paiXiaoChengTu({ ...opts, date: new Date(year, month - 1, day, hour, minute) }),
  },

  /**
   * 诸葛神数：三字 → 签。断语（zhugeVerdict）原在前端结果页现算，属解读逻辑，一并由服务端给出。
   * 「请输入三个汉字」「某字不在康熙字典库中」由引擎抛出，服务层转 400 原文给用户。
   */
  /**
   * 五运六气：按年排运气。now（epoch 毫秒）用于判定「当令」气步，由前端传当前时刻；
   * 缺省取服务端当前时刻（瞬时比较，与时区无关）。
   */
  wuyunliuqi: {
    parse: (b) => ({
      year: int(b, "year", 1000, 3000),
      now: optInt(b, "now", -8.64e15, 8.64e15) ?? Date.now(), // JS Date 合法范围；1970 年前为负
    }),
    run: ({ year, now }) => computeWuyun(year, new Date(now)),
  },

  /**
   * 飞宫小奇门。请求体即前端 payload（m=hour|number|random，n=报数；随机数已在输入页落定）。
   * 映射与 feigong/result.vue 迁移前逐字等价：random 按报数口径重算，展示标签改回「随机起局（n）」。
   */
  feigong: {
    parse: (b) => {
      const m = b.m === "number" ? "number" : b.m === "random" ? "random" : "hour";
      const n = optInt(b, "n", 1, 1e9);
      if (m !== "hour" && n === undefined) bad("参数 n 无效");
      return { ...wallClockLoose(b), m, n };
    },
    run: (a) => {
      const res = paiFeigong({
        date: new Date(a.year, a.month - 1, a.day, a.hour, a.minute),
        method: a.m === "hour" ? "hour" : "number",
        reportNumber: a.n,
      });
      if (a.m === "random") res.methodLabel = `随机起局（${a.n}）`;
      return res;
    },
  },

  /**
   * 金口诀。请求体即前端 payload（dm=地分方式 dz=地分支 dn=报数 jm=换将 gs=贵人口诀 gt=贵神昼夜；随机地分已在输入页落定为 dz）。
   * 映射与 jinkoujue/result.vue 迁移前逐字等价（含缺省：jm 非 zhong 即 jie、gs 非 B 即 A、gt 缺省 auto），
   * random 按已定支重算后把展示口径改回「随机」。
   */
  jinkoujue: {
    parse: (b) => {
      const dm = b.dm === "number" ? "number" : b.dm === "random" ? "random" : "manual";
      const dz = b.dz === undefined || b.dz === null ? undefined : String(b.dz);
      const dn = optInt(b, "dn", 1, 1e9);
      if (dm === "number" && dn === undefined) bad("参数 dn 无效");
      if (dm !== "number" && !(dz && (ZHIS as readonly string[]).includes(dz))) bad("参数 dz 无效");
      return {
        ...wallClockLoose(b),
        topic: String(b.topic ?? "").slice(0, 100),
        dm, dz, dn,
        jm: b.jm === "zhong" ? "zhong" : "jie",
        gs: b.gs === "B" ? "B" : "A",
        gt: b.gt === "day" ? "day" : b.gt === "night" ? "night" : "auto",
      };
    },
    run: (q) => {
      const r = paiJinKouJue({
        date: new Date(q.year, q.month - 1, q.day, q.hour, q.minute),
        topic: q.topic || undefined,
        difenMethod: q.dm === "number" ? "number" : "manual",
        difenZhi: q.dz,
        difenNumber: q.dn,
        jiangMethod: q.jm,
        guirenSchool: q.gs,
        guiType: q.gt,
      });
      if (q.dm === "random") r.difen.method = "随机";
      return r;
    },
  },

  /**
   * 小六壬。请求体：墙上时间 + school（daojia/jiangshi/jiangshi2）+ numbers（报数起课的正整数数组，时间起课不传）。
   * 四柱与农历由服务端按日期重算（不信任前端传来的派生值），与 xiaoliuren/index.vue 迁移前的 computed 链逐字等价：
   * paiPan({ school, lunarMonth, lunarDay, hourNum: 时支序+1, numbers: 非空数组或 null, sizhu })。
   */
  xiaoliuren: {
    parse: (b) => {
      const raw = b.numbers;
      let numbers: number[] | null = null;
      if (raw !== undefined && raw !== null) {
        if (!Array.isArray(raw) || raw.length > 10) bad("参数 numbers 无效");
        numbers = (raw as unknown[]).map((x) => Number(x));
        if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 1e9)) bad("参数 numbers 无效");
        if (numbers.length === 0) numbers = null;
      }
      return { ...wallClock(b), school: oneOf(b, "school", ["daojia", "jiangshi", "jiangshi2"] as const, "daojia"), numbers };
    },
    run: (a) => {
      const sizhu = xlrSizhu(a.year, a.month, a.day, a.hour, a.minute);
      const lunar = xlrLunar(a.year, a.month, a.day);
      return paiXiaoliuren({
        school: a.school, lunarMonth: lunar.m, lunarDay: lunar.d,
        hourNum: sizhu.hour.zi + 1, numbers: a.numbers, sizhu,
      });
    },
  },

  /**
   * 大六壬。请求体：起课时刻 + 流派选项 + hourOffset（结果页「前后翻时辰」，每步 ±2 小时）。
   * 与 daliuren/result.vue 迁移前的 onLoad 归一化 + recompute 逐字等价：
   * 先按墙上时间构造，再 setHours(+offset×2)（在北京时区锁内做，跨日/跨月由 Date 进位）。
   */
  daliuren: {
    parse: (b) => ({
      ...wallClock(b),
      hourOffset: optInt(b, "hourOffset", -10000, 10000) ?? 0,
      birthYear: Number(b.birthYear) || 0,
      gender: b.gender === "女" ? "女" : "男",
      jiangMethod: b.jiangMethod === "jiaojie" ? "jiaojie" : "zhongqi",
      guirenMethod: b.guirenMethod === "alt" ? "alt" : "standard",
      guishenType: b.guishenType === "day" || b.guishenType === "night" ? b.guishenType : "auto",
      shehaiType: b.shehaiType === "shenqian" ? "shenqian" : "mengzhongji",
    }),
    run: (p) => {
      const d = new Date(p.year, p.month - 1, p.day, p.hour, p.minute);
      d.setHours(d.getHours() + p.hourOffset * 2);
      return computeLiuren(d, {
        jiangMethod: p.jiangMethod,
        guirenMethod: p.guirenMethod,
        guishenType: p.guishenType,
        shehaiType: p.shehaiType,
        birthYear: p.birthYear || undefined,
        gender: p.gender,
      });
    },
  },

  /**
   * 六爻。请求体即前端 payload（methodKey + coins/numberInput/guaPick；自动/摇卦的铜钱已在输入页落定）。
   * 校验与 pkg-paipan2/liuyao/result.vue 迁移前一致：年份 1900–2100、起卦方式在七种之内（缺省 auto）。
   */
  liuyao: {
    parse: (b) => {
      const str = (k: string, max: number) => {
        const v = b[k];
        if (!v) return undefined;
        const s = String(v);
        if (s.length > max) bad(`参数 ${k} 无效`);
        return s;
      };
      let guaPick: { benUp: string; benDown: string; bianUp: string; bianDown: string } | undefined;
      if (b.guaPick) {
        const g = b.guaPick as Record<string, unknown>;
        const keys = ["benUp", "benDown", "bianUp", "bianDown"] as const;
        if (typeof g !== "object" || keys.some((k) => typeof g[k] !== "string" || (g[k] as string).length > 10)) bad("参数 guaPick 无效");
        guaPick = { benUp: g.benUp as string, benDown: g.benDown as string, bianUp: g.bianUp as string, bianDown: g.bianDown as string };
      }
      return {
        year: int(b, "year", 1900, 2100),
        month: int(b, "month", 1, 12),
        day: int(b, "day", 1, 31),
        hour: int(b, "hour", 0, 23),
        minute: int(b, "minute", 0, 59),
        methodKey: oneOf(b, "methodKey", ["manual", "coin", "guaname", "number1", "number2", "time", "auto"] as const, "auto"),
        coins: str("coins", 60),
        numberInput: str("numberInput", 60),
        guaPick,
      };
    },
    run: (a) => computeLiuyao(a),
  },

  /**
   * 梅花易数。请求体即前端 payload（mode/numbers/plusHour/yaos/moving）。
   * 与 meihua/result.vue 迁移前逐字等价：payload 归一化（数值缺省回落 2026-01-01 00:00）→
   * 本页用 lunar 求农历月日（异常时退回公历月日）→ computeMeihua。
   */
  meihua: {
    parse: (b) => {
      const n = (k: string, fb: number, min: number, max: number) => {
        const v = Number(b[k]) || fb;
        if (!Number.isInteger(v) || v < min || v > max) bad(`参数 ${k} 无效`);
        return v;
      };
      const s = (k: string, max: number) => {
        const v = String(b[k] ?? "");
        if (v.length > max) bad(`参数 ${k} 无效`);
        return v;
      };
      return {
        year: n("year", 2026, 1000, 3000), month: n("month", 1, 1, 12), day: n("day", 1, 1, 31),
        hour: n("hour", 0, 0, 23), minute: n("minute", 0, 0, 59),
        mode: s("mode", 20) || "time",
        numbers: s("numbers", 60),
        plusHour: b.plusHour === "1" || b.plusHour === true,
        yaosParam: s("yaos", 10),
        movingParam: b.moving === undefined || b.moving === null ? "" : s("moving", 3),
      };
    },
    run: (q) => {
      let lunar: { m: number; d: number };
      try {
        const l = Solar.fromYmd(q.year, q.month, q.day).getLunar();
        lunar = { m: Math.abs(l.getMonth()), d: l.getDay() };
      } catch {
        lunar = { m: q.month, d: q.day };
      }
      return computeMeihua({
        year: q.year, month: q.month, day: q.day, hour: q.hour, minute: q.minute,
        mode: q.mode, numbers: q.numbers, plusHour: q.plusHour, yaos: q.yaosParam, moving: q.movingParam,
        lunarMonth: lunar.m, lunarDay: lunar.d,
      });
    },
  },

  /**
   * 奇门遁甲（转盘/飞盘）。请求体即结果页 buildInput() 的 QimenInput。
   * 计算走迁入的 qimen-adapter（原前端 computeQimenLocal），并已修 ★48（飞宫方式未传引擎）。
   */
  qimen: {
    parse: (b) => {
      const num = (k: string) => {
        const v = b[k];
        if (v === undefined || v === null || v === "") return undefined;
        const n = Number(v);
        if (!Number.isFinite(n)) bad(`参数 ${k} 无效`);
        return n;
      };
      const customJu = b.customJu ? String(b.customJu) : undefined;
      if (customJu && customJu.length > 10) bad("参数 customJu 无效");
      return {
        matter: String(b.matter ?? "").slice(0, 100),
        ...wallClockLoose(b),
        panMethod: b.panMethod === "fei" ? "fei" : "zhuan",
        flyMethod: b.flyMethod === "yangshun" ? "yangshun" : "yinyang",
        startMethod: oneOf(b, "startMethod", ["chaibu", "maoshan", "zhirun", "custom"] as const, "zhirun"),
        customJu,
        anganMethod: b.anganMethod === "zhishi" ? "zhishi" : "dipan",
        useTrueSolar: b.useTrueSolar === true || b.useTrueSolar === "true" || b.useTrueSolar === 1 || b.useTrueSolar === "1",
        // 与前端 buildInput 一致：0 视为未提供（`q.lng || undefined`），否则「开真太阳时但无经度」会按经度 0 修正
        lat: num("lat") || undefined,
        lng: num("lng") || undefined,
      } as const;
    },
    run: (input) => computeQimenLocal(input),
  },

  /**
   * 阴盘奇门（转盘拆补、暗干值使，中宫寄坤2）。请求体：墙上时间 + trueSolar/lng + juLabel（上局/下局覆盖，如「阳遁3局」）。
   * 与 yinpan/result.vue 迁移前的 baseDate + qr 两个 computed 逐字等价。
   */
  yinpan: {
    parse: (b) => {
      const juLabel = b.juLabel ? String(b.juLabel) : undefined;
      if (juLabel && !/^(阳遁|阴遁)[1-9]局$/.test(juLabel)) bad("参数 juLabel 无效");
      // 与前端 `Number(p.lng) || 115.42` 一致（缺省/0/非数都回落默认经度）
      const lng = Number(b.lng) || 115.42;
      if (lng < -180 || lng > 180) bad("参数 lng 无效");
      return {
        ...wallClock(b),
        trueSolar: b.trueSolar === true,
        lng,
        juLabel,
      };
    },
    run: (p) => {
      const clock = new Date(p.year, p.month - 1, p.day, p.hour, p.minute);
      const d = p.trueSolar ? trueSolarTime(clock, p.lng) : clock;
      return computeQimen(d, {
        panMethod: "zhuan",
        startMethod: p.juLabel ? "custom" : "chaibu",
        customJu: p.juLabel,
        anganMethod: "zhishi",
      });
    },
  },

  /**
   * 奇门穿壬。请求体即前端 payload（ys=用神 cys=自选用神 gr=贵人 nm=年命生肖）。
   * 与 chuanren/result.vue 迁移前 onLoad 逐字等价（年命不在十二生肖内即视为未填）。
   */
  chuanren: {
    parse: (b) => {
      const cys = b.cys === undefined || b.cys === null ? undefined : String(b.cys);
      if (cys && cys.length > 4) bad("参数 cys 无效");
      const nm = b.nm === undefined || b.nm === null ? undefined : String(b.nm);
      return {
        ...wallClockLoose(b),
        topic: String(b.topic ?? "").slice(0, 100),
        ys: b.ys === "month" ? "month" : b.ys === "custom" ? "custom" : "day",
        cys,
        gr: b.gr === "yang" ? "yang" : b.gr === "yin" ? "yin" : "auto",
        nianming: nm && (SHENGXIAO as readonly string[]).includes(nm) ? nm : undefined,
      } as const;
    },
    run: (p) =>
      paiChuanren({
        date: new Date(p.year, p.month - 1, p.day, p.hour, p.minute),
        yongshenType: p.ys,
        customYongshen: p.cys,
        guiren: p.gr,
        nianming: p.nianming as never,
        topic: p.topic || undefined,
      }),
  },

  /** 山向奇门：deg=山向度数 y=用事年份（与 shanxiang/result.vue 迁移前 onLoad 一致） */
  shanxiang: {
    parse: (b) => {
      const deg = Number(b.deg);
      const year = Number(b.y);
      if (!Number.isFinite(deg) || Math.abs(deg) > 1e6) bad("参数 deg 无效");
      if (!Number.isInteger(year) || year < 1 || year > 9999) bad("参数 y 无效");
      return { deg, year };
    },
    run: ({ deg, year }) => paiShanxiang(deg, year),
  },

  /**
   * 紫微斗数。请求体即前端 payload（y/m/d/hour/minute/gender/name/useTrueSolar/lng）+ nowYear（定流年与现行大限，取前端当年）。
   * 返回 { chart: toZiweiChart(...), adjusted: {hour, minute} }——原前端直接读 result.adjusted（Date），过 HTTP 会变字符串，改传时分。
   */
  ziwei: {
    parse: (b) => {
      const y = int(b, "y", 1000, 3000), m = int(b, "m", 1, 12), d = int(b, "d", 1, 31);
      if (d > new Date(Date.UTC(y, m, 0)).getUTCDate()) bad("参数 d 无效");
      const lng = typeof b.lng === "number" && Number.isFinite(b.lng) && Math.abs(b.lng) <= 180 ? b.lng : undefined;
      return {
        y, m, d,
        hour: int(b, "hour", 0, 23),
        minute: ((v) => (Number.isInteger(v) && v >= 0 && v <= 59 ? v : bad("参数 minute 无效")))(Number(b.minute) || 0),
        gender: b.gender === "女" ? "女" : "男",
        name: String(b.name || "未知").slice(0, 30),
        useTrueSolar: b.useTrueSolar === true,
        lng,
        nowYear: optInt(b, "nowYear", 1000, 3000) ?? new Date().getFullYear(),
      } as const;
    },
    run: (p) => {
      const result = computeZiwei({ year: p.y, month: p.m, day: p.d, hour: p.hour, minute: p.minute, gender: p.gender, useTrueSolar: p.useTrueSolar, lng: p.lng });
      const adj = result.adjusted;
      return { chart: toZiweiChart(result, p.name, p.y, p.nowYear), adjusted: { hour: adj.getHours(), minute: adj.getMinutes() } };
    },
  },

  /**
   * 八字合盘。请求体即前端 payload：{ scene, a: {name,gender,year,month,day,hour,minute}, b: {...} }。
   * 双方校验与 hepan/result.vue 迁移前 normPerson 一致（年份 1900–2100 等）。
   */
  hepan: {
    parse: (b) => {
      const scene = String(b.scene ?? "marriage");
      if (!HEPAN_SCENES.some((s) => s.key === scene)) bad("参数 scene 无效");
      const person = (raw: unknown, role: string) => {
        if (!raw || typeof raw !== "object") bad(`参数 ${role} 无效`);
        const p = raw as Body;
        return {
          name: String(p.name ?? "").slice(0, 30),
          gender: (p.gender === "女" ? "女" : "男") as "男" | "女",
          year: int(p, "year", 1900, 2100),
          month: int(p, "month", 1, 12),
          day: int(p, "day", 1, 31),
          hour: int(p, "hour", 0, 23),
          minute: int(p, "minute", 0, 59),
        };
      };
      return { scene, a: person(b.a, "a"), b: person(b.b, "b") };
    },
    run: (p) => computeHepan(p.scene, p.a, p.b),
  },

  /**
   * 七政四余。请求体：公历时刻（农历已由前端换算）+ gender + longitude/latitude（前端按城市查表后传入）。
   * 本命盘与流年推盘都用它（流年只是换时刻）。年份范围与 qizheng/result.vue 一致（1900–2100）。
   */
  qizheng: {
    parse: (b) => {
      const coord = (k: string, lim: number) => {
        const v = b[k];
        if (v === undefined || v === null) return undefined;
        const n = Number(v);
        if (!Number.isFinite(n) || Math.abs(n) > lim) bad(`参数 ${k} 无效`);
        return n;
      };
      return {
        ...wallClock({ ...b, year: int(b, "year", 1900, 2100) }),
        gender: (b.gender === "女" ? "女" : "男") as "男" | "女",
        longitude: coord("longitude", 180),
        latitude: coord("latitude", 90),
      };
    },
    run: (p) => computeQizheng(p),
  },

  /**
   * 姓名解析（xingming 结果页；起名详情页不带 birth 同样走这里）。
   * 与 pkg-paipan2/xingming/result.vue 迁移前 onLoad 等价：有合法生辰则排八字取生肖与农历（失败按无生辰），再 analyzeName。
   * 返回 { birth: { shengxiao, lunarDate } | null, detail }；星座与生辰文案由前端拼（纯展示）。
   */
  xingming: {
    parse: (b) => {
      const name = String(b.name ?? "").trim();
      if ([...name].length < 2 || [...name].length > 6) bad("参数 name 无效");
      return {
        name,
        gender: (b.gender === "女" ? "女" : "男") as "男" | "女",
        birth: parseBirth(b.birth),
        city: b.city ? String(b.city).slice(0, 20) : undefined,
      };
    },
    run: (p) => {
      let birth: { shengxiao: string; lunarDate: string } | null = null;
      if (p.birth) {
        try {
          const bazi = computeBazi({ name: "", gender: p.gender, ...p.birth, city: p.city, useTrueSolar: false });
          birth = { shengxiao: bazi.zodiac, lunarDate: bazi.lunarDate };
        } catch {
          birth = null;
        }
      }
      return { birth, detail: analyzeName({ fullName: p.name, gender: p.gender, shengxiao: birth?.shengxiao }) };
    },
  },

  /** 起名。请求体即 qiming 结果页 payload，映射与迁移前 onLoad 一致（缺生辰/姓氏即参数无效）。 */
  qiming: {
    parse: (b) => {
      const birth = parseBirth(b.birth);
      const surname = String(b.surname ?? "");
      if (!surname || [...surname].length > 2 || !birth) bad("参数 surname/birth 无效");
      const s = (k: string, max: number) => (b[k] ? String(b[k]).slice(0, max) : undefined);
      return {
        surname,
        gender: (b.gender === "女" ? "女" : "男") as "男" | "女",
        nameType: (b.nameType === "single" ? "single" : "double") as "single" | "double",
        style: oneOf(b, "style", ["classic", "steady", "fresh", "auspicious"] as const, "classic"),
        ...birth!,
        city: s("city", 20),
        fixChar: s("fixChar", 2),
        fixPosition: (b.fixPosition === "last" ? "last" : b.fixPosition === "middle" ? "middle" : undefined) as "last" | "middle" | undefined,
        blockChars: s("blockChars", 12),
        seed: s("seed", 64), // 选填：抽样种子（见 qiming-engine 的 QimingInput.seed）
      };
    },
    run: (qi) => generateNames(qi),
  },

  /**
   * 字典·查字：前端仍从 /zidian/lookup 取远端词条（拼音/繁体/释义），连同文字交这里做本地字段补全
   * （康熙笔画、五行、结构、数理、生肖宜忌、是否起名用字……这些判定只在服务端）。与 zidian-data.queryText 等价。
   */
  "zidian-text": {
    parse: (b) => {
      const text = [...String(b.text ?? "").replace(/[^一-鿿]/g, "")].slice(0, 8).join("");
      const raw = Array.isArray(b.remotes) ? (b.remotes as unknown[]).slice(0, 8) : [];
      const remotes: RemoteEntry[] = raw.map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        const s = (k: string, max: number) => String(o[k] ?? "").slice(0, max);
        return { char: s("char", 2), traditional: s("traditional", 4), pinyin: s("pinyin", 40), explanation: s("explanation", 2000) };
      });
      return { text, remotes };
    },
    run: ({ text, remotes }) => (text ? lookupText(text, remotes) : []),
  },

  /** 字典·选字广场筛选（与 zidian/index.vue 原 filterChars 调用等价；缺省项不参与筛选） */
  "zidian-plaza": {
    parse: (b) => {
      const s = (k: string) => (b[k] ? String(b[k]).slice(0, 8) : undefined);
      return { wuxing: s("wuxing"), luck: s("luck"), gender: s("gender"), structure: s("structure"), radical: s("radical") };
    },
    run: (opts) => filterChars(opts),
  },

  /** 字典·选字广场分面（结构/部首选项表，纯字库统计，前端缓存一次即可） */
  "zidian-facets": {
    parse: () => ({}),
    run: () => plazaFacets(),
  },

  /**
   * 阴盘命理奇门。请求体：出生时刻 + name/gender(male|female)/customJu/trueSolar/earlyZi/lng + juLabel（上局/下局覆盖）。
   * 与 yinpan-mingli/result.vue 迁移前 birthDate / qr / bz 三个 computed 逐字等价（qr、bz 各自出错为 null）。
   */
  "yinpan-mingli": {
    parse: (b) => {
      const juLabel = b.juLabel ? String(b.juLabel) : undefined;
      const customJu = String(b.customJu || "");
      for (const [k, v] of [["juLabel", juLabel], ["customJu", customJu]] as const) {
        if (v && !/^(阳遁|阴遁)[1-9]局$/.test(v)) bad(`参数 ${k} 无效`);
      }
      const lng = Number(b.lng) || 115.42;
      if (lng < -180 || lng > 180) bad("参数 lng 无效");
      return {
        ...wallClock(b),
        name: String(b.name || "").slice(0, 30),
        gender: (b.gender === "female" ? "female" : "male") as "male" | "female",
        customJu,
        trueSolar: b.trueSolar !== false,
        earlyZi: b.earlyZi === true,
        lng,
        juLabel,
      };
    },
    run: (p) => {
      const raw = new Date(p.year, p.month - 1, p.day, p.hour, p.minute);
      const d = p.trueSolar ? trueSolarTime(raw, p.lng) : raw;
      let qimen: unknown = null;
      try {
        const auto = mingliJu(d);
        const overrideLabel = p.juLabel || p.customJu || `${auto.isYang ? "阳遁" : "阴遁"}${auto.num}局`;
        qimen = computeQimen(d, { panMethod: "zhuan", startMethod: "custom", customJu: overrideLabel, anganMethod: "zhishi" });
      } catch {
        qimen = null;
      }
      let bazi: unknown = null;
      try {
        bazi = computeBazi({
          name: p.name, gender: p.gender as never,
          year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute,
          useTrueSolar: p.trueSolar, earlyZi: p.earlyZi,
        });
      } catch {
        bazi = null;
      }
      return { qimen, bazi };
    },
  },

  zhuge: {
    parse: (b) => {
      const input = typeof b.input === "string" ? b.input : "";
      if (!input.trim() || input.length > 20) bad("参数 input 无效");
      return { input };
    },
    run: ({ input }) => {
      const r = paiZhuge(input);
      return { ...r, verdict: zhugeVerdict(r) };
    },
  },
};
