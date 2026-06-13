<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 border-b border-border" style="backdrop-filter: blur(12px);">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1">
            <text class="text-xl text-foreground">←</text>
          </view>
          <view class="min-w-0">
            <text class="font-semibold text-sm text-foreground truncate block">{{ liveData.title }}</text>
            <text class="text-xs text-muted-foreground">{{ liveData.startTime }}</text>
          </view>
        </view>
        <view class="flex items-center gap-2">
          <view class="h-8 px-2 border border-border rounded-lg flex items-center text-xs text-foreground">
            <text></text>
            <text class="ml-1">导出报告</text>
          </view>
          <view class="h-8 px-2 border border-border rounded-lg flex items-center text-xs text-foreground">
            <text></text>
            <text class="ml-1">分享</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="border-b border-border">
      <view class="flex px-4 h-10 overflow-x-auto" style="scrollbar-width:none">
        <view
          v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex-shrink-0 px-3 h-full flex items-center text-xs border-b-2', activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground']"
        >
          {{ tab.label }}
        </view>
      </view>
    </view>

    <!-- 数据总览 -->
    <view v-if="activeTab === 'overview'" class="px-4 py-4 space-y-4">
      <!-- 直播信息卡片 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <view class="flex gap-3">
          <view class="w-24 h-16 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <text class="text-white text-xl">▶️</text>
          </view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="text-[10px] px-1.5 bg-secondary rounded">{{ liveData.type === 'knowledge' ? '知识授课' : '电商带货' }}</text>
              <text class="text-[10px] px-1.5 bg-gray-500 text-white rounded">已结束</text>
            </view>
            <text class="text-sm font-medium text-foreground mt-1 truncate block">{{ liveData.title }}</text>
            <text class="text-xs text-muted-foreground mt-0.5">时长：{{ liveData.duration }}</text>
          </view>
        </view>
      </view>

      <!-- 核心数据卡片 -->
      <view class="grid grid-cols-2 gap-3">
        <view v-for="stat in coreStats" :key="stat.label" class="bg-white rounded-xl border border-border p-3">
          <view class="flex items-start justify-between">
            <view>
              <text class="text-xs text-muted-foreground">{{ stat.label }}</text>
              <text class="text-xl font-bold text-foreground block mt-1">{{ stat.value }}</text>
            </view>
            <view :class="['w-8 h-8 rounded-lg flex items-center justify-center', stat.trend === 'up' ? 'bg-green-500/10' : stat.trend === 'down' ? 'bg-red-500/10' : 'bg-gray-500/10']">
              <text>{{ stat.icon }}</text>
            </view>
          </view>
          <view :class="['flex items-center gap-1 mt-2 text-xs', stat.trend === 'up' ? 'text-green-500' : stat.trend === 'down' ? 'text-red-500' : 'text-muted-foreground']">
            <text>{{ stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→' }}</text>
            <text>较上场 {{ stat.change }}</text>
          </view>
        </view>
      </view>

      <!-- AI复盘洞察 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">⚡ AI复盘洞察</text>
        <view class="space-y-2">
          <view class="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
            <text class="text-green-500 mt-0.5 flex-shrink-0"></text>
            <text class="text-xs text-green-700">本场直播观看量较上场增长23%，20:15达到峰值3256人，建议在此时间段安排重点内容。</text>
          </view>
          <view class="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <text class="text-blue-500 mt-0.5 flex-shrink-0"></text>
            <text class="text-xs text-blue-700">关注转化率达3.4%，高于平台均值2.1%。25-44岁用户占比66%，建议针对此人群优化内容。</text>
          </view>
          <view class="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <text class="text-amber-500 mt-0.5 flex-shrink-0">📈</text>
            <text class="text-xs text-amber-700">弹幕高频词"八字""命理"说明用户对核心主题高度关注，可考虑开设进阶系列课程。</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 流量分析 -->
    <view v-if="activeTab === 'traffic'" class="px-4 py-4 space-y-4">
      <!-- 在线人数趋势 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-sm text-foreground flex items-center gap-2">📊 在线人数趋势</text>
          <text class="text-[10px] px-1.5 border border-border rounded text-muted-foreground">峰值 3,256</text>
        </view>

        <view class="h-40 flex items-end gap-1.5">
          <view v-for="(item, index) in trafficData" :key="index" class="flex-1 flex flex-col items-center gap-1">
            <view
              :class="['w-full rounded-t', item.value === maxTraffic ? 'bg-primary' : 'bg-primary/40']"
              :style="{ height: (item.value / maxTraffic) * 100 + '%' }"
            />
          </view>
        </view>
        <view class="flex justify-between mt-4 text-xs text-muted-foreground">
          <text>19:00</text>
          <text>20:00</text>
          <text>21:00</text>
          <text>21:35</text>
        </view>
      </view>

      <!-- 关键时刻 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground block mb-3">关键时刻</text>
        <view class="space-y-0">
          <view v-for="(item, index) in keyMoments" :key="index" class="flex gap-3">
            <view class="flex flex-col items-center">
              <view class="w-2 h-2 rounded-full bg-primary" />
              <view v-if="index < keyMoments.length - 1" class="w-px flex-1 bg-[#E8E0D5]" />
            </view>
            <view :class="['flex-1', index < keyMoments.length - 1 ? 'pb-3' : '']">
              <view class="flex items-center gap-2">
                <text class="text-xs font-medium text-foreground">{{ item.time }}</text>
                <text class="text-[10px] px-1.5 bg-secondary rounded text-foreground">{{ item.event }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1 block">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 观众画像 -->
    <view v-if="activeTab === 'audience'" class="px-4 py-4 space-y-4">
      <!-- 性别分布 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">📊 性别分布</text>
        <view class="flex items-center gap-4">
          <view class="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 via-pink-500 to-pink-500 p-1 relative flex-shrink-0">
            <view class="w-full h-full rounded-full bg-white flex items-center justify-center">
              <text></text>
            </view>
          </view>
          <view class="flex-1 space-y-2">
            <view v-for="item in audienceData.gender" :key="item.label" class="flex items-center gap-2">
              <view :class="['w-3 h-3 rounded-full', item.color]" />
              <text class="text-xs flex-1 text-foreground">{{ item.label }}</text>
              <text class="text-xs font-medium text-foreground">{{ item.value }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 年龄分布 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground block mb-3">年龄分布</text>
        <view class="space-y-3">
          <view v-for="item in audienceData.age" :key="item.label" class="space-y-1">
            <view class="flex justify-between text-xs">
              <text class="text-muted-foreground">{{ item.label }}岁</text>
              <text class="font-medium text-foreground">{{ item.value }}%</text>
            </view>
            <view class="h-2 bg-secondary rounded-full overflow-hidden">
              <view class="h-full bg-primary rounded-full" :style="{ width: item.value + '%' }" />
            </view>
          </view>
        </view>
      </view>

      <!-- 地域分布 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">📍 地域Top5</text>
        <view class="space-y-2">
          <view v-for="(item, index) in audienceData.region.slice(0, 5)" :key="item.name" class="flex items-center gap-3">
            <view :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white', index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-secondary text-muted-foreground']">
              <text>{{ index + 1 }}</text>
            </view>
            <text class="text-sm flex-1 text-foreground">{{ item.name }}</text>
            <text class="text-sm font-medium text-foreground">{{ item.value }}%</text>
          </view>
        </view>
      </view>

      <!-- 来源渠道 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground block mb-3">来源渠道</text>
        <view class="grid grid-cols-2 gap-2">
          <view v-for="item in audienceData.source" :key="item.label" class="flex items-center gap-2 p-2.5 rounded-lg bg-background">
            <text class="text-lg flex-shrink-0">{{ item.icon }}</text>
            <view class="flex-1 min-w-0">
              <text class="text-xs text-foreground truncate block">{{ item.label }}</text>
              <text class="text-sm font-bold text-foreground">{{ item.value }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 互动分析 -->
    <view v-if="activeTab === 'interaction'" class="px-4 py-4 space-y-4">
      <!-- 互动数据概览 -->
      <view class="grid grid-cols-4 gap-2">
        <view v-for="item in interactionOverview" :key="item.label" class="bg-white rounded-xl border border-border p-2.5 text-center">
          <text>{{ item.icon }}</text>
          <text class="text-sm font-bold text-foreground block mt-1">{{ item.value.toLocaleString() }}</text>
          <text class="text-[10px] text-muted-foreground">{{ item.label }}</text>
        </view>
      </view>

      <!-- 弹幕热词 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground block mb-3">弹幕热词</text>
        <view class="flex flex-wrap gap-2 justify-center py-4">
          <text v-for="(item, index) in wordCloud" :key="index" :class="['font-medium', item.size, item.color]" :style="{ transform: 'rotate(' + (index * 3 - 6) + 'deg)' }">
            {{ item.word }}
          </text>
        </view>
      </view>

      <!-- 打赏明细 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">🎁 打赏明细</text>
        <view class="space-y-2">
          <view v-for="(gift, index) in interactionData.gifts" :key="gift.name" class="flex items-center gap-3 p-2 rounded-lg bg-background">
            <view class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs text-white">
              <text>{{ index + 1 }}</text>
            </view>
            <text class="text-sm flex-1 text-foreground">{{ gift.name }}</text>
            <text class="text-xs text-muted-foreground">{{ gift.count }}个</text>
            <text class="text-sm font-bold text-amber-500">¥{{ gift.amount }}</text>
          </view>
        </view>
      </view>

      <!-- 商品数据Top3 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">️ 商品数据Top3</text>
        <view class="space-y-3">
          <view v-for="(product, index) in productStats" :key="product.id" class="p-3 rounded-lg border border-border">
            <view class="flex items-center gap-2 mb-2">
              <view :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white', index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700']">
                <text>{{ index + 1 }}</text>
              </view>
              <text class="text-sm font-medium text-foreground flex-1 truncate">{{ product.name }}</text>
            </view>
            <view class="grid grid-cols-4 gap-2 text-center">
              <view>
                <text class="text-xs text-muted-foreground block">点击</text>
                <text class="text-sm font-medium text-foreground">{{ product.clicks }}</text>
              </view>
              <view>
                <text class="text-xs text-muted-foreground block">下单</text>
                <text class="text-sm font-medium text-foreground">{{ product.orders }}</text>
              </view>
              <view>
                <text class="text-xs text-muted-foreground block">成交</text>
                <text class="text-sm font-medium text-primary">¥{{ product.amount }}</text>
              </view>
              <view>
                <text class="text-xs text-muted-foreground block">转化率</text>
                <text class="text-sm font-medium text-foreground">{{ product.conversion }}%</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 回放管理 -->
    <view v-if="activeTab === 'replay'" class="px-4 py-4 space-y-4">
      <!-- 回放数据 -->
      <view class="bg-white rounded-xl border border-border p-4">
        <text class="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">▶️ 回放数据</text>
        <view class="grid grid-cols-3 gap-3 text-center">
          <view class="p-3 rounded-lg bg-background">
            <text class="text-xl font-bold text-foreground">{{ replayData.playCount.toLocaleString() }}</text>
            <text class="text-xs text-muted-foreground block">播放次数</text>
          </view>
          <view class="p-3 rounded-lg bg-background">
            <text class="text-xl font-bold text-foreground">{{ replayData.playDuration }}</text>
            <text class="text-xs text-muted-foreground block">平均时长</text>
          </view>
          <view class="p-3 rounded-lg bg-background">
            <text class="text-xl font-bold text-foreground">¥{{ replayData.revenue }}</text>
            <text class="text-xs text-muted-foreground block">回放收益</text>
          </view>
        </view>
      </view>

      <!-- 回放设置 -->
      <view class="bg-white rounded-xl border border-border p-4 space-y-4">
        <text class="font-semibold text-sm text-foreground block">回放设置</text>

        <view class="flex items-center justify-between">
          <view>
            <text class="text-sm font-medium text-foreground block">公开回放</text>
            <text class="text-xs text-muted-foreground">允许所有用户观看直播回放</text>
          </view>
          <view @click="replayPublic = !replayPublic" :class="['relative w-11 h-6 rounded-full transition-colors', replayPublic ? 'bg-primary' : 'bg-[#E8E0D5]']">
            <view :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', replayPublic ? 'right-0.5' : 'left-0.5']" />
          </view>
        </view>

        <view class="flex items-center justify-between">
          <view>
            <text class="text-sm font-medium text-foreground block">付费观看</text>
            <text class="text-xs text-muted-foreground">设置回放为付费内容</text>
          </view>
          <view @click="replayPaid = !replayPaid" :class="['relative w-11 h-6 rounded-full transition-colors', replayPaid ? 'bg-primary' : 'bg-[#E8E0D5]']">
            <view :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', replayPaid ? 'right-0.5' : 'left-0.5']" />
          </view>
        </view>

        <view v-if="replayPaid" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <text class="text-xs text-amber-700">付费价格将在保存后设置，建议定价区间：9.9-99元</text>
        </view>
      </view>

      <!-- 上架操作 -->
      <view class="bg-white rounded-xl border border-border p-4 space-y-3">
        <text class="font-semibold text-sm text-foreground block">上架至</text>

        <view class="w-full flex items-center p-3 border border-border rounded-lg">
          <view class="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mr-3 flex-shrink-0">
            <text class="text-violet-500"></text>
          </view>
          <view>
            <text class="text-sm font-medium text-foreground block">上架为付费课程</text>
            <text class="text-xs text-muted-foreground">将回放转为独立课程销售</text>
          </view>
        </view>

        <view class="w-full flex items-center p-3 border border-border rounded-lg">
          <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
            <text class="text-primary"></text>
          </view>
          <view>
            <text class="text-sm font-medium text-foreground block">设为圈子专属</text>
            <text class="text-xs text-muted-foreground">仅圈子成员可观看回放</text>
          </view>
        </view>
      </view>

      <!-- 回放预览 -->
      <view class="bg-white rounded-xl border border-border overflow-hidden">
        <view class="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative" style="aspect-ratio: 16/9">
          <text class="text-4xl text-white/50">▶️</text>
          <text class="absolute top-2 left-2 text-[10px] px-1.5 bg-black/50 text-white rounded">回放</text>
          <text class="absolute bottom-2 right-2 text-xs text-white/70">{{ liveData.duration }}</text>
        </view>
        <view class="p-3">
          <text class="text-sm font-medium text-foreground truncate block">{{ liveData.title }}</text>
          <text class="text-xs text-muted-foreground mt-1">{{ liveData.startTime }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref('overview')
const replayPublic = ref(true)
const replayPaid = ref(false)

const tabs = [
  { key: 'overview', label: '数据总览' },
  { key: 'traffic', label: '流量分析' },
  { key: 'audience', label: '观众画像' },
  { key: 'interaction', label: '互动分析' },
  { key: 'replay', label: '回放管理' },
]

const liveData = {
  id: '1',
  title: '八字命理入门：如何快速解读四柱八字',
  type: 'knowledge',
  startTime: '2024-01-15 19:00',
  endTime: '2024-01-15 21:35',
  duration: '2小时35分钟',
  status: 'ended',
}

const coreStats = [
  { label: '总观看人数', value: '12,580', change: '+23%', trend: 'up', icon: '️' },
  { label: '峰值在线', value: '3,256', change: '+15%', trend: 'up', icon: '' },
  { label: '平均观看时长', value: '18分32秒', change: '+8%', trend: 'up', icon: '🕐' },
  { label: '新增关注', value: '428', change: '+45%', trend: 'up', icon: '' },
  { label: '加入圈子', value: '156', change: '+32%', trend: 'up', icon: '' },
  { label: '打赏收入', value: '¥2,680', change: '+18%', trend: 'up', icon: '🎁' },
]

const trafficData = [
  { time: '19:00', value: 120 },
  { time: '19:15', value: 580 },
  { time: '19:30', value: 1200 },
  { time: '19:45', value: 2100 },
  { time: '20:00', value: 2850 },
  { time: '20:15', value: 3256 },
  { time: '20:30', value: 2980 },
  { time: '20:45', value: 2650 },
  { time: '21:00', value: 2200 },
  { time: '21:15', value: 1800 },
  { time: '21:30', value: 1200 },
]

const maxTraffic = computed(() => Math.max(...trafficData.map(d => d.value)))

const keyMoments = [
  { time: '19:05', event: '直播开始', desc: '120人进入直播间' },
  { time: '20:15', event: '峰值在线', desc: '在线人数达到3256人，正在讲解八字排盘基础' },
  { time: '20:45', event: '互动高峰', desc: '弹幕数量达到峰值，观众提问活跃' },
  { time: '21:30', event: '直播结束', desc: '累计观看12580人，平均时长18分32秒' },
]

const audienceData = {
  gender: [
    { label: '男性', value: 42, color: 'bg-blue-500' },
    { label: '女性', value: 55, color: 'bg-pink-500' },
    { label: '未知', value: 3, color: 'bg-gray-400' },
  ],
  age: [
    { label: '18-24', value: 15 },
    { label: '25-34', value: 38 },
    { label: '35-44', value: 28 },
    { label: '45-54', value: 14 },
    { label: '55+', value: 5 },
  ],
  region: [
    { name: '广东', value: 18 },
    { name: '北京', value: 15 },
    { name: '浙江', value: 12 },
    { name: '江苏', value: 10 },
    { name: '上海', value: 8 },
    { name: '其他', value: 37 },
  ],
  source: [
    { label: '首页推荐', value: 35, icon: '🏠' },
    { label: '关注列表', value: 28, icon: '' },
    { label: '直播广场', value: 18, icon: '' },
    { label: '分享链接', value: 12, icon: '' },
    { label: '搜索', value: 7, icon: '' },
  ],
}

const interactionData = {
  danmaku: 8650,
  likes: 58600,
  comments: 1280,
  shares: 456,
  gifts: [
    { name: '太极', count: 2580, amount: 2580 },
    { name: '梅花', count: 156, amount: 1560 },
    { name: '竹简', count: 28, amount: 1456 },
    { name: '罗盘', count: 12, amount: 1188 },
  ],
}

const interactionOverview = [
  { label: '弹幕', value: interactionData.danmaku, icon: '' },
  { label: '点赞', value: interactionData.likes, icon: '' },
  { label: '评论', value: interactionData.comments, icon: '✉️' },
  { label: '分享', value: interactionData.shares, icon: '' },
]

const wordCloud = [
  { word: '八字', size: 'text-2xl', color: 'text-primary' },
  { word: '命理', size: 'text-xl', color: 'text-violet-500' },
  { word: '四柱', size: 'text-lg', color: 'text-blue-500' },
  { word: '干货', size: 'text-base', color: 'text-amber-500' },
  { word: '老师好', size: 'text-lg', color: 'text-green-500' },
  { word: '学到了', size: 'text-xl', color: 'text-pink-500' },
  { word: '感谢', size: 'text-base', color: 'text-cyan-500' },
  { word: '收藏', size: 'text-sm', color: 'text-orange-500' },
  { word: '精彩', size: 'text-base', color: 'text-red-500' },
  { word: '厉害', size: 'text-sm', color: 'text-indigo-500' },
]

const productStats = [
  { id: 1, name: '渊海子平精装版', clicks: 3560, orders: 128, amount: 6272, conversion: 3.6 },
  { id: 2, name: '专业罗盘', clicks: 2890, orders: 45, amount: 8910, conversion: 1.6 },
  { id: 3, name: '五帝钱套装', clicks: 2150, orders: 89, amount: 3382, conversion: 4.1 },
]

const replayData = {
  playCount: 2580,
  playDuration: '平均12分钟',
  revenue: 0,
  isPublic: true,
  isPaid: false,
}

function goBack() { uni.navigateBack() }
</script>
