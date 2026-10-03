<template>
  <div class="classic-page">
    <PageHeader title="古籍管理">
      <template #actions>
        <el-button
          type="success"
          :loading="seeding"
          @click="seedLibrary"
        >
          初始化种子数据
        </el-button>
        <el-button
          type="warning"
          :loading="syncing"
          @click="syncKnowledge"
        >
          同步知识库
        </el-button>
        <el-button
          type="info"
          :loading="vectorizing"
          @click="vectorize"
        >
          向量化索引
        </el-button>
        <el-button
          :loading="clearingCache"
          @click="clearCache"
        >
          清除缓存
        </el-button>
        <el-button
          v-if="MANUAL_EDIT"
          type="primary"
          @click="openEdit()"
        >
          添加古籍
        </el-button>
      </template>
    </PageHeader>

    <AiMaintainedBanner description="古籍正文由 AI 数字员工采集导入维护，人工请勿直接新增/编辑正文（数据订正走工单/AI 兜底）。本页保留查看、章节浏览与运营操作（同步知识库/向量化/缓存）。" />

    <!-- 统计面板 -->
    <div
      v-if="stats"
      class="stats-panel"
    >
      <!-- <text> 是 uni-app 标签，Web 端无语义，改回 <span> -->
      <div class="stat-item">
        <span class="stat-num">
          {{ stats.totals?.books || 0 }}
        </span>
        <span class="stat-label">
          古籍总数
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-num">
          {{ stats.totals?.chapters || 0 }}
        </span>
        <span class="stat-label">
          章节总数
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-num">
          {{ stats.totals?.images || 0 }}
        </span>
        <span class="stat-label">
          原图数量
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-num">
          {{ stats.totals?.commentaries || 0 }}
        </span>
        <span class="stat-label">
          名家注解
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-num">
          {{ stats.totals?.annotations || 0 }}
        </span>
        <span class="stat-label">
          注疏批注
        </span>
      </div>
    </div>

    <!-- 分类分布 -->
    <div
      v-if="stats?.byCategory"
      class="cat-dist"
    >
      <span
        v-for="c in stats.byCategory"
        :key="c.category"
        class="cat-chip"
      >
        {{ c.category }}: {{ c.count }}
      </span>
    </div>

    <div class="filter-bar">
      <!-- 书名/作者搜索：49 本量级，前端过滤已拉取列表即可，无需后端搜索端点 -->
      <el-input
        v-model="keyword"
        placeholder="搜索书名 / 作者"
        clearable
        style="width:200px;margin-right:12px"
      />
      <el-radio-group
        v-model="categoryFilter"
        size="small"
        @change="fetchBooks"
      >
        <el-radio-button label="">
          全部
        </el-radio-button>
        <el-radio-button label="经">
          经部
        </el-radio-button>
        <el-radio-button label="史">
          史部
        </el-radio-button>
        <el-radio-button label="子">
          子部
        </el-radio-button>
        <el-radio-button label="集">
          集部
        </el-radio-button>
        <el-radio-button label="释">
          佛教
        </el-radio-button>
        <el-radio-button label="道">
          道教
        </el-radio-button>
        <el-radio-button label="命">
          命理
        </el-radio-button>
      </el-radio-group>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredBooks"
      border
      stripe
    >
      <template #empty>
        <el-empty
          :description="keyword ? '没有匹配「' + keyword + '」的古籍，换个关键词试试' : '暂无古籍'"
          :image-size="80"
        />
      </template>
      <el-table-column
        prop="title"
        label="书名"
        width="140"
      />
      <el-table-column
        prop="author"
        label="作者"
        width="120"
      />
      <el-table-column
        prop="dynasty"
        label="朝代"
        width="80"
      />
      <el-table-column
        label="分类"
        width="70"
      >
        <template #default="{ row }">
          {{ row.category }}
        </template>
      </el-table-column>
      <el-table-column
        prop="intro"
        label="简介"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="chapterCount"
        label="章节"
        width="70"
      />
      <el-table-column
        prop="viewCount"
        label="阅读"
        width="80"
      />
      <el-table-column
        label="操作"
        width="260"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openChapters(row)"
          >
            章节
          </el-button>
          <el-button
            v-if="MANUAL_EDIT"
            size="small"
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="MANUAL_EDIT"
            size="small"
            type="danger"
            @click="delBook(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingBook?.id ? '编辑古籍' : '添加古籍'"
      width="560px"
    >
      <el-form
        :model="form"
        label-width="80px"
      >
        <el-form-item label="书名">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="朝代">
          <el-input v-model="form.dynasty" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option
              label="经部"
              value="经"
            />
            <el-option
              label="史部"
              value="史"
            />
            <el-option
              label="子部"
              value="子"
            />
            <el-option
              label="集部"
              value="集"
            />
            <el-option
              label="佛教"
              value="释"
            />
            <el-option
              label="道教"
              value="道"
            />
            <el-option
              label="命理"
              value="命"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="封面">
          <ImageUpload v-model="form.cover" />
        </el-form-item>
        <el-form-item label="版本来源">
          <el-input v-model="form.source" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveBook"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 章节管理对话框 -->
    <el-dialog
      v-model="chapterVisible"
      title="章节管理"
      width="700px"
    >
      <el-table
        :data="chapters"
        border
        size="small"
        max-height="400"
      >
        <template #empty>
          <el-empty
            description="暂无章节"
            :image-size="60"
          />
        </template>
        <el-table-column
          prop="title"
          label="标题"
          width="180"
        />
        <el-table-column
          prop="content"
          label="原文"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="MANUAL_EDIT"
          label="操作"
          width="160"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              @click="editChapter(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="delChapter(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="MANUAL_EDIT"
        style="margin-top:12px"
      >
        <el-button
          size="small"
          type="primary"
          @click="editChapter()"
        >
          添加章节
        </el-button>
      </div>
      <template #footer>
        <el-button @click="chapterVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <!-- 章节编辑对话框 -->
    <el-dialog
      v-model="chEditVisible"
      :title="chForm.id ? '编辑章节' : '添加章节'"
      width="600px"
    >
      <el-form
        :model="chForm"
        label-width="80px"
      >
        <el-form-item label="标题">
          <el-input v-model="chForm.title" />
        </el-form-item>
        <el-form-item label="原文">
          <el-input
            v-model="chForm.content"
            type="textarea"
            :rows="6"
          />
        </el-form-item>
        <el-form-item label="译文">
          <el-input
            v-model="chForm.translation"
            type="textarea"
            :rows="4"
          />
        </el-form-item>
        <el-form-item label="注释">
          <el-input
            v-model="chForm.annotation"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="chEditVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveChapter"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { classicApi } from "@/api";
import ImageUpload from "@/components/ImageUpload.vue";
import PageHeader from "@/components/PageHeader.vue";
import AiMaintainedBanner from "@/components/AiMaintainedBanner.vue";

// 目录重构批（2026-07-11·董事长拍板）：古籍库由 AI 数字员工采集维护，
// 人工"新增/编辑/删除正文"入口下线（置 true 可回滚·代码保留），本页转只读运营视图
const MANUAL_EDIT = false;

/** 古籍行（字段宽松 optional） */
interface BookRow {
  id?: string;
  title?: string;
  author?: string;
  dynasty?: string;
  category?: string;
  intro?: string;
  cover?: string;
  source?: string;
  chapterCount?: number;
  viewCount?: number;
}
/** 章节行（字段宽松 optional） */
interface ChapterRow {
  id?: string;
  title?: string;
  content?: string;
  translation?: string;
  annotation?: string;
}
/** 古籍统计面板数据 */
interface ClassicStats {
  totals?: { books?: number; chapters?: number; images?: number; commentaries?: number; annotations?: number };
  byCategory?: { category: string; count: number }[];
}

const books = ref<BookRow[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editingBook = ref<BookRow>({});
const categoryFilter = ref("");
const stats = ref<ClassicStats | null>(null);
const keyword = ref("");
// 运营操作 loading（防连点）
const seeding = ref(false);
const syncing = ref(false);
const vectorizing = ref(false);
const clearingCache = ref(false);

/** 书名/作者前端过滤（全库仅几十本，无需后端搜索） */
const filteredBooks = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return books.value;
  return books.value.filter((b) =>
    (b.title || "").toLowerCase().includes(kw) || (b.author || "").toLowerCase().includes(kw));
});

