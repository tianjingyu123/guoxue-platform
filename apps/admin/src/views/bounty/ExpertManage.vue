<template>
  <div class="page">
    <div class="header">
      <h2>专家管理</h2>
      <el-button @click="refresh" :loading="loading" :disabled="!selectedCircle">刷新列表</el-button>
    </div>

    <!-- 圈子选择 -->
    <el-form inline style="margin-bottom:16px">
      <el-form-item label="选择圈子">
        <el-select v-model="selectedCircle" placeholder="选择圈子查看达人" @change="onCircleChange" clearable style="width:280px">
          <el-option v-for="c in circles" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="showConfigDialog = true" :disabled="!selectedCircle">
          配置达人价格
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 达人列表 -->
    <el-card v-if="selectedCircle">
      <template #header>
        <span>达人列表（{{ experts.length }} 人）</span>
      </template>
      <el-table :data="experts" v-loading="loading" stripe empty-text="该圈子暂无达人">
        <el-table-column width="50">
          <template #default="{ row }">
            <el-avatar v-if="row.user?.avatar" :src="row.user.avatar" size="small" />
            <el-avatar v-else size="small">{{ (row.user?.nickname || '?')[0] }}</el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="user.nickname" label="昵称" min-width="120" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 'OWNER' ? 'danger' : row.role === 'PARTNER' ? 'warning' : 'info'">
              {{ row.role === 'OWNER' ? '圈主' : row.role === 'PARTNER' ? '合伙人' : '嘉宾' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提问价格（币/次）" width="140">
          <template #default="{ row }">{{ row.questionPriceCoin || '-' }}</template>
        </el-table-column>
        <el-table-column label="连麦价格（币/分钟）" width="150">
          <template #default="{ row }">{{ row.callPricePerMinuteCoin || '-' }}</template>
        </el-table-column>
        <el-table-column label="可连麦时段" min-width="160">
          <template #default="{ row }">
            <template v-if="row.callAvailableHours && row.callAvailableHours.length">
              <el-tag v-for="(h, i) in row.callAvailableHours" :key="i" size="small" style="margin:2px">
                {{ h.day }} {{ h.start }}-{{ h.end }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openConfig(row)">配置</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-empty v-else description="请先选择一个圈子" />

    <!-- 配置弹窗 -->
    <el-dialog v-model="showConfigDialog" title="配置达人价格" width="480px" @closed="resetConfigForm">
      <el-form :model="configForm" label-width="120px" :rules="configRules">
        <el-form-item label="选择成员" required>
          <el-select v-model="configForm.userId" placeholder="选择要配置的成员" filterable style="width:100%">
            <el-option v-for="m in members" :key="m.userId" :label="`${m.user?.nickname || m.userId} (${roleLabel(m.role)})`" :value="m.userId" />
          </el-select>
        </el-form-item>
        <el-form-item label="提问价格（币）">
          <el-input-number v-model="configForm.questionPriceCoin" :min="0" :step="1" style="width:100%" />
        </el-form-item>
        <el-form-item label="连麦价格（币/分）">
          <el-input-number v-model="configForm.callPricePerMinuteCoin" :min="0" :step="1" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { circleApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const showConfigDialog = ref(false)
const selectedCircle = ref('')
const circles = ref<any[]>([])
const experts = ref<any[]>([])
const members = ref<any[]>([])

const configForm = reactive({ userId: '', questionPriceCoin: 0, callPricePerMinuteCoin: 0 })
const configRules = {}

function roleLabel(role: string) {
  return role === 'OWNER' ? '圈主' : role === 'PARTNER' ? '合伙人' : role === 'GUEST' ? '嘉宾' : role
}

async function loadCircles() {
  try {
    const res = await circleApi.list({ page: 1, pageSize: 100 })
    circles.value = res.data?.circles || res.data?.list || res.data || []
  } catch { /* ignore */ }
}

async function onCircleChange() {
  await Promise.all([refresh(), loadMembers()])
}

async function loadMembers() {
  if (!selectedCircle.value) return
  try {
    const res = await circleApi.detail(selectedCircle.value)
    members.value = (res.data?.members || []).filter(
      (m: any) => ['OWNER', 'PARTNER', 'GUEST'].includes(m.role)
    )
  } catch { members.value = [] }
}

function resetConfigForm() {
  configForm.userId = ''
  configForm.questionPriceCoin = 0
  configForm.callPricePerMinuteCoin = 0
}

function openConfig(row: any) {
  configForm.userId = row.userId
  configForm.questionPriceCoin = row.questionPriceCoin || 0
  configForm.callPricePerMinuteCoin = row.callPricePerMinuteCoin || 0
  showConfigDialog.value = true
}

async function submitConfig() {
  if (!configForm.userId) { ElMessage.warning('请选择成员'); return }
  saving.value = true
  try {
    await circleApi.setExpertConfig(selectedCircle.value, {
      questionPriceCoin: configForm.questionPriceCoin,
      callPricePerMinuteCoin: configForm.callPricePerMinuteCoin,
    })
    ElMessage.success('配置已保存')
    showConfigDialog.value = false
    await refresh()
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

async function refresh() {
  if (!selectedCircle.value) return
  loading.value = true
  try {
    const res = await circleApi.listExperts(selectedCircle.value)
    experts.value = res.data || []
  } catch { experts.value = [] }
  finally { loading.value = false }
}

onMounted(loadCircles)
</script>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: #8b4513; }
</style>
