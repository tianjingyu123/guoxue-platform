<template>
  <view class="audit-page">
    <!-- 头部 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="chevron-left" :size="40" color="#1a1a1a" />
      </view>
      <text class="nav-title">用户行为审计</text>
      <view class="nav-placeholder" />
    </view>

    <view class="body">
      <!-- 搜索框 -->
      <view class="search-row">
        <view class="search-box">
          <AppIcon name="search" :size="32" color="#9a8a78" />
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索用户ID/手机号/昵称"
            placeholder-class="search-ph"
            confirm-type="search"
            @confirm="handleSearch"
          />
        </view>
        <view class="search-btn" :class="{ disabled: loading }" @tap="handleSearch">
          <AppIcon v-if="loading" name="refresh-cw" :size="30" color="#fff" class="spin" />
          <text v-else class="search-btn-text">搜索</text>
        </view>
      </view>

      <!-- 用户信息卡 -->
      <view v-if="selectedUser" class="user-card">
        <view class="user-avatar">
          <text class="user-avatar-text">{{ selectedUser.nickname.charAt(0) }}</text>
        </view>
        <view class="user-info">
          <view class="user-name-row">
            <text class="user-name">{{ selectedUser.nickname }}</text>
            <text class="user-uid">UID: {{ selectedUser.uid }}</text>
            <text class="risk-tag" :class="'risk-' + selectedUser.riskLevel">
              {{ riskLabel(selectedUser.riskLevel) }}
            </text>
          </view>
          <text class="user-phone">手机：{{ selectedUser.phone }}</text>
          <view class="user-times">
            <text class="user-time">注册：{{ selectedUser.registerTime }}</text>
            <text class="user-time">最后活跃：{{ selectedUser.lastActiveTime }}</text>
          </view>
          <view class="user-stats">
            <view class="stat-item">
              <text class="stat-num">{{ selectedUser.loginCount }}</text>
              <text class="stat-label">登录次数</text>
            </view>
            <view class="stat-item">
              <text class="stat-num">{{ selectedUser.orderCount }}</text>
              <text class="stat-label">订单数</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 筛选与操作 -->
      <view v-if="selectedUser" class="filter-row">
        <scroll-view scroll-x class="type-scroll" :show-scrollbar="false">
          <view class="type-list">
            <view
              v-for="t in actionTypes"
              :key="t.value"
              class="type-chip"
              :class="{ active: filterType === t.value }"
              @tap="filterType = t.value"
            >
              <text class="type-chip-text" :class="{ active: filterType === t.value }">{{ t.label }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="filter-actions">
          <view class="abnormal-btn" :class="{ active: showAbnormalOnly }" @tap="showAbnormalOnly = !showAbnormalOnly">
            <AppIcon name="alert-triangle" :size="26" :color="showAbnormalOnly ? '#dc2626' : '#9a8a78'" />
            <text class="abnormal-text" :class="{ active: showAbnormalOnly }">异常</text>
          </view>
          <view class="export-btn" :class="{ disabled: exporting }" @tap="handleExport">
            <AppIcon v-if="exporting" name="refresh-cw" :size="26" color="#c41e3a" class="spin" />
            <AppIcon v-else name="download" :size="26" color="#c41e3a" />
            <text class="export-text">导出</text>
          </view>
        </view>
      </view>

      <!-- 操作轨迹时间轴 -->
      <view v-if="selectedUser" class="timeline">
        <view v-if="filteredLogs.length === 0" class="empty-logs">
          <AppIcon name="clock" :size="96" color="#d8cfc2" />
          <text class="empty-text">暂无操作记录</text>
        </view>
        <view
          v-for="(log, index) in filteredLogs"
          :key="log.id"
          class="tl-item"
        >
          <!-- 时间轴线 -->
          <view v-if="index < filteredLogs.length - 1" class="tl-line" />
          <!-- 时间轴点 -->
          <view class="tl-dot" :class="log.isAbnormal ? 'dot-abnormal' : 'dot-' + log.actionType">
            <AppIcon
              :name="log.isAbnormal ? 'alert-triangle' : actionIcon(log.actionType)"
              :size="24"
              :color="log.isAbnormal ? '#dc2626' : actionColor(log.actionType)"
            />
          </view>
          <!-- 日志内容 -->
          <view class="tl-content" :class="{ 'content-abnormal': log.isAbnormal }">
            <view class="tl-head">
              <view class="tl-head-left">
                <view class="tl-name-row">
                  <text class="tl-name">{{ log.actionName }}</text>
                  <text v-if="log.isAbnormal" class="tl-abnormal-tag">异常</text>
                </view>
                <text class="tl-desc">{{ log.description }}</text>
                <view v-if="log.isAbnormal && log.abnormalReason" class="tl-reason">
                  <AppIcon name="shield" :size="22" color="#dc2626" />
                  <text class="tl-reason-text">{{ log.abnormalReason }}</text>
                </view>
              </view>
              <text class="tl-time">{{ timeOnly(log.timestamp) }}</text>
            </view>
            <view class="tl-meta">
              <view class="tl-meta-item">
                <AppIcon :name="log.deviceType === 'mobile' ? 'smartphone' : 'monitor'" :size="22" color="#9a8a78" />
                <text class="tl-meta-text">{{ log.device }}</text>
              </view>
              <text class="tl-meta-text">IP: {{ log.ip }}</text>
              <view v-if="log.location" class="tl-meta-item">
                <AppIcon name="map-pin" :size="22" color="#9a8a78" />
                <text class="tl-meta-text">{{ log.location }}</text>
              </view>
            </view>
            <view v-if="log.extra && Object.keys(log.extra).length" class="tl-extra">
              <view v-for="(val, key) in log.extra" :key="key" class="tl-extra-row">
                <text class="tl-extra-key">{{ key }}:</text>
                <text class="tl-extra-val">{{ val }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 未搜索提示 -->
      <view v-if="!selectedUser && !loading" class="placeholder-empty">
        <AppIcon name="user" :size="128" color="#e2d9cc" />
        <text class="ph-title">搜索用户查看操作轨迹</text>
        <text class="ph-sub">支持用户ID、手机号、昵称搜索</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

type ActionType = 'login' | 'logout' | 'view' | 'order' | 'payment' | 'comment' | 'like' | 'share' | 'setting' | 'other'

interface AuditLog {
  id: number
  actionType: ActionType
  actionName: string
  description: string
  timestamp: string
  device: string
  deviceType: 'mobile' | 'desktop' | 'tablet'
  ip: string
  location?: string
  isAbnormal: boolean
  abnormalReason?: string
  extra?: Record<string, string>
}

interface AuditUser {
  id: number
  uid: string
  nickname: string
  phone: string
  registerTime: string
  lastActiveTime: string
  loginCount: number
  orderCount: number
  riskLevel: 'low' | 'medium' | 'high'
}

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const searchQuery = ref('')
const selectedUser = ref<AuditUser | null>(null)
const logs = ref<AuditLog[]>([])
const loading = ref(false)
const filterType = ref('all')
const showAbnormalOnly = ref(false)
const exporting = ref(false)

const mockUsers: AuditUser[] = [
  { id: 1, uid: 'U10086', nickname: '国学爱好者', phone: '138****8888', registerTime: '2025-03-15 10:30', lastActiveTime: '2026-06-03 09:45', loginCount: 156, orderCount: 23, riskLevel: 'low' },
  { id: 2, uid: 'U20088', nickname: '可疑用户001', phone: '139****9999', registerTime: '2026-06-01 02:30', lastActiveTime: '2026-06-03 03:15', loginCount: 50, orderCount: 0, riskLevel: 'high' },
]

const mockLogs: AuditLog[] = [
  { id: 1, actionType: 'login', actionName: '用户登录', description: '密码登录成功', timestamp: '2026-06-03 09:45:23', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false },
  { id: 2, actionType: 'view', actionName: '浏览课程', description: '浏览《八字命理入门》课程详情', timestamp: '2026-06-03 09:46:15', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false, extra: { courseId: 'C1001', courseName: '八字命理入门' } },
  { id: 3, actionType: 'order', actionName: '创建订单', description: '购买《八字命理入门》课程', timestamp: '2026-06-03 09:48:30', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false, extra: { orderId: 'O202606030001', amount: '299' } },
  { id: 4, actionType: 'payment', actionName: '支付成功', description: '微信支付 ¥299.00', timestamp: '2026-06-03 09:49:05', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false, extra: { payMethod: '微信支付', amount: '299.00' } },
  { id: 5, actionType: 'login', actionName: '用户登录', description: '短信验证码登录', timestamp: '2026-06-02 14:20:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: true, abnormalReason: '异地登录：与上次登录地点不一致' },
  { id: 6, actionType: 'comment', actionName: '发表评论', description: '对《紫微斗数》课程发表评价', timestamp: '2026-06-02 15:30:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: false },
  { id: 7, actionType: 'like', actionName: '点赞', description: '点赞文章《易经入门指南》', timestamp: '2026-06-02 15:35:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: false },
  { id: 8, actionType: 'share', actionName: '分享', description: '分享课程到微信', timestamp: '2026-06-01 10:00:00', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false },
  { id: 9, actionType: 'setting', actionName: '修改设置', description: '修改隐私设置', timestamp: '2026-05-28 16:00:00', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false },
]

const actionTypes = [
  { value: 'all', label: '全部' },
  { value: 'login', label: '登录' },
  { value: 'view', label: '浏览' },
  { value: 'order', label: '下单' },
  { value: 'payment', label: '支付' },
  { value: 'comment', label: '评论' },
  { value: 'like', label: '点赞' },
  { value: 'share', label: '分享' },
]

const iconMap: Record<ActionType, string> = {
  login: 'user-check',
  logout: 'log-out',
  view: 'eye',
  order: 'shopping-cart',
  payment: 'credit-card',
  comment: 'message-square',
  like: 'heart',
  share: 'share-2',
  setting: 'settings',
  other: 'clock',
}
const colorMap: Record<ActionType, string> = {
  login: '#16a34a',
  logout: '#6b7280',
  view: '#2563eb',
  order: '#ea580c',
  payment: '#c41e3a',
  comment: '#9333ea',
  like: '#db2777',
  share: '#0891b2',
  setting: '#6b7280',
  other: '#9ca3af',
}

function actionIcon(t: ActionType) { return iconMap[t] }
function actionColor(t: ActionType) { return colorMap[t] }
function riskLabel(l: string) { return l === 'low' ? '低风险' : l === 'medium' ? '中风险' : '高风险' }
function timeOnly(ts: string) { return ts.split(' ')[1] || ts }

const filteredLogs = computed(() =>
  logs.value.filter((log) => {
    if (filterType.value !== 'all' && log.actionType !== filterType.value) return false
    if (showAbnormalOnly.value && !log.isAbnormal) return false
    return true
  })
)

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
    return
  }
  loading.value = true
  await new Promise((r) => setTimeout(r, 500))
  const q = searchQuery.value.toLowerCase()
  const user = mockUsers.find(
    (u) => u.uid.toLowerCase().includes(q) || u.phone.includes(searchQuery.value) || u.nickname.includes(searchQuery.value)
  )
  if (user) {
    selectedUser.value = user
    logs.value = mockLogs
  } else {
    selectedUser.value = null
    logs.value = []
    uni.showToast({ title: '未找到匹配用户', icon: 'none' })
  }
  loading.value = false
}

async function handleExport() {
  exporting.value = true
  await new Promise((r) => setTimeout(r, 1000))
  exporting.value = false
  uni.showToast({ title: '日志已导出', icon: 'success' })
}

function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
}
</script>

<style lang="scss" scoped>
.audit-page {
  min-height: 100vh;
  background: #f7f4ef;
}
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #ece6dc;
}
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 56rpx; }
.body { padding: 24rpx; }

