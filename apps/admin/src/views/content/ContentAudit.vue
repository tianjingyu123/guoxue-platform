<template>
  <div class="audit-page">
    <div class="toolbar">
      <h3>内容审核中心</h3>
      <div>
        <el-button type="success" :disabled="selected.length === 0" @click="batchApprove">批量通过</el-button>
        <el-button type="danger" :disabled="selected.length === 0" @click="batchReject">批量拒绝</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="fetchList">
      <el-tab-pane label="待审核" name="PENDING" />
      <el-tab-pane label="已通过" name="APPROVED" />
      <el-tab-pane label="已拒绝" name="REJECTED" />
    </el-tabs>

    <el-table v-loading="loading" :data="list" stripe @selection-change="handleSelection">
      <el-table-column type="selection" width="45" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="typeTag(row.type)">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="作者" width="120">
        <template #default="{ row }">{{ row.author?.nickname || row.user?.nickname || '-' }}</template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <template v-if="activeTab === 'PENDING'">
            <el-button size="small" type="success" @click="approveOne(row)">通过</el-button>
            <el-button size="small" type="danger" @click="rejectOne(row)">拒绝</el-button>
          </template>
          <el-button size="small" @click="preview(row)">查看</el-button>
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
    <el-dialog v-model="rejectVisible" title="拒绝原因" width="450px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写拒绝原因（必填）" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :disabled="!rejectReason.trim()" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 预览抽屉 -->
    <el-drawer v-model="drawerVisible" title="内容预览" size="600px">
      <div v-if="currentItem" class="preview-body">
        <h2>{{ currentItem.title }}</h2>
        <p class="meta">作者：{{ currentItem.author?.nickname || currentItem.user?.nickname || '-' }} | {{ formatDate(currentItem.createdAt) }}</p>
        <div class="content" v-html="currentItem.content || currentItem.intro || currentItem.detail || '暂无内容'" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contentApi, courseApi, auditApi } from '@/api'

const loading = ref(false)
const activeTab = ref('PENDING')
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const selected = ref<any[]>([])

const rejectVisible = ref(false)
const rejectReason = ref('')
const pendingItem = ref<any>(null)

const drawerVisible = ref(false)
const currentItem = ref<any>(null)

onMounted(() => fetchList())

function typeLabel(t: string) {
  const map: Record<string, string> = { ARTICLE: '文章', POEM: '诗词', CLASSIC: '古籍', COURSE: '课程', VIDEO: '视频', POST: '帖子' }
  return map[t] || t
}
function typeTag(t: string) {
  const map: Record<string, string> = { ARTICLE: '', POEM: 'success', CLASSIC: 'warning', COURSE: 'danger', VIDEO: 'info', POST: '' }
  return map[t] || ''
}
function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function handleSelection(rows: any[]) { selected.value = rows }

async function fetchList() {
  loading.value = true
  try {
    // 聚合多种内容类型的待审列表
    const [contents, courses] = await Promise.all([
      contentApi.list({ page: page.value, pageSize: 10, status: activeTab.value }),
      courseApi.list({ page: page.value, pageSize: 10, status: activeTab.value }).catch(() => ({ data: { courses: [], total: 0 } })),
    ])
    const items = [
      ...(contents.data.contents || contents.data.data || []).map((c: any) => ({ ...c, type: c.type || 'ARTICLE' })),
      ...((courses.data?.courses || []).map((c: any) => ({ ...c, type: 'COURSE', title: c.title || c.name, content: c.intro }))),
    ]
    list.value = items
    total.value = items.length
  } finally { loading.value = false }
}

function approveOne(row: any) {
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

function rejectOne(row: any) {
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

function preview(row: any) {
  currentItem.value = row
  drawerVisible.value = true
}
</script>

<style scoped>
.audit-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.preview-body h2 { color: #333; margin-bottom: 8px; }
.preview-body .meta { color: #999; font-size: 13px; margin-bottom: 16px; }
.preview-body .content { line-height: 1.8; color: #444; }
</style>
