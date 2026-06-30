<template>
  <view class="page">
    <app-nav-bar title="黑名单" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112">
      <template #right>
        <text class="count">{{ blocked.length }} 人</text>
      </template>
    </app-nav-bar>

    <view class="body">
      <view class="search">
        <app-icon name="search" :size="28" color="#8a8378" />
        <input class="search-input" v-model="search" placeholder="搜索黑名单" placeholder-class="ph" />
      </view>

      <view v-if="filtered.length === 0" class="empty">
        <app-icon name="user-x" :size="96" color="#d8d2c8" />
        <text class="empty-text">{{ search ? '未找到匹配用户' : '黑名单为空' }}</text>
      </view>

      <view v-else class="list">
        <view v-for="u in filtered" :key="u.id" class="item">
          <image lazy-load class="avatar" :src="u.avatar" mode="aspectFill" />
          <view class="info">
            <text class="name">{{ u.name }}</text>
            <text class="time">拉黑于 {{ u.blockedAt }}</text>
          </view>
          <view class="remove" @tap="unblock(u.id)">
            <app-icon name="trash-2" :size="26" color="#8a8378" />
            <text>移除</text>
          </view>
        </view>
      </view>

      <text v-if="blocked.length > 0" class="hint">黑名单用户无法查看您的内容或向您发送消息</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'

interface BlockedUser { id: string; name: string; avatar: string; blockedAt: string }

const blocked = ref<BlockedUser[]>([
  { id: '1', name: '用户123456', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80', blockedAt: '2024-01-18' },
  { id: '2', name: '匿名用户', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80', blockedAt: '2024-01-10' },
  { id: '3', name: '神秘访客', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', blockedAt: '2023-12-25' },
])
const search = ref('')

const filtered = computed(() => blocked.value.filter(u => u.name.includes(search.value)))

function unblock(id: string) {
  blocked.value = blocked.value.filter(u => u.id !== id)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.count { font-size: 24rpx; color: #8a8378; }
.body { padding: 32rpx 32rpx 160rpx; }
.search { position: relative; display: flex; align-items: center; gap: 16rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 16rpx; padding: 0 24rpx; height: 80rpx; margin-bottom: 32rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #2c2c2c; }
.ph { color: #b5ad9f; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; gap: 24rpx; }
.empty-text { font-size: 28rpx; color: #8a8378; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: #fff; border: 1rpx solid #e8e3db; border-radius: 24rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; background: #f0ece3; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; }
.time { font-size: 24rpx; color: #8a8378; }
.remove { display: flex; align-items: center; gap: 6rpx; font-size: 24rpx; color: #8a8378; }
.hint { display: block; text-align: center; font-size: 24rpx; color: #8a8378; margin-top: 48rpx; }
</style>
