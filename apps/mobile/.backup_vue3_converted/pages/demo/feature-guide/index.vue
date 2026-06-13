<template>
  <view class="min-h-screen" style="background-color: #FAF8F5;">
    <!-- 引导浮层 - 默认5步 -->
    <view v-if="showDefaultGuide" class="fixed inset-0 z-50" style="background-color: rgba(0,0,0,0.6);">
      <view class="absolute rounded-2xl p-5 w-72" style="background-color: #FFFFFF; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <text class="text-lg font-bold block mb-2" style="color: #2C2C2C;">新功能介绍</text>
        <text class="text-sm block mb-4" style="color: #999;">v2.1.0 版本更新了以下功能，快来体验吧！</text>
        <view class="space-y-3 mb-4">
          <view v-for="(step, i) in defaultSteps" :key="i" class="flex items-start gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: rgba(196,30,58,0.1);">
              <text style="color: #C41E3A; font-size: 16px;">{{ step.icon }}</text>
            </view>
            <view class="flex-1">
              <text class="font-medium text-sm block" style="color: #2C2C2C;">{{ step.title }}</text>
              <text class="text-xs" style="color: #999;">{{ step.description }}</text>
            </view>
          </view>
        </view>
        <view @click="showDefaultGuide = false" class="w-full py-2.5 rounded-xl text-white font-medium text-center" style="background-color: #C41E3A; cursor: pointer;">我知道了</view>
      </view>
    </view>

    <!-- 引导浮层 - 自定义3步 -->
    <view v-if="showCustomGuide" class="fixed inset-0 z-50" style="background-color: rgba(0,0,0,0.6);">
      <view class="absolute rounded-2xl p-5 w-72" style="background-color: #FFFFFF; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <text class="text-lg font-bold block mb-2" style="color: #2C2C2C;">版本更新</text>
        <text class="text-sm block mb-4" style="color: #999;">v2.2.0 新功能</text>
        <view class="space-y-3 mb-4">
          <view v-for="(step, i) in customSteps" :key="i" class="flex items-start gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: rgba(196,30,58,0.1);">
              <text style="color: #C41E3A; font-size: 16px;">{{ step.icon }}</text>
            </view>
            <view class="flex-1">
              <text class="font-medium text-sm block" style="color: #2C2C2C;">{{ step.title }}</text>
              <text class="text-xs" style="color: #999;">{{ step.description }}</text>
            </view>
          </view>
        </view>
        <view @click="showCustomGuide = false" class="w-full py-2.5 rounded-xl text-white font-medium text-center" style="background-color: #C41E3A; cursor: pointer;">我知道了</view>
      </view>
    </view>

    <!-- 引导浮层 - 自动弹出(模拟首次访问) -->
    <view v-if="showAutoGuide" class="fixed inset-0 z-50" style="background-color: rgba(0,0,0,0.6);">
      <view class="absolute rounded-2xl p-5 w-72" style="background-color: #FFFFFF; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <text class="text-lg font-bold block mb-2" style="color: #2C2C2C;">欢迎体验</text>
        <text class="text-sm block mb-4" style="color: #999;">demo-2.1.0 新功能引导</text>
        <view class="space-y-3 mb-4">
          <view v-for="(step, i) in autoSteps" :key="i" class="flex items-start gap-3">
            <view class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: rgba(196,30,58,0.1);">
              <text style="color: #C41E3A; font-size: 16px;">{{ step.icon }}</text>
            </view>
            <view class="flex-1">
              <text class="font-medium text-sm block" style="color: #2C2C2C;">{{ step.title }}</text>
              <text class="text-xs" style="color: #999;">{{ step.description }}</text>
            </view>
          </view>
        </view>
        <view @click="closeAutoGuide" class="w-full py-2.5 rounded-xl text-white font-medium text-center" style="background-color: #C41E3A; cursor: pointer;">我知道了</view>
      </view>
    </view>

    <!-- 模拟的应用界面 -->
    <view class="relative" style="padding-bottom: 56px;">
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-30" style="background-color: #FAF8F5; border-bottom: 1px solid #E8E0D5;">
        <view class="flex items-center justify-between px-4" style="height: 56px;">
          <text class="font-bold text-lg" style="color: #2C2C2C;">热卜国学</text>
          <view class="flex items-center gap-2">
            <view class="p-2 rounded-full" hover-class="icon-hover" style="cursor: pointer;">
              <text style="color: #999; font-size: 18px;"></text>
            </view>
            <view class="p-2 rounded-full relative" hover-class="icon-hover" style="cursor: pointer;">
              <text style="color: #999; font-size: 18px;"></text>
              <view class="absolute top-1 right-1 w-2 h-2 rounded-full" style="background-color: #C41E3A;" />
            </view>
          </view>
        </view>
      </view>

      <!-- 主内容区 -->
      <view class="p-4 space-y-6">
        <!-- 功能入口网格 -->
        <view class="grid grid-cols-4 gap-4">
          <view v-for="(item, i) in functionEntries" :key="i" class="flex flex-col items-center gap-2">
            <view class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background-color: #F5F1EB;">
              <text :style="{ fontSize: '24px', color: item.color }">{{ item.icon }}</text>
            </view>
            <text class="text-xs" style="color: #999;">{{ item.label }}</text>
          </view>
        </view>

        <!-- 演示控制区 -->
        <view class="p-4 rounded-xl" style="background-color: rgba(196,30,58,0.05); border: 1px solid rgba(196,30,58,0.2);">
          <text class="font-semibold text-base block mb-3" style="color: #2C2C2C;">新功能引导演示</text>
          <text class="text-sm block mb-4" style="color: #999;">点击下方按钮体验不同的引导浮层效果</text>
          <view class="space-y-3">
            <view @click="showDefaultGuide = true" class="w-full py-3 rounded-xl text-white font-medium text-center" style="background-color: #C41E3A; cursor: pointer;">
              展示默认引导（5步）
            </view>
            <view @click="showCustomGuide = true" class="w-full py-3 rounded-xl font-medium text-center" style="border: 1px solid #E8E0D5; color: #2C2C2C; background-color: #FFFFFF; cursor: pointer;">
              展示自定义引导（3步）
            </view>
            <view @click="showAutoGuideDemo" class="w-full py-3 rounded-xl font-medium text-center" style="background-color: #F5F1EB; color: #2C2C2C; cursor: pointer;">
              模拟首次访问自动弹出
            </view>
          </view>
        </view>

        <!-- 模拟功能卡片 -->
        <view class="space-y-3">
          <!-- 付费问答 -->
          <view class="p-4 rounded-xl" style="background-color: #FFFFFF; border: 1px solid #E8E0D5;">
            <view class="flex items-center gap-3">
              <view class="w-12 h-12 rounded-xl flex items-center justify-center" style="background-color: rgba(196,30,58,0.1);">
                <text style="color: #C41E3A; font-size: 22px;"></text>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-2">
                  <text class="font-medium" style="color: #2C2C2C;">付费问答</text>
                  <view class="px-1.5 py-0.5 rounded" style="background-color: rgba(196,30,58,0.1);">
                    <text style="color: #C41E3A; font-size: 10px;">新功能</text>
                  </view>
                </view>
                <text class="text-xs block" style="color: #999; margin-top: 2px;">向专家发起提问</text>
              </view>
            </view>
          </view>

          <!-- AI智能搜索 -->
          <view class="p-4 rounded-xl" style="background-color: #FFFFFF; border: 1px solid #E8E0D5;">
            <view class="flex items-center gap-3">
              <view class="w-12 h-12 rounded-xl flex items-center justify-center" style="background-color: rgba(201,169,110,0.1);">
                <text style="color: #C9A96E; font-size: 22px;"></text>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-2">
                  <text class="font-medium" style="color: #2C2C2C;">AI智能搜索</text>
                  <view class="px-1.5 py-0.5 rounded" style="background-color: rgba(201,169,110,0.1);">
                    <text style="color: #C9A96E; font-size: 10px;">新功能</text>
                  </view>
                </view>
                <text class="text-xs block" style="color: #999; margin-top: 2px;">用自然语言提问</text>
              </view>
            </view>
          </view>

          <!-- 连麦咨询 -->
          <view class="p-4 rounded-xl" style="background-color: #FFFFFF; border: 1px solid #E8E0D5;">
            <view class="flex items-center gap-3">
              <view class="w-12 h-12 rounded-xl flex items-center justify-center" style="background-color: #F5F1EB;">
                <text style="color: #C41E3A; font-size: 22px;"></text>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-2">
                  <text class="font-medium" style="color: #2C2C2C;">连麦咨询</text>
                  <view class="px-1.5 py-0.5 rounded" style="background-color: rgba(196,30,58,0.1);">
                    <text style="color: #C41E3A; font-size: 10px;">新功能</text>
                  </view>
                </view>
                <text class="text-xs block" style="color: #999; margin-top: 2px;">与讲师实时交流</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 使用说明 -->
        <view class="p-4 rounded-xl" style="background-color: #FFFFFF; border: 1px solid #E8E0D5;">
          <text class="font-medium block mb-2" style="color: #2C2C2C;">组件特性</text>
          <view class="text-sm space-y-1.5" style="color: #999;">
            <text class="block">• 半透明蒙层 + SVG镂空高亮</text>
            <text class="block">• 支持多步骤引导，左右滑动切换</text>
            <text class="block">• 步骤指示器可点击跳转</text>
            <text class="block">• 键盘方向键和ESC快捷操作</text>
            <text class="block">• useFeatureGuide Hook 管理状态</text>
            <text class="block">• localStorage 记录已展示版本</text>
          </view>
        </view>
      </view>

      <!-- 底部导航 -->
      <view class="fixed bottom-0 left-0 right-0" style="background-color: #FAF8F5; border-top: 1px solid #E8E0D5; padding-bottom: env(safe-area-inset-bottom, 0px);">
        <view class="flex items-center justify-around" style="height: 56px;">
          <view v-for="(tab, i) in bottomTabs" :key="i" class="flex flex-col items-center gap-0.5 px-4 py-1" style="cursor: pointer;">
            <text style="color: #999; font-size: 18px;">{{ tab.icon }}</text>
            <text style="color: #999; font-size: 10px;">{{ tab.label }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface FunctionEntry {
  icon: string
  label: string
  color: string
}

interface GuideStep {
  icon: string
  title: string
  description: string
}

interface BottomTab {
  icon: string
  label: string
}

const showDefaultGuide = ref(false)
const showCustomGuide = ref(false)
const showAutoGuide = ref(false)

const functionEntries: FunctionEntry[] = [
  { icon: '', label: 'AI对话', color: '#C9A96E' },
  { icon: '🧭', label: '排盘', color: '#C41E3A' },
  { icon: '', label: '古籍', color: '#C9A96E' },
  { icon: '', label: '圈子', color: '#C41E3A' },
]

const defaultSteps: GuideStep[] = [
  { icon: '', title: 'AI对话', description: '与AI国学大师对话，解答你的疑问' },
  { icon: '🧭', title: '排盘工具', description: '八字、紫微、奇门等多种排盘' },
  { icon: '', title: '古籍库', description: '海量国学古籍在线查阅' },
  { icon: '', title: '圈子', description: '与同好交流国学心得' },
  { icon: '🎓', title: '课程学习', description: '系统学习国学知识' },
]

const customSteps: GuideStep[] = [
  { icon: '', title: '首页AI入口', description: '点击这里开始智能对话，探索国学智慧' },
  { icon: '🧭', title: '排盘工具升级', description: '新增紫微斗数、奇门遁甲等更多排盘方式' },
  { icon: '', title: '付费问答上线', description: '向圈主发起提问，获取专业解答' },
]

const autoSteps: GuideStep[] = [
  { icon: '', title: 'AI对话', description: '与AI国学大师对话，解答你的疑问' },
  { icon: '🧭', title: '排盘工具', description: '八字、紫微、奇门等多种排盘' },
  { icon: '', title: '古籍库', description: '海量国学古籍在线查阅' },
  { icon: '', title: '圈子', description: '与同好交流国学心得' },
  { icon: '🎓', title: '课程学习', description: '系统学习国学知识' },
]

const bottomTabs: BottomTab[] = [
  { icon: '🏠', label: '首页' },
  { icon: '🧭', label: '排盘' },
  { icon: '', label: '圈子' },
  { icon: '️', label: '商城' },
  { icon: '⚙️', label: '我的' },
]

function showAutoGuideDemo() {
  // 模拟 useFeatureGuide Hook 的 reset + open 行为
  showAutoGuide.value = true
}

function closeAutoGuide() {
  showAutoGuide.value = false
}
</script>

<style scoped>
.icon-hover {
  background-color: rgba(240, 235, 229, 1);
}
</style>
