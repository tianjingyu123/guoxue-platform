<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view
      class="sticky top-0 z-50 flex items-center justify-between px-4 h-11"
      :style="{ backgroundColor: station.themeColor }"
    >
      <view class="p-1" @click="goBack">
        <text class="text-white text-lg">←</text>
      </view>
      <text class="text-white font-medium">{{ station.name }}</text>
      <view class="p-1" @click="goToPoster">
        <text class="text-white text-lg"></text>
      </view>
    </view>

    <!-- 站长信息卡片 + 渐变背景 -->
    <view
      class="px-4 pt-6 pb-8"
      :style="{ background: `linear-gradient(180deg, ${station.themeColor} 0%, ${station.themeColor}00 100%)` }"
    >
      <view class="flex items-start gap-4">
        <!-- 头像 -->
        <view
          class="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden flex-shrink-0"
          :style="{ backgroundColor: station.themeColor }"
        >
          <view class="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
            <text>{{ station.masterName.charAt(0) }}</text>
          </view>
        </view>

        <!-- 基本信息 -->
        <view class="flex-1 pt-1">
          <view class="flex items-center gap-2 mb-1">
            <text class="text-xl font-bold text-white">{{ station.masterName }}</text>
            <view class="px-1.5 py-0.5 rounded text-[10px]" style="background-color:rgba(255,255,255,0.2)">
              <text class="text-white">👑 站长</text>
            </view>
          </view>
          <text class="text-white/80 text-sm block mb-2">{{ station.name }}</text>
          <view class="flex flex-wrap gap-1.5">
            <view
              v-for="tag in station.tags"
              :key="tag"
              class="px-1.5 py-0.5 rounded text-[10px]"
              style="background-color:rgba(255,255,255,0.2)"
            >
              <text class="text-white">{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 数据统计 -->
      <view class="grid grid-cols-3 gap-4 mt-6 bg-white rounded-2xl p-4 shadow-sm">
        <view class="text-center">
          <text class="text-xl font-bold block" :style="{ color: station.themeColor }">{{ station.memberCount }}</text>
          <text class="text-xs text-muted-foreground block mt-0.5">成员</text>
        </view>
        <view class="text-center border-x border-border">
          <text class="text-xl font-bold block" :style="{ color: station.themeColor }">{{ station.contentCount }}</text>
          <text class="text-xs text-muted-foreground block mt-0.5">精选内容</text>
        </view>
        <view class="text-center">
          <text class="text-xl font-bold block" :style="{ color: station.themeColor }">{{ remainingDays }}</text>
          <text class="text-xs text-muted-foreground block mt-0.5">剩余天数</text>
        </view>
      </view>
    </view>

    <!-- 站长简介 -->
    <view class="mx-4 -mt-4 bg-white rounded-xl shadow-sm px-4 py-4">
      <view class="flex items-center gap-1.5 mb-2">
        <text class="text-sm" :style="{ color: station.themeColor }"></text>
        <text class="text-sm font-medium text-foreground">站长简介</text>
      </view>
      <text class="text-sm text-muted-foreground block whitespace-pre-line leading-relaxed">{{ station.masterIntro }}</text>
    </view>

    <!-- Tab 切换 -->
    <view class="flex border-b border-border bg-white mt-4 sticky top-11 z-40">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 text-center py-3 text-sm font-medium"
        :class="activeTab === tab.key ? 'border-b-2' : 'text-muted-foreground'"
        :style="activeTab === tab.key ? `border-color:${station.themeColor};color:${station.themeColor}` : ''"
        @click="activeTab = tab.key"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 站长精选 -->
    <view v-if="activeTab === 'featured'" class="px-4 mt-4 space-y-3">
      <view
        v-for="item in station.featured"
        :key="item.id"
        class="p-3 bg-white rounded-xl flex gap-3 active:opacity-80"
        @click="navigateTo(getTypeConfig(item.type).href + '/' + item.id)"
      >
        <!-- 封面 -->
        <view
          class="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
          :style="{ backgroundColor: station.themeColor + '20' }"
        >
          <text class="text-3xl" :style="{ color: station.themeColor }">{{ getTypeConfig(item.type).icon }}</text>
        </view>

        <!-- 内容 -->
        <view class="flex-1 min-w-0 flex flex-col">
          <view class="flex items-center gap-1.5 mb-1">
            <view
              class="text-[10px] px-1.5 py-0.5 rounded"
              :style="{ backgroundColor: station.themeColor + '15', color: station.themeColor }"
            >
              <text>{{ getTypeConfig(item.type).label }}</text>
            </view>
          </view>
          <text class="font-medium text-sm line-clamp-1 text-foreground">{{ item.title }}</text>

          <text v-if="item.recommendation" class="text-xs text-muted-foreground mt-1 line-clamp-2 italic block">
            "{{ item.recommendation }}"
          </text>

          <view class="flex items-center justify-between mt-auto pt-2">
            <view v-if="item.price !== undefined" class="flex items-center gap-1.5">
              <text class="text-sm font-bold" style="color:#C41E3A">¥{{ item.price }}</text>
              <text v-if="item.originalPrice" class="text-[10px] text-muted-foreground line-through">¥{{ item.originalPrice }}</text>
            </view>
            <text class="text-[10px] text-muted-foreground">
              <text v-if="item.sales">{{ item.sales }}人已购</text>
              <text v-if="item.members">{{ item.members }}成员</text>
              <text v-if="item.views">{{ item.views }}阅读</text>
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 最新动态 -->
    <view v-if="activeTab === 'activities'" class="px-4 mt-4 space-y-3">
      <view
        v-for="activity in station.activities"
        :key="activity.id"
        class="flex items-start gap-3 p-3 bg-white rounded-lg"
      >
        <view
          class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          :style="{ backgroundColor: station.themeColor }"
        />
        <view class="flex-1">
          <text class="text-sm text-foreground block">{{ activity.content }}</text>
          <text class="text-xs text-muted-foreground block mt-1">{{ activity.time }}</text>
        </view>
      </view>
    </view>

    <!-- 联系站长 -->
    <view v-if="activeTab === 'contact'" class="px-4 mt-4">
      <view class="bg-white rounded-xl p-4">
        <view class="text-center">
          <view
            class="w-32 h-32 mx-auto rounded-xl flex items-center justify-center mb-3"
            :style="{ backgroundColor: station.themeColor + '10' }"
          >
            <text class="text-5xl" :style="{ color: station.themeColor }"></text>
          </view>
          <text class="text-sm text-muted-foreground block mb-4">扫码添加站长微信</text>
          <view
            class="w-full py-3 rounded-xl text-sm text-center text-white font-medium flex items-center justify-center gap-2"
            :style="{ backgroundColor: station.themeColor }"
            @click="handleContact"
          >
            <text></text>
            <text>发送私信</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="h-20" />

    <!-- 底部固定生成海报按钮 -->
    <view class="fixed bottom-0 left-0 right-0 px-4 py-4 bg-background border-t border-border">
      <view
        class="w-full py-3 rounded-xl text-sm text-center text-white font-medium flex items-center justify-center gap-2"
        :style="{ backgroundColor: station.themeColor }"
        @click="goToPoster"
      >
        <text></text>
        <text>生成分享海报</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref('featured')

interface FeaturedItem {
  id: string
  type: 'course' | 'circle' | 'article'
  title: string
  cover: string
  recommendation: string
  price?: number
  originalPrice?: number
  sales?: number
  members?: number
  views?: number
}

interface Activity {
  id: string
  content: string
  time: string
}

interface StationData {
  id: string
  name: string
  logo: string
  themeColor: string
  masterName: string
  masterAvatar: string
  masterIntro: string
  memberCount: number
  contentCount: number
  createdAt: string
  expiresAt: string
  tags: string[]
  featured: FeaturedItem[]
  activities: Activity[]
}

const station: StationData = {
  id: 'station-demo',
  name: '青云国学小站',
  logo: '',
  themeColor: '#8B5CF6',
  masterName: '青云道长',
  masterAvatar: '',
  masterIntro:
    '从事国学研究20余年，专注八字命理与风水堪舆。曾师从多位易学名家，融汇各派精华，形成独特的实战派风格。\n\n愿以所学助有缘人趋吉避凶，少走弯路。在这个小站，我会精选最优质的内容推荐给大家，也会定期分享自己的学习心得。',
  memberCount: 3680,
  contentCount: 156,
  createdAt: '2024-01-15',
  expiresAt: '2027-01-15',
  tags: ['八字命理', '风水堪舆', '择日择吉'],
  featured: [
    {
      id: 'f1',
      type: 'course',
      title: '八字入门实战课',
      cover: '',
      recommendation: '这门课是我亲自筛选的，非常适合零基础的朋友入门学习',
      price: 199,
      originalPrice: 399,
      sales: 1286,
    },
    {
      id: 'f2',
      type: 'circle',
      title: '八字命理研习社',
      cover: '',
      recommendation: '我自己也在这个圈子里，圈主讲解非常专业',
      price: 99,
      members: 3680,
    },
    {
      id: 'f3',
      type: 'article',
      title: '2024甲辰年运势全解析',
      cover: '',
      recommendation: '今年必读的一篇文章，讲得很透彻',
      views: 12800,
    },
    {
      id: 'f4',
      type: 'course',
      title: '紫微斗数高级班',
      cover: '',
      recommendation: '进阶必学，体系非常完整',
      price: 599,
      sales: 568,
    },
  ],
  activities: [
    { id: 'a1', content: '推荐了课程《八字入门实战课》', time: '2小时前' },
    { id: 'a2', content: '新增了3位成员', time: '5小时前' },
    { id: 'a3', content: '更新了分站介绍', time: '1天前' },
    { id: 'a4', content: '新增精选文章1篇', time: '2天前' },
  ],
}

const tabs = [
  { key: 'featured', label: '站长精选' },
  { key: 'activities', label: '最新动态' },
  { key: 'contact', label: '联系站长' },
]

const typeConfigMap: Record<string, { icon: string; label: string; href: string }> = {
  article: { icon: '', label: '文章', href: '/pages/articles' },
  course: { icon: '', label: '课程', href: '/pages/courses' },
  circle: { icon: '', label: '圈子', href: '/pages/community' },
}

const remainingDays = computed(() => {
  return Math.floor(
    (new Date(station.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
})

function getTypeConfig(type: string) {
  return typeConfigMap[type] || typeConfigMap.article
}

function navigateTo(path: string) {
  uni.navigateTo({ url: path })
}

function goToPoster() {
  uni.navigateTo({ url: '/pages/substation/id-detail/poster/index' })
}

function handleContact() {
  uni.showToast({ title: '私信功能开发中', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
