<template>
  <view class="reader-page" :class="themeClass">
    <!-- 顶部工具栏 -->
    <view v-if="showToolbar" class="toolbar-top">
      <text class="back-btn" @click="goBack">← 返回</text>
      <text class="toolbar-title">{{ currentChapter?.title || '阅读中' }}</text>
      <text class="more-btn" @click="showMenu = true">⋯</text>
    </view>

    <!-- 阅读内容区域 -->
    <scroll-view
      scroll-y
      class="content-area"
      :scroll-top="scrollTop"
      @scroll="onScroll"
      @click="toggleToolbar"
    >
      <view class="content-wrap">
        <text class="chapter-heading">{{ currentChapter?.title }}</text>
        <rich-text :nodes="formattedContent" class="chapter-content" />
      </view>

      <!-- 章节导航 -->
      <view class="chapter-nav">
        <view class="nav-btn" :class="{ disabled: !hasPrev }" @click="prevChapter">
          <text>上一章</text>
        </view>
        <view class="nav-btn" :class="{ disabled: !hasNext }" @click="nextChapter">
          <text>下一章</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部工具栏 -->
    <view v-if="showToolbar" class="toolbar-bottom">
      <view class="tool-item" @click="showToc = true">
        <text class="tool-icon">📑</text>
        <text class="tool-label">目录</text>
      </view>
      <view class="tool-item" @click="addBookmark">
        <text class="tool-icon">🔖</text>
        <text class="tool-label">书签</text>
      </view>
      <view class="tool-item" @click="showNotePanel = true">
        <text class="tool-icon">📝</text>
        <text class="tool-label">笔记</text>
      </view>
      <view class="tool-item" @click="showAiPanel = true">
        <text class="tool-icon">🤖</text>
        <text class="tool-label">AI</text>
      </view>
      <view class="tool-item" @click="showSettings = true">
        <text class="tool-icon">⚙️</text>
        <text class="tool-label">设置</text>
      </view>
    </view>

    <!-- 目录面板 -->
    <view v-if="showToc" class="panel-overlay" @click="showToc = false">
      <view class="panel-left" @click.stop>
        <text class="panel-title">目录</text>
        <scroll-view scroll-y class="toc-scroll">
          <view
            v-for="ch in chapters"
            :key="ch.id"
            class="toc-item"
            :class="{ active: ch.id === currentChapterId }"
            @click="switchChapter(ch.id)"
          >
            <text>{{ ch.title }}</text>
            <text v-if="ch.freeTrial" class="toc-free">试读</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 笔记面板 -->
    <view v-if="showNotePanel" class="panel-overlay" @click="showNotePanel = false">
      <view class="panel-bottom" @click.stop>
        <text class="panel-title">笔记</text>
        <view class="note-list">
          <view v-for="n in notes" :key="n.id" class="note-item">
            <text class="note-content">{{ n.content }}</text>
            <text class="note-time">{{ formatTime(n.createdAt) }}</text>
          </view>
        </view>
        <view class="note-input-row">
          <input v-model="newNote" class="note-input" placeholder="写下你的笔记..." />
          <text class="note-submit" @click="submitNote">保存</text>
        </view>
      </view>
    </view>

    <!-- AI工具面板 -->
    <view v-if="showAiPanel" class="panel-overlay" @click="showAiPanel = false">
      <view class="panel-bottom ai-panel" @click.stop>
        <view class="ai-tabs">
          <text :class="{ active: aiTab === 'translate' }" @click="aiTab = 'translate'">AI翻译</text>
          <text :class="{ active: aiTab === 'lookup' }" @click="aiTab = 'lookup'">查词释义</text>
        </view>
        <view v-if="aiTab === 'translate'" class="ai-content">
          <textarea v-model="aiText" class="ai-textarea" placeholder="输入古文段落进行翻译..." />
          <view class="ai-btn" @click="doTranslate">翻译</view>
          <view v-if="aiResult" class="ai-result">
            <text>{{ aiResult }}</text>
          </view>
        </view>
        <view v-if="aiTab === 'lookup'" class="ai-content">
          <input v-model="lookupText" class="ai-input" placeholder="输入要查询的词..." />
          <view class="ai-btn" @click="doLookup">查询</view>
          <view v-if="lookupResult" class="ai-result">
            <text class="lookup-word">{{ lookupResult.word }}</text>
            <text class="lookup-english">{{ lookupResult.english }}</text>
            <view v-if="lookupResult.relatedKeywords?.length" class="lookup-keywords">
              <text v-for="kw in lookupResult.relatedKeywords" :key="kw" class="kw-tag">{{ kw }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 设置面板 -->
    <view v-if="showSettings" class="panel-overlay" @click="showSettings = false">
      <view class="panel-bottom settings-panel" @click.stop>
        <text class="panel-title">阅读设置</text>
        <view class="setting-row">
          <text class="setting-label">字号</text>
          <view class="font-size-ctrl">
            <text class="fs-btn" @click="changeFontSize(-2)">A-</text>
            <text class="fs-value">{{ fontSize }}px</text>
            <text class="fs-btn" @click="changeFontSize(2)">A+</text>
          </view>
        </view>
        <view class="setting-row">
          <text class="setting-label">主题</text>
          <view class="theme-options">
            <view class="theme-dot light" :class="{ active: theme === 'light' }" @click="theme = 'light'" />
            <view class="theme-dot sepia" :class="{ active: theme === 'sepia' }" @click="theme = 'sepia'" />
            <view class="theme-dot dark" :class="{ active: theme === 'dark' }" @click="theme = 'dark'" />
          </view>
        </view>
      </view>
    </view>

    <!-- 菜单 -->
    <view v-if="showMenu" class="panel-overlay" @click="showMenu = false">
      <view class="menu-panel" @click.stop>
        <view class="menu-item" @click="downloadBook">下载离线</view>
        <view class="menu-item" @click="shareBook">分享</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { ebookApi } from "../../api";

const currentChapter = ref<any>(null);
const chapters = ref<any[]>([]);
const currentChapterId = ref("");
const showToolbar = ref(false);
const showToc = ref(false);
const showNotePanel = ref(false);
const showAiPanel = ref(false);
const showSettings = ref(false);
const showMenu = ref(false);
const scrollTop = ref(0);
const notes = ref<any[]>([]);
const newNote = ref("");
const aiTab = ref("translate");
const aiText = ref("");
const aiResult = ref("");
const lookupText = ref("");
const lookupResult = ref<any>(null);
const fontSize = ref(32);
const theme = ref("sepia");
const loading = ref(false);

let ebookId = "";
let progressTimer: any = null;
let currentProgress = 0;

const themeClass = computed(() => `theme-${theme.value}`);

const formattedContent = computed(() => {
  if (!currentChapter.value?.content) return "";
  const raw = currentChapter.value.content;
  return raw.replace(/\n/g, "<br/>").replace(/<p>/g, `<p style="font-size:${fontSize.value}rpx;line-height:2;">`);
});

const hasPrev = computed(() => {
  const idx = chapters.value.findIndex((c: any) => c.id === currentChapterId.value);
  return idx > 0;
});

const hasNext = computed(() => {
  const idx = chapters.value.findIndex((c: any) => c.id === currentChapterId.value);
  return idx < chapters.value.length - 1;
});

onLoad((opts: any) => {
  ebookId = opts.id;
  currentChapterId.value = opts.chapterId || "";
  fetchBook();
  startProgressSync();
});

onUnload(() => {
  if (progressTimer) clearInterval(progressTimer);
  syncProgress();
});

async function fetchBook() {
  try {
    const res = await ebookApi.detail(ebookId);
    const data = (res as any)?.data || res;
    chapters.value = data?.chapters || [];
    if (!currentChapterId.value && chapters.value.length) {
      currentChapterId.value = chapters.value[0].id;
    }
    if (currentChapterId.value) loadChapter(currentChapterId.value);
    loadNotes();
  } catch {
    uni.showToast({ title: "加载失败", icon: "none" });
  }
}

async function loadChapter(chapterId: string) {
  loading.value = true;
  try {
    const res = await ebookApi.chapter(chapterId);
    currentChapter.value = (res as any)?.data || res;
    currentChapterId.value = chapterId;
    scrollTop.value = 0;
  } catch (e: any) {
    uni.showToast({ title: e?.message || "无法阅读此章节", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function switchChapter(id: string) {
  loadChapter(id);
  showToc.value = false;
}

function prevChapter() {
  const idx = chapters.value.findIndex((c: any) => c.id === currentChapterId.value);
  if (idx > 0) loadChapter(chapters.value[idx - 1].id);
}

function nextChapter() {
  const idx = chapters.value.findIndex((c: any) => c.id === currentChapterId.value);
  if (idx < chapters.value.length - 1) loadChapter(chapters.value[idx + 1].id);
}

function toggleToolbar() {
  showToolbar.value = !showToolbar.value;
}

function onScroll(e: any) {
  const { scrollTop: top, scrollHeight } = e.detail;
  if (scrollHeight > 0) {
    currentProgress = Math.min(100, Math.round((top / scrollHeight) * 100));
  }
}

function startProgressSync() {
  progressTimer = setInterval(syncProgress, 30000);
}

async function syncProgress() {
  if (!ebookId || !currentChapterId.value) return;
  try {
    await ebookApi.updateProgress(ebookId, currentChapterId.value, currentProgress);
  } catch {}
}

async function addBookmark() {
  try {
    await ebookApi.addBookmark(ebookId, { chapterId: currentChapterId.value, position: currentProgress });
    uni.showToast({ title: "已添加书签", icon: "success" });
  } catch {
    uni.showToast({ title: "添加失败", icon: "none" });
  }
}

async function loadNotes() {
  try {
    const res = await ebookApi.notes({ ebookId });
    const data = (res as any)?.data || res;
    notes.value = data?.notes || [];
  } catch {}
}

async function submitNote() {
  if (!newNote.value.trim()) return;
  try {
    await ebookApi.addNote(ebookId, { chapterId: currentChapterId.value, content: newNote.value });
    newNote.value = "";
    loadNotes();
    uni.showToast({ title: "已保存", icon: "success" });
  } catch {}
}

async function doTranslate() {
  if (!aiText.value.trim()) return;
  aiResult.value = "翻译中...";
  try {
    const res = await ebookApi.translate(aiText.value);
    const data = (res as any)?.data || res;
    aiResult.value = data?.translated || "翻译失败";
  } catch {
    aiResult.value = "翻译失败，请重试";
  }
}

async function doLookup() {
  if (!lookupText.value.trim()) return;
  lookupResult.value = null;
  try {
    const res: any = await (ebookApi as any).lookup?.(lookupText.value) || {};
    lookupResult.value = (res as any)?.data || res;
  } catch {
    lookupResult.value = { word: lookupText.value, english: "查询失败" };
  }
}

async function downloadBook() {
  showMenu.value = false;
  try {
    const res = await ebookApi.generateDownloadUrl(ebookId);
    const url = (res as any)?.data?.url || res?.url;
    if (url) {
      uni.setClipboardData({ data: url, success: () => uni.showToast({ title: "下载链接已复制", icon: "success" }) });
    } else {
      uni.showToast({ title: "暂不支持下载", icon: "none" });
    }
  } catch {
    uni.showToast({ title: "获取下载链接失败", icon: "none" });
  }
}

function shareBook() {
  showMenu.value = false;
  uni.showToast({ title: "分享功能开发中", icon: "none" });
}

function changeFontSize(delta: number) {
  const newSize = fontSize.value + delta;
  if (newSize >= 24 && newSize <= 48) fontSize.value = newSize;
}

function goBack() {
  syncProgress();
  uni.navigateBack();
}

function formatTime(t: string) {
  if (!t) return "";
  return new Date(t).toLocaleDateString();
}
</script>

<style scoped>
.reader-page { min-height: 100vh; position: relative; }
.reader-page.theme-light { background: #fff; color: #333; }
.reader-page.theme-sepia { background: #f8f1e4; color: #4a3728; }
.reader-page.theme-dark { background: #1a1a1a; color: #ccc; }

.toolbar-top { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 60rpx 30rpx 20rpx; background: rgba(0,0,0,0.8); }
.back-btn { color: #fff; font-size: 30rpx; }
.toolbar-title { color: #fff; font-size: 28rpx; max-width: 400rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.more-btn { color: #fff; font-size: 36rpx; }

.content-area { height: 100vh; }
.content-wrap { padding: 100rpx 40rpx 200rpx; }
.chapter-heading { font-size: 40rpx; font-weight: bold; margin-bottom: 40rpx; display: block; text-align: center; }
.chapter-content { font-size: 32rpx; line-height: 2; }

.chapter-nav { display: flex; justify-content: space-between; padding: 40rpx; }
.nav-btn { padding: 20rpx 40rpx; border-radius: 8rpx; background: rgba(139,105,20,0.1); }
.nav-btn text { font-size: 28rpx; color: #8b6914; }
.nav-btn.disabled { opacity: 0.4; }

.toolbar-bottom { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; display: flex; justify-content: space-around; padding: 20rpx 0 40rpx; background: rgba(0,0,0,0.8); }
.tool-item { display: flex; flex-direction: column; align-items: center; }
.tool-icon { font-size: 36rpx; }
.tool-label { font-size: 20rpx; color: #fff; margin-top: 6rpx; }

.panel-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200; background: rgba(0,0,0,0.5); }
.panel-left { position: absolute; left: 0; top: 0; bottom: 0; width: 70%; background: #fff; padding: 60rpx 30rpx 30rpx; }
.panel-bottom { position: absolute; left: 0; right: 0; bottom: 0; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 70vh; }
.panel-title { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; display: block; color: #333; }

.toc-scroll { height: calc(100vh - 120rpx); }
.toc-item { padding: 24rpx 16rpx; border-bottom: 1rpx solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
.toc-item.active { color: #8b6914; font-weight: bold; }
.toc-item text { font-size: 28rpx; }
.toc-free { font-size: 20rpx; color: #4caf50; }

.note-list { max-height: 400rpx; overflow-y: auto; }
.note-item { padding: 16rpx; border-bottom: 1rpx solid #f5f5f5; }
.note-content { font-size: 26rpx; color: #333; }
.note-time { font-size: 20rpx; color: #999; margin-top: 6rpx; display: block; }
.note-input-row { display: flex; gap: 16rpx; margin-top: 20rpx; }
.note-input { flex: 1; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 16rpx; font-size: 26rpx; }
.note-submit { padding: 16rpx 28rpx; background: #8b6914; color: #fff; border-radius: 8rpx; font-size: 26rpx; }

.ai-panel {}
.ai-tabs { display: flex; gap: 28rpx; margin-bottom: 20rpx; }
.ai-tabs text { font-size: 28rpx; color: #999; padding-bottom: 8rpx; }
.ai-tabs text.active { color: #8b6914; border-bottom: 4rpx solid #8b6914; }
.ai-content {}
.ai-textarea { width: 100%; height: 160rpx; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 16rpx; font-size: 26rpx; }
.ai-input { width: 100%; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 16rpx; font-size: 26rpx; }
.ai-btn { margin-top: 16rpx; text-align: center; background: #8b6914; color: #fff; padding: 18rpx; border-radius: 8rpx; font-size: 28rpx; }
.ai-result { margin-top: 20rpx; padding: 20rpx; background: #f9f5f0; border-radius: 8rpx; }
.ai-result text { font-size: 26rpx; color: #333; line-height: 1.8; }
.lookup-word { font-size: 32rpx; font-weight: bold; display: block; margin-bottom: 8rpx; }
.lookup-english { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.lookup-keywords { display: flex; flex-wrap: wrap; gap: 12rpx; }
.kw-tag { font-size: 22rpx; color: #8b6914; background: rgba(139,105,20,0.1); padding: 6rpx 14rpx; border-radius: 6rpx; }

.settings-panel {}
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.setting-label { font-size: 28rpx; color: #333; }
.font-size-ctrl { display: flex; align-items: center; gap: 20rpx; }
.fs-btn { width: 56rpx; height: 56rpx; border: 1rpx solid #ddd; border-radius: 50%; text-align: center; line-height: 56rpx; font-size: 24rpx; }
.fs-value { font-size: 26rpx; color: #666; }
.theme-options { display: flex; gap: 24rpx; }
.theme-dot { width: 56rpx; height: 56rpx; border-radius: 50%; border: 4rpx solid transparent; }
.theme-dot.active { border-color: #8b6914; }
.theme-dot.light { background: #fff; border: 2rpx solid #ddd; }
.theme-dot.sepia { background: #f8f1e4; }
.theme-dot.dark { background: #1a1a1a; }

.menu-panel { position: absolute; top: 100rpx; right: 30rpx; background: #fff; border-radius: 12rpx; padding: 16rpx 0; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.15); }
.menu-item { padding: 20rpx 40rpx; font-size: 28rpx; color: #333; }
</style>
