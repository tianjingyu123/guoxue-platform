<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { classicsApi } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'
import AiThinking from '@/components/classics/ai-thinking.vue'

interface ChapterRef { id: string; title: string }

const bookId = ref('')
const bookTitle = ref('')
const bookMeta = ref('')
const chapters = ref<ChapterRef[]>([])
const curIndex = ref(0)
const sentences = ref<string[]>([])
const curSentence = ref(0)
const loading = ref(true)
const error = ref('')
const playing = ref(false)
const speed = ref(1)
const showChapters = ref(false)

// 后端 TTS 合成 + InnerAudioContext 播放（全端可用：小程序/App/H5/微信内置浏览器）。
// 病灶修复：原用浏览器 Web Speech(window.speechSynthesis)，移动端/微信 WebView 普遍不支持 → 真机听书点不了。
// 改由后端 /tts/synthesize 合成 mp3（腾讯云 TTS·失败回退 Edge），前端逐句播放音频。
const apiBase = ((import.meta as any).env?.VITE_API_URL || '') + '/api/v1'
const voiceType = 'yunxi' // 男声叙事，适合经典诵读
const ttsSupported = computed(() => true) // 后端合成，全端可用
const audio = uni.createInnerAudioContext()
let ended = false
audio.onEnded(() => {
  if (!playing.value || ended) return
  if (curSentence.value < sentences.value.length - 1) {
    curSentence.value++
    scrollToCurrent()
    speakCurrent()
  } else if (hasNext.value) {
    // 章末自动续读下一章
    loadChapter(curIndex.value + 1, true)
  } else {
    playing.value = false
  }
})
audio.onError(() => {
  if (!playing.value) return
  playing.value = false
  uni.showToast({ title: '朗读加载失败，请重试', icon: 'none' })
})

const curChapter = computed(() => chapters.value[curIndex.value] || null)
const hasPrev = computed(() => curIndex.value > 0)
const hasNext = computed(() => curIndex.value < chapters.value.length - 1)
const progress = computed(() =>
  sentences.value.length ? Math.round(((curSentence.value + 1) / sentences.value.length) * 100) : 0,
)

/** 章节正文切句（与阅读器一致：优先换行，否则按句读切） */
function splitSentences(text: string): string[] {
  if (!text) return []
  let parts = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) {
    parts = text.replace(/([。！？；])/g, '$1\n').split('\n').map((s) => s.trim()).filter(Boolean)
  }
  return parts
}

async function fetchBook(id: string) {
  loading.value = true
  error.value = ''
  try {
    const data = await classicsApi.detail(id)
    if (!data.book) throw new Error('书籍不存在')
    bookTitle.value = data.book.title
    bookMeta.value = [data.book.dynasty, data.book.author].filter(Boolean).join(' · ')
    chapters.value = (data.book.chapters || []).map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }))
    if (!chapters.value.length) throw new Error('本书暂无可朗读章节')
    await loadChapter(0, false)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadChapter(idx: number, autoPlay = false) {
  const ch = chapters.value[idx]
  if (!ch) return
  stop()
  curIndex.value = idx
  curSentence.value = 0
  selIndex.value = -1 // 换章后旧选中句已失效
  try {
    const data = await classicsApi.chapter(ch.id)
    sentences.value = splitSentences(data?.content || '')
  } catch {
    sentences.value = []
  }
  saveProgress()
  if (autoPlay && sentences.value.length) play()
}

// ── 朗读控制 ──
function speakCurrent() {
  if (curSentence.value >= sentences.value.length) { playing.value = false; return }
  const sentence = sentences.value[curSentence.value]
  if (!sentence) { playing.value = false; return }
  // 语速→rate 百分比（后端 Edge/腾讯云均按此解析）
  const rate = `${Math.round((speed.value - 1) * 100)}%`
  audio.src = `${apiBase}/tts/synthesize?text=${encodeURIComponent(sentence)}&voice=${voiceType}&rate=${encodeURIComponent(rate)}`
  audio.play()
}

