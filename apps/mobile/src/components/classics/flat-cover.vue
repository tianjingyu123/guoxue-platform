<script setup lang="ts">
import { computed } from 'vue'
import { COVER_PALETTE, type CoverColor } from '@/lib/classics-cover'

const props = withDefaults(defineProps<{
  title: string
  /** 朝代/作者等顶部小标签 */
  label?: string
  /** 底部副信息（作者） */
  footer?: string
  coverColor?: CoverColor
  /** 标题字号基准，竖排时按书名长度自适应缩放 */
  titleSize?: string
}>(), {
  coverColor: 'cream',
  titleSize: '36rpx',
})

const c = computed(() => COVER_PALETTE[props.coverColor])
const isLight = computed(() => props.coverColor === 'cream')
const cleanTitle = computed(() => (props.title || '').replace(/[《》]/g, ''))

// 极少数超长书名截断，避免竖排溢出封面
const displayTitle = computed(() =>
  cleanTitle.value.length > 11 ? cleanTitle.value.slice(0, 10) + '…' : cleanTitle.value,
)

// 竖排题签：书名越长字号越小，保证一列竖排始终优雅落在封面内（彻底告别横排换行）
const titleStyle = computed(() => {
  const base = parseFloat(props.titleSize) || 36
  const len = displayTitle.value.length
  const scale = len <= 4 ? 1 : len <= 6 ? 0.84 : len <= 8 ? 0.7 : 0.6
  return { color: c.value.title, fontSize: `${Math.round(base * scale)}rpx` }
})

// 题签底色：浅色封面用墨色淡纹，深色封面用素白淡纹
const plateStyle = computed(() => ({
  background: isLight.value ? 'rgba(90,67,38,0.06)' : 'rgba(255,255,255,0.10)',
  borderColor: isLight.value ? 'rgba(90,67,38,0.14)' : 'rgba(255,255,255,0.20)',
}))
const labelStyle = computed(() => ({
  color: c.value.title,
  background: isLight.value ? 'rgba(90,67,38,0.10)' : 'rgba(255,255,255,0.16)',
}))
</script>

<template>
  <view
    class="flat-cover"
    :style="{ background: `linear-gradient(150deg, ${c.from}, ${c.to})` }"
  >
    <!-- 顶部小标签（朝代） -->
    <view class="fc-top">
      <text v-if="label" class="fc-label" :style="labelStyle">{{ label }}</text>
    </view>

    <!-- 竖排题签书名（古籍封面灵魂） -->
    <view class="fc-plate-wrap">
      <view class="fc-plate" :style="plateStyle">
        <text class="fc-title" :style="titleStyle">{{ displayTitle }}</text>
      </view>
    </view>

    <!-- 底部作者 + 细装饰线 -->
    <view class="fc-footer-wrap">
      <view class="fc-accent" :style="{ backgroundColor: c.accent }" />
      <text v-if="footer" class="fc-footer" :style="{ color: c.sub }">{{ footer }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.flat-cover {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 18rpx 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}
.fc-top {
  min-height: 30rpx;
}
.fc-label {
  display: inline-block;
  font-size: 18rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.fc-plate-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
/* 题签条：居中竖排，模拟线装书封面贴签 */
.fc-plate {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 100%;
  padding: 18rpx 8rpx;
  border: 1rpx solid;
  border-radius: 6rpx;
}
.fc-title {
  writing-mode: vertical-rl;
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 4rpx;
  max-height: 100%;
}
.fc-footer-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.fc-accent {
  width: 24rpx;
  height: 2rpx;
  margin-bottom: 6rpx;
}
.fc-footer {
  font-size: 20rpx;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
