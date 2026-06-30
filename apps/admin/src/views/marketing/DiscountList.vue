<template>
  <div class="page">
    <div class="toolbar">
      <h3>限时折扣</h3><el-button
        type="primary"
        @click="openCreate"
      >
        创建折扣
      </el-button>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        <span style="font-size:13px">展示位置：<b>商品详情页</b>显示折扣标签、<b>购物车</b>自动计算折后价。创建后即生效。</span>
      </template>
    </el-alert>
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="进行中"
            :value="activeCount"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="已停用"
            :value="inactiveCount"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="折扣总数"
            :value="list.length"
          />
        </el-card>
      </el-col>
    </el-row>
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
        label="活动名称"
        min-width="150"
      />
      <el-table-column
        label="折扣率"
        width="80"
      >
        <template #default="{ row }">
          {{ row.discountPct }}%
        </template>
      </el-table-column>
      <el-table-column
        label="适用范围"
        min-width="160"
      >
        <template #default="{ row }">
          <template v-if="!(row.productIds || []).length && !(row.courseIds || []).length && !(row.circleIds || []).length">
            全部
          </template>
          <template v-else>
            <span v-if="(row.productIds || []).length">商品×{{ row.productIds.length }} </span>
            <span v-if="(row.courseIds || []).length">课程×{{ row.courseIds.length }} </span>
            <span v-if="(row.circleIds || []).length">圈子×{{ row.circleIds.length }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusType(row.status)"
            size="small"
          >
            {{ statusLabel(row.status) }}
          </el-tag>
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
        width="220"
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
            v-if="row.status === 'DRAFT'"
            size="small"
            type="success"
            @click="activate(row.id)"
          >
            启用
          </el-button>
          <el-button
            v-if="row.status === 'ACTIVE'"
            size="small"
            type="warning"
            @click="deactivate(row.id)"
          >
            停用
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

    <el-dialog
      v-model="vis"
      :title="editingId ? '编辑折扣' : '创建折扣'"
      width="500px"
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
        <el-form-item label="适用商品">
          <ProductPicker
            v-model="form.productIds"
            multiple
            placeholder="留空则全场商品参与"
          />
        </el-form-item>
        <el-form-item label="适用课程">
          <el-select
            v-model="form.courseIds"
            multiple
            filterable
            remote
            reserve-keyword
            :remote-method="searchCourses"
            :loading="courseSearchLoading"
            placeholder="留空不参与"
            clearable
            style="width:100%"
          >
            <el-option
              v-for="c in courseOptions"
              :key="c.id"
              :label="c.title"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="适用圈子">
          <el-select
            v-model="form.circleIds"
            multiple
            filterable
            remote
            reserve-keyword
            :remote-method="searchCircles"
            :loading="circleSearchLoading"
            placeholder="留空不参与"
            clearable
            style="width:100%"
          >
            <el-option
              v-for="c in circleOptions"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="折扣率(%)">
          <el-input-number
            v-model="form.discountPct"
            :min="1"
            :max="99"
            :step="5"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          v-if="editingId"
          label="状态"
        >
          <el-select
            v-model="form.status"
            style="width:100%"
          >
            <el-option
              label="草稿"
              value="DRAFT"
            />
            <el-option
              label="进行中"
              value="ACTIVE"
            />
            <el-option
              label="已结束"
              value="ENDED"
            />
          </el-select>
        </el-form-item>
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
          </el-col><el-col :span="12">
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketingApi, courseApi, circleApi } from '@/api'
import ProductPicker from '@/components/ProductPicker.vue'

// 微页面下拉选项
interface PageOption { id: string; name?: string }
// axios 错误体
interface ApiError { response?: { data?: { message?: string } } }
// 课程/圈子远程搜索选项
interface CourseOption { id: string; title?: string }
interface CircleOption { id: string; name?: string }
// 限时折扣行：依据表格列与编辑表单访问字段声明
interface DiscountRow {
  id: string
  name?: string
  discountPct?: number
  productIds?: string[]
  courseIds?: string[]
  circleIds?: string[]
  status?: string
  startTime?: string
  endTime?: string
  scope?: string
  scopePageId?: string
}

