<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
const opening = ref(false)
const failed = ref(false)
// 兼容收藏及历史地址，不保留第二份传感器实现。
function openCompass() {
  if (opening.value) return
  opening.value = true
  failed.value = false
  uni.redirectTo({ url: '/pkg-common/compass/index', fail: () => {
    opening.value = false
    failed.value = true
  } })
}
onLoad(openCompass)
</script>
<template>
  <view>
    <tool-header title="电子罗盘" />
    <view class="entry-status" role="status">
      <text>{{ failed ? '电子罗盘暂时未能打开，请重试或返回' : '正在打开电子罗盘…' }}</text>
      <button v-if="failed" :disabled="opening" @tap="openCompass">重新打开</button>
    </view>
  </view>
</template>
<style scoped>
.entry-status { padding: 32rpx; text-align: center; }
</style>
