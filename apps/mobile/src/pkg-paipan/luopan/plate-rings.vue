<script setup lang="ts">
/**
 * 罗盘静态盘面圈层（自 V0 components/luopan/luopan-plate.tsx SVG 还原为 CSS view）
 *
 * 小程序不支持内联 SVG → 每个刻度/文字一个绝对定位 view：
 *   transform: translate(-50%,-50%) rotate(deg) translateY(-R)  环形排布
 * 文字默认「头朝外」（与实体罗盘一致）；廿四山/度数等需可读的文字在南半区(90°~270°)内层再倒转 180°。
 *
 * 独立成组件的目的：内容只随盘制/坐向变化重渲染；指南针高频旋转只改父组件
 * 的 wrapper transform，本组件子树不参与 diff（小程序 setData 才扛得住）。
 */
import { computed } from 'vue'
import {
  MOUNTAINS,
  BAGUA,
  HEXAGRAM_NAMES,
  CHUANSHAN_72,
  TIANYUAN_MOUNTAINS,
  TRIGRAM_LINES,
  mountainCenterDeg,
  type PlateStyle,
} from '@/pkg-paipan/lib/luopan-data'

const props = withDefaults(
  defineProps<{
    plateStyle: PlateStyle
    /** 锁定后高亮的坐山索引（画坐向红虚线） */
    sittingIdx?: number | null
  }>(),
  { sittingIdx: null },
)

/** V0 以 400×400 坐标系绘制；本盘面 640rpx → 1 单位 = 1.6rpx */
const U = 1.6
const px = (u: number) => Math.round(u * U * 10) / 10

const CARDINAL = new Set(['子', '午', '卯', '酉'])

/** 南半区文字倒转 180° 保持可读（对应 V0 textUpright） */
const flip = (deg: number) => {
  const d = ((deg % 360) + 360) % 360
  return d > 90 && d < 270
}

/** 半径分配（单位：V0 坐标），逻辑与 V0 一致，外 → 内 */
const geo = computed(() => {
  const s = props.plateStyle
  const show64 = s === 'sanyuan' || s === 'zonghe'
  const show72 = s === 'sanhe' || s === 'zonghe'
  const showNeedles = s === 'sanhe'

  let r = 196
  const degTickOuter = r
  r -= 14
  const degNum = r
  r -= 12
  const contentTop = r
  const circles: number[] = [degTickOuter, contentTop]

  let ring64 = 0
  if (show64) {
    ring64 = r - 12
    r -= 24
    circles.push(r)
  }
  let ring72 = 0
  if (show72) {
    ring72 = r - 12
    r -= 24
    circles.push(r)
  }
  let needleMid = 0
  let needleFeng = 0
  if (showNeedles) {
    needleMid = r - 11
    r -= 22
    circles.push(r)
    needleFeng = r - 11
    r -= 22
    circles.push(r)
  }

  // 廿四山主环：独占一条 24 单位宽的环带（V0 原稿 ring24Mid 取外全宽中点，
  // 综合盘会与七十二龙文字重叠，此处修正为紧贴内侧环带）
  const bandOut = r
  const bandIn = r - 24
  const bandMid = r - 12
  r = bandIn
  circles.push(bandIn)

  // 内八卦圈：三合盘三针占满内径后剩余空间不足（V0 原稿八卦被天池遮盖属瑕疵），砍掉还空间给天池
  const showBagua = s === 'sanyuan' || s === 'zonghe'
  let trigram = 0
  let baguaName = 0
  let baguaOut = 0
  let baguaIn = 0
  if (showBagua) {
    baguaOut = r
    trigram = r - 16
    baguaName = r - 40
    baguaIn = r - 56
    r -= 56
    circles.push(baguaIn)
  }

  const pool = showBagua ? Math.max(baguaIn - 4, 40) : Math.max(r - 4, 46)

  return {
    show64, show72, showNeedles, showBagua,
    degTickOuter, degNum, contentTop,
    ring64, ring72, needleMid, needleFeng,
    bandOut, bandIn, bandMid,
    trigram, baguaName, baguaOut, baguaIn,
    pool, circles,
  }
})

