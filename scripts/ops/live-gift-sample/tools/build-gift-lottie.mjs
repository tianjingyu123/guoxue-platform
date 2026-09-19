/**
 * 自制礼物 Lottie 素材生成器（热卜国学 · 直播礼物样例）
 *
 * 所有图形由本脚本按几何参数生成，不引用任何第三方素材库、不复制商业平台设计。
 * 配色只取项目既有令牌：珠宝金 #C9A96E / #D4B87D、故宫红 #C41E3A、宣纸白 #F2EDE4。
 *
 * 美术定位：技术验证级矢量小样，用于验证播放器、队列与降级链路。
 * 不是商用美术成品，正式上线需由美术重做。
 *
 * 用法：node tools/build-gift-lottie.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'assets')

const FPS = 30
const W = 750
const H = 750
const CX = W / 2
const CY = H / 2

// 项目令牌 → Lottie 归一化 RGB
const GOLD = rgb('#C9A96E')
const GOLD_SOFT = rgb('#D4B87D')
const RED = rgb('#C41E3A')
const PAPER = rgb('#F2EDE4')

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]
}

/** 静态值 */
const k = (v) => ({ a: 0, k: v })
/** 关键帧值：frames = [[帧号, 值], ...] */
function kf(frames) {
  const keys = frames.map(([t, v], i) => {
    const key = { t, s: Array.isArray(v) ? v : [v] }
    if (i < frames.length - 1) {
      key.i = { x: [0.3], y: [1] }
      key.o = { x: [0.5], y: [0] }
    }
    return key
  })
  return { a: 1, k: keys }
}

const transform = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) => ({
  ty: 'tr',
  p: Array.isArray(p) ? k(p) : p,
  a: k(a),
  s: Array.isArray(s) ? k(s) : s,
  r: typeof r === 'number' ? k(r) : r,
  o: typeof o === 'number' ? k(o) : o,
  nm: 'transform',
})

const stroke = (color, width, opacity = 100) => ({
  ty: 'st',
  c: k(color),
  o: typeof opacity === 'number' ? k(opacity) : opacity,
  w: typeof width === 'number' ? k(width) : width,
  lc: 2,
  lj: 2,
  nm: 'stroke',
})

const fill = (color, opacity = 100) => ({
  ty: 'fl',
  c: k(color),
  o: typeof opacity === 'number' ? k(opacity) : opacity,
  r: 1,
  nm: 'fill',
})

const ellipse = (size) => ({ ty: 'el', p: k([0, 0]), s: k([size, size]), nm: 'ellipse' })

const star = ({ points, outer, inner, roundness = 0 }) => ({
  ty: 'sr',
  sy: 1,
  pt: k(points),
  p: k([0, 0]),
  r: k(0),
  or: k(outer),
  ir: k(inner),
  os: k(roundness),
  is: k(roundness),
  nm: 'star',
})

/** 描边按比例绘出（环形展开） */
const trim = (endFrames, offset = 0) => ({
  ty: 'tm',
  s: k(0),
  e: kf(endFrames),
  o: k(offset),
  m: 1,
  nm: 'trim',
})

function shapeLayer({ ind, nm, shapes, ks = {}, ip = 0, op }) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm,
    sr: 1,
    ks: {
      o: ks.o ?? k(100),
      r: ks.r ?? k(0),
      p: ks.p ?? k([CX, CY, 0]),
      a: k([0, 0, 0]),
      s: ks.s ?? k([100, 100, 100]),
    },
    ao: 0,
    shapes,
    ip,
    op,
    st: 0,
    bm: 0,
  }
}

function group(items, nm, tr) {
  return { ty: 'gr', it: [...items, tr ?? transform()], nm }
}

function doc({ nm, op, layers }) {
  return { v: '5.7.4', fr: FPS, ip: 0, op, w: W, h: H, nm, ddd: 0, assets: [], layers }
}

