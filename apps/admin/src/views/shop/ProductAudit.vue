<template>
  <div class="product-audit-page">
    <PageHeader title="商品品控巡检">
      <template #actions>
        <el-tag
          type="info"
          effect="plain"
        >
          事后抽查 · 违规下架
        </el-tag>
      </template>
    </PageHeader>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <DataTable
      v-model:page="page"
      :columns="columns"
      :data="products"
      :loading="loading"
      :total="total"
      :page-size="pageSize"
      actions-width="260"
      @change="fetchList"
    >
      <template #toolbar>
        <el-input
          v-model="keyword"
          placeholder="搜索商品名称"
          clearable
          style="width:200px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-select
          v-model="status"
          placeholder="全部状态"
          clearable
          style="width:140px"
          @change="onSearch"
        >
          <el-option
            label="在售"
            value="ON_SALE"
          />
          <el-option
            label="待审"
            value="PENDING"
          />
          <el-option
            label="已下架"
            value="OFF_SHELF"
          />
        </el-select>
        <el-select
          v-model="categoryId"
          placeholder="全部分类"
          clearable
          filterable
          style="width:180px"
          @change="onSearch"
        >
          <el-option
            v-for="c in categoryOptions"
            :key="c.id"
            :label="c.label"
            :value="c.id"
          />
        </el-select>
        <el-button
          type="primary"
          @click="onSearch"
        >
          查询
        </el-button>
        <el-button @click="resetFilter">
          重置
        </el-button>
      </template>

      <template #image="{ row }">
        <img
          v-if="row.images?.[0]"
          :src="row.images[0]"
          class="thumb"
        >
        <span
          v-else
          class="no-img"
        >无</span>
      </template>
      <template #price="{ row }">
        ¥{{ Number(row.price).toFixed(2) }}
      </template>
      <template #status="{ row }">
        <el-tag
          :type="statusType(row.status)"
          size="small"
        >
          {{ statusLabel(row.status) }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button
          v-if="row.status !== 'OFF_SHELF'"
          size="small"
          type="danger"
          @click="openModerate(row, 'takedown')"
        >
          违规下架
        </el-button>
        <el-button
          v-else
          size="small"
          type="success"
          @click="openModerate(row, 'restore')"
        >
          恢复上架
        </el-button>
        <el-button
          size="small"
          type="warning"
          plain
          @click="openModerate(row, 'warn')"
        >
          警告
        </el-button>
      </template>
    </DataTable>

    <!-- 处置弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="480px"
    >
      <div
        v-if="currentRow"
        class="moderate-body"
      >
        <p class="moderate-target">
          <b>商品：</b>{{ currentRow.title }}
        </p>
        <el-form label-width="72px">
          <el-form-item :label="action === 'restore' ? '备注' : '原因'">
            <el-input
              v-model="reason"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              :placeholder="reasonPlaceholder"
            />
          </el-form-item>
        </el-form>
        <el-alert
          v-if="action === 'takedown'"
          type="warning"
          :closable="false"
          show-icon
          title="下架后该商品将无法被购买，请填写违规原因以便追溯。"
        />
        <el-alert
          v-else-if="action === 'warn'"
          type="info"
          :closable="false"
          show-icon
          title="警告不改变上架状态，仅记录品控审计日志。"
        />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          :type="action === 'takedown' ? 'danger' : 'primary'"
          :loading="submitting"
          @click="confirmModerate"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import DataTable from '@/components/DataTable.vue'
import PageHeader from '@/components/PageHeader.vue'

type ModerateActionType = 'takedown' | 'restore' | 'warn'

/** 商品行（品控巡检，字段宽松 optional） */
interface ProductRow {
  id?: string
  title?: string
  price?: number | string
  stock?: number
  salesCount?: number
  status?: string
  images?: string[]
}

const products = ref<ProductRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const error = ref(false)
const submitting = ref(false)

const keyword = ref('')
const status = ref('')
const categoryId = ref('')
const categoryOptions = ref<{ id: string; label: string }[]>([])

const dialogVisible = ref(false)
const currentRow = ref<ProductRow | null>(null)
const action = ref<ModerateActionType>('takedown')
const reason = ref('')

const columns = [
  { prop: 'image', label: '图片', width: 80, slot: 'image' },
  { prop: 'title', label: '商品名', minWidth: 180, showOverflow: true },
  { prop: 'price', label: '价格', width: 110, slot: 'price' },
  { prop: 'stock', label: '库存', width: 70 },
  { prop: 'salesCount', label: '销量', width: 70 },
  { prop: 'status', label: '状态', width: 90, slot: 'status' },
]

const dialogTitle = computed(() =>
  ({ takedown: '违规下架', restore: '恢复上架', warn: '警告' } as Record<string, string>)[action.value] || '处置',
)
const reasonPlaceholder = computed(() => {
  if (action.value === 'takedown') return '请填写违规原因，如：商品图文涉及虚假宣传'
  if (action.value === 'warn') return '请填写警告说明'
  return '可填写恢复备注（选填）'
})

function statusLabel(s: string) {
  return ({ ON_SALE: '在售', PENDING: '待审', OFF_SHELF: '已下架' } as Record<string, string>)[s] || s
}
function statusType(s: string) {
  return ({ ON_SALE: 'success', PENDING: 'warning', OFF_SHELF: 'info' } as Record<string, string>)[s] || 'info'
}

onMounted(() => {
  fetchCategories()
  fetchList()
})

async function fetchCategories() {
  try {
    const { data } = await api.get('/shop/categories/tree')
    const opts: { id: string; label: string }[] = []
    for (const root of (data || [])) {
      opts.push({ id: root.id, label: root.name })
      for (const child of (root.children || [])) {
        opts.push({ id: child.id, label: `　${root.name} / ${child.name}` })
      }
    }
    categoryOptions.value = opts
  } catch {
    categoryOptions.value = []
  }
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, unknown> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (status.value) params.status = status.value
    if (categoryId.value) params.categoryId = categoryId.value
    const { data } = await api.get('/shop/products', { params })
    products.value = data.items || data.products || []
    total.value = data.total || 0
  } catch {
    products.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  fetchList()
}

function resetFilter() {
  keyword.value = ''
  status.value = ''
  categoryId.value = ''
  page.value = 1
  fetchList()
}

function openModerate(row: ProductRow, act: ModerateActionType) {
  currentRow.value = row
  action.value = act
  reason.value = ''
  dialogVisible.value = true
}

async function confirmModerate() {
  if (submitting.value || !currentRow.value) return
  if (action.value === 'takedown' && !reason.value.trim()) {
    ElMessage.warning('违规下架请填写原因')
    return
  }
  submitting.value = true
  try {
    await api.put(`/shop/admin/products/${currentRow.value.id}/moderate`, {
      action: action.value,
      reason: reason.value.trim() || undefined,
    })
    ElMessage.success(dialogTitle.value + '成功')
    dialogVisible.value = false
    fetchList()
  } catch {
    /* 错误已由 api 拦截器统一提示 */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.product-audit-page { padding: 0; }
.thumb { width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm, 4px); }
.no-img { color: var(--color-text-placeholder); font-size: 11px; }
.moderate-target { margin: 0 0 12px; color: var(--color-text-primary); }
.moderate-body :deep(.el-alert) { margin-top: 4px; }
</style>
