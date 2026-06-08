<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">兴趣引导</text>
      <text class="v0-route">V0: interests-guide</text>
    </view>
        <view class="v0-btn"
          @click={() => !disabled && onToggle(tag.id)}
          class={cn(
            "relative flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all duration-200 active:scale-95",
            selected
              ? "bg-[#C41E3A] border-[#C41E3A] shadow-[0_2px_12px_rgba(196,30,58,0.3)]"
              : disabled
              ? "bg-white/50 border-[#E8E0D5] opacity-50 cursor-not-allowed"
              : "bg-white border-[#E8E0D5] hover:border-[#C41E3A]/40 hover:shadow-sm"
          )}
        >
          <text class="text-base leading-none">{{ tag.icon }}</text>
          <text
            class={cn(
              "text-[13px] font-medium leading-none",
              selected ? "text-white" : "text-[#2C2C2C]"
            )}
          >
            {{ tag.name }}
          </text>
          {selected && (
            <text class="flex items-center justify-center w-4 h-4 rounded-full bg-white/25">
              <Check class="w-2.5 h-2.5 text-white" strokeWidth={{ 3 }} />
            </text>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const FALLBACK_TAGS: InterestTag[] = [

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>