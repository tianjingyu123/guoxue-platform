<template>
  <div class="page">
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
      title="历史体系（只读归档）：本模板体系发放的券不与商城下单核销打通，已停止新建与发放，仅保留查询。发券请到「商城 → 优惠券管理」，该处发放的券可直接下单抵扣。"
    />
    <div class="toolbar">
      <h3>优惠券模板（历史归档）</h3>
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
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            size="small"
            @click="openRecords(row)"
          >
            发放记录
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
// 历史优惠券模板体系：只读归档（不再提供新建/编辑/发放/删除·发券走「商城 → 优惠券管理」）
import { ref, onMounted } from 'vue'
import { marketingApi } from '@/api'

// 优惠券模板行：依据表格列访问字段声明
interface CouponRow {
  id: string
  name?: string
  type?: string
  faceValue?: number | string
  threshold?: number | string
  claimedCount?: number
  totalCount?: number
  startTime?: string
  endTime?: string
}
// 发放记录行
interface CouponRecordRow {
  userId?: string
  userName?: string
  status?: string
  createdAt?: string
}

const loading = ref(false); const error = ref(false); const list = ref<CouponRow[]>([]); const total = ref(0); const page = ref(1)

const recordsVis = ref(false); const records = ref<CouponRecordRow[]>([]); const recordsLoading = ref(false)
const recordStatusMap: Record<string, string> = { USED: '已使用', UNUSED: '未使用', EXPIRED: '已过期' }

function typeLabel(t: string) {
  const m: Record<string, string> = { FIXED: '满减', PERCENT: '折扣', SHIPPING: '免邮' }
  return m[t] || t
}

onMounted(() => { fetchList() })
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true; error.value = false
  try { const { data } = await marketingApi.listCoupons({ page: page.value, pageSize: 20 }); list.value = data.items || data.coupons || data.data || []; total.value = data.total || 0 } catch { list.value = []; error.value = true } finally { loading.value = false }
}

async function openRecords(row: CouponRow) {
  recordsVis.value = true; recordsLoading.value = true
  try { const { data } = await marketingApi.getCouponRecords(row.id); records.value = data.items || data.records || data.data || [] } catch { records.value = [] } finally { recordsLoading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
