<script setup lang="ts">
// about page — 关于我们
</script>

<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background border-b border-border">
      <view class="flex items-center gap-3 px-4 h-14">
        <view class="p-2 -ml-2 rounded-full" @tap="uni.navigateBack()">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </view>
        <text class="font-semibold text-lg text-foreground">关于我们</text>
      </view>
    </view>

    <!-- Hero -->
    <view class="p-8 text-center" style="background:linear-gradient(135deg,rgba(196,30,58,0.08),rgba(201,169,110,0.08))">
      <view class="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg" style="background:linear-gradient(135deg,var(--color-primary),rgba(196,30,58,0.8))">
        <svg class="w-12 h-12" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="white"/>
          <path d="M12 1 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 23 A11 11 0 0 1 12 1" fill="#C41E3A"/>
          <circle cx="12" cy="6.5" r="2" fill="white"/>
          <circle cx="12" cy="17.5" r="2" fill="#C41E3A"/>
        </svg>
      </view>
      <text class="text-2xl font-bold text-foreground block mb-2">热卜国学</text>
      <text class="text-muted-foreground">传承智慧 · 启迪人生</text>
    </view>

    <!-- 介绍 -->
    <view class="p-6">
      <text class="text-muted-foreground leading-relaxed block mb-6">
        热卜国学是一个专注于中华传统文化传承与学习的综合性平台。我们汇聚了易经、风水、命理、中医养生等领域的专家学者，致力于让国学智慧以现代化的方式传播，帮助更多人了解和受益于中华传统文化的精髓。
      </text>

      <!-- 数据卡片 -->
      <view class="grid grid-cols-3 gap-4 mb-8">
        <view class="bg-card border border-border rounded-xl p-4 text-center">
          <text class="text-2xl font-bold text-primary block">100+</text>
          <text class="text-xs text-muted-foreground mt-1 block">专家讲师</text>
        </view>
        <view class="bg-card border border-border rounded-xl p-4 text-center">
          <text class="text-2xl font-bold text-accent block">500+</text>
          <text class="text-xs text-muted-foreground mt-1 block">精品课程</text>
        </view>
        <view class="bg-card border border-border rounded-xl p-4 text-center">
          <text class="text-2xl font-bold text-chart-4 block">50万+</text>
          <text class="text-xs text-muted-foreground mt-1 block">学习用户</text>
        </view>
      </view>

      <!-- 特色 -->
      <text class="font-bold text-foreground block mb-4">我们的特色</text>
      <view class="space-y-3 mb-8">
        <view v-for="item in features" :key="item.title" class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <view class="w-10 h-10 rounded-full flex items-center justify-center" style="background:rgba(196,30,58,0.1)">
            <component :is="item.icon" class="w-5 h-5 text-primary" />
          </view>
          <view>
            <text class="font-medium text-foreground block">{{ item.title }}</text>
            <text class="text-sm text-muted-foreground">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 联系方式 -->
      <text class="font-bold text-foreground block mb-4">联系我们</text>
      <view class="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <view class="p-4 flex items-center justify-between" @tap="uni.navigateTo({url:'/pages/feedback/index'})">
          <text class="text-foreground">意见反馈</text>
          <svg class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </view>
        <view class="p-4 flex items-center justify-between">
          <text class="text-foreground">客服邮箱</text>
          <text class="text-muted-foreground">support@rebu.com</text>
        </view>
        <view class="p-4 flex items-center justify-between">
          <text class="text-foreground">官方微信</text>
          <text class="text-muted-foreground">rebu_guoxue</text>
        </view>
      </view>

      <!-- 版本信息 -->
      <view class="mt-8 text-center">
        <text class="text-sm text-muted-foreground block">版本 1.0.0</text>
        <text class="text-sm text-muted-foreground block mt-1">Copyright © 2024 热卜国学</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'

const BookOpenIcon = defineComponent({ render: () => h('svg', { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'2', 'stroke-linecap':'round', 'stroke-linejoin':'round' }, [h('path',{d:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'}), h('path',{d:'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'})]) })
const UsersIcon = defineComponent({ render: () => h('svg', { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'2', 'stroke-linecap':'round', 'stroke-linejoin':'round' }, [h('path',{d:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'}), h('circle',{cx:'9',cy:'7',r:'4'}), h('path',{d:'M23 21v-2a4 4 0 0 0-3-3.87'}), h('path',{d:'M16 3.13a4 4 0 0 1 0 7.75'})]) })
const AwardIcon = defineComponent({ render: () => h('svg', { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'2', 'stroke-linecap':'round', 'stroke-linejoin':'round' }, [h('circle',{cx:'12',cy:'8',r:'7'}), h('polyline',{points:'8.21 13.89 7 23 12 20 17 23 15.79 13.88'})]) })
const BuildingIcon = defineComponent({ render: () => h('svg', { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'2', 'stroke-linecap':'round', 'stroke-linejoin':'round' }, [h('rect',{x:'3',y:'2',width:'18',height:'20',rx:'2',ry:'2'}), h('path',{d:'M9 22V12h6v10'}), h('path',{d:'M9 6h.01'}), h('path',{d:'M15 6h.01'}), h('path',{d:'M9 10h.01'}), h('path',{d:'M15 10h.01'})]) })

export default defineComponent({
  name: 'AboutPage',
  setup() {
    const features = [
      { icon: BookOpenIcon, title: '专业内容', desc: '严选优质国学课程与古籍资源' },
      { icon: UsersIcon,    title: '圈子交流', desc: '加入志同道合的学习社区' },
      { icon: AwardIcon,   title: '名师指导', desc: '一对一咨询，答疑解惑' },
      { icon: BuildingIcon,title: '线下活动', desc: '定期举办国学文化体验活动' },
    ]
    return { features }
  }
})
</script>
