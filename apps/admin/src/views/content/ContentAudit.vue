<template>
  <div class="audit-page">
    <div class="toolbar">
      <h3>内容审核中心</h3>
      <div>
        <el-button
          type="success"
          :disabled="selected.length === 0"
          @click="batchApprove"
        >
          批量通过
        </el-button>
        <el-button
          type="danger"
          :disabled="selected.length === 0"
          @click="batchReject"
        >
          批量拒绝
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row
      :gutter="12"
      style="margin-bottom:12px"
    >
      <el-col :span="4">
        <div class="stat-mini">
          <span class="v">{{ stats.pending }}</span><span class="l">待审核</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-mini">
          <span class="v">{{ stats.aiGenerated }}</span><span class="l">AI生成</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-mini">
          <span class="v">{{ stats.approvedToday }}</span><span class="l">今日通过</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-mini">
          <span class="v">{{ stats.rejectedToday }}</span><span class="l">今日拒绝</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div style="display:flex;gap:8px;align-items:center;height:100%">
          <el-select
            v-model="filterCategory"
            placeholder="按品类筛选"
            size="small"
            clearable
            style="width:150px"
            @change="fetchList"
          >
            <el-option
              v-for="c in categories"
              :key="c"
              :label="c"
              :value="c"
            />
          </el-select>
          <el-switch
            v-model="filterAiOnly"
            size="small"
            active-text="仅看AI"
            @change="fetchList"
          />
        </div>
      </el-col>
    </el-row>

    <el-tabs
      v-model="activeTab"
      @tab-change="fetchList"
    >
      <el-tab-pane
        label="待审核"
        name="PENDING"
      />
      <el-tab-pane
        label="AI生成"
        name="AI_GENERATED"
      />
      <el-tab-pane
        label="已通过"
        name="APPROVED"
      />
      <el-tab-pane
        label="已拒绝"
        name="REJECTED"
      />
    </el-tabs>

    <el-alert
      v-if="error"
      type="error"
      title="审核列表加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        type="primary"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      @selection-change="handleSelection"
    >
      <template #empty>
        <el-empty description="暂无待处理内容" />
      </template>
      <el-table-column
        type="selection"
        width="45"
      />
      <el-table-column
        label="类型"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="typeTag(row.type)"
          >
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="AI"
        width="55"
      >
        <template #default="{ row }">
          <el-tag
            v-if="isAiContent(row)"
            type="warning"
            size="small"
            effect="dark"
          >
            AI
          </el-tag>
          <span
            v-else
            style="color:#c0c4cc"
          >-</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="品类"
        width="100"
      >
        <template #default="{ row }">
          <span
            v-if="row.categoryLevel1"
            style="font-size:12px"
          >{{ row.categoryLevel1 }}</span>
          <span
            v-else
            style="color:#c0c4cc"
          >-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="作者"
        width="120"
      >
        <template #default="{ row }">
          {{ row.author?.nickname || row.user?.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="提交时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="240"
        fixed="right"
      >
        <template #default="{ row }">
          <template v-if="activeTab === 'PENDING'">
            <el-button
              size="small"
              type="success"
              @click="approveOne(row)"
            >
              通过
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="rejectOne(row)"
            >
              拒绝
            </el-button>
          </template>
          <el-button
            size="small"
            @click="preview(row)"
          >
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <!-- 拒绝原因对话框 -->
    <el-dialog
      v-model="rejectVisible"
      title="拒绝原因"
      width="450px"
    >
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="3"
        placeholder="请填写拒绝原因（必填）"
      />
      <template #footer>
        <el-button @click="rejectVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :disabled="!rejectReason.trim()"
          @click="confirmReject"
        >
          确认拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 预览抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="内容预览"
      size="600px"
    >
      <div
        v-if="currentItem"
        class="preview-body"
      >
        <h2>{{ currentItem.title }}</h2>
        <p class="meta">
          作者：{{ currentItem.author?.nickname || currentItem.user?.nickname || '-' }} | {{ formatDate(currentItem.createdAt) }}
        </p>
        <div
          class="content"
          v-html="sanitize(currentItem.content || currentItem.intro || currentItem.detail || '暂无内容')"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { sanitize } from '@/utils/sanitize'
import { contentApi, courseApi, auditApi, contentGenerationApi } from '@/api'
import { BRAND } from '@/lib/brand'

const AI_TAGS = ['基础知识库', '经典精华库', '玩法教程库', 'AI生成', 'AI互动'];

// 审核内容行（含文章/课程，字段宽松 optional）
interface ContentRow {
  id: string
  type?: string
  tags?: string[]
  title?: string
  name?: string
  categoryLevel1?: string
  status?: string
  content?: string
  intro?: string
  detail?: string
  createdAt?: string
  updatedAt?: string
  author?: { nickname?: string }
  user?: { nickname?: string }
}

const loading = ref(false)
const error = ref(false)
const activeTab = ref('PENDING')
const list = ref<ContentRow[]>([])
const total = ref(0)
const page = ref(1)
const selected = ref<ContentRow[]>([])
const filterCategory = ref('')
const filterAiOnly = ref(false)
const categories = ref<string[]>([])
const stats = reactive({ pending: 0, aiGenerated: 0, approvedToday: 0, rejectedToday: 0 })

const rejectVisible = ref(false)
const rejectReason = ref('')
const pendingItem = ref<ContentRow | null>(null)

const drawerVisible = ref(false)
const currentItem = ref<ContentRow | null>(null)

function isAiContent(row: ContentRow): boolean {
  const tags: string[] = row.tags || [];
  const title: string = row.title || '';
  return tags.some((t) => AI_TAGS.some((at) => t.includes(at))) ||
    title.includes('入门指南') || title.includes('名句精华') ||
    title.includes('教程') || title.includes('如何在' + BRAND.nameShort);
}

onMounted(() => {
  fetchList();
  loadCategories();
});

async function loadCategories() {
  try {
    const { data } = await contentGenerationApi.getCategories();
    categories.value = Object.keys(data || {});
  } catch { /* ignore */ }
}

function typeLabel(t: string) {
  const map: Record<string, string> = { ARTICLE: '文章', POEM: '诗词', CLASSIC: '古籍', COURSE: '课程', VIDEO: '视频', POST: '帖子' }
  return map[t] || t
}
function typeTag(t: string) {
  const map: Record<string, string> = { ARTICLE: '', POEM: 'success', CLASSIC: 'warning', COURSE: 'danger', VIDEO: 'info', POST: '' }
  return map[t] || ''
}
function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function handleSelection(rows: ContentRow[]) { selected.value = rows }

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const status = activeTab.value === 'AI_GENERATED' ? undefined : activeTab.value;

    const [contents, courses] = await Promise.all([
      contentApi.list({ page: page.value, pageSize: 50, status, keyword: filterCategory.value || undefined }),
      activeTab.value === 'AI_GENERATED' ? Promise.resolve({ data: { courses: [], total: 0 } }) :
        courseApi.list({ page: page.value, pageSize: 10, status }).catch(() => ({ data: { courses: [], total: 0 } })),
    ])
    let items: ContentRow[] = [
      ...(contents.data.contents || contents.data.data || []).map((c: ContentRow) => ({ ...c, type: c.type || 'ARTICLE' })),
      ...((courses.data?.courses || []).map((c: ContentRow) => ({ ...c, type: 'COURSE', title: c.title || c.name, content: c.intro }))),
    ];

    // AI生成筛选
    if (activeTab.value === 'AI_GENERATED' || filterAiOnly.value) {
      items = items.filter(isAiContent);
    }

    // 品类筛选
    if (filterCategory.value) {
      items = items.filter((c: ContentRow) => c.categoryLevel1 === filterCategory.value);
    }

    // 统计
    stats.pending = items.filter((c: ContentRow) => c.status === 'PENDING').length;
    stats.aiGenerated = items.filter(isAiContent).length;
    stats.approvedToday = items.filter((c: ContentRow) => {
      if (c.status !== 'APPROVED' && c.status !== 'PUBLISHED') return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return new Date(c.updatedAt || c.createdAt || '') >= today;
    }).length;
    stats.rejectedToday = items.filter((c: ContentRow) => {
      if (c.status !== 'REJECTED') return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return new Date(c.updatedAt || c.createdAt || '') >= today;
    }).length;

    list.value = items;
    total.value = items.length;
  } catch {
    error.value = true
    list.value = []
    total.value = 0
  } finally { loading.value = false }
}

