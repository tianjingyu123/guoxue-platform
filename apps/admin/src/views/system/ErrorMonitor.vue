<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { trackErrorApi } from '@/api'

interface ByDayItem {
  date: string
  count: number
}

interface TopMessage {
  msg: string
  count: number
  lastAt: string
  samplePath: string | null
}

interface ErrorItem {
  id: string
  userId: string | null
  path: string | null
  payload: Record<string, unknown> | null
  occurredAt: string | null
  createdAt: string
}

interface ErrorMonitorData {
  days: number
  total: number
  last24h: number
  byDay: ByDayItem[]
  topMessages: TopMessage[]
  items: ErrorItem[]
  page: number
  pageSize: number
}

const DAY_OPTIONS = [7, 14, 30]

const loading = ref(false)
const error = ref(false)
const days = ref(7)
const page = ref(1)
const pageSize = ref(20)
const data = ref<ErrorMonitorData | null>(null)

// 窗口内是否完全无错误（空态「很健康」）
const isEmpty = computed(() => !loading.value && !error.value && !!data.value && data.value.total === 0)

// 迷你柱状图归一化：柱高按窗口内单日最大值等比缩放
const maxDayCount = computed(() => {
  const list = data.value?.byDay ?? []
  return Math.max(1, ...list.map((d) => d.count))
})

function barHeight(count: number) {
  if (count <= 0) return 2
  return Math.max(4, Math.round((count / maxDayCount.value) * 56))
}

function formatDate(d?: string | null) {
  return d ? new Date(d).toLocaleString() : '-'
}

function payloadMsg(payload: Record<string, unknown> | null) {
  const msg = payload?.msg
  return msg === undefined || msg === null || msg === '' ? '-' : String(msg)
}

function payloadSource(payload: Record<string, unknown> | null) {
  const source = payload?.source
  return source === undefined || source === null || source === '' ? '-' : String(source)
}

// 用户 ID 截短展示（无 userId 记为匿名）
function userLabel(userId: string | null) {
  if (!userId) return '匿名'
  return userId.length > 8 ? `${userId.slice(0, 8)}…` : userId
}

async function fetchData() {
  loading.value = true
  error.value = false
  try {
    const { data: res } = await trackErrorApi.getErrors({
      days: days.value,
      page: page.value,
      pageSize: pageSize.value,
    })
    data.value = res as ErrorMonitorData
  } catch {
    data.value = null
    error.value = true
  } finally {
    loading.value = false
  }
}

// 切换统计窗口天数：重置回第 1 页
function onDaysChange() {
  page.value = 1
  fetchData()
}

