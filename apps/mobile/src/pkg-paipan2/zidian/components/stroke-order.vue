<script setup lang="ts">
/**
 * 笔顺动画（自 V0 components/zidian/stroke-order.tsx 还原）
 *
 * V0 用 hanzi-writer + jsdelivr CDN 往 DOM 里塞 SVG——小程序既无 DOM 也无 SVG，
 * 故改为：笔顺数据走自家后端（GET /zidian/:char/strokes，9574 字），canvas 2d 自绘。
 * 动画原理与 hanzi-writer 一致：以笔画轮廓 clip，再沿中线(median)用粗线渐进「运笔」，
 * 笔锋自然被轮廓裁出形状；部首笔画着重色。
 * 无笔顺数据（生僻字）时降级为静态大字——与 V0 的 failed 分支一致。
 */
import { ref, watch, onUnmounted } from 'vue'
import { getCanvas } from '@/utils/canvas/adapter'
import { apiGet } from '@/utils/request'

const props = withDefaults(defineProps<{ char: string; size?: number }>(), { size: 120 })

const failed = ref(false)
const loading = ref(true)
// canvas id 需全局唯一（同页可能多处使用）
const cid = `so-${Math.random().toString(36).slice(2, 8)}`

interface StrokeData {
  char: string
  strokes: string[]
  medians: number[][][]
  radStrokes: number[]
}

const COLOR_STROKE = '#7c2d12'
const COLOR_RADICAL = '#b45309'
const COLOR_OUTLINE = '#e7e0d5'
const PAD = 8
const GAP = 260 // 笔间停顿 ms（与 V0 delayBetweenStrokes 一致）
const LOOP_GAP = 1200 // 整字写完后的停顿 ms

let stopped = false
let raf: ((cb: () => void) => void) | null = null

/* ── SVG path 解析（数据里只有 M/L/Q/C/Z 且均为绝对坐标，已全量抽样确认） ── */
type Cmd = { c: string; v: number[] }
function parsePath(d: string): Cmd[] {
  const out: Cmd[] = []
  const re = /([MLQCZ])([^MLQCZ]*)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(d))) {
    const nums = (m[2].match(/-?\d*\.?\d+/g) || []).map(Number)
    out.push({ c: m[1].toUpperCase(), v: nums })
  }
  return out
}

/** 1024×1024 字形坐标 → 画布坐标（hanzi-writer 的 translate(0,900) scale(1,-1)） */
function makeTx(size: number) {
  const s = (size - PAD * 2) / 1024
  return (x: number, y: number): [number, number] => [PAD + x * s, PAD + (900 - y) * s]
}

function tracePath(ctx: CanvasRenderingContext2D, d: string, tx: (x: number, y: number) => [number, number]) {
  ctx.beginPath()
  for (const { c, v } of parsePath(d)) {
    if (c === 'M') ctx.moveTo(...tx(v[0], v[1]))
    else if (c === 'L') ctx.lineTo(...tx(v[0], v[1]))
    else if (c === 'Q') {
      const [cx, cy] = tx(v[0], v[1])
      const [x, y] = tx(v[2], v[3])
      ctx.quadraticCurveTo(cx, cy, x, y)
    } else if (c === 'C') {
      const [c1x, c1y] = tx(v[0], v[1])
      const [c2x, c2y] = tx(v[2], v[3])
      const [x, y] = tx(v[4], v[5])
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x, y)
    } else if (c === 'Z') ctx.closePath()
  }
}

/** 中线累计长度（画布坐标下） */
function polyLen(pts: [number, number][]): number[] {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0]
    const dy = pts[i][1] - pts[i - 1][1]
    acc.push(acc[i - 1] + Math.hypot(dx, dy))
  }
  return acc
}

/** 沿中线画到进度 t（0~1），已被 clip 到笔画轮廓内，故线宽只需足够粗 */
function strokeMedian(ctx: CanvasRenderingContext2D, pts: [number, number][], acc: number[], t: number, size: number) {
  const total = acc[acc.length - 1]
  const target = total * t
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) {
    if (acc[i] <= target) {
      ctx.lineTo(pts[i][0], pts[i][1])
    } else {
      const seg = acc[i] - acc[i - 1]
      const k = seg > 0 ? (target - acc[i - 1]) / seg : 0
      ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k)
      break
    }
  }
  ctx.lineWidth = (240 * (size - PAD * 2)) / 1024 // 粗于任何笔画，靠 clip 裁形
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

let ctxRef: CanvasRenderingContext2D | null = null
let dataRef: StrokeData | null = null
let medianRef: { pts: [number, number][]; acc: number[] }[] = []

