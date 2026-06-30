<template>
  <div class="page">
    <PageHeader title="成就系统管理" />

    <!-- 统计数据 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="4" v-for="s in statsCards" :key="s.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :style="{ color: s.color }">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="成就类型管理" name="types" />
      <el-tab-pane label="用户成就管理" name="users" />
    </el-tabs>

    <!-- 成就类型管理 -->
    <template v-if="activeTab === 'types'">
      <el-card>
        <template #header>
          <div class="card-header">
            <el-select v-model="typeFilter" placeholder="筛选分类" clearable size="small" style="width:160px" @change="fetchTypes">
              <el-option label="学习成就" value="learning" />
              <el-option label="阅读成就" value="reading" />
              <el-option label="社交成就" value="social" />
              <el-option label="排盘成就" value="paipan" />
              <el-option label="创作成就" value="creation" />
              <el-option label="消费成就" value="consumption" />
            </el-select>
            <el-button size="small" type="primary" @click="showTypeDialog()">新建成就</el-button>
          </div>
        </template>
        <el-result v-if="typeError && !typeLoading" icon="error" title="加载失败" sub-title="请检查网络后重试">
          <template #extra><el-button type="primary" @click="fetchTypes">重试</el-button></template>
        </el-result>
        <template v-else>
        <el-table :data="types" border stripe v-loading="typeLoading">
          <template #empty><el-empty description="暂无成就类型" :image-size="80" /></template>
          <el-table-column label="勋章" width="80">
            <template #default="{ row }">
              <div class="badge-preview" v-if="row.badgeUrl">
                <el-image :src="row.badgeUrl" style="width:48px;height:48px" fit="contain" />
              </div>
              <span v-else style="font-size:28px">{{ row.icon || '🏅' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column prop="description" label="描述" minWidth="180" show-overflow-tooltip />
          <el-table-column label="分类" width="100">
            <template #default="{ row }">
              <el-tag size="small">{{ categoryLabel(row.category) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="触发条件" minWidth="160" show-overflow-tooltip>
            <template #default="{ row }">{{ triggerDesc(row.triggerCondition) }}</template>
          </el-table-column>
          <el-table-column prop="userCount" label="获得人数" width="100" align="center" sortable />
          <el-table-column prop="shareRate" label="分享率" width="80" align="center">
            <template #default="{ row }">{{ row.shareRate ?? 0 }}%</template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="showTypeDialog(row)">编辑</el-button>
              <el-popconfirm title="确定删除?" @confirm="deleteType(row.id)">
                <template #reference>
                  <el-button size="small" text type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="typePage"
          v-model:page-size="typePageSize"
          :total="typeTotal"
          layout="total, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchTypes"
          @size-change="fetchTypes"
        />
        </template>
      </el-card>
    </template>

    <!-- 用户成就管理 -->
    <template v-if="activeTab === 'users'">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>用户成就列表</span>
            <div>
              <el-button size="small" type="primary" @click="showGrantDialog()">手动授予成就</el-button>
            </div>
          </div>
        </template>
        <el-result v-if="uaError && !uaLoading" icon="error" title="加载失败" sub-title="请检查网络后重试">
          <template #extra><el-button type="primary" @click="fetchUserAchievements">重试</el-button></template>
        </el-result>
        <template v-else>
        <el-table :data="userAchievements" border stripe v-loading="uaLoading">
          <template #empty><el-empty description="暂无用户成就" :image-size="80" /></template>
          <el-table-column prop="userName" label="用户" width="150" />
          <el-table-column label="成就" width="200">
            <template #default="{ row }">
              <el-tag size="small" style="margin-right:4px">
                {{ row.achievementIcon }} {{ row.achievementName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="achievementDesc" label="成就说明" minWidth="160" show-overflow-tooltip />
          <el-table-column label="获得方式" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.grantType === 'AUTO' ? 'success' : 'info'">
                {{ row.grantType === 'AUTO' ? '自动' : '手动' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="获得时间" width="150">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="是否分享" width="80" align="center">
            <template #default="{ row }">
              <span :style="{ color: row.isShared ? '#67c23a' : '#ccc' }">{{ row.isShared ? '是' : '否' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-popconfirm title="撤销该成就?" @confirm="revokeAchievement(row.id)">
                <template #reference>
                  <el-button size="small" text type="danger">撤销</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="uaPage"
          v-model:page-size="uaPageSize"
          :total="uaTotal"
          layout="total, sizes, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchUserAchievements"
          @size-change="fetchUserAchievements"
        />
        </template>
      </el-card>
    </template>

    <!-- 成就类型编辑弹窗 -->
    <el-dialog v-model="typeDialogVisible" :title="editingType?.id ? '编辑成就' : '新建成就'" width="560px">
      <el-form :model="typeForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="typeForm.name" placeholder="如：初窥门径、博览群书" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="typeForm.icon" placeholder="emoji" style="width:100px" />
        </el-form-item>
        <el-form-item label="勋章图片">
          <el-input v-model="typeForm.badgeUrl" placeholder="勋章图片URL" />
        </el-form-item>
        <el-form-item label="描述" required>
          <el-input v-model="typeForm.description" type="textarea" :rows="2" placeholder="描述获得该成就的意义" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="typeForm.category" style="width:100%">
            <el-option label="学习成就" value="learning" />
            <el-option label="阅读成就" value="reading" />
            <el-option label="社交成就" value="social" />
            <el-option label="排盘成就" value="paipan" />
            <el-option label="创作成就" value="creation" />
            <el-option label="消费成就" value="consumption" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发条件">
          <el-input v-model="triggerJsonStr" type="textarea" :rows="3" placeholder='{"type":"course_complete","count":1} 或 {"type":"classic_read","count":10}' />
          <div style="font-size:12px;color:#909399;margin-top:4px">JSON格式。type支持: course_complete/classic_read/paipan_complete/follower_reach/content_publish/order_complete</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveType">保存</el-button>
      </template>
    </el-dialog>

    <!-- 手动授予弹窗 -->
    <el-dialog v-model="grantVisible" title="手动授予成就" width="420px">
      <el-form>
        <el-form-item label="用户ID" required>
          <el-input v-model="grantForm.userId" placeholder="输入用户ID" />
        </el-form-item>
        <el-form-item label="成就类型" required>
          <el-select v-model="grantForm.typeId" placeholder="选择成就" style="width:100%">
            <el-option v-for="t in types" :key="t.id" :label="t.icon + ' ' + t.name" :value="t.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmGrant">确认授予</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { achievementApi } from "@/api"
import PageHeader from "@/components/PageHeader.vue"

// 触发条件（可为 JSON 字符串或对象）
type TriggerCondition = string | { type?: string; count?: number }
// 成就类型行（字段宽松 optional）
interface AchievementType {
  id: string
  name?: string
  icon?: string
  badgeUrl?: string
  description?: string
  category?: string
  triggerCondition?: TriggerCondition
  userCount?: number
  shareRate?: number
}
// 用户成就行
interface UserAchievement {
  id: string
  userName?: string
  achievementName?: string
  achievementIcon?: string
  achievementDesc?: string
  grantType?: string
  createdAt?: string
  isShared?: boolean
  user?: { nickname?: string }
  achievement?: { name?: string; icon?: string; description?: string }
}

const activeTab = ref("types")
const typeLoading = ref(false)
const uaLoading = ref(false)
const typeError = ref(false)
const uaError = ref(false)
const submitting = ref(false)
const typeFilter = ref("")
const typePage = ref(1)
const typePageSize = ref(10)
const typeTotal = ref(0)
const types = ref<AchievementType[]>([])
const uaPage = ref(1)
const uaPageSize = ref(10)
const uaTotal = ref(0)
const userAchievements = ref<UserAchievement[]>([])

const statsCards = ref([
  { label: "成就类型", value: 0, color: "#409eff" },
  { label: "总授予次数", value: 0, color: "#67c23a" },
  { label: "人均成就", value: 0, color: "#e6a23c" },
  { label: "平均分享率", value: "0%", color: "#f56c6c" },
])

// 类型编辑
const typeDialogVisible = ref(false)
const editingType = ref<AchievementType | null>(null)
const typeForm = reactive({ name: "", icon: "🏅", badgeUrl: "", description: "", category: "learning" })
const triggerJsonStr = ref("")

// 手动授予
const grantVisible = ref(false)
const grantForm = reactive({ userId: "", typeId: "" })

function categoryLabel(c: string): string {
  const m: Record<string, string> = { learning: "学习", reading: "阅读", social: "社交", paipan: "排盘", creation: "创作", consumption: "消费" }
  return m[c] ?? c
}
function triggerDesc(tc: TriggerCondition | null | undefined): string {
  if (!tc) return "无条件"
  const t = typeof tc === 'string' ? JSON.parse(tc) : tc
  const typeMap: Record<string, string> = { course_complete: "完成课程", classic_read: "读完古籍", paipan_complete: "完成排盘", follower_reach: "关注数达到", content_publish: "发布内容", order_complete: "完成订单" }
  return `${typeMap[t.type] ?? t.type} ${t.count ? '×' + t.count : ''}`
}
function formatTime(d: string): string { return d ? d.slice(0, 16).replace("T", " ") : "" }

// 成就类型
async function fetchTypes() {
  typeLoading.value = true
  typeError.value = false
  try {
    const res: any = await achievementApi.listTypes({ page: typePage.value, pageSize: typePageSize.value, category: typeFilter.value || undefined })
    const d = res?.data ?? res
    types.value = d.list ?? d.data ?? []
    typeTotal.value = d.total ?? 0
  } catch { typeError.value = true }
  finally { typeLoading.value = false }
}

function showTypeDialog(row?: AchievementType) {
  if (row) {
    editingType.value = row
    typeForm.name = row.name ?? ""; typeForm.icon = row.icon ?? "🏅"
    typeForm.badgeUrl = row.badgeUrl ?? ""; typeForm.description = row.description ?? ""
    typeForm.category = row.category ?? "learning"
    triggerJsonStr.value = row.triggerCondition ? JSON.stringify(typeof row.triggerCondition === 'string' ? JSON.parse(row.triggerCondition) : row.triggerCondition, null, 2) : ""
  } else {
    editingType.value = null
    typeForm.name = ""; typeForm.icon = "🏅"; typeForm.badgeUrl = ""
    typeForm.description = ""; typeForm.category = "learning"; triggerJsonStr.value = ""
  }
  typeDialogVisible.value = true
}

async function saveType() {
  if (submitting.value) return
  let triggerCondition = null
  if (triggerJsonStr.value.trim()) {
    try { triggerCondition = JSON.parse(triggerJsonStr.value) } catch { ElMessage.warning("触发条件JSON格式错误"); return }
  }
  submitting.value = true
  try {
    if (editingType.value?.id) {
      await achievementApi.updateType(editingType.value.id, { ...typeForm, triggerCondition })
    } else {
      await achievementApi.createType({ ...typeForm, triggerCondition })
    }
    ElMessage.success("保存成功"); typeDialogVisible.value = false; fetchTypes(); fetchStats()
  } catch { /* */ }
  finally { submitting.value = false }
}

async function deleteType(id: string) {
  try { await achievementApi.deleteType(id); ElMessage.success("删除成功"); fetchTypes(); fetchStats() } catch { /* */ }
}

// 用户成就
async function fetchUserAchievements() {
  uaLoading.value = true
  uaError.value = false
  try {
    const res: any = await achievementApi.listUserAchievements({ page: uaPage.value, pageSize: uaPageSize.value })
    const d = res?.data ?? res
    userAchievements.value = (d.list ?? d.data ?? []).map((a: UserAchievement) => ({
      ...a,
      userName: a.user?.nickname ?? '未知',
      achievementName: a.achievement?.name ?? '未知',
      achievementIcon: a.achievement?.icon ?? '🏅',
      achievementDesc: a.achievement?.description ?? '',
    }))
    uaTotal.value = d.total ?? 0
  } catch { uaError.value = true }
  finally { uaLoading.value = false }
}

async function revokeAchievement(id: string) {
  try { await achievementApi.revokeAchievement(id); ElMessage.success("已撤销"); fetchUserAchievements(); fetchStats() } catch { /* */ }
}

function showGrantDialog() {
  grantForm.userId = ""; grantForm.typeId = ""; grantVisible.value = true
}

async function confirmGrant() {
  if (submitting.value) return
  submitting.value = true
  try {
    await achievementApi.grantAchievement({ userId: grantForm.userId, typeId: grantForm.typeId })
    ElMessage.success("授予成功"); grantVisible.value = false; fetchUserAchievements(); fetchStats()
  } catch { /* */ }
  finally { submitting.value = false }
}

async function fetchStats() {
  try {
    const res: any = await achievementApi.getStats()
    const d = (res?.data ?? res) ?? {}
    statsCards.value[0].value = d.totalTypes ?? 0
    statsCards.value[1].value = d.totalGrants ?? 0
    statsCards.value[2].value = (d.avgPerUser ?? 0).toFixed(1)
    statsCards.value[3].value = (d.avgShareRate ?? 0) + "%"
  } catch { /* */ }
}

onMounted(() => { fetchTypes(); fetchUserAchievements(); fetchStats() })
</script>

<style scoped>
.page { padding: 0; }
.stat-card { text-align: center; cursor: default; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.badge-preview { display: inline-block; }
</style>
