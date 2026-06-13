<template>
  <view class="min-h-screen bg-background">
    <!-- 头部 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
      <view class="flex items-center gap-3">
        <view class="p-1 -ml-1" hover-class="opacity-70" @click="goBack">
          <text class="text-lg" style="color:#2C2C2C">←</text>
        </view>
        <text class="text-lg font-semibold" style="color:#2C2C2C">用户行为审计</text>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 搜索框 -->
      <view class="flex gap-2">
        <view class="flex-1 relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></text>
          <input
            class="w-full h-10 pl-9 pr-3 border rounded-lg text-sm text-foreground placeholder-[#999]"
            style="background-color:#fff;border-color:#E8E0D5"
            placeholder="搜索用户ID/手机号/昵称"
            :value="searchQuery"
            @input="onSearchInput"
            @confirm="handleSearch"
          />
        </view>
        <view
          class="px-4 h-10 rounded-lg text-sm flex items-center justify-center text-white"
          style="background-color:#C41E3A;min-width:60px"
          hover-class="opacity-80"
          @click="handleSearch"
        >
          <text v-if="loading" class="animate-spin"></text>
          <text v-else>搜索</text>
        </view>
      </view>

      <!-- 未搜索提示 -->
      <view v-if="!selectedUser && !loading" class="py-20 text-center" style="color:#999">
        <text class="text-5xl block mb-4" style="opacity:0.3"></text>
        <text class="text-lg mb-2 block" style="color:#2C2C2C">搜索用户查看操作轨迹</text>
        <text class="text-sm">支持用户ID、手机号、昵称搜索</text>
      </view>

      <!-- 用户信息卡片 -->
      <view v-if="selectedUser" class="rounded-lg p-4" style="background-color:#fff;border:1px solid #E8E0D5">
        <view class="flex items-start gap-3">
          <view class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style="background-color:#F5F1EB">
            <image :src="selectedUser.avatar" mode="aspectFill" class="w-full h-full" />
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2 flex-wrap">
              <text class="font-medium" style="color:#2C2C2C">{{ selectedUser.nickname }}</text>
              <text class="text-xs" style="color:#999">UID: {{ selectedUser.uid }}</text>
              <view
                class="text-xs px-1.5 py-0.5 rounded"
                :style="{
                  backgroundColor: riskLevelInfo(selectedUser.riskLevel).bg,
                  color: riskLevelInfo(selectedUser.riskLevel).color
                }"
              >
                <text>{{ riskLevelInfo(selectedUser.riskLevel).label }}</text>
              </view>
            </view>
            <text class="text-sm mt-1 block" style="color:#999">手机：{{ selectedUser.phone }}</text>
            <view class="flex items-center gap-4 mt-2 text-xs" style="color:#999">
              <text>注册：{{ selectedUser.registerTime }}</text>
              <text>最后活跃：{{ selectedUser.lastActiveTime }}</text>
            </view>
            <view class="flex items-center gap-4 mt-2">
              <view class="text-center">
                <text class="text-lg font-semibold block" style="color:#2C2C2C">{{ selectedUser.loginCount }}</text>
                <text class="text-xs" style="color:#999">登录次数</text>
              </view>
              <view class="text-center">
                <text class="text-lg font-semibold block" style="color:#2C2C2C">{{ selectedUser.orderCount }}</text>
                <text class="text-xs" style="color:#999">订单数</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 筛选和操作 -->
      <view v-if="selectedUser" class="flex items-start justify-between gap-2">
        <scroll-view scroll-x class="flex-1" show-scrollbar="false" enhanced>
          <view class="flex items-center gap-2 pb-1" style="white-space:nowrap">
            <view
              v-for="type in actionTypes"
              :key="type.value"
              class="px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors inline-block"
              :class="filterType === type.value ? 'text-white' : ''"
              :style="filterType === type.value ? 'background-color:#C41E3A' : 'background-color:#F5F1EB;color:#999'"
              hover-class="opacity-80"
              @click="filterType = type.value"
            >
              <text>{{ type.label }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="flex items-center gap-2 flex-shrink-0">
          <view
            class="flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg border transition-colors"
            :style="showAbnormalOnly ? 'border-color:#FCA5A5;background-color:#FEF2F2;color:#DC2626' : 'border-color:#E8E0D5;color:#999'"
            hover-class="opacity-80"
            @click="showAbnormalOnly = !showAbnormalOnly"
          >
            <text></text>
            <text>异常</text>
          </view>
          <view
            class="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border"
            style="border-color:#E8E0D5;color:#999"
            hover-class="opacity-80"
            @click="handleExport"
          >
            <text v-if="exporting" class="animate-spin"></text>
            <text v-else>⬇</text>
            <text>导出</text>
          </view>
        </view>
      </view>

      <!-- 操作轨迹时间轴 -->
      <view v-if="selectedUser">
        <view v-if="filteredLogs.length === 0" class="py-12 text-center" style="color:#999">
          <text class="text-4xl block mb-3" style="opacity:0.5">🕐</text>
          <text>暂无操作记录</text>
        </view>

        <view v-else class="space-y-0">
          <view
            v-for="(log, index) in filteredLogs"
            :key="log.id"
            class="relative pl-8"
          >
            <!-- 时间轴线 -->
            <view v-if="index < filteredLogs.length - 1" class="absolute left-[14px] top-8 bottom-0 w-0.5" style="background-color:#E8E0D5" />

            <!-- 时间轴点 -->
            <view
              class="absolute left-0 top-2 w-7 h-7 rounded-full flex items-center justify-center"
              :style="log.isAbnormal ? 'background-color:#FEE2E2;color:#DC2626' : getActionColor(log.actionType)"
            >
              <text class="text-xs">{{ log.isAbnormal ? '' : getActionIcon(log.actionType) }}</text>
            </view>

            <!-- 日志内容 -->
            <view
              class="pb-4 ml-2"
              :class="log.isAbnormal ? 'px-2 rounded-lg' : ''"
              :style="log.isAbnormal ? 'background-color:rgba(254,226,226,0.3)' : ''"
            >
              <view class="flex items-start justify-between gap-2">
                <view>
                  <view class="flex items-center gap-2">
                    <text class="font-medium text-sm" style="color:#2C2C2C">{{ log.actionName }}</text>
                    <text v-if="log.isAbnormal" class="text-xs px-1.5 py-0.5 rounded" style="background-color:#FEE2E2;color:#DC2626">异常</text>
                  </view>
                  <text class="text-sm mt-0.5 block" style="color:#999">{{ log.description }}</text>
                  <view v-if="log.isAbnormal && log.abnormalReason" class="flex items-center gap-1 mt-1 text-xs" style="color:#DC2626">
                    <text>🛡️</text>
                    <text>{{ log.abnormalReason }}</text>
                  </view>
                </view>
                <text class="text-xs whitespace-nowrap flex-shrink-0" style="color:#999">{{ log.timestamp.split(' ')[1] }}</text>
              </view>

              <!-- 设备/IP/位置信息 -->
              <view class="flex items-center gap-3 mt-2 text-xs" style="color:#999;flex-wrap:wrap">
                <text class="flex items-center gap-1">
                  {{ log.deviceType === 'mobile' ? '' : '💻' }}
                  {{ log.device }}
                </text>
                <text>IP: {{ log.ip }}</text>
                <text v-if="log.location" class="flex items-center gap-1">📍 {{ log.location }}</text>
              </view>

              <!-- 额外信息（订单号、金额等） -->
              <view v-if="log.extra && Object.keys(log.extra).length > 0" class="mt-2 p-2 rounded text-xs space-y-0.5" style="background-color:rgba(245,241,235,0.5)">
                <view v-for="(value, key) in log.extra" :key="key" class="flex items-center gap-2">
                  <text style="color:#999">{{ key }}:</text>
                  <text style="color:#2C2C2C">{{ value }}</text>
                </view>
              </view>

              <!-- 日期分隔 -->
              <view
                v-if="index < filteredLogs.length - 1 && log.timestamp.split(' ')[0] !== filteredLogs[index + 1].timestamp.split(' ')[0]"
                class="mt-4 pt-2"
                style="border-top:1px dashed #E8E0D5"
              >
                <text class="text-xs" style="color:#999">{{ filteredLogs[index + 1].timestamp.split(' ')[0] }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 类型定义
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
  avatar: string
  phone: string
  registerTime: string
  lastActiveTime: string
  loginCount: number
  orderCount: number
  riskLevel: 'low' | 'medium' | 'high'
}

// Mock 数据
const mockUsers: AuditUser[] = [
  { id: 1, uid: 'U10086', nickname: '国学爱好者', avatar: 'https://via.placeholder.com/56', phone: '138****8888', registerTime: '2025-03-15 10:30', lastActiveTime: '2026-06-03 09:45', loginCount: 156, orderCount: 23, riskLevel: 'low' },
  { id: 2, uid: 'U20088', nickname: '可疑用户001', avatar: 'https://via.placeholder.com/56', phone: '139****9999', registerTime: '2026-06-01 02:30', lastActiveTime: '2026-06-03 03:15', loginCount: 50, orderCount: 0, riskLevel: 'high' },
  { id: 3, uid: 'U30099', nickname: '易经研究者', avatar: 'https://via.placeholder.com/56', phone: '137****5678', registerTime: '2025-08-20', lastActiveTime: '2026-06-02 22:00', loginCount: 89, orderCount: 5, riskLevel: 'medium' },
]

const mockLogs: AuditLog[] = [
  { id: 1, actionType: 'login', actionName: '用户登录', description: '密码登录成功', timestamp: '2026-06-03 09:45:23', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false },
  { id: 2, actionType: 'view', actionName: '浏览课程', description: '浏览《八字命理入门》课程详情', timestamp: '2026-06-03 09:46:15', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false, extra: { courseId: 'C1001', courseName: '八字命理入门' } },
  { id: 3, actionType: 'order', actionName: '创建订单', description: '购买《八字命理入门》课程', timestamp: '2026-06-03 09:48:30', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false, extra: { orderId: 'O202606030001', amount: '299' } },
  { id: 4, actionType: 'payment', actionName: '支付成功', description: '微信支付 ¥299.00', timestamp: '2026-06-03 09:49:05', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false, extra: { payMethod: '微信支付', amount: '299.00' } },
  { id: 5, actionType: 'login', actionName: '用户登录', description: '短信验证码登录', timestamp: '2026-06-02 14:20:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: true, abnormalReason: '异地登录：与上次登录地点不一致' },
  { id: 6, actionType: 'like', actionName: '点赞', description: '点赞文章《易经入门指南》', timestamp: '2026-06-02 15:35:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: false },
  { id: 7, actionType: 'share', actionName: '分享', description: '分享课程到微信', timestamp: '2026-06-01 10:00:00', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false },
  { id: 8, actionType: 'comment', actionName: '发表评论', description: '对《紫微斗数》课程发表评价', timestamp: '2026-06-02 15:30:00', device: 'Chrome 125', deviceType: 'desktop', ip: '116.25.xxx.xxx', location: '广东省深圳市', isAbnormal: false },
  { id: 9, actionType: 'setting', actionName: '修改设置', description: '修改隐私设置', timestamp: '2026-05-28 16:00:00', device: 'iPhone 15 Pro', deviceType: 'mobile', ip: '223.104.xxx.xxx', location: '北京市朝阳区', isAbnormal: false },
]

// 状态
const searchQuery = ref('')
const selectedUser = ref<AuditUser | null>(null)
const logs = ref<AuditLog[]>([])
const loading = ref(false)
const filterType = ref<string>('all')
const showAbnormalOnly = ref(false)
const exporting = ref(false)

// 操作类型列表
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

// 搜索输入
function onSearchInput(e: any) {
  searchQuery.value = e.detail.value
}

// 操作类型图标
function getActionIcon(type: ActionType): string {
  const icons: Record<ActionType, string> = {
    login: '→', logout: '←', view: '', order: '', payment: '',
    comment: '', like: '', share: '↗', setting: '⚙️', other: '🕐',
  }
  return icons[type] || '•'
}

// 操作类型颜色
function getActionColor(type: ActionType): string {
  const colors: Record<ActionType, string> = {
    login: 'background-color:#F0FDF4;color:#16A34A',
    logout: 'background-color:#F9FAFB;color:#6B7280',
    view: 'background-color:#EFF6FF;color:#2563EB',
    order: 'background-color:#FFF7ED;color:#D97706',
    payment: 'background-color:rgba(196,30,58,0.1);color:#C41E3A',
    comment: 'background-color:#FAF5FF;color:#9333EA',
    like: 'background-color:#FDF2F8;color:#DB2777',
    share: 'background-color:#ECFEFF;color:#0891B2',
    setting: 'background-color:#F9FAFB;color:#6B7280',
    other: 'background-color:#F3F4F6;color:#9CA3AF',
  }
  return colors[type] || 'background-color:#F3F4F6;color:#9CA3AF'
}

// 风险等级
function riskLevelInfo(level: string) {
  const info: Record<string, { label: string; bg: string; color: string }> = {
    low: { label: '低风险', bg: '#F0FDF4', color: '#16A34A' },
    medium: { label: '中风险', bg: '#FFF7ED', color: '#D97706' },
    high: { label: '高风险', bg: '#FEF2F2', color: '#DC2626' },
  }
  return info[level] || info.low
}

// 筛选日志
const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    if (filterType.value !== 'all' && log.actionType !== filterType.value) return false
    if (showAbnormalOnly.value && !log.isAbnormal) return false
    return true
  })
})

// 搜索
async function handleSearch() {
  if (!searchQuery.value.trim()) return
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 500))

  const user = mockUsers.find(u =>
    u.uid.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    u.phone.includes(searchQuery.value) ||
    u.nickname.includes(searchQuery.value)
  )

  selectedUser.value = user || null
  logs.value = user ? mockLogs : []
  loading.value = false
}

// 导出
async function handleExport() {
  exporting.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  exporting.value = false
  uni.showToast({ title: '日志已导出', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
