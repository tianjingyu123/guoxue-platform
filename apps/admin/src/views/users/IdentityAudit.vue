<template>
  <div class="identity-page">
    <div class="toolbar"><h3>实名认证审核</h3></div>

    <el-tabs v-model="activeTab" @tab-change="fetchList">
      <el-tab-pane label="待审核" name="PENDING" />
      <el-tab-pane label="已通过" name="APPROVED" />
      <el-tab-pane label="已驳回" name="REJECTED" />
    </el-tabs>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="用户" min-width="120">
        <template #default="{ row }">{{ row.user?.nickname || row.user?.phone || row.userId }}</template>
      </el-table-column>
      <el-table-column prop="realName" label="真实姓名" width="100" />
      <el-table-column prop="idCard" label="身份证号" width="180">
        <template #default="{ row }">{{ maskIdCard(row.idCard) }}</template>
      </el-table-column>
      <el-table-column label="证件照片" width="100">
        <template #default="{ row }">
          <el-button v-if="row.idCardFront" size="small" @click="previewImage(row.idCardFront)">查看</el-button>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <template v-if="activeTab === 'PENDING'">
            <el-button size="small" type="success" @click="approve(row)">通过</el-button>
            <el-button size="small" type="danger" @click="reject(row)">驳回</el-button>
          </template>
          <span v-else-if="row.rejectReason" class="reject-reason">原因：{{ row.rejectReason }}</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :total="total" :page-size="20"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />

    <el-dialog v-model="rejectVisible" title="驳回原因" width="450px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写驳回原因" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :disabled="!rejectReason.trim()" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="imageVisible" title="证件照片" width="500px">
      <img :src="previewUrl" style="width:100%">
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { identityApi } from '@/api'

const loading = ref(false)
const activeTab = ref('PENDING')
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)

const rejectVisible = ref(false)
const rejectReason = ref('')
const pendingId = ref('')

const imageVisible = ref(false)
const previewUrl = ref('')

onMounted(() => fetchList())

function maskIdCard(card: string) {
  if (!card) return '-'
  return card.substring(0, 3) + '****' + card.substring(card.length - 4)
}
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const { data } = await identityApi.list({ page: page.value, pageSize: 20, status: activeTab.value })
    list.value = data.list || data.data || []
    total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function approve(row: any) {
  identityApi.approve(row.id).then(() => { ElMessage.success('已通过'); fetchList() })
}
function reject(row: any) {
  pendingId.value = row.id
  rejectReason.value = ''
  rejectVisible.value = true
}
async function confirmReject() {
  await identityApi.reject(pendingId.value, rejectReason.value.trim())
  ElMessage.success('已驳回')
  rejectVisible.value = false
  fetchList()
}
function previewImage(url: string) {
  previewUrl.value = url
  imageVisible.value = true
}
</script>

<style scoped>
.identity-page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.reject-reason { color: #C41E3A; font-size: 12px; }
</style>
