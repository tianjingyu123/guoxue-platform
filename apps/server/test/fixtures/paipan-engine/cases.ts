/**
 * 排盘引擎金样 · 用例清单（生成端与核对端共用这一份，避免两边枚举不一致）
 *
 * 每个工具产出 [分组名, 请求体] 序列；按分组出 sha256 指纹。
 * 请求体 = 前端结果页收到的 payload 原样（去掉只用于本地记录的 ts），
 * 所以金样同时验证了「服务端入参映射」与「前端原映射」逐字等价。
 *
 * 只用纯 TS 语法（无 enum/namespace），Node 24 原生去类型与 ts-node 都能直接加载。
 */
export type Body = Record<string, unknown>

function daysOf(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

const TIME_HOURS = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]
const ZG = ["sizheng", "zhengyu"]

/**
 * 重引擎的日期网格（每次调用要重算整年节气表，单次 6–24 ms，逐日全枚举要跑数小时）。
 *
 * 为什么可以不逐日全扫：引擎是**逐字搬迁**的同一份代码，金样要抓的是**环境差异**（时区、JSON 往返、入参映射），
 * 这些是系统性的，不依赖日期的稀疏覆盖。唯一按日期分布的风险是**夏令时**（1986–1991 中国实行），
 * 所以这些年份与世纪边界、今年前后等关键年份**逐日全扫**，其余年份按固定间隔抽日。
 *   heavy   ：关键年逐日 × 13 时点；其余年每 7 天 × 5 时点（约 10.6 万次）
 *   heavier ：关键年逐日 × 7 时点；其余年每 14 天 × 5 时点（约 5.5 万次）
 *   heaviest：关键年逐日 × 5 时点；其余年每 14 天 × 3 时点（约 3.7 万次）
 */
const KEY_YEARS = new Set([1900, 1949, 1986, 1987, 1988, 1989, 1990, 1991, 2000, 2024, 2026, 2100])
const GRID = {
  heavy: { keyHours: TIME_HOURS, step: 7, hours: [0, 1, 11, 13, 23] },
  heavier: { keyHours: [0, 1, 5, 11, 13, 19, 23], step: 14, hours: [0, 1, 11, 13, 23] },
  heaviest: { keyHours: [0, 1, 11, 13, 23], step: 14, hours: [0, 12, 23] },
} as const
function* dateGrid(level: keyof typeof GRID): Generator<[number, number, number, number]> {
  const g = GRID[level]
  for (let y = 1900; y <= 2100; y++) {
    const key = KEY_YEARS.has(y)
    let doy = 0
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysOf(y, m); d++) {
      doy++
      if (!key && doy % g.step !== 1) continue
      for (const hour of key ? g.keyHours : g.hours) yield [y, m, d, hour]
    }
  }
}

