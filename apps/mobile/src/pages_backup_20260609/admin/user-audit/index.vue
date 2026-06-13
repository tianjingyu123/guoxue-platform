<template>
  <view class="ua-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">用户行为审计</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="ua-body">
      <!-- 搜索框 -->
      <view class="search-row">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索用户ID/手机号/昵称" @confirm="handleSearch" />
        </view>
        <view class="search-btn" @click="handleSearch">
          <text>{{ searching ? '⏳' : '搜索' }}</text>
        </view>
      </view>

      <!-- 用户信息卡片 -->
      <view v-if="selectedUser" class="user-card">
        <view class="uc-top">
          <view class="uc-avatar">{{ selectedUser.nickname[0] }}</view>
          <view class="uc-info">
            <view class="uc-name-row">
              <text class="uc-name">{{ selectedUser.nickname }}</text>
              <text class="uc-uid">UID: {{ selectedUser.uid }}</text>
              <text class="uc-risk" :class="'risk-' + selectedUser.riskLevel">{{ riskLabel(selectedUser.riskLevel) }}</text>
            </view>
            <text class="uc-phone">手机：{{ selectedUser.phone }}</text>
            <view class="uc-dates">
              <text>注册：{{ selectedUser.registerTime }}</text>
              <text>最后活跃：{{ selectedUser.lastActiveTime }}</text>
            </view>
            <view class="uc-stats">
              <view class="uc-stat">
                <text class="uc-stat-val">{{ selectedUser.loginCount }}</text>
                <text class="uc-stat-label">登录次数</text>
              </view>
              <view class="uc-stat">
                <text class="uc-stat-val">{{ selectedUser.orderCount }}</text>
                <text class="uc-stat-label">订单数</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 筛选和操作 -->
      <view v-if="selectedUser" class="action-bar">
        <scroll-view scroll-x class="ab-scroll">
          <text v-for="at in actionTypes" :key="at.value" class="ab-chip" :class="{ active: filterType === at.value }" @click="filterType = at.value">{{ at.label }}</text>
        </scroll-view>
        <view class="ab-right">
          <view class="ab-abnormal" :class="{ active: showAbnormalOnly }" @click="showAbnormalOnly = !showAbnormalOnly">
            <text>⚠️ 异常</text>
          </view>
          <view class="ab-export" @click="handleExport">
            <text>{{ exporting ? '⏳' : '📥 导出' }}</text>
          </view>
        </view>
      </view>

      <!-- 时间轴 -->
      <view v-if="selectedUser" class="timeline">
        <view v-if="filteredLogs.length === 0" class="tl-empty">
          <text class="tl-empty-icon">⏰</text>
          <text class="tl-empty-text">暂无操作记录</text>
        </view>

        <view v-for="(log, i) in filteredLogs" :key="log.id">
          <view class="tl-item">
            <view class="tl-line-col">
              <view class="tl-dot" :class="log.isAbnormal ? 'abnormal' : 'type-' + log.actionType">
                <text v-if="log.isAbnormal">⚠️</text>
                <text v-else>{{ actionEmoji(log.actionType) }}</text>
              </view>
              <view v-if="i < filteredLogs.length - 1" class="tl-line" />
            </view>
            <view class="tl-content" :class="{ abnormal: log.isAbnormal }">
              <view class="tlc-head">
                <view class="tlc-left">
                  <text class="tlc-action">{{ log.actionName }}</text>
                  <text v-if="log.isAbnormal" class="tlc-abnormal-badge">异常</text>
                </view>
                <text class="tlc-time">{{ log.timestamp.split(' ')[1] }}</text>
              </view>
              <text class="tlc-desc">{{ log.description }}</text>
              <view v-if="log.isAbnormal && log.abnormalReason" class="tlc-reason">
                <text>🛡️ {{ log.abnormalReason }}</text>
              </view>
              <view class="tlc-meta">
                <text>{{ log.deviceType === 'mobile' ? '📱' : '💻' }} {{ log.device }}</text>
                <text>IP: {{ log.ip }}</text>
                <text v-if="log.location">📍 {{ log.location }}</text>
              </view>
              <view v-if="log.extra && Object.keys(log.extra).length > 0" class="tlc-extra">
                <text v-for="(val, key) in log.extra" :key="key" class="tlc-extra-item">{{ key }}: {{ val }}</text>
              </view>
            </view>
          </view>

          <!-- 日期分隔 -->
          <view v-if="i < filteredLogs.length - 1 && log.timestamp.split(' ')[0] !== filteredLogs[i + 1].timestamp.split(' ')[0]" class="tl-date-sep">
            <text>{{ filteredLogs[i + 1].timestamp.split(' ')[0] }}</text>
          </view>
        </view>
      </view>

      <!-- 未搜索提示 -->
      <view v-if="!selectedUser && !searching" class="no-data">
        <text class="no-data-icon">👤</text>
        <text class="no-data-title">搜索用户查看操作轨迹</text>
        <text class="no-data-sub">支持用户ID、手机号、昵称搜索</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const searching = ref(false)
