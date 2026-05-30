<template>
  <div class="user-detail">
    <el-page-header @back="$router.push('/users')" title="返回">
      <template #content>
        <span class="header-title">
          用户详情 — {{ profile.userInfo?.nickname || profile.userInfo?.phone || '加载中...' }}
        </span>
        <el-tag v-if="profile.userInfo" size="small" style="margin-left:8px"
          :type="profile.userInfo.status === 'ACTIVE' ? 'success' : 'danger'">
          {{ profile.userInfo.status === 'ACTIVE' ? '正常' : profile.userInfo.status === 'BANNED' ? '封禁' : '禁用' }}
        </el-tag>
      </template>
      <template #extra>
        <el-button v-if="profile.userInfo?.status === 'ACTIVE'" size="small" type="warning" @click="handleBan">封禁用户</el-button>
        <el-button v-else size="small" type="success" @click="handleUnban">解封用户</el-button>
      </template>
    </el-page-header>

    <!-- 统计概览卡片 -->
    <div v-if="profile.userInfo" class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ stats.orderStats?.totalOrders || 0 }}</div>
        <div class="stat-label">累计订单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value coin">{{ profile.coinBalance || 0 }}</div>
        <div class="stat-label">国学币余额</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalCollects || 0 }}</div>
        <div class="stat-label">收藏</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalLikes || 0 }}</div>
        <div class="stat-label">点赞</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.followers || 0 }}</div>
        <div class="stat-label">粉丝</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.following || 0 }}</div>
        <div class="stat-label">关注</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ profile.deviceList?.length || 0 }}</div>
        <div class="stat-label">设备数</div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="tabs" @tab-change="onTabChange">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="profile">
        <el-descriptions v-if="profile.userInfo" :column="2" border>
          <el-descriptions-item label="用户ID" :span="2">{{ profile.userInfo.id }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ profile.userInfo.nickname }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ profile.userInfo.phone }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ profile.userInfo.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ profile.userInfo.gender === 'MALE' ? '男' : profile.userInfo.gender === 'FEMALE' ? '女' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="生日">{{ profile.userInfo.birthday || '-' }}</el-descriptions-item>
          <el-descriptions-item label="个人简介">{{ profile.userInfo.bio || '-' }}</el-descriptions-item>
          <el-descriptions-item label="会员等级">
            <el-tag v-if="profile.memberInfo?.memberLevel !== 'NONE'" size="small" type="warning">
              {{ memberLabel(profile.memberInfo?.memberLevel) }}
            </el-tag>
            <span v-else>非会员</span>
          </el-descriptions-item>
          <el-descriptions-item label="会员到期">
            {{ profile.memberInfo?.memberExpire ? new Date(profile.memberInfo.memberExpire).toLocaleDateString() : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ new Date(profile.userInfo.createdAt).toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="最后活跃">{{ formatRelative(profile.userInfo.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <!-- 行为轨迹 — 客服核心视图 -->
      <el-tab-pane label="行为轨迹" name="behavior">
        <el-timeline v-if="behaviors.length > 0">
          <el-timeline-item
            v-for="b in behaviors" :key="b.id"
            :timestamp="new Date(b.createdAt).toLocaleString()"
            placement="top"
            :type="behaviorColor(b.action)"
          >
            <div class="behavior-item">
              <el-tag size="small" :type="behaviorTagType(b.action)">{{ behaviorLabel(b.action) }}</el-tag>
              <span v-if="b.targetType" class="behavior-target">
                {{ targetTypeLabel(b.targetType) }}
                <template v-if="b.targetId">({{ b.targetId.slice(0, 8) }}...)</template>
              </span>
              <span v-if="b.ip" class="behavior-meta">IP: {{ b.ip }}</span>
              <span v-if="b.deviceId" class="behavior-meta">设备: {{ b.deviceId.slice(0, 12) }}...</span>
              <div v-if="b.meta && Object.keys(b.meta).length > 0" class="behavior-meta-detail">
                {{ JSON.stringify(b.meta) }}
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无行为记录" />
      </el-tab-pane>

      <!-- 设备列表 -->
      <el-tab-pane label="设备列表" name="devices">
        <el-table :data="profile.deviceList || []" size="small" stripe>
          <el-table-column label="设备ID" min-width="180">
            <template #default="{ row }">{{ row.deviceId }}</template>
          </el-table-column>
          <el-table-column label="平台" width="100">
            <template #default="{ row }">{{ row.platform || '-' }}</template>
          </el-table-column>
          <el-table-column label="可信设备" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.isTrusted ? 'success' : 'info'">
                {{ row.isTrusted ? '可信' : '普通' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="首次出现" width="170">
            <template #default="{ row }">{{ row.firstSeenAt ? new Date(row.firstSeenAt).toLocaleString() : '-' }}</template>
          </el-table-column>
          <el-table-column label="最近活跃" width="170">
            <template #default="{ row }">{{ row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString() : '-' }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!profile.deviceList?.length" description="暂无设备信息" />
      </el-tab-pane>

      <!-- 订单记录 -->
      <el-tab-pane label="订单记录" name="orders">
        <div class="tab-summary" v-if="profile.orderStats">
          累计 {{ profile.orderStats.totalOrders }} 笔订单，总金额 ¥{{ profile.orderStats.totalAmount?.toFixed(2) || '0.00' }}
        </div>
        <el-table :data="orders" v-loading="orderLoading" stripe size="small">
          <el-table-column label="订单号" prop="orderNo" width="180" />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ orderTypeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="100">
            <template #default="{ row }">¥{{ Number(row.amount || row.totalAmount || 0).toFixed(2) }}</template>
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

      <!-- 圈子/课程 -->
      <el-tab-pane label="圈子/课程" name="circles">
        <h4>加入的圈子 ({{ profile.circleCount || 0 }})</h4>
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
        <el-table :data="profile.learningProgress || []" size="small" stripe>
          <el-table-column label="课程ID" width="200">
            <template #default="{ row }">{{ row.courseId }}</template>
          </el-table-column>
          <el-table-column label="进度" width="80">
            <template #default="{ row }">
              <el-progress :percentage="row.progress || 0" :stroke-width="6" />
            </template>
          </el-table-column>
          <el-table-column label="完成" width="70">
            <template #default="{ row }">
              <el-tag size="small" :type="row.completed ? 'success' : 'info'">{{ row.completed ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近学习" width="170">
            <template #default="{ row }">{{ row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-' }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 国学币 -->
      <el-tab-pane label="国学币" name="coins">
        <el-descriptions v-if="profile.coinBalance !== undefined" :column="2" border>
          <el-descriptions-item label="当前余额">{{ profile.coinBalance }}</el-descriptions-item>
          <el-descriptions-item label="累计订单金额">
            ¥{{ profile.orderStats?.totalAmount?.toFixed(2) || '0.00' }}
          </el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂无国学币数据" />
      </el-tab-pane>

      <!-- 角色权限 -->
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
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi, orderApi, circleApi } from '@/api'

const route = useRoute()
const userId = route.params.id as string

const activeTab = ref('profile')
const profile = ref<any>({})
const stats = ref<any>({})
const userRoles = ref<any[]>([])
const orders = ref<any[]>([])
const orderLoading = ref(false)
const circles = ref<any[]>([])
const behaviors = ref<any[]>([])
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

const BEHAVIOR_MAP: Record<string, string> = {
  LOGIN: '登录', LOGOUT: '退出', REGISTER: '注册',
  VIEW_ARTICLE: '查看文章', VIEW_COURSE: '查看课程', VIEW_CLASSIC: '阅读古籍',
  SEARCH: '搜索', LIKE: '点赞', COLLECT: '收藏', COMMENT: '评论',
  PURCHASE: '购买', RECHARGE: '充值', PAIPAN: '排盘',
  FOLLOW: '关注', JOIN_CIRCLE: '加入圈子', CHECK_IN: '签到',
}

const TARGET_MAP: Record<string, string> = {
  ARTICLE: '文章', COURSE: '课程', CLASSIC: '古籍', CIRCLE: '圈子',
  PRODUCT: '商品', ORDER: '订单', USER: '用户', POST: '帖子',
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
function behaviorLabel(a: string) { return BEHAVIOR_MAP[a] || a }
function targetTypeLabel(t: string) { return TARGET_MAP[t] || t }
function behaviorColor(a: string) {
  if (a === 'PURCHASE' || a === 'RECHARGE') return 'warning'
  if (a === 'LOGIN' || a === 'REGISTER') return 'success'
  if (a === 'LIKE' || a === 'COLLECT' || a === 'FOLLOW') return 'primary'
  return ''
}
function behaviorTagType(a: string) {
  if (a === 'PURCHASE' || a === 'RECHARGE') return 'warning'
  if (a === 'LOGIN' || a === 'REGISTER') return 'success'
  if (a === 'SEARCH' || a === 'COMMENT') return 'info'
  if (a === 'LIKE' || a === 'COLLECT' || a === 'FOLLOW') return ''
  return 'info'
}

function formatRelative(t: string) {
  if (!t) return '-'
  const diff = Date.now() - new Date(t).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return t?.slice(0, 16).replace("T", " ")
}

onMounted(async () => {
  try {
    const [profileRes, statsRes] = await Promise.all([
      userApi.getAdminProfile(userId),
      userApi.getUserStats(userId).catch(() => ({ data: {} })),
    ])
    profile.value = profileRes.data
    behaviors.value = profileRes.data.recentBehavior || []
    userRoles.value = profileRes.data.userInfo?.roles || profileRes.data.roles || []
    stats.value = statsRes.data || {}
  } catch { /* */ }
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
      const { data } = await circleApi.list({ userId, page: 1, pageSize: 50 }).catch(() => ({ data: { circles: [] } }))
      circles.value = data.circles || data.data || []
    } catch { circles.value = [] }
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

async function handleBan() {
  try {
    await ElMessageBox.prompt("请输入封禁原因", "封禁用户", { type: "warning" })
    await userApi.ban(userId)
    ElMessage.success("已封禁")
    profile.value.userInfo.status = "DISABLED"
  } catch { /* */ }
}

async function handleUnban() {
  try {
    await ElMessageBox.confirm("确定解封该用户？", "提示", { type: "info" })
    await userApi.unban(userId)
    ElMessage.success("已解封")
    profile.value.userInfo.status = "ACTIVE"
  } catch { /* */ }
}
</script>

<style scoped>
.user-detail { padding: 16px; }
.header-title { font-size: 16px; font-weight: 500; color: #333; }
.tabs { margin-top: 16px; }
.tab-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.tab-summary { padding: 8px 0 12px; font-size: 14px; color: #666; }
h4 { color: #8b4513; margin: 8px 0; }

.stats-row { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; }
.stat-card {
  flex: 1; min-width: 100px; text-align: center;
  padding: 12px 8px; background: #fafafa; border-radius: 8px; border: 1px solid #eee;
}
.stat-value { font-size: 22px; font-weight: 600; color: #333; }
.stat-value.coin { color: #e6a23c; }
.stat-label { font-size: 12px; color: #999; margin-top: 2px; }

.behavior-item { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.behavior-target { color: #666; font-size: 13px; }
.behavior-meta { color: #999; font-size: 12px; }
.behavior-meta-detail { width: 100%; font-size: 12px; color: #999; word-break: break-all; }
</style>