/** 小成图：时间起卦全枚举 201 年；其余起卦方式对「卦 × 动爻 × 中宫」全枚举、日期取代表集 */
export function* xiaochengtu(): Generator<[string, Body]> {
  for (let y = 1900; y <= 2100; y++) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= daysOf(y, m); d++) {
        for (const hour of TIME_HOURS) for (const zg of ZG) {
          yield [`time:${y}`, { year: y, month: m, day: d, hour, minute: 0, m: "time", zg }]
        }
      }
    }
  }
  // 指定卦：8×8×6×2 = 768 组合 × 2000–2030 每月初一正午
  for (let y = 2000; y <= 2030; y++) {
    for (let m = 1; m <= 12; m++) {
      for (let u = 1; u <= 8; u++) for (let l = 1; l <= 8; l++) for (let dong = 1; dong <= 6; dong++) for (const zg of ZG) {
        yield [`manual:${y}`, { year: y, month: m, day: 1, hour: 12, minute: 0, m: "manual", zg, u, l, dong }]
      }
    }
  }
  for (let m = 1; m <= 12; m++) {
    for (let u = 1; u <= 8; u++) for (let l = 1; l <= 8; l++) for (let dong = 1; dong <= 6; dong++) for (const zg of ZG) {
      yield ["guaming", { year: 2026, month: m, day: 15, hour: 9, minute: 30, m: "guaming", zg, u, l, dong, topic: "卦名起卦" }]
    }
  }
  for (let m = 1; m <= 12; m++) {
    for (let n1 = 1; n1 <= 24; n1++) for (let n2 = 1; n2 <= 24; n2++) for (const zg of ZG) {
      yield ["number1", { year: 2026, month: m, day: 1, hour: 8, minute: 0, m: "number1", zg, n1, n2 }]
    }
  }
  for (const [month, day] of [[1, 1], [7, 1]]) {
    for (let n1 = 1; n1 <= 16; n1++) for (let n2 = 1; n2 <= 16; n2++) for (let n3 = 1; n3 <= 12; n3++) for (const zg of ZG) {
      yield ["number2", { year: 2026, month, day, hour: 16, minute: 0, m: "number2", zg, n1, n2, n3 }]
    }
  }
  for (let m = 1; m <= 12; m++) {
    for (let bits = 0; bits < 64; bits++) for (let dong = 1; dong <= 6; dong++) for (const zg of ZG) {
      const lines = bits.toString(2).padStart(6, "0")
      yield ["yao", { year: 2026, month: m, day: 10, hour: 20, minute: 15, m: "yao", zg, lines, dong }]
    }
  }
  // 边界：大数（取模）、缺时分（前端映射按 0 处理）
  for (const n of [25, 64, 99, 100, 101, 999, 12345]) {
    yield ["edge", { year: 2026, month: 9, day: 21, hour: 12, minute: 0, m: "number1", zg: "sizheng", n1: n, n2: n + 7 }]
  }
  yield ["edge", { year: 2026, month: 9, day: 21, m: "time", zg: "sizheng" }]
}

/** 用例生成所需的外部数据（由调用方加载后传入，免得本文件在 ESM/CJS 两种加载方式下各自找路径） */
export interface CaseCtx {
  /** 康熙笔画表 { 字: [笔画, 五行, 部首] }（packages/shared/src/paipan/data/kangxi-strokes.json） */
  kangxi: Record<string, [number, string, string]>
}

/**
 * 诸葛神数：表内全部字分别放在三个位置（逐字验证笔画查表）+ 数字字 1000 组合
 * + 各笔画尾数代表字的 1000 组合（覆盖全部签号与「000→384」「>384 循环减」）+ 非法输入。
 * 引擎抛错的用例以 { error: 原文 } 计入指纹 —— 错误提示也必须一致。
 */
export function* zhuge(ctx: CaseCtx): Generator<[string, Body]> {
  const chars = Object.keys(ctx.kangxi)
  for (const c of chars) yield ["pos1", { input: c + "天地" }]
  for (const c of chars) yield ["pos2", { input: "天" + c + "地" }]
  for (const c of chars) yield ["pos3", { input: "天地" + c }]
  const NUMS = "一二三四五六七八九十"
  for (const a of NUMS) for (const b of NUMS) for (const c of NUMS) yield ["nums", { input: a + b + c }]
  // 每个笔画尾数取表中第一个满足的常用汉字（基本区）
  const rep: string[] = []
  for (let d = 0; d <= 9; d++) {
    const hit = chars.find((c) => /^[一-鿿]$/u.test(c) && ctx.kangxi[c][0] % 10 === d && !NUMS.includes(c))
    if (hit) rep.push(hit)
  }
  for (const a of rep) for (const b of rep) for (const c of rep) yield ["digits", { input: a + b + c }]
  for (const bad of ["天地", "天地人和", "天 地", "ab天", "天地1", " 天地人 ", "〇天地"]) yield ["bad", { input: bad }]
}

/**
 * 五运六气：now 用 Date.UTC 构造（与进程时区无关——生成端 TZ=上海、核对端 TZ=UTC，必须同一批时刻）。
 * 「当令」判定是瞬时比较，逐日扫当年 + 次年 1 月（终之气跨年到大寒）。
 */
