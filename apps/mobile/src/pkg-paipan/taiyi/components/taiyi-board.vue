<script setup lang="ts">
/**
 * 太乙十六神盘（自 V0 app/taiyi/result/page.tsx 内 TaiyiPan SVG 还原）
 * 取舍：V0 为同心圆 SVG（洛书数/支位/十六神/落宫星四圈层）；小程序无 SVG 且
 *       X5 红线禁 writing-mode/aspect-ratio，改为 5×5 方形宫格环（借鉴紫微十二宫盘手法）：
 *       外环 16 格 = 十六神槽位（子居正上、顺时针一圈，艮巽坤乾恰落四角），
 *       中央 3×3 = 中宫（入中宫之星 + 星色图例）。
 *       圈层信息折叠进单元格：支位/卦名 + 十六神名 + 洛书宫数 + 落宫星。
 *       多槽宫（8/4/2/6 宫各占三槽）的落宫星统一显示在四维角格（V0 显示在首槽，角格更宽裕）。
 */
import { computed } from 'vue'
import { GOD16, SLOT16, SLOT_PALACE, type TaiyiResult } from '@/pkg-paipan/lib/taiyi-engine'

const props = defineProps<{ r: TaiyiResult }>()

interface StarChip { name: string; color: string }

const CORNERS = ['艮', '巽', '坤', '乾']
const NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 槽位序 → 5×5 宫格坐标（子居正上，顺时针；艮=右上角 巽=右下角 坤=左下角 乾=左上角） */
const SLOT_POS = [
  { c: 3, r: 1 }, // 子
  { c: 4, r: 1 }, // 丑
  { c: 5, r: 1 }, // 艮
  { c: 5, r: 2 }, // 寅
  { c: 5, r: 3 }, // 卯
  { c: 5, r: 4 }, // 辰
  { c: 5, r: 5 }, // 巽
  { c: 4, r: 5 }, // 巳
  { c: 3, r: 5 }, // 午
  { c: 2, r: 5 }, // 未
  { c: 1, r: 5 }, // 坤
  { c: 1, r: 4 }, // 申
  { c: 1, r: 3 }, // 酉
  { c: 1, r: 2 }, // 戌
  { c: 1, r: 1 }, // 乾
  { c: 2, r: 1 }, // 亥
]

/** 每宫落星的显示槽位：单槽宫在本格，三槽宫收拢到四维角格 */
const PALACE_DISPLAY_SLOT: Record<number, number> = { 1: 0, 8: 2, 3: 4, 4: 6, 9: 8, 2: 10, 7: 12, 6: 14 }

/** 星色（同 V0）：太乙绿 · 文昌赭 · 始击朱 · 将星/五福墨灰 */
const COLOR_TAIYI = '#15803d'
const COLOR_WENCHANG = '#b45309'
const COLOR_SHIJI = '#b91c1c'
const COLOR_JIANG = '#374151'

const LEGEND: StarChip[] = [
  { name: '太乙', color: COLOR_TAIYI },
  { name: '文昌', color: COLOR_WENCHANG },
  { name: '始击', color: COLOR_SHIJI },
  { name: '将星·五福', color: COLOR_JIANG },
]

/** 各宫落星 + 入中宫之星 */
const computedStars = computed(() => {
  const r = props.r
  const byPalace: Record<number, StarChip[]> = {}
  const center: StarChip[] = []
  const push = (gong: number, name: string, color: string) => {
    if (gong === 5) {
      center.push({ name, color })
      return
    }
    if (!byPalace[gong]) byPalace[gong] = []
    byPalace[gong].push({ name, color })
  }
  push(r.taiyiPalace, '太乙', COLOR_TAIYI)
  push(r.wenchang.palace, '文昌', COLOR_WENCHANG)
  push(r.shiji.palace, '始击', COLOR_SHIJI)
  push(r.zhuDaJiang, '主大', COLOR_JIANG)
  push(r.zhuCanJiang, '主参', COLOR_JIANG)
  push(r.keDaJiang, '客大', COLOR_JIANG)
  push(r.keCanJiang, '客参', COLOR_JIANG)
  push(r.wuFu, '五福', COLOR_JIANG)
  return { byPalace, center }
})

