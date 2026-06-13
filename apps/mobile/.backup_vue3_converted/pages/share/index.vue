<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
      <view class="flex items-center gap-3 px-4 h-14">
        <view class="p-1 -ml-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-lg text-foreground">分享</text>
        <view class="flex-1" />
        <text class="text-xs text-accent" @click="goHome">🏠 首页</text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="p-4 animate-pulse">
      <view class="h-24 w-24 bg-[#E8E0D5] rounded-full mx-auto mb-4" />
      <view class="h-7 bg-[#E8E0D5] rounded w-1/2 mx-auto mb-2" />
      <view class="h-4 bg-[#E8E0D5] rounded w-2/3 mx-auto mb-6" />
      <view class="grid grid-cols-2 gap-3 mb-4">
        <view v-for="i in 4" :key="i" class="h-20 bg-[#E8E0D5] rounded-xl" />
      </view>
      <view v-for="i in 4" :key="i" class="h-14 bg-[#E8E0D5] rounded-xl mb-2" />
    </view>

    <scroll-view v-else scroll-y class="flex-1">
      <!-- 品牌展示区 -->
      <view class="text-center pt-8 pb-6 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <view class="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
          <text class="text-4xl font-bold text-white">热</text>
        </view>
        <text class="text-2xl font-bold text-foreground block mb-1">热卜国学</text>
        <text class="text-sm text-muted-foreground block mb-3">传承智慧 · 启迪人生</text>
        <view class="flex items-center justify-center gap-2 mb-4">
          <view class="px-3 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full font-medium">国学平台</view>
          <view class="px-3 py-0.5 bg-accent/10 text-accent text-[11px] rounded-full font-medium">排盘工具</view>
          <view class="px-3 py-0.5 bg-green-50 text-green-600 text-[11px] rounded-full font-medium">学习社区</view>
        </view>
        <text class="text-xs text-muted-foreground block leading-relaxed max-w-sm mx-auto">邀请好友一起探索国学之美，领略中华传统文化的博大精深。注册即送50积分！</text>
      </view>

      <!-- 数据展示 -->
      <view class="flex items-center justify-around px-4 py-4 mx-4 bg-white rounded-xl shadow-sm border border-border mb-4">
        <view v-for="(stat, idx) in stats" :key="stat.label" class="flex-1 text-center" :class="idx < stats.length - 1 ? 'border-r border-border' : ''">
          <text class="text-lg font-bold" :class="stat.color">{{ stat.value }}</text>
          <text class="text-[10px] text-muted-foreground block mt-0.5">{{ stat.label }}</text>
        </view>
      </view>

      <!-- 特色功能 -->
      <view class="px-4 mb-4">
        <text class="text-sm font-semibold text-foreground block mb-3"> 平台特色</text>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="f in features" :key="f.title" class="bg-white rounded-xl p-3.5 shadow-sm border border-border">
            <view class="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" :class="f.bg">
              <text class="text-lg">{{ f.icon }}</text>
            </view>
            <text class="text-sm font-medium text-foreground block">{{ f.title }}</text>
            <text class="text-[11px] text-muted-foreground block mt-0.5 leading-relaxed">{{ f.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 分享方式 -->
      <view class="mx-4 mb-4">
        <text class="text-sm font-semibold text-foreground block mb-3"> 分享给好友</text>
        <view class="bg-white rounded-xl overflow-hidden shadow-sm border border-border">
          <view v-for="(m, idx) in shareMethods" :key="m.key" class="flex items-center gap-3 px-4 py-4 border-b border-[#FAF8F5] last:border-b-0 active:bg-background" @click="doShare(m.key)">
            <view class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :class="m.bg">
              <text class="text-lg">{{ m.icon }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground">{{ m.label }}</text>
              <text class="text-[11px] text-muted-foreground block mt-0.5">{{ m.desc }}</text>
            </view>
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>
      </view>

      <!-- 下载/打开按钮 -->
      <view class="px-4 mb-4">
        <view class="flex gap-3">
          <view class="flex-1 h-12 rounded-xl bg-primary text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-md shadow-primary/20" @click="openApp">
            <text></text>
            <text>打开App</text>
          </view>
          <view class="flex-1 h-12 rounded-xl bg-accent text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-md shadow-[#C9A96E]/20" @click="downloadApp">
            <text>⬇</text>
            <text>下载App</text>
          </view>
        </view>
      </view>

      <!-- 二维码 -->
      <view class="mx-4 mb-4 bg-white rounded-xl p-5 text-center shadow-sm border border-border">
        <view class="w-36 h-36 mx-auto bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center mb-3 border-2 border-dashed border-border">
          <view class="text-center">
            <text class="text-5xl block mb-1"></text>
            <text class="text-[10px] text-muted-foreground">扫码下载</text>
          </view>
        </view>
        <text class="text-xs text-muted-foreground">长按识别二维码下载热卜国学App</text>
        <view class="flex items-center justify-center gap-2 mt-2">
          <text class="text-[10px] text-primary">iOS 版</text>
          <text class="text-[10px] text-[#E8E0D5]">|</text>
          <text class="text-[10px] text-primary">Android 版</text>
        </view>
      </view>

      <!-- 分享奖励提示 -->
      <view class="px-4 mb-6">
        <view class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 flex items-center gap-2">
          <text class="text-lg">🎁</text>
          <text class="text-xs text-ink-soft">分享可获得积分奖励 · 每分享1人获得50积分 · 每日上限500积分</text>
        </view>
      </view>

      <view class="h-6" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(true)

const stats = ref([
  { value: '100+', label: '专家讲师', color: 'text-primary' },
  { value: '500+', label: '精品课程', color: 'text-accent' },
  { value: '50万+', label: '学习用户', color: 'text-green-500' },
  { value: '98%', label: '好评率', color: 'text-blue-500' },
])

const features = ref([
  { icon: '', title: '古籍经典', desc: '海量国学典籍在线阅读，含白话翻译', bg: 'bg-blue-50' },
  { icon: '🧮', title: '智能排盘', desc: '八字/紫微/奇门等专业排盘工具', bg: 'bg-red-50' },
  { icon: '', title: '学习社区', desc: '与国学爱好者深入交流探讨', bg: 'bg-green-50' },
  { icon: '🎓', title: '名师课程', desc: '专家教授在线授课，系统学习', bg: 'bg-purple-50' },
])

const shareMethods = ref([
  { key: 'wechat', icon: '💚', label: '微信好友', desc: '直接分享给微信好友或群聊', bg: 'bg-[#E6FFE6]' },
  { key: 'moments', icon: '', label: '朋友圈', desc: '分享到朋友圈让更多人看到', bg: 'bg-[#E6F0FF]' },
  { key: 'qrcode', icon: '', label: '生成二维码', desc: '生成推广二维码供他人扫码', bg: 'bg-muted' },
  { key: 'copy', icon: '', label: '复制链接', desc: '复制链接通过其他方式发送', bg: 'bg-[#FFF0E6]' },
  { key: 'poster', icon: '️', label: '生成海报', desc: '生成精美分享海报，保存图片', bg: 'bg-[#FFE6F0]' },
])

setTimeout(() => { loading.value = false }, 500)

function goBack() { uni.navigateBack() }
function goHome() { uni.switchTab({ url: '/pages/index/index' }) }
function openApp() { uni.showToast({ title: '正在打开App', icon: 'none' }) }
function downloadApp() { uni.showToast({ title: '开始下载安装包', icon: 'none' }) }
function doShare(type: string) {
  const messages: Record<string, string> = {
    wechat: '已分享到微信',
    moments: '已分享到朋友圈',
    qrcode: '二维码已生成',
    copy: '链接已复制到剪贴板',
    poster: '正在生成海报...'
  }
  uni.showToast({ title: messages[type] || '已分享', icon: 'success' })
}
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
