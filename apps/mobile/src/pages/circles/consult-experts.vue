<script setup lang="ts">
/**
 * 专家列表（从原型 app/circles/[id]/consult/experts/page.tsx 高保真迁移）
 * 搜索 + 全部/在线筛选 + 专家卡片(头像在线点/认证/专长/评分/标签/电话图文价格/响应时间/双咨询按钮)。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, toastComingSoon } from '@/utils/router'

interface Expert {
  id: string; name: string; avatar: string; specialty: string; tags: string[]
  rating: number; reviewCount: number; callPrice: number; textPrice: number
  responseTime: string; online: boolean; verified: boolean; answerCount: number
}

const experts: Expert[] = [
  { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', tags: ['四柱', '流年', '大运'], rating: 4.9, reviewCount: 1256, callPrice: 3, textPrice: 50, responseTime: '5分钟内', online: true, verified: true, answerCount: 3860 },
  { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', tags: ['命宫', '四化', '格局'], rating: 4.8, reviewCount: 980, callPrice: 3, textPrice: 30, responseTime: '10分钟内', online: true, verified: true, answerCount: 2540 },
  { id: '3', name: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经占卜', tags: ['六十四卦', '梅花', '起卦'], rating: 4.7, reviewCount: 742, callPrice: 2, textPrice: 30, responseTime: '15分钟内', online: false, verified: true, answerCount: 1980 },
  { id: '4', name: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水堪舆', tags: ['阳宅', '阴宅', '布局'], rating: 4.8, reviewCount: 624, callPrice: 4, textPrice: 80, responseTime: '30分钟内', online: true, verified: true, answerCount: 1560 },
  { id: '5', name: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', tags: ['起局', '决策', '事业'], rating: 4.6, reviewCount: 468, callPrice: 2, textPrice: 30, responseTime: '20分钟内', online: false, verified: false, answerCount: 1240 },
]

const search = ref('')
const filter = ref<'all' | 'online'>('all')

const filtered = computed(() => experts.filter(e => {
  const matchOnline = filter.value === 'all' || e.online
  const s = search.value.trim()
  const matchSearch = !s || e.name.includes(s) || e.specialty.includes(s) || e.tags.some(t => t.includes(s))
  return matchOnline && matchSearch
}))
</script>

<template>
  <view class="ce-page">
    <view class="ce-nav">
      <view class="ce-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="ce-nav-title">专家列表</text>
    </view>

    <view class="ce-body">
      <view class="ce-search">
        <app-icon name="search" :size="28" color="#999999" />
        <input v-model="search" class="ce-search-input" placeholder="搜索专家或专长" placeholder-class="ce-ph" />
      </view>

      <view class="ce-filters">
        <view v-for="f in (['all','online'] as const)" :key="f" class="ce-filter" :class="{ 'is-active': filter === f }" @tap="filter = f">
          <text class="ce-filter-t" :class="{ 'is-active': filter === f }">{{ f === 'all' ? '全部' : '在线' }}</text>
        </view>
      </view>

      <view class="ce-list">
        <view v-for="e in filtered" :key="e.id" class="ce-card">
          <view class="ce-card-top">
            <view class="ce-avatar-wrap">
              <image class="ce-avatar" :src="e.avatar" mode="aspectFill" />
              <view v-if="e.online" class="ce-online-dot" />
            </view>
            <view class="ce-card-info">
              <view class="ce-name-row">
                <text class="ce-name">{{ e.name }}</text>
                <app-icon v-if="e.verified" name="award" :size="26" color="#F59E0B" />
                <view class="ce-status" :class="e.online ? 'is-online' : 'is-offline'"><text class="ce-status-t" :class="e.online ? 'is-online' : 'is-offline'">{{ e.online ? '在线' : '离线' }}</text></view>
              </view>
              <text class="ce-specialty">{{ e.specialty }}</text>
              <view class="ce-rate-row">
                <view class="ce-rate"><app-icon name="star" :size="22" color="#FBBF24" :fill="true" /><text class="ce-rate-t">{{ e.rating }}</text></view>
                <text class="ce-rate-sub">{{ e.reviewCount }} 评价</text>
                <text class="ce-rate-sub">{{ e.answerCount }} 次咨询</text>
              </view>
            </view>
          </view>

          <view class="ce-tags">
            <view v-for="t in e.tags" :key="t" class="ce-tag"><text class="ce-tag-t">{{ t }}</text></view>
          </view>

          <view class="ce-price-row">
            <view class="ce-prices">
              <view class="ce-price"><app-icon name="phone" :size="22" color="#999999" /><text class="ce-price-t">电话 ¥{{ e.callPrice }}/分钟</text></view>
              <view class="ce-price"><app-icon name="message-square" :size="22" color="#999999" /><text class="ce-price-t">图文 ¥{{ e.textPrice }}/次</text></view>
            </view>
            <view class="ce-resp"><app-icon name="clock" :size="22" color="#16A34A" /><text class="ce-resp-t">{{ e.responseTime }}响应</text></view>
          </view>

          <view class="ce-actions">
            <view class="ce-btn-outline" @tap="toastComingSoon"><app-icon name="phone" :size="26" color="#2C2C2C" /><text class="ce-btn-outline-t">电话咨询</text></view>
            <view class="ce-btn-primary" @tap="toastComingSoon"><app-icon name="message-square" :size="26" color="#ffffff" /><text class="ce-btn-primary-t">图文咨询</text></view>
          </view>
        </view>

        <view v-if="filtered.length === 0" class="ce-empty"><text class="ce-empty-t">暂无符合条件的专家</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ce-page { min-height: 100vh; background: #F5F1E8; }
.ce-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.ce-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ce-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.ce-body { padding: 24rpx; padding-bottom: 48rpx; }
.ce-search { display: flex; align-items: center; gap: 12rpx; padding: 0 24rpx; height: 76rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 16rpx; margin-bottom: 24rpx; }
.ce-search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.ce-ph { color: #b5aea3; }
.ce-filters { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.ce-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.ce-filter.is-active { background: #C41E3A; }
.ce-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.ce-filter-t.is-active { color: #fff; }
.ce-list { display: flex; flex-direction: column; gap: 20rpx; }
.ce-card { padding: 24rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; }
.ce-card-top { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.ce-avatar-wrap { position: relative; flex-shrink: 0; }
.ce-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.ce-online-dot { position: absolute; bottom: 4rpx; right: 4rpx; width: 20rpx; height: 20rpx; border-radius: 50%; background: #22C55E; border: 3rpx solid #fff; }
.ce-card-info { flex: 1; min-width: 0; }
.ce-name-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 4rpx; }
.ce-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.ce-status { padding: 2rpx 12rpx; border-radius: 999rpx; }
.ce-status.is-online { background: #ECFDF3; }
.ce-status.is-offline { background: #F2EFEA; }
.ce-status-t { font-size: 20rpx; }
.ce-status-t.is-online { color: #16A34A; }
.ce-status-t.is-offline { color: #999; }
.ce-specialty { display: block; font-size: 24rpx; color: #C41E3A; margin-bottom: 8rpx; }
.ce-rate-row { display: flex; align-items: center; gap: 16rpx; }
.ce-rate { display: flex; align-items: center; gap: 4rpx; }
.ce-rate-t { font-size: 22rpx; color: #999; }
.ce-rate-sub { font-size: 22rpx; color: #999; }
.ce-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 20rpx; }
.ce-tag { background: #F2EFEA; border-radius: 999rpx; padding: 4rpx 16rpx; }
.ce-tag-t { font-size: 20rpx; color: #999; }
.ce-price-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.ce-prices { display: flex; gap: 20rpx; }
.ce-price { display: flex; align-items: center; gap: 6rpx; }
.ce-price-t { font-size: 22rpx; color: #999; }
.ce-resp { display: flex; align-items: center; gap: 4rpx; }
.ce-resp-t { font-size: 22rpx; color: #16A34A; }
.ce-actions { display: flex; gap: 16rpx; }
.ce-btn-outline { flex: 1; height: 64rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ce-btn-outline-t { font-size: 26rpx; color: #2C2C2C; }
.ce-btn-primary { flex: 1; height: 64rpx; background: #C41E3A; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ce-btn-primary-t { font-size: 26rpx; color: #fff; }
.ce-empty { padding: 120rpx 0; }
.ce-empty-t { display: block; text-align: center; font-size: 26rpx; color: #999; }
</style>
