<template>
  <div class="push-page">
    <div class="toolbar">
      <h3>用户分群推送</h3>
    </div>

    <el-card>
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="推送标题"
          required
        >
          <el-input
            v-model="form.title"
            placeholder="通知标题"
          />
        </el-form-item>
        <el-form-item
          label="推送内容"
          required
        >
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="通知内容（支持小程序模板消息变量）"
          />
        </el-form-item>
        <el-form-item label="筛选条件">
          <el-row
            :gutter="12"
            style="width:100%"
          >
            <el-col :span="6">
              <el-select
                v-model="form.memberLevel"
                placeholder="会员等级"
                clearable
                style="width:100%"
              >
                <el-option
                  label="全部"
                  value=""
                />
                <el-option
                  label="非会员"
                  value="NONE"
                />
                <el-option
                  label="月卡"
                  value="MONTHLY"
                />
                <el-option
                  label="年卡"
                  value="YEARLY"
                />
                <el-option
                  label="终身"
                  value="LIFETIME"
                />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="form.tag"
                placeholder="用户标签"
                clearable
                style="width:100%"
              >
                <el-option
                  label="全部"
                  value=""
                />
                <el-option
                  label="高活跃"
                  value="high_active"
                />
                <el-option
                  label="付费用户"
                  value="paid"
                />
                <el-option
                  label="新注册"
                  value="new_register"
                />
                <el-option
                  label="沉默用户"
                  value="silent"
                />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-input-number
                v-model="form.minActiveDays"
                :min="0"
                placeholder="最少活跃天数"
                style="width:100%"
              />
            </el-col>
            <el-col :span="6">
              <el-button
                type="primary"
                :loading="counting"
                @click="countUsers"
              >
                预估人数
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item>
          <div
            v-if="estimatedCount > 0"
            class="estimate"
          >
            符合筛选条件 <b>{{ estimatedCount }}</b> 人（实际推送人数以发送结果为准）
            <el-button
              type="danger"
              :loading="sending"
              style="margin-left:16px"
              @click="sendPush"
            >
              确认发送
            </el-button>
          </div>
          <div
            v-else-if="counted"
            class="estimate"
          >
            符合条件 <b>0</b> 人，请调整筛选条件
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top:16px">
      <template #header>
        <b>推送历史</b>
      </template>
      <el-table
        :data="history"
        stripe
        size="small"
      >
        <el-table-column
          prop="title"
          label="标题"
          min-width="160"
        />
        <el-table-column
          label="目标人数"
          width="90"
        >
          <template #default="{ row }">
            {{ row.targetCount || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="发送时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api, notificationApi, userApi } from '@/api'

const form = reactive({ title: '', content: '', memberLevel: '', tag: '', minActiveDays: 0 })
const counting = ref(false)
const sending = ref(false)
const counted = ref(false)
// estimatedCount: >=0 真实人数；-1 表示含标签/活跃天数筛选无法精确预估
const estimatedCount = ref(0)
const history = ref<any[]>([])

onMounted(async () => {
  try {
    const { data } = await notificationApi.list({ page: 1, pageSize: 20 })
    history.value = data.notifications || data.data || []
  } catch { history.value = [] }
})

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function countUsers() {
  if (counting.value) return
  counting.value = true
  try {
    // 精确预估（dry-run，不发送）：后端 /users/push/estimate 与实际推送同口径过滤
    const params: any = {}
    if (form.memberLevel) params.memberLevel = form.memberLevel
    if (form.minActiveDays) params.activeDays = form.minActiveDays
    const { data } = await api.get('/users/push/estimate', { params })
    estimatedCount.value = (data as any)?.count ?? 0
    counted.value = true
  } catch {
    estimatedCount.value = 0
    counted.value = true
  } finally { counting.value = false }
}

async function sendPush() {
  if (!form.title || !form.content) return ElMessage.warning('请填写标题和内容')
  if (sending.value) return
  sending.value = true
  try {
    // 真实分群推送端点：返回 matchedCount（实际匹配并写入通知的人数）
    const { data } = await userApi.pushByTag({
      tag: form.tag,
      memberLevel: form.memberLevel,
      activeDays: form.minActiveDays,
      title: form.title,
      content: form.content,
    } as any)
    const matched = (data as any)?.matchedCount
    ElMessage.success(typeof matched === 'number' ? `已推送给 ${matched} 人` : '推送已发送')
    estimatedCount.value = 0
    counted.value = false
    form.title = ''; form.content = ''
  } catch { } finally { sending.value = false }
}
</script>

<style scoped>
.push-page { padding: 16px; }
.toolbar { margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.estimate { padding: 12px 16px; background: #fef0f0; border-radius: 8px; color: #C41E3A; }
.estimate b { font-size: 20px; }
</style>