export function* wuyunliuqi(): Generator<[string, Body]> {
  const noonBJ = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 4, 0, 0)
  for (let y = 1900; y <= 2100; y++) {
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysOf(y, m); d++) {
      yield [`now:${y}`, { year: y, now: noonBJ(y, m, d) }]
    }
    for (let d = 1; d <= 31; d++) yield [`next-jan:${y}`, { year: y, now: noonBJ(y + 1, 1, d) }]
  }
  for (let y = 1000; y <= 3000; y++) yield ["years", { year: y, now: noonBJ(2026, 9, 21) }]
}

/** 飞宫小奇门：时辰起局 201 年逐日 × 13 时点；报数/随机起局 1–30 × 代表日期 */
export function* feigong(): Generator<[string, Body]> {
  for (const [y, m, d, hour] of dateGrid("heavy")) {
    {
      yield [`hour:${y}`, { topic: "", year: y, month: m, day: d, hour, minute: 0, m: "hour" }]
    }
  }
  for (let y = 2000; y <= 2030; y++) for (let m = 1; m <= 12; m++) for (let n = 1; n <= 30; n++) {
    yield [`number:${y}`, { year: y, month: m, day: 5, hour: 10, minute: 20, m: "number", n }]
    yield [`random:${y}`, { year: y, month: m, day: 20, hour: 22, minute: 40, m: "random", n: ((n - 1) % 12) + 1 }]
  }
  // 节气交接的分钟级边界：2026 立春 02-04 04:02 前后
  for (let mi = 0; mi <= 59; mi++) for (const hour of [3, 4]) {
    yield ["lichun-edge", { year: 2026, month: 2, day: 4, hour, minute: mi, m: "hour" }]
  }
}

const ZHI12 = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

/**
 * 金口诀：201 年逐日 × 13 时点（地分/换将/口诀/昼夜按日时轮换，保证各组合都铺开）；
 * 代表日期上 12 地分 × 2 换将 × 2 口诀 × 3 昼夜 全组合；报数；
 * 以及冬至后十天（曾出过「只取当日年表漏当年冬至、月将错一位」）逐时。
 */
export function* jinkoujue(): Generator<[string, Body]> {
  const GT = ["auto", "day", "night"]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heavy")) {
    {
      k++
      yield [`time:${y}`, {
        topic: "", year: y, month: m, day: d, hour, minute: 0,
        dm: k % 5 === 0 ? "random" : "manual", dz: ZHI12[k % 12],
        jm: k % 2 ? "zhong" : "jie", gs: (k >> 1) % 2 ? "B" : "A", gt: GT[k % 3],
      }]
    }
  }
  for (let m = 1; m <= 12; m++) for (const day of [1, 15]) for (const hour of TIME_HOURS) {
    for (const dz of ZHI12) for (const jm of ["jie", "zhong"]) for (const gs of ["A", "B"]) for (const gt of GT) {
      yield ["combo", { year: 2026, month: m, day, hour, minute: 30, dm: "manual", dz, jm, gs, gt }]
    }
  }
  for (let dn = 1; dn <= 40; dn++) for (const hour of [0, 11, 23]) {
    yield ["number", { year: 2026, month: 9, day: 21, hour, minute: 0, dm: "number", dn, jm: "zhong", gs: "A", gt: "auto" }]
  }
  for (let y = 1990; y <= 2030; y++) for (let d = 18; d <= 31; d++) for (let hour = 0; hour < 24; hour++) {
    yield [`dongzhi:${y}`, { year: y, month: 12, day: d, hour, minute: 0, dm: "manual", dz: "子", jm: "zhong", gs: "A", gt: "auto" }]
  }
}

