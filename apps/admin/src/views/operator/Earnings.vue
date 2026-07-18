<template>
  <div class="page">
    <div class="header">
      <h2>运营商收益（平台视角）</h2>
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
        本页为全平台运营商汇总看板（只读）。站长 / 运营商的佣金提现审核（通过 / 拒绝 / 打款）请前往「提现审核」处理。
      </template>
    </el-alert>

    <!-- 端点未部署/无权限降级说明 -->
    <el-result
      v-if="unavailable"
      icon="warning"
      title="平台视角端点待部署"
      sub-title="全平台运营商汇总接口（/station/admin/operators-overview）当前不可用，可能是后端尚未部署该端点或当前账号无权限。请稍后重试或联系技术。"
    >
      <template #extra>
        <el-button
          type="primary"
          :loading="loading"
          @click="refresh"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <el-result
      v-else-if="loadError"
      icon="error"
      title="加载失败"
      sub-title="获取运营商汇总数据失败，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          :loading="loading"
          @click="refresh"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 概览卡片 -->
      <el-row
        v-loading="loading"
        :gutter="16"
        style="margin-bottom:20px"
      >
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="stat-label">
              运营商总数
            </div>
            <div class="stat-value">
              {{ overview.totalOperators }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="stat-label">
              活跃运营商
            </div>
            <div
              class="stat-value"
              style="color:var(--color-success)"
            >
              {{ overview.activeOperators }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="stat-label">
              线上 / 线下
            </div>
            <div class="stat-value">
              {{ overview.onlineOperators }} / {{ overview.offlineOperators }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="stat-label">
              名下分站总数
            </div>
            <div class="stat-value">
              {{ overview.totalStations }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row
        :gutter="16"
        style="margin-bottom:20px"
      >
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="stat-label">
              本月管理奖合计
            </div>
            <div
              class="stat-value"
              style="color:var(--color-warning)"
            >
              ¥{{ fmt(overview.monthMgmtEarned) }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="stat-label">
              本月管理奖笔数
            </div>
            <div class="stat-value">
              {{ overview.monthMgmtOrders }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 运营商业绩 Top 榜 -->
      <el-card>
        <template #header>
          <span>运营商本月管理奖 Top10</span>
        </template>
        <el-table
          v-loading="loading"
          :data="topList"
          stripe
        >
          <el-table-column
            type="index"
            label="#"
            width="60"
          />
          <el-table-column
            label="运营商"
            min-width="160"
          >
            <template #default="{ row }">
              {{ row.brandName || row.nickname || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="渠道"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.channelType === 'OFFLINE' ? 'warning' : 'info'"
                size="small"
              >
                {{ row.channelType === 'OFFLINE' ? '线下' : '线上' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'ACTIVE' ? 'success' : 'info'"
                size="small"
              >
                {{ row.status === 'ACTIVE' ? '正常' : row.status === 'DISABLED' ? '禁用' : '—' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="名下分站"
            width="90"
            align="right"
          >
            <template #default="{ row }">
              {{ row.stationCount ?? 0 }}
            </template>
          </el-table-column>
          <el-table-column
            label="本月管理奖"
            width="140"
            align="right"
          >
            <template #default="{ row }">
              ¥{{ fmt(row.monthEarned) }}
            </template>
          </el-table-column>
          <el-table-column
            label="本月笔数"
            width="90"
            align="right"
          >
            <template #default="{ row }">
              {{ row.monthOrders ?? 0 }}
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="本月暂无运营商管理奖记录" />
          </template>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 运营商收益（平台视角）
 * 2026-07-18 改造：原先误接运营商自视角端点（operator-dashboard/overview 需 Operator 身份，
 * admin 调用恒 403 报错）→ 改接平台汇总新契约 GET /station/admin/operators-overview。
 * 端点 403/404 时诚实降级说明"平台视角端点待部署"。
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'

const router = useRouter()
function goWithdrawals() {
  // 复用已有的提现审核页（/commission/withdrawals），按路由名跳转，不改路由配置
  router.push({ name: 'WithdrawalList' })
}

const loading = ref(false)
const loadError = ref(false)
// 端点 403/404：后端未部署新契约或无权限，与一般报错区分展示
const unavailable = ref(false)

const overview = reactive({
  totalOperators: 0,
  activeOperators: 0,
  onlineOperators: 0,
  offlineOperators: 0,
  totalStations: 0,
  monthMgmtEarned: 0,
  monthMgmtOrders: 0,
})

/** Top 榜行（对齐 operators-overview 返回体 top[]） */
interface TopRow {
  operatorId?: string
  brandName?: string | null
  nickname?: string | null
  channelType?: string
  level?: string | null
  status?: string | null
  stationCount?: number
  monthEarned?: number
  monthOrders?: number
}
const topList = ref<TopRow[]>([])

function fmt(v: number | undefined) { return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

async function refresh() {
  loading.value = true
  loadError.value = false
  unavailable.value = false
  try {
    const { data } = await api.get('/station/admin/operators-overview', { params: { top: 10 } })
    overview.totalOperators = data.totalOperators || 0
    overview.activeOperators = data.activeOperators || 0
    overview.onlineOperators = data.onlineOperators || 0
    overview.offlineOperators = data.offlineOperators || 0
    overview.totalStations = data.totalStations || 0
    overview.monthMgmtEarned = data.monthMgmtEarned || 0
    overview.monthMgmtOrders = data.monthMgmtOrders || 0
    topList.value = data.top || []
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status === 403 || status === 404) unavailable.value = true
    else loadError.value = true
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
