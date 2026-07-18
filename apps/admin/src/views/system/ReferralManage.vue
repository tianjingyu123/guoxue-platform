<template>
  <div class="page">
    <div class="toolbar">
      <h3>推荐码管理</h3><el-button
        type="primary"
        @click="openCreate"
      >
        创建临时配置
      </el-button>
    </div>

    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="配置总数"
            :value="displayTotal"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="当前生效"
            :value="activeConfig ? 1 : 0"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="关于「分站ID / 运营商ID」"
      description="此处为系统内部标识（分站、运营商的唯一 ID），留空表示对全局生效。临时配置用于活动期内临时调整推荐分佣比例，到期自动失效。"
      style="margin-bottom:16px"
    />

    <!-- 当前生效 -->
    <el-card
      v-if="activeConfig"
      shadow="never"
      style="margin-bottom:16px;border-left:3px solid var(--color-success)"
    >
      <template #header>
        <b>当前生效的临时配置</b>
      </template>
      <el-descriptions
        :column="3"
        border
      >
        <el-descriptions-item label="分站ID">
          {{ activeConfig.stationId || '全局' }}
        </el-descriptions-item>
        <el-descriptions-item label="运营商ID">
          {{ activeConfig.operatorId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="佣金比例">
          {{ activeConfig.commissionRate }}%
        </el-descriptions-item>
        <el-descriptions-item label="有效期">
          {{ formatDate(activeConfig.validFrom) }} ~ {{ formatDate(activeConfig.validTo) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(activeConfig.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 配置列表 -->
    <el-tabs
      v-model="tab"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="全部配置"
        name="all"
      />
      <el-tab-pane
        label="历史记录"
        name="history"
      />
    </el-tabs>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      title="加载失败"
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
        <el-empty description="暂无推荐码配置" />
      </template>
      <el-table-column
        prop="stationId"
        label="分站ID"
        width="180"
      >
        <template #default="{ row }">
          {{ row.stationId || '全局' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="operatorId"
        label="运营商ID"
        width="180"
      >
        <template #default="{ row }">
          {{ row.operatorId || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="佣金比例"
        width="100"
      >
        <template #default="{ row }">
          {{ row.commissionRate }}%
        </template>
      </el-table-column>
      <el-table-column
        label="有效期"
        width="300"
      >
        <template #default="{ row }">
          {{ formatDate(row.validFrom) }} ~ {{ formatDate(row.validTo) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="tab === 'all'"
        label="操作"
        width="160"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="total > 20"
      style="margin-top:16px;display:flex;justify-content:flex-end"
    >
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑配置' : '创建配置'"
      width="500px"
    >
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item label="分站ID">
          <el-input
            v-model="form.stationId"
            placeholder="留空则为全局"
          />
        </el-form-item>
        <el-form-item label="运营商ID">
          <el-input
            v-model="form.operatorId"
            placeholder="留空则为全局"
          />
        </el-form-item>
        <el-form-item
          label="佣金比例(%)"
          required
        >
          <el-input-number
            v-model="form.commissionRate"
            :min="0"
            :max="100"
            :precision="1"
            style="width:100%"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.validFrom"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.validTo"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

// 推荐码临时配置行（字段依据列表列/详情/表单实际访问声明，宽松可选）
interface ReferralConfig {
  id?: string
  stationId?: string
  operatorId?: string
  commissionRate?: number
  validFrom?: string
  validTo?: string
  createdAt?: string
}

const loading = ref(false); const saving = ref(false); const loadError = ref(false); const list = ref<ReferralConfig[]>([]); const total = ref(0); const page = ref(1)
const vis = ref(false); const editingId = ref(''); const tab = ref('all')
const activeConfig = ref<ReferralConfig | null>(null)
const form = reactive({ stationId: '', operatorId: '', commissionRate: 10, validFrom: '', validTo: '' })

// 修「总数0/生效1」矛盾：生效配置来自独立接口，可能未计入列表 total，至少不低于生效数
const displayTotal = computed(() => Math.max(total.value, activeConfig.value ? 1 : 0))

onMounted(() => { fetchList(); fetchActive() })
function formatDate(d?: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchActive() {
  try { const { data } = await api.get('/admin/referral/temp-configs/active'); activeConfig.value = data } catch { activeConfig.value = null }
}

async function fetchList() {
  loading.value = true
  loadError.value = false
  const url = tab.value === 'history' ? '/admin/referral/temp-configs/history' : '/admin/referral/temp-configs'
  try { const { data } = await api.get(url, { params: { page: page.value, pageSize: 20 } }); list.value = data.items || data.data || []; total.value = data.total || 0 } catch { loadError.value = true; list.value = []; ElMessage.error('加载失败，请重试') } finally { loading.value = false }
}

function onTabChange() { page.value = 1; fetchList() }
function openCreate() { editingId.value = ''; Object.assign(form, { stationId: '', operatorId: '', commissionRate: 10, validFrom: '', validTo: '' }); vis.value = true }
function openEdit(row: ReferralConfig) {
  editingId.value = row.id ?? ''
  Object.assign(form, { stationId: row.stationId || '', operatorId: row.operatorId || '', commissionRate: row.commissionRate, validFrom: row.validFrom || '', validTo: row.validTo || '' })
  vis.value = true
}
async function save() {
  // L3：推荐分佣比例变更直接影响全站/分站的推广返佣金额
  const scope = form.stationId ? `分站「${form.stationId}」` : (form.operatorId ? `运营商「${form.operatorId}」` : '全局')
  const period = form.validFrom && form.validTo ? `${form.validFrom} ~ ${form.validTo}` : '未设有效期（长期生效）'
  try {
    await ElMessageBox.confirm(
      `即将保存推荐分佣临时配置：<div style="margin-top:6px">生效范围：<b>${scope}</b></div><div>佣金比例：<b style="color:var(--el-color-warning)">${form.commissionRate}%</b></div><div>有效期：${period}</div><div style="margin-top:6px;font-size:12px;color:var(--el-text-color-secondary)">生效后该范围内的推广返佣金额将按此比例计算，请确认比例无误。</div>`,
      '分佣配置保存确认',
      { type: 'warning', dangerouslyUseHTMLString: true, confirmButtonText: '确认保存' },
    )
  } catch { return }
  saving.value = true
  try {
    const payload = {
      commissionRate: form.commissionRate,
      stationId: form.stationId || undefined,
      operatorId: form.operatorId || undefined,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
    }
    if (editingId.value) { await api.put(`/admin/referral/temp-configs/${editingId.value}`, payload) }
    else { await api.post('/admin/referral/temp-configs', payload) }
    ElMessage.success('已保存'); vis.value = false; fetchList(); fetchActive()
  } catch { } finally { saving.value = false }
}
async function del(row: ReferralConfig) {
  const scope = row.stationId ? `分站「${row.stationId}」` : (row.operatorId ? `运营商「${row.operatorId}」` : '全局')
  try {
    await ElMessageBox.confirm(`确定删除该临时分佣配置（${scope}，佣金 ${row.commissionRate}%）？删除后该范围将回落至默认分佣规则。`, '删除确认', { type: 'warning', confirmButtonText: '确定删除' })
    await api.delete(`/admin/referral/temp-configs/${row.id}`); ElMessage.success('已删除'); fetchList(); fetchActive()
  } catch {}
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
