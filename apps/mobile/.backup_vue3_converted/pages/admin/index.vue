<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">管理面板</text>
      <view class="w-7" />
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="flex-1 p-4">
      <view class="flex gap-2 mb-3">
        <view v-for="i in 4" :key="i" class="flex-1 bg-white rounded-xl p-4 animate-pulse">
          <view class="w-12 h-5 bg-muted rounded mx-auto mb-2" />
          <view class="w-14 h-3 bg-muted rounded mx-auto" />
        </view>
      </view>
      <view class="bg-white rounded-xl p-4 mb-3 animate-pulse">
        <view class="w-full h-32 bg-muted rounded-lg" />
      </view>
      <view v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 mb-3 animate-pulse">
        <view class="flex items-center gap-3">
          <view class="w-8 h-8 bg-muted rounded" />
          <view class="flex-1">
            <view class="w-24 h-4 bg-muted rounded mb-1" />
            <view class="w-32 h-3 bg-muted rounded" />
          </view>
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="flex-1 p-4">
      <!-- 欢迎栏 -->
      <view class="bg-gradient-to-br from-primary to-[#E74C3C] rounded-2xl p-5 mb-4 shadow-md">
        <view class="flex items-center gap-3 mb-3">
          <view class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <text class="text-2xl text-white"></text>
          </view>
          <view class="flex-1">
            <text class="text-white text-base font-semibold">欢迎回来，管理员</text>
            <text class="text-xs text-white/80">{{ todayStr }} · 晴</text>
          </view>
          <view class="px-3 py-1 bg-white/20 rounded-full">
            <text class="text-xs text-white">在线</text>
          </view>
        </view>
        <view class="flex gap-1 items-center">
          <view class="w-2 h-2 rounded-full bg-green-400" />
          <text class="text-xs text-white/70">系统运行正常 · 最后更新 {{ todayStr }}</text>
        </view>
      </view>

      <!-- 数据概览 -->
      <view class="grid grid-cols-2 gap-2.5 mb-4">
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border">
          <view class="flex items-center gap-2 mb-2">
            <view class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><text class="text-base"></text></view>
            <text class="text-xs text-muted-foreground">累计用户</text>
          </view>
          <text class="text-2xl font-bold text-foreground block">{{ stats.totalUsers }}</text>
          <text class="text-[11px] text-green-500">↑ 12.5% 较昨日</text>
        </view>
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border">
          <view class="flex items-center gap-2 mb-2">
            <view class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><text class="text-base"></text></view>
            <text class="text-xs text-muted-foreground">总营收</text>
          </view>
          <text class="text-2xl font-bold text-foreground block">{{ stats.totalRevenue }}</text>
          <text class="text-[11px] text-green-500">↑ 8.3% 较上月</text>
        </view>
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border">
          <view class="flex items-center gap-2 mb-2">
            <view class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><text class="text-base"></text></view>
            <text class="text-xs text-muted-foreground">内容总数</text>
          </view>
          <text class="text-2xl font-bold text-foreground block">{{ stats.totalContent }}</text>
          <text class="text-[11px] text-orange-500">↑ 3.2% 较上周</text>
        </view>
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border">
          <view class="flex items-center gap-2 mb-2">
            <view class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><text class="text-base">📦</text></view>
            <text class="text-xs text-muted-foreground">总订单</text>
          </view>
          <text class="text-2xl font-bold text-foreground block">{{ stats.totalOrders }}</text>
          <text class="text-[11px] text-green-500">↑ 15.7% 较上月</text>
        </view>
      </view>

      <!-- 图表占位 -->
      <view class="bg-white rounded-xl p-4 mb-4 shadow-sm border border-border">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-semibold text-foreground">📊 近7日趋势（模拟）</text>
          <text class="text-xs text-muted-foreground">查看详情 ›</text>
        </view>
        <!-- 模拟柱状图 -->
        <view class="flex items-end gap-2 h-32 px-2">
          <view v-for="(d, i) in chartData" :key="i" class="flex-1 flex flex-col items-center gap-1">
            <text class="text-[10px] text-muted-foreground">{{ d.value }}</text>
            <view class="w-full rounded-t-sm" :style="{ height: d.percent + '%', background: i === chartData.length - 1 ? '#C41E3A' : '#C9A96E' }" />
            <text class="text-[10px] text-muted-foreground">{{ d.label }}</text>
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="bg-white rounded-xl p-4 mb-4 shadow-sm border border-border">
        <text class="text-sm font-semibold text-foreground block mb-3">⚡ 快捷操作</text>
        <view class="grid grid-cols-4 gap-3">
          <view v-for="q in quickActions" :key="q.label" class="flex flex-col items-center gap-1.5" @click="goQuick(q.path)">
            <view class="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-2xl border border-border">
              {{ q.icon }}
            </view>
            <text class="text-[10px] text-ink-soft text-center">{{ q.label }}</text>
          </view>
        </view>
      </view>

      <!-- 菜单列表 -->
      <view v-for="m in menus" :key="m.label" class="bg-white rounded-xl mb-2.5 shadow-sm border border-border overflow-hidden" @click="goPage(m.path)">
        <view class="flex items-center gap-3 px-3.5 py-4">
          <view class="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-xl border border-border">
            {{ m.icon }}
          </view>
          <view class="flex-1">
            <text class="text-sm font-medium text-foreground block">{{ m.label }}</text>
            <text class="text-xs text-muted-foreground">{{ m.desc }}</text>
          </view>
          <view class="flex items-center gap-2">
            <text v-if="m.badge" class="px-2 py-0.5 bg-primary/10 rounded-full text-[10px] text-primary">{{ m.badge }}</text>
            <text class="text-lg text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 待办列表 -->
      <view class="bg-white rounded-xl p-4 mb-4 shadow-sm border border-border">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-semibold text-foreground"> 最近待办</text>
          <text class="text-xs text-primary">查看全部</text>
        </view>
        <view v-for="(todo, i) in todos" :key="i" class="flex items-start gap-3 py-2.5 border-b border-[#FAF8F5] last:border-b-0">
          <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0', todo.done ? 'bg-primary border-primary' : 'border-[#ccc]']"
            @click="toggleTodo(i)">
            <text v-if="todo.done" class="text-white text-[10px]">✓</text>
          </view>
          <view class="flex-1">
            <text :class="['text-sm', todo.done ? 'text-[#ccc] line-through' : 'text-foreground']">{{ todo.text }}</text>
            <text class="text-xs text-muted-foreground block mt-0.5">{{ todo.time }}</text>
          </view>
          <text :class="['text-[10px] px-2 py-0.5 rounded-full',
            todo.priority === 'high' ? 'bg-red-50 text-red-500' :
            todo.priority === 'medium' ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-500']">
            {{ todo.priorityLabel }}
          </text>
        </view>
      </view>

      <view class="h-5" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const todayStr = ref(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }))

