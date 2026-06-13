<template>
  <view class="page" data-v0-route="manage/live">
    <!-- component:badge -->已结束<!-- /component:badge -->
          case "scheduled":
            return <!-- component:badge -->待开播<!-- /component:badge -->
          case "draft":
            return <!-- component:badge -->草稿<!-- /component:badge -->
          default:
            return null
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>