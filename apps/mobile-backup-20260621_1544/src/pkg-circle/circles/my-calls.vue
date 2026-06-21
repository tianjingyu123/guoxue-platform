<script setup lang="ts">
/**
 * 我的通话（从原型 app/circles/[id]/consult/my-calls/page.tsx 高保真迁移）
 * 类型筛选(全部/拨出/接入/未接) + 通话记录卡(头像/专长/类型彩色图标/时长/费用/时间)。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

type CallType = 'all' | 'incoming' | 'outgoing' | 'missed'

interface CallRecord {
  id: string; expert: string; avatar: string; specialty: string
  type: 'incoming' | 'outgoing' | 'missed'; duration: string; time: string; cost: string
}

const mockCalls: CallRecord[] = [
  { id: '1', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', type: 'outgoing', duration: '28分钟', time: '今天 14:35', cost: '¥84.00' },
  { id: '2', expert: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', type: 'incoming', duration: '15分钟', time: '昨天 20:12', cost: '¥45.00' },
  { id: '3', expert: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经', type: 'missed', duration: '--', time: '昨天 09:30', cost: '¥0.00' },
  { id: '4', expert: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水', type: 'outgoing', duration: '42分钟', time: '2024-01-10', cost: '¥126.00' },
  { id: '5', expert: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', type: 'outgoing', duration: '10分钟', time: '2024-01-08', cost: '¥30.00' },
]

const TYPE_LABEL: Record<CallType, string> = { all: '全部', outgoing: '拨出', incoming: '接入', missed: '未接' }
const filterTabs: CallType[] = ['all', 'outgoing', 'incoming', 'missed']
const filter = ref<CallType>('all')
const filtered = computed(() => filter.value === 'all' ? mockCalls : mockCalls.filter(c => c.type === filter.value))

function typeIcon(t: CallRecord['type']) { return t === 'incoming' ? 'phone-incoming' : t === 'outgoing' ? 'phone-outgoing' : 'phone' }
function typeColor(t: CallRecord['type']) { return t === 'missed' ? '#EF4444' : t === 'outgoing' ? '#3B82F6' : '#16A34A' }
function typeText(t: CallRecord['type']) { return t === 'incoming' ? '接入' : t === 'outgoing' ? '拨出' : '未接' }
</script>

<template>
  <view class="mc-page">
    <view class="mc-nav">
      <view
        class="mc-nav-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="34"
          color="#2C2C2C"
        />
      </view>
      <text class="mc-nav-title">
        我的通话
      </text>
    </view>

    <scroll-view
      scroll-x
      class="mc-filters"
      :show-scrollbar="false"
    >
      <view class="mc-filters-inner">
        <view
          v-for="f in filterTabs"
          :key="f"
          class="mc-filter"
          :class="{ 'is-active': filter === f }"
          @tap="filter = f"
        >
          <text
            class="mc-filter-t"
            :class="{ 'is-active': filter === f }"
          >
            {{ TYPE_LABEL[f] }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view class="mc-list">
      <view
        v-for="c in filtered"
        :key="c.id"
        class="mc-card"
      >
        <image
          class="mc-avatar"
          :src="c.avatar"
          mode="aspectFill"
        />
        <view class="mc-info">
          <view class="mc-info-top">
            <text class="mc-expert">
              {{ c.expert }}
            </text>
            <text class="mc-specialty">
              {{ c.specialty }}
            </text>
          </view>
          <view class="mc-info-sub">
            <view class="mc-type">
              <app-icon
                :name="typeIcon(c.type)"
                :size="22"
                :color="typeColor(c.type)"
              />
              <text
                class="mc-type-t"
                :style="{ color: typeColor(c.type) }"
              >
                {{ typeText(c.type) }}
              </text>
            </view>
            <view class="mc-dur">
              <app-icon
                name="clock"
                :size="22"
                color="#999999"
              /><text class="mc-dur-t">
                {{ c.duration }}
              </text>
            </view>
          </view>
        </view>
        <view class="mc-right">
          <text class="mc-cost">
            {{ c.cost }}
          </text>
          <text class="mc-time">
            {{ c.time }}
          </text>
        </view>
      </view>
      <view
        v-if="filtered.length === 0"
        class="mc-empty"
      >
        <text class="mc-empty-t">
          暂无通话记录
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mc-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 48rpx; }
.mc-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.mc-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.mc-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.mc-filters { white-space: nowrap; padding: 24rpx 24rpx 16rpx; }
.mc-filters-inner { display: inline-flex; gap: 16rpx; }
.mc-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.mc-filter.is-active { background: #C41E3A; }
.mc-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.mc-filter-t.is-active { color: #fff; }
.mc-list { display: flex; flex-direction: column; gap: 16rpx; padding: 8rpx 24rpx 0; }
.mc-card { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; }
.mc-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; }
.mc-info { flex: 1; min-width: 0; }
.mc-info-top { display: flex; align-items: center; gap: 12rpx; }
.mc-expert { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.mc-specialty { font-size: 22rpx; color: #999; }
.mc-info-sub { display: flex; align-items: center; gap: 24rpx; margin-top: 6rpx; }
.mc-type { display: flex; align-items: center; gap: 4rpx; }
.mc-type-t { font-size: 22rpx; }
.mc-dur { display: flex; align-items: center; gap: 4rpx; }
.mc-dur-t { font-size: 22rpx; color: #999; }
.mc-right { text-align: right; flex-shrink: 0; }
.mc-cost { display: block; font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.mc-time { display: block; font-size: 20rpx; color: #999; margin-top: 6rpx; }
.mc-empty { padding: 120rpx 0; }
.mc-empty-t { display: block; text-align: center; font-size: 26rpx; color: #999; }
</style>