/** 小六壬：三流派 × 201 年逐日 × 13 时点（时间起课）；报数起课 1–3 个数的组合 */
export function* xiaoliuren(): Generator<[string, Body]> {
  // 2026-09-21：原为 201 年逐日 × 13 时点（约 95 万次，单进程跑 40 分钟以上仍未完），改用 heavy 网格，理由见 dateGrid 注释
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heavy")) {
    k++
    yield [`time:${y}`, { year: y, month: m, day: d, hour, minute: 0, school: ["daojia", "jiangshi", "jiangshi2"][k % 3] }]
  }
  for (const school of ["daojia", "jiangshi", "jiangshi2"]) {
    for (let a = 1; a <= 12; a++) {
      yield ["num1", { year: 2026, month: 9, day: 21, hour: 10, minute: 0, school, numbers: [a] }]
      for (let b = 1; b <= 12; b++) {
        yield ["num2", { year: 2026, month: 9, day: 21, hour: 10, minute: 0, school, numbers: [a, b] }]
        for (let c = 1; c <= 12; c++) yield ["num3", { year: 2026, month: 3, day: 1, hour: 22, minute: 0, school, numbers: [a, b, c] }]
      }
    }
    for (const n of [13, 99, 100, 12345]) yield ["numbig", { year: 2026, month: 9, day: 21, hour: 10, minute: 0, school, numbers: [n, n + 1, n + 2] }]
  }
}

/** 大六壬：201 年逐日 × 13 时点（选项按日时轮换）；代表日期上全选项组合；翻时辰 −6…+6 */
export function* daliuren(): Generator<[string, Body]> {
  const GT = ["auto", "day", "night"]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heavier")) {
    {
      k++
      yield [`time:${y}`, {
        matter: "", year: y, month: m, day: d, hour, minute: 0,
        birthYear: k % 4 === 0 ? 1960 + (k % 50) : 0, gender: k % 2 ? "男" : "女",
        jiangMethod: k % 2 ? "zhongqi" : "jiaojie", guirenMethod: (k >> 1) % 2 ? "alt" : "standard",
        guishenType: GT[k % 3], shehaiType: (k >> 2) % 2 ? "shenqian" : "mengzhongji",
      }]
    }
  }
  for (let m = 1; m <= 12; m++) for (const hour of TIME_HOURS) {
    for (const jiangMethod of ["zhongqi", "jiaojie"]) for (const guirenMethod of ["standard", "alt"]) for (const guishenType of GT)
      for (const shehaiType of ["mengzhongji", "shenqian"]) for (const gender of ["男", "女"]) for (const birthYear of [0, 1990]) {
        yield ["combo", { year: 2026, month: m, day: 10, hour, minute: 15, jiangMethod, guirenMethod, guishenType, shehaiType, gender, birthYear }]
      }
  }
  for (let off = -6; off <= 6; off++) for (const [month, day] of [[1, 1], [2, 4], [12, 31], [3, 31]]) for (const hour of [0, 1, 23]) {
    yield ["offset", { year: 2026, month, day, hour, minute: 30, hourOffset: off, jiangMethod: "zhongqi" }]
  }
}

/** 六爻：时间起卦 heavy 网格；铜钱六爻 4^6 全组合；卦名 8^4；数字起卦；兜底（缺参） */
export function* liuyao(): Generator<[string, Body]> {
  // 2026-09-21：原为 201 年逐日 × 13 时点（约 95 万次），改用 heavy 网格，理由见 dateGrid 注释
  for (const [y, m, d, hour] of dateGrid("heavy")) {
    yield [`time:${y}`, { matter: "", year: y, month: m, day: d, hour, minute: 0, methodKey: "time" }]
  }
  const C = [6, 7, 8, 9]
  for (let i = 0; i < 4096; i++) {
    const coins = [0, 1, 2, 3, 4, 5].map((k) => C[(i >> (2 * k)) & 3]).join(",")
    yield ["coins", { year: 2026, month: 1 + (i % 12), day: 1 + (i % 28), hour: i % 24, minute: 0, methodKey: i % 2 ? "coin" : "auto", coins }]
  }
  const G = ["乾卦 ☰", "兑卦 ☱", "离卦 ☲", "震卦 ☳", "巽卦 ☴", "坎卦 ☵", "艮卦 ☶", "坤卦 ☷"]
  for (const a of G) for (const b of G) for (const c of G) for (const d of G) {
    yield ["guaname", { year: 2026, month: 9, day: 21, hour: 10, minute: 0, methodKey: "guaname", guaPick: { benUp: a, benDown: b, bianUp: c, bianDown: d } }]
  }
  for (let n = 1; n <= 200; n++) for (const methodKey of ["number1", "number2"]) {
    yield ["number", { year: 2026, month: 9, day: 21, hour: n % 24, minute: 0, methodKey, numberInput: methodKey === "number1" ? String(n) : `${n} ${n * 7 % 97} ${n % 13}` }]
  }
  for (const methodKey of ["coin", "number1", "number2", "guaname", "manual"]) {
    yield ["fallback", { year: 2026, month: 9, day: 21, hour: 10, minute: 0, methodKey }]
  }
}

