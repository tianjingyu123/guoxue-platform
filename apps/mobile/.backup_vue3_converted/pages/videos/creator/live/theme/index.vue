<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 border-b border-border" style="backdrop-filter: blur(12px);">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view @click="goBack">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">直播间装修</text>
        </view>
        <view class="px-4 py-1.5 bg-primary text-white text-sm rounded-full">
          <text>保存配置</text>
        </view>
      </view>
    </view>

    <view class="flex flex-col">
      <!-- 配置区 -->
      <view class="flex-1 p-4 space-y-4">
        <view class="w-full grid grid-cols-3 bg-secondary rounded-xl p-1">
          <view
            v-for="tab in tabs" :key="tab.key"
            @click="activeTab = tab.key"
            :class="['py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors', activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground']"
          >
            <text>{{ tab.icon }}</text>
            <text>{{ tab.label }}</text>
          </view>
        </view>

        <!-- 主题模版Tab -->
        <view v-if="activeTab === 'templates'" class="space-y-4">
          <!-- 预设模版 -->
          <view>
            <text class="text-sm font-medium text-foreground block mb-3">预设氛围模版</text>
            <view class="grid grid-cols-2 gap-3">
              <view
                v-for="theme in themeTemplates" :key="theme.id"
                @click="selectedTheme = theme.id"
                :class="['relative overflow-hidden bg-white rounded-xl border-2 transition-all', selectedTheme === theme.id ? 'border-primary shadow-md' : 'border-border']"
              >
                <!-- 主题预览 -->
                <view :class="['h-20 flex items-center justify-center bg-gradient-to-br', theme.bgGradient]">
                  <text class="text-3xl">{{ theme.preview }}</text>

                  <!-- 选中标记 -->
                  <view v-if="selectedTheme === theme.id" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <text class="text-white text-xs">✓</text>
                  </view>

                  <!-- 付费标记 -->
                  <view v-if="!theme.isFree" class="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <text>👑</text>
                    <text>会员</text>
                  </view>

                  <!-- 使用中标记 -->
                  <view v-if="theme.isUsing" class="absolute bottom-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">使用中</view>
                </view>

                <!-- 主题信息 -->
                <view class="p-2.5">
                  <text class="text-sm font-medium text-foreground block">{{ theme.name }}</text>
                  <text class="text-[10px] text-muted-foreground mt-0.5 block">{{ theme.desc }}</text>

                  <!-- 主色调预览 -->
                  <view class="flex items-center gap-1.5 mt-2">
                    <view class="w-4 h-4 rounded-full border-2 border-white shadow-sm" :style="{ backgroundColor: theme.primaryColor }" />
                    <view class="w-4 h-4 rounded-full border-2 border-white shadow-sm" :style="{ backgroundColor: theme.secondaryColor }" />
                    <text class="text-[10px] text-muted-foreground ml-1">主色调</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 自定义主题 -->
          <view class="bg-white rounded-xl border border-border p-4">
            <view class="flex items-center justify-between mb-3">
              <text class="text-sm font-medium text-foreground">自定义主题</text>
              <view class="text-[10px] px-1.5 py-0.5 border border-border rounded-full text-accent flex items-center gap-0.5">
                <text>👑</text>
                <text>高级会员专享</text>
              </view>
            </view>

            <!-- 品牌Logo上传 -->
            <view class="mb-4">
              <text class="text-xs text-muted-foreground block mb-2">品牌Logo</text>
              <view class="flex items-center gap-3">
                <view class="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary">
                  <text class="text-muted-foreground"></text>
                </view>
                <view class="text-xs text-muted-foreground">
                  <text class="block">支持PNG/JPG格式</text>
                  <text class="block">建议尺寸200x200px</text>
                </view>
              </view>
            </view>

            <!-- 主色调选择 -->
            <view class="mb-4">
              <text class="text-xs text-muted-foreground block mb-2">主色调</text>
              <view class="flex items-center gap-2">
                <view
                  v-for="color in colorOptions" :key="color"
                  @click="customColor = color"
                  :class="['w-8 h-8 rounded-full border-2 transition-transform', customColor === color ? 'scale-110 border-white shadow-lg' : 'border-transparent']"
                  :style="{ backgroundColor: color }"
                />
                <view class="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                  <text class="text-muted-foreground text-sm">+</text>
                </view>
              </view>
            </view>

            <!-- 背景图上传 -->
            <view>
              <text class="text-xs text-muted-foreground block mb-2">自定义背景</text>
              <view class="grid grid-cols-3 gap-2">
                <view class="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary">
                  <view class="text-center">
                    <text class="text-muted-foreground block"></text>
                    <text class="text-[10px] text-muted-foreground mt-1 block">上传图片</text>
                  </view>
                </view>
                <view class="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary">
                  <view class="text-center">
                    <text class="text-muted-foreground block">▶️</text>
                    <text class="text-[10px] text-muted-foreground mt-1 block">上传视频</text>
                  </view>
                </view>
                <view class="aspect-video rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700">
                  <text class="text-[10px] text-white font-medium">绿幕</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 视觉元素Tab -->
        <view v-if="activeTab === 'elements'" class="space-y-4">
          <!-- 背景设置 -->
          <view class="bg-white rounded-xl border border-border p-4">
            <text class="text-sm font-medium text-foreground block mb-3">背景设置</text>
            <view class="space-y-3">
              <view class="flex items-center justify-between">
                <text class="text-sm text-foreground">背景模糊</text>
                <view class="w-32">
                  <slider :value="30" :max="100" :step="10" activeColor="#C41E3A" backgroundColor="#E8E0D5" block-size="16" />
                </view>
              </view>
              <view class="flex items-center justify-between">
                <text class="text-sm text-foreground">背景暗度</text>
                <view class="w-32">
                  <slider :value="50" :max="100" :step="10" activeColor="#C41E3A" backgroundColor="#E8E0D5" block-size="16" />
                </view>
              </view>
            </view>
          </view>

          <!-- 挂件配置 -->
          <view class="bg-white rounded-xl border border-border p-4">
            <view class="flex items-center justify-between mb-3">
              <text class="text-sm font-medium text-foreground">直播间挂件</text>
              <view class="text-xs text-primary flex items-center gap-1">
                <text>＋</text>
                <text>添加挂件</text>
              </view>
            </view>

            <view class="grid grid-cols-2 gap-2">
              <view
                v-for="pendant in pendants" :key="pendant.id"
                @click="togglePendant(pendant.id)"
                :class="['flex items-center gap-3 p-3 rounded-lg border transition-colors', activePendants.includes(pendant.id) ? 'border-primary bg-primary/5' : 'border-border']"
              >
                <view class="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl">
                  <text>{{ pendant.icon }}</text>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium text-foreground block">{{ pendant.name }}</text>
                  <text class="text-[10px] text-muted-foreground">位置：{{ pendant.position }}</text>
                </view>
                <view
                  @click.stop="togglePendant(pendant.id)"
                  :class="['relative w-10 h-6 rounded-full transition-colors', activePendants.includes(pendant.id) ? 'bg-primary' : 'bg-[#E8E0D5]']"
                >
                  <view :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', activePendants.includes(pendant.id) ? 'right-0.5' : 'left-0.5']" />
                </view>
              </view>
            </view>
          </view>

          <!-- 组件样式 -->
          <view class="bg-white rounded-xl border border-border p-4">
            <text class="text-sm font-medium text-foreground block mb-3">UI组件样式</text>
            <view class="space-y-3">
              <view v-for="ui in uiStyles" :key="ui.label" class="flex items-center justify-between p-2 rounded-lg bg-secondary">
                <view class="flex items-center gap-2">
                  <text>{{ ui.icon }}</text>
                  <text class="text-sm text-foreground">{{ ui.label }}</text>
                </view>
                <view class="text-[10px] px-1.5 py-0.5 border border-border rounded-full text-muted-foreground">{{ ui.style }}</view>
              </view>
            </view>
          </view>
        </view>

        <!-- 动效配置Tab -->
        <view v-if="activeTab === 'effects'" class="space-y-4">
          <!-- 动效开关 -->
          <view class="bg-white rounded-xl border border-border p-4">
            <text class="text-sm font-medium text-foreground block mb-3">动效开关</text>
            <view class="space-y-3">
              <view v-for="effect in effects" :key="effect.id" class="flex items-center justify-between p-3 rounded-lg border border-border">
                <view class="flex items-center gap-3">
                  <view :class="['w-10 h-10 rounded-lg flex items-center justify-center', effectSettings[effect.type] ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground']">
                    <text>{{ effect.icon }}</text>
                  </view>
                  <view>
                    <text class="text-sm font-medium text-foreground block">{{ effect.name }}</text>
                    <text class="text-[10px] text-muted-foreground">{{ effect.desc }}</text>
                  </view>
                </view>
                <view
                  @click="toggleEffect(effect.type)"
                  :class="['relative w-10 h-6 rounded-full transition-colors', effectSettings[effect.type] ? 'bg-primary' : 'bg-[#E8E0D5]']"
                >
                  <view :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', effectSettings[effect.type] ? 'right-0.5' : 'left-0.5']" />
                </view>
              </view>
            </view>
          </view>

          <!-- 入场特效设置 -->
          <view class="bg-white rounded-xl border border-border p-4">
            <text class="text-sm font-medium text-foreground block mb-3">入场特效样式</text>
            <view class="grid grid-cols-3 gap-2">
              <view
                v-for="(style, idx) in enterEffects" :key="style"
                :class="['p-3 rounded-lg border text-center transition-colors', idx === 0 ? 'border-primary bg-primary/5' : 'border-border']"
              >
                <text class="text-lg block">{{ enterEffectIcons[idx] }}</text>
                <text class="text-[10px] text-foreground">{{ style }}</text>
              </view>
            </view>
          </view>

          <!-- 点赞动效设置 -->
          <view class="bg-white rounded-xl border border-border p-4">
            <text class="text-sm font-medium text-foreground block mb-3">点赞动效样式</text>
            <view class="grid grid-cols-4 gap-2">
              <view
                v-for="(style, idx) in likeEffects" :key="style"
                :class="['p-2 rounded-lg border text-center transition-colors', idx === 0 ? 'border-primary bg-primary/5' : 'border-border']"
              >
                <text class="text-xs">{{ style }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 右侧预览区 -->
      <view class="p-4 border-t border-border">
        <view class="bg-white rounded-xl border border-border overflow-hidden">
          <view class="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary">
            <text class="text-xs font-medium text-foreground">实时预览</text>
            <view class="flex items-center gap-1">
              <view @click="isPreviewPlaying = !isPreviewPlaying" class="w-6 h-6 rounded flex items-center justify-center bg-white">
                <text>{{ isPreviewPlaying ? '⏸' : '▶️' }}</text>
              </view>
              <view class="w-6 h-6 rounded flex items-center justify-center bg-white">
                <text></text>
              </view>
            </view>
          </view>

          <!-- 直播间预览 -->
          <view :class="['aspect-[9/16] relative overflow-hidden bg-gradient-to-br', currentTheme.bgGradient]">
            <!-- 顶部信息栏 -->
            <view class="absolute top-3 left-3 right-3 flex items-center justify-between">
              <view class="flex items-center gap-2 px-2 py-1 bg-black/30 rounded-full" style="backdrop-filter: blur(4px);">
                <view class="w-6 h-6 rounded-full border border-white/30 bg-secondary flex items-center justify-center overflow-hidden">
                  <text class="text-[10px] text-ink-soft">主</text>
                </view>
                <text class="text-white text-[10px]">主播昵称</text>
              </view>
              <view class="flex items-center gap-1 px-2 py-1 bg-black/30 rounded-full" style="backdrop-filter: blur(4px);">
                <text class="text-white/70 text-[10px]"></text>
                <text class="text-white text-[10px]">1.2万</text>
              </view>
            </view>

            <!-- 挂件预览 -->
            <view v-if="activePendants.includes(1)" class="absolute top-12 left-3 text-2xl opacity-80">福</view>
            <view v-if="activePendants.includes(4)" class="absolute top-12 right-3 text-xl opacity-80"></view>

            <!-- 弹幕预览 -->
            <view class="absolute left-3 bottom-32 space-y-1.5 max-w-[70%]">
              <view class="px-2 py-1 bg-black/40 rounded-full" style="backdrop-filter: blur(4px);">
                <text class="text-[10px] text-white"><text class="text-amber-400">用户A</text> 老师讲得真好！</text>
              </view>
              <view class="px-2 py-1 bg-black/40 rounded-full" style="backdrop-filter: blur(4px);">
                <text class="text-[10px] text-white"><text class="text-amber-400">用户B</text> 涨知识了</text>
              </view>
            </view>

            <!-- 点赞动画预览 -->
            <view v-if="effectSettings.like && isPreviewPlaying" class="absolute right-6 bottom-40 space-y-2" style="animation: ai-float 2s ease-in-out infinite;">
              <text class="block text-red-500 opacity-80"></text>
              <text class="block text-red-500 opacity-60 text-sm"></text>
              <text class="block text-red-500 opacity-40 text-xs"></text>
            </view>

            <!-- 底部操作栏 -->
            <view class="absolute bottom-3 left-3 right-3">
              <view class="flex items-center gap-2">
                <view class="flex-1 h-8 px-3 bg-white/10 rounded-full flex items-center" style="backdrop-filter: blur(4px);">
                  <text class="text-[10px] text-white/50">说点什么...</text>
                </view>
                <view class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <text class="text-white"></text>
                </view>
                <view class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <text class="text-white">🎁</text>
                </view>
              </view>
            </view>

            <!-- 主题色指示 -->
            <view class="absolute bottom-16 left-3 right-3">
              <view class="h-1 rounded-full opacity-50" :style="{ backgroundColor: currentTheme.primaryColor }" />
            </view>
          </view>
        </view>

        <!-- 当前配置摘要 -->
        <view class="mt-4 bg-white rounded-xl border border-border p-3">
          <text class="text-xs font-medium text-foreground block mb-2">当前配置</text>
          <view class="space-y-1.5 text-[10px] text-muted-foreground">
            <view class="flex items-center justify-between">
              <text>主题模版</text>
              <text class="font-medium text-foreground">{{ currentTheme.name }}</text>
            </view>
            <view class="flex items-center justify-between">
              <text>已启用挂件</text>
              <text class="font-medium text-foreground">{{ activePendants.length }}个</text>
            </view>
            <view class="flex items-center justify-between">
              <text>已启用动效</text>
              <text class="font-medium text-foreground">{{ Object.values(effectSettings).filter(Boolean).length }}个</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4" style="padding-bottom: env(safe-area-inset-bottom);">
      <view class="flex gap-3">
        <view @click="handleReset" class="flex-1 py-3 border border-border rounded-full text-center text-sm text-foreground">重置默认</view>
        <view @click="handleSave" class="flex-1 py-3 bg-primary text-white rounded-full text-center text-sm">保存并应用</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref('templates')
const selectedTheme = ref('default')
const customColor = ref('#8B5CF6')
const isPreviewPlaying = ref(true)
const activePendants = ref<number[]>([1, 4])
const effectSettings = ref<Record<string, boolean>>({
  enter: true,
  like: true,
  gift: true,
  danmaku: false,
})

const tabs = [
  { key: 'templates', label: '主题模版', icon: '' },
  { key: 'elements', label: '视觉元素', icon: '️' },
  { key: 'effects', label: '动效配置', icon: '' },
]

const themeTemplates = [
  { id: 'default', name: '默认主题', desc: '简洁大气，适合日常直播', primaryColor: '#8B5CF6', secondaryColor: '#A78BFA', bgGradient: 'from-gray-900 to-gray-800', preview: '', isFree: true, isUsing: true },
  { id: 'chinese', name: '新中式', desc: '古典韵味，国学文化氛围', primaryColor: '#DC2626', secondaryColor: '#F59E0B', bgGradient: 'from-red-950 to-amber-950', preview: '🏮', isFree: true, isUsing: false },
  { id: 'spring', name: '春节喜庆', desc: '红红火火，节日氛围拉满', primaryColor: '#EF4444', secondaryColor: '#FCD34D', bgGradient: 'from-red-600 to-red-900', preview: '🧧', isFree: false, isUsing: false },
  { id: 'mid-autumn', name: '中秋团圆', desc: '月圆人圆，温馨典雅', primaryColor: '#F59E0B', secondaryColor: '#FDE68A', bgGradient: 'from-amber-900 to-orange-950', preview: '🥮', isFree: false, isUsing: false },
  { id: 'minimalist', name: '极简白', desc: '干净清爽，专注内容', primaryColor: '#6366F1', secondaryColor: '#818CF8', bgGradient: 'from-slate-100 to-slate-200', preview: '⬜', isFree: true, isUsing: false },
  { id: 'ink', name: '水墨风', desc: '淡雅水墨，文人气质', primaryColor: '#374151', secondaryColor: '#9CA3AF', bgGradient: 'from-stone-800 to-stone-900', preview: '🖌️', isFree: false, isUsing: false },
]

const pendants = [
  { id: 1, name: '福字', icon: '福', position: '左上' },
  { id: 2, name: '灯笼', icon: '🏮', position: '右上' },
  { id: 3, name: '祥云', icon: '☁️', position: '顶部' },
  { id: 4, name: '铜钱', icon: '', position: '角落' },
]

const uiStyles = [
  { label: '观众列表样式', icon: '', style: '头像堆叠' },
  { label: '礼物栏样式', icon: '🎁', style: '底部横条' },
  { label: '弹幕气泡样式', icon: '', style: '圆角气泡' },
]

const effects = [
  { id: 1, name: '入场特效', type: 'enter', desc: '观众进入直播间动画', icon: '' },
  { id: 2, name: '点赞特效', type: 'like', desc: '爱心上浮动画样式', icon: '' },
  { id: 3, name: '礼物特效', type: 'gift', desc: '礼物飞屏动画', icon: '🎁' },
  { id: 4, name: '弹幕样式', type: 'danmaku', desc: '弹幕气泡外观', icon: '' },
]

const enterEffects = ['祥云入场', '金光闪烁', '简约淡入', '烟花绽放', '波纹扩散', '无特效']
const enterEffectIcons = ['☁️', '', '💫', '🎆', '🌊', '⬜']
const likeEffects = [' 爱心', ' 点赞', '🌸 花瓣', ' 星星']
const colorOptions = ['#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899']

const currentTheme = computed(() => themeTemplates.find(t => t.id === selectedTheme) || themeTemplates[0])

function togglePendant(id: number) {
  if (activePendants.value.includes(id)) {
    activePendants.value = activePendants.value.filter(p => p !== id)
  } else {
    activePendants.value = [...activePendants.value, id]
  }
}

function toggleEffect(type: string) {
  effectSettings.value = { ...effectSettings.value, [type]: !effectSettings.value[type] }
}

function handleReset() {
  selectedTheme.value = 'default'
  activePendants.value = [1, 4]
  effectSettings.value = { enter: true, like: true, gift: true, danmaku: false }
}

function handleSave() {
  uni.showToast({ title: '配置已保存', icon: 'success' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
@keyframes ai-float {
  0%, 100% { transform: translateY(0); opacity: 0.8; }
  50% { transform: translateY(-20px); opacity: 0; }
}
</style>