.search-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 76rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 38rpx;
  border: 1rpx solid #ece6dc;
}
.search-input { flex: 1; font-size: 28rpx; color: #1a1a1a; }
.search-ph { color: #b3a695; }
.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120rpx;
  height: 76rpx;
  padding: 0 28rpx;
  background: #c41e3a;
  border-radius: 38rpx;
}
.search-btn.disabled { opacity: 0.6; }
.search-btn-text { color: #fff; font-size: 28rpx; font-weight: 500; }

.user-card {
  display: flex;
  gap: 20rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  border: 1rpx solid #ece6dc;
  margin-bottom: 24rpx;
}
.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #c41e3a, #e85a4f);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-avatar-text { color: #fff; font-size: 40rpx; font-weight: 600; }
.user-info { flex: 1; min-width: 0; }
.user-name-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.user-name { font-size: 30rpx; font-weight: 600; color: #1a1a1a; }
.user-uid { font-size: 22rpx; color: #9a8a78; }
.risk-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.risk-low { color: #16a34a; background: #dcfce7; }
.risk-medium { color: #ea580c; background: #ffedd5; }
.risk-high { color: #dc2626; background: #fee2e2; }
.user-phone { display: block; font-size: 26rpx; color: #6b6055; margin-top: 8rpx; }
.user-times { display: flex; gap: 24rpx; margin-top: 8rpx; flex-wrap: wrap; }
.user-time { font-size: 22rpx; color: #9a8a78; }
.user-stats { display: flex; gap: 40rpx; margin-top: 16rpx; }
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 34rpx; font-weight: 600; color: #1a1a1a; }
.stat-label { font-size: 22rpx; color: #9a8a78; }

.filter-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 24rpx; }
.type-scroll { flex: 1; white-space: nowrap; }
.type-list { display: inline-flex; gap: 12rpx; padding-bottom: 4rpx; }
.type-chip { padding: 10rpx 24rpx; background: #ece6dc; border-radius: 32rpx; }
.type-chip.active { background: #c41e3a; }
.type-chip-text { font-size: 26rpx; color: #6b6055; }
.type-chip-text.active { color: #fff; }
.filter-actions { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.abnormal-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #ece6dc;
}
.abnormal-btn.active { border-color: #fca5a5; background: #fee2e2; }
.abnormal-text { font-size: 26rpx; color: #9a8a78; }
.abnormal-text.active { color: #dc2626; }
.export-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #f0c0c8;
  background: #fdf2f4;
}
.export-btn.disabled { opacity: 0.6; }
.export-text { font-size: 26rpx; color: #c41e3a; }

.timeline { }
.empty-logs { padding: 96rpx 0; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.empty-text { font-size: 28rpx; color: #9a8a78; }

.tl-item { position: relative; padding-left: 64rpx; }
.tl-line { position: absolute; left: 27rpx; top: 64rpx; bottom: 0; width: 3rpx; background: #ece6dc; }
.tl-dot {
  position: absolute;
  left: 0;
  top: 16rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0ece4;
}
.dot-abnormal { background: #fee2e2; }
.dot-login { background: #dcfce7; }
.dot-view { background: #dbeafe; }
.dot-order { background: #ffedd5; }
.dot-payment { background: #fde8ec; }
.dot-comment { background: #f3e8ff; }
.dot-like { background: #fce7f3; }
.dot-share { background: #cffafe; }
.dot-setting { background: #f3f4f6; }
.dot-other { background: #f3f4f6; }
.tl-content { padding-bottom: 32rpx; margin-left: 16rpx; }
.content-abnormal { background: rgba(254, 226, 226, 0.4); margin-left: 0; padding: 16rpx; border-radius: 16rpx; }
.tl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.tl-head-left { flex: 1; min-width: 0; }
.tl-name-row { display: flex; align-items: center; gap: 12rpx; }
.tl-name { font-size: 28rpx; font-weight: 600; color: #1a1a1a; }
.tl-abnormal-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: #fee2e2; color: #dc2626; }
.tl-desc { display: block; font-size: 26rpx; color: #6b6055; margin-top: 4rpx; }
.tl-reason { display: flex; align-items: center; gap: 6rpx; margin-top: 8rpx; }
.tl-reason-text { font-size: 22rpx; color: #dc2626; }
.tl-time { font-size: 22rpx; color: #9a8a78; white-space: nowrap; }
.tl-meta { display: flex; align-items: center; gap: 20rpx; margin-top: 12rpx; flex-wrap: wrap; }
.tl-meta-item { display: flex; align-items: center; gap: 6rpx; }
.tl-meta-text { font-size: 22rpx; color: #9a8a78; }
.tl-extra { margin-top: 12rpx; padding: 14rpx; background: #f7f4ef; border-radius: 12rpx; }
.tl-extra-row { display: flex; gap: 12rpx; margin-bottom: 4rpx; }
.tl-extra-key { font-size: 22rpx; color: #9a8a78; }
.tl-extra-val { font-size: 22rpx; color: #1a1a1a; }

.placeholder-empty { padding: 160rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.ph-title { font-size: 32rpx; color: #6b6055; }
.ph-sub { font-size: 26rpx; color: #9a8a78; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
</style>
