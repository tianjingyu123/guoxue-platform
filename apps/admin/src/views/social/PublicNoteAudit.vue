<template>
  <div class="page">
    <PageHeader title="公开笔记审核" />

    <SearchFilter
      ref="searchRef"
      :filters="filters"
      :custom-filters="filterDefs"
      placeholder="搜索笔记内容或用户"
      @search="onSearch"
      @reset="onReset"
    />

    <el-card>
      <el-result v-if="loadError && !loading" icon="error" title="加载失败" sub-title="请检查网络后重试">
        <template #extra><el-button type="primary" @click="fetchList">重试</el-button></template>
      </el-result>
      <template v-else>
      <el-table :data="tableData" border stripe v-loading="loading">
        <template #empty><el-empty description="暂无公开笔记" :image-size="80" /></template>
        <el-table-column prop="userName" label="用户" width="140" />
        <el-table-column prop="content" label="笔记内容" minWidth="240" show-overflow-tooltip />
        <el-table-column label="所属课程" width="160">
          <template #default="{ row }">
            <span v-if="row.courseName" style="font-size:13px">{{ row.courseName }}</span>
            <span v-else style="color:#ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="所属古籍" width="140">
          <template #default="{ row }">
            <span v-if="row.classicName" style="font-size:13px">{{ row.classicName }}</span>
            <span v-else style="color:#ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusColor(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="敏感词" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.sensitiveWords" size="small" type="danger">{{ row.sensitiveWords }}</el-tag>
            <span v-else style="color:#67c23a">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="150">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button size="small" type="success" :loading="submitting" @click="approveNote(row)">通过</el-button>
              <el-button size="small" type="danger" @click="showRejectDialog(row)">拒绝</el-button>
              <el-button size="small" type="warning" :loading="submitting" @click="featureNote(row)">推荐</el-button>
            </template>
            <el-button v-if="row.status === 'APPROVED'" size="small" text type="warning" :loading="submitting" @click="featureNote(row)">
              {{ row.isFeatured ? '取消推荐' : '推荐' }}
            </el-button>
            <el-popconfirm title="确定删除?" @confirm="deleteNote(row.id)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchList"
        @size-change="fetchList"
      />
      </template>
    </el-card>

    <!-- 拒绝弹窗 -->
    <el-dialog v-model="rejectVisible" title="拒绝公开笔记" width="420px">
      <el-form>
        <el-form-item label="拒绝原因">
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="填写拒绝原因（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { socialApi } from "@/api"
import SearchFilter from "@/components/SearchFilter.vue"
import DataTable from "@/components/DataTable.vue"
import PageHeader from "@/components/PageHeader.vue"
import { useTable } from "@/composables/useTable"

// 公开笔记行（字段宽松 optional）
interface NoteRow {
  id: string
  userName?: string
  content?: string
  courseName?: string
  classicName?: string
  status?: string
  sensitiveWords?: string
  createdAt?: string
  isFeatured?: boolean
  user?: { nickname?: string }
  course?: { title?: string }
  classic?: { title?: string }
}

const rejectVisible = ref(false)
const rejectReason = ref("")
const rejectingNote = ref<NoteRow | null>(null)
const loadError = ref(false)
const submitting = ref(false)

const filterDefs = [
  { key: "status", label: "状态", type: "select" as const, options: [
    { label: "全部", value: "" }, { label: "待审核", value: "PENDING" },
    { label: "已通过", value: "APPROVED" }, { label: "已拒绝", value: "REJECTED" },
  ]},
  { key: "courseId", label: "课程ID", type: "input" as const },
  { key: "userId", label: "用户ID", type: "input" as const },
]

const columns = [
  { prop: "userName", label: "用户", width: 140 },
  { prop: "content", label: "笔记内容", minWidth: 240, showOverflow: true },
  { prop: "courseName", label: "所属课程", width: 160 },
  { prop: "classicName", label: "所属古籍", width: 140 },
  { prop: "status", label: "状态", width: 100, slot: "status" },
  { prop: "createdAt", label: "创建时间", width: 150, slot: "createdAt" },
]

const { loading, tableData, pagination, filters, fetchList, handleSearch } = useTable({
  fetchApi: async (params: any) => {
    loadError.value = false
    try {
      return await socialApi.listPublicNotes(params)
    } catch (e) {
      loadError.value = true
      throw e
    }
  },
  defaultPageSize: 10,
  transformResponse: (data: any) => ({
    items: (data.list ?? data.data ?? []).map((n: NoteRow) => ({
      ...n, userName: n.user?.nickname ?? '未知', courseName: n.course?.title ?? '', classicName: n.classic?.title ?? '',
    })),
    total: data.total ?? 0,
  }),
})

function onSearch(f: Record<string, any>) { Object.assign(filters, f); handleSearch() }
function onReset() { Object.keys(filters).forEach(k => { (filters as any)[k] = undefined }); handleSearch() }
function formatTime(d: string): string { return d ? d.slice(0, 16).replace("T", " ") : "" }
function statusLabel(s: string): string { const m: Record<string, string> = { PENDING: "待审核", APPROVED: "已通过", REJECTED: "已拒绝" }; return m[s] ?? s }
function statusColor(s: string): string { const m: Record<string, string> = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" }; return m[s] ?? "" }

async function approveNote(row: NoteRow) {
  if (submitting.value) return
  submitting.value = true
  try { await socialApi.approveNote(row.id); ElMessage.success("已通过"); fetchList() }
  catch { /* */ }
  finally { submitting.value = false }
}
function showRejectDialog(row: NoteRow) { rejectingNote.value = row; rejectReason.value = ""; rejectVisible.value = true }
async function confirmReject() {
  if (submitting.value) return
  submitting.value = true
  try { await socialApi.rejectNote(rejectingNote.value!.id, rejectReason.value); ElMessage.success("已拒绝"); rejectVisible.value = false; fetchList() }
  catch { /* */ }
  finally { submitting.value = false }
}
async function featureNote(row: NoteRow) {
  if (submitting.value) return
  submitting.value = true
  try { await socialApi.featureNote(row.id); ElMessage.success(row.isFeatured ? "已取消推荐" : "已推荐"); fetchList() }
  catch { /* */ }
  finally { submitting.value = false }
}
async function deleteNote(id: string) {
  if (submitting.value) return
  submitting.value = true
  try { await socialApi.deleteNote(id); ElMessage.success("已删除"); fetchList() }
  catch { /* */ }
  finally { submitting.value = false }
}
</script>

<style scoped>
.page { padding: 0; }
</style>
