<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/qimen/result</text>
    </view>
        <view class="bg-card border-t border-border shadow-lg">
          <view class="p-4 space-y-3">
            <view class="flex items-center justify-between">
              <text class="text-lg font-bold text-primary">{{ PALACE_NAMES[palace] }}</text>
              <view class="v0-btn" @click={{ onClose }} class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors"><X class="w-5 h-5" /></view>
            </view>
            <view class="text-sm text-foreground leading-relaxed bg-secondary/30 rounded-lg p-3">
              <text class="text-primary font-semibold">{{ PALACE_NAMES[palace] }}</text>：
              先天宫为{{ xiantianGong[palace] }}宫。取数：{{ nums(palace) }}。地支：{{ dizhi[palace] }}。
            </view>
            
    <view v-for="(c, i) in combos" :key="i"> (
              <view key={i} class="border-t border-border/50 pt-3">
                <text class="text-primary font-semibold">{{ c.l }}</text>：
                <text class="text-sm text-foreground leading-relaxed">{GEJU_MEANINGS[c.k] || "此格局需结合用神具体分析。"}</text>
              </view>
            ))}
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6] // 洛书九宫: 巽离坤/震中兑/艮坎乾
const PALACE_NAMES = ["", "坎1宫", "坤2宫", "震3宫", "巽4宫", "中5宫", "乾6宫", "兑7宫", "艮8宫", "离9宫"]
const BASHEN = ["", "值符", "腾蛇", "太阴", "六合", "勾陈", "太常", "九地", "九天", "朱雀"]
const JIUXING = ["", "天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"]
const BAMEN = ["", "休门", "死门", "伤门", "杜门", "中门", "开门", "惊门", "生门", "景门"]
const DIPAN_SHEN = ["", "常", "符", "阴", "合", "", "天", "地", "蛇", "雀"]
const CHANGSHENG = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]
const PALACE_DIZHI: Record<number, string[]> = {
const GEJU_MEANINGS: Record<string, string> = {
  const tiangan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]

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