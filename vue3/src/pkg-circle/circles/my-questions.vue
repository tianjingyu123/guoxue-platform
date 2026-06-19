<script setup lang="ts">
/**
 * 我的问答（从原型 app/circles/[id]/consult/my-questions/page.tsx 高保真迁移）
 * 筛选(全部/已回答/待回答) + 问答卡(头像/状态/问题2行截断/费用/展开看专家回答)。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

type QFilter = 'all' | 'answered' | 'pending'

interface Question {
  id: string; content: string; expert: string; avatar: string
  status: 'answered' | 'pending'; askedAt: string; answeredAt?: string; cost: string; preview?: string
}

const mockQs: Question[] = [
  { id: '1', content: '我是1985年10月15日午时生，想知道今年的财运走势和投资方向，是否适合做生意？', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', status: 'answered', askedAt: '2024-01-20', answeredAt: '2024-01-20', cost: '¥50.00', preview: '您的命局中财星得地，今年丙午流年走食伤生财之运…' },
  { id: '2', content: '请问我的八字日主身强还是身弱？用神是什么？近两年感情方面有没有好的发展机会？', expert: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', status: 'answered', askedAt: '2024-01-15', answeredAt: '2024-01-16', cost: '¥30.00', preview: '从您提供的生辰来看，日主甲木生于丑月，天气寒凉…' },
  { id: '3', content: '想问一下我的事业宫，今年是否有升职加薪的机会，需要注意什么？', expert: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', status: 'pending', askedAt: '2024-01-22', cost: '¥80.00' },
]

const filterTabs: QFilter[] = ['all', 'answered', 'pending']
const filter = ref<QFilter>('all')
const expanded = ref<string | null>(null)
const filtered = computed(() => filter.value === 'all' ? mockQs : mockQs.filter(q => q.status === filter.value))

function tabLabel(f: QFilter) { return f === 'all' ? '全部' : f === 'answered' ? '已回答' : '待回答' }
function toggle(id: string) { expanded.value = expanded.value === id ? null : id }
</script>

<template>
  <view class="mq-page">
    <view class="mq-nav">
      <view class="mq-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="mq-nav-title">我的问答</text>
    </view>

    <view class="mq-filters">
      <view v-for="f in filterTabs" :key="f" class="mq-filter" :class="{ 'is-active': filter === f }" @tap="filter = f">
        <text class="mq-filter-t" :class="{ 'is-active': filter === f }">{{ tabLabel(f) }}</text>
      </view>
    </view>

    <view class="mq-list">
      <view v-for="q in filtered" :key="q.id" class="mq-card">
        <view class="mq-card-main" @tap="toggle(q.id)">
          <image class="mq-avatar" :src="q.avatar" mode="aspectFill" />
          <view class="mq-info">
            <view class="mq-info-top">
              <text class="mq-expert">{{ q.expert }}</text>
              <view class="mq-status" :class="q.status === 'answered' ? 'is-answered' : 'is-pending'">
                <app-icon :name="q.status === 'answered' ? 'check-circle' : 'clock'" :size="22" :color="q.status === 'answered' ? '#16A34A' : '#F59E0B'" />
                <text class="mq-status-t" :class="q.status === 'answered' ? 'is-answered' : 'is-pending'">{{ q.status === 'answered' ? '已回答' : '待回答' }}</text>
              </view>
            </view>
            <text class="mq-content">{{ q.content }}</text>
            <view class="mq-meta">
              <text class="mq-date">{{ q.askedAt }}</text>
              <text class="mq-cost">{{ q.cost }}</text>
            </view>
          </view>
        </view>

        <view v-if="expanded === q.id && q.preview" class="mq-answer">
          <text class="mq-answer-label">专家回答：</text>
          <text class="mq-answer-text">{{ q.preview }}</text>
          <text class="mq-answer-time">回复于 {{ q.answeredAt }}</text>
        </view>
      </view>
      <view v-if="filtered.length === 0" class="mq-empty"><text class="mq-empty-t">暂无问答记录</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mq-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 48rpx; }
.mq-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.mq-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.mq-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.mq-filters { display: flex; gap: 16rpx; padding: 24rpx 24rpx 16rpx; }
.mq-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.mq-filter.is-active { background: #C41E3A; }
.mq-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.mq-filter-t.is-active { color: #fff; }
.mq-list { display: flex; flex-direction: column; gap: 20rpx; padding: 8rpx 24rpx 0; }
.mq-card { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; overflow: hidden; }
.mq-card-main { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx; }
.mq-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; margin-top: 4rpx; }
.mq-info { flex: 1; min-width: 0; }
.mq-info-top { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 8rpx; }
.mq-expert { font-size: 22rpx; color: #999; }
.mq-status { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.mq-status-t { font-size: 22rpx; }
.mq-status-t.is-answered { color: #16A34A; }
.mq-status-t.is-pending { color: #F59E0B; }
.mq-content { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.mq-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; }
.mq-date { font-size: 22rpx; color: #999; }
.mq-cost { font-size: 22rpx; font-weight: 500; color: #C41E3A; }
.mq-answer { padding: 24rpx; border-top: 1rpx solid #E8E0D0; }
.mq-answer-label { display: block; font-size: 22rpx; font-weight: 500; color: #999; margin-bottom: 10rpx; }
.mq-answer-text { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.7; }
.mq-answer-time { display: block; font-size: 22rpx; color: #999; margin-top: 12rpx; }
.mq-empty { padding: 120rpx 0; }
.mq-empty-t { display: block; text-align: center; font-size: 26rpx; color: #999; }
</style>