const form = reactive({ title: "", author: "", dynasty: "", category: "子", cover: "", source: "", intro: "" });

onMounted(() => { fetchBooks(); fetchStats(); });

async function fetchStats() {
  try {
    const { data } = await classicApi.getStats();
    stats.value = data;
  } catch { /* skip */ }
}

async function seedLibrary() {
  if (seeding.value) return;
  // L3 影响预告：生产写库操作
  try {
    await ElMessageBox.confirm(
      `将向古籍库写入种子数据（当前库中已有 ${stats.value?.totals?.books || 0} 本书、${stats.value?.totals?.chapters || 0} 个章节）。该操作直接写生产数据库，仅在初始化/补种时使用。确定执行？`,
      "初始化种子数据确认",
      { type: "warning", confirmButtonText: "确认执行", cancelButtonText: "取消" },
    );
  } catch { return; }
  seeding.value = true;
  try {
    await classicApi.seed();
    ElMessage.success("种子数据初始化完成");
    fetchBooks(); fetchStats();
  } catch { ElMessage.error("初始化失败，请重试"); } finally { seeding.value = false; }
}

async function syncKnowledge() {
  if (syncing.value) return;
  syncing.value = true;
  try {
    const { data } = await classicApi.syncKnowledge();
    ElMessage.success(`已同步 ${data?.synced || 0} 条`);
  } catch { ElMessage.error("同步失败，请重试"); } finally { syncing.value = false; }
}

