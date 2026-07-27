<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import type { CaseMethod } from '@/pkg-paipan/lib/case-data'

const props = defineProps<{ method: Exclude<CaseMethod, 'ALL'> }>()
const copy = computed(() => ({
  BAZI: { eyebrow: '八字视角', title: '用真实人生经历检验这张盘', desc: '先断后看答案，也可切换紫微与命理视角交叉印证。' },
  ZIWEI: { eyebrow: '紫微视角', title: '同一档案，换十二宫再看一次', desc: '完整生辰案例可直接重起紫微盘，答案仍是同一份真实经历。' },
  MINGLI: { eyebrow: '命理研习', title: '把盘面判断放回真实人生', desc: '跨八字、紫微与命理视角复盘，不重复造案例、不伪造答案。' },
}[props.method]))

function openLibrary() {
  navigateTo(`/pkg-paipan/cases/index?method=${props.method}`)
}
</script>

<template>
  <view class="case-entry" @tap="openLibrary">
    <view class="case-mark"><AppIcon name="book-open" :size="22" color="#C41E3A" /></view>
    <view class="case-copy">
      <text class="case-eyebrow">{{ copy.eyebrow }} · 真实案例库</text>
      <text class="case-title">{{ copy.title }}</text>
      <text class="case-desc">{{ copy.desc }}</text>
    </view>
    <view class="case-action">
      <text class="case-action-txt">去练手</text>
      <AppIcon name="chevron-right" :size="15" color="#C41E3A" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.case-entry { position: relative; display: flex; align-items: flex-start; gap: 16rpx; margin: 24rpx 0; padding: 24rpx; overflow: hidden; border-radius: 18rpx; background: linear-gradient(135deg, #fffaf3 0%, #fff 62%, #f7eef0 100%); border: 1rpx solid rgba(196, 30, 58, 0.16); box-shadow: 0 10rpx 28rpx rgba(83, 49, 37, 0.06); }
.case-entry::after { content: ''; position: absolute; right: -34rpx; top: -42rpx; width: 130rpx; height: 130rpx; border: 1rpx solid rgba(196, 30, 58, 0.09); border-radius: 50%; }
.case-mark { position: relative; z-index: 1; width: 60rpx; height: 72rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 8rpx 14rpx 14rpx 8rpx; background: rgba(196, 30, 58, 0.08); border-left: 5rpx solid #c41e3a; }
.case-copy { position: relative; z-index: 1; flex: 1; min-width: 0; }
.case-eyebrow { display: block; font-size: 19rpx; letter-spacing: 2rpx; color: #a6342c; }
.case-title { display: block; margin-top: 7rpx; font-size: 27rpx; font-weight: 700; color: #3a2a1e; }
.case-desc { display: block; margin-top: 7rpx; font-size: 21rpx; line-height: 1.55; color: #8d7c6e; }
.case-action { position: relative; z-index: 1; align-self: center; display: flex; align-items: center; flex-shrink: 0; }
.case-action-txt { font-size: 21rpx; font-weight: 700; color: #c41e3a; }
</style>