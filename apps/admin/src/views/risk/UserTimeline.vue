<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { riskApi } from '@/api'
import { exportCSV } from '@/utils/export'

const loading = ref(false)
const list = ref<any[]>([])
const searchUserId = ref('')
const searched = ref(false)

const userInfo = ref<any>(null)

const dateRange = ref<[Date, Date] | null>(null)
const actionType = ref('')

const actionTypeOptions = [
  { label: '全部', value: '' },
  { label: '登录', value: 'LOGIN' },
  { label: '下单', value: 'ORDER' },
  { label: '内容操作', value: 'CONTENT' },
  { label: '支付', value: 'PAYMENT' },
  { label: '修改资料', value: 'PROFILE' },
  { label: '登出', value: 'LOGOUT' },
]

onMounted(() => {
  // 如果有预置 userId 参数可在此处自动查询
})

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString() : '-'
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '-'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

function getActionIcon(action: string): string {
  const map: Record<string, string> = {
    LOGIN: 'user',
    ORDER: 'shopping-cart',
    CONTENT: 'edit',
    PAYMENT: 'money',
    PROFILE: 'setting',
    LOGOUT: 'switch-button',
  }
  return map[action] || 'info-filled'
}

async function searchTimeline() {
  if (!searchUserId.value.trim()) {
    ElMessage.warning('请输入用户ID')
    return
  }
  loading.value = true
  searched.value = true
  try {
    const params: Record<string, any> = {}
    if (dateRange.value) {
      params.startDate = dateRange.value[0].toISOString()
      params.endDate = dateRange.value[1].toISOString()
    }
    if (actionType.value) params.action = actionType.value
    const { data } = await riskApi.getUserTimeline(searchUserId.value.trim(), params)
    list.value = data.timeline || data.records || data.data || []
    if (data.user) {
      userInfo.value = data.user
    } else {
      userInfo.value = list.value.length > 0 ? { userId: searchUserId.value.trim() } : null
    }
  } catch {
    list.value = []
    userInfo.value = null
  } finally {
    loading.value = false
  }
}

function exportTimeline() {
  const actionMap: Record<string, string> = {
    LOGIN: '登录', ORDER: '下单', CONTENT: '内容操作',
    PAYMENT: '支付', PROFILE: '修改资料', LOGOUT: '登出',
  }
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
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      action: actionMap[item.action] || item.action || '-',
      desc: item.description || item.detail || (item.meta ? JSON.stringify(item.meta) : '') || '-',
      targetType: item.targetType || '-',
      targetId: item.targetId || '-',
      ip: item.ip || '-',
      deviceId: item.deviceId || '-',
    })),
  )
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>用户行为轨迹</h3>
      <el-button :disabled="!searched || list.length === 0" @click="exportTimeline">导出</el-button>
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
      />
      <el-select v-model="actionType" placeholder="行为类型" clearable style="width:140px">
        <el-option v-for="a in actionTypeOptions" :key="a.value" :label="a.label" :value="a.value" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="searchTimeline">查询</el-button>
    </div>

    <!-- 用户信息卡片 -->
    <div v-if="userInfo" class="user-card">
      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="用户ID">
          <span style="font-weight:600">{{ userInfo.userId || searchUserId }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="昵称">{{ userInfo.nickname || '-' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ maskPhone(userInfo.phone) }}</el-descriptions-item>
        <el-descriptions-item label="会员等级">{{ userInfo.memberLevel || '普通' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 时间线 -->
    <div v-if="searched && list.length > 0" class="timeline-container">
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in list"
          :key="item.id || index"
          :timestamp="formatDate(item.createdAt)"
          placement="top"
        >
          <div class="timeline-item">
            <div class="timeline-header">
              <el-tag size="small" :type="item.action === 'LOGIN' || item.action === 'LOGOUT' ? '' : item.action === 'ORDER' || item.action === 'PAYMENT' ? 'success' : 'warning'">
                {{ item.action }}
              </el-tag>
              <span class="timeline-desc">{{ item.description || item.detail || '-' }}</span>
            </div>
            <div class="timeline-meta">
              <span v-if="item.ip" class="meta-tag">IP: {{ item.ip }}</span>
              <span v-if="item.deviceInfo" class="meta-tag">设备: {{ item.deviceInfo }}</span>
              <span v-if="item.location" class="meta-tag">位置: {{ item.location }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>

    <el-empty v-else-if="!loading && searched" description="未查询到该用户的行为记录" />
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.search-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.user-card { margin-bottom: 20px; }
.timeline-container { margin-top: 8px; }
.timeline-item { padding: 4px 0; }
.timeline-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.timeline-desc { font-size: 14px; color: #333; }
.timeline-meta { display: flex; gap: 16px; font-size: 12px; color: #999; }
.meta-tag { background: #f5f7fa; padding: 2px 8px; border-radius: 3px; }
</style>
