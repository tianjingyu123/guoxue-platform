<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <span class="card-title">功能权限审批</span>
      </template>

      <el-table v-loading="loading" :data="list" stripe empty-text="暂无待审核申请">
        <el-table-column prop="user.nickname" label="申请人" width="140" />
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ maskPhone(row.user?.phone) }}</template>
        </el-table-column>
        <el-table-column label="申请功能" width="130">
          <template #default="{ row }">{{ typeLabel(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="申请理由" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="申请时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="['SUPER_ADMIN','OPERATION_ADMIN']" type="success" size="small" @click="approve(row)">
              <el-icon><Check /></el-icon> 通过
            </el-button>
            <el-button v-permission="['SUPER_ADMIN','OPERATION_ADMIN']" type="danger" size="small" @click="reject(row)">
              <el-icon><Close /></el-icon> 拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 拒绝理由 -->
    <el-dialog v-model="showReject" title="拒绝申请" width="400px">
      <el-input
        v-model="rejectNote"
        type="textarea"
        :rows="3"
        placeholder="请输入拒绝理由（选填）"
      />
      <template #footer>
        <el-button @click="showReject = false">取消</el-button>
        <el-button type="danger" @click="doReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'
import { api } from '@/api'

const loading = ref(false)
const submitting = ref(false)
const list = ref<any[]>([])

// 隐私脱敏：手机号保留前3后4
function maskPhone(p?: string) {
  if (!p) return '-'
  const s = String(p)
  if (s.length < 7) return s.replace(/\d(?=\d)/g, '*')
  return s.slice(0, 3) + '****' + s.slice(-4)
}

const showReject = ref(false)
const rejectNote = ref('')
const rejectRow = ref<any>(null)

const TYPE_LABELS: Record<string, string> = {
  LIVE: '直播功能', VIDEO_UPLOAD: '视频上传',
  AUDIO_CALL: '语音连麦', VIDEO_CALL: '视频连麦',
  PAID_QA: '付费问答', VOICE_QA: '语音问答',
  BOT: '圈主助理机器人',
}
function typeLabel(t: string) { return TYPE_LABELS[t] || t }

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    const res: any = await api.get('/capabilities/pending')
    list.value = res?.data || res?.list || []
  } finally { loading.value = false }
}

async function approve(row: any) {
  if (submitting.value) return
  try {
    await ElMessageBox.confirm(
      `确定通过「${row.user?.nickname}」的${typeLabel(row.type)}申请？`,
      '通过审批',
      { type: 'warning' },
    )
    submitting.value = true
    await api.post(`/capabilities/review/${row.id}`, { approved: true })
    ElMessage.success(`已通过 ${row.user?.nickname} 的${typeLabel(row.type)}申请`)
    fetchList()
  } catch (e) { if (e !== 'cancel' && e !== 'close') ElMessage.error('操作失败') }
  finally { submitting.value = false }
}

function reject(row: any) {
  rejectRow.value = row
  rejectNote.value = ''
  showReject.value = true
}

async function doReject() {
  try {
    await api.post(`/capabilities/review/${rejectRow.value.id}`, { approved: false, note: rejectNote.value })
    ElMessage.success('已拒绝')
    showReject.value = false
    fetchList()
  } catch { ElMessage.error('操作失败') }
}
</script>

<style scoped>
.page { padding: 20px; }
.card-title { font-size: 16px; font-weight: 600; }
</style>
