<script setup lang="ts">
/**
 * 七政四余·多环天星盘（自 V0 components/qizheng/chart-wheel.tsx 还原）
 *
 * 环序（外→内）：大限流年岁数标尺环 → 神煞环 → 宿度刻度环 → 星曜环 → 二十八宿名环
 *               → 人事宫环 → 地支卦位环 → 中心立命
 * 布局铁律（与 V0 逐条对齐）：
 *   - 所有汉字一律正立不旋转，沿半径方向竖排成列
 *   - 数字（年份/岁数/宿度）沿切向旋转
 *   - 黄经 0°（戌宫头/春分点）置于正右，黄经增加逆时针
 *
 * 跨端取舍：V0 的 SVG（800×800 viewBox）小程序不支持 → 改 canvas 全绘制
 *   （@/utils/canvas/adapter），polar/radialText/tangentAngle/星曜防重叠算法逐行照搬。
 *   V0 的 pointer 拖拽 + 1x~3x 缩放 → canvas 尺寸随 zoom 放大 + 外层 scroll-view 双向滚动
 *   （移动端更自然，且放大后细节真实变清晰而非位图拉伸）。
 */
import { ref, watch, nextTick, onMounted } from 'vue'
import { renderToCanvas } from '@/utils/canvas/adapter'
import type { QizhengResult } from '@/pkg-paipan/lib/qizheng-engine'

const props = defineProps<{ result: QizhengResult; highlightYear?: number }>()

/** V0 原始坐标系：800×800，圆心 (400,400) */
const VB = 800
const CX = 400
const CY = 400

// 环半径（外→内）——与 V0 逐值一致
const R_RULER_OUT = 396
const R_RULER_IN = 376
const R_SS_OUT = 374
const R_TICK_OUT = 288
const R_TICK_IN = 272
const R_BODY_HI = 268
const R_XIU_OUT = 242
const R_XIU_IN = 212
const R_HOUSE_OUT = 212
const R_HOUSE_IN = 166
const R_ZHI_OUT = 166
const R_ZHI_IN = 120
const R_CENTER = 120

const GREEN = '#15803d'
const RED = '#dc2626'
const INK = '#2c2c2c'
const SOFT = '#8a8a8a'
const LINE = 'rgba(0,0,0,0.22)'
const WX_COLOR: Record<string, string> = {
  金: '#b45309', 木: '#15803d', 水: '#2563eb', 火: '#dc2626', 土: '#92661a', 日: '#dc2626', 月: '#2563eb',
}

/** 盘面最大基准宽度（px）；窄屏按内容区真实宽度收缩，避免初始盘面被裁切。 */
const BASE_MAX = 340
const viewportPx = ref(BASE_MAX)
const zoom = ref(1)
const canvasPx = ref(BASE_MAX)
const scrollLeft = ref(0)
const scrollTop = ref(0)

function zoomTo(next: number) {
  const z = Math.max(1, Math.min(3, Math.round(next * 2) / 2))
  if (z === zoom.value) return
  zoom.value = z
}

/** 黄经→画布坐标：0° 正右，黄经增加逆时针（与 V0 polar 同式） */
function polar(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)]
}

/** 切向旋转角（数字标签用，保证不倒置） */
function tangentAngle(deg: number): number {
  let a = -deg
  a = ((a % 360) + 360) % 360
  if (a > 90 && a < 270) a -= 180
  return a
}

