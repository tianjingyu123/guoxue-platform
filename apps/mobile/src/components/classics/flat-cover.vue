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
  /** 标题字号类，对齐原型 titleClassName */
  titleSize?: string
}>(), {
  coverColor: 'cream',
  titleSize: '36rpx',
})

const c = computed(() => COVER_PALETTE[props.coverColor])
const cleanTitle = computed(() => (props.title || '').replace(/[《》]/g, ''))
// ≤4字用窄宽度实现 2+2 方块排版
const titleMaxWidth = computed(() => (cleanTitle.value.length === 4 ? '2.4em' : 'none'))
</script>

<template>
  <view
    class="flat-cover"
    :style="{ background: `linear-gradient(150deg, ${c.from}, ${c.to})` }"
  >
    <!-- 顶部小标签 -->
    <text
      v-if="label"
      class="fc-label"
      :style="{ color: c.title, backgroundColor: 'rgba(255,255,255,0.16)' }"
    >{{ label }}</text>
    <text v-else class="fc-spacer" />

    <!-- 标题 - 横排，位置可控 -->
    <view class="fc-title-wrap">
      <text
        class="fc-title"
        :style="{ color: c.title, fontSize: titleSize, maxWidth: titleMaxWidth }"
      >{{ cleanTitle }}</text>
    </view>

    <!-- 底部副信息 + 细装饰线 -->
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
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}
.fc-label {
  align-self: flex-start;
  font-size: 20rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.fc-spacer {
  display: block;
  height: 1rpx;
}
.fc-title-wrap {
  flex: 1;
  display: flex;
  align-items: center;
}
.fc-title {
  font-family: 'Songti SC', 'STSong', serif;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 3rpx;
}
.fc-footer-wrap {
  display: flex;
  flex-direction: column;
}
.fc-accent {
  width: 28rpx;
  height: 1rpx;
  margin-bottom: 6rpx;
}
.fc-footer {
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