/** 梅花：时间/自动起卦 201 年逐日 × 13 时点；手动 64 卦 × 7 种动爻；数字起卦（含加时辰） */
export function* meihua(): Generator<[string, Body]> {
  for (let y = 1900; y <= 2100; y++) {
    let k = 0
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysOf(y, m); d++) for (const hour of TIME_HOURS) {
      k++
      yield [`time:${y}`, { matter: "", year: y, month: m, day: d, hour, minute: k % 60, mode: k % 7 === 0 ? "auto" : "time" }]
    }
  }
  for (let bits = 0; bits < 64; bits++) for (let mv = -1; mv < 6; mv++) {
    const yaos = bits.toString(2).padStart(6, "0")
    const body: Body = { year: 2026, month: 9, day: 21, hour: 10, minute: 0, mode: "manual", yaos }
    if (mv >= 0) body.moving = String(mv)
    yield ["manual", body]
  }
  for (let n = 0; n <= 999; n++) for (const plusHour of ["0", "1"]) {
    yield ["number2", { year: 2026, month: 9, day: 21, hour: n % 24, minute: 0, mode: "number2", numbers: String(n).padStart(3, "0"), plusHour }]
  }
  for (let n = 1; n <= 3000; n += 7) for (const plusHour of ["0", "1"]) {
    yield ["number1", { year: 2026, month: 5, day: 5, hour: n % 24, minute: 0, mode: "number1", numbers: String(n * 13), plusHour }]
  }
  // 归一化兜底：缺字段 / 未知模式
  yield ["edge", {}]
  yield ["edge", { year: 2026, month: 9, day: 21, mode: "unknown" }]
  yield ["edge", { year: 2026, month: 9, day: 21, mode: "number1" }]
  yield ["edge", { year: 2026, month: 9, day: 21, mode: "manual", yaos: "10101" }]
}

/**
 * 奇门：201 年逐日 × 13 时点（转/飞盘、起局法、暗干法按日时轮换）；自选局 18 局 × 两盘 × 两暗干；真太阳时经度样本。
 * 飞宫方式一律 yinyang —— ★48 修复只改变「飞盘 + 阳顺阴逆」，该组合迁移前后本就应当不同，另由专门测试守。
 */
export function* qimen(): Generator<[string, Body]> {
  const SM = ["chaibu", "maoshan", "zhirun"]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heaviest")) {
    {
      k++
      yield [`time:${y}`, {
        matter: "", year: y, month: m, day: d, hour, minute: 0,
        panMethod: k % 2 ? "zhuan" : "fei", flyMethod: "yinyang", startMethod: SM[k % 3],
        anganMethod: (k >> 1) % 2 ? "zhishi" : "dipan", useTrueSolar: false, lat: 0, lng: 0,
      }]
    }
  }
  for (const yy of ["阳遁", "阴遁"]) for (let n = 1; n <= 9; n++) for (const panMethod of ["zhuan", "fei"]) for (const anganMethod of ["zhishi", "dipan"]) {
    for (const hour of TIME_HOURS) {
      yield ["custom", { year: 2026, month: 9, day: 21, hour, minute: 10, panMethod, flyMethod: "yinyang", startMethod: "custom", customJu: `${yy}${n}局`, anganMethod }]
    }
  }
  for (const lng of [73.5, 87.6, 104.1, 116.4, 121.5, 126.6, 135]) for (let m = 1; m <= 12; m++) for (const hour of [0, 6, 12, 18, 23]) {
    yield ["truesolar", { year: 2026, month: m, day: 15, hour, minute: 30, panMethod: m % 2 ? "zhuan" : "fei", flyMethod: "yinyang", startMethod: "zhirun", anganMethod: "dipan", useTrueSolar: true, lat: 30, lng }]
  }
}