/** 各圈层元素（只随盘制变化，computed 缓存） */
const parts = computed(() => {
  const g = geo.value
  const T = (deg: number, r: number) =>
    `transform:translate(-50%,-50%) rotate(${Math.round(deg * 100) / 100}deg) translateY(-${px(r)}rpx);`

  // 圈线
  const circles = g.circles.map((r) => `width:${2 * px(r)}rpx;height:${2 * px(r)}rpx;`)

  // 度数刻度：每 5° 一格，10° 为主刻度（朱红加长）
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const major = i % 2 === 0
    const len = major ? 7 : 3.5
    return { key: i, major, style: `height:${px(len)}rpx;${T(i * 5, g.degTickOuter - len / 2)}` }
  })

  // 度数数字：每 10°
  const degNums = Array.from({ length: 36 }, (_, i) => {
    const deg = i * 10
    return { key: i, text: String(deg), flip: flip(deg), style: T(deg, g.degNum) }
  })

  // 廿四山：天元龙红底白字，四正（子午卯酉）加粗
  const bgW = px(2 * g.bandMid * Math.sin((7.5 * Math.PI) / 180))
  const mountains = MOUNTAINS.map((ch, i) => {
    const deg = mountainCenterDeg(i)
    const tian = TIANYUAN_MOUNTAINS.has(ch)
    return {
      key: i, ch, tian,
      bold: tian || CARDINAL.has(ch),
      flip: flip(deg),
      style: `width:${bgW}rpx;height:${px(24)}rpx;${T(deg, g.bandMid)}`,
    }
  })
  // 廿四山扇区分隔线
  const dividers = Array.from({ length: 24 }, (_, i) => ({
    key: i,
    style: `height:${px(24)}rpx;${T(mountainCenterDeg(i) - 7.5, g.bandMid)}`,
  }))

  // 六十四卦：乾居正南 180°，顺时针匀布，文字头朝外
  const hexagrams = g.show64
    ? HEXAGRAM_NAMES.map((name, i) => {
        const deg = 180 + (i * 360) / 64
        return { key: i, name, small: name.length > 1, style: T(deg, g.ring64) }
      })
    : []

  // 穿山七十二龙：每 5° 一格，格中心偏移 2.5°
  const dragons = g.show72
    ? CHUANSHAN_72.map((name, i) => {
        const deg = i * 5 + 2.5
        return { key: i, name, kong: name === '空', style: T(deg, g.ring72) }
      })
    : []

  // 三合人盘中针（逆偏 7.5°）/ 天盘缝针（顺偏 7.5°）
  const needleTexts = g.showNeedles
    ? [
        { r: g.needleMid, off: -7.5, k: 'mid' },
        { r: g.needleFeng, off: 7.5, k: 'feng' },
      ].flatMap((ring) =>
        MOUNTAINS.map((ch, i) => {
          const deg = mountainCenterDeg(i) + ring.off
          return { key: `${ring.k}${i}`, ch, flip: flip(deg), style: T(deg, ring.r) }
        }),
      )
    : []

  // 大八卦：卦名 + 三爻（li=0 为最上爻，离盘心最远）+ 八等分分隔线
  const bagua = g.showBagua
    ? BAGUA.map((b, i) => {
        const lines = (TRIGRAM_LINES[b.name] ?? [true, true, true]).slice().reverse()
        return {
          key: i,
          name: b.name,
          flip: flip(b.centerDeg),
          nameStyle: T(b.centerDeg, g.baguaName),
          divStyle: `height:${px(56)}rpx;${T(b.centerDeg - 22.5, g.baguaOut - 28)}`,
          bars: lines.map((yang, li) => ({ key: li, yang, style: T(b.centerDeg, g.trigram - li * 6) })),
        }
      })
    : []

  // 天池八方标注
  const poolLabels = [
    { t: '北', d: 0 }, { t: '东北', d: 45 }, { t: '东', d: 90 }, { t: '东南', d: 135 },
    { t: '南', d: 180 }, { t: '西南', d: 225 }, { t: '西', d: 270 }, { t: '西北', d: 315 },
  ].map((o) => ({ key: o.t, t: o.t, card: o.t.length === 1, style: T(o.d, g.pool - 10) }))

  return {
    circles, ticks, degNums, mountains, dividers, hexagrams, dragons, needleTexts, bagua, poolLabels,
    poolStyle: `width:${2 * px(g.pool)}rpx;height:${2 * px(g.pool)}rpx;`,
    needleStyle: `border-bottom-width:${px(g.pool - 14)}rpx;`,
    needleSouthStyle: `border-top-width:${px(g.pool - 14)}rpx;`,
  }
})