async function vectorize() {
  if (vectorizing.value) return;
  vectorizing.value = true;
  try {
    const { data } = await classicApi.vectorize();
    ElMessage.success(`已向量化 ${data?.vectorized || 0} 条`);
  } catch { ElMessage.error("向量化失败，请重试"); } finally { vectorizing.value = false; }
}

async function clearCache() {
  if (clearingCache.value) return;
  clearingCache.value = true;
  try {
    await classicApi.clearCache();
    ElMessage.success("缓存已清除");
  } catch { ElMessage.error("清除失败，请重试"); } finally { clearingCache.value = false; }
}

async function fetchBooks() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { pageSize: 100 };
    if (categoryFilter.value) params.category = categoryFilter.value;
    const { data } = await classicApi.list(params);
    books.value = data.items || data.books || [];
  } catch {
    ElMessage.error("加载古籍列表失败");
  } finally {
    loading.value = false;
  }
}

function openEdit(row?: BookRow) {
  editingBook.value = row || {};
  if (row) {
    Object.assign(form, { title: row.title, author: row.author || "", dynasty: row.dynasty || "", category: row.category || "子", cover: row.cover || "", source: row.source || "", intro: row.intro || "" });
  } else {
    Object.assign(form, { title: "", author: "", dynasty: "", category: "子", cover: "", source: "", intro: "" });
  }
  dialogVisible.value = true;
}

async function saveBook() {
  if (!form.title.trim()) {
    ElMessage.warning("请输入书名");
    return;
  }
  saving.value = true;
  try {
    if (editingBook.value.id) {
      await classicApi.update(editingBook.value.id, { ...form });
      ElMessage.success("已更新");
    } else {
      await classicApi.create({ ...form });
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    fetchBooks();
  } catch {
    // 原 catch 内只赋值局部变量属死代码，用户点保存失败无任何反馈
    ElMessage.error("保存失败，请重试");
  } finally {
    saving.value = false;
  }
}

function delBook(id: string) {
  ElMessageBox.confirm("确定删除？", "警告", { type: "warning" }).then(async () => {
    await classicApi.remove(id);
    fetchBooks();
    ElMessage.success("已删除");
  }).catch(() => {});
}

// ── 章节管理 ──
const chapterVisible = ref(false);
const chEditVisible = ref(false);
const chapters = ref<ChapterRow[]>([]);
const currentBookId = ref("");
const chForm = reactive({ id: "", title: "", content: "", translation: "", annotation: "" });

async function openChapters(row: BookRow) {
  currentBookId.value = row.id!;
  try {
    const { data } = await classicApi.getChapters(row.id!);
    // 修复：该端点返回裸数组（classic.service listChaptersByBook），
    // 此前只取 data.items/data.chapters 恒为空 → 有章节的书也显示"暂无章节"
    chapters.value = Array.isArray(data) ? data : data.items || data.chapters || [];
    chapterVisible.value = true;
  } catch {
    ElMessage.error("章节列表加载失败，请重试");
  }
}

function editChapter(row?: ChapterRow) {
  if (row) {
    Object.assign(chForm, { id: row.id, title: row.title, content: row.content, translation: row.translation || "", annotation: row.annotation || "" });
  } else {
    Object.assign(chForm, { id: "", title: "", content: "", translation: "", annotation: "" });
  }
  chEditVisible.value = true;
}

async function saveChapter() {
  if (!chForm.title.trim() || !chForm.content.trim()) {
    ElMessage.warning("章节标题和原文不能为空");
    return;
  }
  saving.value = true;
  try {
    if (chForm.id) {
      await classicApi.updateChapter(chForm.id, { title: chForm.title, content: chForm.content, translation: chForm.translation, annotation: chForm.annotation });
    } else {
      await classicApi.addChapter(currentBookId.value, { title: chForm.title, content: chForm.content, translation: chForm.translation, annotation: chForm.annotation, sortOrder: chapters.value.length });
    }
    chEditVisible.value = false;
    ElMessage.success("已保存");
    openChapters({ id: currentBookId.value });
  } catch {
    // 原 catch 内只赋值局部变量属死代码，保存失败无反馈
    ElMessage.error("章节保存失败，请重试");
  } finally {
    saving.value = false;
  }
}

async function delChapter(id: string) {
  ElMessageBox.confirm("确定删除？", "警告", { type: "warning" }).then(async () => {
    await classicApi.deleteChapter(id);
    openChapters({ id: currentBookId.value });
    ElMessage.success("已删除");
  }).catch(() => {});
}
</script>

<style scoped>
.classic-page { padding: 0; }

/* 统计面板 */
.stats-panel {
  display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
}
.stat-item {
  background: var(--color-bg-card); border-radius: 8px; padding: 16px 24px;
  text-align: center; min-width: 100px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.stat-num { font-size: 24px; font-weight: bold; color: var(--color-text-title); display: block; }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; display: block; }

.cat-dist { margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
.cat-chip {
  background: #f5ede2; color: var(--color-text-title); padding: 2px 12px;
  border-radius: 12px; font-size: 12px;
}

.filter-bar { margin-bottom: 12px; }
</style>
