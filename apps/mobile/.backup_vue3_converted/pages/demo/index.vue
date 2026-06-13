<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">组件演示</text>
      <view class="w-7" />
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="flex-1 p-4">
      <view v-for="i in 5" :key="i" class="bg-white rounded-xl p-4 mb-3 animate-pulse">
        <view class="w-40 h-4 bg-muted rounded mb-3" />
        <view class="flex gap-2">
          <view class="flex-1 h-16 bg-muted rounded-lg" />
          <view class="flex-1 h-16 bg-muted rounded-lg" />
          <view class="flex-1 h-16 bg-muted rounded-lg" />
          <view class="flex-1 h-16 bg-muted rounded-lg" />
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="flex-1 p-4">
      <!-- 色彩系统 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg"></text>
          <text class="text-sm font-semibold text-foreground">色彩系统</text>
        </view>
        <view class="grid grid-cols-4 gap-2">
          <view v-for="c in colors" :key="c.name" class="rounded-lg py-5 text-center" :style="{ background: c.value }">
            <text class="text-[11px] text-white block font-medium">{{ c.name }}</text>
            <text class="text-[10px] text-white/70">{{ c.value }}</text>
          </view>
        </view>
      </view>

      <!-- 按钮 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg">🔘</text>
          <text class="text-sm font-semibold text-foreground">按钮</text>
        </view>
        <view class="flex flex-wrap gap-2.5">
          <view class="px-5 py-2.5 bg-primary text-white rounded-lg text-[13px]">主按钮</view>
          <view class="px-5 py-2.5 bg-background border border-border text-ink-soft rounded-lg text-[13px]">次按钮</view>
          <view class="px-5 py-2.5 bg-muted text-muted-foreground rounded-lg text-[13px]">禁用按钮</view>
          <view class="px-5 py-2.5 bg-white border border-primary text-primary rounded-lg text-[13px]">线框按钮</view>
          <view class="w-10 h-10 rounded-full bg-primary flex items-center justify-center"><text class="text-white"></text></view>
          <view class="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><text class="text-ink-soft"></text></view>
        </view>
      </view>

      <!-- 输入框 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg"></text>
          <text class="text-sm font-semibold text-foreground">输入框</text>
        </view>
        <view class="space-y-3">
          <view class="bg-background rounded-lg px-3.5 py-2.5 border border-border">
            <text class="text-xs text-muted-foreground block mb-1">默认输入框</text>
            <input placeholder="请输入内容..." class="text-sm text-foreground outline-none" />
          </view>
          <view class="bg-white rounded-lg px-3.5 py-2.5 border border-primary">
            <text class="text-xs text-primary block mb-1">聚焦状态</text>
            <input placeholder="输入中..." class="text-sm text-foreground outline-none" />
          </view>
          <view class="bg-muted rounded-lg px-3.5 py-2.5 border border-border opacity-60">
            <text class="text-xs text-muted-foreground block mb-1">禁用状态</text>
            <input placeholder="不可输入" disabled class="text-sm text-muted-foreground outline-none" />
          </view>
        </view>
      </view>

      <!-- 卡片 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg">🃏</text>
          <text class="text-sm font-semibold text-foreground">卡片组件</text>
        </view>
        <view class="space-y-3">
          <view class="bg-white rounded-xl p-4 border border-border shadow-sm">
            <text class="text-sm font-medium text-foreground block mb-1">标准卡片</text>
            <text class="text-xs text-muted-foreground">带边框和阴影的标准卡片样式</text>
          </view>
          <view class="bg-gradient-to-br from-primary to-[#E74C3C] rounded-xl p-4">
            <text class="text-sm font-medium text-white block mb-1">渐变卡片</text>
            <text class="text-xs text-white/80">适合突出展示的深色背景卡片</text>
          </view>
          <view class="bg-accent/10 rounded-xl p-4 border border-accent/30">
            <text class="text-sm font-medium text-accent block mb-1">强调卡片</text>
            <text class="text-xs text-accent/80">金色主题的强调卡片样式</text>
          </view>
        </view>
      </view>

      <!-- 列表项 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg"></text>
          <text class="text-sm font-semibold text-foreground">列表项</text>
        </view>
        <view class="space-y-1">
          <view v-for="(li, i) in listItems" :key="i"
            class="flex items-center justify-between px-3.5 py-3 border-b border-[#FAF8F5] last:border-b-0">
            <view class="flex items-center gap-3">
              <text class="text-lg">{{ li.icon }}</text>
              <text class="text-sm text-foreground">{{ li.label }}</text>
            </view>
            <view class="flex items-center gap-1">
              <text class="text-xs text-muted-foreground">{{ li.value }}</text>
              <text class="text-base text-[#ccc]">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 标签 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg"></text>
          <text class="text-sm font-semibold text-foreground">标签 / Tag</text>
        </view>
        <view class="flex flex-wrap gap-2">
          <view class="px-2.5 py-1 bg-primary/10 rounded text-xs text-primary">热门</view>
          <view class="px-2.5 py-1 bg-accent/10 rounded text-xs text-accent">推荐</view>
          <view class="px-2.5 py-1 bg-green-50 rounded text-xs text-green-600">已完成</view>
          <view class="px-2.5 py-1 bg-orange-50 rounded text-xs text-orange-500">进行中</view>
          <view class="px-2.5 py-1 bg-gray-50 rounded text-xs text-gray-500">已结束</view>
          <view class="px-2.5 py-1 bg-blue-50 rounded text-xs text-blue-600">待审核</view>
          <view class="px-2.5 py-1 border border-border rounded text-xs text-ink-soft">默认标签</view>
          <view class="px-2.5 py-1 border border-primary rounded text-xs text-primary">线框标签</view>
        </view>
      </view>

      <!-- 加载动画 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg"></text>
          <text class="text-sm font-semibold text-foreground">加载状态</text>
        </view>
        <view class="flex items-center gap-4">
          <view class="flex items-center gap-2">
            <view class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <text class="text-xs text-ink-soft">加载中...</text>
          </view>
          <view class="flex gap-1">
            <view v-for="i in 3" :key="i" class="w-2 h-2 bg-primary rounded-full animate-bounce" :style="{ animationDelay: i * 0.15 + 's' }" />
          </view>
          <view class="w-20 h-2 bg-muted rounded-full overflow-hidden">
            <view class="w-1/2 h-full bg-primary rounded-full animate-pulse" />
          </view>
        </view>
      </view>

      <!-- Toast提示 -->
      <view class="bg-white rounded-xl p-4 mb-3 shadow-sm border border-border">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-lg"></text>
          <text class="text-sm font-semibold text-foreground">Toast 提示</text>
        </view>
        <view class="flex flex-wrap gap-2.5">
          <view class="px-3 py-1.5 bg-foreground text-white rounded-lg text-xs" @click="uni.showToast({title:'成功',icon:'success'})">成功</view>
          <view class="px-3 py-1.5 bg-foreground text-white rounded-lg text-xs" @click="uni.showToast({title:'失败',icon:'error'})">失败</view>
          <view class="px-3 py-1.5 bg-foreground text-white rounded-lg text-xs" @click="uni.showToast({title:'提示信息',icon:'none'})">提示</view>
          <view class="px-3 py-1.5 bg-foreground text-white rounded-lg text-xs" @click="uni.showLoading({title:'加载中...'});setTimeout(()=>uni.hideLoading(),1500)">加载</view>
        </view>
      </view>

      <view class="h-5" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)

const colors = [
  { name: '故宫红', value: '#C41E3A' },
  { name: '宣纸白', value: '#FAF8F5' },
  { name: '珠宝金', value: '#C9A96E' },
  { name: '墨色', value: '#2C2C2C' },
]

const listItems = [
  { icon: '', label: '手机绑定', value: '已绑定' },
  { icon: '💚', label: '微信绑定', value: '未绑定' },
  { icon: '', label: '修改密码', value: '' },
  { icon: '🔐', label: '支付密码', value: '已设置' },
  { icon: '📊', label: '数据统计', value: '' },
]

onMounted(() => {
  setTimeout(() => { loading.value = false }, 1000)
})

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
