<template>
  <view class="ziwei-board">
    <!-- 头部 -->
    <view class="board-header" v-if="wuXingJu || (geShi?.length)">
      <text class="wuxing-ju" v-if="wuXingJu">{{ wuXingJu }}</text>
      <text class="ge-tag" v-for="g in geShi" :key="g">{{ g }}</text>
    </view>

    <!-- 四化 -->
    <view class="sihua-bar" v-if="siHuaList.length">
      <text v-for="s in siHuaList" :key="s.label" class="sihua-item" :class="s.cls">
        {{ s.label }}：{{ s.value }}
      </text>
    </view>

    <!-- 12宫网格 4列x4行 -->
    <view class="gong-grid">
      <view
        v-for="cell in grid"
        :key="cell.name"
        class="gong-cell"
        :class="{ 'is-ming': cell.name === '命宫', 'is-shen': cell.name === (shenGong||'') }"
      >
        <view class="gong-header">
          <text class="gong-name">{{ cell.name }}</text>
          <text v-if="cell.name === (shenGong||'')" class="shen-badge">身</text>
          <text v-if="cell.gong" class="gong-zhi">{{ cell.gong.zhi }}</text>
        </view>
        <view class="gong-stars" v-if="cell.gong?.stars?.length">
          <text
            v-for="star in cell.gong.stars.slice(0,4)"
            :key="star.name"
            class="star-tag"
            :style="{ color: starClr(star) }"
          >{{ star.name }}</text>
        </view>
        <view class="gong-info" v-if="cell.gong">
          <text class="gong-gan">{{ cell.gong.gan }}</text>
          <text class="gong-age">{{ cell.gong.daXianStart }}-{{ cell.gong.daXianEnd }}岁</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Star { name: string; type?: string; wuXing?: string; liangJi?: string }
interface Gong { name: string; zhi?: string; gan?: string; stars: Star[]; daXianStart?: number; daXianEnd?: number }
interface SiHua { huaLu?: string; huaQuan?: string; huaKe?: string; huaJi?: string }

const props = defineProps<{
  gongWei: Gong[]; mingGong?: Gong; siHua?: SiHua; shenGong?: string; wuXingJu?: string; geShi?: string[]
}>()

const grid = computed(() => {
  const order = ['财帛','子女','夫妻','疾厄','命宫','兄弟','迁移','父母','交友','官禄','田宅','福德']
  return order.map(name => ({
    name,
    gong: props.gongWei?.find(g => g.name === name) || null,
  }))
})

const siHuaList = computed(() => {
  const s = props.siHua
  if (!s) return []
  return [
    { label:'化禄', value:s.huaLu, cls:'sihua-lu' },
    { label:'化权', value:s.huaQuan, cls:'sihua-quan' },
    { label:'化科', value:s.huaKe, cls:'sihua-ke' },
    { label:'化忌', value:s.huaJi, cls:'sihua-ji' },
  ].filter(x => x.value)
})

function starClr(s: Star) {
  if (s.liangJi === '吉') return '#52C41A'
  if (s.liangJi === '凶') return '#FF4D4F'
  const m: Record<string,string> = { '金':'#FA8C16','木':'#52C41A','水':'#4A90D9','火':'#C41E3A','土':'#C9A96E' }
  return m[s.wuXing||''] || '#666'
}
</script>

<style scoped>
.ziwei-board { background:#fff; border-radius:24rpx; padding:20rpx; margin:16rpx; box-shadow:0 2px 12px rgba(139,69,19,.06); }

.board-header { display:flex; gap:12rpx; margin-bottom:16rpx; }
.wuxing-ju { font-size:28rpx; font-weight:600; color:#2C2C2C; }
.ge-tag { font-size:20rpx; padding:4rpx 12rpx; background:rgba(196,30,58,.08); color:#C41E3A; border-radius:16rpx; }

.sihua-bar { display:flex; justify-content:space-around; padding:12rpx; background:#FAFAFA; border-radius:12rpx; margin-bottom:16rpx; }
.sihua-item { font-size:24rpx; }
.sihua-lu { color:#52C41A; } .sihua-quan { color:#722ED1; }
.sihua-ke { color:#4A90D9; } .sihua-ji { color:#FF4D4F; }

.gong-grid { display:flex; flex-wrap:wrap; gap:6rpx; }
.gong-cell {
  width:calc(25% - 5rpx); min-height:120rpx; padding:8rpx 6rpx;
  background:rgba(245,241,235,.4); border:1rpx solid #E8E0D5; border-radius:8rpx;
}
.gong-cell.is-ming { border-color:#C41E3A; border-width:2rpx; background:rgba(196,30,58,.03); }
.gong-cell.is-shen { box-shadow:inset 0 0 0 1px #C9A96E; }

.gong-header { display:flex; align-items:center; gap:4rpx; margin-bottom:4rpx; }
.gong-name { font-size:24rpx; font-weight:600; color:#2C2C2C; }
.shen-badge { font-size:16rpx; padding:2rpx 6rpx; background:#C9A96E; color:#fff; border-radius:6rpx; }
.gong-zhi { font-size:20rpx; color:#666; margin-left:auto; }

.gong-stars { display:flex; flex-wrap:wrap; gap:2rpx; margin-bottom:4rpx; }
.star-tag { font-size:18rpx; font-weight:500; }

.gong-info { display:flex; justify-content:space-between; font-size:18rpx; color:#999; }
</style>
