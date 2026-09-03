<template>
  <div class="page">
    <div class="header">
      <h2>专家管理</h2>
      <el-button
        :loading="loading"
        :disabled="!selectedCircle"
        @click="refresh"
      >
        刷新列表
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
      title="本页与「圈子详情 - 达人管理」为同一份配置（入口整合待拍板），修改会同步生效"
    />

    <!-- 错误态 -->
    <el-result
      v-if="error"
      icon="error"
      title="加载失败"
      sub-title="无法获取圈子列表，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="loadCircles"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 圈子选择 -->
      <el-form
        inline
        style="margin-bottom:16px"
      >
        <el-form-item label="选择圈子">
          <el-select
            v-model="selectedCircle"
            placeholder="选择圈子查看达人"
            clearable
            style="width:280px"
            @change="onCircleChange"
          >
            <el-option
              v-for="c in circles"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :disabled="!selectedCircle"
            @click="showConfigDialog = true"
          >
            配置达人价格
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 达人列表 -->
      <el-card v-if="selectedCircle">
        <template #header>
          <span>达人列表（{{ experts.length }} 人）</span>
        </template>
        <el-table
          v-loading="loading"
          :data="experts"
          stripe
          empty-text="该圈子暂无达人"
        >
          <el-table-column width="50">
            <template #default="{ row }">
              <el-avatar
                v-if="row.user?.avatar"
                :src="row.user.avatar"
                size="small"
              />
              <el-avatar
                v-else
                size="small"
              >
                {{ (row.user?.nickname || '?')[0] }}
              </el-avatar>
            </template>
          </el-table-column>
          <el-table-column
            prop="user.nickname"
            label="昵称"
            min-width="120"
          />
          <el-table-column
            label="角色"
            width="100"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.role === 'OWNER' ? 'danger' : row.role === 'PARTNER' ? 'warning' : 'info'"
              >
                {{ row.role === 'OWNER' ? '圈主' : row.role === 'PARTNER' ? '合伙人' : '嘉宾' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="提问价格（币/次）"
            width="140"
          >
            <template #default="{ row }">
              {{ row.questionPriceCoin || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="连麦价格（币/分钟）"
            width="150"
          >
            <template #default="{ row }">
              {{ row.callPricePerMinuteCoin || '-' }}
            </template>
          </el-table-column>
          <el-table-column
            label="可连麦时段"
            min-width="160"
          >
            <template #default="{ row }">
              <template v-if="row.callAvailableHours && row.callAvailableHours.length">
                <el-tag
                  v-for="(h, i) in row.callAvailableHours"
                  :key="i"
                  size="small"
                  style="margin:2px"
                >
                  {{ h.day }} {{ h.start }}-{{ h.end }}
                </el-tag>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="80"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                link
                @click="openConfig(row)"
              >
                配置
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-empty
        v-else
        description="请先选择一个圈子"
      />
    </template>

    <!-- 配置弹窗 -->
    <el-dialog
      v-model="showConfigDialog"
      title="配置达人价格"
      width="480px"
      @closed="resetConfigForm"
    >
      <el-form
        :model="configForm"
        label-width="120px"
        :rules="configRules"
      >
        <el-form-item
          label="选择成员"
          required
        >
          <el-select
            v-model="configForm.userId"
            placeholder="选择要配置的成员"
            filterable
            style="width:100%"
          >
            <el-option
              v-for="m in members"
              :key="m.userId"
              :label="`${m.user?.nickname || m.userId} (${roleLabel(m.role)})`"
              :value="m.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="提问价格（币）">
          <el-input-number
            v-model="configForm.questionPriceCoin"
            :min="0"
            :step="1"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="连麦价格（币/分）">
          <el-input-number
            v-model="configForm.callPricePerMinuteCoin"
            :min="0"
            :step="1"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="超时退款（小时）">
          <el-input-number
            v-model="configForm.questionTimeoutHours"
            :min="1"
            :max="720"
            :step="1"
            style="width:100%"
          />
          <span style="font-size:12px;color:var(--color-text-secondary)">超过该时长未回答将自动退款给提问者</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">
          取消
        </el-button>
        <el-tooltip
          :disabled="backendSupportsUserId"
          content="当前后端版本暂不支持管理员代成员配置（userId 契约未上线），请等待后端更新"
          placement="top"
        >
          <el-button
            type="primary"
            :loading="saving"
            :disabled="!backendSupportsUserId"
            @click="submitConfig"
          >
            保存
          </el-button>
        </el-tooltip>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { circleApi } from '@/api'

const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const showConfigDialog = ref(false)
const selectedCircle = ref('')
/** 圈子行（字段宽松 optional） */
interface CircleRow { id: string; name?: string }
/** 达人可连麦时段 */
interface CallHour { day?: string; start?: string; end?: string }
/** 达人行（圈子成员 + 价格配置，字段宽松 optional） */
interface ExpertRow {
  userId: string;
  role?: string;
  questionPriceCoin?: number;
  callPricePerMinuteCoin?: number;
  callAvailableHours?: CallHour[];
  user?: { avatar?: string; nickname?: string };
}
/** 圈子成员行（字段宽松 optional） */
interface MemberRow {
  userId?: string;
  role: string;
  user?: { nickname?: string };
}
const circles = ref<CircleRow[]>([])
const experts = ref<ExpertRow[]>([])
const members = ref<MemberRow[]>([])
// 管理员代成员配置依赖后端 userId 契约（POST /circles/:id/expert/config 带 userId）；
// 旧后端会按管理员自身查成员返回 404，此时降级禁用保存并提示
const backendSupportsUserId = ref(true)

const configForm = reactive({ userId: '', questionPriceCoin: 0, callPricePerMinuteCoin: 0, questionTimeoutHours: 48 })
const configRules = {}

function roleLabel(role: string) {
  return role === 'OWNER' ? '圈主' : role === 'PARTNER' ? '合伙人' : role === 'GUEST' ? '嘉宾' : role
}

async function loadCircles() {
  loading.value = true
  error.value = false
  try {
    const res = await circleApi.list({ page: 1, pageSize: 100 })
    // 后端返回 { circles, total }，经响应拦截器链规范化为 { items, total }；
    // 旧写法兜底到 res.data 对象本身，v-for 遍历对象值渲染出无文字空白选项（黑盒实锤根因）
    const rows = res.data?.items || res.data?.circles || res.data?.list
    circles.value = Array.isArray(rows) ? rows : []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function onCircleChange() {
  await Promise.all([refresh(), loadMembers()])
}

async function loadMembers() {
  if (!selectedCircle.value) return
  try {
    // 圈子详情不含 members，须走成员列表端点 GET /circles/:id/members（返回 { members, total }，
    // 经拦截器规范化为 { items, total }）
    const res = await circleApi.getMembers(selectedCircle.value, { page: 1, pageSize: 100 })
    const rows = res.data?.items || res.data?.members
    members.value = (Array.isArray(rows) ? rows : []).filter(
      (m: MemberRow) => ['OWNER', 'PARTNER', 'GUEST'].includes(m.role)
    )
  } catch { members.value = [] }
}

function resetConfigForm() {
  configForm.userId = ''
  configForm.questionPriceCoin = 0
  configForm.callPricePerMinuteCoin = 0
  configForm.questionTimeoutHours = 48
}

function openConfig(row: ExpertRow) {
  configForm.userId = row.userId
  configForm.questionPriceCoin = row.questionPriceCoin || 0
  configForm.callPricePerMinuteCoin = row.callPricePerMinuteCoin || 0
  configForm.questionTimeoutHours = (row as ExpertRow & { questionTimeoutHours?: number }).questionTimeoutHours || 48
  showConfigDialog.value = true
}

async function submitConfig() {
  if (saving.value) return
  if (!configForm.userId) { ElMessage.warning('请选择成员'); return }
  saving.value = true
  try {
    // questionTimeoutHours 为后端 DTO 必填字段（缺省会 400）；userId 为管理员代配置契约
    await circleApi.setExpertConfig(selectedCircle.value, {
      userId: configForm.userId,
      questionPriceCoin: configForm.questionPriceCoin,
      callPricePerMinuteCoin: configForm.callPricePerMinuteCoin,
      questionTimeoutHours: configForm.questionTimeoutHours,
    } as Parameters<typeof circleApi.setExpertConfig>[1])
    ElMessage.success('配置已保存')
    showConfigDialog.value = false
    await refresh()
  } catch (e) {
    // 旧后端按管理员自身查成员 → 404「成员不存在」：判定 userId 契约未上线，降级禁用
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      backendSupportsUserId.value = false
      ElMessage.error('当前后端暂不支持管理员代成员配置，保存已禁用（等待后端 userId 契约上线）')
    } else {
      ElMessage.error('保存失败')
    }
  }
  finally { saving.value = false }
}

async function refresh() {
  if (!selectedCircle.value) return
  loading.value = true
  try {
    const res = await circleApi.listExperts(selectedCircle.value)
    experts.value = res.data || []
  } catch {
    experts.value = []
    ElMessage.error('加载达人列表失败')
  }
  finally { loading.value = false }
}

onMounted(loadCircles)
</script>

<style scoped>
.page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; color: var(--color-text-title); }
</style>
