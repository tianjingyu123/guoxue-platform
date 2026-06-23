<script setup lang="ts">
/** 老师邀约管理（B类结构高保真，对齐原型 app/station/[id]/teachers/page.tsx）
 *  4 Tab：邀约记录 / 我的需求 / 课程排期 / 费用结算。状态徽章语义色忠实保留。 */
import { ref, computed } from 'vue'

interface Invitation {
  id: number
  teacher: { name: string; title: string; rating: number }
  course: string
  date: string
  time: string
  fee: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  attendees: number
}

const invitations: Invitation[] = [
  { id: 1, teacher: { name: '张道源', title: '八字命理专家', rating: 4.9 }, course: '八字实战精讲', date: '2024-04-15', time: '14:00-17:00', fee: 3000, status: 'confirmed', attendees: 25 },
  { id: 2, teacher: { name: '李易卿', title: '紫微斗数研究员', rating: 4.8 }, course: '紫微斗数入门', date: '2024-04-20', time: '09:00-12:00', fee: 2500, status: 'pending', attendees: 0 },
  { id: 3, teacher: { name: '王文昌', title: '风水堪舆大师', rating: 4.7 }, course: '阳宅风水实操', date: '2024-03-28', time: '14:00-17:00', fee: 3500, status: 'completed', attendees: 32 },
]

const demands = [
  { id: 1, title: '八字命理高级课程', category: '八字命理', date: '2024-04-25', budget: '3000-5000', applications: 5, status: 'open' as const },
  { id: 2, title: '风水实地考察', category: '风水堪舆', date: '2024-05-01', budget: '5000-8000', applications: 3, status: 'open' as const },
]

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: '待确认', bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
  confirmed: { label: '已确认', bg: 'rgba(34,197,94,0.1)', color: '#16a34a' },
  completed: { label: '已完成', bg: 'var(--bg-soft, #f0ebe3)', color: '#999999' },
  cancelled: { label: '已取消', bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  open: { label: '招募中', bg: 'rgba(59,130,246,0.1)', color: '#2563eb' },
}

const tabs = [
  { id: 'invitations', label: '邀约记录' },
  { id: 'demands', label: '我的需求' },
  { id: 'schedule', label: '课程排期' },
  { id: 'settlement', label: '费用结算' },
]
const activeTab = ref('invitations')

const confirmedList = computed(() => invitations.filter((i) => i.status === 'confirmed'))
const completedList = computed(() => invitations.filter((i) => i.status === 'completed'))
const pendingTotal = computed(() => confirmedList.value.reduce((s, i) => s + i.fee, 0))

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => {} })
}
function toastSoon() {
  uni.showToast({ title: '敬请期待', icon: 'none' })
}
function fmtMoney(n: number) {
  return n.toLocaleString('en-US')
}
</script>

