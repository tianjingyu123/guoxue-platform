<template>
  <div class="page">
    <div class="header">
      <h2>运营商收益</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          plain
          @click="goWithdrawals"
        >
          提现审核
        </el-button>
        <el-button
          :loading="loading"
          @click="refresh"
        >
          刷新数据
        </el-button>
      </div>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:20px"
    >
      <template #title>
        本页为运营商团队收益看板（只读）。站长 / 运营商的佣金提现审核（通过 / 拒绝 / 打款）请前往「提现审核」处理。
      </template>
    </el-alert>

    <!-- 概览卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:20px"
    >
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            本月团队佣金
          </div>
          <div
            class="stat-value"
            style="color:var(--color-warning)"
          >
            ¥{{ fmt(overview.monthTeamEarned) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            本月团队成交额
          </div>
          <div class="stat-value">
            ¥{{ fmt(overview.monthTeamAmount) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            本月团队订单数
          </div>
          <div class="stat-value">
            {{ overview.monthTeamOrders }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            名额使用
          </div>
          <div class="stat-value">
            {{ overview.quotaUsed }} / {{ overview.quotaTotal }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 站长状态 -->
    <el-row
      :gutter="16"
      style="margin-bottom:20px"
    >
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            名下站长总数
          </div>
          <div class="stat-value">
            {{ overview.totalStations }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            活跃站长
          </div>
          <div
            class="stat-value"
            style="color:var(--color-success)"
          >
            {{ overview.activeStations }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            沉默站长
          </div>
          <div
            class="stat-value"
            style="color:var(--color-error)"
          >
            {{ overview.silentStations }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">
            名额剩余
          </div>
          <div
            class="stat-value"
            style="color:var(--color-info)"
          >
            {{ (overview.quotaTotal || 0) - (overview.quotaUsed || 0) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 站长业绩排行 -->
    <el-card>
      <template #header>
        <span>名下站长业绩排行 Top10</span>
      </template>
      <el-table
        v-loading="loading"
        :data="ranking"
        stripe
      >
        <el-table-column
          type="index"
          label="#"
          width="60"
        />
        <el-table-column
          prop="name"
          label="站长名称"
          min-width="140"
        />
        <el-table-column
          label="累计收益"
          width="140"
        >
          <template #default="{ row }">
            ¥{{ fmt(row.totalEarning) }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ACTIVE' ? 'success' : 'info'"
              size="small"
            >
              {{ row.status === 'ACTIVE' ? '活跃' : '沉默' }}
            </el-tag>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败' : '暂无站长业绩数据'">
            <el-button
              v-if="loadError"
              type="primary"
              @click="refresh"
            >
              重试
            </el-button>
          </el-empty>
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { operatorDashboardApi } from '@/api'

const router = useRouter()
function goWithdrawals() {
  // 复用已有的提现审核页（/commission/withdrawals），按路由名跳转，不改路由配置
  router.push({ name: 'WithdrawalList' })
}

const loading = ref(false)
const loadError = ref(false)
const overview = reactive({
  monthTeamEarned: 0, monthTeamAmount: 0, monthTeamOrders: 0,
  totalStations: 0, activeStations: 0, silentStations: 0,
  quotaUsed: 0, quotaTotal: 0,
})
const ranking = ref<any[]>([])

function fmt(v: any) { return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

async function refresh() {
  loading.value = true
  loadError.value = false
  try {
    const [ov, rk] = await Promise.all([
      operatorDashboardApi.overview(),
      operatorDashboardApi.teamRanking(),
    ])
    Object.assign(overview, ov.data)
    ranking.value = rk.data?.ranking || []
  } catch {
    loadError.value = true
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.header-actions { display: flex; gap: 8px; }
.stat-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 600; }
</style>