function drawFrame(idx: number, t: number) {
  const ctx = ctxRef
  const data = dataRef
  if (!ctx || !data) return
  const size = props.size
  const tx = makeTx(size)
  ctx.clearRect(0, 0, size, size)

  // 底层轮廓（未写的笔画淡灰）
  for (const d of data.strokes) {
    tracePath(ctx, d, tx)
    ctx.fillStyle = COLOR_OUTLINE
    ctx.fill()
  }
  // 已写完的笔画
  for (let i = 0; i < idx; i++) {
    tracePath(ctx, data.strokes[i], tx)
    ctx.fillStyle = data.radStrokes.includes(i) ? COLOR_RADICAL : COLOR_STROKE
    ctx.fill()
  }
  // 当前正在写的笔画：clip 到轮廓 → 沿中线运笔
  if (idx < data.strokes.length && t > 0) {
    const m = medianRef[idx]
    if (m && m.pts.length > 1) {
      ctx.save()
      tracePath(ctx, data.strokes[idx], tx)
      ctx.clip()
      ctx.strokeStyle = data.radStrokes.includes(idx) ? COLOR_RADICAL : COLOR_STROKE
      strokeMedian(ctx, m.pts, m.acc, t, size)
      ctx.restore()
    }
  }
}

/** 循环播放：逐笔运笔 → 笔间停顿 → 整字停顿 → 重来 */
function play() {
  const data = dataRef
  if (!data) return
  let idx = 0
  let startAt = 0
  let waiting = 0 // >0 表示停顿到该时刻

  const step = () => {
    if (stopped) return
    const now = Date.now()
    if (waiting) {
      if (now >= waiting) {
        waiting = 0
        startAt = now
        if (idx >= data.strokes.length) {
          idx = 0
          drawFrame(0, 0)
        }
      }
    } else {
      if (!startAt) startAt = now
      const m = medianRef[idx]
      const len = m?.acc[m.acc.length - 1] ?? 1
      const dur = 300 + (len / props.size) * 420 // 长笔慢、短笔快
      const t = Math.min(1, (now - startAt) / dur)
      drawFrame(idx, t)
      if (t >= 1) {
        idx++
        waiting = now + (idx >= data.strokes.length ? LOOP_GAP : GAP)
        drawFrame(idx, 0)
      }
    }
    raf ? raf(step) : setTimeout(step, 16)
  }
  step()
}

async function init() {
  stopped = true // 先停掉上一轮
  loading.value = true
  failed.value = false
  dataRef = null
  await new Promise((r) => setTimeout(r, 30)) // 让上一个循环退出 + 等 canvas 渲染

  let data: StrokeData | null = null
  try {
    data = await apiGet<StrokeData | null>(`/zidian/${encodeURIComponent(props.char)}/strokes`)
  } catch {
    data = null
  }
  if (!data?.strokes?.length) {
    loading.value = false
    failed.value = true
    return
  }
  loading.value = false

  try {
    const handle = await getCanvas(`#${cid}`, props.size, props.size)
    ctxRef = handle.ctx
    raf = handle.canvas?.requestAnimationFrame ? (cb: () => void) => handle.canvas.requestAnimationFrame(cb) : null
  } catch {
    failed.value = true
    return
  }

  dataRef = data
  const tx = makeTx(props.size)
  medianRef = data.medians.map((pts) => {
    const p = pts.map(([x, y]) => tx(x, y))
    return { pts: p, acc: polyLen(p) }
  })
  stopped = false
  play()
}

/** 重播（V0 的 RotateCcw 按钮） */
function replay() {
  if (failed.value || !dataRef) return
  stopped = true
  setTimeout(() => {
    stopped = false
    play()
  }, 40)
}

watch(() => props.char, init, { immediate: true })
onUnmounted(() => {
  stopped = true
})
</script>

<template>
  <view class="so-wrap" :style="{ width: size + 'px', height: size + 'px' }">
    <!-- 无笔顺数据 → 静态大字（诚实降级） -->
    <view v-if="failed" class="so-fallback" :style="{ width: size + 'px', height: size + 'px', fontSize: size * 0.58 + 'px' }">
      {{ char }}
    </view>
    <template v-else>
      <canvas
        :id="cid"
        :canvas-id="cid"
        type="2d"
        class="so-canvas"
        :style="{ width: size + 'px', height: size + 'px' }"
        @tap="replay"
      />
      <view v-if="loading" class="so-loading" :style="{ fontSize: size * 0.5 + 'px' }">{{ char }}</view>
      <view v-else class="so-replay" @tap.stop="replay">↻</view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.so-wrap {
  position: relative;
  flex-shrink: 0;
}
.so-canvas {
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #fffdf9;
  display: block;
}
.so-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #e7e0d5;
  border-radius: 16rpx;
  background: #f5f1ea;
  color: #3d2f22;
  font-family: 'Songti SC', 'STSong', serif;
}
.so-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e7e0d5;
  font-family: 'Songti SC', 'STSong', serif;
}
.so-replay {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1rpx solid #e7e0d5;
  background: #fff;
  color: #8a7a68;
  font-size: 24rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);
}
</style>
