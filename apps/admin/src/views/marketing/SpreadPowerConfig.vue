<template>
  <div class="page">
    <PageHeader title="传播力体系配置" />

    <el-row :gutter="16">
      <!-- 等级配置 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>传播力等级规则</span>
              <el-button size="small" type="primary" @click="saveAllLevels" :loading="saving">批量保存</el-button>
            </div>
          </template>
          <el-table :data="levels" border stripe>
            <el-table-column label="等级" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="levelTagColor(row.level)">{{ row.name }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="图标" width="80">
              <template #default="{ row }">
                <el-input v-model="row.icon" size="small" style="width:60px" />
              </template>
            </el-table-column>
            <el-table-column label="最低分享次数" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.minShares" size="small" :min="0" controls-position="right" style="width:100px" />
              </template>
            </el-table-column>
            <el-table-column label="最低点击次数" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.minClicks" size="small" :min="0" controls-position="right" style="width:100px" />
              </template>
            </el-table-column>
            <el-table-column label="流量扶持" width="140">
              <template #default="{ row }">
                <el-input-number v-model="row.trafficBoost" size="small" :min="0" :max="1000" controls-position="right" style="width:110px" />
                <span style="font-size:12px;color:#999;margin-left:4px">曝光/天</span>
              </template>
            </el-table-column>
            <el-table-column label="描述" minWidth="160">
              <template #default="{ row }">
                <el-input v-model="row.description" size="small" placeholder="等级描述" />
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无等级配置" />
            </template>
          </el-table>
        </el-card>
      </el-col>

      <!-- 统计预览 -->
      <el-col :span="10">
        <el-card style="margin-bottom:16px">
          <template #header>传播力分布</template>
          <div class="dist-chart">
            <div v-for="l in levels" :key="l.level" class="dist-bar-row">
              <span class="dist-label">{{ l.name }}</span>
              <div class="dist-bar-wrap">
                <div class="dist-bar" :style="{ width: distPercent(l.level) + '%', backgroundColor: distColor(l.level) }" />
              </div>
              <span class="dist-count">{{ distCount(l.level) }}</span>
            </div>
          </div>
        </el-card>

        <el-card>
          <template #header>传播力概述</template>
          <el-row :gutter="12">
            <el-col :span="12" v-for="s in powerStats" :key="s.label">
              <div class="stat-mini">
                <div class="stat-mini-val">{{ s.value }}</div>
                <div class="stat-mini-lbl">{{ s.label }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- 传播力用户列表 -->
    <el-card style="margin-top:16px">
      <template #header>
        <div class="card-header">
          <span>传播力用户列表</span>
          <el-select v-model="filterLevel" size="small" placeholder="按等级筛选" clearable style="width:140px" @change="fetchUsers">
            <el-option v-for="l in levels" :key="l.level" :label="l.name" :value="l.level" />
          </el-select>
        </div>
      </template>
      <el-alert
        v-if="userError"
        type="error"
        title="数据加载失败"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
      >
        <el-button size="small" type="primary" @click="fetchUsers">重试</el-button>
      </el-alert>
      <el-table :data="users" border stripe v-loading="userLoading">
        <el-table-column prop="userName" label="用户" width="150" />
        <el-table-column label="传播力等级" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="levelTagColor(row.spreadLevel)">{{ row.spreadLevelName ?? row.spreadLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="shareCount" label="总分享" width="100" align="center" sortable />
        <el-table-column prop="clickCount" label="总点击" width="100" align="center" sortable />
        <el-table-column prop="registerCount" label="带来注册" width="100" align="center" sortable />
        <el-table-column prop="influence" label="影响力分" width="100" align="center" sortable />
        <el-table-column prop="trafficBoost" label="流量扶持" width="100" align="center" />
        <el-table-column label="标识" width="100">
          <template #default="{ row }">
            <span v-if="row.spreadLevel === 'phenomenon'">🔥 {{ row.spreadLevelName }}</span>
            <span v-else>{{ row.spreadLevelName }}</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="userError ? '加载失败，请重试' : '暂无数据'" />
        </template>
      </el-table>
      <el-pagination
        v-model:current-page="userPage"
        v-model:page-size="userPageSize"
        :total="userTotal"
        layout="total, sizes, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchUsers"
        @size-change="fetchUsers"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { spreadPowerApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"

const saving = ref(false)
const userLoading = ref(false)
const filterLevel = ref("")
const userPage = ref(1)
const userPageSize = ref(10)
const userTotal = ref(0)
const userError = ref(false)
const users = ref<any[]>([])

const levels = ref<any[]>([])
const distCounts = ref<Record<string, number>>({})
const powerStats = ref([
  { label: "传播力用户总数", value: 0 },
  { label: "爆款级用户", value: 0 },
  { label: "总辐射人数", value: 0 },
  { label: "日均新增分享", value: 0 },
])

function levelTagColor(l: string): string {
  const m: Record<string, string> = { "spark": "info", "rising": "", "hot": "warning", "viral": "danger", "phenomenon": "" }
  return m[l] ?? "info"
}
function distColor(l: string): string {
  const m: Record<string, string> = { "spark": "#909399", "rising": "#409eff", "hot": "#e6a23c", "viral": "#f56c6c", "phenomenon": "#8b5cf6" }
  return m[l] ?? "#409eff"
}
function distPercent(l: string): number {
  const max = Math.max(...Object.values(distCounts.value), 1)
  return ((distCounts.value[l] ?? 0) / max) * 100
}
function distCount(l: string): number { return distCounts.value[l] ?? 0 }

async function fetchLevels() {
  try {
    const res: any = await spreadPowerApi.getLevels()
    levels.value = (res?.data ?? res)?.levels ?? (res?.data ?? res)?.list ?? []
  } catch { /* */ }
}

async function fetchStats() {
  try {
    const res: any = await spreadPowerApi.getStats()
    const d = (res?.data ?? res) ?? {}
    powerStats.value[0].value = d.totalUsers ?? 0
    powerStats.value[1].value = d.viralUsers ?? 0
    powerStats.value[2].value = d.totalReach ?? 0
    powerStats.value[3].value = d.avgDailyShares ?? 0
    distCounts.value = d.levelDistribution ?? {}
  } catch { /* */ }
}

async function saveAllLevels() {
  saving.value = true
  try {
    for (const l of levels.value) {
      await spreadPowerApi.updateLevel(l.level, {
        name: l.name, icon: l.icon, minShares: l.minShares,
        minClicks: l.minClicks, trafficBoost: l.trafficBoost, description: l.description,
      })
    }
    ElMessage.success("所有等级已保存")
  } catch { /* */ }
  finally { saving.value = false }
}

async function fetchUsers() {
  userLoading.value = true
  userError.value = false
  try {
    const res: any = await spreadPowerApi.listUsers({
      page: userPage.value, pageSize: userPageSize.value,
      level: filterLevel.value || undefined,
    })
    const d = res?.data ?? res
    users.value = (d.list ?? d.data ?? []).map((u: any) => ({
      ...u, userName: u.user?.nickname ?? '未知',
    }))
    userTotal.value = d.total ?? 0
  } catch { userError.value = true }
  finally { userLoading.value = false }
}

onMounted(() => { fetchLevels(); fetchStats(); fetchUsers() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.dist-chart { padding: 8px 0; }
.dist-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dist-label { width: 50px; font-size: 12px; color: var(--color-text-body); }
.dist-bar-wrap { flex: 1; background: var(--color-divider); border-radius: 4px; height: 20px; overflow: hidden; }
.dist-bar { height: 100%; border-radius: 4px; transition: width 0.3s; min-width: 2px; }
.dist-count { width: 40px; font-size: 12px; color: var(--color-text-secondary); text-align: right; }
.stat-mini { text-align: center; padding: 12px; background: var(--color-bg-page); border-radius: 8px; margin-bottom: 8px; }
.stat-mini-val { font-size: 20px; font-weight: 700; color: var(--color-info); }
.stat-mini-lbl { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
</style>
