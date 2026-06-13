<template>
  <view class="min-h-screen" style="background-color: #FAF8F5; padding-bottom: 80px;">
    <!-- Header -->
    <view class="sticky top-0 z-50" style="background: linear-gradient(to right, #C41E3A, #A01830); color: #FFFFFF;">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1" style="cursor: pointer;">
            <text style="color: #FFFFFF; font-size: 22px; line-height: 1;">❮</text>
          </view>
          <text class="font-semibold" style="font-size: 18px;">管理中心</text>
        </view>
        <view class="relative p-2" style="cursor: pointer;">
          <text style="color: #FFFFFF; font-size: 18px;"></text>
          <view v-if="totalPending > 0" class="absolute top-1 right-1 w-2 h-2 rounded-full" style="background-color: #facc15;" />
        </view>
      </view>

      <!-- 管理员信息 -->
      <view class="px-4 pb-4">
        <view class="flex items-center gap-3">
          <view class="w-12 h-12 rounded-full flex items-center justify-center" style="background-color: rgba(255,255,255,0.2);">
            <text style="color: #FFFFFF; font-size: 20px;"></text>
          </view>
          <view>
            <text class="font-medium block" style="color: #FFFFFF;">{{ adminInfo.name }}</text>
            <text class="text-sm block" style="color: rgba(255,255,255,0.8);">{{ adminInfo.roleName }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading State -->
    <view v-if="loading" class="space-y-6 p-4">
      <!-- 管理员信息骨架 -->
      <view class="flex items-center gap-3">
        <view class="w-12 h-12 rounded-full skeleton-pulse" style="background-color: #F0EBE5;" />
        <view class="space-y-2">
          <view class="h-5 w-24 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
          <view class="h-4 w-32 rounded skeleton-pulse" style="background-color: #F0EBE5;" />
        </view>
      </view>

      <!-- 数据概览骨架 -->
      <view class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="h-24 rounded-xl skeleton-pulse" style="background-color: #F0EBE5;" />
      </view>

      <!-- 快捷功能骨架 -->
      <view class="grid grid-cols-4 gap-3">
        <view v-for="i in 8" :key="'action-' + i" class="h-20 rounded-xl skeleton-pulse" style="background-color: #F0EBE5;" />
      </view>

      <!-- 待处理事项骨架 -->
      <view class="space-y-3">
        <view v-for="i in 3" :key="'pending-' + i" class="h-20 rounded-xl skeleton-pulse" style="background-color: #F0EBE5;" />
      </view>
    </view>

    <!-- Error State -->
    <view v-else-if="error" class="flex flex-col items-center justify-center py-20 px-4">
      <text style="font-size: 48px; margin-bottom: 12px;"></text>
      <text class="text-base mb-2" style="color: #2C2C2C;">加载失败</text>
      <text class="text-sm mb-4" style="color: #999;">{{ error }}</text>
      <view
        @click="loadData"
        class="px-6 py-2 rounded-lg text-sm"
        style="background-color: #C41E3A; color: #FFFFFF; cursor: pointer;"
      >
        重新加载
      </view>
    </view>

    <!-- Content -->
    <view v-else class="p-4 space-y-5">
      <!-- 数据概览 -->
      <section>
        <text class="text-sm font-medium block mb-3" style="color: #999;">数据概览</text>
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="item in overviewItems"
            :key="item.key"
            class="p-3 rounded-xl"
            style="background-color: #FFFFFF;"
          >
            <view class="flex items-start justify-between">
              <view class="flex-1">
                <text class="text-xs block mb-1" style="color: #999;">{{ item.label }}</text>
                <text class="text-xl font-bold block" style="color: #1a1a1a;">
                  {{ item.value.toLocaleString() }}
                  <text v-if="item.unit" class="text-sm font-normal ml-1" style="color: #999;">{{ item.unit }}</text>
                </text>
                <view v-if="item.trend && item.trend.type !== 'flat'" class="flex items-center gap-1 mt-1">
                  <text v-if="item.trend.type === 'up'" style="color: #22c55e; font-size: 12px;">▲</text>
                  <text v-else style="color: #ef4444; font-size: 12px;">▼</text>
                  <text :style="{ fontSize: '12px', color: item.trend.type === 'up' ? '#22c55e' : '#ef4444' }">
                    {{ item.trend.value }}%
                  </text>
                  <text style="font-size: 12px; color: #999;">{{ item.trend.label }}</text>
                </view>
              </view>
              <view class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: #FFF8F0;">
                <text style="color: #C9A96E; font-size: 18px;">{{ getOverviewIcon(item.key) }}</text>
              </view>
            </view>
          </view>
        </view>
      </section>

      <!-- 快捷功能 -->
      <section>
        <text class="text-sm font-medium block mb-3" style="color: #999;">快捷功能</text>
        <view class="grid grid-cols-4 gap-3">
          <view
            v-for="action in quickActions"
            :key="action.id"
            @click="goToAction(action)"
            class="flex flex-col items-center gap-1.5 p-3 rounded-xl relative"
            hover-class="action-hover"
            style="background-color: #FFFFFF; cursor: pointer;"
          >
            <view
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :style="{ backgroundColor: action.color + '20' }"
            >
              <text :style="{ color: action.color, fontSize: '18px' }">{{ getActionIcon(action.icon) }}</text>
            </view>
            <text class="text-xs" style="color: #4a4a4a;">{{ action.label }}</text>
            <view
              v-if="action.badge && action.badge > 0"
              class="absolute -top-1 -right-1 px-1.5 text-xs text-white rounded-full flex items-center justify-center"
              style="background-color: #C41E3A; min-width: 20px; height: 20px; border: none;"
            >
              <text style="font-size: 11px;">{{ action.badge > 99 ? '99+' : action.badge }}</text>
            </view>
          </view>
        </view>
      </section>

      <!-- 待处理事项 -->
      <section>
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-medium" style="color: #999;">
            待处理事项
            <text v-if="totalPending > 0" class="ml-2 px-2 py-0.5 text-xs text-white rounded-full" style="background-color: #C41E3A;">{{ totalPending }}</text>
          </text>
          <view
            @click="goToPendingAll"
            class="flex items-center text-xs"
            style="color: #C9A96E; cursor: pointer;"
          >
            <text>查看全部</text>
            <text style="font-size: 14px; margin-left: 4px;">❯</text>
          </view>
        </view>

        <view v-if="pendingItems.length > 0" class="space-y-3">
          <view
            v-for="item in pendingItems.slice(0, 5)"
            :key="item.id"
            @click="goToPendingDetail(item)"
            class="p-3 rounded-xl"
            hover-class="pending-hover"
            style="background-color: #FFFFFF; cursor: pointer;"
          >
            <view class="flex items-start gap-3">
              <!-- Priority indicator -->
              <view
                class="w-1 rounded-full flex-shrink-0"
                :style="{
                  height: '48px',
                  backgroundColor: item.priority === 'high' ? '#C41E3A' : item.priority === 'medium' ? '#C9A96E' : '#d1d5db'
                }"
              />
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2 mb-1">
                  <text class="font-medium text-sm" style="color: #1a1a1a;">{{ item.title }}</text>
                  <view
                    class="px-1.5 py-0.5 rounded text-xs"
                    :style="{
                      backgroundColor: item.priority === 'high' ? '#fee2e2' : item.priority === 'medium' ? '#fef3c7' : '#f3f4f6',
                      color: item.priority === 'high' ? '#dc2626' : item.priority === 'medium' ? '#d97706' : '#4b5563'
                    }"
                  >
                    <text>{{ item.priority === 'high' ? '紧急' : item.priority === 'medium' ? '一般' : '普通' }}</text>
                  </view>
                </view>
                <text class="text-xs truncate block" style="color: #999;">{{ item.description }}</text>
                <view class="flex items-center gap-1 mt-1.5">
                  <text style="font-size: 10px; color: #999;">⏱️</text>
                  <text class="text-xs" style="color: #999;">{{ item.createdAt }}</text>
                  <text class="text-xs mx-1" style="color: #ccc;">|</text>
                  <text class="text-xs" style="color: #C9A96E;">{{ item.type }}</text>
                </view>
              </view>
              <text style="font-size: 16px; color: #ccc; flex-shrink: 0;">❯</text>
            </view>
          </view>
        </view>

        <!-- Empty pending state -->
        <view v-else class="p-8 rounded-xl text-center" style="background-color: #FFFFFF;">
          <view class="text-center" style="color: #999;">
            <text style="font-size: 40px; display: block; margin-bottom: 8px; opacity: 0.5;">📊</text>
            <text class="text-sm" style="color: #999;">暂无待处理事项</text>
          </view>
        </view>
      </section>

      <!-- 分类统计 -->
      <section>
        <text class="text-sm font-medium block mb-3" style="color: #999;">分类统计</text>
        <view class="p-4 rounded-xl" style="background-color: #FFFFFF;">
          <view class="grid grid-cols-3 gap-4">
            <view v-for="(stat, key) in categoryStats" :key="key" class="text-center">
              <text class="text-xl font-bold block" :style="{ color: stat.color }">{{ stat.count }}</text>
              <text class="text-xs block mt-1" style="color: #999;">{{ stat.label }}</text>
            </view>
          </view>
        </view>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// --- Types ---
