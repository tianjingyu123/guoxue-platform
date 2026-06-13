<template>
  <view class="min-h-screen flex flex-col" :class="currentThemeBg">
    <!-- 顶部信息栏 -->
    <header v-if="showHeader" class="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3" style="padding-top: env(safe-area-inset-top, 0px)">
      <view class="max-w-3xl mx-auto flex items-center justify-between">
        <view class="flex items-center gap-3">
          <view class="w-9 h-9 flex items-center justify-center" @click="goBack">
            <text class="text-xl text-foreground">←</text>
          </view>
          <view>
            <text class="font-serif font-medium text-foreground text-base">{{ bookContent.title }}</text>
            <text class="text-xs text-muted-foreground block">阅读进度 {{ progress }}%</text>
          </view>
        </view>
        <view class="flex items-center gap-1">
          <view class="w-9 h-9 flex items-center justify-center" :class="showAudioPlayer ? 'text-primary' : ''" @click.stop="showAudioPlayer = !showAudioPlayer">
            <text class="text-lg"></text>
          </view>
          <view class="w-9 h-9 flex items-center justify-center" :class="showAIChat ? 'text-[#a855f7]' : ''" @click.stop="showAIChat = !showAIChat">
            <text class="text-lg"></text>
          </view>
          <view class="w-9 h-9 flex items-center justify-center">
            <text class="text-lg">🔖</text>
          </view>
        </view>
      </view>
    </header>

    <!-- 听书播放器 -->
    <view v-if="showAudioPlayer" class="fixed top-[60px] left-0 right-0 z-40" style="background-image: linear-gradient(to right, #d97706, #ea580c); padding-top: env(safe-area-inset-top, 0px)">
      <view class="text-white px-4 py-3 shadow-lg">
        <view class="max-w-3xl mx-auto">
          <view class="flex items-center gap-3">
            <view class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0" @click="isPlaying = !isPlaying">
              <text class="text-2xl">{{ isPlaying ? '⏸️' : '▶️' }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-xs font-medium block truncate mb-1">卷一·论五行生克</text>
              <view class="flex items-center gap-2">
                <text class="text-[10px] opacity-80">02:34</text>
                <view class="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <view class="h-full w-1/3 bg-white rounded-full" />
                </view>
                <text class="text-[10px] opacity-80">08:15</text>
              </view>
            </view>
            <view class="px-2 py-1 text-xs bg-white/20 rounded flex-shrink-0" @click="cyclePlaybackSpeed">
              <text>{{ playbackSpeed }}x</text>
            </view>
            <view class="p-1 flex-shrink-0" @click="showAudioPlayer = false">
              <text class="text-lg">✕</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- AI智能助手对话 -->
    <view v-if="showAIChat" class="fixed inset-0 z-50 bg-black/50" @click="showAIChat = false">
      <view class="absolute bottom-0 left-0 right-0 h-[70vh] bg-white rounded-t-2xl flex flex-col" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view class="flex items-center gap-2">
            <view class="w-8 h-8 rounded-full flex items-center justify-center" style="background-image: linear-gradient(to bottom right, #a855f7, #7c3aed)">
              <text class="text-white text-sm"></text>
            </view>
            <view>
              <text class="font-medium text-sm text-foreground">古籍智能助手</text>
              <text class="text-[10px] text-muted-foreground block">AI解读 · 白话翻译 · 智能问答</text>
            </view>
          </view>
          <view @click="showAIChat = false">
            <text class="text-lg">✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="flex-1 p-4 space-y-3">
          <view v-for="(msg, idx) in aiMessages" :key="idx" class="flex gap-2" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
            <view v-if="msg.role === 'ai'" class="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style="background-image: linear-gradient(to bottom right, #a855f7, #7c3aed)">
              <text class="text-white text-xs"></text>
            </view>
            <view class="max-w-[85%] rounded-2xl px-3 py-2 text-sm" :class="msg.role === 'user' ? 'bg-primary text-white' : 'bg-secondary'">
              <text style="white-space: pre-line">{{ msg.content }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="px-4 py-2 flex gap-2 overflow-x-auto border-t border-border" style="overflow-x: auto; flex-wrap: nowrap">
          <view v-for="q in quickQuestions" :key="q" class="flex-shrink-0 px-3 py-1.5 bg-secondary rounded-full text-xs" @click="aiInput = q">
            <text>{{ q }}</text>
          </view>
        </view>
        <view class="p-4 border-t border-border">
          <view class="flex gap-2">
            <input
              v-model="aiInput"
              type="text"
              placeholder="问我任何关于本书的问题..."
              class="flex-1 h-10 px-4 bg-secondary rounded-full text-sm"
              @confirm="sendAIMessage"
            />
            <view class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center" @click="sendAIMessage">
              <text class="text-sm"></text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 核心阅读区 -->
    <main
      class="flex-1 px-4 md:px-8 max-w-3xl mx-auto w-full"
      :class="[showHeader ? 'pt-24' : 'pt-8', isVertical ? 'h-screen overflow-x-auto' : '']"
      @click="toggleHeader"
      @mouseup="handleTextSelect"
    >
      <article
        class="font-serif leading-relaxed"
        :class="[currentThemeText, isVertical ? '[writing-mode:vertical-rl] [text-orientation:mixed] h-full' : '']"
        :style="{ fontSize: fontSize + 'px', lineHeight: lineHeight }"
      >
        <text class="text-xl font-bold mb-6 text-center block">卷一·论五行生克</text>
        <view v-for="(paragraph, index) in paragraphs" :key="index" class="mb-4 text-justify [text-indent:2em]">
          <text>{{ paragraph }}</text>
        </view>
      </article>

      <!-- 文白对照翻译 -->
      <view v-if="showTranslation" class="mt-8 p-4 bg-secondary/50 rounded-lg border border-border">
        <view class="flex items-center justify-between mb-3">
          <view class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
            <text>AI白话翻译</text>
          </view>
          <view class="w-7 h-7 flex items-center justify-center" @click="showTranslation = false">
            <text class="text-sm">✕</text>
          </view>
        </view>
        <text class="text-sm text-muted-foreground leading-relaxed">
          所谓五行，就是金、木、水、火、土这五种基本元素。它们相互生成的规律是：金生水，水生木，木生火，火生土，土生金。它们相互克制的规律是：金克木，木克土，土克水，水克火，火克金。
        </text>
      </view>
    </main>

    <!-- 选中文字菜单 -->
    <view v-if="showTextMenu && selectedText" class="fixed top-1/3 left-1/2 z-50 bg-white border border-border rounded-xl shadow-xl p-2 flex items-center gap-1" style="transform: translateX(-50%)">
      <view class="h-9 px-3 flex items-center gap-2" @click="showTextMenu = false">
        <text class="text-[#eab308] text-sm">🖍️</text>
        <text class="text-xs">划线</text>
      </view>
      <view class="h-9 px-3 flex items-center gap-2" @click="showTextMenu = false">
        <text class="text-primary text-sm">✏️</text>
        <text class="text-xs">笔记</text>
      </view>
      <view class="h-9 px-3 flex items-center gap-2" @click="showTextMenu = false">
        <text class="text-accent text-sm"></text>
        <text class="text-xs">查词</text>
      </view>
      <view class="h-9 px-3 flex items-center gap-2" @click="showTextMenu = false">
        <text class="text-[#60a5fa] text-sm"></text>
        <text class="text-xs">翻译</text>
      </view>
      <view class="h-9 px-3 flex items-center gap-2" @click="showTextMenu = false">
        <text class="text-sm"></text>
        <text class="text-xs">复制</text>
      </view>
      <view class="w-7 h-7 flex items-center justify-center ml-1" @click="showTextMenu = false; selectedText = ''">
        <text class="text-sm">✕</text>
      </view>
    </view>

    <!-- AI辅助工具按钮 -->
    <view
      class="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-primary text-white shadow-lg z-40 flex items-center justify-center"
      style="box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3)"
      @click.stop="showAITools = !showAITools"
    >
      <text class="text-lg"></text>
    </view>

    <!-- AI工具面板 -->
    <view v-if="showAITools" class="fixed bottom-40 right-4 z-50 bg-white border border-border rounded-xl shadow-xl p-3 w-48">
      <view class="grid grid-cols-2 gap-2">
        <view
          v-for="tool in aiTools"
          :key="tool.label"
          class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg"
          hover-class="bg-secondary"
          @click="handleAIToolClick(tool)"
        >
          <text class="text-lg text-primary">{{ tool.icon }}</text>
          <text class="text-xs text-foreground">{{ tool.label }}</text>
        </view>
      </view>
    </view>

    <!-- 底部菜单栏 -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-border" style="padding-bottom: env(safe-area-inset-bottom, 0px)">
      <view class="max-w-3xl mx-auto flex items-center justify-around h-14">
        <view class="flex flex-col items-center gap-0.5 p-2" :class="showChapters ? 'text-primary' : ''" @click.stop="openChapters">
          <text class="text-lg"></text>
          <text class="text-[10px]">目录</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 p-2" :class="showBookmarks ? 'text-primary' : ''" @click.stop="openBookmarks">
          <text class="text-lg">🔖</text>
          <text class="text-[10px]">书签</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 p-2" :class="showNotes ? 'text-primary' : ''" @click.stop="openNotes">
          <text class="text-lg">✏️</text>
          <text class="text-[10px]">笔记</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 p-2" @click.stop="toggleTheme">
          <text class="text-lg">{{ theme === 'dark' ? '️' : '' }}</text>
          <text class="text-[10px]">{{ theme === 'dark' ? '日间' : '夜间' }}</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 p-2" :class="showSettings ? 'text-primary' : ''" @click.stop="openSettings">
          <text class="text-lg">⚙️</text>
          <text class="text-[10px]">设置</text>
        </view>
      </view>
    </nav>

    <!-- 章节目录面板 -->
    <view v-if="showChapters" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border max-h-[60vh] overflow-y-auto" style="padding-bottom: env(safe-area-inset-bottom, 0px)">
      <view class="max-w-3xl mx-auto p-4">
        <text class="font-medium text-foreground block mb-3">章节目录</text>
        <view class="space-y-1">
          <view
            v-for="chapter in bookContent.chapters"
            :key="chapter.id"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm"
            :class="chapter.current ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'"
            hover-class="bg-secondary"
          >
            <text>{{ chapter.title }}</text>
            <text v-if="chapter.current" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary ml-2">当前</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 书签面板 -->
    <view v-if="showBookmarks" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border max-h-[60vh] overflow-y-auto" style="padding-bottom: env(safe-area-inset-bottom, 0px)">
      <view class="max-w-3xl mx-auto p-4">
        <text class="font-medium text-foreground block mb-3">我的书签</text>
        <view v-if="bookmarks.length > 0" class="space-y-2">
          <view v-for="bookmark in bookmarks" :key="bookmark.id" class="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
            <text class="text-primary text-sm mt-0.5">🔖</text>
            <view class="flex-1">
              <text class="text-sm font-medium text-foreground block">{{ bookmark.chapter }}</text>
              <text class="text-xs text-muted-foreground block">{{ bookmark.position }}</text>
              <text v-if="bookmark.note" class="text-xs text-accent block mt-1">{{ bookmark.note }}</text>
            </view>
          </view>
        </view>
        <view v-else>
          <text class="text-sm text-muted-foreground block text-center py-8">暂无书签</text>
        </view>
      </view>
    </view>

    <!-- 笔记面板 -->
    <view v-if="showNotes" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border max-h-[60vh] overflow-y-auto" style="padding-bottom: env(safe-area-inset-bottom, 0px)">
      <view class="max-w-3xl mx-auto p-4">
        <text class="font-medium text-foreground block mb-3">划线与笔记</text>
        <view v-if="notes.length > 0" class="space-y-2">
          <view v-for="note in notes" :key="note.id" class="p-3 rounded-lg bg-secondary/50">
            <text
              class="text-sm font-medium px-1 rounded inline"
              :class="note.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-green-500/20 text-green-200'"
            >
              {{ note.text }}
            </text>
            <text class="text-xs text-muted-foreground block mt-2">{{ note.note }}</text>
          </view>
        </view>
        <view v-else>
          <text class="text-sm text-muted-foreground block text-center py-8">暂无笔记</text>
        </view>
      </view>
    </view>

    <!-- 设置面板 -->
    <view v-if="showSettings" class="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-border" style="padding-bottom: env(safe-area-inset-bottom, 0px)">
      <view class="max-w-3xl mx-auto p-4 space-y-5">
        <!-- 背景主题 -->
        <view>
          <text class="text-xs text-muted-foreground block mb-2">背景主题</text>
          <view class="flex gap-2">
            <view
              v-for="t in themes"
              :key="t.id"
              class="flex-1 py-2 rounded-lg text-sm font-medium text-center"
              :class="[t.bg, t.text, theme === t.id ? 'ring-2 ring-primary' : 'opacity-70']"
              @click="theme = t.id"
            >
              <text>{{ t.name }}</text>
            </view>
          </view>
        </view>

        <!-- 字号 -->
        <view>
          <text class="text-xs text-muted-foreground block mb-2">字号</text>
          <view class="flex items-center gap-3">
            <view class="w-9 h-9 rounded-lg border border-border flex items-center justify-center" @click="fontSize = Math.max(14, fontSize - 2)">
              <text class="text-sm">➖</text>
            </view>
            <view class="flex-1 h-2 bg-secondary rounded-full relative">
              <view
                class="absolute left-0 top-0 h-full bg-primary rounded-full"
                :style="{ width: ((fontSize - 14) / 12 * 100) + '%' }"
              />
            </view>
            <view class="w-9 h-9 rounded-lg border border-border flex items-center justify-center" @click="fontSize = Math.min(26, fontSize + 2)">
              <text class="text-sm">➕</text>
            </view>
            <text class="text-sm text-muted-foreground w-8 text-center">{{ fontSize }}</text>
          </view>
        </view>

        <!-- 行距 -->
        <view>
          <text class="text-xs text-muted-foreground block mb-2">行距</text>
          <view class="flex gap-2">
            <view
              v-for="h in lineHeights"
              :key="h"
              class="flex-1 py-2 rounded-lg text-sm text-center border"
              :class="lineHeight === h ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'"
              @click="lineHeight = h"
            >
              <text>{{ h }}</text>
            </view>
          </view>
        </view>

        <!-- 竖排 -->
        <view class="flex items-center justify-between">
          <text class="text-sm text-foreground">竖排阅读</text>
          <view
            class="w-12 h-6 rounded-full relative"
            :class="isVertical ? 'bg-primary' : 'bg-secondary'"
            @click="isVertical = !isVertical"
          >
            <view
              class="absolute top-1 w-4 h-4 bg-white rounded-full"
              :class="isVertical ? 'right-1' : 'left-1'"
              style="transition: all 0.2s"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

interface ThemeType {
  id: string
  name: string
  bg: string
  text: string
}

interface AiMessage {
  role: 'user' | 'ai'
  content: string
}

interface Chapter {
  id: number
  title: string
  current?: boolean
}

interface Bookmark {
  id: number
  chapter: string
  position: string
  note: string
}

interface Note {
  id: number
  text: string
  note: string
  color: string
}

interface AiTool {
  icon: string
  label: string
  action?: () => void
}

const bookContent = {
  id: 1,
  title: '渊海子平',
  author: '徐子平',
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
  content: `夫五行者，金木水火土也。其相生也，金生水，水生木，木生火，火生土，土生金。其相克也，金克木，木克土，土克水，水克火，火克金。

盖闻天地之道，阴阳五行而已。五行之中，各有阴阳。阳者刚也，阴者柔也。刚柔相济，阴阳相配，然后和而成物。

论曰：金居西方，其性刚，其情烈，其味辛，其色白。木居东方，其性仁，其情直，其味酸，其色青。水居北方，其性智，其情善，其味咸，其色黑。火居南方，其性礼，其情急，其味苦，其色赤。土居中央，其性信，其情厚，其味甘，其色黄。

五行各有所主：
甲乙东方木，丙丁南方火，戊己中央土，庚辛西方金，壬癸北方水。
寅卯东方木，巳午南方火，申酉西方金，亥子北方水，辰戌丑未四季土。

凡推命之法，以日干为主。年为本，月为提纲，日为身，时为归结。以月令定格局，以日干论强弱。强者宜抑，弱者宜扶。抑之不过，扶之不及，是以中和为贵也。

古人云：得时俱为旺论，失令便作衰看。又云：旺者宜泄宜克，衰者喜生喜扶。此不易之理也。

然有旺而不旺者，衰而不衰者，不可以一概而论。盖五行之气，有进有退，有虚有实。进者方长，退者将消；实者充盈，虚者空乏。是以论命之道，贵乎活看，不可执一而论也。`,
}

const themes: ThemeType[] = [
  { id: 'paper', name: '宣纸', bg: 'bg-background', text: 'text-foreground' },
  { id: 'sepia', name: '羊皮', bg: 'bg-[#F5E6D3]', text: 'text-[#92400E]' },
  { id: 'dark', name: '夜间', bg: 'bg-[#1a1a2e]', text: 'text-[#D6D3D1]' },
  { id: 'green', name: '护眼', bg: 'bg-[#E8F5E9]', text: 'text-[#064E3B]' },
]

const lineHeights = [1.5, 1.8, 2, 2.2]

const quickQuestions = ['翻译本章', '解释五行', '总结要点', '提出问题']

const aiTools: AiTool[] = [
  { icon: '', label: '文白翻译', action: () => { showTranslation.value = true } },
  { icon: '', label: '智能查词' },
  { icon: '🔤', label: '一键句读' },
  { icon: '', label: '人物图谱' },
  { icon: '', label: 'AI听书' },
]

const bookmarks: Bookmark[] = [
  { id: 1, chapter: '卷一·论五行生克', position: '第3段', note: '重要概念' },
  { id: 2, chapter: '卷二·论十神', position: '第1段', note: '' },
]

const notes: Note[] = [
  { id: 1, text: '金居西方，其性刚', note: '金的基本属性', color: 'yellow' },
  { id: 2, text: '以日干为主', note: '推命核心法则', color: 'green' },
]

const id = ref('')
const showHeader = ref(true)
const showMenu = ref(false)
const showChapters = ref(false)
const showSettings = ref(false)
const showAITools = ref(false)
const showBookmarks = ref(false)
const showNotes = ref(false)
const theme = ref('paper')
const fontSize = ref(18)
const lineHeight = ref(2)
const isVertical = ref(false)
const selectedText = ref('')
const showTextMenu = ref(false)
const showTranslation = ref(false)
const showAudioPlayer = ref(false)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
const showAIChat = ref(false)
const aiMessages = ref<AiMessage[]>([
  { role: 'ai', content: '你好！我是古籍智能助手。我可以帮你解读本书内容，回答关于原文的问题，也可以为你提供白话翻译。请问有什么可以帮助你的？' },
])
const aiInput = ref('')

const paragraphs = computed(() => {
  return bookContent.content.split('\n\n')
})

const currentThemeBg = computed(() => {
  const t = themes.find(t => t.id === theme.value)
  return t ? t.bg : themes[0].bg
})

const currentThemeText = computed(() => {
  const t = themes.find(t => t.id === theme.value)
  return t ? t.text : themes[0].text
})

const progress = computed(() => 12)

onLoad((options) => {
  if (options && options.id) {
    id.value = options.id as string
  }
})

function goBack() {
  uni.navigateBack()
}

function sendAIMessage() {
  if (!aiInput.value.trim()) return
  aiMessages.value = [...aiMessages.value, { role: 'user', content: aiInput.value }]
  setTimeout(() => {
    let reply = '这是一个很好的问题！'
    if (aiInput.value.includes('翻译') || aiInput.value.includes('白话')) {
      reply = '【白话翻译】\n\n所谓五行，就是金、木、水、火、土这五种基本元素。它们相互生成的规律是：金生水，水生木，木生火，火生土，土生金。它们相互克制的规律是：金克木，木克土，土克水，水克火，火克金。\n\n天地之间的道理，不过是阴阳五行而已。五行之中，各有阴阳之分。阳者刚强，阴者柔顺。刚柔相济，阴阳相配，然后才能和谐而成就万物。'
    } else if (aiInput.value.includes('五行')) {
      reply = '【五行解读】\n\n五行是中国古代哲学的核心概念之一，指金、木、水、火、土五种基本物质或能量。\n\n在命理学中，五行各有其性质特点：\n• 金：性刚、情烈、味辛、色白，居西方\n• 木：性仁、情直、味酸、色青，居东方\n• 水：性智、情善、味咸、色黑，居北方\n• 火：性礼、情急、味苦、色赤，居南方\n• 土：性信、情厚、味甘、色黄，居中央\n\n五行相生相克，构成了宇宙万物变化的基本规律。'
    } else {
      reply = '关于这个问题，《渊海子平》中提到：命理推演以日干为主，年柱为本，月柱为提纲，日柱为身，时柱为归结。\n\n推命的核心在于把握「中和」二字——强者宜抑，弱者宜扶，不可偏废。你还有什么想了解的吗？'
    }
    aiMessages.value = [...aiMessages.value, { role: 'ai', content: reply }]
  }, 800)
  aiInput.value = ''
}

function handleTextSelect() {
  // 在 UniApp WebView 中尝试获取选中文本
  // 实际移动端依赖平台能力，此处保留接口
}

function toggleHeader() {
  showHeader.value = !showHeader.value
  if (showMenu.value) showMenu.value = false
}

function cyclePlaybackSpeed() {
  playbackSpeed.value = playbackSpeed.value >= 2 ? 0.5 : playbackSpeed.value + 0.25
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'paper' : 'dark'
}

function openChapters() {
  showChapters.value = !showChapters.value
  showSettings.value = false
  showBookmarks.value = false
  showNotes.value = false
}

function openBookmarks() {
  showBookmarks.value = !showBookmarks.value
  showSettings.value = false
  showChapters.value = false
  showNotes.value = false
}

function openNotes() {
  showNotes.value = !showNotes.value
  showSettings.value = false
  showChapters.value = false
  showBookmarks.value = false
}

function openSettings() {
  showSettings.value = !showSettings.value
  showChapters.value = false
  showBookmarks.value = false
  showNotes.value = false
}

function handleAIToolClick(tool: AiTool) {
  if (tool.action) {
    tool.action()
  }
  showAITools.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slideDown {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
</style>
