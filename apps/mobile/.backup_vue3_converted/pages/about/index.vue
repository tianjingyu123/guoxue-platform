<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
      <view class="flex items-center gap-3 px-4 h-14">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-lg text-foreground">关于我们</text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="animate-pulse">
      <view class="bg-gradient-to-br from-primary/10 to-accent/10 p-8 text-center">
        <view class="w-20 h-20 rounded-2xl bg-[#E8E0D5] mx-auto mb-4" />
        <view class="h-6 bg-[#E8E0D5] rounded w-1/3 mx-auto mb-2" />
        <view class="h-4 bg-[#E8E0D5] rounded w-1/4 mx-auto" />
      </view>
      <view class="p-6">
        <view v-for="i in 5" :key="i" class="h-4 bg-[#E8E0D5] rounded mb-3" :style="{width: (60+Math.random()*40)+'%'}" />
        <view class="grid grid-cols-3 gap-4 my-6">
          <view v-for="i in 3" :key="i" class="h-20 bg-[#E8E0D5] rounded-xl" />
        </view>
      </view>
    </view>

    <scroll-view v-else scroll-y class="flex-1">
      <!-- Hero -->
      <view class="bg-gradient-to-br from-primary/10 to-accent/10 p-8 text-center relative overflow-hidden">
        <view class="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5" />
        <view class="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-accent/10" />
        <view class="relative">
          <view class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <text class="text-3xl font-bold text-white">热</text>
          </view>
          <text class="text-2xl font-bold text-foreground block mb-2">热卜国学</text>
          <text class="text-muted-foreground text-sm mb-4 block">传承智慧 · 启迪人生</text>
          <view class="flex items-center justify-center gap-2">
            <view class="px-3 py-0.5 bg-white/80 text-primary text-xs rounded-full font-medium shadow-sm">v{{ version }}</view>
            <view class="px-3 py-0.5 bg-white/80 text-accent text-xs rounded-full font-medium shadow-sm">{{ buildType }}</view>
          </view>
        </view>
      </view>

      <view class="p-6">
        <!-- 应用介绍 -->
        <view class="bg-white rounded-2xl p-4 shadow-sm border border-border mb-6">
          <text class="text-ink-soft leading-relaxed text-sm">
            热卜国学是一个专注于中华传统文化传承与学习的综合性平台。我们汇聚了易经、风水、命理、中医养生等领域的专家学者，致力于让国学智慧以现代化的方式传播，帮助更多人了解和受益于中华传统文化的精髓。
          </text>
        </view>

        <!-- 数据 -->
        <view class="grid grid-cols-3 gap-3 mb-6">
          <view v-for="s in stats" :key="s.label" class="bg-white rounded-xl p-4 text-center shadow-sm border border-border">
            <text :class="['text-2xl font-bold block', s.color]">{{ s.value }}</text>
            <text class="text-xs text-muted-foreground block mt-1">{{ s.label }}</text>
          </view>
        </view>

        <!-- 版本更新日志 -->
        <view class="mb-6">
          <text class="font-bold text-foreground block mb-3"> 版本 {{ version }} 更新内容</text>
          <view class="bg-white rounded-2xl p-4 shadow-sm border border-border">
            <view v-for="(log, idx) in changelog" :key="idx" class="flex gap-2.5 py-2.5 border-b border-[#FAF8F5] last:border-b-0">
              <view class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <text class="text-[10px] text-primary">✦</text>
              </view>
              <text class="text-xs text-ink-soft leading-relaxed">{{ log }}</text>
            </view>
          </view>
        </view>

        <!-- 核心功能 -->
        <text class="font-bold text-foreground block mb-3"> 核心功能</text>
        <view class="space-y-3 mb-6">
          <view v-for="item in features" :key="item.title" class="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-border active:bg-background">
            <view class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <text class="text-xl text-primary">{{ item.icon }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-foreground block text-sm">{{ item.title }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ item.desc }}</text>
            </view>
            <text class="text-base text-[#ccc]">›</text>
          </view>
        </view>

        <!-- 联系我们 -->
        <text class="font-bold text-foreground block mb-3">📞 联系我们</text>
        <view class="bg-white rounded-2xl overflow-hidden shadow-sm border border-border mb-6">
          <view class="p-4 flex items-center justify-between active:bg-background" @click="goFeedback">
            <view class="flex items-center gap-3">
              <text class="text-base"></text>
              <text class="text-foreground text-sm">意见反馈</text>
            </view>
            <text class="text-muted-foreground text-sm">›</text>
          </view>
          <view class="p-4 flex items-center justify-between border-t border-[#FAF8F5]">
            <view class="flex items-center gap-3">
              <text class="text-base">📧</text>
              <text class="text-foreground text-sm">客服邮箱</text>
            </view>
            <text class="text-muted-foreground text-xs">support@rebu.com</text>
          </view>
          <view class="p-4 flex items-center justify-between border-t border-[#FAF8F5]">
            <view class="flex items-center gap-3">
              <text class="text-base">💚</text>
              <text class="text-foreground text-sm">官方微信</text>
            </view>
            <text class="text-muted-foreground text-xs">rebu_guoxue</text>
          </view>
          <view class="p-4 flex items-center justify-between border-t border-[#FAF8F5]" @click="goOfficialSite">
            <view class="flex items-center gap-3">
              <text class="text-base">🌐</text>
              <text class="text-foreground text-sm">官方网站</text>
            </view>
            <text class="text-muted-foreground text-xs">www.rebu.com</text>
          </view>
        </view>

        <!-- 协议链接 -->
        <view class="flex items-center justify-center gap-4 mb-4">
          <text class="text-xs text-primary" @click="viewAgreement"> 用户协议</text>
          <text class="text-xs text-[#E8E0D5]">|</text>
          <text class="text-xs text-primary" @click="viewPrivacy"> 隐私政策</text>
          <text class="text-xs text-[#E8E0D5]">|</text>
          <text class="text-xs text-primary" @click="viewDisclaimer">⚠ 免责声明</text>
        </view>

        <!-- 底部 -->
        <view class="mt-6 text-center">
          <text class="text-xs text-muted-foreground block">热卜国学 v{{ version }} (Build {{ buildNum }})</text>
          <text class="text-xs text-muted-foreground block mt-1">{{ copyright }}</text>
          <text class="text-xs text-muted-foreground block mt-1"> 京ICP备2024XXXXXX号-1</text>
          <view class="flex items-center justify-center gap-1 mt-2">
            <text class="text-[10px] text-[#ccc]">由 热卜科技 研发</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(true)
const version = '2.0.0'
const buildNum = '20240115'
const buildType = '正式版'
const copyright = 'Copyright 2024 热卜国学 All Rights Reserved'

const stats = ref([
  { value: '100+', label: '专家讲师', color: 'text-primary' },
  { value: '500+', label: '精品课程', color: 'text-accent' },
  { value: '50万+', label: '学习用户', color: 'text-green-500' },
])

const changelog = ref([
  '新增八字排盘专业版，支持更多流派选择和个性化配置',
  '优化紫微斗数排盘引擎，大幅提升计算准确性与速度',
  '新增圈子内容分析功能，支持数据趋势和分类分布查看',
  '修复已知bug若干，提升系统整体稳定性和响应速度',
  '优化页面加载速度，骨架屏过渡更加流畅自然',
  '重构商品详情页，新增规格选择和数量调整功能',
])

const features = ref([
  { icon: '', title: '古籍经典', desc: '海量国学典籍在线阅读，支持注释和白话翻译对照' },
  { icon: '🧮', title: '智能排盘', desc: '八字/紫微/奇门/六爻等十余种专业排盘工具' },
  { icon: '', title: '圈子交流', desc: '与国学爱好者深入交流，分享学习心得和经验' },
  { icon: '🎓', title: '名师课程', desc: '专家教授在线授课，系统学习国学各领域知识' },
  { icon: '🔮', title: 'AI 解盘', desc: 'AI智能解读排盘结果，辅助学习和理解' },
  { icon: '', title: '风水工具', desc: '风水罗盘、玄空飞星等专业风水分析工具' },
	{ icon: '🏛️', title: '线下活动', desc: '定期举办国学文化体验活动' },
])

setTimeout(() => { loading.value = false }, 500)

function goFeedback() { uni.showToast({ title: '反馈页面开发中', icon: 'none' }) }
function goOfficialSite() { uni.showToast({ title: '正在打开官网', icon: 'none' }) }
function viewAgreement() { uni.showToast({ title: '用户协议', icon: 'none' }) }
function viewPrivacy() { uni.showToast({ title: '隐私政策', icon: 'none' }) }
function viewDisclaimer() { uni.showToast({ title: '免责声明', icon: 'none' }) }
function goBack() { uni.navigateBack() }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
