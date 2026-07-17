<template>
  <div class="page">
    <div class="toolbar">
      <h3>会员购买记录</h3>
      <div class="toolbar-actions">
        <el-select
          v-model="typeFilter"
          placeholder="类型筛选"
          clearable
          style="width:130px"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="月卡"
            value="MONTHLY"
          />
          <el-option
            label="季卡"
            value="QUARTERLY"
          />
          <el-option
            label="年卡"
            value="YEARLY"
          />
          <el-option
            label="永久"
            value="LIFETIME"
          />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="购买开始"
          end-placeholder="购买结束"
          style="width:260px"
          value-format="YYYY-MM-DD"
        />
        <el-button
          :disabled="!filteredList.length"
          @click="exportData"
        >
          导出当前页
        </el-button>
        <el-button @click="fetchList">
          刷新
        </el-button>
      </div>
    </div>
    <p
      v-if="typeFilter || (dateRange && dateRange.length === 2)"
      class="filter-note"
    >
      筛选作用于已加载的当前页（服务端筛选待后端支持，已记后端待办清单）：当前页 {{ list.length }} 条中匹配 {{ filteredList.length }} 条。
    </p>

    <el-table
      v-loading="loading"
      :data="filteredList"
      stripe
    >
      <el-table-column
        prop="user.nickname"
        label="用户"
        width="140"
        show-overflow-tooltip
      />
      <el-table-column
        label="手机号"
        width="140"
      >
        <template #default="{ row }">
          {{ maskPhone(row.user?.phone) }}
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.memberType === 'LIFETIME' ? 'danger' : row.memberType === 'YEARLY' ? 'warning' : 'success'"
            size="small"
          >
            {{ typeLabel(row.memberType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="金额"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          {{ Number(row.amount) > 0 ? fmtAmount(row.amount) : '手动授予' }}
        </template>
      </el-table-column>
      <el-table-column
        label="到期时间"
        width="170"
      >
        <template #default="{ row }">
          {{ row.expireAt ? formatDate(row.expireAt) : '永久有效' }}
        </template>
      </el-table-column>
      <el-table-column
        label="购买时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.paidAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="订单ID"
        min-width="140"
      >
        <template #default="{ row }">
          <el-tooltip
            :content="(row.id || '') + '（点击复制）'"
            placement="top"
          >
            <span
              class="id-copy"
              @click="copyId(row.id)"
            >{{ (row.id || '').slice(0, 8) }}…</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="typeFilter || (dateRange && dateRange.length === 2) ? '当前筛选下无匹配记录，换个筛选条件试试' : '暂无购买记录'"
          :image-size="80"
        />
      </template>
    </el-table>

    <div style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { memberAdminApi } from '@/api'
import { exportCSV } from '@/utils/export'

/** 会员购买记录行（字段宽松 optional） */
interface MemberPurchaseRow {
  id?: string
  user?: { nickname?: string; phone?: string }
  memberType?: string
  amount?: number
  expireAt?: string
  paidAt?: string
}

const loading = ref(false); const list = ref<MemberPurchaseRow[]>([]); const total = ref(0); const page = ref(1)
const typeFilter = ref('')
const dateRange = ref<[string, string] | null>(null)

/** 后端 /member/admin/purchases 仅支持 page/pageSize（已亲核 controller），筛选在当前页客户端进行 */
const filteredList = computed(() => {
  let rows = list.value
  if (typeFilter.value) rows = rows.filter((r) => r.memberType === typeFilter.value)
  if (dateRange.value && dateRange.value.length === 2) {
    const from = new Date(dateRange.value[0] + 'T00:00:00').getTime()
    const to = new Date(dateRange.value[1] + 'T23:59:59.999').getTime()
    rows = rows.filter((r) => {
      if (!r.paidAt) return false
      const t = new Date(r.paidAt).getTime()
      return t >= from && t <= to
    })
  }
  return rows
})

const TYPE_LABEL: Record<string, string> = { MONTHLY: '月卡', QUARTERLY: '季卡', YEARLY: '年卡', LIFETIME: '永久' }
function typeLabel(t?: string) { return (t && TYPE_LABEL[t]) || t || '—' }

onMounted(() => fetchList())
function formatDate(d?: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '—' }
function fmtAmount(a?: number | string) {
  return '¥' + Number(a || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// 隐私脱敏：手机号保留前3后4（后端若已脱敏则原样展示）
function maskPhone(p?: string) {
  if (!p) return '—'
  const s = String(p)
  if (s.includes('*')) return s
  if (s.length < 7) return s.replace(/\d(?=\d)/g, '*')
  return s.slice(0, 3) + '****' + s.slice(-4)
}

async function copyId(id?: string) {
  if (!id) return
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('已复制订单ID')
  } catch { ElMessage.error('复制失败，请手动选择复制') }
}

async function fetchList() {
  loading.value = true
  try {
    const { data } = await memberAdminApi.getPurchases({ page: page.value, pageSize: 20 })
    list.value = data.items || data.data || []; total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}

function exportData() {
  exportCSV(
    '会员购买记录',
    [
      { label: '用户', key: 'nickname' },
      { label: '手机号', key: 'phoneMasked' },
      { label: '类型', key: 'typeText' },
      { label: '金额', key: 'amountText' },
      { label: '到期时间', key: 'expireText' },
      { label: '购买时间', key: 'paidText' },
      { label: '订单ID', key: 'id' },
    ],
    filteredList.value.map((r) => ({
      id: r.id,
      nickname: r.user?.nickname || '',
      phoneMasked: maskPhone(r.user?.phone),
      typeText: typeLabel(r.memberType),
      amountText: Number(r.amount) > 0 ? Number(r.amount).toFixed(2) : '手动授予',
      expireText: r.expireAt ? formatDate(r.expireAt) : '永久有效',
      paidText: formatDate(r.paidAt),
    })),
  )
}
</script>
<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.filter-note { margin: -8px 0 12px; font-size: 13px; color: var(--color-text-secondary); }
.id-copy { cursor: pointer; color: var(--el-color-primary); font-family: monospace; font-size: 13px; }
</style>
