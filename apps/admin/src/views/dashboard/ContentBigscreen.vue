<template>
  <div
    v-loading="loading"
    class="bigscreen content-eco"
    element-loading-background="rgba(11,19,32,0.6)"
  >
    <header class="bs-header">
      <div class="bs-title">
        内容生态数据大屏
      </div>
      <div class="bs-time">
        {{ nowStr }}
      </div>
    </header>

    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchData"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <div
      v-else
      class="bs-body">
      <!-- 总量指标 -->
      <div class="kpi-bar">
        <div class="kpi-item">
          <span class="kpi-label">总内容量</span><span class="kpi-value blue">{{ fmt(data.totalContent) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">文章</span><span class="kpi-value green">{{ fmt(data.totalArticles) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">帖子</span><span class="kpi-value orange">{{ fmt(data.totalPosts) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">课程</span><span class="kpi-value cyan">{{ fmt(data.totalCourses) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">视频</span><span class="kpi-value purple">{{ fmt(data.totalVideos) }}</span>
        </div>
      </div>

      <div class="bs-grid-2">
        <!-- 本月增长 -->
        <div class="bs-panel">
          <h3>📈 近30天增长</h3>
          <div class="growth-cards">
            <div class="growth-card">
              <span>新增文章</span><strong>{{ data.monthGrowth?.articles || 0 }}</strong>
            </div>
            <div class="growth-card">
              <span>新增帖子</span><strong>{{ data.monthGrowth?.posts || 0 }}</strong>
            </div>
          </div>
        </div>
        <!-- 创作者排行 -->
        <div class="bs-panel">
          <h3>✍️ 创作者贡献榜 Top10</h3>
          <div class="creator-list">
            <div
              v-for="(c, i) in (data.topCreators || [])"
              :key="c.userId"
              class="creator-row"
            >
              <span class="rank">{{ i + 1 }}</span>
              <el-avatar :size="32">
                {{ c.nickname?.charAt(0) || '?' }}
              </el-avatar>
              <span class="name">{{ c.nickname || c.userId }}</span>
              <span class="count">{{ c.articleCount }}篇</span>
            </div>
            <el-empty
              v-if="!(data.topCreators?.length)"
              description="暂无数据"
              :image-size="60"
            />
          </div>
        </div>
      </div>
    </div>

    <footer class="bs-footer">
      <span>更新：{{ data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '--' }}</span>
      <span class="watermark">{{ BRAND.name }} · 内容大屏 · {{ nowStr.slice(0, 10) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { bigscreenApi } from "@/api";
import { BRAND } from "@/lib/brand";

/** 创作者贡献项 */
interface CreatorItem { userId?: string; nickname?: string; articleCount?: number }
/** 内容生态大屏数据（字段宽松 optional，依模板实际访问声明） */
interface ContentEcoData {
  totalContent?: number;
  totalArticles?: number;
  totalPosts?: number;
  totalCourses?: number;
  totalVideos?: number;
  monthGrowth?: { articles?: number; posts?: number };
  topCreators?: CreatorItem[];
  updatedAt?: string;
}

const route = useRoute();
const data = ref<ContentEcoData>({});
const nowStr = ref(new Date().toLocaleString("zh-CN"));
const loading = ref(true);
const loadError = ref(false);
let timer: ReturnType<typeof setInterval> | undefined = undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined = undefined;

function fmt(v: number | string | null | undefined) { return v != null ? Number(v).toLocaleString() : "0"; }

async function fetchData() {
  try {
    const token = (route.query.token as string) || undefined;
    const { data: d } = await bigscreenApi.contentEco(token);
    data.value = d || {};
    loadError.value = false;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchData();
  timer = setInterval(fetchData, 30000);
  clockTimer = setInterval(() => { nowStr.value = new Date().toLocaleString("zh-CN"); }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  clearInterval(clockTimer);
});
</script>

<style scoped>
.bigscreen { background: linear-gradient(135deg, #0b1320 0%, #1a2332 100%); color: #d6e4ff; min-height: 100vh; }
.bs-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; border-bottom: 1px solid rgba(100,150,255,.1); }
.bs-title { font-size: 28px; letter-spacing: 4px; color: #7cb7ff; }
.bs-time { font-size: 16px; color: #6b7c93; }
.bs-body { padding: 24px 40px; }

.kpi-bar { display: flex; gap: 20px; margin-bottom: 24px; }
.kpi-item { flex: 1; background: rgba(100,150,255,.04); border: 1px solid rgba(100,150,255,.1); border-radius: 8px; padding: 20px; text-align: center; }
.kpi-label { display: block; font-size: 13px; color: #6b7c93; margin-bottom: 8px; }
.kpi-value { font-size: 30px; font-weight: 700; }
.kpi-value.blue { color: #7cb7ff; }
.kpi-value.green { color: #5cdb8a; }
.kpi-value.orange { color: #f0a050; }
.kpi-value.cyan { color: #4dd9c8; }
.kpi-value.purple { color: #b39cf0; }

.bs-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.bs-panel { background: rgba(100,150,255,.03); border: 1px solid rgba(100,150,255,.08); border-radius: 8px; padding: 20px; }
.bs-panel h3 { margin: 0 0 16px; font-size: 16px; color: #c8d8f0; }

.growth-cards { display: flex; gap: 16px; }
.growth-card { flex: 1; background: rgba(100,150,255,.06); border-radius: 8px; padding: 20px; text-align: center; }
.growth-card span { display: block; font-size: 13px; color: #6b7c93; margin-bottom: 8px; }
.growth-card strong { font-size: 32px; color: #7cb7ff; }

.creator-list { max-height: 300px; overflow-y: auto; }
.creator-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(100,150,255,.06); }
.rank { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; background: #546e8a; }
.creator-row:nth-child(1) .rank { background: #f0a050; }
.creator-row:nth-child(2) .rank { background: #8892b0; }
.creator-row:nth-child(3) .rank { background: #b08a6c; }
.name { flex: 1; }
.count { color: #6b7c93; font-size: 13px; }

.bs-footer { display: flex; justify-content: space-between; padding: 12px 40px; font-size: 13px; color: #4a5568; border-top: 1px solid rgba(100,150,255,.06); }
.watermark { opacity: .25; }
</style>
