<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { riskApi } from '@/api'
import { exportCSV } from '@/utils/export'

const loading = ref(false)
const error = ref(false)
// list 直接保存后端按条件分页返回的行为日志
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const searchUserId = ref('')
const searched = ref(false)

const userInfo = ref<any>(null)

const dateRange = ref<[Date, Date] | null>(null)
const actionType = ref('')

// action 子串匹配，由后端 where.action.contains 过滤
const actionTypeOptions = [
  { label: '全部', value: '' },
  { label: '登录', value: 'LOGIN' },
  { label: '下单', value: 'ORDER' },
  { label: '内容操作', value: 'CONTENT' },
  { label: '支付', value: 'PAYMENT' },
  { label: '修改资料', value: 'PROFILE' },
  { label: '登出', value: 'LOGOUT' },
]

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

// 隐私脱敏：IP / 设备ID 后端未脱敏，前端展示时掩码
function maskIp(ip?: string): string {
  if (!ip) return '-'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`
  return ip.length > 6 ? ip.slice(0, 4) + '****' : '****'
}

function maskId(id?: string): string {
  if (!id) return '-'
  if (id.length <= 8) return id.slice(0, 2) + '****'
  return id.slice(0, 4) + '****' + id.slice(-4)
}

// 行为描述：UserBehaviorLog 无 description 字段，由 targetType/targetId/meta 拼装
function behaviorDesc(item: any): string {
  const parts: string[] = []
  if (item.targetType) parts.push(`${item.targetType}${item.targetId ? '#' + item.targetId : ''}`)
  if (item.meta && Object.keys(item.meta).length) parts.push(JSON.stringify(item.meta))
  return parts.join(' ') || '-'
}

// 筛选条件变化：回到第一页重新查询（后端过滤/分页）
function onFilterChange() {
  if (!searched.value) return
  page.value = 1
  fetchTimeline()
}

async function searchTimeline() {
  if (!searchUserId.value.trim()) {
    ElMessage.warning('请输入用户ID')
    return
  }
  searched.value = true
  page.value = 1
  await fetchTimeline()
}

async function fetchTimeline() {
  loading.value = true
  error.value = false
  try {
    const params: Record<string, any> = { page: page.value, pageSize: 20 }
    if (actionType.value) params.action = actionType.value
    if (dateRange.value) {
      params.dateFrom = dateRange.value[0].toISOString()
      params.dateTo = dateRange.value[1].toISOString()
    }
    const { data } = await riskApi.getUserTimeline(searchUserId.value.trim(), params)
    list.value = data.items ?? (Array.isArray(data) ? data : [])
    total.value = data.total ?? list.value.length
    // 后端联表返回用户基本信息（手机号已脱敏）
    userInfo.value = data.user ?? null
  } catch {
    list.value = []
    total.value = 0
    userInfo.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

function exportTimeline() {
  exportCSV(
    `用户行为轨迹_${searchUserId.value}`,
    [
      { label: '时间', key: 'createdAt' },
      { label: '行为类型', key: 'action' },
      { label: '描述', key: 'desc' },
      { label: '目标类型', key: 'targetType' },
      { label: '目标ID', key: 'targetId' },
      { label: 'IP', key: 'ip' },
      { label: '设备ID', key: 'deviceId' },
    ],
    list.value.map((item: any) => ({
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      action: item.action || '-',
      desc: behaviorDesc(item),
      targetType: item.targetType || '-',
      targetId: item.targetId || '-',
      ip: maskIp(item.ip),
      deviceId: maskId(item.deviceId),
    })),
  )
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>用户行为轨迹</h3>
      <el-button
        :disabled="!searched || list.length === 0"
        @click="exportTimeline"
      >
        导出
      </el-button>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchUserId"
        placeholder="输入用户ID"
        style="width:200px"
        clearable
        @keyup.enter="searchTimeline"
      />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width:260px"
        clearable
        @change="onFilterChange"
      />
      <el-select
        v-model="actionType"
        placeholder="行为类型"
        clearable
        style="width:140px"
        @change="onFilterChange"
      >
        <el-option
          v-for="a in actionTypeOptions"
          :key="a.value"
          :label="a.label"
          :value="a.value"
        />
      </el-select>
      <el-button
        type="primary"
        :loading="loading"
        @click="searchTimeline"
      >
        查询
      </el-button>
    </div>

    <!-- 用户信息卡片（后端联表返回，手机号已脱敏） -->
    <div
      v-if="userInfo"
      class="user-card"
    >
      <el-descriptions
        :column="3"
        border
        size="small"
      >
        <el-descriptions-item label="昵称">
          <span style="font-weight:600">{{ userInfo.nickname || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="用户ID">
          {{ userInfo.id || searchUserId }}
        </el-descriptions-item>
        <el-descriptions-item label="手机号">
          {{ userInfo.phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="账号状态">
          <el-tag
            :type="userInfo.status === 'ACTIVE' ? 'success' : 'danger'"
            size="small"
          >
            {{ userInfo.status || '-' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="注册时间">
          {{ formatDate(userInfo.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="行为记录数">
          {{ total }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 错误态 -->
    <el-empty
      v-if="error"
      description="加载失败，请重试"
    >
      <el-button
        type="primary"
        @click="searchTimeline"
      >
        重试
      </el-button>
    </el-empty>

    <!-- 时间线 -->
    <div
      v-if="searched && !error && list.length > 0"
      class="timeline-container"
    >
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in list"
          :key="item.id || index"
          :timestamp="formatDate(item.createdAt)"
          placement="top"
        >
          <div class="timeline-item">
            <div class="timeline-header">
              <el-tag
                size="small"
                :type="(item.action || '').includes('LOGIN') || (item.action || '').includes('LOGOUT') ? '' : (item.action || '').includes('ORDER') || (item.action || '').includes('PAYMENT') ? 'success' : 'warning'"
              >
                {{ item.action || '-' }}
              </el-tag>
              <span class="timeline-desc">{{ behaviorDesc(item) }}</span>
            </div>
            <div class="timeline-meta">
              <span
                v-if="item.ip"
                class="meta-tag"
              >IP: {{ maskIp(item.ip) }}</span>
              <span
                v-if="item.deviceId"
                class="meta-tag"
              >设备: {{ maskId(item.deviceId) }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>

      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="20"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchTimeline"
      />
    </div>

    <el-empty
      v-else-if="!loading && searched && !error"
      description="未查询到该用户的行为记录"
    />
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.search-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.user-card { margin-bottom: 20px; }
.timeline-container { margin-top: 8px; }
.timeline-item { padding: 4px 0; }
.timeline-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.timeline-desc { font-size: 14px; color: #333; }
.timeline-meta { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-secondary); }
.meta-tag { background: #f5f7fa; padding: 2px 8px; border-radius: 3px; }
</style>