function onPageChange(p: number) {
  page.value = p
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>前端错误监控</h3>
      <el-radio-group
        v-model="days"
        :disabled="loading"
        @change="onDaysChange"
      >
        <el-radio-button
          v-for="d in DAY_OPTIONS"
          :key="d"
          :value="d"
        >
          近{{ d }}天
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 错误态：加载失败 + 重试 -->
    <div
      v-if="error"
      class="error-state"
    >
      <el-empty description="加载失败，请重试">
        <el-button
          type="primary"
          @click="fetchData"
        >
          重试
        </el-button>
      </el-empty>
    </div>

    <div
      v-else
      v-loading="loading"
      class="content"
    >
      <!-- 统计卡 -->
      <div class="stat-cards">
        <el-card
          shadow="never"
          class="stat-card"
        >
          <div class="stat-value danger">
            {{ data?.last24h ?? 0 }}
          </div>
          <div class="stat-label">
            24小时错误数
          </div>
        </el-card>
        <el-card
          shadow="never"
          class="stat-card"
        >
          <div class="stat-value">
            {{ data?.total ?? 0 }}
          </div>
          <div class="stat-label">
            近{{ days }}天错误总数
          </div>
        </el-card>
        <el-card
          shadow="never"
          class="stat-card"
        >
          <div class="stat-value">
            {{ data?.topMessages?.length ?? 0 }}
          </div>
          <div class="stat-label">
            独立错误种类
          </div>
        </el-card>
      </div>

      <!-- 空态：窗口内零错误 -->
      <el-empty
        v-if="isEmpty"
        description="暂无错误·很健康"
      />

      <template v-else-if="data">
        <!-- 按日趋势：迷你柱状图（不引入图表库） -->
        <el-card
          shadow="never"
          class="section-card"
        >
          <template #header>
            <span class="section-title">按日趋势</span>
          </template>
          <div class="mini-chart">
            <el-tooltip
              v-for="d in data.byDay"
              :key="d.date"
              :content="`${d.date}：${d.count} 条`"
              placement="top"
            >
              <div class="mini-chart__col">
                <div
                  class="mini-chart__bar"
                  :class="{ 'mini-chart__bar--empty': d.count === 0 }"
                  :style="{ height: barHeight(d.count) + 'px' }"
                />
              </div>
            </el-tooltip>
          </div>
          <div class="mini-chart__axis">
            <span>{{ data.byDay[0]?.date }}</span>
            <span>{{ data.byDay[data.byDay.length - 1]?.date }}</span>
          </div>
        </el-card>

        <!-- TOP 错误消息 -->
        <el-card
          shadow="never"
          class="section-card"
        >
          <template #header>
            <span class="section-title">TOP 错误消息</span>
          </template>
          <el-table
            :data="data.topMessages"
            stripe
          >
            <template #empty>
              <el-empty description="暂无聚合消息" />
            </template>
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="msg-full">
                  {{ row.msg }}
                </div>
              </template>
            </el-table-column>
            <el-table-column
              prop="msg"
              label="错误消息"
              min-width="320"
              show-overflow-tooltip
            />
            <el-table-column
              label="次数"
              width="90"
            >
              <template #default="{ row }">
                <el-tag
                  type="danger"
                  size="small"
                >
                  {{ row.count }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="最近发生"
              width="170"
            >
              <template #default="{ row }">
                {{ formatDate(row.lastAt) }}
              </template>
            </el-table-column>
            <el-table-column
              label="样例页面"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.samplePath || '-' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 明细分页 -->
        <el-card
          shadow="never"
          class="section-card"
        >
          <template #header>
            <span class="section-title">错误明细</span>
          </template>
          <el-table
            :data="data.items"
            stripe
          >
            <template #empty>
              <el-empty description="当前页暂无明细" />
            </template>
            <el-table-column
              label="时间"
              width="170"
            >
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column
              label="页面"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.path || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="消息"
              min-width="300"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ payloadMsg(row.payload) }}
              </template>
            </el-table-column>
            <el-table-column
              label="来源"
              width="140"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ payloadSource(row.payload) }}
              </template>
            </el-table-column>
            <el-table-column
              label="用户"
              width="120"
            >
              <template #default="{ row }">
                {{ userLabel(row.userId) }}
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination">
            <el-pagination
              :current-page="page"
              :page-size="pageSize"
              :total="data.total"
              layout="total, prev, pager, next"
              background
              @current-change="onPageChange"
            />
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.error-state { padding: 40px 0; }
.content { min-height: 200px; }

.stat-cards { display: flex; gap: 16px; margin-bottom: 16px; }
.stat-card { flex: 1; text-align: center; }
.stat-value { font-size: 28px; font-weight: 600; color: var(--el-text-color-primary); line-height: 1.4; }
.stat-value.danger { color: var(--el-color-danger); }
.stat-label { margin-top: 4px; font-size: 13px; color: var(--el-text-color-secondary); }

.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }

.mini-chart { display: flex; align-items: flex-end; gap: 4px; height: 64px; }
.mini-chart__col { flex: 1; display: flex; align-items: flex-end; justify-content: center; height: 100%; cursor: default; }
.mini-chart__bar { width: 100%; max-width: 28px; border-radius: 2px 2px 0 0; background: var(--el-color-danger-light-3); transition: height 0.2s; }
.mini-chart__bar--empty { background: var(--el-fill-color-dark); }
.mini-chart__axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: var(--el-text-color-secondary); }

.msg-full { padding: 8px 16px; white-space: pre-wrap; word-break: break-all; color: var(--el-text-color-regular); }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