const loading = ref(false); const error = ref(false); const saving = ref(false); const list = ref<DiscountRow[]>([]); const total = ref(0); const page = ref(1); const pages = ref<PageOption[]>([])
const vis = ref(false); const editingId = ref('')
const form = reactive<{ name: string; productIds: string[]; courseIds: string[]; circleIds: string[]; discountPct: number; status: string; startTime: string; endTime: string; scope: string; scopePageId: string }>({ name: '', productIds: [], courseIds: [], circleIds: [], discountPct: 85, status: 'DRAFT', startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' })

const courseOptions = ref<CourseOption[]>([]); const courseSearchLoading = ref(false)
const circleOptions = ref<CircleOption[]>([]); const circleSearchLoading = ref(false)

onMounted(() => { fetchList(); loadPages() })
async function loadPages() { try { const { data } = await marketingApi.listPages(); pages.value = data.pages || data.items || data.data || [] } catch { /* 忽略 */ } }
const activeCount = computed(() => list.value.filter((d: DiscountRow) => d.status === 'ACTIVE').length)
const inactiveCount = computed(() => list.value.filter((d: DiscountRow) => d.status !== 'ACTIVE').length)

function statusType(s: string) {
  const m: Record<string, string> = { DRAFT: 'info', ACTIVE: 'success', ENDED: 'warning' }
  return m[s] || 'info'
}
function statusLabel(s: string) {
  const m: Record<string, string> = { DRAFT: '草稿', ACTIVE: '进行中', ENDED: '已结束' }
  return m[s] || s
}
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function searchCourses(query: string) {
  courseSearchLoading.value = true
  try { const { data } = await courseApi.list({ keyword: query, pageSize: 20 }); courseOptions.value = data.items || data.data || [] } catch { courseOptions.value = [] } finally { courseSearchLoading.value = false }
}
async function searchCircles(query: string) {
  circleSearchLoading.value = true
  try { const { data } = await circleApi.list({ keyword: query, pageSize: 20 }); circleOptions.value = data.items || data.data || [] } catch { circleOptions.value = [] } finally { circleSearchLoading.value = false }
}

async function fetchList() {
  loading.value = true; error.value = false
  try { const { data } = await marketingApi.listDiscounts({ page: page.value, pageSize: 20 }); list.value = data.items || data.data || []; total.value = data.total || 0 } catch { list.value = []; error.value = true } finally { loading.value = false }
}
function openCreate() { editingId.value = ''; Object.assign(form, { name: '', productIds: [], courseIds: [], circleIds: [], discountPct: 85, status: 'DRAFT', startTime: '', endTime: '', scope: 'GLOBAL', scopePageId: '' }); courseOptions.value = []; circleOptions.value = []; vis.value = true }
function openEdit(row: DiscountRow) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    productIds: [...(row.productIds || [])],
    courseIds: [...(row.courseIds || [])],
    circleIds: [...(row.circleIds || [])],
    discountPct: row.discountPct,
    status: row.status || 'DRAFT',
    startTime: row.startTime || '',
    endTime: row.endTime || '',
    scope: row.scope || 'GLOBAL',
    scopePageId: row.scopePageId || '',
  })
  courseOptions.value = []; circleOptions.value = []
  vis.value = true
}
async function save() {
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      name: form.name,
      discountPct: form.discountPct,
      productIds: form.productIds.length ? form.productIds : undefined,
      courseIds: form.courseIds.length ? form.courseIds : undefined,
      circleIds: form.circleIds.length ? form.circleIds : undefined,
      scope: form.scope, scopePageId: form.scope === 'PAGE_ONLY' ? form.scopePageId : undefined,
    }
    if (form.startTime) payload.startTime = new Date(form.startTime).toISOString()
    if (form.endTime) payload.endTime = new Date(form.endTime).toISOString()
    if (editingId.value) {
      if (form.status) payload.status = form.status
      await marketingApi.updateDiscount(editingId.value, payload)
    } else {
      await marketingApi.createDiscount(payload)
    }
    ElMessage.success(editingId.value ? '已更新' : '折扣活动创建成功'); vis.value = false; fetchList()
  } catch (e) { ElMessage.error((e as ApiError)?.response?.data?.message || '操作失败') } finally { saving.value = false }
}
async function activate(id: string) { try { await marketingApi.updateDiscount(id, { status: 'ACTIVE' }); ElMessage.success('已启用'); fetchList() } catch { ElMessage.error('启用失败') } }
async function deactivate(id: string) { try { await marketingApi.updateDiscount(id, { status: 'ENDED' }); ElMessage.success('已停用'); fetchList() } catch { ElMessage.error('操作失败') } }
async function del(id: string) { try { await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }); await marketingApi.deleteDiscount(id); ElMessage.success('已删除'); fetchList() } catch { /* 用户取消 */ } }
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
