<template>
  <!--
    节气日横幅：自包含拉取 /solar-term/today；仅 isSolarTermDay 时渲染（非节气日整体不显示·诚实降级）。
    点击进入节气仪式页。拉取失败/非节气日均不渲染，不打扰首页主流程。
  -->
  <view v-if="term" class="st-banner" @tap="goRitual">
    <view class="st-left">
      <text class="st-tag">今日节气</text>
      <text class="st-name">{{ term.name }}</text>
    </view>
    <view class="st-mid">
      <text class="st-poem">{{ term.poem }}</text>
      <text class="st-sub">{{ myParticipated ? '今日已参与 · 查看节气仪式' : '参与今日节气 · 得限定成就' }}</text>
    </view>
    <text class="st-arrow">›</text>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { solarTermApi, type SolarTermCurrent } from '@/lib/solar-term-data'

const term = ref<SolarTermCurrent | null>(null)
const myParticipated = ref(false)

onMounted(async () => {
  try {
    const res = await solarTermApi.today()
    // 仅节气日且有当期内容才展示
    term.value = res.isSolarTermDay && res.current ? res.current : null
    myParticipated.value = res.myParticipated
  } catch {
    // 拉取失败整体不渲染
    term.value = null
  }
})

function goRitual() {
  navigateTo('/pkg-poetry/solar-term/index')
}
</script>

<style scoped lang="scss">
.st-banner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 0 32rpx 24rpx;
  padding: 24rpx 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #f6efe2 0%, #efe3cf 100%);
  border: 1rpx solid #e7d9c0;
  box-shadow: 0 6rpx 20rpx rgba(139, 107, 74, 0.08);
}
.st-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding-right: 24rpx;
  border-right: 1rpx solid #e2d3ba;
}
.st-tag {
  font-size: 22rpx;
  color: #a8895f;
}
.st-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #8b5a2b;
  line-height: 1.1;
}
.st-mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.st-poem {
  font-size: 27rpx;
  color: #6b5b45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-sub {
  font-size: 23rpx;
  color: #b08a55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-arrow {
  flex-shrink: 0;
  font-size: 40rpx;
  color: #c4a878;
}
</style>
