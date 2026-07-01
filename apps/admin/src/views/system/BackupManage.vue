<template>
  <div class="page">
    <div class="toolbar">
      <h3>数据库备份管理</h3><div>
        <el-button
          type="primary"
          :loading="backingUp"
          @click="manualBackup"
        >
          手动备份
        </el-button><el-button
          :loading="uploading"
          @click="uploadToCos"
        >
          上传到COS
        </el-button>
      </div>
    </div>

    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <b>最新备份状态</b>
          </template>
          <div
            v-if="latest"
            style="display:flex;flex-direction:column;gap:8px"
          >
            <div>
              <el-tag
                :type="latest.status === 'SUCCESS' ? 'success' : 'danger'"
                size="small"
              >
                {{ latest.status || '未知' }}
              </el-tag>
            </div>
            <div>时间：{{ formatDate(latest.createdAt) }}</div>
            <div v-if="latest.size">
              大小：{{ formatSize(latest.size) }}
            </div>
            <div v-if="latest.filePath">
              路径：{{ latest.filePath }}
            </div>
          </div>
          <div
            v-else
            style="color:var(--color-text-secondary)"
          >
            暂无备份记录
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败，请重试"
      style="margin-bottom:12px"
    >
      <el-button
        size="small"
        @click="fetchList"
      >
        重试
      </el-button>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <template #empty>
        <el-empty description="暂无备份记录" />
      </template>
      <el-table-column
        label="文件名"
        min-width="250"
      >
        <template #default="{ row }">
          {{ row.fileName || row.filePath }}
        </template>
      </el-table-column>
      <el-table-column
        label="大小"
        width="100"
      >
        <template #default="{ row }">
          {{ formatSize(row.size) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'SUCCESS' ? 'success' : 'danger'"
            size="small"
          >
            {{ row.status || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        width="180"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'

interface BackupItem {
  fileName?: string
  filePath?: string
  size?: number
  status?: string
  createdAt?: string
}

const loading = ref(false); const loadError = ref(false); const backingUp = ref(false); const uploading = ref(false)
const list = ref<BackupItem[]>([]); const latest = ref<BackupItem | null>(null)

onMounted(() => { fetchList(); fetchLatest() })
function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }
function formatSize(bytes?: number) {
  if (!bytes && bytes !== 0) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function fetchLatest() {
  try { const { data } = await api.get('/system/backup/latest'); latest.value = data } catch { latest.value = null }
}

async function fetchList() {
  loading.value = true
  loadError.value = false
  try { const { data } = await api.get('/system/backup/list'); list.value = data.items || data.files || data.data || [] } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

async function manualBackup() {
  backingUp.value = true
  try { await api.post('/system/backup/manual'); ElMessage.success('备份任务已触发，请稍后查看状态'); fetchLatest() } catch { } finally { backingUp.value = false }
}

async function uploadToCos() {
  uploading.value = true
  try { await api.post('/system/backup/upload-cos'); ElMessage.success('COS上传任务已触发'); fetchLatest() } catch { } finally { uploading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
