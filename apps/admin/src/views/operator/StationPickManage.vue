<template>
  <div class="page">
    <div class="toolbar">
      <h3>站点精选管理</h3>
    </div>

    <el-form
      :inline="true"
      style="margin-bottom:16px"
    >
      <el-form-item label="选择分站">
        <el-input
          v-model="stationId"
          placeholder="输入分站ID"
          @keyup.enter="fetchPicks"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :loading="loading"
          @click="fetchPicks"
        >
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <template v-if="stationId && picks.length >= 0">
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <span><b>精选内容列表</b>（{{ stationId }}）</span>
        <el-button
          type="primary"
          size="small"
          @click="openConfig"
        >
          配置设置
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="picks"
        stripe
      >
        <el-table-column
          label="排序"
          width="80"
        >
          <template #default="{ row }">
            {{ row.sortOrder }}
          </template>
        </el-table-column>
        <el-table-column
          prop="contentType"
          label="内容类型"
          width="100"
        />
        <el-table-column
          prop="contentId"
          label="内容ID"
          width="200"
        />
        <el-table-column
          prop="remark"
          label="推荐语"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          label="创建时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="100"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              @click="removePick(row.id)"
            >
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-empty
      v-if="stationId && !loading && picks.length === 0"
      description="暂无精选内容"
    />

    <!-- 配置弹窗 -->
    <el-dialog
      v-model="configVis"
      title="精选配置"
      width="450px"
    >
      <el-form
        :model="configForm"
        label-width="120px"
      >
        <el-form-item label="启用精选注入">
          <el-switch v-model="configForm.stationZoneEnabled" />
        </el-form-item>
        <el-form-item label="注入位置">
          <el-input
            v-model="configForm.positionsStr"
            placeholder="多个位置用逗号分隔，如 2,5,9"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="savingConfig"
          @click="saveConfig"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false); const stationId = ref('')
const picks = ref<any[]>([])

const configVis = ref(false); const savingConfig = ref(false)
const configForm = reactive({ stationZoneEnabled: false, positionsStr: '' })

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchPicks() {
  if (!stationId.value.trim()) { ElMessage.warning('请输入分站ID'); return }
  loading.value = true
  try { const { data } = await api.get(`/station-pick/admin/${stationId.value}`); picks.value = data.items || data.picks || data.data || [] } catch { picks.value = [] } finally { loading.value = false }
}

async function removePick(pickId: string) {
  try {
    await ElMessageBox.confirm('确定移除此精选内容？', '提示', { type: 'warning' })
    await api.delete(`/station-pick/admin/${stationId.value}/items/${pickId}`)
    ElMessage.success('已移除'); fetchPicks()
  } catch {}
}

function openConfig() { configForm.stationZoneEnabled = false; configForm.positionsStr = ''; configVis.value = true }
async function saveConfig() {
  savingConfig.value = true
  try {
    const positions = configForm.positionsStr ? configForm.positionsStr.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n)) : undefined
    await api.put(`/station-pick/admin/${stationId.value}/config`, { stationZoneEnabled: configForm.stationZoneEnabled, stationPickPositions: positions })
    ElMessage.success('配置已保存'); configVis.value = false
  } catch { } finally { savingConfig.value = false }
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }</style>
