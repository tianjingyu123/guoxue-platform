<template>
  <view class="page" :class="{ dark: isDark }">
    <!-- 顶部工具栏 -->
    <view class="toolbar">
      <text class="back-btn" @click="goBack">← 返回</text>
      <text class="toolbar-title">{{ book?.title }}</text>
      <view class="toolbar-actions">
        <text @click="toggleSpeech">{{ isSpeaking ? '⏸' : '🔊' }}</text>
        <text @click="toggleDark">{{ isDark ? '☀' : '🌙' }}</text>
        <text @click="showSettings = !showSettings">Aa</text>
      </view>
    </view>

    <!-- 设置面板 -->
    <view v-if="showSettings" class="settings-panel">
      <view class="setting-row">
        <text>字号</text>
        <view class="font-btns">
          <button size="mini" @click="fontSize--" :disabled="fontSize <= 14">A-</button>
          <text>{{ fontSize }}</text>
          <button size="mini" @click="fontSize++" :disabled="fontSize >= 28">A+</button>
        </view>
      </view>
      <view class="setting-row">
        <text>显示译文</text>
        <switch :checked="showTranslation" @change="showTranslation = !showTranslation" />
      </view>
      <view class="setting-row">
        <text>夜间模式</text>
        <switch :checked="isDark" @change="toggleDark" />
      </view>
    </view>

    <!-- 阅读内容 -->
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="chapter" class="reader-content">
      <text class="chapter-title">{{ chapter.title }}</text>
      <view class="text-body" :style="{ fontSize: fontSize + 'px', lineHeight: lineHeight + 'px' }">
        <text>{{ chapter.content }}</text>
      </view>

      <!-- 译文 -->
      <view v-if="showTranslation && chapter.translation" class="translation-section">
        <text class="trans-label">【译文】</text>
        <view class="text-body trans-text" :style="{ fontSize: (fontSize-2) + 'px', lineHeight: lineHeight + 'px' }">
          <text>{{ chapter.translation }}</text>
        </view>
      </view>

      <!-- 注释 -->
      <view v-if="chapter.annotation" class="annotation-section">
        <text class="trans-label">【注释】</text>
        <view class="text-body" :style="{ fontSize: (fontSize-2) + 'px' }">
          <text>{{ chapter.annotation }}</text>
        </view>
      </view>
    </view>

    <!-- 底部导航 -->
    <view v-if="book" class="bottom-nav">
      <view class="nav-btns">
        <button size="mini" @click="prevChapter" :disabled="!hasPrev">上一章</button>
        <text class="nav-info">{{ curIdx + 1 }} / {{ chapters.length }}</text>
        <button size="mini" @click="nextChapter" :disabled="!hasNext">下一章</button>
      </view>
      <view class="nav-actions">
        <text @click="toggleBookmark">{{ isBookmarked ? '🔖 已收藏' : '🏷 书签' }}</text>
        <text @click="showToc = true">📋 目录</text>
      </view>
    </view>

    <!-- 目录弹窗 -->
    <view v-if="showToc" class="toc-mask" @click="showToc = false">
      <view class="toc-panel" @click.stop="">
        <text class="toc-title">目录</text>
        <view v-for="(ch, idx) in chapters" :key="ch.id" class="toc-item" :class="{ active: idx === curIdx }" @click="switchChapter(idx); showToc = false">
          <text>{{ ch.title }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { classicApi } from "../../api";

const book = ref<any>(null);
const chapters = ref<any[]>([]);
const chapter = ref<any>(null);
const curIdx = ref(0);
const loading = ref(false);

const fontSize = ref(18);
const lineHeight = computed(() => fontSize.value * 1.8);
const showTranslation = ref(true);
const isDark = ref(false);
const showSettings = ref(false);
const showToc = ref(false);
const isBookmarked = ref(false);

const hasPrev = computed(() => curIdx.value > 0);
const hasNext = computed(() => curIdx.value < chapters.value.length - 1);

// TTS 朗读
const isSpeaking = ref(false);
function toggleSpeech() {
  const synth = (window as any).speechSynthesis;
  if (!synth) {
    uni.showToast({ title: "当前环境不支持语音朗读", icon: "none" });
    return;
  }
  if (isSpeaking.value) {
    synth.cancel();
    isSpeaking.value = false;
    return;
  }
  if (!chapter.value?.content) return;
  // 朗读原文（去掉标点的纯文本更适合TTS）
  const text = chapter.value.content.replace(/[，。；：！？、《》「」\n\r]/g, " ");
  const utter = new (window as any).SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = 0.8; // 稍慢更适合古文
  utter.onend = () => { isSpeaking.value = false; };
  utter.onerror = () => { isSpeaking.value = false; };
  synth.speak(utter);
  isSpeaking.value = true;
}

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  const bookId = opts.id || "";
  fetchBook(bookId);
});

