<template>
  <view class="page">
    <!-- 课程头部 -->
    <view v-if="course" class="header">
      <image v-if="course.cover" :src="course.cover" class="cover" mode="aspectFill" />
      <text class="title">{{ course.title }}</text>
      <text class="price" :class="{ free: course.price === 0 }">{{ course.price > 0 ? '¥' + course.price : '免费' }}</text>
      <text class="intro">{{ course.intro }}</text>
      <view class="stats">
        <text>{{ course.studentCount }} 学员</text>
        <text v-if="progress">进度 {{ progress }}%</text>
      </view>
    </view>

    <!-- 章节列表 -->
    <view class="section-title">课程目录 ({{ chapters.length }}章)</view>
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view v-for="(ch, idx) in chapters" :key="ch.id" class="chapter-item" :class="{ completed: ch.completed, active: ch.id === activeId }" @click="openChapter(ch, idx)">
        <view class="ch-left">
          <text class="ch-status">{{ ch.completed ? '✅' : ch.id === activeId ? '▶️' : '📖' }}</text>
          <view class="ch-info">
            <text class="ch-title">{{ ch.title }}</text>
            <text class="ch-desc" v-if="ch.content">{{ ch.content.slice(0, 60) }}...</text>
          </view>
        </view>
        <text class="ch-idx">{{ idx + 1 }}</text>
      </view>
    </view>
    <view v-if="!loading && chapters.length === 0" class="empty">暂无章节</view>

    <!-- 章节内容弹窗 -->
    <view v-if="activeChapter" class="chapter-mask" @click="closeChapter">
      <view class="chapter-panel" @click.stop="">
        <view class="ch-toolbar">
          <text class="back-btn" @click="closeChapter">← 返回</text>
          <text class="ch-label">{{ activeChapter.title }}</text>
          <text class="done-btn" @click="markDone" :class="{ done: activeChapter.completed }">{{ activeChapter.completed ? '✓ 已完成' : '标记完成' }}</text>
        </view>
        <view class="ch-body">
          <rich-text :nodes="activeChapter.content" />
        </view>
        <view class="ch-bottom">
          <button v-if="hasPrev" size="mini" @click="openChapter(chapters[curChIdx - 1], curChIdx - 1)">上一章</button>
          <view style="flex:1" />
          <button v-if="hasNext" size="mini" type="primary" @click="openChapter(chapters[curChIdx + 1], curChIdx + 1)">下一章</button>
          <button v-else size="mini" type="primary" @click="closeChapter">完成</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { courseApi } from "../../api";

const id = ref("");
const course = ref<any>(null);
const chapters = ref<any[]>([]);
const loading = ref(false);
const activeChapter = ref<any>(null);
const activeId = ref("");
const curChIdx = ref(0);
const progress = ref(0);
const completedIds = ref<Set<string>>(new Set());

const hasPrev = computed(() => curChIdx.value > 0);
const hasNext = computed(() => curChIdx.value < chapters.value.length - 1);

onMounted(() => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const opts = page?.$page?.options || page?.options || {};
  id.value = opts.id || "";
  fetchCourse();
});

async function fetchCourse() {
  loading.value = true;
  try {
    course.value = await courseApi.detail(id.value);
    const chData = await courseApi.chapters(id.value);
    chapters.value = (chData.chapters || chData || []).map((c: any) => ({
      ...c,
      completed: completedIds.value.has(c.id),
    }));

    // 恢复进度
    try {
      const prog = await courseApi.myProgress(id.value);
      if (prog) {
        progress.value = prog.progress || 0;
        if (prog.completedChapterIds) {
          completedIds.value = new Set(prog.completedChapterIds);
          chapters.value.forEach((c: any) => c.completed = completedIds.value.has(c.id));
        }
      }
    } catch { /* */ }
  } finally { loading.value = false; }
}

function openChapter(ch: any, idx: number) {
  activeChapter.value = { ...ch, completed: completedIds.value.has(ch.id) };
  activeId.value = ch.id;
  curChIdx.value = idx;
}

function closeChapter() {
  activeChapter.value = null;
  activeId.value = "";
}

function markDone() {
  if (!activeChapter.value) return;
  const chId = activeChapter.value.id;
  completedIds.value.add(chId);
  activeChapter.value.completed = true;
  const ch = chapters.value.find((c: any) => c.id === chId);
  if (ch) ch.completed = true;

  // 更新服务端进度
  const pct = Math.round((completedIds.value.size / chapters.value.length) * 100);
  progress.value = pct;
  try {
    courseApi.updateProgress(chId, pct);
  } catch { /* */ }
}
</script>

<style>
.page { padding: 12px 12px 40px; background: #f5f0e6; min-height: 100vh; }
.header { text-align: center; padding: 16px 0; }
.cover { width: 100%; height: 180px; border-radius: 8px; margin-bottom: 12px; }
.title { font-size: 20px; font-weight: bold; color: #333; display: block; }
.price { font-size: 24px; font-weight: bold; color: #e74c3c; margin: 6px 0; display: block; }
.price.free { color: #2e7d32; }
.intro { font-size: 14px; color: #888; display: block; margin: 4px 0; }
.stats { display: flex; justify-content: center; gap: 20px; font-size: 13px; color: #8b4513; margin-top: 8px; }

.section-title { font-size: 16px; font-weight: bold; color: #8b4513; margin: 16px 0 8px; }

.chapter-item { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 6px; }
.chapter-item.active { border-left: 3px solid #8b4513; }
.chapter-item.completed { opacity: 0.7; }
.ch-left { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; }
.ch-status { font-size: 16px; flex-shrink: 0; }
.ch-info { flex: 1; overflow: hidden; }
.ch-title { font-size: 14px; color: #333; font-weight: bold; display: block; }
.ch-desc { font-size: 12px; color: #aaa; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-idx { font-size: 12px; color: #ccc; }

.chapter-mask { position: fixed; inset: 0; background: #f5f0e6; z-index: 200; display: flex; flex-direction: column; }
.chapter-panel { flex: 1; display: flex; flex-direction: column; }
.ch-toolbar { display: flex; align-items: center; padding: 10px 12px; background: #fff; gap: 8px; }
.back-btn { font-size: 14px; color: #8b4513; }
.ch-label { flex: 1; font-size: 14px; font-weight: bold; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.done-btn { font-size: 13px; color: #8b4513; }
.done-btn.done { color: #2e7d32; }

.ch-body { flex: 1; padding: 16px; overflow-y: auto; font-size: 15px; line-height: 1.8; color: #333; }
.ch-bottom { display: flex; padding: 10px 16px; background: #fff; gap: 8px; }

.empty { text-align: center; color: #999; padding: 40px; font-size: 14px; }
</style>