// ───────────────────────────────────────────────────────────
// 紫微星耀（L3，1888 币）：星轨展开 → 中心八角星定星 → 周天小星点亮
// 总时长 120 帧 / 30fps = 4.0 秒
// ───────────────────────────────────────────────────────────
function ziweiStar() {
  const OP = 120
  const layers = []
  let ind = 1

  // 周天八星：沿半径 250 均布，逐颗点亮后回落
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
    const x = CX + Math.cos(angle) * 250
    const y = CY + Math.sin(angle) * 250
    const start = 34 + i * 4
    layers.push(
      shapeLayer({
        ind: ind++,
        nm: `周天星-${i + 1}`,
        ks: {
          p: k([x, y, 0]),
          o: kf([[start, 0], [start + 8, 100], [start + 46, 100], [start + 62, 0]]),
          s: kf([[start, [0, 0, 100]], [start + 10, [118, 118, 100]], [start + 20, [100, 100, 100]]]),
          r: kf([[start, 0], [OP, 90]]),
        },
        shapes: [group([star({ points: 4, outer: 34, inner: 7 }), fill(GOLD_SOFT)], `star-${i}`)],
        ip: start,
        op: OP,
      }),
    )
  }

  // 中心八角主星
  layers.push(
    shapeLayer({
      ind: ind++,
      nm: '主星',
      ks: {
        o: kf([[28, 0], [40, 100], [92, 100], [116, 0]]),
        s: kf([[28, [0, 0, 100]], [44, [116, 116, 100]], [56, [100, 100, 100]], [116, [112, 112, 100]]]),
        r: kf([[28, -30], [OP, 20]]),
      },
      shapes: [
        group([star({ points: 8, outer: 128, inner: 46 }), fill(GOLD)], 'core'),
        group([star({ points: 8, outer: 128, inner: 46 }), stroke(PAPER, 3, 70)], 'core-edge'),
      ],
      ip: 28,
      op: OP,
    }),
  )

  // 内环：反向细环
  layers.push(
    shapeLayer({
      ind: ind++,
      nm: '内环',
      ks: {
        o: kf([[18, 0], [32, 90], [96, 90], [118, 0]]),
        r: kf([[18, 40], [OP, -50]]),
      },
      shapes: [group([ellipse(380), trim([[18, 0], [52, 100]]), stroke(GOLD_SOFT, 4, 80)], 'inner-ring')],
      ip: 18,
      op: OP,
    }),
  )

  // 外环：星轨描绘
  layers.push(
    shapeLayer({
      ind: ind++,
      nm: '星轨',
      ks: {
        o: kf([[0, 0], [12, 100], [96, 100], [118, 0]]),
        r: kf([[0, -20], [OP, 46]]),
        s: kf([[0, [86, 86, 100]], [26, [100, 100, 100]], [OP, [106, 106, 100]]]),
      },
      shapes: [group([ellipse(560), trim([[0, 0], [36, 100]], -25), stroke(GOLD, 7)], 'outer-ring')],
      ip: 0,
      op: OP,
    }),
  )

  // 底光
  layers.push(
    shapeLayer({
      ind: ind++,
      nm: '底光',
      ks: {
        o: kf([[0, 0], [30, 42], [90, 30], [118, 0]]),
        s: kf([[0, [40, 40, 100]], [40, [104, 104, 100]], [OP, [124, 124, 100]]]),
      },
      shapes: [group([ellipse(620), fill(GOLD, 26)], 'glow')],
      ip: 0,
      op: OP,
    }),
  )

  return doc({ nm: '紫微星耀', op: OP, layers })
}

