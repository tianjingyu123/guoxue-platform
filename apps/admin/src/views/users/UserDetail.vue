<template>
  <div class="user-detail">
    <el-page-header
      title="返回"
      @back="$router.push('/users')"
    >
      <template #content>
        <span class="header-title">
          用户详情 — {{ profile.userInfo?.nickname || maskPhone(profile.userInfo?.phone) || '加载中...' }}
        </span>
        <el-tag
          v-if="profile.userInfo"
          size="small"
          style="margin-left:8px"
          :type="profile.userInfo.status === 'ACTIVE' ? 'success' : 'danger'"
        >
          {{ profile.userInfo.status === 'ACTIVE' ? '正常' : profile.userInfo.status === 'BANNED' ? '封禁' : '禁用' }}
        </el-tag>
      </template>
      <template #extra>
        <el-button
          v-if="profile.userInfo?.status === 'ACTIVE'"
          v-permission="['SUPER_ADMIN','OPERATION_ADMIN']"
          size="small"
          type="warning"
          @click="handleBan"
        >
          封禁用户
        </el-button>
        <el-button
          v-else-if="profile.userInfo"
          v-permission="['SUPER_ADMIN','OPERATION_ADMIN']"
          size="small"
          type="success"
          @click="handleUnban"
        >
          解封用户
        </el-button>
      </template>
    </el-page-header>

    <!-- 画像加载失败：给重试，不白屏 -->
    <el-result
      v-if="pageError && !profile.userInfo"
      icon="error"
      title="用户画像加载失败"
      sub-title="请检查网络后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="loadProfile"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 统计概览卡片 -->
      <div
        v-if="profile.userInfo"
        class="stats-row"
      >
        <div class="stat-card">
          <div class="stat-value">
            {{ profile.orderStats?.totalOrders ?? 0 }}
          </div>
          <div class="stat-label">
            有效订单
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value coin">
            {{ profile.coinBalance || 0 }}
          </div>
          <div class="stat-label">
            国学币余额
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ stats.totalCollects || 0 }}
          </div>
          <div class="stat-label">
            收藏
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ stats.totalLikes || 0 }}
          </div>
          <div class="stat-label">
            点赞
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ stats.followers || 0 }}
          </div>
          <div class="stat-label">
            粉丝
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ stats.following || 0 }}
          </div>
          <div class="stat-label">
            关注
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ profile.deviceList?.length || 0 }}
          </div>
          <div class="stat-label">
            设备数
          </div>
        </div>
      </div>

      <el-tabs
        v-model="activeTab"
        class="tabs"
        @tab-change="onTabChange"
      >
        <!-- 基本信息 -->
        <el-tab-pane
          label="基本信息"
          name="profile"
        >
          <el-descriptions
            v-if="profile.userInfo"
            :column="2"
            border
          >
            <el-descriptions-item
              label="用户ID"
              :span="2"
            >
              <span
                class="copyable"
                :title="profile.userInfo.id"
                @click="copyText(profile.userInfo.id)"
              >
                {{ profile.userInfo.id }}
                <el-icon class="copy-icon"><CopyDocument /></el-icon>
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="昵称">
              {{ profile.userInfo.nickname || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="手机号">
              {{ maskPhone(profile.userInfo.phone) }}
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">
              {{ maskEmail(profile.userInfo.email) }}
            </el-descriptions-item>
            <el-descriptions-item label="性别">
              {{ profile.userInfo.gender === 'MALE' ? '男' : profile.userInfo.gender === 'FEMALE' ? '女' : '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="生日">
              {{ profile.userInfo.birthday || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="个人简介">
              {{ profile.userInfo.bio || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="会员等级">
              <el-tag
                v-if="profile.memberInfo?.memberLevel && profile.memberInfo.memberLevel !== 'NONE'"
                size="small"
                type="warning"
              >
                {{ memberLabel(profile.memberInfo.memberLevel) }}
              </el-tag>
              <span v-else>非会员</span>
            </el-descriptions-item>
            <el-descriptions-item label="会员到期">
              {{ profile.memberInfo?.memberExpire ? fmtDateTime(profile.memberInfo.memberExpire).slice(0, 10) : '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">
              {{ fmtDateTime(profile.userInfo.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="最后活跃">
              <!-- 后端 profile 返回体无 lastActiveAt 字段，取行为日志/设备活跃的真实最近时间，均无则诚实显示 — -->
              <el-tooltip
                v-if="lastActiveAt"
                :content="`取自最近行为/设备活跃记录：${fmtDateTime(lastActiveAt)}`"
                placement="top"
              >
                <span>{{ formatRelative(lastActiveAt) }}</span>
              </el-tooltip>
              <span v-else>—</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 行为轨迹 — 客服核心视图 -->
        <el-tab-pane
          label="行为轨迹"
          name="behavior"
        >
          <el-timeline v-if="behaviors.length > 0">
            <el-timeline-item
              v-for="b in behaviors"
              :key="b.id"
              :timestamp="fmtDateTime(b.createdAt)"
              placement="top"
              :type="behaviorColor(b.action)"
            >
              <div class="behavior-item">
                <el-tag
                  size="small"
                  :type="behaviorTagType(b.action)"
                >
                  {{ behaviorLabel(b.action) }}
                </el-tag>
                <span
                  v-if="b.targetType"
                  class="behavior-target"
                >
                  {{ targetTypeLabel(b.targetType) }}
                  <template v-if="b.targetId">({{ b.targetId.slice(0, 8) }}...)</template>
                </span>
                <span
                  v-if="b.ip"
                  class="behavior-meta"
                >IP: {{ maskIp(b.ip) }}</span>
                <span
                  v-if="b.deviceId"
                  class="behavior-meta"
                >设备: {{ b.deviceId.slice(0, 12) }}...</span>
                <div
                  v-if="b.meta && Object.keys(b.meta).length > 0"
                  class="behavior-meta-detail"
                >
                  {{ formatMeta(b.meta) }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty
            v-else
            description="暂无行为记录"
          />
        </el-tab-pane>

        <!-- 设备列表 -->
        <el-tab-pane
          label="设备列表"
          name="devices"
        >
          <el-table
            :data="profile.deviceList || []"
            size="small"
            stripe
          >
            <el-table-column
              label="设备ID"
              min-width="180"
            >
              <template #default="{ row }">
                <span
                  class="copyable"
                  :title="row.deviceId"
                  @click="copyText(row.deviceId)"
                >{{ row.deviceId?.slice(0, 12) }}...</span>
              </template>
            </el-table-column>
            <el-table-column
              label="平台"
              width="100"
            >
              <template #default="{ row }">
                {{ row.platform || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="可信设备"
              width="90"
            >
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.isTrusted ? 'success' : 'info'"
                >
                  {{ row.isTrusted ? '可信' : '普通' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="首次出现"
              width="150"
            >
              <template #default="{ row }">
                {{ fmtDateTime(row.firstSeenAt) }}
              </template>
            </el-table-column>
            <el-table-column
              label="最近活跃"
              width="150"
            >
              <template #default="{ row }">
                {{ fmtDateTime(row.lastSeenAt) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!profile.deviceList?.length"
            description="暂无设备信息"
          />
        </el-tab-pane>

        <!-- 订单记录 -->
        <el-tab-pane
          label="订单记录"
          name="orders"
        >
          <!-- 汇总与顶部"有效订单"卡、国学币页的"累计消费"同源：均取后端 profile.orderStats（已支付+已完成全量聚合） -->
          <div
            v-if="profile.orderStats"
            class="tab-summary"
          >
            有效订单（已支付/已完成）<b>{{ profile.orderStats.totalOrders ?? 0 }}</b> 笔 ·
            实付总额 <b>{{ fmtMoney(profile.orderStats.totalAmount) }}</b>
            <span class="summary-note">口径：该用户全部时间的已支付/已完成订单聚合；下表为该用户全部状态订单（含待支付/已取消）共 {{ orderTotal }} 笔</span>
          </div>
          <el-table
            v-loading="orderLoading"
            :data="orders"
            stripe
            size="small"
          >
            <el-table-column
              label="订单号"
              width="140"
            >
              <template #default="{ row }">
                <span
                  class="copyable"
                  :title="row.id"
                  @click="copyText(row.id)"
                >
                  {{ row.id?.slice(0, 8) }}...
                  <el-icon class="copy-icon"><CopyDocument /></el-icon>
                </span>
              </template>
            </el-table-column>
            <el-table-column
              label="类型"
              width="100"
            >
              <template #default="{ row }">
                {{ orderTypeLabel(row.type) }}
              </template>
            </el-table-column>
            <el-table-column
              label="金额"
              width="110"
              align="right"
            >
              <template #default="{ row }">
                {{ fmtMoney(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column
              label="状态"
              width="90"
            >
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="orderStatusType(row.status)"
                >
                  {{ orderStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="时间"
              width="150"
            >
              <template #default="{ row }">
                {{ fmtDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                v-if="!orderLoading"
                description="该用户暂无订单"
                :image-size="70"
              />
            </template>
          </el-table>
          <div
            v-if="orderTotal > orderPageSize"
            class="pagination"
          >
            <el-pagination
              v-model:current-page="orderPage"
              :page-size="orderPageSize"
              :total="orderTotal"
              layout="total, prev, pager, next"
              @current-change="fetchOrders"
            />
          </div>
        </el-tab-pane>

        <!-- 圈子/课程 -->
        <el-tab-pane
          label="圈子/课程"
          name="circles"
        >
          <h4>加入的圈子 ({{ profile.circleCount || 0 }})</h4>
          <el-alert
            v-if="circlesState === 'unavailable'"
            type="info"
            :closable="false"
            show-icon
            title="圈子明细待后端部署"
            description="圈子成员明细端点（GET /users/:id/circles）尚未上线，暂只能显示加入圈子总数。端点部署后此处自动恢复。"
            style="margin-bottom:12px"
          />
          <el-alert
            v-else-if="circlesState === 'error'"
            type="error"
            :closable="false"
            show-icon
            style="margin-bottom:12px"
          >
            <template #title>
              圈子明细加载失败
              <el-button
                size="small"
                type="primary"
                link
                @click="fetchCircles"
              >
                重试
              </el-button>
            </template>
          </el-alert>
          <el-table
            v-if="circlesState === 'ready'"
            v-loading="circlesLoading"
            :data="circles"
            size="small"
            stripe
          >
            <el-table-column
              label="圈子名"
              min-width="140"
            >
              <template #default="{ row }">
                {{ row.circle?.name || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="角色"
              width="100"
            >
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.role === 'OWNER' ? 'danger' : row.role === 'ADMIN' ? 'warning' : 'info'"
                >
                  {{ circleRoleLabel(row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="加入时间"
              width="150"
            >
              <template #default="{ row }">
                {{ fmtDateTime(row.joinedAt || row.createdAt) }}
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                v-if="!circlesLoading"
                description="该用户未加入任何圈子"
                :image-size="70"
              />
            </template>
          </el-table>
          <h4 style="margin-top:20px">
            学习中的课程
          </h4>
          <el-table
            :data="profile.learningProgress || []"
            size="small"
            stripe
          >
            <el-table-column
              label="课程ID"
              width="160"
            >
              <template #default="{ row }">
                <span
                  class="copyable"
                  :title="row.courseId"
                  @click="copyText(row.courseId)"
                >{{ row.courseId?.slice(0, 8) }}...</span>
              </template>
            </el-table-column>
            <el-table-column
              label="进度"
              width="120"
            >
              <template #default="{ row }">
                <el-progress
                  :percentage="row.progress || 0"
                  :stroke-width="6"
                />
              </template>
            </el-table-column>
            <el-table-column
              label="完成"
              width="70"
            >
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.completed ? 'success' : 'info'"
                >
                  {{ row.completed ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="最近学习"
              width="150"
            >
              <template #default="{ row }">
                {{ fmtDateTime(row.updatedAt) }}
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                description="暂无学习记录"
                :image-size="70"
              />
            </template>
          </el-table>
        </el-tab-pane>

        <!-- 国学币 -->
        <el-tab-pane
          label="国学币"
          name="coins"
        >
          <el-descriptions
            v-if="profile.coinBalance !== undefined"
            :column="2"
            border
          >
            <el-descriptions-item label="当前余额">
              {{ profile.coinBalance }}
            </el-descriptions-item>
            <el-descriptions-item label="累计消费（有效订单实付总额）">
              {{ fmtMoney(profile.orderStats?.totalAmount) }}
            </el-descriptions-item>
          </el-descriptions>
          <el-empty
            v-else
            description="暂无国学币数据"
          />
        </el-tab-pane>

        <!-- 角色权限 -->
        <el-tab-pane
          label="角色权限"
          name="roles"
        >
          <div
            v-permission="['SUPER_ADMIN']"
            class="tab-toolbar"
          >
            <el-select
              v-model="newRole"
              placeholder="选择角色"
            >
              <el-option
                v-for="r in availableRoles"
                :key="r.value"
                :label="r.label"
                :value="r.value"
              />
            </el-select>
            <el-button
              type="primary"
              :disabled="!newRole"
              @click="assignRole"
            >
              分配角色
            </el-button>
          </div>
          <el-table
            :data="userRoles"
            border
            size="small"
          >
            <el-table-column
              label="角色"
              min-width="140"
            >
              <template #default="{ row }">
                {{ roleLabel(row.roleType) }}
              </template>
            </el-table-column>
            <el-table-column
              label="绑定ID"
              width="200"
            >
              <template #default="{ row }">
                <span
                  v-if="row.bindId"
                  class="copyable"
                  :title="row.bindId"
                  @click="copyText(row.bindId)"
                >{{ row.bindId.slice(0, 8) }}...</span>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="80"
            >
              <template #default="{ row }">
                <el-button
                  v-permission="['SUPER_ADMIN']"
                  size="small"
                  type="danger"
                  @click="removeRole(row)"
                >
                  移除
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                description="该用户无特殊角色（普通用户）"
                :image-size="70"
              />
            </template>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import axios from 'axios'
import { userApi, orderApi } from '@/api'

const route = useRoute()
const userId = route.params.id as string

const activeTab = ref('profile')
const profile = ref<any>({})
const stats = ref<any>({})
const pageError = ref(false)
const userRoles = ref<any[]>([])
const orders = ref<any[]>([])
const orderLoading = ref(false)
const ordersLoaded = ref(false)
const orderPage = ref(1)
const orderPageSize = 20
const orderTotal = ref(0)
const circles = ref<any[]>([])
const circlesLoading = ref(false)
// idle=未加载 ready=已加载 unavailable=端点未部署(404降级) error=其他错误可重试
const circlesState = ref<'idle' | 'ready' | 'unavailable' | 'error'>('idle')
const behaviors = ref<any[]>([])
const newRole = ref('')
const assigning = ref(false)

// 新契约端点探测专用（绕过全局错误弹窗：404 属预期降级，不该弹英文报错）
const probe = axios.create({ baseURL: '/api/v1', timeout: 10000 })
probe.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
function unwrapEnvelope(d: any) {
  return d && typeof d === 'object' && 'code' in d && 'data' in d ? d.data : d
}

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

// 行为 meta 键名人话化
const META_KEY_MAP: Record<string, string> = {
  keyword: '关键词', page: '页面', source: '来源', amount: '金额',
  duration: '时长(秒)', type: '类型', action: '动作', title: '标题',
  name: '名称', count: '数量', channel: '渠道', platform: '平台',
  targetType: '对象类型', targetId: '对象ID', orderId: '订单',
}

const CIRCLE_ROLE_MAP: Record<string, string> = {
  OWNER: '圈主', ADMIN: '管理员', MEMBER: '成员', GUEST: '围观',
}

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING: '待支付', PAID: '已支付', SHIPPED: '已发货',
  COMPLETED: '已完成', REFUNDED: '已退款', CANCELLED: '已取消',
}

function memberLabel(l: string) {
  return { NONE: '非会员', MONTHLY: '月卡', YEARLY: '年卡', LIFETIME: '终身' }[l] || l
}
function roleLabel(r: string) { return ROLE_MAP[r] || r }
function circleRoleLabel(r: string) { return CIRCLE_ROLE_MAP[r] || r || '—' }
function orderTypeLabel(t: string) {
  const m: Record<string, string> = {
    MEMBER: '会员', COURSE: '课程', PRODUCT: '商品', CIRCLE_JOIN: '入圈',
    CIRCLE_RENEW: '圈子续费', STATION_MASTER: '分站', OPERATOR: '运营商',
    BOT_SERVICE: '智能体', PAIPAN: '排盘', LIVESTREAM: '直播',
    BUNDLE: '课程包', PRACTITIONER_PRO: '从业者会员',
  }
  return m[t] || t
}
function orderStatusLabel(s: string) { return ORDER_STATUS_MAP[s] || s }
function orderStatusType(s: string) {
  return { PENDING: 'warning', PAID: 'success', SHIPPED: 'warning', COMPLETED: 'success', REFUNDED: 'info', CANCELLED: 'info' }[s] || 'info'
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

/** 行为 meta 人话化：键翻译 + 枚举值复用 BEHAVIOR_MAP/TARGET_MAP，替代 JSON 生肉 */
function formatMeta(meta: Record<string, any>): string {
  return Object.entries(meta)
    .map(([k, v]) => {
      const key = META_KEY_MAP[k] || k
      let val: string
      if (v == null) val = '—'
      else if (typeof v === 'object') val = JSON.stringify(v)
      else if (typeof v === 'string') val = BEHAVIOR_MAP[v] || TARGET_MAP[v] || ORDER_STATUS_MAP[v] || v
      else val = String(v)
      return `${key}：${val}`
    })
    .join(' · ')
}

function fmtDateTime(t?: string | Date | null) {
  if (!t) return '—'
  const d = new Date(t)
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmtMoney(n?: number | string | null) {
  const v = Number(n ?? 0)
  return '¥' + (isNaN(v) ? 0 : v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function copyText(text?: string) {
  if (!text) return
  navigator.clipboard?.writeText(text)
    .then(() => ElMessage.success('已复制'))
    .catch(() => ElMessage.error('复制失败'))
}

function formatRelative(t: string) {
  if (!t) return '—'
  const diff = Date.now() - new Date(t).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return fmtDateTime(t)
}

/**
 * 最后活跃：后端 GET /users/:id/profile 的 userInfo 无 lastActiveAt 字段（user.service.ts getUserProfile
 * 只 select 到 createdAt），取画像里真实的活跃证据：最近行为日志时间 与 设备最近活跃时间 的最大值；均无则显示 —。
 */
const lastActiveAt = computed<string | null>(() => {
  const times: number[] = []
  const b = profile.value.recentBehavior?.[0]?.createdAt
  if (b) {
    const t = new Date(b).getTime()
    if (!isNaN(t)) times.push(t)
  }
  for (const dev of profile.value.deviceList || []) {
    if (dev.lastSeenAt) {
      const t = new Date(dev.lastSeenAt).getTime()
      if (!isNaN(t)) times.push(t)
    }
  }
  if (times.length === 0) return null
  return new Date(Math.max(...times)).toISOString()
})

onMounted(loadProfile)

async function loadProfile() {
  pageError.value = false
  try {
    // profile 端点不返回 roles，角色列表须走 GET /users/:id（返回 roles: [{roleType,bindId}]）
    const [profileRes, statsRes, detailRes] = await Promise.all([
      userApi.getAdminProfile(userId),
      userApi.getUserStats(userId).catch(() => ({ data: {} })),
      userApi.detail(userId).catch(() => ({ data: {} })),
    ])
    profile.value = profileRes.data
    behaviors.value = profileRes.data.recentBehavior || []
    stats.value = statsRes.data || {}
    userRoles.value = (detailRes.data as any)?.roles || []
  } catch {
    pageError.value = true
  }
}

async function onTabChange(tab: string) {
  if (tab === 'orders' && !ordersLoaded.value) {
    ordersLoaded.value = true
    fetchOrders()
  }
  if (tab === 'circles' && circlesState.value === 'idle') {
    fetchCircles()
  }
}

async function fetchOrders() {
  orderLoading.value = true
  try {
    // 后端 GET /shop/orders 支持 userId 过滤（OrderListQueryDto.userId），返回 {orders,total}
    const { data } = await orderApi.list({ page: orderPage.value, pageSize: orderPageSize, userId })
    orders.value = data.orders || data.items || []
    orderTotal.value = data.total || 0
  } catch {
    orders.value = []
    ElMessage.error('订单加载失败，请重试')
  } finally { orderLoading.value = false }
}

async function fetchCircles() {
  circlesLoading.value = true
  try {
    // 新契约：GET /users/:id/circles → [{circle:{id,name},role,joinedAt}]（并行后端部署中，404 时降级提示）
    const res = await probe.get(`/users/${userId}/circles`)
    const d = unwrapEnvelope(res.data)
    circles.value = Array.isArray(d) ? d : (d?.items || [])
    circlesState.value = 'ready'
  } catch (e: any) {
    circles.value = []
    circlesState.value = e?.response?.status === 404 ? 'unavailable' : 'error'
  } finally { circlesLoading.value = false }
}

// 隐私脱敏
function maskPhone(p?: string) {
  if (!p) return '—'
  const s = String(p)
  if (s.length < 7) return s.replace(/\d(?=\d)/g, '*')
  return s.slice(0, 3) + '****' + s.slice(-4)
}
function maskEmail(e?: string) {
  if (!e) return '—'
  const [name, domain] = String(e).split('@')
  if (!domain) return e
  return name.slice(0, 1) + '***@' + domain
}
function maskIp(ip?: string) {
  if (!ip) return '—'
  const parts = String(ip).split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`
  return String(ip).slice(0, 6) + '***'
}

async function refreshRoles() {
  const { data } = await userApi.detail(userId)
  userRoles.value = (data as any)?.roles || []
}

async function assignRole() {
  if (!newRole.value) return
  if (assigning.value) return
  try {
    await ElMessageBox.confirm(
      `确定为该用户授予「${roleLabel(newRole.value)}」角色？`,
      '授予角色',
      { type: 'warning', confirmButtonText: '确认授予', cancelButtonText: '取消' },
    )
    assigning.value = true
    await userApi.assignRole(userId, { roleType: newRole.value })
    ElMessage.success('角色已分配')
    newRole.value = ''
    await refreshRoles()
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ } finally { assigning.value = false }
}

async function removeRole(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定移除角色「${roleLabel(row.roleType)}」？`,
      '移除角色',
      { type: 'warning', confirmButtonText: '确认移除', cancelButtonText: '取消' },
    )
    await userApi.removeRole(userId, row.roleType, row.bindId)
    ElMessage.success('已移除')
    await refreshRoles()
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ }
}

async function handleBan() {
  try {
    // L2 危险操作：封禁理由必填并随请求传后端（并行后端契约：PUT /users/:id/status 支持 reason）
    const { value: reason } = await ElMessageBox.prompt(
      '请输入封禁原因（必填，将记录留痕）',
      '封禁用户',
      {
        type: 'warning',
        confirmButtonText: '确认封禁',
        cancelButtonText: '取消',
        inputPlaceholder: '如：发布违规内容 / 恶意刷单',
        inputValidator: (v: string) => (v && v.trim().length >= 2) ? true : '请填写封禁原因（至少2个字）',
      },
    )
    await userApi.ban(userId, reason.trim())
    ElMessage.success('已封禁')
    profile.value.userInfo.status = 'DISABLED'
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ }
}

async function handleUnban() {
  try {
    await ElMessageBox.confirm('确定解封该用户？解封后其可正常登录与使用平台功能。', '解封用户', {
      type: 'info', confirmButtonText: '确认解封', cancelButtonText: '取消',
    })
    await userApi.unban(userId)
    ElMessage.success('已解封')
    profile.value.userInfo.status = 'ACTIVE'
  } catch { /* 取消或失败（失败已由全局拦截器提示） */ }
}
</script>

<style scoped>
.user-detail { padding: 16px; }
.header-title { font-size: 16px; font-weight: 500; color: #333; }
.tabs { margin-top: 16px; }
.tab-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.tab-summary { padding: 8px 0 12px; font-size: 14px; color: #666; }
.tab-summary b { color: #C41E3A; }
.summary-note { display: block; margin-top: 4px; font-size: 12px; color: var(--color-text-secondary); }
h4 { color: var(--color-text-title); margin: 8px 0; }

.copyable { cursor: pointer; }
.copyable:hover { color: #C41E3A; }
.copy-icon { font-size: 12px; vertical-align: -1px; margin-left: 2px; color: var(--color-text-secondary); }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }

.stats-row { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; }
.stat-card {
  flex: 1; min-width: 100px; text-align: center;
  padding: 12px 8px; background: #fafafa; border-radius: 8px; border: 1px solid #eee;
}
.stat-value { font-size: 22px; font-weight: 600; color: #333; }
.stat-value.coin { color: #e6a23c; }
.stat-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }

.behavior-item { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.behavior-target { color: #666; font-size: 13px; }
.behavior-meta { color: var(--color-text-secondary); font-size: 12px; }
.behavior-meta-detail { width: 100%; font-size: 12px; color: var(--color-text-secondary); word-break: break-all; }
</style>