<template>
  <view class="tm">
    <!-- 顶部导航 -->
    <view class="tm-header" :style="{ paddingTop: 'var(--status-bar-height, 0px)' }">
      <view class="tm-header-inner">
        <view class="tm-header-left">
          <view class="tm-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#1f1f1f" /></view>
          <text class="tm-title">老师邀约管理</text>
        </view>
        <view class="tm-find" @tap="toastSoon">
          <app-icon name="search" :size="32" color="#C41E3A" />
          <text class="tm-find-txt">找老师</text>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="tm-quick">
      <view class="tm-quick-btn" @tap="toastSoon">
        <app-icon name="users" :size="40" color="#C41E3A" />
        <text class="tm-quick-txt">浏览人才库</text>
      </view>
      <view class="tm-quick-btn" @tap="toastSoon">
        <app-icon name="plus" :size="40" color="#C41E3A" />
        <text class="tm-quick-txt">发布需求</text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tm-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="tm-tab"
        :class="{ active: activeTab === tab.id }"
        @tap="activeTab = tab.id"
      >
        <text class="tm-tab-txt" :class="{ active: activeTab === tab.id }">{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="tm-body">
      <!-- 邀约记录 -->
      <view v-if="activeTab === 'invitations'" class="tm-list">
        <view v-for="item in invitations" :key="item.id" class="tm-card">
          <view class="tm-inv">
            <view class="tm-avatar"><text class="tm-avatar-txt">{{ item.teacher.name.slice(0, 1) }}</text></view>
            <view class="tm-inv-main">
              <view class="tm-inv-top">
                <text class="tm-inv-name">{{ item.teacher.name }}</text>
                <view class="tm-badge" :style="{ background: statusConfig[item.status].bg }">
                  <text class="tm-badge-txt" :style="{ color: statusConfig[item.status].color }">{{ statusConfig[item.status].label }}</text>
                </view>
              </view>
              <text class="tm-inv-title">{{ item.teacher.title }}</text>
              <view class="tm-inv-course">
                <text class="tm-inv-course-name">{{ item.course }}</text>
                <view class="tm-inv-meta">
                  <view class="tm-meta-item"><app-icon name="calendar" :size="24" color="#999" /><text class="tm-meta-txt">{{ item.date }}</text></view>
                  <view class="tm-meta-item"><app-icon name="clock" :size="24" color="#999" /><text class="tm-meta-txt">{{ item.time }}</text></view>
                </view>
              </view>
              <view class="tm-inv-fee">
                <text class="tm-fee">¥{{ item.fee }}</text>
                <text v-if="item.status === 'confirmed'" class="tm-attendees">{{ item.attendees }}人报名</text>
                <text v-else-if="item.status === 'completed'" class="tm-attendees green">{{ item.attendees }}人参与</text>
              </view>
              <view v-if="item.status === 'pending'" class="tm-inv-actions">
                <view class="tm-act-btn"><app-icon name="message-circle" :size="28" color="#1f1f1f" /><text class="tm-act-txt">联系老师</text></view>
                <view class="tm-act-btn red"><text class="tm-act-txt red">取消邀约</text></view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的需求 -->
      <view v-else-if="activeTab === 'demands'" class="tm-list">
        <view class="tm-new-demand" @tap="toastSoon">
          <app-icon name="plus" :size="32" color="#1f1f1f" /><text class="tm-new-demand-txt">发布新需求</text>
        </view>
        <view v-for="item in demands" :key="item.id" class="tm-card">
          <view class="tm-dm-top">
            <view class="tm-dm-info">
              <view class="tm-dm-title-row">
                <text class="tm-dm-title">{{ item.title }}</text>
                <view class="tm-badge" :style="{ background: statusConfig[item.status].bg }">
                  <text class="tm-badge-txt" :style="{ color: statusConfig[item.status].color }">{{ statusConfig[item.status].label }}</text>
                </view>
              </view>
              <view class="tm-dm-meta">
                <view class="tm-dm-cat"><text class="tm-dm-cat-txt">{{ item.category }}</text></view>
                <text class="tm-meta-txt">{{ item.date }}</text>
                <text class="tm-meta-txt">预算 ¥{{ item.budget }}</text>
              </view>
            </view>
            <app-icon name="chevron-right" :size="40" color="#999" />
          </view>
          <view class="tm-dm-foot">
            <text class="tm-dm-apply"><text class="tm-dm-apply-num">{{ item.applications }}</text> 位老师申请</text>
            <view class="tm-dm-btn" @tap.stop="toastSoon"><text class="tm-dm-btn-txt">查看申请</text></view>
          </view>
        </view>
      </view>

      <!-- 课程排期 -->
      <view v-else-if="activeTab === 'schedule'" class="tm-list">
        <view class="tm-card">
          <text class="tm-sec-title">2024年4月</text>
          <view class="tm-sch-list">
            <view v-for="item in confirmedList" :key="item.id" class="tm-sch-item">
              <view class="tm-sch-date">
                <text class="tm-sch-day">{{ item.date.split('-')[2] }}</text>
                <text class="tm-sch-week">周一</text>
              </view>
              <view class="tm-sch-info">
                <text class="tm-sch-course">{{ item.course }}</text>
                <text class="tm-sch-sub">{{ item.teacher.name }} · {{ item.time }}</text>
              </view>
              <view class="tm-sch-badge"><text class="tm-sch-badge-txt">{{ item.attendees }}人</text></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 费用结算 -->
      <view v-else-if="activeTab === 'settlement'" class="tm-list">
        <view class="tm-card">
          <view class="tm-settle-head">
            <text class="tm-sec-title">待结算</text>
            <text class="tm-settle-total">¥{{ fmtMoney(pendingTotal) }}</text>
          </view>
          <view v-for="item in confirmedList" :key="item.id" class="tm-settle-row">
            <view>
              <text class="tm-settle-course">{{ item.course }}</text>
              <text class="tm-settle-sub">{{ item.teacher.name }} · {{ item.date }}</text>
            </view>
            <text class="tm-settle-fee">¥{{ item.fee }}</text>
          </view>
        </view>
        <view class="tm-card">
          <text class="tm-sec-title">已结算记录</text>
          <view v-for="item in completedList" :key="item.id" class="tm-settle-paid">
            <view>
              <text class="tm-settle-course light">{{ item.course }}</text>
              <text class="tm-settle-sub">{{ item.teacher.name }} · {{ item.date }}</text>
            </view>
            <view class="tm-settle-paid-right">
              <text class="tm-settle-paid-fee">¥{{ item.fee }}</text>
              <text class="tm-settle-paid-label">已支付</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.tm { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }

/* 顶部导航 */
.tm-header { position: sticky; top: 0; z-index: 50; background: var(--bg-paper, #faf8f5); border-bottom: 1rpx solid var(--line, #e8e0d5); }
.tm-header-inner { height: 96rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.tm-header-left { display: flex; align-items: center; gap: 24rpx; }
.tm-back { padding: 8rpx; }
.tm-title { font-size: 30rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.tm-find { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 16rpx; }
.tm-find-txt { font-size: 26rpx; color: #C41E3A; }

/* 快捷操作 */
.tm-quick { display: flex; gap: 16rpx; padding: 24rpx 32rpx; background: rgba(196,30,58,0.04); }
.tm-quick-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 24rpx 0; border: 1rpx solid var(--line, #e8e0d5); border-radius: 16rpx; background: var(--bg-card, #ffffff); }
.tm-quick-txt { font-size: 22rpx; color: var(--text-strong, #1f1f1f); }

/* Tab */
.tm-tabs { display: flex; position: sticky; top: 96rpx; z-index: 40; background: var(--bg-paper, #faf8f5); border-bottom: 1rpx solid var(--line, #e8e0d5); }
.tm-tab { flex: 1; padding: 24rpx 0; display: flex; align-items: center; justify-content: center; border-bottom: 4rpx solid transparent; }
.tm-tab.active { border-bottom-color: #C41E3A; }
.tm-tab-txt { font-size: 26rpx; font-weight: 500; color: var(--text-soft, #999); }
.tm-tab-txt.active { color: #C41E3A; }

/* 内容 */
.tm-body { flex: 1; }
.tm-list { display: flex; flex-direction: column; gap: 24rpx; padding: 32rpx; }
.tm-card { background: var(--bg-card, #ffffff); border: 1rpx solid var(--line, #e8e0d5); border-radius: 24rpx; padding: 32rpx; }

/* 邀约记录 */
.tm-inv { display: flex; gap: 24rpx; align-items: flex-start; }
.tm-avatar { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tm-avatar-txt { font-size: 32rpx; font-weight: 600; color: #C41E3A; }
.tm-inv-main { flex: 1; min-width: 0; }
.tm-inv-top { display: flex; align-items: center; justify-content: space-between; }
.tm-inv-name { font-size: 28rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.tm-badge { padding: 4rpx 16rpx; border-radius: 999rpx; }
.tm-badge-txt { font-size: 20rpx; }
.tm-inv-title { display: block; font-size: 22rpx; color: var(--text-soft, #999); margin-top: 2rpx; }
.tm-inv-course { margin-top: 16rpx; padding: 16rpx; background: var(--bg-soft, #f0ebe3); border-radius: 12rpx; }
.tm-inv-course-name { font-size: 26rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.tm-inv-meta { display: flex; gap: 24rpx; margin-top: 8rpx; }
.tm-meta-item { display: flex; align-items: center; gap: 6rpx; }
.tm-meta-txt { font-size: 22rpx; color: var(--text-soft, #999); }
.tm-inv-fee { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; }
.tm-fee { font-size: 26rpx; font-weight: 500; color: #C41E3A; }
.tm-attendees { font-size: 22rpx; color: var(--text-soft, #999); }
.tm-attendees.green { color: #16a34a; }
.tm-inv-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.tm-act-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 56rpx; border: 1rpx solid var(--line, #e8e0d5); border-radius: 12rpx; }
.tm-act-btn.red { flex: 0 0 auto; padding: 0 24rpx; border-color: rgba(239,68,68,0.4); }
.tm-act-txt { font-size: 24rpx; color: var(--text-strong, #1f1f1f); }
.tm-act-txt.red { color: #ef4444; }

/* 我的需求 */
.tm-new-demand { display: flex; align-items: center; justify-content: center; gap: 12rpx; height: 80rpx; border: 1rpx solid var(--line, #e8e0d5); border-radius: 16rpx; background: var(--bg-card, #ffffff); }
.tm-new-demand-txt { font-size: 26rpx; color: var(--text-strong, #1f1f1f); }
.tm-dm-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.tm-dm-info { flex: 1; min-width: 0; }
.tm-dm-title-row { display: flex; align-items: center; gap: 16rpx; }
.tm-dm-title { font-size: 28rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.tm-dm-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.tm-dm-cat { padding: 2rpx 12rpx; border: 1rpx solid var(--line, #e8e0d5); border-radius: 8rpx; }
.tm-dm-cat-txt { font-size: 20rpx; color: var(--text-soft, #999); }
.tm-dm-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid var(--line, #e8e0d5); }
.tm-dm-apply { font-size: 26rpx; color: var(--text-soft, #999); }
.tm-dm-apply-num { color: #C41E3A; font-weight: 500; }
.tm-dm-btn { padding: 12rpx 28rpx; background: #C41E3A; border-radius: 12rpx; }
.tm-dm-btn-txt { font-size: 24rpx; color: #ffffff; }

/* 课程排期 */
.tm-sec-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); margin-bottom: 24rpx; }
.tm-sch-list { display: flex; flex-direction: column; gap: 16rpx; }
.tm-sch-item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: #f0fdf4; border-radius: 16rpx; }
.tm-sch-date { width: 96rpx; text-align: center; }
.tm-sch-day { display: block; font-size: 36rpx; font-weight: 700; color: #16a34a; }
.tm-sch-week { font-size: 18rpx; color: #16a34a; }
.tm-sch-info { flex: 1; min-width: 0; }
.tm-sch-course { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.tm-sch-sub { font-size: 22rpx; color: var(--text-soft, #999); }
.tm-sch-badge { padding: 4rpx 16rpx; background: #22c55e; border-radius: 999rpx; }
.tm-sch-badge-txt { font-size: 20rpx; color: #ffffff; }

/* 费用结算 */
.tm-settle-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.tm-settle-total { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.tm-settle-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx; background: var(--bg-soft, #f0ebe3); border-radius: 12rpx; margin-bottom: 16rpx; }
.tm-settle-course { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.tm-settle-course.light { font-weight: 400; }
.tm-settle-sub { font-size: 22rpx; color: var(--text-soft, #999); }
.tm-settle-fee { font-size: 26rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.tm-settle-paid { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid var(--line, #e8e0d5); }
.tm-settle-paid:last-child { border-bottom: none; }
.tm-settle-paid-right { text-align: right; }
.tm-settle-paid-fee { display: block; font-size: 26rpx; font-weight: 500; color: #16a34a; }
.tm-settle-paid-label { font-size: 18rpx; color: var(--text-soft, #999); }
</style>