const stats = {
  totalUsers: '12,568',
  totalRevenue: '¥128,900',
  totalContent: '3,245',
  totalOrders: '4,678',
}

const chartData = [
  { label: '周一', value: '580', percent: 58 },
  { label: '周二', value: '720', percent: 72 },
  { label: '周三', value: '610', percent: 61 },
  { label: '周四', value: '890', percent: 89 },
  { label: '周五', value: '760', percent: 76 },
  { label: '周六', value: '920', percent: 92 },
  { label: '周日', value: '680', percent: 68 },
]

const quickActions = [
  { label: '发布公告', icon: '', path: '' },
  { label: '发优惠券', icon: '🎫', path: '' },
  { label: '审核内容', icon: '', path: '' },
  { label: '数据导出', icon: '', path: '' },
]

const menus = [
  { label: '用户审核', icon: '', desc: '审核新注册用户和实名认证', path: 'user-audit', badge: '8待审' },
  { label: '批量发券', icon: '🎫', desc: '管理优惠券发放和活动配置', path: 'batch-coupon-send', badge: '' },
  { label: '内容管理', icon: '', desc: '管理平台文章、课程等内容', path: 'content', badge: '3待审' },
  { label: '订单管理', icon: '📦', desc: '查看和管理用户订单', path: 'orders', badge: '' },
  { label: '数据统计', icon: '📊', desc: '平台运营数据分析和报表', path: 'statistics', badge: '' },
  { label: '系统设置', icon: '⚙️', desc: '平台参数和功能配置', path: 'settings', badge: '' },
]

interface Todo {
  text: string
  time: string
  done: boolean
  priority: string
  priorityLabel: string
}

const todos = ref<Todo[]>([
  { text: '审核新注册用户李明', time: '10分钟前', done: false, priority: 'high', priorityLabel: '紧急' },
  { text: '处理用户投诉：账号异常登录', time: '30分钟前', done: false, priority: 'high', priorityLabel: '紧急' },
  { text: '发布端午节活动公告', time: '2小时前', done: false, priority: 'medium', priorityLabel: '中等' },
  { text: '检查服务器日志异常', time: '昨天', done: true, priority: 'medium', priorityLabel: '中等' },
  { text: '更新隐私政策条款', time: '昨天', done: true, priority: 'low', priorityLabel: '普通' },
  { text: '回复用户咨询邮件', time: '2天前', done: true, priority: 'low', priorityLabel: '普通' },
])

onMounted(() => {
  setTimeout(() => { loading.value = false }, 1200)
})

function goBack() { uni.navigateBack() }

function goPage(p: string) {
  uni.navigateTo({ url: `/pages/admin/${p}/index` })
}

function goQuick(path: string) {
  if (path) uni.navigateTo({ url: `/pages/admin/${path}/index` })
  else uni.showToast({ title: '功能开发中', icon: 'none' })
}

function toggleTodo(index: number) {
  todos.value[index].done = !todos.value[index].done
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