function draw(ctx: CanvasRenderingContext2D, px: number) {
  const r = props.result
  const k = px / VB

  ctx.clearRect(0, 0, px, px)
  ctx.save()
  ctx.scale(k, k)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const line = (deg: number, r1: number, r2: number, color: string, width = 1) => {
    const [x1, y1] = polar(deg, r1)
    const [x2, y2] = polar(deg, r2)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.stroke()
  }

  /** 径向竖排文字：字符正立、沿半径由外向内排列（V0 radialText） */
  const radialText = (
    deg: number, rTop: number, text: string,
    opts: { fill?: string; size?: number; gap?: number; bold?: boolean } = {},
  ) => {
    const { fill = INK, size = 12, gap = 13.5, bold } = opts
    ctx.fillStyle = fill
    ctx.font = `${bold ? '700 ' : ''}${size}px sans-serif`
    text.split('').forEach((ch, i) => {
      const [x, y] = polar(deg, rTop - i * gap)
      ctx.fillText(ch, x, y)
    })
  }

  /** 切向数字（随环旋转） */
  const tangentText = (deg: number, rr: number, text: string, size: number, fill: string, bold?: boolean) => {
    const [x, y] = polar(deg, rr)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((tangentAngle(deg) * Math.PI) / 180)
    ctx.fillStyle = fill
    ctx.font = `${bold ? '700 ' : ''}${size}px sans-serif`
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  // ══ 环底 ══
  const rings = [R_RULER_OUT, R_RULER_IN, R_TICK_IN, R_TICK_OUT, R_XIU_OUT, R_XIU_IN, R_HOUSE_IN, R_CENTER]
  rings.forEach((rr, i) => {
    ctx.beginPath()
    ctx.arc(CX, CY, rr, 0, Math.PI * 2)
    ctx.strokeStyle = i === 0 ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.2)'
    ctx.lineWidth = i === 0 ? 1.5 : 1
    ctx.stroke()
  })

  // 命宫扇区淡高亮
  const mingPalace = r.palaces.find((p) => p.zhi === r.ming.zhi)
  if (mingPalace) {
    const steps = 16
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const [x, y] = polar(mingPalace.lonStart + (30 * i) / steps, R_TICK_IN)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let i = steps; i >= 0; i--) {
      const [x, y] = polar(mingPalace.lonStart + (30 * i) / steps, R_ZHI_IN)
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(21,128,61,0.05)'
    ctx.fill()
  }

  // 十二宫分隔线
  r.palaces.forEach((p) => line(p.lonStart, R_ZHI_IN, R_SS_OUT, 'rgba(0,0,0,0.5)', 1.2))

  // ══ 1. 大限流年岁数标尺环 ══
  const lonOf = (zhi: string) => r.palaces.find((p) => p.zhi === zhi)?.lonStart ?? 0
  let rulerDir: 1 | -1 = 1
  if (r.daxian.length >= 2) {
    const d = (((lonOf(r.daxian[1].palaceZhi) - lonOf(r.daxian[0].palaceZhi)) % 360) + 360) % 360
    rulerDir = d === 30 ? 1 : -1
  }
  const rulerLon = (step: QizhengResult['daxian'][number], frac: number) => {
    const base = lonOf(step.palaceZhi)
    return rulerDir === 1 ? base + 30 * frac : base + 30 - 30 * frac
  }

  r.daxian.forEach((d) => {
    const boundary = rulerLon(d, 0)
    line(boundary, R_RULER_IN, R_RULER_OUT, 'rgba(0,0,0,0.6)', 1.5)
    // 公历年（切向，标尺外沿）
    tangentText(boundary, R_RULER_OUT + 12, String(d.startYear), 14, INK, true)
    // 每岁刻度 + 岁数
    for (let i = 0; i < d.years; i++) {
      const tickLon = rulerLon(d, (i + 1) / d.years)
      const midLon = rulerLon(d, (i + 0.5) / d.years)
      if (i < d.years - 1) line(tickLon, R_RULER_IN, R_RULER_OUT, 'rgba(0,0,0,0.18)')
      const showNum = d.years <= 12 || i % 2 === 0
      if (showNum) tangentText(midLon, (R_RULER_OUT + R_RULER_IN) / 2, String(d.startAge + i), 9, SOFT)
    }
  })

  // 流年红色指针
  if (props.highlightYear != null) {
    const hy = props.highlightYear
    const step = r.daxian.find((d) => hy >= d.startYear && hy <= d.endYear)
    if (step) {
      const lon = rulerLon(step, (hy - step.startYear + 0.5) / step.years)
      line(lon, R_TICK_IN, R_RULER_OUT, RED, 1.8)
    }
  }

  // ══ 2. 神煞环（绿色竖排，每宫 4 列 × 2 行） ══
  r.palaces.forEach((p) => {
    p.shensha.slice(0, 8).forEach((s, i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const deg = p.lonStart + 4.4 + col * 7.1
      const rTop = row === 0 ? R_SS_OUT - 10 : R_SS_OUT - 54
      radialText(deg, rTop, s.slice(0, 3), { fill: GREEN, size: 13.5, gap: 14.5, bold: true })
    })
  })

  // ══ 3. 宿度刻度环 ══
  r.mansionBoundaries.forEach((m, i) => {
    const next = r.mansionBoundaries[(i + 1) % 28]
    let span = next.start - m.start
    if (span < 0) span += 360
    line(m.start, R_TICK_IN, R_TICK_OUT, 'rgba(0,0,0,0.55)', 1.5)
    for (let kk = 0; kk < Math.floor(span / 2); kk++) {
      line(m.start + (kk + 1) * 2, R_TICK_OUT - 6, R_TICK_OUT, 'rgba(0,0,0,0.16)')
    }
    if (span > 6) {
      tangentText(m.start + span / 2, (R_TICK_IN + R_TICK_OUT) / 2 - 1, String(Math.round(span)), 9, SOFT)
    }
  })

  // ══ 命 / 身 红色标记 ══
  ;[
    { lon: r.ming.lon, label: '命', dash: [5, 3] },
    { lon: r.shen.lon, label: '身', dash: [2, 3] },
  ].forEach(({ lon, label, dash }) => {
    ctx.save()
    if (ctx.setLineDash) ctx.setLineDash(dash)
    line(lon, R_CENTER, R_TICK_OUT, RED, 1.6)
    ctx.restore()
    const [tx, ty] = polar(lon, R_TICK_OUT + 9)
    ctx.fillStyle = RED
    ctx.font = '700 12.5px sans-serif'
    ctx.fillText(label, tx, ty)
  })

  // ══ 4. 星曜环（防重叠：相邻标签至少 8°，引线指回真实黄经） ══
  const sorted = [...r.bodies].sort((a, b) => a.lon - b.lon)
  const displayLon = new Map<string, number>()
  let prevDisp = -999
  for (const b of sorted) {
    const d = Math.max(b.lon, prevDisp + 8)
    displayLon.set(b.key, d)
    prevDisp = d
  }

  r.bodies.forEach((b) => {
    const rr = R_BODY_HI - 10
    const dLon = displayLon.get(b.key) ?? b.lon
    const [x, y] = polar(dLon, rr)
    const color = WX_COLOR[b.wuxing] ?? '#475569'
    // 引线：真实黄经 → 标签位
    const [t1x, t1y] = polar(b.lon, R_TICK_IN)
    const [t2x, t2y] = polar(dLon, rr + 15)
    ctx.beginPath()
    ctx.moveTo(t1x, t1y)
    ctx.lineTo(t2x, t2y)
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.globalAlpha = 1
    // 星曜名
    ctx.fillStyle = color
    ctx.font = '800 19px sans-serif'
    ctx.fillText(b.shortName, x, y)
    // 化曜（右上，红）
    if (b.huayao) {
      ctx.fillStyle = RED
      ctx.font = '600 10.5px sans-serif'
      ctx.fillText(b.huayao.slice(-1), x + 14, y - 10)
    }
    // 迟留伏逆（左上）
    if (b.motion === '逆' || b.motion === '留' || b.motion === '伏') {
      ctx.fillStyle = RED
      ctx.font = '10.5px sans-serif'
      ctx.fillText(b.motion, x - 14, y - 10)
    }
    // 庙陷（右下：庙+ 陷-）
    if (b.dignity !== '平') {
      ctx.fillStyle = b.dignity === '庙' ? GREEN : RED
      ctx.font = '700 11px sans-serif'
      ctx.fillText(b.dignity === '庙' ? '+' : '-', x + 13, y + 13)
    }
  })

  // ══ 5. 二十八宿名环 ══
  r.mansionBoundaries.forEach((m, i) => {
    const next = r.mansionBoundaries[(i + 1) % 28]
    let span = next.start - m.start
    if (span < 0) span += 360
    line(m.start, R_XIU_IN, R_XIU_OUT, 'rgba(0,0,0,0.3)')
    const [x, y] = polar(m.start + span / 2, (R_XIU_OUT + R_XIU_IN) / 2)
    ctx.fillStyle = WX_COLOR[m.wuxing] ?? INK
    ctx.font = '700 17px sans-serif'
    ctx.fillText(m.name, x, y)
  })

  // ══ 6. 人事宫环（宫名竖排 + 长生神） ══
  r.palaces.forEach((p) => {
    const isMing = p.zhi === r.ming.zhi
    radialText(p.lonStart + 19.5, R_HOUSE_OUT - 12, p.house.slice(0, 2), {
      fill: isMing ? GREEN : INK, size: 17, gap: 19, bold: true,
    })
    radialText(p.lonStart + 8, R_HOUSE_OUT - 12, p.changSheng.slice(0, 2), { fill: SOFT, size: 12.5, gap: 14 })
  })

  // ══ 7. 地支 + 卦位五行环 ══
  r.palaces.forEach((p) => {
    const isMing = p.zhi === r.ming.zhi
    line(p.lonStart, R_ZHI_IN, R_ZHI_OUT, LINE)
    radialText(p.lonStart + 20, R_ZHI_OUT - 13, p.zhi, { fill: isMing ? GREEN : INK, size: 19, bold: true })
    const lordChar = p.lord.charAt(0) === '太' ? p.lord.charAt(1) : p.lord.charAt(0)
    radialText(p.lonStart + 8.5, R_ZHI_OUT - 12, `${p.gua}${lordChar}`, { fill: SOFT, size: 12.5, gap: 14 })
  })

  // ══ 8. 中心立命（竖排双列） ══
  const c1 = `${r.ming.mansion}${Math.max(1, Math.ceil(r.ming.mansionDeg))}度`
  ctx.fillStyle = INK
  ctx.font = '800 21px sans-serif'
  c1.split('').forEach((ch, i) => ctx.fillText(ch, CX - 15, CY - 32 + i * 25))
  ctx.fillStyle = GREEN
  '立命'.split('').forEach((ch, i) => ctx.fillText(ch, CX + 15, CY - 20 + i * 25))
  ctx.fillStyle = SOFT
  ctx.font = '12px sans-serif'
  ctx.fillText(`${r.ming.zhi}宫 · ${r.ming.ci} · ${r.ming.lord}`, CX, CY + 56)
  ctx.font = '11px sans-serif'
  ctx.fillText(
    `恩${r.enYongChouNan.en} 用${r.enYongChouNan.yong} 仇${r.enYongChouNan.chou} 难${r.enYongChouNan.nan}`,
    CX, CY + 74,
  )

  // ══ 四角信息 ══
  ctx.font = '12.5px sans-serif'
  ctx.fillStyle = SOFT
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = '800 15px sans-serif'
  ctx.fillText('回归今宿', 8, 20)
  ctx.fillStyle = SOFT
  ctx.font = '12.5px sans-serif'
  ctx.fillText(`童限${r.tongxian.years}岁${r.tongxian.months}个月`, 8, 40)
  ctx.fillText(`${r.daxian[0]?.startYear ?? ''}${r.meta.ganzhi[0]?.slice(0, 2) ?? ''}起运`, 8, 58)
  // 左下：四柱
  ctx.fillStyle = INK
  ctx.font = '700 13.5px sans-serif'
  ctx.fillText(r.meta.gender === '男' ? '乾造' : '坤造', 8, 742)
  ctx.fillStyle = SOFT
  ctx.font = '12.5px sans-serif'
  ctx.fillText(r.meta.ganzhi.slice(0, 2).join(' '), 8, 760)
  ctx.fillText(r.meta.ganzhi.slice(2).join(' '), 8, 778)
  // 右上
  ctx.textAlign = 'right'
  ctx.fillText(`安身 ${r.shen.mansion}${r.shen.mansionDeg.toFixed(2)} ${r.shen.zhi}${r.shen.palaceDeg.toFixed(2)}`, 792, 20)
  ctx.fillText(`立命 ${r.ming.mansion}${r.ming.mansionDeg.toFixed(2)} ${r.ming.zhi}${r.ming.palaceDeg.toFixed(2)}`, 792, 38)
  ctx.fillText(`度 恩${r.enYongChouNan.en} 用${r.enYongChouNan.yong} 仇${r.enYongChouNan.chou} 难${r.enYongChouNan.nan}`, 792, 58)
  ctx.fillText(`宫 恩${r.enYongChouNan.gongEn} 用${r.enYongChouNan.gongYong} 仇${r.enYongChouNan.gongChou} 难${r.enYongChouNan.gongNan}`, 792, 76)
  // 右下
  ctx.fillStyle = INK
  ctx.font = '800 13.5px sans-serif'
  ctx.fillText(`${r.meta.dayNight} 真太阳时`, 792, 708)
  ctx.fillStyle = SOFT
  ctx.font = '12.5px sans-serif'
  ctx.fillText(`日出 ${r.meta.sunrise} 日落 ${r.meta.sunset}`, 792, 726)
  ctx.fillText(`月出 ${r.meta.moonrise} 月落 ${r.meta.moonset}`, 792, 744)
  ctx.fillText(`经度 ${r.meta.longitude.toFixed(0)}° 纬度 ${r.meta.latitude.toFixed(0)}°`, 792, 762)

  ctx.restore()
}

