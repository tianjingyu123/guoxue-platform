<script setup lang="ts">
/**
 * 圈子活动（从原型 app/circles/activities/page.tsx 176行高保真迁移）
 * 顶栏 + 状态筛选 + 活动卡片(封面/状态/时间地点/参与进度/报名)
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

type ActivityStatus = 'upcoming' | 'ongoing' | 'ended'
interface Activity {
  id: string; title: string; cover: string; circleName: string
  startTime: string; endTime: string; location: string
  participants: number; maxParticipants: number; status: ActivityStatus; joined: boolean
}

const activities = ref<Activity[]>([
  { id: '1', title: '八字命理研讨会·春季场', cover: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=300&fit=crop', circleName: '八字命理研习社', startTime: '2024-02-15 14:00', endTime: '2024-02-15 17:00', location: '线上直播', participants: 128, maxParticipants: 200, status: 'upcoming', joined: false },
  { id: '2', title: '易经与现代决策应用讲座', cover: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=600&h=300&fit=crop', circleName: '易经研究会', startTime: '2024-01-20 19:00', endTime: '2024-01-20 21:00', location: '腾讯会议', participants: 89, maxParticipants: 100, status: 'ongoing', joined: true },
  { id: '3', title: '紫微斗数入门公开课', cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=300&fit=crop', circleName: '紫微斗数学院', startTime: '2024-01-15 10:00', endTime: '2024-01-15 12:00', location: '线上直播', participants: 256, maxParticipants: 256, status: 'ended', joined: true },
  { id: '4', title: '风水堪舆实地考察活动', cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=300&fit=crop', circleName: '风水堪舆交流', startTime: '2024-02-20 09:00', endTime: '2024-02-20 18:00', location: '上海 · 古镇', participants: 24, maxParticipants: 30, status: 'upcoming', joined: false },
])

const STATUS_CFG: Record<ActivityStatus, { label: string; cls: string }> = {
  upcoming: { label: '即将开始', cls: 'blue' },
  ongoing: { label: '进行中', cls: 'green' },
  ended: { label: '已结束', cls: 'gray' },
}
const filters: { value: 'all' | ActivityStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'upcoming', label: '即将开始' },
  { value: 'ongoing', label: '进行中' },
  { value: 'ended', label: '已结束' },
]
const filter = ref<'all' | ActivityStatus>('all')
const filtered = computed(() => filter.value === 'all' ? activities.value : activities.value.filter(a => a.status === filter.value))

function join(id: string) {
  activities.value = activities.value.map(a => a.id === id ? { ...a, joined: true, participants: a.participants + 1 } : a)
  uni.showToast({ title: '报名成功', icon: 'success' })
}
function endTimeOnly(t: string) { return t.split(' ')[1] || '' }
function pct(a: Activity) { return Math.min(100, (a.participants / a.maxParticipants) * 100) }
</script>

<template>
  <view class="ac">
    <view class="ac-header">
      <view @tap="goBack">
        <app-icon
          name="arrow-left"
          :size="40"
          color="#2C2C2C"
        />
      </view>
      <text class="ac-title">
        圈子活动
      </text>
      <app-icon
        name="calendar"
        :size="40"
        color="#999999"
      />
    </view>

    <scroll-view
      scroll-x
      class="ac-filters"
    >
      <view class="ac-filters-row">
        <view
          v-for="f in filters"
          :key="f.value"
          class="ac-filter"
          :class="{ on: filter === f.value }"
          @tap="filter = f.value"
        >
          <text
            class="ac-filter-txt"
            :class="{ on: filter === f.value }"
          >
            {{ f.label }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view class="ac-list">
      <view
        v-if="filtered.length === 0"
        class="ac-empty"
      >
        <text class="ac-empty-txt">
          暂无活动
        </text>
      </view>
      <view
        v-for="act in filtered"
        :key="act.id"
        class="ac-card"
      >
        <view class="ac-cover-wrap">
          <image
            :src="act.cover"
            class="ac-cover"
            mode="aspectFill"
          />
          <view
            class="ac-status"
            :class="STATUS_CFG[act.status].cls"
          >
            <text
              class="ac-status-txt"
              :class="STATUS_CFG[act.status].cls"
            >
              {{ STATUS_CFG[act.status].label }}
            </text>
          </view>
        </view>
        <view class="ac-body">
          <text class="ac-card-title">
            {{ act.title }}
          </text>
          <text class="ac-card-circle">
            {{ act.circleName }}
          </text>
          <view class="ac-meta">
            <view class="ac-meta-row">
              <app-icon
                name="clock"
                :size="26"
                color="#999999"
              /><text class="ac-meta-txt">
                {{ act.startTime }} – {{ endTimeOnly(act.endTime) }}
              </text>
            </view>
            <view class="ac-meta-row">
              <app-icon
                name="map-pin"
                :size="26"
                color="#999999"
              /><text class="ac-meta-txt">
                {{ act.location }}
              </text>
            </view>
            <view class="ac-meta-row">
              <app-icon
                name="users"
                :size="26"
                color="#999999"
              />
              <text class="ac-meta-txt">
                {{ act.participants }} / {{ act.maxParticipants }} 人参与
              </text>
              <view class="ac-progress">
                <view
                  class="ac-progress-bar"
                  :style="{ width: pct(act) + '%' }"
                />
              </view>
            </view>
          </view>
          <view v-if="act.status !== 'ended'">
            <view
              v-if="act.joined"
              class="ac-joined"
            >
              <text class="ac-joined-txt">
                已报名
              </text>
            </view>
            <view
              v-else
              class="ac-btn"
              :class="{ disabled: act.participants >= act.maxParticipants }"
              @tap="act.participants < act.maxParticipants && join(act.id)"
            >
              <text class="ac-btn-txt">
                {{ act.participants >= act.maxParticipants ? '名额已满' : '立即报名' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ac { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.ac-header { position: sticky; top: 0; z-index: 10; background: var(--bg-paper, #FAF8F5); border-bottom: 2rpx solid var(--border, #EDE8E0); display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 96rpx; padding-top: var(--status-bar-height, 0px); }
.ac-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.ac-filters { white-space: nowrap; padding: 24rpx 0 16rpx; }
.ac-filters-row { display: inline-flex; gap: 16rpx; padding: 0 32rpx; }
.ac-filter { flex-shrink: 0; padding: 12rpx 28rpx; border-radius: 999rpx; background: #F0EBE3; }
.ac-filter.on { background: var(--brand, #C41E3A); }
.ac-filter-txt { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); white-space: nowrap; }
.ac-filter-txt.on { color: #fff; }
.ac-list { padding: 16rpx 32rpx 160rpx; display: flex; flex-direction: column; gap: 32rpx; }
.ac-empty { text-align: center; padding: 128rpx 0; }
.ac-empty-txt { font-size: 26rpx; color: #999; }
.ac-card { background: var(--card, #fff); border: 2rpx solid var(--border, #EDE8E0); border-radius: 24rpx; overflow: hidden; }
.ac-cover-wrap { position: relative; }
.ac-cover { width: 100%; height: 320rpx; }
.ac-status { position: absolute; top: 24rpx; left: 24rpx; padding: 8rpx 20rpx; border-radius: 999rpx; }
.ac-status.blue { background: #DBEAFE; }
.ac-status.green { background: #DCFCE7; }
.ac-status.gray { background: #F0EBE3; }
.ac-status-txt { font-size: 22rpx; font-weight: 500; }
.ac-status-txt.blue { color: #1D4ED8; }
.ac-status-txt.green { color: #15803D; }
.ac-status-txt.gray { color: #999; }
.ac-body { padding: 32rpx; }
.ac-card-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.ac-card-circle { display: block; font-size: 24rpx; color: var(--brand, #C41E3A); margin: 8rpx 0 24rpx; }
.ac-meta { display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 32rpx; }
.ac-meta-row { display: flex; align-items: center; gap: 12rpx; }
.ac-meta-txt { font-size: 24rpx; color: #999; }
.ac-progress { flex: 1; height: 8rpx; background: #F0EBE3; border-radius: 999rpx; overflow: hidden; margin-left: 8rpx; }
.ac-progress-bar { height: 100%; background: var(--brand, #C41E3A); border-radius: 999rpx; }
.ac-joined { text-align: center; padding: 16rpx; }
.ac-joined-txt { font-size: 28rpx; color: #16A34A; font-weight: 500; }
.ac-btn { background: var(--brand, #C41E3A); border-radius: 16rpx; padding: 20rpx; text-align: center; }
.ac-btn.disabled { background: #CBD5E1; }
.ac-btn-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