function play() {
  if (!sentences.value.length) return
  ended = false
  playing.value = true
  speakCurrent()
  scrollToCurrent()
}
function pause() {
  playing.value = false
  audio.pause()
}
function stop() {
  playing.value = false
  ended = true
  audio.stop()
}
function togglePlay() {
  playing.value ? pause() : play()
}
function jumpSentence(i: number) {
  curSentence.value = Math.max(0, Math.min(i, sentences.value.length - 1))
  scrollToCurrent()
  if (playing.value) speakCurrent()
}
function prevSentence() { jumpSentence(curSentence.value - 1) }
function nextSentence() { jumpSentence(curSentence.value + 1) }
function changeSpeed() {
  speed.value = speed.value >= 2 ? 0.75 : +(speed.value + 0.25).toFixed(2)
  if (playing.value) speakCurrent()
}
function prevChapter() { if (hasPrev.value) loadChapter(curIndex.value - 1, playing.value) }
function nextChapter() { if (hasNext.value) loadChapter(curIndex.value + 1, playing.value) }
function pickChapter(idx: number) { showChapters.value = false; loadChapter(idx, true) }

function scrollToCurrent() {
  nextTick(() => { scrollIntoId.value = `s${curSentence.value}` })
}
const scrollIntoId = ref('')

// ── 正文点句 → AI 解读/白话翻译（对齐阅读器「点哪句解读哪句」·不打断朗读） ──
// X5 兼容：不用 window.getSelection 划词，句级点选即可覆盖「划线」诉求（阅读器同款点句模式）
const selIndex = ref(-1)
const selSentence = computed(() => (selIndex.value >= 0 ? sentences.value[selIndex.value] || '' : ''))

/** 点句=选中（再点同句=取消选中）；只改选中态，不动播放，TTS 继续朗读 */
function tapSentence(i: number) {
  selIndex.value = selIndex.value === i ? -1 : i
}
function clearSelection() { selIndex.value = -1 }

/** 原「点句跳读」能力保留：改由操作条显式触发，避免误触打断朗读 */
function playFromSelection() {
  const i = selIndex.value
  if (i < 0) return
  clearSelection()
  jumpSentence(i)
  if (!playing.value) play()
}

function saveProgress() {
  if (!getToken() || !curChapter.value) return
  classicsApi.saveProgress(bookId.value, curChapter.value.id, progress.value).catch(() => {})
}

function goBack() {
  stop()
  uni.navigateBack({ fail: () => uni.navigateTo({ url: '/pkg-classics/audiobooks/index' }) })
}

// ── AI 伴读（复用识典伴读 /classic/companion/chat·半屏抽屉·不打断播放） ──
interface AiMessage { id: string; role: 'user' | 'assistant'; content: string; disclaimer?: string }
const aiOpen = ref(false)
const aiMessages = ref<AiMessage[]>([])
const aiInput = ref('')
const aiLoading = ref(false)
const aiAnchor = ref('')
// 等待动态卡文案组：翻译走 translate 系，解读/自由问走 interpret 系
const aiThinkMode = ref<'translate' | 'interpret'>('interpret')
// 请求发起时刻：关抽屉重开时动态卡凭它续接进度（请求本身不因关抽屉中断）
const aiThinkStart = ref(0)

function openAi() {
  if (!curChapter.value) { uni.showToast({ title: '请先选择章节', icon: 'none' }); return }
  aiOpen.value = true // 打开面板不动播放状态：TTS 继续朗读
}