interface BoardCell {
  slot: string
  isCorner: boolean
  god: string
  palaceCn: string
  isJiShen: boolean
  stars: StarChip[]
  col: number
  row: number
}

const cells = computed<BoardCell[]>(() =>
  SLOT16.map((slot, i) => {
    const palace = SLOT_PALACE[slot]
    return {
      slot,
      isCorner: CORNERS.includes(slot),
      god: GOD16[slot],
      palaceCn: NUM_CN[palace],
      isJiShen: slot === props.r.jiShen,
      stars: PALACE_DISPLAY_SLOT[palace] === i ? computedStars.value.byPalace[palace] ?? [] : [],
      col: SLOT_POS[i].c,
      row: SLOT_POS[i].r,
    }
  }),
)
</script>

<template>
  <view class="board">
    <view
      v-for="cell in cells"
      :key="cell.slot"
      class="cell"
      :style="{ gridColumn: String(cell.col), gridRow: String(cell.row) }"
    >
      <text class="god">{{ cell.god }}</text>
      <text class="zhi" :class="{ 'zhi-corner': cell.isCorner, 'zhi-jishen': cell.isJiShen }">{{ cell.slot }}</text>
      <text class="palace-num">{{ cell.palaceCn }}宫</text>
      <view v-if="cell.stars.length" class="stars">
        <text v-for="st in cell.stars" :key="st.name" class="star" :style="{ color: st.color }">{{ st.name }}</text>
      </view>
    </view>

    <!-- 中宫：入中宫之星 + 图例 -->
    <view class="center" :style="{ gridColumn: '2 / 5', gridRow: '2 / 5' }">
      <text class="c-title">中宫</text>
      <view v-if="computedStars.center.length" class="c-stars">
        <text v-for="st in computedStars.center" :key="st.name" class="c-star" :style="{ color: st.color }">{{ st.name }}</text>
      </view>
      <text v-else class="c-empty">无星入中</text>
      <view class="c-legend">
        <view v-for="lg in LEGEND" :key="lg.name" class="lg-item">
          <view class="lg-dot" :style="{ background: lg.color }" />
          <text class="lg-text">{{ lg.name }}</text>
        </view>
      </view>
      <text class="c-hint">红字支位为计神所加</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
$serif: Georgia, 'Songti SC', serif;

.board {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(5, 172rpx);
  gap: 2rpx;
  background: var(--line);
  border: 2rpx solid rgba(201, 169, 110, 0.5);
  border-radius: 16rpx;
  overflow: hidden;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 8rpx 4rpx;
  background: var(--card);
  overflow: hidden;
}
.god { font-family: $serif; font-size: 20rpx; line-height: 1.2; color: var(--text-soft); }
.zhi { font-family: $serif; font-size: 30rpx; font-weight: 600; line-height: 1.2; color: var(--text-ink); }
.zhi-corner { color: #b91c1c; font-weight: 700; }
.zhi-jishen { color: #b91c1c; font-weight: 700; text-decoration: underline; }
.palace-num { font-family: $serif; font-size: 18rpx; line-height: 1.2; color: var(--text-soft); opacity: 0.75; }
.stars { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 2rpx 8rpx; }
.star { font-family: $serif; font-size: 20rpx; font-weight: 700; line-height: 1.3; }

/* 中宫 */
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  padding: 16rpx;
  background: var(--bg-paper);
  text-align: center;
  overflow: hidden;
}
.c-title { font-family: $serif; font-size: 32rpx; font-weight: 700; letter-spacing: 8rpx; color: var(--text-ink); }
.c-stars { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8rpx 20rpx; }
.c-star { font-family: $serif; font-size: 28rpx; font-weight: 700; }
.c-empty { font-family: $serif; font-size: 22rpx; color: var(--text-soft); }
.c-legend { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8rpx 20rpx; margin-top: 6rpx; }
.lg-item { display: flex; align-items: center; gap: 6rpx; }
.lg-dot { width: 14rpx; height: 14rpx; border-radius: 999rpx; }
.lg-text { font-size: 18rpx; color: var(--text-soft); }
.c-hint { font-size: 18rpx; color: var(--text-soft); opacity: 0.8; }
</style>