/** 阴盘：201 年逐日 × 13 时点（每 5 个开真太阳时）；18 局覆盖 × 13 时点 × 两天 */
export function* yinpan(): Generator<[string, Body]> {
  const LNG = [87.6, 104.1, 115.42, 121.5, 126.6]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heavier")) {
    {
      k++
      yield [`time:${y}`, { year: y, month: m, day: d, hour, minute: 0, trueSolar: k % 5 === 0, lng: LNG[k % 5] }]
    }
  }
  for (const yy of ["阳遁", "阴遁"]) for (let n = 1; n <= 9; n++) for (const day of [1, 21]) for (const hour of TIME_HOURS) {
    yield ["override", { year: 2026, month: 9, day, hour, minute: 0, trueSolar: false, lng: 115.42, juLabel: `${yy}${n}局` }]
  }
}

/** 奇门穿壬：201 年逐日 × 13 时点（用神/贵人/年命轮换）；自选用神十干 × 贵人三种 */
export function* chuanren(): Generator<[string, Body]> {
  const SX = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]
  const GAN10 = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heaviest")) {
    {
      k++
      yield [`time:${y}`, {
        topic: "", year: y, month: m, day: d, hour, minute: 0,
        ys: k % 3 === 0 ? "month" : "day", gr: ["auto", "yang", "yin"][k % 3],
        nm: k % 4 === 0 ? SX[k % 12] : undefined,
      }]
    }
  }
  for (const cys of GAN10) for (const gr of ["auto", "yang", "yin"]) for (const hour of TIME_HOURS) {
    yield ["custom", { year: 2026, month: 9, day: 21, hour, minute: 0, ys: "custom", cys, gr, nm: "马" }]
  }
  yield ["edge", { year: 2026, month: 9, day: 21, hour: 10, minute: 0, nm: "麒麟" }]
}

/** 山向奇门：0–359.5° 每半度 × 1900–2100 每年；山界两侧 ±0.01° */
export function* shanxiang(): Generator<[string, Body]> {
  for (let y = 1900; y <= 2100; y++) for (let t = 0; t < 720; t++) yield [`deg:${y}`, { deg: t / 2, y, name: "" }]
  for (let k = 0; k < 24; k++) for (const e of [-0.01, 0, 0.01]) {
    const deg = ((k * 15 + 7.5 + e) + 360) % 360
    yield ["edge", { deg, y: 2026 }]
  }
  for (const deg of [-15, 360, 375.5, 720]) yield ["edge", { deg, y: 2026 }]
}

/** 紫微：日期网格（男女轮换，每 5 个开真太阳时）；nowYear 固定 2026（定流年/大限，前端传当年） */
export function* ziwei(): Generator<[string, Body]> {
  const LNG = [87.6, 104.1, 116.4, 121.5, 126.6]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heavy")) {
    k++
    yield [`time:${y}`, {
      y, m, d, hour, minute: (k * 7) % 60, gender: k % 2 ? "男" : "女", name: "测试",
      useTrueSolar: k % 5 === 0, lng: LNG[k % 5], nowYear: 2026,
    }]
  }
  for (const nowYear of [2000, 2026, 2050]) for (let y = 1930; y <= 2020; y += 3) {
    yield ["nowyear", { y, m: 6, d: 15, hour: 9, minute: 0, gender: "男", name: "流年", nowYear }]
  }
}

/** 八字合盘：四场景 × 甲方日期网格对乙方轮换生辰（男女与同性组合都覆盖） */
export function* hepan(): Generator<[string, Body]> {
  const SC = ["marriage", "business", "parent", "friend"]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heavier")) {
    k++
    const by = 1950 + (k % 70), bm = 1 + (k % 12), bd = 1 + (k % 28), bh = (k * 5) % 24
    yield [`time:${y}`, {
      scene: SC[k % 4],
      a: { name: "甲", gender: k % 3 === 0 ? "女" : "男", year: y, month: m, day: d, hour, minute: 0 },
      b: { name: "乙", gender: k % 2 ? "女" : "男", year: by, month: bm, day: bd, hour: bh, minute: 30 },
    }]
  }
}