function trimForAsk(t: string, max = 120): string {
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/** 快捷问基准句：优先用户点选的句子，否则取当前正在朗读的句子 */
function focusSentenceIdx(): number {
  return selIndex.value >= 0 ? selIndex.value : curSentence.value
}

/** 快捷问①：这一句什么意思（优先选中句，否则当前朗读句） */
function askCurrentSentence() {
  const s = sentences.value[focusSentenceIdx()]
  if (!s) { uni.showToast({ title: '本章暂无可提问的句子', icon: 'none' }); return }
  sendAi(`「${trimForAsk(s)}」这一句是什么意思？`)
}
/** 快捷问②：本章讲了什么 */
function askChapterSummary() {
  sendAi('本章主要讲了什么？请用白话概括要点。')
}
/** 快捷问③：白话翻译当前段（基准句起连取三句） */
function askTranslateSegment() {
  const start = focusSentenceIdx()
  const seg = sentences.value.slice(start, start + 3).join('')
  if (!seg) { uni.showToast({ title: '本章暂无可翻译的内容', icon: 'none' }); return }
  sendAi(`请把这段原文翻译成白话文：「${trimForAsk(seg, 200)}」`)
}

// ── 选中句操作条动作（结果统一进伴读抽屉·保持一个 AI 出口） ──

/** 白话翻译选中句：复用阅读器同款结构化端点 POST /classic/translate（快·带字词注释），
 *  结果以助手气泡进伴读对话流，不另造第二套结果面板 */
async function translateSelection() {
  const s = selSentence.value
  if (!s || aiLoading.value) return
  if (!ensureAiLogin()) return
  aiOpen.value = true
  aiMessages.value.push({ id: `${Date.now()}`, role: 'user', content: `白话翻译这一句：「${trimForAsk(s, 200)}」` })
  aiThinkMode.value = 'translate'
  aiThinkStart.value = Date.now()
  aiLoading.value = true
  aiScrollBottom()
  try {
    const r = await classicsApi.translate(s, bookTitle.value)
    const parts = [`【白话译文】\n${r?.translation || '暂无翻译'}`]
    if (Array.isArray(r?.notes) && r.notes.length) parts.push(`【字词注释】\n${r.notes.map((n) => `· ${n}`).join('\n')}`)
    if (r?.source) parts.push(`【出处推测】${r.source}`)
    aiMessages.value.push({ id: `${Date.now() + 1}`, role: 'assistant', content: parts.join('\n\n') })
  } catch (e) {
    const msg = (e as Error)?.message || ''
    const friendly = msg.includes('已用完') || msg.includes('会员') || msg.includes('登录') ? msg : 'AI 翻译暂不可用，请稍后重试'
    aiMessages.value.push({ id: `${Date.now() + 1}`, role: 'assistant', content: friendly })
  } finally {
    aiLoading.value = false
    aiScrollBottom()
  }
}

/** AI 解读选中句：带章节上下文走伴读多轮对话（companionChat），气泡呈现 */
function interpretSelection() {
  const s = selSentence.value
  if (!s || aiLoading.value) return
  if (!ensureAiLogin()) return
  aiOpen.value = true
  sendAi(`请解读这一句的含义、背景与要点：「${trimForAsk(s, 200)}」`)
}

function ensureAiLogin(): boolean {
  if (getToken()) return true
  uni.showModal({
    title: '需要登录',
    content: '登录后即可使用 AI 伴读',
    confirmText: '去登录',
    success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
  })
  return false
}

function aiScrollBottom() {
  nextTick(() => { aiAnchor.value = ''; nextTick(() => { aiAnchor.value = 'ai-bottom' }) })
}

async function sendAi(text: string) {
  const q = text.trim()
  if (!q || aiLoading.value) return
  const ch = curChapter.value
  if (!ch) { uni.showToast({ title: '请先选择章节', icon: 'none' }); return }
  if (!ensureAiLogin()) return

  const history = aiMessages.value.map((m) => ({ role: m.role, content: m.content }))
  aiMessages.value.push({ id: `${Date.now()}`, role: 'user', content: q })
  aiInput.value = ''
  aiThinkMode.value = 'interpret'
  aiThinkStart.value = Date.now()
  aiLoading.value = true
  aiScrollBottom()
  try {
    const r = await classicsApi.companionChat(ch.id, q, history)
    aiMessages.value.push({
      id: `${Date.now() + 1}`,
      role: 'assistant',
      content: r?.answer || 'AI 伴读暂不可用，请稍后重试',
      disclaimer: r?.disclaimer,
    })
  } catch (e) {
    // 限次/会员类错误透出后端引导语，其余统一友好文案，不崩页
    const msg = (e as Error)?.message || ''
    const friendly = msg.includes('已用完') || msg.includes('会员') || msg.includes('登录')
      ? msg
      : 'AI 伴读暂不可用，请稍后重试'
    aiMessages.value.push({ id: `${Date.now() + 1}`, role: 'assistant', content: friendly })
  } finally {
    aiLoading.value = false
    aiScrollBottom()
  }
}
function sendAiInput() { sendAi(aiInput.value) }

onUnmounted(() => { stop(); audio.destroy() })

onLoad((q) => {
  bookId.value = String(q?.id || q?.bookId || '')
  if (!bookId.value) { error.value = '缺少书籍参数'; loading.value = false; return }
  fetchBook(bookId.value)
})
</script>

<template>
  <view class="ap-page">
    <!-- 顶栏 -->
    <view class="ap-header">
      <view class="ap-statusbar" />
      <view class="ap-header-inner">
        <view class="ap-circle-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#78350f" /></view>
        <text class="ap-header-title">听书 · AI 朗读</text>
        <view class="ap-circle-btn" @tap="showChapters = true"><app-icon name="list" :size="38" color="#78350f" /></view>
      </view>
    </view>

    <view v-if="loading" class="ap-state"><text class="ap-state-txt">加载中…</text></view>
    <view v-else-if="error" class="ap-state">
      <text class="ap-state-txt">{{ error }}</text>
      <view class="ap-retry" @tap="fetchBook(bookId)"><text>重试</text></view>
    </view>

    <template v-else>
      <!-- 书名 + 声波 -->
      <view class="ap-titlebox">
        <view class="ap-wave" :class="{ 'ap-wave--on': playing }">
          <view v-for="n in 5" :key="n" class="ap-wave-bar" :style="{ animationDelay: (n * 0.12) + 's' }" />
        </view>
        <text class="ap-title">{{ bookTitle }}</text>
        <text class="ap-sub">{{ bookMeta }} · AI 智能语音</text>
        <text class="ap-chapter">{{ curChapter?.title }}</text>
      </view>

      <!-- 跟读正文 -->
      <scroll-view scroll-y class="ap-text" :scroll-into-view="scrollIntoId" scroll-with-animation>
        <view v-if="!ttsSupported" class="ap-tip">当前环境不支持语音朗读，请在手机浏览器 / H5 中体验听书</view>
        <text
          v-for="(s, i) in sentences"
          :id="`s${i}`"
          :key="i"
          class="ap-sent"
          :class="{ 'ap-sent--on': i === curSentence, 'ap-sent--sel': i === selIndex }"
          @tap="tapSentence(i)"
        >{{ s }}</text>
        <view v-if="sentences.length" class="ap-hint">
          <app-icon name="sparkles" :size="26" color="#C9A96E" />
          <text class="ap-hint-txt">轻点任意句可白话翻译 / AI 解读，朗读不会中断</text>
        </view>
        <view v-if="!sentences.length" class="ap-tip">本章暂无可朗读内容</view>
      </scroll-view>

      <!-- 吸底播放控制条（悬浮常驻：长文滚到任何位置都能播放/暂停） -->
      <view class="ap-dock">
        <!-- 选中句操作条（点句浮现·白话翻译/AI 解读/从此句朗读·不打断当前播放） -->
        <view v-if="selIndex >= 0" class="ap-selbar">
          <text class="ap-selbar-txt">「{{ selSentence }}」</text>
          <view class="ap-selbar-acts">
            <view class="ap-selbar-btn ap-selbar-btn--main" @tap="translateSelection"><text class="ap-selbar-btn-txt ap-selbar-btn-txt--main">白话翻译</text></view>
            <view class="ap-selbar-btn ap-selbar-btn--main" @tap="interpretSelection"><text class="ap-selbar-btn-txt ap-selbar-btn-txt--main">AI 解读</text></view>
            <view class="ap-selbar-btn" @tap="playFromSelection"><text class="ap-selbar-btn-txt">从此句朗读</text></view>
            <view class="ap-selbar-close" @tap="clearSelection"><app-icon name="x" :size="30" color="#b0a89c" /></view>
          </view>
        </view>
        <view class="ap-progress">
          <view class="ap-progress-track"><view class="ap-progress-fill" :style="{ width: progress + '%' }" /></view>
          <view class="ap-progress-time">
            <text>{{ curSentence + 1 }} / {{ sentences.length }} 句</text>
            <text>第 {{ curIndex + 1 }} / {{ chapters.length }} 章</text>
          </view>
        </view>
        <view class="ap-controls">
          <view class="ap-speed" @tap="changeSpeed">{{ speed }}x</view>
          <view class="ap-ctrl" :class="{ 'ap-ctrl--off': curSentence === 0 && !hasPrev }" @tap="prevSentence">
            <app-icon name="chevron-left" :size="48" color="#78350f" />
          </view>
          <view class="ap-play" @tap="togglePlay">
            <app-icon :name="playing ? 'pause' : 'play'" :size="52" color="#ffffff" :fill="true" />
          </view>
          <view class="ap-ctrl" @tap="nextSentence"><app-icon name="chevron-right" :size="48" color="#78350f" /></view>
          <view class="ap-speed ap-chapnav" @tap="nextChapter" :class="{ 'ap-ctrl--off': !hasNext }">下章</view>
          <!-- AI 伴读入口（金色·打开半屏面板不打断播放） -->
          <view class="ap-ai-btn" @tap="openAi">
            <app-icon name="sparkles" :size="40" color="#C9A96E" />
            <text class="ap-ai-btn-txt">伴读</text>
          </view>
        </view>
      </view>
    </template>

    <!-- AI 伴读半屏抽屉（打开时 TTS 继续朗读·不打断播放） -->
    <view v-if="aiOpen" class="ap-mask ap-mask--ai" @tap="aiOpen = false">
      <view class="ai-sheet" @tap.stop>
        <view class="ai-head">
          <view class="ai-head-left">
            <view class="ai-avatar"><app-icon name="sparkles" :size="32" color="#ffffff" /></view>
            <view class="ai-head-titles">
              <text class="ai-head-title">AI 伴读</text>
              <text class="ai-head-sub">{{ curChapter?.title || bookTitle }}</text>
            </view>
          </view>
          <view class="ai-head-right">
            <!-- 可选暂停/继续：面板内也能控制朗读 -->
            <view class="ai-mini-play" @tap="togglePlay">
              <app-icon :name="playing ? 'pause' : 'play'" :size="28" color="#92400e" :fill="true" />
              <text class="ai-mini-play-txt">{{ playing ? '暂停朗读' : '继续朗读' }}</text>
            </view>
            <text class="ai-close" @tap="aiOpen = false">关闭</text>
          </view>
        </view>

        <!-- 顶部快捷问 -->
        <view class="ai-quick">
          <view class="ai-chip" @tap="askCurrentSentence"><text class="ai-chip-txt">这一句什么意思</text></view>
          <view class="ai-chip" @tap="askChapterSummary"><text class="ai-chip-txt">本章讲了什么</text></view>
          <view class="ai-chip" @tap="askTranslateSegment"><text class="ai-chip-txt">白话翻译当前段</text></view>
        </view>

        <!-- 对话流 -->
        <scroll-view scroll-y class="ai-body" :scroll-into-view="aiAnchor" scroll-with-animation>
          <view v-if="!aiMessages.length && !aiLoading" class="ai-empty">
            <text class="ai-empty-txt">边听边问：点上方快捷问题，或就本章内容向 AI 伴读自由提问，朗读不会中断。</text>
          </view>
          <view v-for="m in aiMessages" :key="m.id" class="ai-row" :class="{ 'ai-row--user': m.role === 'user' }">
            <view v-if="m.role === 'assistant'" class="ai-avatar ai-avatar--sm">
              <app-icon name="sparkles" :size="26" color="#ffffff" />
            </view>
            <view v-if="m.role === 'user'" class="ai-bubble-user"><text class="ai-bubble-user-txt">{{ m.content }}</text></view>
            <view v-else class="ai-bubble-assist">
              <text class="ai-bubble-assist-txt">{{ m.content }}</text>
              <text v-if="m.disclaimer" class="ai-disclaimer">{{ m.disclaimer }}</text>
            </view>
          </view>
          <!-- AI 研读中动态卡（阶段文案轮播+墨点晕开+伪进度·关抽屉不中断请求，回来结果已在对话流） -->
          <view v-if="aiLoading" class="ai-row">
            <view class="ai-avatar ai-avatar--sm"><app-icon name="sparkles" :size="26" color="#ffffff" /></view>
            <view class="ai-bubble-assist">
              <ai-thinking :mode="aiThinkMode" :since="aiThinkStart" />
            </view>
          </view>
          <view id="ai-bottom" class="ai-bottom-anchor" />
        </scroll-view>

        <!-- 自由输入 -->
        <view class="ai-input-bar">
          <input
            v-model="aiInput"
            class="ai-input"
            placeholder="就本章向 AI 伴读提问…"
            placeholder-class="ai-input-ph"
            :disabled="aiLoading"
            confirm-type="send"
            @confirm="sendAiInput"
          />
          <view class="ai-send" :class="{ 'ai-send--off': !aiInput.trim() || aiLoading }" @tap="sendAiInput">
            <app-icon name="send" :size="30" color="#ffffff" />
          </view>
        </view>
      </view>
    </view>

    <!-- 目录 -->
    <view v-if="showChapters" class="ap-mask" @tap="showChapters = false">
      <view class="ap-sheet" @tap.stop>
        <view class="ap-sheet-head">
          <text class="ap-sheet-title">目录 · 共 {{ chapters.length }} 章</text>
          <text class="ap-sheet-close" @tap="showChapters = false">关闭</text>
        </view>
        <scroll-view scroll-y class="ap-sheet-list">
          <view
            v-for="(ch, idx) in chapters"
            :key="ch.id"
            class="ap-sheet-item"
            :class="{ 'ap-sheet-item--on': idx === curIndex }"
            @tap="pickChapter(idx)"
          >
            <text class="ap-sheet-item-idx">{{ idx + 1 }}</text>
            <text class="ap-sheet-item-title" :class="{ 'ap-sheet-item-title--on': idx === curIndex }">{{ ch.title }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 页面锁定视口高：正文在 scroll-view 内滚动，控件不再被长文推出屏幕
   （病灶：原 min-height:100vh + scroll-view flex:1 在 H5 下不约束高度，
    整章正文把进度条/播放按钮顶到页面最底部，长文根本找不到按钮） */
.ap-page { height: 100vh; overflow: hidden; background: linear-gradient(to bottom, #f5f0e6, #faf8f5); display: flex; flex-direction: column; }
.ap-header { position: sticky; top: 0; z-index: 40; }
.ap-statusbar { height: var(--status-bar-height, 0px); }
.ap-header-inner { display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; height: 100rpx; }
.ap-circle-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; &:active { transform: scale(0.92); } }
.ap-header-title { font-family: var(--font-serif); font-size: 30rpx; font-weight: 700; color: #78350f; }
.ap-state { text-align: center; padding-top: 160rpx; }
.ap-state-txt { color: var(--muted-foreground); font-size: 28rpx; }
.ap-retry { margin-top: 24rpx; color: var(--brand); font-size: 28rpx; }

/* 书名 + 声波 */
.ap-titlebox { text-align: center; padding: 24rpx 48rpx 8rpx; }
.ap-wave { display: flex; align-items: flex-end; justify-content: center; gap: 8rpx; height: 56rpx; margin-bottom: 16rpx; }
.ap-wave-bar { width: 8rpx; height: 16rpx; border-radius: 999rpx; background: #d97706; }
.ap-wave--on .ap-wave-bar { animation: ap-wave 0.8s ease-in-out infinite; }
@keyframes ap-wave { 0%, 100% { height: 16rpx; } 50% { height: 48rpx; } }
.ap-title { display: block; font-family: var(--font-serif); font-size: 46rpx; font-weight: 700; color: #78350f; }
.ap-sub { display: block; font-size: 24rpx; color: var(--muted-foreground); margin-top: 8rpx; }
.ap-chapter { display: block; font-size: 28rpx; color: #92400e; margin-top: 16rpx; font-weight: 500; }

/* 跟读正文 */
.ap-text { flex: 1; height: 0; padding: 24rpx 48rpx 320rpx; min-height: 0; box-sizing: border-box; }
.ap-sent { display: inline; font-family: 'Songti SC', serif; font-size: 36rpx; line-height: 2.1; color: #5c5347; letter-spacing: 1rpx; }
.ap-sent--on { color: #78350f; font-weight: 700; background: rgba(217,119,6,0.14); border-radius: 6rpx; padding: 2rpx 4rpx; }
/* 点选选中态：金色浅底 + 左侧竖线（区别于当前朗读句的橙底高亮）·clone 让跨行的每段都有左标 */
.ap-sent--sel {
  background: var(--gold-soft, rgba(201, 169, 110, 0.22));
  border-left: 6rpx solid #C9A96E;
  border-radius: 6rpx;
  padding: 2rpx 4rpx 2rpx 10rpx;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.ap-tip { text-align: center; color: var(--muted-foreground); font-size: 26rpx; padding: 80rpx 0; }
/* 点句提示（正文末·阅读器同款引导） */
.ap-hint { display: flex; align-items: center; justify-content: center; gap: 10rpx; padding: 40rpx 0 20rpx; }
.ap-hint-txt { font-size: 22rpx; color: #b0a89c; }

/* 吸底控制条：悬浮常驻，滚动到任何位置都可见可操作 */
.ap-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  background: rgba(250, 248, 245, 0.97);
  border-top: 1rpx solid rgba(150, 130, 90, 0.18);
  box-shadow: 0 -6rpx 24rpx rgba(0, 0, 0, 0.06);
}

/* 选中句操作条（dock 顶部浮现·金色语系呼应伴读） */
.ap-selbar {
  padding: 18rpx 32rpx 4rpx;
  border-bottom: 1rpx solid rgba(201, 169, 110, 0.25);
  background: linear-gradient(to bottom, rgba(201, 169, 110, 0.10), transparent);
}
.ap-selbar-txt {
  display: block;
  font-family: 'Songti SC', serif;
  font-size: 25rpx;
  color: #78350f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ap-selbar-acts { display: flex; align-items: center; gap: 16rpx; margin-top: 14rpx; }
.ap-selbar-btn {
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 2rpx solid rgba(150, 130, 90, 0.25);
  &:active { transform: scale(0.95); }
}
.ap-selbar-btn--main {
  background: linear-gradient(135deg, #C9A96E 0%, #d97706 100%);
  border-color: transparent;
}
.ap-selbar-btn-txt { font-size: 24rpx; color: #92400e; font-weight: 500; }
.ap-selbar-btn-txt--main { color: #ffffff; font-weight: 600; }
.ap-selbar-close { margin-left: auto; padding: 8rpx; &:active { transform: scale(0.9); } }

/* 进度 */
.ap-progress { padding: 16rpx 48rpx 8rpx; }
.ap-progress-track { height: 10rpx; background: #e5ddd0; border-radius: 999rpx; overflow: hidden; }
.ap-progress-fill { height: 100%; background: #d97706; border-radius: 999rpx; transition: width 0.3s; }
.ap-progress-time { display: flex; justify-content: space-between; margin-top: 12rpx; font-size: 22rpx; color: var(--muted-foreground); }

/* 控制 */
.ap-controls { display: flex; align-items: center; justify-content: center; gap: 40rpx; padding: 16rpx 0 calc(24rpx + env(safe-area-inset-bottom)); }
.ap-speed { min-width: 80rpx; text-align: center; font-size: 28rpx; font-weight: 600; color: #92400e; }
.ap-chapnav { font-size: 26rpx; }
.ap-ctrl { &:active { transform: scale(0.9); } }
.ap-ctrl--off { opacity: 0.35; }
.ap-play { width: 120rpx; height: 120rpx; border-radius: 50%; background: #d97706; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 20rpx rgba(217,119,6,0.3); &:active { transform: scale(0.95); } }

/* AI 伴读入口（金色·与控制键并列） */
.ap-ai-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  &:active { transform: scale(0.92); }
}
.ap-ai-btn-txt { font-size: 20rpx; font-weight: 600; color: #C9A96E; }

/* AI 伴读半屏抽屉（权重高于 .ap-mask 的 z-index:50·盖住目录层与吸底条） */
.ap-mask.ap-mask--ai { z-index: 60; }
.ai-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72vh;
  background: #faf8f5;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.12);
}
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid rgba(150, 130, 90, 0.16);
}
.ai-head-left { display: flex; align-items: center; gap: 16rpx; min-width: 0; flex: 1; }
.ai-head-titles { min-width: 0; }
.ai-head-title { display: block; font-size: 30rpx; font-weight: 700; color: #78350f; }
.ai-head-sub { display: block; font-size: 20rpx; color: var(--muted-foreground); margin-top: 2rpx; max-width: 300rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-head-right { display: flex; align-items: center; gap: 20rpx; flex-shrink: 0; }
.ai-mini-play {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(217, 119, 6, 0.1);
  &:active { transform: scale(0.95); }
}
.ai-mini-play-txt { font-size: 22rpx; color: #92400e; font-weight: 500; }
.ai-close { font-size: 26rpx; color: var(--muted-foreground); }

/* 头像（金色渐变·呼应伴读身份） */
.ai-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #C9A96E 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-avatar--sm { width: 52rpx; height: 52rpx; }

/* 快捷问 */
.ai-quick { display: flex; gap: 14rpx; padding: 20rpx 32rpx 8rpx; flex-wrap: wrap; }
.ai-chip {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 2rpx solid rgba(201, 169, 110, 0.4);
  &:active { transform: scale(0.96); background: #fffbeb; }
}
.ai-chip-txt { font-size: 24rpx; color: #92400e; }

/* 对话流 */
.ai-body { flex: 1; height: 0; min-height: 0; padding: 16rpx 32rpx; box-sizing: border-box; }
.ai-empty { padding: 48rpx 24rpx; text-align: center; }
.ai-empty-txt { font-size: 24rpx; color: var(--muted-foreground); line-height: 1.7; }
.ai-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.ai-row--user { justify-content: flex-end; }
.ai-bubble-user {
  max-width: 82%;
  background: #d97706;
  border-radius: 28rpx;
  border-top-right-radius: 8rpx;
  padding: 20rpx 28rpx;
}
.ai-bubble-user-txt { font-size: 27rpx; line-height: 1.6; color: #ffffff; }
.ai-bubble-assist {
  max-width: 86%;
  background: #ffffff;
  border-radius: 28rpx;
  border-top-left-radius: 8rpx;
  padding: 24rpx 28rpx;
  border: 1rpx solid rgba(150, 130, 90, 0.16);
}
.ai-bubble-assist-txt { font-size: 27rpx; line-height: 1.7; color: #44403c; white-space: pre-wrap; }
.ai-disclaimer {
  display: block;
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(150, 130, 90, 0.16);
  font-size: 20rpx;
  line-height: 1.5;
  color: #b0a89c;
}
.ai-bottom-anchor { height: 2rpx; }

/* 输入栏 */
.ai-input-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx 24rpx;
  border-top: 1rpx solid rgba(150, 130, 90, 0.16);
  background: #faf8f5;
}
.ai-input {
  flex: 1;
  height: 76rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 2rpx solid rgba(150, 130, 90, 0.2);
  padding: 0 32rpx;
  font-size: 27rpx;
  color: #44403c;
  box-sizing: border-box;
}
.ai-input-ph { color: #b0a89c; }
.ai-send {
  width: 76rpx;
  height: 76rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #C9A96E 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { transform: scale(0.94); }
}
.ai-send--off { opacity: 0.45; }

/* 目录 */
.ap-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); }
.ap-sheet { position: absolute; bottom: 0; left: 0; right: 0; max-height: 70vh; background: var(--card); border-radius: 32rpx 32rpx 0 0; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); }
.ap-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; border-bottom: 1rpx solid var(--border); }
.ap-sheet-title { font-size: 30rpx; font-weight: 600; color: var(--foreground); }
.ap-sheet-close { font-size: 28rpx; color: var(--muted-foreground); }
.ap-sheet-list { max-height: calc(70vh - 100rpx); padding: 12rpx 24rpx; }
.ap-sheet-item { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 16rpx; border-bottom: 1rpx solid rgba(150,130,90,0.12); }
.ap-sheet-item--on { background: #fffbeb; border-radius: 12rpx; }
.ap-sheet-item-idx { width: 44rpx; text-align: center; font-size: 24rpx; color: var(--muted-foreground); flex-shrink: 0; }
.ap-sheet-item-title { flex: 1; font-size: 28rpx; color: var(--foreground); }
.ap-sheet-item-title--on { color: #b45309; font-weight: 600; }
</style>
