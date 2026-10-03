<script setup lang="ts">
/**
 * 罗盘盘体（旋转壳）——自 V0 components/luopan/luopan-plate.tsx 还原
 * 外壳 + 盘面渐变在本层；圈层内容在 plate-rings（静态，不随朝向重渲染），
 * 高频指南针更新只改本层 .rotor 的 transform（GPU 合成，子树零 diff）。
 *
 * heading 传「连续累计角」而非归一化角：359°→0° 时若直接归一化，
 * CSS transition 会反向倒转一整圈，累计角保证始终走最短路径。
 */
import { computed } from 'vue'
import PlateRings from './plate-rings.vue'
import type { PlateStyle } from '@/pkg-paipan3/lib/luopan-data'

const props = withDefaults(
  defineProps<{
    plateStyle: PlateStyle
    /** 连续累计朝向角（度）；盘体反向旋转使盘面北对准地理北 */
    heading: number
    locked?: boolean
    /** 锁定后高亮坐山（红虚线） */
    sittingIdx?: number | null
  }>(),
  { locked: false, sittingIdx: null },
)

const rotorStyle = computed(() => `transform:rotate(${-props.heading}deg);`)
</script>

<template>
  <view class="plate" :class="{ 'plate-locked': locked }">
    <view class="rotor" :style="rotorStyle">
      <plate-rings :plate-style="plateStyle" :sitting-idx="sittingIdx" />
    </view>
    <!-- 顶部固定指针：机顶朝向标记（不随盘旋转） -->
    <view class="pointer" :class="{ 'pointer-locked': locked }" />
  </view>
</template>

<style scoped lang="scss">
.plate {
  position: relative;
  box-sizing: border-box;
  width: 640rpx;
  height: 640rpx;
  border-radius: 50%;
  /* V0 --luopan-face-1/2/3 + rim（oklch → hex） */
  background: radial-gradient(circle at 50% 42%, #f9f3de 0%, #f2e6c8 72%, #e6cfa0 100%);
  border: 5rpx solid #8a5a33;
  box-shadow: 0 16rpx 48rpx rgba(61, 51, 42, 0.18);
}
.plate-locked {
  border-color: var(--brand, #b5432f);
}
.rotor {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  transition: transform 0.12s linear;
}
.pointer {
  position: absolute;
  left: 50%;
  top: 6rpx;
  width: 0;
  height: 0;
  margin-left: -13rpx;
  border-left: 13rpx solid transparent;
  border-right: 13rpx solid transparent;
  border-bottom: 27rpx solid #b5432f;
}
.pointer-locked {
  border-bottom-color: var(--brand, #b5432f);
}
</style>
