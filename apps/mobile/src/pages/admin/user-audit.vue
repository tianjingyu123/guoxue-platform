<template>
  <view class="page">
    <view class="header">
      <view class="header-left">
        <text
          class="back-btn"
          @click="goBack"
        >
          ‹
        </text>
        <text class="header-title">
          用户行为审计
        </text>
      </view>
    </view>
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">
          🔍
        </text>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索用户ID/手机号/昵称"
          @confirm="handleSearch"
        >
      </view>
      <view
        class="search-btn"
        @click="handleSearch"
      >
        <text>{{ loading ? '⏳' : '搜索' }}</text>
      </view>
    </view>

    <view
      v-if="selectedUser"
      class="user-card"
    >
      <view class="user-card-top">
        <view class="uc-avatar">
          <text class="uc-avatar-text">
            👤
          </text>
        </view>
        <view class="uc-info">
          <view class="uc-name-row">
            <text class="uc-name">
              {{ selectedUser.nickname }}
            </text>
            <text class="uc-uid">
              UID: {{ selectedUser.uid }}
            </text>
            <text
              class="uc-risk"
              :class="'risk-' + selectedUser.riskLevel"
            >
              {{ riskLabel(selectedUser.riskLevel) }}
            </text>
          </view>
          <text class="uc-phone">
            手机：{{ selectedUser.phone }}
          </text>
          <view class="uc-meta">
            <text>注册：{{ selectedUser.registerTime }}</text><text>最后活跃：{{ selectedUser.lastActiveTime }}</text>
          </view>
          <view class="uc-stats">
            <view class="uc-stat">
              <text class="uc-stat-num">
                {{ selectedUser.loginCount }}
              </text><text class="uc-stat-label">
                登录次数
              </text>
            </view>
            <view class="uc-stat">
              <text class="uc-stat-num">
                {{ selectedUser.orderCount }}
              </text><text class="uc-stat-label">
                订单数
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view
      v-if="selectedUser"
      class="filter-bar"
    >
      <scroll-view
        scroll-x
        class="filter-scroll"
        show-scrollbar="false"
      >
        <view class="filter-btn-row">
          <text
            v-for="t in actionTypes"
            :key="t.value"
            class="filter-tag"
            :class="{ active: filterType === t.value }"
            @click="filterType = t.value"
          >
            {{ t.label }}
          </text>
        </view>
      </scroll-view>
      <view class="filter-actions">
        <text
          class="abnormal-btn"
          :class="{ active: showAbnormalOnly }"
          @click="showAbnormalOnly = !showAbnormalOnly"
        >
          ⚠ 异常
        </text>
      </view>
    </view>

    <view
      v-if="selectedUser && filteredLogs.length"
      class="log-list"
    >
      <view
        v-for="log in filteredLogs"
        :key="log.id"
        class="log-item"
        :class="{ abnormal: log.isAbnormal }"
      >
        <view
          class="log-dot"
          :class="{ 'dot-abnormal': log.isAbnormal }"
        >
          <text>{{ log.isAbnormal ? '⚠' : actionIcon(log.actionType) }}</text>
        </view>
        <view class="log-content">
          <view class="log-top">
            <view class="log-name-row">
              <text class="log-name">
                {{ log.actionName }}
              </text>
              <text
                v-if="log.isAbnormal"
                class="log-abnormal-tag"
              >
                异常
              </text>
            </view>
            <text class="log-time">
              {{ log.timestamp.split(' ')[1] }}
            </text>
          </view>
          <text class="log-desc">
            {{ log.description }}
          </text>
          <text
            v-if="log.isAbnormal && log.abnormalReason"
            class="log-abnormal-reason"
          >
            🛡 {{ log.abnormalReason }}
          </text>
          <view class="log-device">
            <text>{{ log.deviceType === 'mobile' ? '📱' : '💻' }} {{ log.device }}</text>
            <text>IP: {{ log.ip }}</text>
            <text v-if="log.location">
              📍 {{ log.location }}
            </text>
          </view>
          <view
            v-if="log.extra && Object.keys(log.extra).length"
            class="log-extra"
          >
            <view
              v-for="(v, k) in log.extra"
              :key="k"
              class="log-extra-item"
            >
              <text class="extra-key">
                {{ k }}:
              </text><text class="extra-val">
                {{ v }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view
      v-if="selectedUser && !filteredLogs.length"
      class="empty-state"
    >
      <text class="empty-icon">
        🕐
      </text>
      <text class="empty-text">
        暂无操作记录
      </text>
    </view>

    <view
      v-if="!selectedUser && !loading"
      class="empty-state"
      style="padding-top:160rpx"
    >
      <text
        class="empty-icon"
        style="font-size:80rpx"
      >
        👤
      </text>
      <text
        class="empty-text"
        style="font-size:28rpx"
      >
        搜索用户查看操作轨迹
      </text>
      <text class="empty-sub">
        支持用户ID、手机号、昵称搜索
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { userApi } from '../../api'

interface AuditUser { id: number; uid: string; nickname: string; avatar: string; phone: string; registerTime: string; lastActiveTime: string; loginCount: number; orderCount: number; riskLevel: 'low' | 'medium' | 'high' }
interface AuditLog { id: number; actionType: string; actionName: string; description: string; timestamp: string; device: string; deviceType: string; ip: string; location?: string; isAbnormal: boolean; abnormalReason?: string; extra?: Record<string, string> }

const searchQuery = ref(''); const selectedUser = ref<AuditUser | null>(null); const logs = ref<AuditLog[]>([]); const loading = ref(false)
const filterType = ref('all'); const showAbnormalOnly = ref(false)

const actionTypes = [{ value: 'all', label: '全部' }, { value: 'login', label: '登录' }, { value: 'view', label: '浏览' }, { value: 'order', label: '下单' }, { value: 'payment', label: '支付' }, { value: 'comment', label: '评论' }, { value: 'like', label: '点赞' }, { value: 'share', label: '分享' }]

const mockUsers: AuditUser[] = [{ id: 1, uid: 'U10086', nickname: '国学爱好者', avatar: '', phone: '138****8888', registerTime: '2025-03-15 10:30', lastActiveTime: '2026-06-03 09:45', loginCount: 156, orderCount: 23, riskLevel: 'low' }, { id: 2, uid: 'U20088', nickname: '可疑用户001', avatar: '', phone: '139****9999', registerTime: '2026-06-01 02:30', lastActiveTime: '2026-06-03 03:15', loginCount: 50, orderCount: 0, riskLevel: 'high' }]
const mockLogs: AuditLog[] = [
  { id: 1, actionType: 'login', actionName: '用户登录', description: '密码登录成功', timestamp: '2026-06-03 09:45:23', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false },
  { id: 2, actionType: 'view', actionName: '浏览课程', description: '浏览《八字命理入门》课程详情', timestamp: '2026-06-03 09:46:15', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', isAbnormal: false },
  { id: 3, actionType: 'order', actionName: '创建订单', description: '购买《八字命理入门》课程', timestamp: '2026-06-03 09:48:30', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', isAbnormal: false, extra: { orderId: 'O202606030001', amount: '299' } },
  { id: 4, actionType: 'comment', actionName: '发表评论', description: '对《紫微斗数》课程发表评价', timestamp: '2026-06-02 15:30:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: false },
  { id: 5, actionType: 'login', actionName: '用户登录', description: '短信验证码登录', timestamp: '2026-06-02 14:20:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: true, abnormalReason: '异地登录：与上次登录地点不一致' },
]

const filteredLogs = computed(() => logs.value.filter(log => {
  if (filterType.value !== 'all' && log.actionType !== filterType.value) return false
  if (showAbnormalOnly.value && !log.isAbnormal) return false
  return true
}))

function handleSearch() {
  if (!searchQuery.value.trim()) return
  loading.value = true
  setTimeout(() => {
    const u = mockUsers.find(u => u.uid.toLowerCase().includes(searchQuery.value.toLowerCase()) || u.phone.includes(searchQuery.value) || u.nickname.includes(searchQuery.value))
    if (u) { selectedUser.value = u; logs.value = mockLogs } else { selectedUser.value = null; logs.value = [] }
    loading.value = false
  }, 500)
}

function riskLabel(level: string): string {
  const map: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' }; return map[level] || level
}

function actionIcon(type: string): string {
  const map: Record<string, string> = { login: '🔑', view: '👁', order: '🛒', payment: '💳', comment: '💬', like: '❤', share: '📤', setting: '⚙' }
  return map[type] || '🕐'
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }
.header { background: #fff; padding: 20rpx 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.search-bar { display: flex; gap: 12rpx; padding: 16rpx 24rpx; background: #fff; }
.search-input-wrap { flex: 1; display: flex; align-items: center; background: #F5F0E8; border-radius: 12rpx; padding: 0 16rpx; }
.search-icon { font-size: 28rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 26rpx; padding: 14rpx 0; background: transparent; }
.search-btn { padding: 14rpx 28rpx; background: #C41E3A; color: #fff; border-radius: 12rpx; font-size: 26rpx; }
.user-card { margin: 16rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.uc-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.uc-avatar-text { font-size: 40rpx; }
.user-card-top { display: flex; gap: 16rpx; }
.uc-info { flex: 1; min-width: 0; }
.uc-name-row { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.uc-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.uc-uid { font-size: 22rpx; color: #999; }
.uc-risk { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; }
.risk-low { background: #e8f5e9; color: #2e7d32; }
.risk-medium { background: #fff3e0; color: #e65100; }
.risk-high { background: #fde8e8; color: #c62828; }
.uc-phone { font-size: 24rpx; color: #666; margin-top: 6rpx; display: block; }
.uc-meta { display: flex; gap: 16rpx; font-size: 22rpx; color: #999; margin-top: 8rpx; }
.uc-stats { display: flex; gap: 32rpx; margin-top: 12rpx; }
.uc-stat { text-align: center; }
.uc-stat-num { font-size: 32rpx; font-weight: bold; color: #2C2C2C; display: block; }
.uc-stat-label { font-size: 22rpx; color: #999; }
.filter-bar { padding: 0 24rpx 16rpx; display: flex; align-items: center; gap: 12rpx; }
.filter-scroll { flex: 1; white-space: nowrap; }
.filter-btn-row { display: inline-flex; gap: 12rpx; }
.filter-tag { display: inline-block; padding: 8rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; background: #fff; color: #666; border: 1rpx solid #E5E1DB; }
.filter-tag.active { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.filter-actions { flex-shrink: 0; }
.abnormal-btn { padding: 8rpx 20rpx; border: 1rpx solid #E5E1DB; border-radius: 28rpx; font-size: 24rpx; color: #666; background: #fff; }
.abnormal-btn.active { border-color: #e53935; color: #e53935; background: #fde8e8; }
.log-list { padding: 0 24rpx; }
.log-item { display: flex; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.log-item.abnormal { background: rgba(229,57,53,0.03); margin: 0 -24rpx; padding: 16rpx 24rpx; border-radius: 8rpx; }
.log-dot { width: 48rpx; height: 48rpx; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 22rpx; }
.dot-abnormal { background: #fde8e8; }
.log-content { flex: 1; min-width: 0; }
.log-top { display: flex; justify-content: space-between; align-items: flex-start; }
.log-name-row { display: flex; align-items: center; gap: 8rpx; }
.log-name { font-size: 26rpx; font-weight: 500; color: #2C2C2C; }
.log-abnormal-tag { font-size: 20rpx; padding: 0 10rpx; background: #fde8e8; color: #c62828; border-radius: 8rpx; }
.log-time { font-size: 22rpx; color: #999; flex-shrink: 0; }
.log-desc { font-size: 24rpx; color: #666; margin-top: 4rpx; display: block; }
.log-abnormal-reason { font-size: 22rpx; color: #c62828; margin-top: 4rpx; display: block; }
.log-device { display: flex; gap: 16rpx; font-size: 22rpx; color: #999; margin-top: 8rpx; flex-wrap: wrap; }
.log-extra { background: #FAFAFA; border-radius: 8rpx; padding: 12rpx; margin-top: 8rpx; }
.log-extra-item { display: flex; gap: 8rpx; font-size: 22rpx; margin-bottom: 4rpx; }
.extra-key { color: #999; }
.extra-val { color: #2C2C2C; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; }
.empty-icon { font-size: 60rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; }
.empty-sub { font-size: 24rpx; color: #ccc; margin-top: 8rpx; }
</style>
