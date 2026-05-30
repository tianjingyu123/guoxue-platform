<template>
  <view class="page">
    <view class="section">
      <text class="label">内容类型</text>
      <view class="options">
        <view v-for="t in types" :key="t" class="opt" :class="{ active: filters.type === t }" @click="filters.type = t">{{ t }}</view>
      </view>
    </view>
    <view class="section">
      <text class="label">时间范围</text>
      <view class="options">
        <view v-for="r in ranges" :key="r.key" class="opt" :class="{ active: filters.range === r.key }" @click="filters.range = r.key">{{ r.label }}</view>
      </view>
    </view>
    <view class="section">
      <text class="label">排序</text>
      <view class="options">
        <view v-for="s in sorts" :key="s.key" class="opt" :class="{ active: filters.sort === s.key }" @click="filters.sort = s.key">{{ s.label }}</view>
      </view>
    </view>
    <button class="btn-search" @click="doSearch">搜索</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { searchApi } from '../../api'

const q = ref((getCurrentPages().pop()?.options || {}).q || '')
const types = ['全部', '文章', '课程', '圈子', '古籍']
const ranges = [{ key: 'all', label: '不限' }, { key: 'day', label: '最近一天' }, { key: 'week', label: '最近一周' }, { key: 'month', label: '最近一月' }]
const sorts = [{ key: 'relevance', label: '相关度' }, { key: 'newest', label: '最新' }, { key: 'hottest', label: '最热' }]
const filters = reactive({ type: '全部', range: 'all', sort: 'relevance' })

async function doSearch() {
  const type = filters.type === '全部' ? undefined : filters.type
  uni.navigateTo({ url: `/pages/search/result?q=${encodeURIComponent(q.value)}&type=${type || ''}` })
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.label { font-size: 14px; font-weight: 500; display: block; margin-bottom: 8px; }
.options { display: flex; flex-wrap: wrap; gap: 8px; }
.opt { padding: 6px 14px; background: #F5F0E8; border-radius: 14px; font-size: 12px; color: #666; }
.opt.active { background: #C41E3A; color: #fff; }
.btn-search { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 20px; text-align: center; line-height: 44px; }
</style>