/** 坐向红虚线（锁定后显示，过盘心贯穿坐/向两山） */
const sitLineStyle = computed(() => {
  if (props.sittingIdx == null) return ''
  const deg = mountainCenterDeg(props.sittingIdx)
  return `height:${2 * px(geo.value.contentTop)}rpx;transform:translate(-50%,-50%) rotate(${deg}deg);`
})
</script>

<template>
  <view class="rings">
    <!-- 圈线 -->
    <view v-for="(c, ci) in parts.circles" :key="`c${ci}`" class="circle" :style="c" />

    <!-- 度数刻度 -->
    <view
      v-for="t in parts.ticks"
      :key="`t${t.key}`"
      class="tick"
      :class="{ 'tick-major': t.major }"
      :style="t.style"
    />

    <!-- 度数数字 -->
    <view v-for="n in parts.degNums" :key="`n${n.key}`" class="cell cell-degnum" :style="n.style">
      <text class="glyph deg-num" :class="{ flip: n.flip }">{{ n.text }}</text>
    </view>

    <!-- 六十四卦 -->
    <view v-for="h in parts.hexagrams" :key="`h${h.key}`" class="cell cell-hex" :style="h.style">
      <text class="glyph hex-name" :class="{ 'hex-small': h.small }">{{ h.name }}</text>
    </view>

    <!-- 穿山七十二龙 -->
    <view v-for="d in parts.dragons" :key="`d${d.key}`" class="cell cell-dragon" :style="d.style">
      <text class="glyph dragon" :class="{ 'dragon-kong': d.kong }">{{ d.name }}</text>
    </view>

    <!-- 三合中针/缝针 -->
    <view v-for="nd in parts.needleTexts" :key="`nd${nd.key}`" class="cell cell-needle" :style="nd.style">
      <text class="glyph needle-ch" :class="{ flip: nd.flip }">{{ nd.ch }}</text>
    </view>

    <!-- 廿四山：分隔线 + 天元龙红底 + 山字 -->
    <view v-for="dv in parts.dividers" :key="`dv${dv.key}`" class="band-divider" :style="dv.style" />
    <view v-for="m in parts.mountains" :key="`m${m.key}`" class="cell cell-mountain" :style="m.style">
      <view v-if="m.tian" class="mountain-bg" />
      <text
        class="glyph mountain-ch"
        :class="{ flip: m.flip, 'mountain-tian': m.tian, 'mountain-bold': m.bold }"
      >{{ m.ch }}</text>
    </view>

    <!-- 大八卦：分隔线 + 三爻 + 卦名 -->
    <template v-for="b in parts.bagua" :key="`b${b.key}`">
      <view class="bagua-divider" :style="b.divStyle" />
      <view v-for="bar in b.bars" :key="`b${b.key}-${bar.key}`" class="cell cell-bar" :style="bar.style">
        <view v-if="bar.yang" class="yao-yang" />
        <template v-else>
          <view class="yao-yin" />
          <view class="yao-yin" />
        </template>
      </view>
      <view class="cell cell-bagua" :style="b.nameStyle">
        <text class="glyph bagua-name" :class="{ flip: b.flip }">{{ b.name }}</text>
      </view>
    </template>

    <!-- 坐向红虚线（锁定后） -->
    <view v-if="sittingIdx != null" class="sit-line" :style="sitLineStyle" />

    <!-- 中央天池 -->
    <view class="pool" :style="parts.poolStyle" />
    <view v-for="p in parts.poolLabels" :key="`p${p.key}`" class="cell cell-pool" :style="p.style">
      <text class="glyph pool-label" :class="{ 'pool-card': p.card }">{{ p.t }}</text>
    </view>

    <!-- 磁针：红针指盘面北（随盘对准地理北），深针指南 -->
    <view class="magnet magnet-n" :style="parts.needleStyle" />
    <view class="magnet magnet-s" :style="parts.needleSouthStyle" />
    <view class="hub" />
  </view>
