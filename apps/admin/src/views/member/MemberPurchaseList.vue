<template>
  <div class="page">
    <div class="toolbar">
      <h3>会员购买记录</h3>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="user.nickname"
        label="用户"
        width="140"
      />
      <el-table-column
        prop="user.phone"
        label="手机号"
        width="140"
      />
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.memberType === 'LIFETIME' ? 'danger' : row.memberType === 'YEARLY' ? 'warning' : ''"
            size="small"
          >
            {{ row.memberType === 'MONTHLY' ? '月卡' : row.memberType === 'YEARLY' ? '年卡' : row.memberType === 'LIFETIME' ? '永久' : row.memberType }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="金额"
        width="100"
      >
        <template #default="{ row }">
          {{ row.amount > 0 ? '¥' + Number(row.amount).toFixed(2) : '手动授予' }}
        </template>
      </el-table-column>
      <el-table-column
        label="到期时间"
        width="180"
      >
        <template #default="{ row }">
          {{ row.expireAt ? formatDate(row.expireAt) : '永久有效' }}
        </template>
      </el-table-column>
      <el-table-column
        label="购买时间"
        width="180"
      >
        <template #default="{ row }">
          {{ formatDate(row.paidAt) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="id"
        label="订单ID"
        min-width="200"
        show-overflow-tooltip
      />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { memberAdminApi } from '@/api'

const loading = ref(false); const list = ref<any[]>([]); const total = ref(0); const page = ref(1)

onMounted(() => fetchList())
function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchList() {
  loading.value = true
  try {
    const { data } = await memberAdminApi.getPurchases({ page: page.value, pageSize: 20 })
    list.value = data.items || data.data || []; total.value = data.total || 0
  } catch { list.value = [] } finally { loading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
