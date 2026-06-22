<template>
  <view class="page">
    <app-nav-bar title="圈子" :show-back="false" />
    <scroll-view scroll-y class="content">
      <view v-if="circles.length === 0" class="empty">
        <app-icon name="users" :size="80" color="#ccc" />
        <text class="empty-text">暂无圈子</text>
      </view>
      <view v-for="c in circles" :key="c.id" class="card" @tap="openDetail(c.id)">
        <image class="card-cover" :src="c.cover" mode="aspectFill" />
        <view class="card-info">
          <text class="card-name">{{ c.name }}</text>
          <text class="card-desc">{{ c.description }}</text>
          <view class="card-meta">
            <text class="meta-item">{{ c.members }}成员</text>
            <text class="meta-item">{{ c.posts }}帖子</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import { navigateTo } from '@/utils/router'
import { circleApi } from '@/lib/circle-data'

const circles = ref<any[]>([])

onMounted(async () => {
  try { const res = await circleApi.list(); circles.value = res.data } catch {}
})

function openDetail(id: string) { navigateTo(`/pkg-circle/circles/detail?id=${id}`) }
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.content { padding: 24rpx; }
.card { display: flex; gap: 24rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx; }
.card-cover { width: 120rpx; height: 120rpx; border-radius: 16rpx; flex-shrink: 0; background: #f0f0f0; }
.card-info { flex: 1; min-width: 0; }
.card-name { font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.card-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; gap: 24rpx; margin-top: 12rpx; }
.meta-item { font-size: 22rpx; color: #bbb; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-text { font-size: 28rpx; color: #999; margin-top: 24rpx; }
</style>
