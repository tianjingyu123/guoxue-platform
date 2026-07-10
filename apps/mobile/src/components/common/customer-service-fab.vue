<script setup lang="ts">
/**
 * 鍏ㄥ眬鏅鸿兘瀹㈡湇鎮诞鎸夐挳锛團AB锛夈€?
 * 鐥呯伓锛氬鏈嶅彧鑳戒粠棣栭〉 Header 杩涳紝娣卞眰椤甸潰鐢ㄦ埛姹傚姪鏃犻棬銆?
 * 娉ㄦ剰锛歶ni-app App.vue 鏃犺鍥惧眰锛屾湰缁勪欢闇€鍦ㄥ悇涓昏椤甸潰寮曞叆锛堝缓璁皝瑁呰繘椤甸潰鍩虹甯冨眬鎴栭€愰〉鏀撅級銆?
 *
 * 鐢ㄦ硶锛?customer-service-fab />   鏀惧湪椤甸潰鏍?view 鍐呭嵆鍙€?
 */
import { navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'

withDefaults(defineProps<{
  /** 璺濆簳閮ㄨ窛绂伙紙rpx锛夛紝閬垮紑 tabBar/鎿嶄綔鏍?*/
  bottom?: number
}>(), {
  bottom: 180,
})

function onTap() {
  navigateTo('/customer-service')
}

// 搴斾骇鍝佽姹傚叏灞€闅愯棌鎮诞瀹㈡湇鍏ュ彛锛堢湡鏈轰笂鎮诞閬尅鍐呭路纰嶄簨锛夈€?
// 淇濈暀缁勪欢涓庡悇椤?<customer-service-fab /> 寮曠敤锛屼究浜庡悗缁敼涓洪潪鎮诞鍏ュ彛鎴栦竴閿仮澶嶃€?
const visible = false
</script>

<template>
  <view
    v-if="visible"
    class="cs-fab btn-press"
    :style="{ bottom: bottom + 'rpx' }"
    @tap="onTap"
  >
    <AppIcon name="message-circle" :size="40" color="#FFFFFF" />
  </view>
</template>

<style scoped lang="scss">
.cs-fab {
  position: fixed;
  right: 24rpx;
  z-index: $z-overlay;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  @include flex-center;
  background: linear-gradient(135deg, var(--brand), var(--gugong-red-soft, #d94452));
  box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.35);
}
</style>
