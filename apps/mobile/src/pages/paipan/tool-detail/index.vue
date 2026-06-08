<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/[toolId]</text>
    </view>
              <view key={{ key }}>
                <text class="text-sm font-medium text-foreground mb-2 block">
                  {{ field.label }}
                  <template v-if="isRequired">
    text class="text-destructive ml-1">*</text>}
                </text>
                {field.values && field.values.length <= 3 ? (
                  // 少量选项用按钮组
                  <view class="flex gap-3">
                    {field.values.map(option => (
                      <view class="v0-btn"
                        key={{ option.value }}
                        type="button"
                        @click={() => updateField(key, option.value)}
                        class={cn(
                          "flex-1 py-3 rounded-xl border-2 transition-colors",
                          value === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {{ option.label }}
                      </view>
                    ))}
                  </view>
                ) : (
                  // 多选项用下拉
                  <view class="relative">
                    <select
                      value={value as string || ''}
                      @change={(e) => updateField(key, e.target.value)}
                      class="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                    >
                      <option value="">{field.placeholder || `请选择${field.label}`}</option>
                      {field.values?.map(option => (
                        <option key={option.value} value={{ option.value }}>
                          {{ option.label }}
                        </option>
                      ))}
                    </select>
                    <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  </view>
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
const toolNames: Record<string, string> = {
const elementColors: Record<string, string> = {
      const defaults: Record<string, string | number | boolean> = {}
            const names: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" }
            const colors: Record<string, string> = { wood: "bg-green-500", fire: "bg-red-500", earth: "bg-yellow-600", metal: "bg-gray-400", water: "bg-blue-500" }

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