<template>
  <div class="page">
    <PageHeader title="邀请福利配置" />

    <el-row :gutter="16">
      <!-- 奖励配置 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>邀请奖励规则</span>
              <el-button size="small" type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
            </div>
          </template>
          <el-form :model="config" label-width="120px">
            <el-divider content-position="left">邀请人奖励</el-divider>
            <el-form-item label="会员体验">
              <el-input-number v-model="config.inviterReward.memberDays" :min="0" :max="365" /> 天
            </el-form-item>
            <el-form-item label="国学币">
              <el-input-number v-model="config.inviterReward.coins" :min="0" :max="99999" /> 枚
            </el-form-item>
            <el-form-item label="优惠券">
              <el-select v-model="config.inviterReward.couponId" placeholder="选择优惠券（可选）" clearable style="width:240px">
                <el-option v-for="c in couponOptions" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>

            <el-divider content-position="left">被邀请人奖励</el-divider>
            <el-form-item label="会员体验">
              <el-input-number v-model="config.inviteeReward.memberDays" :min="0" :max="365" /> 天
            </el-form-item>
            <el-form-item label="国学币">
              <el-input-number v-model="config.inviteeReward.coins" :min="0" :max="99999" /> 枚
            </el-form-item>
            <el-form-item label="新人优惠券">
              <el-select v-model="config.inviteeReward.couponId" placeholder="选择新人券（可选）" clearable style="width:240px">
                <el-option v-for="c in couponOptions" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>

            <el-divider content-position="left">限额设置</el-divider>
            <el-form-item label="每日上限">
              <el-input-number v-model="config.dailyLimit" :min="1" :max="9999" /> 次/人
            </el-form-item>
            <el-form-item label="每月上限">
              <el-input-number v-model="config.monthlyLimit" :min="1" :max="99999" /> 次/人
            </el-form-item>
            <el-form-item label="总计上限">
              <el-input-number v-model="config.totalLimit" :min="1" :max="999999" /> 次/人
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 预览与统计 -->
      <el-col :span="10">
        <el-card style="margin-bottom:16px">
          <template #header>奖励预览（用户视角）</template>
          <div class="preview-box">
            <div class="preview-title">邀请好友加入国学平台</div>
            <div class="preview-rewards">
              <div class="reward-item">
                <div class="reward-icon">🎁</div>
                <div class="reward-text">你获得：<b>{{ config.inviterReward.memberDays }}</b>天会员 + <b>{{ config.inviterReward.coins }}</b>国学币</div>
              </div>
              <div class="reward-item">
                <div class="reward-icon">🎉</div>
                <div class="reward-text">好友获得：<b>{{ config.inviteeReward.memberDays }}</b>天会员 + <b>{{ config.inviteeReward.coins }}</b>国学币</div>
              </div>
            </div>
            <div class="preview-limit">每日最多邀请 <b>{{ config.dailyLimit }}</b> 人</div>
          </div>
        </el-card>

        <el-card>
          <template #header>邀请数据概览（近30天）</template>
          <el-row :gutter="12">
            <el-col :span="12" v-for="s in inviteStats" :key="s.label">
              <div class="stat-mini">
                <div class="stat-mini-val">{{ s.value }}</div>
                <div class="stat-mini-lbl">{{ s.label }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- 邀请记录 -->
    <el-card style="margin-top:16px">
      <template #header>
        <div class="card-header">
          <span>邀请记录</span>
          <el-input v-model="recordSearch" placeholder="搜索用户ID" size="small" style="width:200px" clearable @change="fetchRecords" />
        </div>
      </template>
      <el-alert
        v-if="recordError"
        type="error"
        title="数据加载失败"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
      >
        <el-button size="small" type="primary" @click="fetchRecords">重试</el-button>
      </el-alert>
      <el-table :data="records" border stripe v-loading="recordLoading">
        <el-table-column prop="inviterName" label="邀请人" width="140" />
        <el-table-column prop="inviteeName" label="被邀请人" width="140" />
        <el-table-column label="邀请人获得" width="180">
          <template #default="{ row }">{{ row.inviterRewardDesc ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="被邀请人获得" width="180">
          <template #default="{ row }">{{ row.inviteeRewardDesc ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'COMPLETED' ? 'success' : 'info'">{{ row.status === 'COMPLETED' ? '已完成' : '进行中' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="150">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <template #empty>
          <el-empty :description="recordError ? '加载失败，请重试' : '暂无数据'" />
        </template>
      </el-table>
      <el-pagination
        v-model:current-page="recordPage"
        v-model:page-size="recordPageSize"
        :total="recordTotal"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="fetchRecords"
        @size-change="fetchRecords"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { inviteRewardApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"

const saving = ref(false)
const recordLoading = ref(false)
const recordSearch = ref("")
const recordPage = ref(1)
const recordPageSize = ref(10)
const recordTotal = ref(0)
const recordError = ref(false)
const records = ref<any[]>([])

const config = reactive({
  inviterReward: { memberDays: 7, coins: 100, couponId: "" as string },
  inviteeReward: { memberDays: 3, coins: 50, couponId: "" as string },
  dailyLimit: 10,
  monthlyLimit: 100,
  totalLimit: 1000,
})

const couponOptions = ref<any[]>([])
const inviteStats = ref([
  { label: "总邀请人数", value: 0 },
  { label: "成功转化", value: 0 },
  { label: "转化率", value: "0%" },
  { label: "发放奖励总额", value: 0 },
])

function formatTime(d: string): string { return d ? d.slice(0, 16).replace("T", " ") : "" }

async function fetchConfig() {
  try {
    const res: any = await inviteRewardApi.getConfig()
    const d = (res?.data ?? res) ?? {}
    if (d.inviterReward) config.inviterReward = { ...config.inviterReward, ...d.inviterReward }
    if (d.inviteeReward) config.inviteeReward = { ...config.inviteeReward, ...d.inviteeReward }
    if (d.dailyLimit) config.dailyLimit = d.dailyLimit
    if (d.monthlyLimit) config.monthlyLimit = d.monthlyLimit
    if (d.totalLimit) config.totalLimit = d.totalLimit
  } catch { /* */ }
}

async function saveConfig() {
  saving.value = true
  try { await inviteRewardApi.updateConfig({ ...config }); ElMessage.success("配置已保存") }
  catch { /* */ }
  finally { saving.value = false }
}

async function fetchStats() {
  try {
    const res: any = await inviteRewardApi.getStats()
    const d = (res?.data ?? res) ?? {}
    inviteStats.value[0].value = d.totalInvites ?? 0
    inviteStats.value[1].value = d.convertedCount ?? 0
    inviteStats.value[2].value = (d.conversionRate ?? 0) + "%"
    inviteStats.value[3].value = (d.totalRewardValue ?? 0) + "国学币"
  } catch { /* */ }
}

async function fetchRecords() {
  recordLoading.value = true
  recordError.value = false
  try {
    const res: any = await inviteRewardApi.getRecords({
      page: recordPage.value, pageSize: recordPageSize.value,
      userId: recordSearch.value || undefined,
    })
    const d = res?.data ?? res
    records.value = (d.list ?? d.data ?? []).map((r: any) => ({
      ...r,
      inviterName: r.inviter?.nickname ?? '未知',
      inviteeName: r.invitee?.nickname ?? '未知',
    }))
    recordTotal.value = d.total ?? 0
  } catch { recordError.value = true }
  finally { recordLoading.value = false }
}

onMounted(() => { fetchConfig(); fetchStats(); fetchRecords() })
</script>

<style scoped>
.page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.preview-box { background: linear-gradient(135deg, #fef9f0, #fdf2e9); border: 1px solid #f0d9b5; border-radius: 12px; padding: 24px; text-align: center; }
.preview-title { font-size: 16px; font-weight: 700; color: #8b4513; margin-bottom: 16px; }
.preview-rewards { text-align: left; margin-bottom: 12px; }
.reward-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.reward-icon { font-size: 20px; }
.reward-text { font-size: 13px; color: var(--color-text-title); }
.preview-limit { font-size: 12px; color: var(--color-text-secondary); }
.stat-mini { text-align: center; padding: 12px; background: var(--color-bg-page); border-radius: 8px; margin-bottom: 8px; }
.stat-mini-val { font-size: 20px; font-weight: 700; color: var(--color-info); }
.stat-mini-lbl { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
</style>