interface AdminInfo {
  name: string
  roleName: string
}

interface TrendData {
  type: 'up' | 'down' | 'flat'
  value: number
  label: string
}

interface OverviewItem {
  key: string
  label: string
  value: number
  unit?: string
  trend?: TrendData
}

interface QuickAction {
  id: string
  icon: string
  label: string
  color: string
  badge: number
}

interface PendingItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  type: string
}

interface CategoryStat {
  label: string
  count: number
  color: string
}

// --- State ---
const loading = ref(true)
const error = ref<string | null>(null)

const adminInfo = ref<AdminInfo>({
  name: '管理员',
  roleName: '平台管理员',
})

const overviewItems = ref<OverviewItem[]>([])
const quickActions = ref<QuickAction[]>([])
const pendingItems = ref<PendingItem[]>([])
const categoryStats = ref<Record<string, CategoryStat>>({})

const totalPending = computed(() =>
  Object.values(categoryStats.value).reduce((a, b) => a + b.count, 0)
)

// --- Lifecycle ---
onLoad(() => {
  loadData()
})

// --- Data Loading ---
function loadData() {
  loading.value = true
  error.value = null

  // 模拟 API 请求（对应 V0 的 Promise.all 模式）
  setTimeout(() => {
    try {
      // 管理员信息
      adminInfo.value = {
        name: '管理员',
        roleName: '平台管理员',
      }

      // 数据概览
      overviewItems.value = [
        { key: 'users', label: '总用户数', value: 12860, unit: '人', trend: { type: 'up', value: 12, label: '较上月' } },
        { key: 'orders', label: '今日订单', value: 328, unit: '单', trend: { type: 'up', value: 5, label: '较昨日' } },
        { key: 'revenue', label: '本月收入', value: 186000, unit: '元', trend: { type: 'up', value: 8, label: '较上月' } },
        { key: 'reports', label: '待处理举报', value: 12, unit: '条', trend: { type: 'down', value: 3, label: '较昨日' } },
      ]

      // 快捷功能
      quickActions.value = [
        { id: '1', icon: 'users', label: '用户管理', color: '#C41E3A', badge: 12 },
        { id: '2', icon: 'content', label: '内容审核', color: '#C9A96E', badge: 15 },
        { id: '3', icon: 'order', label: '订单管理', color: '#4A6FA5', badge: 0 },
        { id: '4', icon: 'finance', label: '财务管理', color: '#2E7D32', badge: 0 },
        { id: '5', icon: 'report', label: '举报处理', color: '#E65100', badge: 8 },
        { id: '6', icon: 'cert', label: '认证审核', color: '#6A1B9A', badge: 7 },
        { id: '7', icon: 'withdraw', label: '提现管理', color: '#00695C', badge: 5 },
        { id: '8', icon: 'settings', label: '系统设置', color: '#546E7A', badge: 0 },
      ]

      // 待处理事项
      pendingItems.value = [
        { id: '1', title: '用户举报违规内容', description: '用户举报某课程涉嫌虚假宣传', priority: 'high', createdAt: '10分钟前', type: '内容审核' },
        { id: '2', title: '退款申请待处理', description: '用户申请课程退款', priority: 'medium', createdAt: '30分钟前', type: '退款申请' },
        { id: '3', title: '新讲师认证申请', description: '新讲师提交资质认证', priority: 'medium', createdAt: '1小时前', type: '认证审核' },
      ]

      // 分类统计
      categoryStats.value = {
        contentReview: { label: '内容审核', count: 15, color: '#C41E3A' },
        userReport: { label: '用户举报', count: 8, color: '#DC143C' },
        orderRefund: { label: '退款申请', count: 3, color: '#C9A96E' },
        withdraw: { label: '提现审核', count: 5, color: '#8B4513' },
        certification: { label: '认证审核', count: 7, color: '#9370DB' },
        feedback: { label: '用户反馈', count: 12, color: '#708090' },
      }

      loading.value = false
    } catch (err) {
      error.value = '网络错误，请重试'
      loading.value = false
    }
  }, 800)
}

// --- Icon Mappings ---
const overviewIconMap: Record<string, string> = {
  users: '',
  orders: '',
  revenue: '',
  reports: '',
}

const actionIconMap: Record<string, string> = {
  users: '',
  content: '',
  order: '️',
  finance: '',
  report: '',
  cert: '🪪',
  withdraw: '',
  settings: '⚙️',
}

function getOverviewIcon(key: string): string {
  return overviewIconMap[key] || '📊'
}

function getActionIcon(icon: string): string {
  return actionIconMap[icon] || '📌'
}

// --- Navigation ---
function goToAction(action: QuickAction) {
  uni.navigateTo({ url: '/admin/' + action.id + '/index' })
}

function goToPendingAll() {
  uni.navigateTo({ url: '/admin/pending/index' })
}

function goToPendingDetail(item: PendingItem) {
  uni.navigateTo({ url: '/admin/detail/index?id=' + item.id })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton-pulse {
  animation: skeletonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.action-hover {
  background-color: rgba(249, 250, 251, 1);
}
.pending-hover {
  background-color: rgba(249, 250, 251, 1);
}
</style>