/** 七政四余：日期网格 × 男女 × 城市经纬度样本（含未给经纬度） */
export function* qizheng(): Generator<[string, Body]> {
  const CITY: [number | undefined, number | undefined][] = [[116.41, 39.9], [121.47, 31.23], [87.62, 43.83], [113.26, 23.13], [126.64, 45.76], [undefined, undefined]]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heaviest")) {
    k++
    const [longitude, latitude] = CITY[k % CITY.length]
    yield [`time:${y}`, { year: y, month: m, day: d, hour, minute: (k * 11) % 60, gender: k % 2 ? "男" : "女", longitude, latitude }]
  }
}

const SURNAMES = ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周", "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗", "郑", "梁", "谢", "宋", "唐", "许", "韩", "冯", "邓", "曹"]
const COMPOUND = ["欧阳", "司马", "诸葛", "上官", "东方"]

/** 从康熙表均匀抽取基本区汉字（笔画>0），保证覆盖各笔画/各部首 */
function spreadChars(ctx: CaseCtx, n: number): string[] {
  const all = Object.keys(ctx.kangxi).filter((c) => /^[一-鿿]$/u.test(c) && Number(ctx.kangxi[c][0]) > 0)
  const step = Math.max(1, Math.floor(all.length / n))
  return Array.from({ length: n }, (_, i) => all[(i * step) % all.length])
}

/** 姓名解析：姓 × 单字名 / 双字名（表内均匀抽样）；复姓；十二生肖（经生辰）；无生辰；非法生辰串 */
export function* xingming(ctx: CaseCtx): Generator<[string, Body]> {
  const pool = spreadChars(ctx, 400)
  const small = pool.filter((_, i) => i % 7 === 0).slice(0, 50)
  for (const s of SURNAMES) for (const c of pool) yield ["single", { name: s + c, gender: c.charCodeAt(0) % 2 ? "男" : "女" }]
  for (const s of SURNAMES.slice(0, 8)) for (const a of small) for (const b of small) yield ["double", { name: s + a + b, gender: "男" }]
  for (const s of COMPOUND) for (const c of pool.slice(0, 100)) yield ["compound", { name: s + c, gender: "女" }]
  for (let y = 1990; y < 2002; y++) for (const n of ["王小明", "李华", "欧阳娜娜", "陈思远"]) {
    yield ["birth", { name: n, gender: "男", birth: `${y}-02-0${(y % 5) + 1} 10:30`, city: y % 2 ? "北京" : "" }]
  }
  for (const birth of ["", "2026-13-01 10:00", "abc", "2026-2-4 4:2"]) yield ["birth-edge", { name: "张伟", gender: "男", birth }]
}

/** 起名：姓 × 性别 × 单双名 × 四风格 × 生辰样本；定字（中/末）与避讳字 */
export function* qiming(): Generator<[string, Body]> {
  const BIRTHS = ["2026-03-05 09:00", "2025-11-20 23:30", "2024-02-04 04:10", "1990-07-15 12:00"]
  for (const surname of SURNAMES.slice(0, 8)) for (const gender of ["男", "女"]) for (const nameType of ["double", "single"])
    for (const style of ["classic", "steady", "fresh", "auspicious"]) for (const birth of BIRTHS) {
      yield ["grid", { surname, gender, nameType, style, birth }]
    }
  for (const fixChar of ["子", "文", "宇", "婷", "浩"]) for (const fixPosition of ["middle", "last"]) for (const surname of ["王", "李", "欧阳"]) {
    yield ["fix", { surname, gender: "男", nameType: "double", style: "classic", birth: "2026-03-05 09:00", fixChar, fixPosition }]
  }
  for (const blockChars of ["子文宇", "浩然", "明"]) yield ["block", { surname: "张", gender: "女", nameType: "double", style: "fresh", birth: "2026-06-01 08:00", blockChars }]
}

