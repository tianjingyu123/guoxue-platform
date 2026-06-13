<template>
  <view :class="['min-h-screen flex flex-col', themeBg]">
    <!-- 顶部信息栏 -->
    <view v-if="showHeader" class="fixed top-0 left-0 right-0 z-50 bg-white/90 border-b border-border px-4 py-3">
      <view class="flex items-center justify-between">
        <view class="flex items-center gap-3">
          <view class="w-9 h-9 flex items-center justify-center" @click="goBack"><text class="text-xl text-foreground">←</text></view>
          <view>
            <text class="font-medium text-foreground block">{{ book.title }}</text>
            <text class="text-xs text-muted-foreground">阅读进度 {{ progress }}%</text>
          </view>
        </view>
        <view class="flex items-center gap-1">
          <view :class="['w-9 h-9 flex items-center justify-center', showAudioPlayer ? 'text-primary' : '']" @click="showAudioPlayer = !showAudioPlayer">
            <text class="text-lg"></text>
          </view>
          <view :class="['w-9 h-9 flex items-center justify-center', showAIChat ? 'text-purple-500' : '']" @click="showAIChat = !showAIChat">
            <text class="text-lg"></text>
          </view>
          <view class="w-9 h-9 flex items-center justify-center" @click="toggleBookmark">
            <text class="text-lg">🔖</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 听书播放器 -->
    <view v-if="showAudioPlayer" class="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 shadow-lg">
      <view class="flex items-center gap-3">
        <view class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0" @click="isPlaying = !isPlaying">
          <text class="text-xl">{{ isPlaying ? '⏸' : '▶' }}</text>
        </view>
        <view class="flex-1 min-w-0">
          <text class="text-xs font-medium truncate block mb-1">卷一·论五行生克</text>
          <view class="flex items-center gap-2">
            <text class="text-[10px] opacity-80">02:34</text>
            <view class="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <view class="h-full w-1/3 bg-white rounded-full" />
            </view>
            <text class="text-[10px] opacity-80">08:15</text>
          </view>
        </view>
        <view class="px-2 py-1 text-xs bg-white/20 rounded shrink-0" @click="playbackSpeed = playbackSpeed >= 2 ? 0.5 : playbackSpeed + 0.25">
          <text>{{ playbackSpeed }}x</text>
        </view>
        <view class="p-1 shrink-0" @click="showAudioPlayer = false"><text class="text-sm">✕</text></view>
      </view>
    </view>

    <!-- AI智能助手对话 -->
    <view v-if="showAIChat" class="fixed inset-0 z-50 bg-black/50" @click="showAIChat = false">
      <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col" style="height: 70vh" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border shrink-0">
          <view class="flex items-center gap-2">
            <view class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <text class="text-white text-sm"></text>
            </view>
            <view>
              <text class="font-medium text-sm text-foreground block">古籍智能助手</text>
              <text class="text-[10px] text-muted-foreground">AI解读 · 白话翻译 · 智能问答</text>
            </view>
          </view>
          <view @click="showAIChat = false"><text class="text-lg text-muted-foreground">✕</text></view>
        </view>
        <scroll-view scroll-y class="flex-1 p-4">
          <view v-for="(msg, idx) in aiMessages" :key="idx" :class="['flex gap-2 mb-3', msg.role === 'user' ? 'flex-row-reverse' : '']">
            <view v-if="msg.role === 'ai'" class="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 shrink-0 flex items-center justify-center">
              <text class="text-white text-xs"></text>
            </view>
            <view :class="['max-w-[85%] rounded-2xl px-3 py-2 text-sm', msg.role === 'user' ? 'bg-primary text-white' : 'bg-secondary text-foreground']">
              <text class="whitespace-pre-line">{{ msg.content }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="px-4 py-2 flex gap-2 overflow-x-auto border-t border-border shrink-0">
          <view v-for="q in quickQuestions" :key="q" class="shrink-0 px-3 py-1.5 bg-secondary rounded-full text-xs text-ink-soft" @click="aiInput = q">
            {{ q }}
          </view>
        </view>
        <view class="p-4 border-t border-border shrink-0">
          <view class="flex gap-2">
            <input v-model="aiInput" placeholder="问我任何关于本书的问题..." class="flex-1 h-10 px-4 bg-secondary rounded-full text-sm text-foreground outline-none" @confirm="sendAIMessage" />
            <view class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center" @click="sendAIMessage">
              <text></text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 核心阅读区 -->
    <scroll-view
      scroll-y
      :class="['flex-1 px-4 max-w-3xl mx-auto w-full', showHeader ? 'pt-24' : 'pt-8']"
      :style="{ fontSize: fontSize + 'px', lineHeight: lineHeight, color: themeTextColor }"
      @click="onContentClick"
    >
      <text class="text-xl font-bold mb-6 text-center block" :class="headingColor">卷一·论五行生克</text>
      <text v-for="(p, idx) in paragraphs" :key="idx" class="block mb-4 text-justify indent-8" :class="themeTextColor">{{ p }}</text>

      <!-- AI白话翻译 -->
      <view v-if="showTranslation" class="mt-8 p-4 bg-secondary/50 rounded-lg border border-border">
        <view class="flex items-center justify-between mb-3">
          <view class="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">AI白话翻译</view>
          <view class="w-7 h-7 flex items-center justify-center" @click="showTranslation = false">
            <text class="text-sm text-muted-foreground">✕</text>
          </view>
        </view>
        <text class="text-sm text-muted-foreground leading-relaxed">所谓五行，就是金、木、水、火、土这五种基本元素。它们相互生成的规律是：金生水，水生木，木生火，火生土，土生金。它们相互克制的规律是：金克木，木克土，土克水，水克火，火克金。</text>
      </view>
    </scroll-view>

    <!-- AI辅助工具浮动按钮 -->
    <view :class="['fixed bottom-24 right-4 w-12 h-12 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center z-40', showAITools ? 'rotate-45' : '']" @click="showAITools = !showAITools">
      <text class="text-xl"></text>
    </view>

    <!-- AI工具面板 -->
    <view v-if="showAITools" class="fixed bottom-40 right-4 z-50 bg-white border border-border rounded-xl shadow-xl p-3 w-48">
      <view class="grid grid-cols-2 gap-2">
        <view v-for="tool in aiTools" :key="tool.label" class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg" @click="tool.action">
          <text class="text-xl">{{ tool.icon }}</text>
          <text class="text-xs text-foreground">{{ tool.label }}</text>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <view class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-border">
      <view class="flex items-center justify-around h-14">
        <view :class="['flex flex-col items-center gap-0.5 p-2', showChapters ? 'text-primary' : 'text-muted-foreground']" @click="togglePanel('chapters')">
          <text class="text-xl"></text>
          <text class="text-[10px]">目录</text>
        </view>
        <view :class="['flex flex-col items-center gap-0.5 p-2', showBookmarks ? 'text-primary' : 'text-muted-foreground']" @click="togglePanel('bookmarks')">
          <text class="text-xl">🔖</text>
          <text class="text-[10px]">书签</text>
        </view>
        <view :class="['flex flex-col items-center gap-0.5 p-2', showNotes ? 'text-primary' : 'text-muted-foreground']" @click="togglePanel('notes')">
          <text class="text-xl">✏️</text>
          <text class="text-[10px]">笔记</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 p-2 text-muted-foreground" @click="theme = theme === 'dark' ? 'paper' : 'dark'">
          <text class="text-xl">{{ theme === 'dark' ? '️' : '' }}</text>
          <text class="text-[10px]">{{ theme === 'dark' ? '日间' : '夜间' }}</text>
        </view>
        <view :class="['flex flex-col items-center gap-0.5 p-2', showSettings ? 'text-primary' : 'text-muted-foreground']" @click="togglePanel('settings')">
          <text class="text-xl">⚙️</text>
          <text class="text-[10px]">设置</text>
        </view>
      </view>
    </view>

    <!-- 章节目录面板 -->
    <view v-if="showChapters" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border" style="max-height: 60vh">
      <scroll-view scroll-y class="p-4" style="max-height: 60vh">
        <text class="font-medium text-foreground block mb-3">章节目录</text>
        <view v-for="ch in book.chapters" :key="ch.id"
          :class="['w-full text-left px-3 py-2.5 rounded-lg text-sm', ch.current ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground']"
          @click="selectChapter(ch)"
        >
          <text>{{ ch.title }}</text>
          <view v-if="ch.current" class="ml-2 px-1.5 py-0 bg-primary/10 text-primary text-[10px] rounded inline">当前</view>
        </view>
      </scroll-view>
    </view>

    <!-- 书签面板 -->
    <view v-if="showBookmarks" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border" style="max-height: 60vh">
      <scroll-view scroll-y class="p-4" style="max-height: 60vh">
        <text class="font-medium text-foreground block mb-3">我的书签</text>
        <view v-if="savedBookmarks.length > 0" class="space-y-2">
          <view v-for="bm in savedBookmarks" :key="bm.id" class="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
            <text class="text-primary mt-0.5">🔖</text>
            <view class="flex-1">
              <text class="text-sm font-medium text-foreground block">{{ bm.chapter }}</text>
              <text class="text-xs text-muted-foreground">{{ bm.position }}</text>
              <text v-if="bm.note" class="text-xs text-accent mt-1 block">{{ bm.note }}</text>
            </view>
          </view>
        </view>
        <text v-else class="text-sm text-muted-foreground text-center py-8 block">暂无书签</text>
      </scroll-view>
    </view>

    <!-- 笔记面板 -->
    <view v-if="showNotes" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border" style="max-height: 60vh">
      <scroll-view scroll-y class="p-4" style="max-height: 60vh">
        <text class="font-medium text-foreground block mb-3">划线与笔记</text>
        <view v-if="savedNotes.length > 0" class="space-y-2">
          <view v-for="n in savedNotes" :key="n.id" class="p-3 rounded-lg bg-secondary/50">
            <text :class="['text-sm font-medium px-1 rounded inline-block', n.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700']">{{ n.text }}</text>
            <text class="text-xs text-muted-foreground mt-2 block">{{ n.note }}</text>
          </view>
        </view>
        <text v-else class="text-sm text-muted-foreground text-center py-8 block">暂无笔记</text>
      </scroll-view>
    </view>

    <!-- 设置面板 -->
    <view v-if="showSettings" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border">
      <view class="p-4 space-y-5">
        <!-- 背景主题 -->
        <view>
          <text class="text-xs text-muted-foreground mb-2 block">背景主题</text>
          <view class="flex gap-2">
            <view v-for="t in themes" :key="t.id"
              :class="['flex-1 py-2 rounded-lg text-sm font-medium text-center', t.bgClass, t.textClass, theme === t.id ? 'ring-2 ring-primary' : 'opacity-70']"
              @click="theme = t.id"
            >{{ t.name }}</view>
          </view>
        </view>
        <!-- 字号 -->
        <view>
          <text class="text-xs text-muted-foreground mb-2 block">字号</text>
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded border border-border flex items-center justify-center text-sm" @click="fontSize = Math.max(14, fontSize - 2)">−</view>
            <view class="flex-1 h-2 bg-[#F0EDE8] rounded-full relative">
              <view class="absolute left-0 top-0 h-full bg-primary rounded-full" :style="{ width: ((fontSize - 14) / 12) * 100 + '%' }" />
            </view>
            <view class="w-8 h-8 rounded border border-border flex items-center justify-center text-sm" @click="fontSize = Math.min(26, fontSize + 2)">+</view>
            <text class="text-sm text-muted-foreground w-8">{{ fontSize }}</text>
          </view>
        </view>
        <!-- 行距 -->
        <view>
          <text class="text-xs text-muted-foreground mb-2 block">行距</text>
          <view class="flex gap-2">
            <view v-for="h in [1.5, 1.8, 2, 2.2]" :key="h"
              :class="['flex-1 py-2 rounded-lg text-sm text-center border', lineHeight === h ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground']"
              @click="lineHeight = h"
            >{{ h }}</view>
          </view>
        </view>
        <!-- 竖排 -->
        <view class="flex items-center justify-between">
          <text class="text-sm text-foreground">竖排阅读</text>
          <view :class="['w-12 h-6 rounded-full relative transition-colors', isVertical ? 'bg-primary' : 'bg-[#F0EDE8]']" @click="isVertical = !isVertical">
            <view :class="['absolute top-1 w-4 h-4 bg-white rounded-full transition-transform', isVertical ? 'right-1' : 'left-1']" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

type ThemeType = 'paper' | 'sepia' | 'dark' | 'green'

const showHeader = ref(true)
const showAudioPlayer = ref(false)
const showAIChat = ref(false)
const showAITools = ref(false)
const showChapters = ref(false)
const showBookmarks = ref(false)
const showNotes = ref(false)
const showSettings = ref(false)
const showTranslation = ref(false)
const isPlaying = ref(false)
const isVertical = ref(false)
const playbackSpeed = ref(1)
const theme = ref<ThemeType>('paper')
const fontSize = ref(18)
const lineHeight = ref(2)
const progress = ref(12)
const aiInput = ref('')

const themes = [
  { id: 'paper' as ThemeType, name: '宣纸', bgClass: 'bg-background', textClass: 'text-foreground' },
  { id: 'sepia' as ThemeType, name: '羊皮', bgClass: 'bg-[#F5E6C8]', textClass: 'text-amber-900' },
  { id: 'dark' as ThemeType, name: '夜间', bgClass: 'bg-[#1a1a2e]', textClass: 'text-stone-300' },
  { id: 'green' as ThemeType, name: '护眼', bgClass: 'bg-[#C8E6C9]', textClass: 'text-emerald-900' },
]

const themeBgMap: Record<ThemeType, string> = {
  paper: 'bg-background', sepia: 'bg-[#F5E6C8]', dark: 'bg-[#1a1a2e]', green: 'bg-[#C8E6C9]',
}
const themeTextMap: Record<ThemeType, string> = {
  paper: 'text-foreground', sepia: 'text-amber-900', dark: 'text-stone-300', green: 'text-emerald-900',
}

const themeBg = computed(() => themeBgMap[theme.value])
const themeTextColor = computed(() => {
  const m: Record<string, string> = { paper: '#2C2C2C', sepia: '#78350f', dark: '#d6d3d1', green: '#064e3b' }
  return m[theme.value] || '#2C2C2C'
})
const headingColor = computed(() => theme.value === 'dark' ? 'text-accent' : 'text-primary')

const quickQuestions = ['翻译本章', '解释五行', '总结要点', '提出问题']

const aiTools = [
  { icon: '', label: '文白翻译', action: () => { showTranslation.value = true; showAITools.value = false } },
  { icon: '', label: '智能查词', action: () => { showAITools.value = false } },
  { icon: '', label: '一键句读', action: () => { showAITools.value = false } },
  { icon: '', label: '人物图谱', action: () => { showAITools.value = false } },
  { icon: '', label: 'AI听书', action: () => { showAudioPlayer.value = true; showAITools.value = false } },
]

const aiMessages = ref([
  { role: 'ai' as const, content: '你好！我是古籍智能助手。我可以帮你解读本书内容，回答关于原文的问题，也可以为你提供白话翻译。请问有什么可以帮助你的？' },
])

const book = ref({
  title: '渊海子平', author: '徐子平',
  chapters: [
    { id: 1, title: '卷一·论五行生克', current: true },
    { id: 2, title: '卷一·论天干地支' },
    { id: 3, title: '卷二·论十神' },
    { id: 4, title: '卷二·论格局' },
    { id: 5, title: '卷三·论用神' },
    { id: 6, title: '卷三·论大运流年' },
    { id: 7, title: '卷四·论合化' },
    { id: 8, title: '卷四·论刑冲破害' },
  ],
})

const savedBookmarks = ref([
  { id: 1, chapter: '卷一·论五行生克', position: '第3段', note: '重要概念' },
  { id: 2, chapter: '卷二·论十神', position: '第1段', note: '' },
])

const savedNotes = ref([
  { id: 1, text: '金居西方，其性刚', note: '金的基本属性', color: 'yellow' },
  { id: 2, text: '以日干为主', note: '推命核心法则', color: 'green' },
])

const paragraphs = ref<string[]>([])

onMounted(() => {
  paragraphs.value = [
    '夫五行者，金木水火土也。其相生也，金生水，水生木，木生火，火生土，土生金。其相克也，金克木，木克土，土克水，水克火，火克金。',
    '盖闻天地之道，阴阳五行而已。五行之中，各有阴阳。阳者刚也，阴者柔也。刚柔相济，阴阳相配，然后和而成物。',
    '论曰：金居西方，其性刚，其情烈，其味辛，其色白。木居东方，其性仁，其情直，其味酸，其色青。水居北方，其性智，其情善，其味咸，其色黑。火居南方，其性礼，其情急，其味苦，其色赤。土居中央，其性信，其情厚，其味甘，其色黄。',
    '五行各有所主：甲乙东方木，丙丁南方火，戊己中央土，庚辛西方金，壬癸北方水。寅卯东方木，巳午南方火，申酉西方金，亥子北方水，辰戌丑未四季土。',
    '凡推命之法，以日干为主。年为本，月为提纲，日为身，时为归结。以月令定格局，以日干论强弱。强者宜抑，弱者宜扶。抑之不过，扶之不及，是以中和为贵也。',
    '古人云：得时俱为旺论，失令便作衰看。又云：旺者宜泄宜克，衰者喜生喜扶。此不易之理也。',
    '然有旺而不旺者，衰而不衰者，不可以一概而论。盖五行之气，有进有退，有虚有实。进者方长，退者将消；实者充盈，虚者空乏。是以论命之道，贵乎活看，不可执一而论也。',
  ]
})

function sendAIMessage() {
  if (!aiInput.value.trim()) return
  aiMessages.value.push({ role: 'user', content: aiInput.value })
  setTimeout(() => {
    let reply = '这是一个很好的问题！'
    if (aiInput.value.includes('翻译') || aiInput.value.includes('白话')) {
      reply = '【白话翻译】\n\n所谓五行，就是金、木、水、火、土这五种基本元素。它们相互生成的规律是：金生水，水生木，木生火，火生土，土生金。它们相互克制的规律是：金克木，木克土，土克水，水克火，火克金。\n\n天地之间的道理，不过是阴阳五行而已。五行之中，各有阴阳之分。阳者刚强，阴者柔顺。刚柔相济，阴阳相配，然后才能和谐而成就万物。'
    } else if (aiInput.value.includes('五行')) {
      reply = '【五行解读】\n\n五行是中国古代哲学的核心概念之一，指金、木、水、火、土五种基本物质或能量。\n\n在命理学中，五行各有其性质特点：\n• 金：性刚、情烈、味辛、色白，居西方\n• 木：性仁、情直、味酸、色青，居东方\n• 水：性智、情善、味咸、色黑，居北方\n• 火：性礼、情急、味苦、色赤，居南方\n• 土：性信、情厚、味甘、色黄，居中央\n\n五行相生相克，构成了宇宙万物变化的基本规律。'
    }
    aiMessages.value.push({ role: 'ai', content: reply })
  }, 800)
  aiInput.value = ''
}

function togglePanel(panel: string) {
  showChapters.value = panel === 'chapters' ? !showChapters.value : false
  showBookmarks.value = panel === 'bookmarks' ? !showBookmarks.value : false
  showNotes.value = panel === 'notes' ? !showNotes.value : false
  showSettings.value = panel === 'settings' ? !showSettings.value : false
}

function selectChapter(ch: any) {
  ch.current = true
  showChapters.value = false
}

function onContentClick() {
  showHeader.value = !showHeader.value
}

function toggleBookmark() {
  uni.showToast({ title: '已添加书签', icon: 'none' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
