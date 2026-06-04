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
            title="月卡会员"
            :value="stats.byLevel?.MONTHLY || 0"
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
      <el-card header="等级分布">
        <div
          v-if="stats.byLevel"
          style="display:flex;gap:24px;flex-wrap:wrap"
        >
          <div
            v-for="(count, level) in stats.byLevel"
            :key="level"
            style="flex:1;min-width:120px;text-align:center;padding:16px;background:#faf6f1;border-radius:8px"
          >
            <div style="font-size:28px;font-weight:bold;color:#8b4513">
              {{ count }}
            </div>
            <div style="color:#666;margin-top:4px">
              {{ level === 'NONE' ? '非会员' : level === 'MONTHLY' ? '月卡' : level === 'YEARLY' ? '年卡' : level === 'LIFETIME' ? '永久' : level }}
            </div>
          </div>
        </div>
        <el-empty
          v-else
          description="暂无数据"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { memberAdminApi } from '@/api'

const loading = ref(false)
const stats = reactive<{ totalMembers?: number; totalRevenue?: number; byLevel?: Record<string, number> }>({})

onMounted(() => fetchStats())

async function fetchStats() {
  loading.value = true
  try {
    const { data } = await memberAdminApi.getStats()
    Object.assign(stats, data)
  } catch {} finally { loading.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