const filterType = ref('all')
const showAbnormalOnly = ref(false)
const exporting = ref(false)

interface AuditUser {
  uid: string; nickname: string; phone: string; registerTime: string; lastActiveTime: string
  loginCount: number; orderCount: number; riskLevel: string
}

interface AuditLog {
  id: number; actionType: string; actionName: string; description: string; timestamp: string
  device: string; deviceType: string; ip: string; location?: string
  isAbnormal: boolean; abnormalReason?: string; extra?: Record<string, string>
}

const selectedUser = ref<AuditUser | null>(null)
const logs = ref<AuditLog[]>([])

const mockUsers: AuditUser[] = [
  { uid: 'U10086', nickname: '国学爱好者', phone: '138****8888', registerTime: '2025-03-15 10:30', lastActiveTime: '2026-06-03 09:45', loginCount: 156, orderCount: 23, riskLevel: 'low' },
  { uid: 'U20088', nickname: '可疑用户001', phone: '139****9999', registerTime: '2026-06-01 02:30', lastActiveTime: '2026-06-03 03:15', loginCount: 50, orderCount: 0, riskLevel: 'high' },
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
  { value: 'all', label: '全部' }, { value: 'login', label: '登录' }, { value: 'view', label: '浏览' },
  { value: 'order', label: '下单' }, { value: 'payment', label: '支付' }, { value: 'comment', label: '评论' },
  { value: 'like', label: '点赞' }, { value: 'share', label: '分享' },
]

const filteredLogs = computed(() => logs.value.filter(log => {
  if (filterType.value !== 'all' && log.actionType !== filterType.value) return false
  if (showAbnormalOnly.value && !log.isAbnormal) return false
  return true
}))

function handleSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  const u = mockUsers.find(u => u.uid.includes(searchQuery.value) || u.phone.includes(searchQuery.value) || u.nickname.includes(searchQuery.value))
  if (u) { selectedUser.value = u; logs.value = mockLogs }
  else { selectedUser.value = null; logs.value = [] }
  searching.value = false
}

function riskLabel(level: string) {
  const m: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' }
  return m[level] || level
}

function actionEmoji(type: string): string {
  const m: Record<string, string> = { login: '🔑', logout: '🚪', view: '👁️', order: '🛒', payment: '💳', comment: '💬', like: '❤️', share: '↗', setting: '⚙️', other: '⏰' }
  return m[type] || '📌'
}

async function handleExport() {
  exporting.value = true
  await new Promise(r => setTimeout(r, 1000))
  exporting.value = false
  uni.showToast({ title: '日志已导出', icon: 'success' })
}
</script>

<style scoped>
.ua-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.ua-body { padding: 14rpx 24rpx; }