/** 字典·查字：表内均匀抽 600 字单查 + 三字/八字串 + 带远端词条（拼音/繁体/释义覆盖本地）+ 非汉字 */
export function* zidianText(ctx: CaseCtx): Generator<[string, Body]> {
  const pool = spreadChars(ctx, 600)
  for (const c of pool) yield ["single", { text: c, remotes: [] }]
  for (let i = 0; i + 3 <= pool.length; i += 3) yield ["triple", { text: pool.slice(i, i + 3).join(""), remotes: [] }]
  for (let i = 0; i + 8 <= 160; i += 8) yield ["eight", { text: "张" + pool.slice(i, i + 9).join("") + "abc", remotes: [] }]
  for (const c of pool.slice(0, 60)) {
    yield ["remote", { text: c + "明", remotes: [{ char: c, traditional: c, pinyin: "cè shì", explanation: "测试释义：" + c }] }]
  }
  for (const text of ["", "abc", "123", "🙂", "一二三四五六七八九十"]) yield ["edge", { text, remotes: [] }]
}

/** 字典·选字广场：单维筛选（五行/吉凶/性别/结构/部首）与五行×吉凶×性别组合 */
export function* zidianPlaza(): Generator<[string, Body]> {
  const WX = ["金", "木", "水", "火", "土"], LUCK = ["吉", "凶", "半吉"], GENDER = ["男", "女"]
  const STRUCT = ["L", "T", "ETL", "EBL", "E", "S", "L3", "T3", "ET", "ETR", "EL", "EB", "O"]
  const RAD = ["氵", "木", "口", "扌", "艹", "亻", "女", "心", "钅", "火", "土", "日", "月", "王", "石", "禾", "纟", "讠", "贝", "山", "宀", "辶"]
  yield ["none", {}]
  for (const wuxing of WX) yield ["single", { wuxing }]
  for (const luck of LUCK) yield ["single", { luck }]
  for (const gender of GENDER) yield ["single", { gender }]
  for (const structure of STRUCT) yield ["single", { structure }]
  for (const radical of RAD) yield ["single", { radical }]
  for (const wuxing of WX) for (const luck of LUCK) for (const gender of GENDER) yield ["combo", { wuxing, luck, gender }]
  for (const structure of STRUCT.slice(0, 4)) for (const radical of RAD.slice(0, 6)) yield ["combo2", { structure, radical }]
}

/** 阴盘命理：日期网格（男女、真太阳时、早晚子轮换）；18 局覆盖；指定局 */
export function* yinpanMingli(): Generator<[string, Body]> {
  const LNG = [87.6, 104.1, 115.42, 121.5, 126.6]
  let k = 0
  for (const [y, m, d, hour] of dateGrid("heaviest")) {
    k++
    yield [`time:${y}`, {
      name: "测", gender: k % 2 ? "male" : "female", year: y, month: m, day: d, hour, minute: (k * 13) % 60,
      trueSolar: k % 3 !== 0, earlyZi: k % 4 === 0, lng: LNG[k % 5],
    }]
  }
  for (const yy of ["阳遁", "阴遁"]) for (let n = 1; n <= 9; n++) for (const hour of [0, 11, 23]) {
    yield ["override", { gender: "male", year: 1990, month: 5, day: 20, hour, minute: 0, trueSolar: false, juLabel: `${yy}${n}局` }]
    yield ["custom", { gender: "female", year: 1995, month: 11, day: 3, hour, minute: 30, trueSolar: true, lng: 121.5, customJu: `${yy}${n}局` }]
  }
}

/** 字典·分面统计（无入参，一次即可） */
export function* zidianFacets(): Generator<[string, Body]> {
  yield ["facets", {}]
}

export const CASES: Record<string, (ctx: CaseCtx) => Generator<[string, Body]>> = {
  xiaochengtu, zhuge, wuyunliuqi, feigong, jinkoujue, xiaoliuren, daliuren, liuyao, meihua, qimen, yinpan, chuanren, shanxiang, ziwei, hepan, qizheng, xingming, qiming,
  "zidian-text": zidianText, "zidian-plaza": zidianPlaza, "zidian-facets": zidianFacets,
  "yinpan-mingli": yinpanMingli,
}
