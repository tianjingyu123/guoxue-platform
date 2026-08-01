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
        <!-- 下拉选择分站（原为手输裸 UUID） -->
        <el-select
          v-model="stationId"
          placeholder="选择分站"
          filterable
          style="width: 260px"
          :loading="stationsLoading"
          @change="fetchPicks"
        >
          <el-option
            v-for="s in stationOptions"
            :key="s.id"
            :label="s.name + (s.code ? '（' + s.code + '）' : '')"
            :value="s.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          :loading="loading"
          :disabled="!stationId"
          @click="fetchPicks"
        >
          刷新
        </el-button>
      </el-form-item>
    </el-form>

    <template v-if="stationId">
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <span><b>精选内容列表</b>（{{ currentStationName }}）</span>
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
          label="内容类型"
          width="100"
        >
          <template #default="{ row }">
            <el-tag size="small">
              {{ CONTENT_TYPES[row.contentType] || row.contentType || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="内容ID"
          width="140"
        >
          <!-- 后端 admin 列表未返回内容标题（已记后端清单），ID 截断+点击复制 -->
          <template #default="{ row }">
            <el-tooltip
              :content="row.contentId + '（点击复制）'"
              placement="top"
            >
              <span
                class="copyable-id"
                @click="copyText(row.contentId)"
              >{{ (row.contentId || '').slice(0, 8) }}…</span>
            </el-tooltip>
          </template>
        </el-table-column>
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
        <template #empty>
          <el-empty :description="loadError ? '加载失败，请点击刷新重试' : '该分站暂无精选内容（站长可在分站后台添加）'" />
        </template>
      </el-table>
    </template>

    <el-empty
      v-else
      description="请先选择一个分站，查看和管理其精选内容"
    />

    <!-- 配置弹窗（打开时先回显现有配置，防保存即误关） -->
    <el-dialog
      v-model="configVis"
      title="精选配置"
      width="480px"
    >
      <div
        v-loading="configLoading"
        style="min-height: 120px"
      >
        <el-alert
          v-if="configLoadFailed"
          type="warning"
          :closable="false"
          show-icon
          title="现有配置读取失败"
          description="下方显示的是默认值而非该分站当前配置，直接保存可能覆盖原设置。建议关闭重试。"
          style="margin-bottom: 12px"
        />
        <el-form
          :model="configForm"
          label-width="120px"
        >
          <el-form-item label="启用精选注入">
            <el-switch v-model="configForm.stationZoneEnabled" />
            <div class="field-hint">
              开启后，站长精选内容将注入分站首页信息流
            </div>
          </el-form-item>
          <el-form-item label="注入位置">
            <el-input
              v-model="configForm.positionsStr"
              placeholder="如 2,5,9"
            />
            <div class="field-hint">
              精选内容插入信息流的第几条位置，多个位置用英文逗号分隔
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="configVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="savingConfig"
          :disabled="configLoading"
          @click="saveConfig"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, stationApi } from '@/api'

/** 精选内容类型翻译（对齐后端 station-pick verifyContentExists 支持的五类） */
const CONTENT_TYPES: Record<string, string> = {
  ARTICLE: '文章',
  COURSE: '课程',
  PRODUCT: '商品',
  CIRCLE: '圈子',
  VIDEO: '视频',
}

/** 精选内容行（字段宽松 optional） */
interface PickRow {
  id?: string;
  sortOrder?: number;
  contentType?: string;
  contentId?: string;
  remark?: string;
  createdAt?: string;
}

// ── 分站选择器 ──
interface StationOption { id: string; name?: string; code?: string }
const stationOptions = ref<StationOption[]>([])
const stationsLoading = ref(false)
const stationId = ref('')
const currentStationName = computed(() => {
  const s = stationOptions.value.find((x) => x.id === stationId.value)
  return s ? s.name || s.id : stationId.value
})

async function fetchStations() {
  stationsLoading.value = true
  try {
    const { data } = await stationApi.list({ page: 1, pageSize: 200 })
    stationOptions.value = data.stations || []
  } catch {
    stationOptions.value = []
    ElMessage.error('分站列表加载失败，请刷新页面重试')
  } finally {
    stationsLoading.value = false
  }
}
onMounted(fetchStations)

const loading = ref(false)
const loadError = ref(false)
const picks = ref<PickRow[]>([])

const configVis = ref(false); const savingConfig = ref(false); const configLoading = ref(false); const configLoadFailed = ref(false)
const configForm = reactive({ stationZoneEnabled: false, positionsStr: '' })

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function copyText(text?: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

async function fetchPicks() {
  if (!stationId.value) return
  loading.value = true
  loadError.value = false
  try {
    // 后端 adminGetPicks 直接返回数组（原代码读 data.items 恒空致列表永远空白）
    const { data } = await api.get(`/station-pick/admin/${stationId.value}`)
    picks.value = Array.isArray(data) ? data : (data.items || data.picks || [])
  } catch {
    picks.value = []
    loadError.value = true
    ElMessage.error('精选列表加载失败，请重试')
  } finally {
    loading.value = false
  }
}

async function removePick(pickId: string) {
  try {
    await ElMessageBox.confirm('确定移除此精选内容？移除后将从该分站首页信息流撤下。', '移除精选', { type: 'warning' })
  } catch {
    return // 用户取消
  }
  try {
    await api.delete(`/station-pick/admin/${stationId.value}/items/${pickId}`)
    ElMessage.success('已移除')
    fetchPicks()
  } catch {
    ElMessage.error('移除失败，请重试')
  }
}

/** 打开配置弹窗：先读分站现有 templateConfig 回显（GET /station/:id），防止保存默认值误关精选 */
async function openConfig() {
  configVis.value = true
  configLoading.value = true
  configLoadFailed.value = false
  configForm.stationZoneEnabled = false
  configForm.positionsStr = ''
  try {
    const { data } = await stationApi.detail(stationId.value)
    const cfg = (data?.templateConfig || {}) as Record<string, unknown>
    configForm.stationZoneEnabled = Boolean(cfg.stationZoneEnabled)
    const positions = cfg.stationPickPositions
    configForm.positionsStr = Array.isArray(positions) ? positions.join(',') : ''
  } catch {
    configLoadFailed.value = true
  } finally {
    configLoading.value = false
  }
}

async function saveConfig() {
  savingConfig.value = true
  try {
    const positions = configForm.positionsStr ? configForm.positionsStr.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n)) : undefined
    await api.put(`/station-pick/admin/${stationId.value}/config`, { stationZoneEnabled: configForm.stationZoneEnabled, stationPickPositions: positions })
    ElMessage.success('配置已保存')
    configVis.value = false
  } catch {
    ElMessage.error('配置保存失败，请重试')
  } finally {
    savingConfig.value = false
  }
}
</script>
<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.field-hint { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; margin-top: 2px; }
.copyable-id { cursor: pointer; color: var(--color-info, #409eff); }
</style>
