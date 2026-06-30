<template>
  <div class="page">
    <div class="toolbar">
      <h3>优惠券模板</h3><el-button
        type="primary"
        @click="openCreate"
      >
        创建模板
      </el-button>
    </div>
    <el-alert
      v-if="error"
      type="error"
      title="数据加载失败"
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
    >
      <el-table-column
        prop="name"
        label="模板名称"
        min-width="140"
      />
      <el-table-column
        label="类型"
        width="90"
      >
        <template #default="{ row }">
          {{ typeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        label="面额"
        width="100"
      >
        <template #default="{ row }">
          {{ row.type === 'PERCENT' ? Number(row.faceValue) + '%' : '¥' + Number(row.faceValue).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column
        label="门槛"
        width="90"
      >
        <template #default="{ row }">
          {{ row.threshold ? '¥' + Number(row.threshold) : '无' }}
        </template>
      </el-table-column>
      <el-table-column
        label="已领/总量"
        width="90"
      >
        <template #default="{ row }">
          {{ row.claimedCount || 0 }}/{{ row.totalCount === 0 ? '∞' : row.totalCount }}
        </template>
      </el-table-column>
      <el-table-column
        label="有效期"
        width="280"
      >
        <template #default="{ row }">
          {{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="300"
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
            type="success"
            @click="openGrant(row)"
          >
            发放
          </el-button>
          <el-button
            size="small"
            @click="openRecords(row)"
          >
            记录
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="del(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="error ? '加载失败，请重试' : '暂无数据'" />
      </template>
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

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑模板' : '创建模板'"
      width="550px"
    >
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item
          label="名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型">
              <el-select
                v-model="form.type"
                style="width:100%"
              >
                <el-option
                  label="满减券"
                  value="FIXED"
                />
                <el-option
                  label="折扣券"
                  value="PERCENT"
                />
                <el-option
                  label="免邮券"
                  value="SHIPPING"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面额/折扣">
              <el-input-number
                v-model="form.faceValue"
                :min="0.01"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="门槛金额">
              <el-input-number
                v-model="form.threshold"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发放总量">
              <el-input-number
                v-model="form.totalCount"
                :min="0"
                :step="100"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="展示范围">
          <el-radio-group v-model="form.scope">
            <el-radio value="GLOBAL">
              全平台
            </el-radio><el-radio value="PAGE_ONLY">
              仅指定微页面
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="form.scope === 'PAGE_ONLY'"
          label="关联微页面"
        >
          <el-select
            v-model="form.scopePageId"
            placeholder="选择微页面"
            clearable
            style="width:100%"
          >
            <el-option
              v-for="p in pages"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
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

    <!-- 发放弹窗 -->
    <el-dialog
      v-model="grantVis"
      title="发放优惠券"
      width="480px"
    >
      <div v-if="grantTarget">
        <p><b>模板：</b>{{ grantTarget.name }}</p>
        <el-form label-width="90px">
          <el-form-item label="发放方式">
            <el-radio-group v-model="grantMode">
              <el-radio value="single">
                单个用户
              </el-radio>
              <el-radio value="batch">
                批量用户
              </el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item
            v-if="grantMode === 'single'"
            label="用户ID"
          >
            <el-input
              v-model="grantUserId"
              placeholder="输入用户ID"
            />
          </el-form-item>
          <el-form-item
            v-if="grantMode === 'batch'"
            label="用户ID列表"
          >
            <el-input
              v-model="grantUserIds"
              type="textarea"
              :rows="4"
              placeholder="每行一个用户ID"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="grantVis = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="granting"
          @click="doGrant"
        >
          确认发放
        </el-button>
      </template>
    </el-dialog>

    <!-- 发放记录弹窗 -->
    <el-dialog
      v-model="recordsVis"
      title="发放记录"
      width="650px"
    >
      <el-table
        v-loading="recordsLoading"
        :data="records"
        stripe
        max-height="400"
      >
        <el-table-column
          prop="userId"
          label="用户ID"
          width="120"
        />
        <el-table-column
          prop="userName"
          label="用户名"
          width="120"
        />
        <el-table-column
          label="状态"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.status === 'USED' ? 'success' : row.status === 'EXPIRED' ? 'danger' : 'info'"
            >
              {{ recordStatusMap[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="领取时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无发放记录" />
        </template>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi } from '@/api'

const loading = ref(false); const error = ref(false); const saving = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1); const pages = ref<any[]>([])
const vis = ref(false); const editingId = ref('')
const form = reactive({ name: '', type: 'FIXED', faceValue: 10, threshold: 100, totalCount: 0, startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' })

const grantVis = ref(false); const granting = ref(false); const grantTarget = ref<any>(null)
const grantMode = ref('single'); const grantUserId = ref(''); const grantUserIds = ref('')

const recordsVis = ref(false); const records = ref<any[]>([]); const recordsLoading = ref(false)
const recordStatusMap: Record<string, string> = { USED: '已使用', UNUSED: '未使用', EXPIRED: '已过期' }

function typeLabel(t: string) {
  const m: Record<string, string> = { FIXED: '满减', PERCENT: '折扣', SHIPPING: '免邮' }
  return m[t] || t
}

onMounted(() => { fetchList(); loadPages() })
async function loadPages() { try { const { data } = await marketingApi.listPages(); pages.value = data.pages || data.items || data.data || [] } catch { /* 忽略 */ } }
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true; error.value = false
  try { const { data } = await marketingApi.listCoupons({ page: page.value, pageSize: 20 }); list.value = data.coupons || data.data || []; total.value = data.total || 0 } catch { list.value = []; error.value = true } finally { loading.value = false }
}

function openCreate() { editingId.value = ''; Object.assign(form, { name: '', type: 'FIXED', faceValue: 10, threshold: 100, totalCount: 0, startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' }); vis.value = true }

function openEdit(row: any) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name, type: row.type,
    faceValue: Number(row.faceValue || 0),
    threshold: Number(row.threshold || 0),
    totalCount: row.totalCount ?? 0,
    startTime: row.startTime || '', endTime: row.endTime || '',
    scope: row.scope || 'GLOBAL', scopePageId: row.scopePageId || '',
  })
  vis.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      name: form.name, type: form.type,
      faceValue: form.faceValue, threshold: form.threshold || undefined,
      totalCount: form.totalCount,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      scope: form.scope, scopePageId: form.scope === 'PAGE_ONLY' ? form.scopePageId : undefined,
    }
    if (editingId.value) { await marketingApi.updateCoupon(editingId.value, payload) }
    else { await marketingApi.createCoupon(payload) }
    ElMessage.success('已保存'); vis.value = false; fetchList()
  } catch { } finally { saving.value = false }
}

async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteCoupon(id); ElMessage.success('已删除'); fetchList() } catch {} }

function openGrant(row: any) { grantTarget.value = row; grantMode.value = 'single'; grantUserId.value = ''; grantUserIds.value = ''; grantVis.value = true }

async function doGrant() {
  granting.value = true
  try {
    const templateId = grantTarget.value.id
    if (grantMode.value === 'single') {
      await marketingApi.grantCoupon(templateId, { userId: grantUserId.value })
    } else {
      const ids = grantUserIds.value.split('\n').map((s: string) => s.trim()).filter(Boolean)
      await marketingApi.batchGrantCoupon(templateId, { userIds: ids })
    }
    ElMessage.success('发放成功'); grantVis.value = false
  } catch { } finally { granting.value = false }
}

async function openRecords(row: any) {
  recordsVis.value = true; recordsLoading.value = true
  try { const { data } = await marketingApi.getCouponRecords(row.id); records.value = data.records || data.data || [] } catch { records.value = [] } finally { recordsLoading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
