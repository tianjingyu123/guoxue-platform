<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { classicsApi } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'

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

function saveProgress() {
  if (!getToken() || !curChapter.value) return
  classicsApi.saveProgress(bookId.value, curChapter.value.id, progress.value).catch(() => {})
}

function goBack() {
  stop()
  uni.navigateBack({ fail: () => uni.navigateTo({ url: '/pkg-classics/audiobooks/index' }) })
}

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
          :class="{ 'ap-sent--on': i === curSentence }"
          @tap="jumpSentence(i)"
        >{{ s }}</text>
        <view v-if="!sentences.length" class="ap-tip">本章暂无可朗读内容</view>
      </scroll-view>

      <!-- 吸底播放控制条（悬浮常驻：长文滚到任何位置都能播放/暂停） -->
      <view class="ap-dock">
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
        </view>
      </view>
    </template>

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
.ap-tip { text-align: center; color: var(--muted-foreground); font-size: 26rpx; padding: 80rpx 0; }

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
