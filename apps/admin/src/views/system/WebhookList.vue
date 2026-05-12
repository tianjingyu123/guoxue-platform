<template>
  <div class="page">
    <div class="toolbar">
      <h3>Webhook 管理</h3>
      <el-button type="primary" @click="openRegister">注册订阅</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="事件类型" width="160">
        <template #default="{ row }">{{ eventLabel(row.event) }}</template>
      </el-table-column>
      <el-table-column prop="url" label="回调URL" min-width="250" />
      <el-table-column prop="description" label="备注" min-width="150" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后发送" width="160">
        <template #default="{ row }">{{ row.lastSentAt ? fmt(row.lastSentAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="最后状态" width="80">
        <template #default="{ row }">{{ row.lastStatus || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text :type="row.isActive ? 'warning' : 'success'" @click="toggle(row)">
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" text type="danger" @click="del(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="注册 Webhook" width="550px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="事件类型" required>
          <el-select v-model="form.event" style="width:100%">
            <el-option v-for="e in EVENT_OPTIONS" :key="e.value" :label="e.label" :value="e.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="回调URL" required><el-input v-model="form.url" placeholder="https://example.com/webhook" /></el-form-item>
        <el-form-item label="签名密钥"><el-input v-model="form.secret" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.description" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doRegister">注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { webhookApi } from '@/api'

const EVENT_OPTIONS = [
  { label: '订单支付', value: 'ORDER_PAID' }, { label: '订单退款', value: 'ORDER_REFUNDED' },
  { label: '用户注册', value: 'USER_REGISTERED' }, { label: '内容发布', value: 'CONTENT_PUBLISHED' },
  { label: '提现申请', value: 'WITHDRAWAL_REQUESTED' }, { label: '课程报名', value: 'COURSE_ENROLLED' },
  { label: '直播开始', value: 'LIVE_STARTED' }, { label: '直播结束', value: 'LIVE_ENDED' },
]
const EVENT_MAP = Object.fromEntries(EVENT_OPTIONS.map(e => [e.value, e.label]))
function eventLabel(v: string) { return EVENT_MAP[v] || v }

const list = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const form = ref({ event: 'ORDER_PAID', url: '', secret: '', description: '' })

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try { const res = await webhookApi.list(); list.value = (res.data as any) || [] }
  finally { loading.value = false }
}

function openRegister() { form.value = { event: 'ORDER_PAID', url: '', secret: '', description: '' }; dialogVisible.value = true }

async function doRegister() {
  if (!form.value.url) { ElMessage.warning('请输入回调URL'); return }
  saving.value = true
  try { await webhookApi.register(form.value); ElMessage.success('已注册'); dialogVisible.value = false; fetchList() }
  catch (e: any) { }
  finally { saving.value = false }
}

async function toggle(row: any) {
  try { await webhookApi.toggle(row.id, !row.isActive); ElMessage.success(row.isActive ? '已禁用' : '已启用'); fetchList() }
  catch (e: any) { }
}

async function del(id: string) {
  try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await webhookApi.unregister(id); ElMessage.success('已删除'); fetchList() } catch {}
}
</script>

<style scoped>
.page { padding: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
</style>
