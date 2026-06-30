<script setup lang="ts">
/**
 * 全平台统一搜索栏（含 AI 徽章）。
 * 病灶：统一搜索栏只挂首页，40+ 业务页各写各的搜索框、跳转/样式不一、无 AI 标识。
 * 解药：各页顶部统一用本组件，点击进入搜索中间页；按来源页传 defaultTab 智能选中默认结果 Tab。
 *
 * 用法：<search-bar placeholder="搜课程/商品/圈子" default-tab="course" />
 */
import { navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'

const props = withDefaults(defineProps<{
  placeholder?: string
  /** 来源页对应的结果默认 Tab（all/course/product/circle/article/ebook/agent/user） */
  defaultTab?: string
  /** 已选关键词回显（结果页顶部用） */
  keyword?: string
  /** 是否展示 AI 徽章 */
  ai?: boolean
}>(), {
  placeholder: '搜索平台全部内容',
  defaultTab: '',
  keyword: '',
  ai: true,
})

function onTap() {
  const q: string[] = []
  if (props.defaultTab) q.push(`tab=${props.defaultTab}`)
  if (props.keyword) q.push(`keyword=${encodeURIComponent(props.keyword)}`)
  navigateTo(`/search${q.length ? '?' + q.join('&') : ''}`)
}
</script>

<template>
  <view class="search-bar" @tap="onTap">
    <AppIcon name="search" :size="32" color="#999999" />
    <text class="search-bar__ph">{{ keyword || placeholder }}</text>
    <view v-if="ai" class="search-bar__ai">
      <AppIcon name="sparkles" :size="22" color="#9B7EC8" />
      <text class="search-bar__ai-text">AI</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.search-bar {
  display: flex;
  align-items: center;
  gap: $space-xs;
  height: 72rpx;
  padding: 0 $space-md;
  background: var(--surface-sunken);
  border-radius: $radius-full;
}
.search-bar__ph {
  flex: 1;
  font-size: $font-md;
  color: var(--text-soft);
  @include ellipsis;
}
.search-bar__ai {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: $radius-full;
  background: rgba(155, 126, 200, 0.12);
}
.search-bar__ai-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #9B7EC8;
}
</style>