const failed = ref(false)

async function render() {
  const px = Math.round(viewportPx.value * zoom.value)
  const centerOffset = Math.max(0, Math.round((px - viewportPx.value) / 2))
  canvasPx.value = px
  await nextTick()
  try {
    await renderToCanvas('#qz-wheel', { width: px, height: px }, (ctx) => draw(ctx, px))
    // 必须等画布扩宽后再定位；提前设置会被 scroll-view 按旧内容宽度钳回 0。
    await nextTick()
    scrollLeft.value = centerOffset
    scrollTop.value = centerOffset
    failed.value = false
  } catch {
    failed.value = true
  }
}

onMounted(() => {
  const { windowWidth } = uni.getSystemInfoSync()
  // 结果页主体左右各 40rpx；按真实可用宽度绘制 100% 初始盘面。
  const contentWidth = Math.floor(windowWidth * (1 - 80 / 750))
  viewportPx.value = Math.max(260, Math.min(BASE_MAX, contentWidth))
  render()
})
watch(() => [props.result, props.highlightYear, zoom.value], render)
</script>

<template>
  <view class="wheel">
    <scroll-view
      scroll-x scroll-y class="wheel-scroll"
      :show-scrollbar="false"
      :scroll-left="scrollLeft"
      :scroll-top="scrollTop"
      :style="{ width: viewportPx + 'px', height: viewportPx + 'px' }"
    >
      <canvas
        id="qz-wheel"
        canvas-id="qz-wheel"
        type="2d"
        class="wheel-canvas"
        :style="{ width: canvasPx + 'px', height: canvasPx + 'px' }"
      />
    </scroll-view>

    <view v-if="failed" class="wheel-fallback">
      <text class="wheel-fallback-text">星盘绘制失败，可查看下方星曜表与四柱信息</text>
    </view>

    <!-- 缩放控件（V0：1x~3x） -->
    <view class="zoom">
      <view class="zoom-btn" :class="{ 'zoom-off': zoom <= 1 }" @tap="zoomTo(zoom - 0.5)">
        <text class="zoom-sign">−</text>
      </view>
      <text class="zoom-pct">{{ Math.round(zoom * 100) }}%</text>
      <view class="zoom-btn" :class="{ 'zoom-off': zoom >= 3 }" @tap="zoomTo(zoom + 0.5)">
        <text class="zoom-sign">+</text>
      </view>
      <view v-if="zoom > 1" class="zoom-reset" @tap="zoomTo(1)">
        <text class="zoom-reset-text">重置</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.wheel { position: relative; display: flex; flex-direction: column; align-items: center; }
.wheel-scroll {
  display: block;
  align-self: center;
  flex-shrink: 0;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 0 0 1rpx rgba(201, 169, 110, 0.18);
}
.wheel-canvas { display: block; max-width: none; }

.wheel-fallback { padding: 32rpx; text-align: center; }
.wheel-fallback-text { font-size: 24rpx; color: var(--text-soft); }

/* 缩放控件 */
.zoom {
  position: absolute; right: 16rpx; bottom: 16rpx;
  display: flex; align-items: center; gap: 8rpx;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  border: 2rpx solid var(--line);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.zoom-btn {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.zoom-btn:active { background: rgba(0, 0, 0, 0.05); }
.zoom-off { opacity: 0.3; }
.zoom-sign { font-size: 32rpx; font-weight: 700; color: var(--text-ink); line-height: 1; }
.zoom-pct { min-width: 72rpx; text-align: center; font-size: 22rpx; color: var(--text-soft); }
.zoom-reset { padding: 0 16rpx; height: 56rpx; display: flex; align-items: center; }
.zoom-reset-text { font-size: 22rpx; color: var(--text-soft); }
</style>