async function fetchBook(bookId: string) {
  loading.value = true;
  try {
    book.value = await classicApi.bookDetail(bookId);
    chapters.value = book.value?.chapters || [];

    // 恢复阅读进度
    try {
      const prog = await classicApi.getProgress(bookId);
      if (prog?.chapterId) {
        const idx = chapters.value.findIndex((c: any) => c.id === prog.chapterId);
        if (idx >= 0) curIdx.value = idx;
      }
    } catch { /* */ }

    if (chapters.value.length > 0) {
      await fetchChapter(chapters.value[curIdx.value].id);
    }
  } finally {
    loading.value = false;
  }
}

async function fetchChapter(chapterId: string) {
  chapter.value = await classicApi.chapterDetail(chapterId);
}

async function switchChapter(idx: number) {
  curIdx.value = idx;
  const ch = chapters.value[idx];
  // 停止朗读
  const synth = (window as any).speechSynthesis;
  if (synth) { synth.cancel(); isSpeaking.value = false; }
  await fetchChapter(ch.id);
  // 保存进度
  try {
    await classicApi.updateProgress(book.value.id, ch.id, Math.round(((idx + 1) / chapters.value.length) * 100));
  } catch { /* */ }
}

function nextChapter() {
  if (hasNext.value) switchChapter(curIdx.value + 1);
}

function prevChapter() {
  if (hasPrev.value) switchChapter(curIdx.value - 1);
}

function toggleDark() {
  isDark.value = !isDark.value;
}

function toggleBookmark() {
  isBookmarked.value = !isBookmarked.value;
  if (isBookmarked.value) {
    classicApi.addBookmark(book.value.id, { chapterId: chapters.value[curIdx.value].id, position: 0 });
  }
}

function goBack() {
  uni.navigateBack();
}
</script>

<style>
.page { background: #f5f0e6; min-height: 100vh; display: flex; flex-direction: column; }
.page.dark { background: #1a1a2e; }
.page.dark .toolbar { background: #16213e; color: #eee; }
.page.dark .reader-content { color: #ccc; }
.page.dark .chapter-title { color: #e0c87d; }
.page.dark .translation-section { background: #1a2744; }
.page.dark .bottom-nav { background: #16213e; }

.toolbar { display: flex; align-items: center; padding: 10px 12px; background: #fff; gap: 8px; }
.back-btn { font-size: 14px; color: #8b4513; }
.toolbar-title { flex: 1; font-size: 15px; font-weight: bold; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toolbar-actions { display: flex; gap: 12px; font-size: 18px; }

.settings-panel { background: #fff; padding: 12px 16px; border-bottom: 1px solid #eee; }
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; }
.font-btns { display: flex; gap: 8px; align-items: center; }

.reader-content { flex: 1; padding: 20px 16px 100px; overflow-y: auto; }
.chapter-title { font-size: 17px; font-weight: bold; text-align: center; margin-bottom: 20px; color: #8b4513; }
.text-body { color: #333; white-space: pre-wrap; word-break: break-all; }

.translation-section { margin-top: 20px; padding: 12px; background: #faf6ef; border-radius: 8px; }
.trans-label { font-size: 13px; font-weight: bold; color: #8b4513; }
.trans-text { color: #666; margin-top: 6px; }

.annotation-section { margin-top: 16px; padding: 12px; border-top: 1px dashed #e0d5c1; }

.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 10px 16px; border-top: 1px solid #eee; }
.nav-btns { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.nav-info { font-size: 13px; color: #999; }
.nav-actions { display: flex; justify-content: space-around; font-size: 14px; color: #8b4513; }

.toc-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; justify-content: flex-end; z-index: 100; }
.toc-panel { width: 75%; background: #fff; padding: 16px; overflow-y: auto; }
.toc-title { font-size: 16px; font-weight: bold; color: #8b4513; display: block; margin-bottom: 12px; }
.toc-item { padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; color: #666; }
.toc-item.active { color: #8b4513; font-weight: bold; }

.empty { text-align: center; color: #999; padding: 60px 0; }
</style>