// ───────────────────────────────────────────────────────────
// 金龙献瑞（L3，520 币）：三重盘龙弧线顺次盘旋 → 龙珠升起
// 总时长 105 帧 / 30fps = 3.5 秒
// ───────────────────────────────────────────────────────────
function goldenDragon() {
  const OP = 105
  const layers = []
  let ind = 1

  // 龙珠
  layers.push(
    shapeLayer({
      ind: ind++,
      nm: '龙珠',
      ks: {
        o: kf([[30, 0], [44, 100], [82, 100], [102, 0]]),
        s: kf([[30, [0, 0, 100]], [46, [120, 120, 100]], [58, [100, 100, 100]], [OP, [108, 108, 100]]]),
      },
      shapes: [
        group([ellipse(120), fill(RED)], 'pearl'),
        group([ellipse(120), stroke(GOLD_SOFT, 6)], 'pearl-edge'),
        group([ellipse(46), fill(PAPER, 58)], 'pearl-hi', transform({ p: [-22, -24] })),
      ],
      ip: 30,
      op: OP,
    }),
  )

  // 三重盘龙弧：不同半径、不同起相、反向旋转
  const arcs = [
    { size: 300, width: 16, offset: 0, dir: 1, start: 0 },
    { size: 430, width: 11, offset: 120, dir: -1, start: 8 },
    { size: 560, width: 7, offset: 240, dir: 1, start: 16 },
  ]
  arcs.forEach((arc, i) => {
    layers.push(
      shapeLayer({
        ind: ind++,
        nm: `盘龙弧-${i + 1}`,
        ks: {
          o: kf([[arc.start, 0], [arc.start + 12, 100], [80, 100], [100, 0]]),
          r: kf([[arc.start, arc.dir * -40], [OP, arc.dir * 130]]),
          s: kf([[arc.start, [78, 78, 100]], [arc.start + 24, [100, 100, 100]], [OP, [110, 110, 100]]]),
        },
        shapes: [
          group(
            [
              ellipse(arc.size),
              // 只画 42% 弧段，形成龙身而非闭环
              { ty: 'tm', s: k(0), e: kf([[arc.start, 0], [arc.start + 26, 42]]), o: k(arc.offset), m: 1, nm: 'trim' },
              stroke(i === 0 ? GOLD : GOLD_SOFT, arc.width),
            ],
            `arc-${i}`,
          ),
        ],
        ip: arc.start,
        op: OP,
      }),
    )
  })

  // 祥云点：六枚沿外圈散开
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + Math.PI / 6
    const start = 40 + i * 3
    layers.push(
      shapeLayer({
        ind: ind++,
        nm: `祥云-${i + 1}`,
        ks: {
          p: k([CX + Math.cos(angle) * 300, CY + Math.sin(angle) * 300, 0]),
          o: kf([[start, 0], [start + 8, 86], [start + 34, 0]]),
          s: kf([[start, [30, 30, 100]], [start + 14, [100, 100, 100]]]),
        },
        shapes: [group([star({ points: 4, outer: 26, inner: 5 }), fill(GOLD_SOFT)], `cloud-${i}`)],
        ip: start,
        op: OP,
      }),
    )
  }

  // 底光
  layers.push(
    shapeLayer({
      ind: ind++,
      nm: '底光',
      ks: {
        o: kf([[0, 0], [26, 36], [80, 26], [102, 0]]),
        s: kf([[0, [46, 46, 100]], [40, [100, 100, 100]], [OP, [118, 118, 100]]]),
      },
      shapes: [group([ellipse(600), fill(RED, 22)], 'glow')],
      ip: 0,
      op: OP,
    }),
  )

  return doc({ nm: '金龙献瑞', op: OP, layers })
}

mkdirSync(OUT, { recursive: true })
const built = [
  ['gift-l3-ziwei.json', ziweiStar()],
  ['gift-l3-dragon.json', goldenDragon()],
]
for (const [name, data] of built) {
  const json = JSON.stringify(data)
  writeFileSync(join(OUT, name), json)
  console.log(`${name}  ${json.length} 字节  ${(data.op / FPS).toFixed(2)} 秒  ${data.layers.length} 图层`)
}