function approveOne(row: ContentRow) {
  ElMessageBox.confirm('确定通过该内容？', '审核', { type: 'success' }).then(async () => {
    if (row.type === 'COURSE') {
      await courseApi.audit(row.id, 'APPROVED')
    } else {
      await contentApi.update(row.id, { status: 'APPROVED' })
    }
    ElMessage.success('已通过')
    fetchList()
  }).catch(() => {})
}

function rejectOne(row: ContentRow) {
  pendingItem.value = row
  rejectReason.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  if (!pendingItem.value || !rejectReason.value.trim()) return
  const row = pendingItem.value
  if (row.type === 'COURSE') {
    await courseApi.audit(row.id, 'REJECTED')
  } else {
    await contentApi.update(row.id, { status: 'REJECTED', auditReason: rejectReason.value.trim() })
  }
  ElMessage.success('已拒绝')
  rejectVisible.value = false
  fetchList()
}

async function batchApprove() {
  if (selected.value.length === 0) return
  ElMessageBox.confirm(`确定批量通过 ${selected.value.length} 条内容？`, '批量审核', { type: 'success' }).then(async () => {
    for (const row of selected.value) {
      if (row.type === 'COURSE') {
        await courseApi.audit(row.id, 'APPROVED').catch(() => {})
      } else {
        await contentApi.update(row.id, { status: 'APPROVED' }).catch(() => {})
      }
    }
    ElMessage.success('批量通过完成')
    fetchList()
  }).catch(() => {})
}

function batchReject() {
  if (selected.value.length === 0) return
  pendingItem.value = null // 批量模式
  rejectReason.value = ''
  rejectVisible.value = true
}

function preview(row: ContentRow) {
  currentItem.value = row
  drawerVisible.value = true
}
</script>

<style scoped>
.audit-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-mini { background: var(--color-bg-page); border-radius: 6px; padding: 8px 12px; text-align: center; }
.stat-mini .v { display: block; font-size: 22px; font-weight: 700; color: var(--color-text-title); }
.stat-mini .l { display: block; font-size: 11px; color: var(--color-text-secondary); }
.preview-body h2 { color: var(--color-text-title); margin-bottom: 8px; }
.preview-body .meta { color: var(--color-text-secondary); font-size: 13px; margin-bottom: 16px; }
.preview-body .content { line-height: 1.8; color: #444; }
</style>
