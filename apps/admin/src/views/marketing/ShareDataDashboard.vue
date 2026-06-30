<template>
  <div class="page">
    <PageHeader title="分享数据看板" />

    <!-- 日期筛选 -->
    <el-card style="margin-bottom:16px">
      <el-form inline>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="fetchAll"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchAll">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-alert
      v-if="error"
      type="error"
      title="数据加载失败"
      :closable="false"
      show-icon
      style="margin-bottom:16px"
    >
      <el-button size="small" type="primary" @click="fetchAll">重试</el-button>
    </el-alert>

    <!-- 总览卡片 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="4" v-for="s in overviewStats" :key="s.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :style="{ color: s.color }">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-trend" :style="{ color: s.trend > 0 ? '#67c23a' : '#f56c6c' }" v-if="s.trend !== undefined">
            {{ s.trend >= 0 ? '↑' : '↓' }}{{ Math.abs(s.trend) }}%
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 按场景统计 -->
    <el-card style="margin-bottom:16px">
      <template #header>按场景统计</template>
      <el-table :data="sceneStats" border stripe>
        <el-table-column prop="sceneName" label="场景" width="160" />
        <el-table-column prop="shareCount" label="分享次数" width="120" align="center" sortable />
        <el-table-column prop="clickCount" label="点击次数" width="120" align="center" sortable />
        <el-table-column label="点击率" width="100" align="center">
          <template #default="{ row }">{{ clickRate(row) }}%</template>
        </el-table-column>
        <el-table-column prop="registerCount" label="注册转化" width="120" align="center" sortable />
        <el-table-column label="注册转化率" width="100" align="center">
          <template #default="{ row }">{{ registerRate(row) }}%</template>
        </el-table-column>
        <el-table-column prop="orderCount" label="下单转化" width="100" align="center" sortable />
        <el-table-column label="传播层级" width="100" align="center">
          <template #default="{ row }">{{ row.maxSpreadLevel ?? '-' }}级</template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>
    </el-card>

    <!-- 分享达人排行 -->
    <el-card style="margin-bottom:16px">
      <template #header>
        <div class="card-header">
          <span>分享达人排行</span>
          <el-select v-model="userSortBy" size="small" style="width:120px" @change="fetchUserRank">
            <el-option label="按分享次数" value="shareCount" />
            <el-option label="按点击次数" value="clickCount" />
            <el-option label="按转化人数" value="registerCount" />
          </el-select>
        </div>
      </template>
      <el-table :data="userRank" border stripe v-loading="userLoading">
        <el-table-column type="index" label="排名" width="60" />
        <el-table-column prop="userName" label="用户" width="160" />
        <el-table-column prop="shareCount" label="分享次数" width="100" align="center" />
        <el-table-column prop="clickCount" label="点击次数" width="100" align="center" />
        <el-table-column prop="registerCount" label="带来注册" width="100" align="center" />
        <el-table-column label="传播力等级" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="levelColor(row.spreadLevel)">{{ row.spreadLevel ?? '初传' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="influence" label="影响力分" width="100" align="center" sortable />
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>
    </el-card>

    <!-- 分享漏斗 -->
    <el-card>
      <template #header>分享转化漏斗（全场景）</template>
      <el-row :gutter="16">
        <el-col :span="6" v-for="(f, i) in funnelData" :key="f.label">
          <div class="funnel-step">
            <div class="funnel-num" :style="{ color: funnelColors[i] }">{{ f.value }}</div>
            <div class="funnel-label">{{ f.label }}</div>
            <div class="funnel-rate" v-if="i > 0">转化 {{ funnelRate(i) }}%</div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { shareDataApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"

const dateRange = ref<[string, string] | null>(null)
const userSortBy = ref("shareCount")
const userLoading = ref(false)
const error = ref(false)
// 分享达人行（含 map 派生 userName）
interface UserRankRow {
  userName?: string
  shareCount?: number
  clickCount?: number
  registerCount?: number
  spreadLevel?: string
  influence?: number
  [k: string]: unknown
}
// 按场景统计行（shareCount/clickCount 等按数值参与计算，声明为 number）
interface SceneStatRow {
  scene?: string
  sceneName?: string
  shareCount: number
  clickCount: number
  registerCount: number
  orderCount?: number
  maxSpreadLevel?: number
  [k: string]: unknown
}
const userRank = ref<UserRankRow[]>([])

const overviewStats = ref([
  { label: "总分享次数", value: 0, color: "#409eff", trend: 0 },
  { label: "总点击次数", value: 0, color: "#67c23a", trend: 0 },
  { label: "平均点击率", value: "0%", color: "#e6a23c", trend: undefined },
  { label: "带来注册", value: 0, color: "#f56c6c", trend: 0 },
  { label: "带来下单", value: 0, color: "#8b5cf6", trend: 0 },
  { label: "最深传播", value: "0级", color: "#909399", trend: undefined },
])

const sceneStats = ref<SceneStatRow[]>([])
const funnelData = ref([
  { label: "分享", value: 0 },
  { label: "点击", value: 0 },
  { label: "访问落地页", value: 0 },
  { label: "注册/下载", value: 0 },
])
const funnelColors = ["#409eff", "#67c23a", "#e6a23c", "#f56c6c"]

function clickRate(r: SceneStatRow): string { return r.shareCount > 0 ? ((r.clickCount / r.shareCount) * 100).toFixed(1) : "0" }
function registerRate(r: SceneStatRow): string { return r.clickCount > 0 ? ((r.registerCount / r.clickCount) * 100).toFixed(1) : "0" }
function funnelRate(i: number): string {
  const prev = funnelData.value[i - 1]?.value ?? 1
  return prev > 0 ? ((funnelData.value[i].value / prev) * 100).toFixed(1) : "0"
}
function levelColor(l: string): string {
  const m: Record<string, string> = { "初传": "info", "热传": "warning", "爆款": "danger", "现象": "" }; return m[l] ?? "info"
}

async function fetchAll() {
  const params: Record<string, string> = {}
  if (dateRange.value) { params.startDate = dateRange.value[0]; params.endDate = dateRange.value[1] }
  error.value = false
  try {
    // 总览
    const ov: any = await shareDataApi.overview(params)
    const d = ov?.data ?? ov ?? {}
    overviewStats.value[0].value = d.totalShares ?? 0
    overviewStats.value[1].value = d.totalClicks ?? 0
    overviewStats.value[2].value = (d.avgClickRate ?? 0) + "%"
    overviewStats.value[3].value = d.totalRegistrations ?? 0
    overviewStats.value[4].value = d.totalOrders ?? 0
    overviewStats.value[5].value = (d.maxSpreadLevel ?? 0) + "级"
    // 趋势
    overviewStats.value.forEach(s => { s.trend = d.trends?.[s.label] ?? s.trend })

    // 按场景
    const sc: any = await shareDataApi.byScene(params)
    const sl = (sc?.data ?? sc)?.list ?? (sc?.data ?? sc)?.scenes ?? []
    sceneStats.value = sl.map((s: { scene?: string; [k: string]: unknown }) => ({
      ...s, sceneName: sceneNameMap[s.scene ?? ''] ?? s.scene ?? '未知'
    }))

    // 漏斗
    const fn: any = await shareDataApi.funnel(params)
    const fd = fn?.data ?? fn ?? {}
    funnelData.value[0].value = fd.shares ?? 0
    funnelData.value[1].value = fd.clicks ?? 0
    funnelData.value[2].value = fd.landingVisits ?? 0
    funnelData.value[3].value = fd.registrations ?? 0
  } catch { error.value = true }
}

async function fetchUserRank() {
  userLoading.value = true
  try {
    const res: any = await shareDataApi.byUser({ page: 1, pageSize: 20, sortBy: userSortBy.value })
    userRank.value = ((res?.data ?? res)?.list ?? []).map((u: { user?: { nickname?: string }; [k: string]: unknown }) => ({
      ...u, userName: u.user?.nickname ?? '未知'
    }))
  } catch { /* */ }
  finally { userLoading.value = false }
}

const sceneNameMap: Record<string, string> = {
  course_complete: "完成课程", paipan_complete: "完成排盘", classic_complete: "读完古籍",
  circle_join: "加入圈子", product_purchase: "购买商品", achievement: "获得成就",
  ai_dialogue: "智能体对话", comment_share: "评论分享", live_share: "直播分享",
  competition_result: "赛事成绩", invite_friend: "邀请好友",
}

onMounted(() => { fetchAll(); fetchUserRank() })
</script>

<style scoped>
.page { padding: 0; }
.stat-card { text-align: center; cursor: default; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.stat-trend { font-size: 11px; margin-top: 2px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.funnel-step { text-align: center; padding: 16px; background: var(--color-bg-page); border-radius: 8px; }
.funnel-num { font-size: 28px; font-weight: 700; }
.funnel-label { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
.funnel-rate { font-size: 11px; color: var(--color-text-secondary); margin-top: 4px; }
</style>