.search-row { display: flex; gap: 10rpx; margin-bottom: 14rpx; }
.search-box { flex: 1; display: flex; align-items: center; height: 72rpx; background: #F5F1EB; border-radius: 36rpx; padding: 0 18rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 24rpx; color: #333; }
.search-btn { padding: 0 24rpx; background: #C41E3A; border-radius: 36rpx; display: flex; align-items: center; justify-content: center; }
.search-btn text { font-size: 24rpx; color: #fff; }

.user-card { background: #fff; border-radius: 14rpx; padding: 18rpx 20rpx; border: 1px solid #E8E0D5; margin-bottom: 14rpx; }
.uc-top { display: flex; gap: 14rpx; }
.uc-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #C41E3A; flex-shrink: 0; }
.uc-info { flex: 1; min-width: 0; }
.uc-name-row { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; margin-bottom: 4rpx; }
.uc-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.uc-uid { font-size: 20rpx; color: #999; }
.uc-risk { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; }
.uc-risk.risk-low { background: rgba(82,196,26,0.1); color: #52C41A; }
.uc-risk.risk-medium { background: rgba(250,140,22,0.1); color: #FA8C16; }
.uc-risk.risk-high { background: rgba(255,77,79,0.1); color: #FF4D4F; }
.uc-phone { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.uc-dates { display: flex; gap: 16rpx; font-size: 20rpx; color: #BBB; margin-top: 6rpx; }
.uc-stats { display: flex; gap: 32rpx; margin-top: 10rpx; }
.uc-stat { text-align: center; }
.uc-stat-val { font-size: 32rpx; font-weight: 700; color: #333; display: block; }
.uc-stat-label { font-size: 18rpx; color: #BBB; }

.action-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.ab-scroll { display: flex; flex: 1; white-space: nowrap; }
.ab-chip { font-size: 22rpx; padding: 8rpx 18rpx; border-radius: 24rpx; margin-right: 8rpx; background: #F5F1EB; color: #666; display: inline-block; }
.ab-chip.active { background: #C41E3A; color: #fff; }
.ab-right { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.ab-abnormal { font-size: 20rpx; padding: 6rpx 12rpx; border-radius: 8rpx; border: 1px solid #E8E0D5; color: #999; }
.ab-abnormal.active { border-color: #FF4D4F; background: rgba(255,77,79,0.05); color: #FF4D4F; }
.ab-export { font-size: 20rpx; padding: 6rpx 14rpx; border-radius: 8rpx; border: 1px solid #E8E0D5; color: #666; }

.timeline { padding-bottom: 40rpx; }
.tl-empty { text-align: center; padding: 100rpx 0; }
.tl-empty-icon { font-size: 80rpx; opacity: 0.3; display: block; margin-bottom: 12rpx; }
.tl-empty-text { font-size: 24rpx; color: #BBB; }

.tl-item { display: flex; gap: 0; }
.tl-line-col { display: flex; flex-direction: column; align-items: center; width: 56rpx; flex-shrink: 0; }
.tl-dot { width: 44rpx; height: 44rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20rpx; flex-shrink: 0; }
.tl-dot.type-login { background: rgba(82,196,26,0.1); }
.tl-dot.type-view { background: rgba(24,144,255,0.1); }
.tl-dot.type-order { background: rgba(250,140,22,0.1); }
.tl-dot.type-payment { background: rgba(196,30,58,0.1); }
.tl-dot.type-comment { background: rgba(114,46,209,0.1); }
.tl-dot.type-like { background: rgba(235,47,150,0.1); }
.tl-dot.type-share { background: rgba(19,194,194,0.1); }
.tl-dot.type-setting { background: rgba(0,0,0,0.05); }
.tl-dot.abnormal { background: rgba(255,77,79,0.1); }
.tl-line { width: 2rpx; flex: 1; background: #E8E0D5; min-height: 40rpx; margin: 4rpx 0; }

.tl-content { flex: 1; padding-bottom: 24rpx; margin-left: 12rpx; }
.tl-content.abnormal { background: rgba(255,77,79,0.03); margin: -6rpx; padding: 6rpx 12rpx 18rpx; border-radius: 10rpx; }
.tlc-head { display: flex; justify-content: space-between; align-items: center; }
.tlc-left { display: flex; align-items: center; gap: 6rpx; }
.tlc-action { font-size: 26rpx; font-weight: 500; color: #333; }
.tlc-abnormal-badge { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(255,77,79,0.1); color: #FF4D4F; }
.tlc-time { font-size: 20rpx; color: #BBB; flex-shrink: 0; }
.tlc-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.tlc-reason { display: flex; align-items: center; gap: 4rpx; margin-top: 4rpx; }
.tlc-reason text { font-size: 20rpx; color: #FF4D4F; }
.tlc-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.tlc-meta text { font-size: 18rpx; color: #BBB; }
.tlc-extra { margin-top: 8rpx; padding: 10rpx; background: rgba(245,241,235,0.6); border-radius: 8rpx; }
.tlc-extra-item { font-size: 18rpx; color: #999; display: block; }

.tl-date-sep { margin: 8rpx 0 16rpx 56rpx; padding-top: 12rpx; border-top: 1px dashed #E8E0D5; }
.tl-date-sep text { font-size: 20rpx; color: #BBB; }

.no-data { display: flex; flex-direction: column; align-items: center; padding: 160rpx 0; }
.no-data-icon { font-size: 100rpx; opacity: 0.2; margin-bottom: 20rpx; }
.no-data-title { font-size: 28rpx; color: #999; margin-bottom: 6rpx; }
.no-data-sub { font-size: 22rpx; color: #BBB; }
</style>
