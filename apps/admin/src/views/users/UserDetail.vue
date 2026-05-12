<template>
  <div class="user-detail">
    <el-page-header @back="$router.push('/users')" title="返回">
      <template #content>
        <span class="header-title">用户详情 — {{ user.nickname || user.phone }}</span>
      </template>
    </el-page-header>

    <el-tabs v-model="activeTab" class="tabs" @tab-change="onTabChange">
      <el-tab-pane label="基本信息" name="profile">
        <el-descriptions v-if="user.id" :column="2" border>
          <el-descriptions-item label="昵称">{{ user.nickname }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ user.phone }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ user.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ user.gender === 'MALE' ? '男' : user.gender === 'FEMALE' ? '女' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="会员等级">{{ memberLabel(user.memberLevel) }}</el-descriptions-item>
          <el-descriptions-item label="会员到期">{{ user.memberExpire ? new Date(user.memberExpire).toLocaleDateString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="user.status === 'ACTIVE' ? 'success' : 'danger'">{{ user.status === 'ACTIVE' ? '正常' : '已禁用' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ new Date(user.createdAt).toLocaleString() }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="角色权限" name="roles">
        <div class="tab-toolbar">
          <el-select v-model="newRole" placeholder="选择角色">
            <el-option v-for="r in availableRoles" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
          <el-button type="primary" :disabled="!newRole" @click="assignRole">分配角色</el-button>
        </div>
        <el-table :data="userRoles" border size="small">
          <el-table-column label="角色" min-width="140">
            <template #default="{ row }">{{ roleLabel(row.roleType) }}</template>
          </el-table-column>
          <el-table-column prop="bindId" label="绑定ID" width="200">
            <template #default="{ row }">{{ row.bindId || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="removeRole(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="订单记录" name="orders">
        <el-table :data="orders" v-loading="orderLoading" stripe size="small">
          <el-table-column label="订单号" prop="orderNo" width="180" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">{{ orderTypeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="100">
            <template #default="{ row }">¥{{ Number(row.amount || row.totalAmount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="orderStatusType(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="圈子/课程" name="circles">
        <h4>加入的圈子</h4>
        <el-table :data="circles" size="small" stripe>
          <el-table-column prop="circle?.name" label="圈子名" min-width="140" />
          <el-table-column label="角色" width="100">
            <template #default="{ row }">{{ row.role }}</template>
          </el-table-column>
          <el-table-column label="加入时间" width="170">
            <template #default="{ row }">{{ new Date(row.joinedAt || row.createdAt).toLocaleString() }}</template>
          </el-table-column>
        </el-table>
        <h4 style="margin-top:20px">学习中的课程</h4>
        <el-table :data="courses" size="small" stripe>
          <el-table-column prop="course?.title" label="课程名" min-width="160" />
          <el-table-column label="进度" width="80">
            <template #default="{ row }">{{ row.progress || 0 }}%</template>
          </el-table-column>
          <el-table-column label="最近学习" width="170">
            <template #default="{ row }">{{ row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-' }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="国学币" name="coins">
        <el-descriptions v-if="coinAccount" :column="2" border>
          <el-descriptions-item label="余额">{{ coinAccount.balance || 0 }}</el-descriptions-item>
          <el-descriptions-item label="累计充值">{{ coinAccount.totalRecharge || 0 }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">{{ coinAccount.totalSpent || 0 }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂无国学币数据" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi, orderApi, circleApi, courseApi, coinApi } from '@/api'

const route = useRoute()
const userId = route.params.id as string

const activeTab = ref('profile')
const user = ref<any>({})
const userRoles = ref<any[]>([])
const orders = ref<any[]>([])
const orderLoading = ref(false)
const circles = ref<any[]>([])
const courses = ref<any[]>([])
const coinAccount = ref<any>(null)
const newRole = ref('')

const availableRoles = [
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '运营管理员', value: 'OPERATION_ADMIN' },
  { label: '内容品控', value: 'CONTENT_AUDITOR' },
  { label: '财务管理员', value: 'FINANCE_ADMIN' },
  { label: '客服管理员', value: 'CUSTOMER_SERVICE' },
  { label: '商品品控', value: 'GOODS_AUDITOR' },
  { label: '讲师', value: 'LECTURER' },
]

const ROLE_MAP: Record<string, string> = {
  SUPER_ADMIN: '超级管理员', OPERATION_ADMIN: '运营管理员', CONTENT_AUDITOR: '内容品控',
  FINANCE_ADMIN: '财务管理员', CUSTOMER_SERVICE: '客服管理员', GOODS_AUDITOR: '商品品控',
  CIRCLE_OWNER: '圈主', LECTURER: '讲师', STATION_MASTER: '分站长',
  OPERATOR: '运营商', STATION_OFFLINE_OWNER: '驿站主', INSTITUTE_MEMBER: '研究院成员',
}

function memberLabel(l: string) {
  return { NONE: '非会员', MONTHLY: '月卡', YEARLY: '年卡', LIFETIME: '终身' }[l] || l
}
function roleLabel(r: string) { return ROLE_MAP[r] || r }
function orderTypeLabel(t: string) {
  const m: Record<string, string> = { MEMBER: '会员', COURSE: '课程', PRODUCT: '商品', CIRCLE_JOIN: '入圈', PAIPAN: '排盘', LIVESTREAM: '直播' }
  return m[t] || t
}
function orderStatusType(s: string) {
  return { PAID: 'success', SHIPPED: 'warning', COMPLETED: '', REFUNDED: 'info', CANCELLED: 'danger' }[s] || 'info'
}

onMounted(async () => {
  const { data } = await userApi.detail(userId)
  user.value = data
  userRoles.value = data.roles || []
})

async function onTabChange(tab: string) {
  if (tab === 'orders' && orders.value.length === 0) {
    orderLoading.value = true
    try {
      const { data } = await orderApi.list({ page: 1, pageSize: 50 })
      orders.value = data.orders || data.data || []
    } catch { orders.value = [] } finally { orderLoading.value = false }
  }
  if (tab === 'circles' && circles.value.length === 0) {
    try {
      const [cData, coData] = await Promise.all([
        circleApi.list({ userId, page: 1, pageSize: 50 }).catch(() => ({ data: { circles: [] } })),
        courseApi.list({ userId, page: 1, pageSize: 50 }).catch(() => ({ data: { progresses: [] } })),
      ])
      circles.value = cData.data?.circles || cData.data?.data || []
      courses.value = coData.data?.progresses || coData.data?.data || []
    } catch { circles.value = []; courses.value = [] }
  }
  if (tab === 'coins') {
    try {
      const { data } = await coinApi.getRecharges(1, 1, userId)
      coinAccount.value = data.account || { balance: 0 }
    } catch { coinAccount.value = { balance: 0 } }
  }
}

async function assignRole() {
  if (!newRole.value) return
  try {
    await userApi.assignRole(userId, { roleType: newRole.value })
    ElMessage.success('角色已分配')
    newRole.value = ''
    const { data } = await userApi.detail(userId)
    userRoles.value = data.roles || []
  } catch { }
}

async function removeRole(row: any) {
  try {
    await ElMessageBox.confirm(`确定移除角色"${roleLabel(row.roleType)}"？`, '提示', { type: 'warning' })
    await userApi.removeRole(userId, row.roleType, row.bindId)
    ElMessage.success('已移除')
    const { data } = await userApi.detail(userId)
    userRoles.value = data.roles || []
  } catch {}
}
</script>

<style scoped>
.user-detail { padding: 16px; }
.header-title { font-size: 16px; font-weight: 500; color: #333; }
.tabs { margin-top: 16px; }
.tab-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
h4 { color: #8b4513; margin: 8px 0; }
</style>
