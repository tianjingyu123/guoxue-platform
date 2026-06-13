<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack"><text class="text-lg text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">生成海报</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="pb-40">
      <!-- 海报预览区 -->
      <view class="p-6 flex justify-center">
        <view
          :class="['w-72 rounded-2xl overflow-hidden shadow-2xl', posterBgClass]"
        >
          <!-- 海报头部装饰 -->
          <view class="relative h-32 flex items-center justify-center">
            <!-- 装饰SVG -->
            <view class="absolute inset-0 opacity-10">
              <text class="text-[100px]" :class="selectedTemplate === 'modern' ? 'text-white' : 'text-foreground'"></text>
            </view>

            <!-- Logo -->
            <view class="relative z-10 flex flex-col items-center">
              <view
                :class="['w-14 h-14 rounded-xl flex items-center justify-center', selectedTemplate === 'modern' ? 'bg-white/20' : 'bg-primary/20']"
              >
                <text :class="['text-3xl', selectedTemplate === 'modern' ? 'text-white' : 'text-primary']">{{ sceneIcon }}</text>
              </view>
              <text
                :class="['text-lg font-bold mt-2', selectedTemplate === 'modern' ? 'text-white' : selectedTemplate === 'ink' ? 'text-stone-800' : 'text-foreground']"
              >
                热卜国学
              </text>
            </view>
          </view>

          <!-- 海报内容 -->
          <view
            :class="['px-6 py-5', selectedTemplate === 'modern' ? 'text-white' : selectedTemplate === 'ink' ? 'text-stone-800' : 'text-foreground']"
          >
            <text class="text-xl font-bold text-center block">{{ sceneConfig.title }}</text>
            <text
              :class="['text-sm text-center mt-1 block', selectedTemplate === 'modern' ? 'text-white/70' : 'text-muted-foreground']"
            >
              {{ sceneConfig.subtitle }}
            </text>

            <!-- 用户信息 -->
            <view
              :class="['flex items-center gap-3 mt-5 p-3 rounded-xl', selectedTemplate === 'modern' ? 'bg-white/10' : 'bg-secondary/50']"
            >
              <view class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <text class="text-sm text-primary font-bold">李</text>
              </view>
              <view class="flex-1">
                <text class="text-sm font-medium block">李易安</text>
                <text
                  :class="['text-xs', selectedTemplate === 'modern' ? 'text-white/60' : 'text-muted-foreground']"
                >
                  邀请你一起探索国学
                </text>
              </view>
            </view>

            <!-- 二维码区域 -->
            <view class="mt-5 flex flex-col items-center">
              <view class="w-28 h-28 rounded-xl bg-white flex items-center justify-center">
                <text class="text-6xl text-foreground"></text>
              </view>
              <text
                :class="['text-xs mt-2', selectedTemplate === 'modern' ? 'text-white/60' : 'text-muted-foreground']"
              >
                长按或扫码识别
              </text>
            </view>

            <!-- 奖励提示 -->
            <view
              :class="['mt-4 py-2 px-3 rounded-lg text-center text-xs', rewardBgClass]"
            >
              {{ sceneConfig.reward }}
            </view>
          </view>

          <!-- 海报底部 -->
          <view
            :class="['px-6 py-3 flex items-center justify-center gap-2 border-t', footerClass]"
          >
            <image src="/static/logo.png" mode="aspectFill" class="w-5 h-5 rounded" />
            <text class="text-xs">热卜国学 · 探索易学智慧</text>
          </view>
        </view>
      </view>

      <!-- 模板选择 -->
      <view class="px-4">
        <text class="text-sm font-medium text-foreground mb-3 block">选择模板</text>
        <scroll-view scroll-x class="flex gap-3 whitespace-nowrap pb-2">
          <view
            v-for="template in posterTemplates"
            :key="template.id"
            @click="selectedTemplate = template.id"
            :class="['inline-flex flex-col w-20 rounded-xl overflow-hidden border-2 mr-3', selectedTemplate === template.id ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent']"
          >
            <view :class="['h-28 flex items-center justify-center', template.bg]">
              <view :class="['w-8 h-8 rounded-lg flex items-center justify-center', template.id === 'modern' ? 'bg-white/20' : 'bg-primary/20']">
                <text :class="['text-sm', template.id === 'modern' ? 'text-white' : 'text-primary']"></text>
              </view>
            </view>
            <view class="py-2 text-center bg-white">
              <text :class="['text-xs', selectedTemplate === template.id ? 'text-primary font-medium' : 'text-muted-foreground']">{{ template.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 提示文字 -->
      <view class="px-4 mt-6">
        <view class="bg-accent/5 border border-accent/20 rounded-xl p-3">
          <text class="text-xs text-center text-muted-foreground block">分享后若有朋友通过你的海报进入平台，你将获得推广奖励</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border px-4 py-3">
      <view class="flex items-center gap-3">
        <view
          @click="handleSave"
          :class="['flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium', isSaved ? 'bg-green-500 text-white' : 'bg-secondary text-foreground']"
        >
          <text v-if="isSaving"></text>
          <text v-else-if="isSaved">✓</text>
          <text v-else>💾</text>
          <text class="text-sm">{{ isSaving ? '保存中...' : isSaved ? '已保存到相册' : '保存图片' }}</text>
        </view>
        <view
          @click="handleShare"
          class="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-medium"
        >
          <text></text>
          <text class="text-sm">直接分享</text>
        </view>
      </view>
    </view>

    <!-- 分享菜单 -->
    <view v-if="showShareMenu" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showShareMenu = false">
      <view class="w-full max-w-lg bg-white rounded-t-2xl pb-8" @click.stop>
        <view class="p-4 border-b border-border">
          <text class="font-semibold text-center text-foreground block">分享至</text>
        </view>
        <view class="grid grid-cols-4 gap-4 p-6">
          <view class="flex flex-col items-center gap-2">
            <view class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-xl text-white"><text></text></view>
            <text class="text-xs text-muted-foreground">微信好友</text>
          </view>
          <view class="flex flex-col items-center gap-2">
            <view class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-xl text-white"><text>🌐</text></view>
            <text class="text-xs text-muted-foreground">朋友圈</text>
          </view>
          <view class="flex flex-col items-center gap-2">
            <view class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl text-white"><text>🐧</text></view>
            <text class="text-xs text-muted-foreground">QQ好友</text>
          </view>
          <view class="flex flex-col items-center gap-2">
            <view class="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-xl text-white"><text></text></view>
            <text class="text-xs text-muted-foreground">微博</text>
          </view>
        </view>
        <view @click="showShareMenu = false" class="w-full py-4 text-center text-foreground font-medium border-t border-border">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type SceneType = 'invite' | 'course' | 'circle' | 'paipan'

const posterTemplates = [
  { id: 'classic', name: '国风经典', bg: 'from-primary/20 via-[#C9A96E]/10 to-[#FAF8F5]' },
  { id: 'modern', name: '简约现代', bg: 'from-slate-900 via-slate-800 to-slate-900' },
  { id: 'ink', name: '水墨丹青', bg: 'from-stone-100 via-stone-50 to-stone-100' },
  { id: 'gold', name: '金色华章', bg: 'from-amber-900/80 via-amber-800/60 to-amber-900/80' },
]

const sceneConfigs: Record<string, { title: string; subtitle: string; icon: string; reward: string }> = {
  invite: { title: '邀请好友', subtitle: '与好友一起探索国学智慧', icon: '🎁', reward: '邀请1位好友，双方各得7天会员' },
  course: { title: '八字命理入门精讲', subtitle: '周易大师倾情授课', icon: '', reward: '好友购买后你可获得10%返佣' },
  circle: { title: '八字命理研习社', subtitle: '1,280位圈友共同学习', icon: '', reward: '邀请入圈可获得5%分成' },
  paipan: { title: '我的八字排盘结果', subtitle: 'AI智能命理分析', icon: '', reward: '分享后好友可免费体验' },
}

const scene = ref<SceneType>('invite')
const selectedTemplate = ref('classic')
const isSaving = ref(false)
const isSaved = ref(false)
const showShareMenu = ref(false)

const sceneConfig = computed(() => sceneConfigs[scene.value])
const sceneIcon = computed(() => sceneConfigs[scene.value].icon)

const posterBgClass = computed(() => {
  const t = posterTemplates.find(t => t.id === selectedTemplate.value)
  return t ? `bg-gradient-to-b ${t.bg}` : 'bg-gradient-to-b from-primary/20 via-[#C9A96E]/10 to-[#FAF8F5]'
})

const rewardBgClass = computed(() => {
  if (selectedTemplate.value === 'modern') return 'bg-white/10 text-white/80'
  if (selectedTemplate.value === 'gold') return 'bg-amber-500/20 text-amber-200'
  return 'bg-accent/10 text-accent'
})

const footerClass = computed(() => {
  if (selectedTemplate.value === 'modern') return 'border-white/10 text-white/50'
  if (selectedTemplate.value === 'ink') return 'border-stone-200 text-stone-500'
  return 'border-border text-muted-foreground'
})

async function handleSave() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isSaving.value = false
  isSaved.value = true
  uni.showToast({ title: '海报已保存到相册', icon: 'success' })
  setTimeout(() => { isSaved.value = false }, 2000)
}

function handleShare() {
  showShareMenu.value = true
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
