<script setup lang="ts">
/**
 * 节气 · 推荐（自 V0 components/jieqi/recommend-module.tsx 还原）
 * 应季好物（内容推荐，非交易）+ 相关课程 + B 端营销素材库（一键复制）
 * 取舍：V0 用 navigator.clipboard，小程序改 uni.setClipboardData（行为一致）。
 */
import { computed, ref } from 'vue'
import type { JieqiInfo } from '@/pkg-paipan/lib/jieqi-data'
import { SEASON_GOODS, SEASON_COURSES, marketingCopy, type Season } from '@/pkg-paipan/lib/jieqi-recommend'

const props = defineProps<{
  detail: JieqiInfo
  meta: { color: string; bg: string; desc: string }
}>()

const season = computed(() => props.detail.season as Season)
const goods = computed(() => SEASON_GOODS[season.value])
const courses = computed(() => SEASON_COURSES[season.value])
const copy = computed(() => marketingCopy(props.detail.name))

const copied = ref('')
function copyText(key: string, text: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = key
      uni.showToast({ title: '已复制', icon: 'none' })
      setTimeout(() => {
        if (copied.value === key) copied.value = ''
      }, 1800)
    },
  })
}
</script>

<template>
  <view class="rm">
    <!-- 应季好物 -->
    <view class="sec" :style="{ backgroundColor: meta.bg, borderColor: meta.color + '33' }">
      <text class="h3">应季好物</text>
      <text class="hint">顺应「{{ detail.name }}」时令的养生之选（内容推荐，非交易）</text>
      <view v-for="g in goods" :key="g.name" class="good">
        <text class="cat" :style="{ backgroundColor: meta.color }">{{ g.category }}</text>
        <view class="good-main">
          <text class="good-n">{{ g.name }}</text>
          <text class="good-r">{{ g.reason }}</text>
        </view>
      </view>
    </view>

    <!-- 相关课程 -->
    <view class="sec" :style="{ backgroundColor: meta.bg, borderColor: meta.color + '33' }">
      <text class="h3">相关课程</text>
      <text class="hint">系统学习{{ season }}季节气养生之道</text>
      <view v-for="c in courses" :key="c.title" class="course">
        <view class="course-hd">
          <text class="course-t">{{ c.title }}</text>
          <text class="level" :style="{ borderColor: meta.color + '55', color: meta.color }">{{ c.level }}</text>
        </view>
        <text class="course-d">{{ c.desc }}</text>
      </view>
    </view>

    <!-- B 端营销素材 -->
    <view class="sec" :style="{ backgroundColor: meta.bg, borderColor: meta.color + '33' }">
      <text class="h3">营销素材库 · 讲师版</text>
      <text class="hint">一键复制，用于社群、朋友圈、公众号推广</text>

      <view v-for="(h, i) in copy.hooks" :key="h" class="hook" @tap="copyText('hook-' + i, h)">
        <text class="hook-t">{{ h }}</text>
        <text class="hook-ico" :style="{ color: copied === 'hook-' + i ? meta.color : '#8a7a68' }">
          {{ copied === 'hook-' + i ? '✓' : '⧉' }}
        </text>
      </view>

      <view class="long">
        <view class="long-hd">
          <text class="long-t">推广长文案</text>
          <view class="copy-btn" :style="{ backgroundColor: meta.color }" @tap="copyText('long', copy.longCopy)">
            <text class="copy-btn-t">{{ copied === 'long' ? '已复制' : '复制' }}</text>
          </view>
        </view>
        <text class="long-p">{{ copy.longCopy }}</text>
      </view>

      <view class="chips">
        <text v-for="t in copy.tags" :key="t" class="tag" :style="{ color: meta.color }">{{ t }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.rm {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.sec {
  padding: 28rpx;
  border: 1rpx solid;
  border-radius: 32rpx;
}
.h3 {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3d2f22;
}
.hint {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #8a7a68;
}
.good {
  display: flex;
  gap: 14rpx;
  margin-top: 14rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: #fff;
}
.cat {
  flex-shrink: 0;
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 700;
  color: #fff;
}
.good-main {
  flex: 1;
}
.good-n {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #3d2f22;
}
.good-r {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #8a7a68;
}
.course {
  margin-top: 14rpx;
  padding: 20rpx;
  border-radius: 14rpx;
  background: #fff;
}
.course-hd {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.course-t {
  font-size: 26rpx;
  font-weight: 700;
  color: #3d2f22;
}
.level {
  padding: 2rpx 12rpx;
  border: 1rpx solid;
  border-radius: 999rpx;
  font-size: 18rpx;
}
.course-d {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #8a7a68;
}
.hook {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 12rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: #fff;
}
.hook-t {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.7;
  color: #3d2f22;
}
.hook-ico {
  flex-shrink: 0;
  font-size: 24rpx;
}
.long {
  margin-top: 14rpx;
  padding: 20rpx;
  border-radius: 14rpx;
  background: #fff;
}
.long-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.long-t {
  font-size: 24rpx;
  font-weight: 700;
  color: #3d2f22;
}
.copy-btn {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
}
.copy-btn-t {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
}
.long-p {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  line-height: 1.8;
  color: #8a7a68;
  white-space: pre-wrap;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}
.tag {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: #fff;
  font-size: 21rpx;
}
</style>
