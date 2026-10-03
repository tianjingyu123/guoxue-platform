<template>
  <div class="page">
    <div class="toolbar">
      <h3>会员统计</h3><el-button
        size="small"
        @click="fetchStats"
      >
        刷新
      </el-button>
    </div>

    <el-row
      v-loading="loading"
      :gutter="16"
    >
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="付费会员总数"
            :value="stats.totalMembers || 0"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="累计营收"
            :value="Number(stats.totalRevenue || 0)"
            prefix="¥"
            :precision="2"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="月卡/季卡会员"
            :value="(stats.byLevel?.MONTHLY || 0) + (stats.byLevel?.QUARTERLY || 0)"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic
            title="年卡/永久会员"
            :value="(stats.byLevel?.YEARLY || 0) + (stats.byLevel?.LIFETIME || 0)"
          />
        </el-card>
      </el-col>
    </el-row>

    <div style="margin-top:24px">
      <el-card header="付费等级分布">
        <div
          v-if="paidLevels.length"
          style="display:flex;gap:24px;flex-wrap:wrap"
        >
          <div
            v-for="item in paidLevels"
            :key="item.level"
            style="flex:1;min-width:120px;text-align:center;padding:16px;background:#faf6f1;border-radius:8px"
          >
            <div style="font-size:28px;font-weight:bold;color:#8b4513">
              {{ item.count.toLocaleString('zh-CN') }}
            </div>
            <div style="color:#666;margin-top:4px">
              {{ levelLabel(item.level) }}
            </div>
          </div>
        </div>
        <el-empty
          v-else
          description="暂无付费会员数据"
        />
        <!-- 非会员单列一行：与付费卡分区，避免"非会员"混进付费分布误读 -->
        <div
          v-if="noneCount !== null"
          class="none-row"
        >
          非会员（未购买过会员）：<b>{{ noneCount.toLocaleString('zh-CN') }}</b> 人
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { memberAdminApi } from '@/api'

const loading = ref(false)
const stats = reactive<{ totalMembers?: number; totalRevenue?: number; byLevel?: Record<string, number> }>({})

/** 等级翻译（与 prisma enum MemberLevel 对齐） */
const LEVEL_LABEL: Record<string, string> = { MONTHLY: '月卡', QUARTERLY: '季卡', YEARLY: '年卡', LIFETIME: '永久' }
function levelLabel(l: string) { return LEVEL_LABEL[l] || l }

/** 付费等级桶（剔除 NONE，单列展示） */
const paidLevels = computed(() => {
  const by = stats.byLevel || {}
  const order = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']
  return Object.entries(by)
    .filter(([level]) => level !== 'NONE')
    .map(([level, count]) => ({ level, count: Number(count || 0) }))
    .sort((a, b) => {
      const ia = order.indexOf(a.level); const ib = order.indexOf(b.level)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
})
const noneCount = computed<number | null>(() => {
  const by = stats.byLevel
  if (!by || by.NONE == null) return null
  return Number(by.NONE || 0)
})

onMounted(() => fetchStats())

async function fetchStats() {
  loading.value = true
  try {
    const { data } = await memberAdminApi.getStats()
    Object.assign(stats, data)
  } catch { /* 拦截器已提示错误 */ } finally { loading.value = false }
}
</script>
<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.none-row { margin-top: 16px; padding: 12px 16px; background: var(--color-bg-page, #f5f7fa); border-radius: 8px; color: var(--color-text-secondary, #666); font-size: 14px; }
.none-row b { color: var(--color-text-title, #303133); font-size: 16px; }
</style>