</template>

<style scoped lang="scss">
/* 罗盘配色（V0 --luopan-* oklch → hex，小程序不支持 oklch） */
$lp-face1: #f9f3de;
$lp-line: #bfa27d;
$lp-red: #b5432f;
$lp-ink: #3d332a;
$lp-pool: #fdfaf0;

.rings {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
}

.circle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border: 1rpx solid $lp-line;
  border-radius: 50%;
}

.tick {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2rpx;
  background: $lp-line;
}
.tick-major {
  width: 2rpx;
  background: $lp-red;
}

/* 环形排布通用单元：定位由内联 transform 完成，内容 flex 居中 */
.cell {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.glyph {
  display: block;
  line-height: 1;
  white-space: nowrap;
}
.flip {
  transform: rotate(180deg);
}

.cell-degnum { width: 44rpx; height: 22rpx; }
.deg-num {
  font-size: 13rpx;
  font-family: monospace;
  color: $lp-red;
}

.cell-hex { width: 64rpx; height: 18rpx; }
.hex-name {
  font-size: 13rpx;
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  color: $lp-ink;
}
.hex-small { font-size: 9rpx; }

.cell-dragon { width: 44rpx; height: 14rpx; }
.dragon {
  font-size: 10rpx;
  color: $lp-ink;
}
.dragon-kong { color: $lp-line; }

.cell-needle { width: 44rpx; height: 26rpx; }
.needle-ch {
  font-size: 16rpx;
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  color: $lp-ink;
}

.band-divider {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1rpx;
  background: $lp-line;
}

.cell-mountain { /* 宽高由内联样式给出（红底铺满扇区近似矩形） */ }
.mountain-bg {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: $lp-red;
  border-radius: 4rpx;
  opacity: 0.92;
}
.mountain-ch {
  position: relative;
  font-size: 24rpx;
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  color: $lp-ink;
}
.mountain-tian { color: $lp-face1; }
.mountain-bold { font-weight: 700; }

.bagua-divider {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1rpx;
  background: $lp-line;
}
.cell-bar {
  width: 36rpx;
  height: 5rpx;
  justify-content: space-between;
}
.yao-yang {
  width: 100%;
  height: 5rpx;
  border-radius: 2rpx;
  background: $lp-ink;
}
.yao-yin {
  width: 40%;
  height: 5rpx;
  border-radius: 2rpx;
  background: $lp-ink;
}
.cell-bagua { width: 52rpx; height: 36rpx; }
.bagua-name {
  font-size: 27rpx;
  font-weight: 700;
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
  color: $lp-red;
}

.sit-line {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  border-left: 3rpx dashed $lp-red;
  opacity: 0.9;
}

.pool {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: $lp-pool;
  border: 2rpx solid $lp-line;
  border-radius: 50%;
}
.cell-pool { width: 52rpx; height: 22rpx; }
.pool-label {
  font-size: 11rpx;
  color: $lp-line;
  font-family: Georgia, 'Songti SC', 'SimSun', serif;
}
.pool-card {
  font-size: 18rpx;
  font-weight: 700;
  color: $lp-ink;
}

/* 磁针（CSS 三角）：北针红、南针墨，基座在盘心 */
.magnet {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  border-left: 10rpx solid transparent;
  border-right: 10rpx solid transparent;
}
.magnet-n {
  border-bottom-style: solid;
  border-bottom-color: $lp-red;
  transform: translate(-50%, -100%);
}
.magnet-s {
  border-top-style: solid;
  border-top-color: $lp-ink;
  transform: translate(-50%, 0);
}
.hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: $lp-red;
  transform: translate(-50%, -50%);
}
</style>
