<template>
  <view class="page">
    <view
      v-if="loading"
      class="skeleton-page"
    >
      <view class="skeleton-header" />
      <view
        v-for="i in 4"
        :key="i"
        class="skeleton-row"
      />
    </view>

    <template v-else-if="circle">
      <!-- 顶部概览 -->
      <view class="header-card">
        <image
          v-if="circle.cover"
          :src="circle.cover"
          class="cover"
          mode="aspectFill"
        />
        <view class="header-info">
          <text class="circle-name">
            {{ circle.name }}
          </text>
          <text class="circle-tag">
            {{ circle.type === 'FREE' ? '免费圈' : circle.type === 'YEARLY' ? '年费圈' : '付费圈' }}
          </text>
        </view>
      </view>

      <!-- 数据概览卡片 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-value">
            {{ circle.memberCount || 0 }}
          </text><text class="stat-label">
            成员
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-value">
            {{ circle.postCount || 0 }}
          </text><text class="stat-label">
            帖子
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-value">
            {{ dashData?.totalRevenue || 0 }}
          </text><text class="stat-label">
            收益(元)
          </text>
        </view>
        <view class="stat-item">
          <text class="stat-value">
            {{ dashData?.pendingQuestions || 0 }}
          </text><text class="stat-label">
            待回答
          </text>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="quick-actions">
        <view
          class="q-action"
          @click="editAnnouncement"
        >
          <text class="q-icon">
            📢
          </text><text>公告</text>
        </view>
        <view
          class="q-action"
          @click="switchTab('members')"
        >
          <text class="q-icon">
            👥
          </text><text>成员</text>
        </view>
        <view
          class="q-action"
          @click="switchTab('posts')"
        >
          <text class="q-icon">
            📝
          </text><text>审核</text>
        </view>
        <view
          class="q-action"
          @click="switchTab('experts')"
        >
          <text class="q-icon">
            ⭐
          </text><text>达人</text>
        </view>
      </view>

      <!-- Tab内容区 -->
      <view class="tab-bar">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab-item"
          :class="{ active: activeTab === t.key }"
          @click="switchTab(t.key)"
        >
          {{ t.label }}
        </view>
      </view>

      <!-- 公告编辑 -->
      <view
        v-if="activeTab === 'announcement'"
        class="section"
      >
        <textarea
          v-model="announcement"
          class="announce-input"
          placeholder="输入圈子公告..."
          :maxlength="500"
        />
        <text class="char-count">
          {{ announcement.length }}/500
        </text>
        <button
          class="save-btn"
          :disabled="savingAnnouncement"
          @click="saveAnnouncement"
        >
          {{ savingAnnouncement ? '保存中...' : '发布公告' }}
        </button>
      </view>

      <!-- 成员管理 -->
      <view
        v-if="activeTab === 'members'"
        class="section"
      >
        <view class="filter-row">
          <input
            v-model="memberSearch"
            class="filter-input"
            placeholder="搜索成员..."
          >
          <picker
            :range="roleOptions"
            @change="(e: any) => memberRoleFilter = roleValues[e.detail.value]"
          >
            <text class="filter-picker">
              {{ memberRoleFilter ? roleLabel(memberRoleFilter) : '角色筛选 ▼' }}
            </text>
          </picker>
        </view>
        <view
          v-if="memberLoading"
          class="loading-text"
        >
          加载中...
        </view>
        <view
          v-else-if="members.length > 0"
          class="member-list"
        >
          <view
            v-for="m in members"
            :key="m.userId"
            class="member-row"
          >
            <image
              v-if="m.user?.avatar"
              :src="m.user.avatar"
              class="m-avatar"
              mode="aspectFill"
            />
            <view
              v-else
              class="m-avatar-placeholder"
            />
            <view class="m-info">
              <text class="m-name">
                {{ m.user?.nickname || m.userId }}
              </text>
              <text class="m-time">
                {{ fmtDate(m.joinedAt) }}
              </text>
            </view>
            <text class="m-role">
              {{ roleLabel(m.role) }}
            </text>
            <text
              v-if="m.role !== 'OWNER'"
              class="m-remove"
              @click="removeMember(m)"
            >
              移除
            </text>
          </view>
        </view>
        <EmptyState
          v-else
          icon="👥"
          text="暂无成员"
        />
      </view>

      <!-- 帖子审核 -->
      <view
        v-if="activeTab === 'posts'"
        class="section"
      >
        <view
          v-if="postLoading"
          class="loading-text"
        >
          加载中...
        </view>
        <view
          v-else-if="posts.length > 0"
          class="post-list"
        >
          <view
            v-for="p in posts"
            :key="p.id"
            class="audit-post"
          >
            <text class="ap-title">
              {{ p.title || p.content?.slice(0, 50) }}
            </text>
            <text class="ap-author">
              by {{ p.user?.nickname || '匿名' }}
            </text>
            <view class="ap-actions">
              <text
                v-if="p.status === 'AUDITING'"
                class="ap-approve"
                @click="approvePost(p)"
              >
                通过
              </text>
              <text
                v-if="p.status === 'AUDITING'"
                class="ap-reject"
                @click="rejectPost(p)"
              >
                拒绝
              </text>
              <text
                class="ap-delete"
                @click="deletePost(p)"
              >
                删除
              </text>
            </view>
          </view>
        </view>
        <EmptyState
          v-else
          icon="📝"
          text="暂无待审核帖子"
        />
      </view>

      <!-- 达人配置 -->
      <view
        v-if="activeTab === 'experts'"
        class="section"
      >
        <view
          v-if="expertLoading"
          class="loading-text"
        >
          加载中...
        </view>
        <view
          v-else-if="experts.length > 0"
          class="expert-list"
        >
          <view
            v-for="e in experts"
            :key="e.userId"
            class="expert-row"
          >
            <text class="ex-name">
              {{ e.user?.nickname || e.userId }}
            </text>
            <view class="ex-prices">
              <view class="ex-field">
                <text class="ex-label">
                  提问价
                </text>
                <input
                  v-model.number="e.questionPriceCoin"
                  type="number"
                  class="ex-input"
                  @blur="saveExpertConfig(e)"
                >
                <text class="ex-unit">
                  币
                </text>
              </view>
              <view class="ex-field">
                <text class="ex-label">
                  连麦价
                </text>
                <input
                  v-model.number="e.callPricePerMinuteCoin"
                  type="number"
                  class="ex-input"
                  @blur="saveExpertConfig(e)"
                >
                <text class="ex-unit">
                  币/分
                </text>
              </view>
            </view>
          </view>
        </view>
        <EmptyState
          v-else
          icon="⭐"
          text="暂无可配置的达人"
        />
      </view>

      <!-- 收益概览 -->
      <view
        v-if="activeTab === 'revenue'"
        class="section"
      >
        <view class="revenue-summary">
          <text class="rv-total">
            总收益: ¥{{ dashData?.totalRevenue || 0 }}
          </text>
          <text class="rv-month">
            本月: ¥{{ dashData?.monthRevenue || 0 }}
          </text>
        </view>
        <view
          v-if="revenueLoading"
          class="loading-text"
        >
          加载中...
        </view>
        <view
          v-else-if="revenues.length > 0"
          class="revenue-list"
        >
          <view
            v-for="r in revenues"
            :key="r.id"
            class="rv-row"
          >
            <view class="rv-left">
              <text class="rv-type">
                {{ { circle_join: '入圈', course: '课程', product: '商品', gift: '礼物' }[r.type] || r.type }}
              </text>
              <text class="rv-date">
                {{ fmtDate(r.createdAt) }}
              </text>
            </view>
            <view class="rv-right">
              <text class="rv-amount">
                ¥{{ r.amount }}
              </text>
              <text class="rv-share">
                得¥{{ r.ownerShare }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <EmptyState
      v-else
      icon="⚠️"
      text="圈子加载失败"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { circleApi, circleDashboardApi } from '../../api'
import EmptyState from '../../components/EmptyState.vue'

const circleId = ref('')
const circle = ref<any>(null)
const dashData = ref<any>({})
const loading = ref(false)

const tabs = [
  { key: 'announcement', label: '公告' },
  { key: 'members', label: '成员' },
  { key: 'posts', label: '审核' },
  { key: 'experts', label: '达人' },
  { key: 'revenue', label: '收益' },
]
const activeTab = ref('members')

// 公告
const announcement = ref('')
const savingAnnouncement = ref(false)

// 成员
const members = ref<any[]>([])
const memberLoading = ref(false)
const memberSearch = ref('')
const memberRoleFilter = ref('')
const roleOptions = ['全部', '圈主', '合伙人', '管理员', '嘉宾', '志愿者', '成员']
const roleValues = ['', 'OWNER', 'PARTNER', 'ADMIN', 'GUEST', 'VOLUNTEER', 'MEMBER']
const roleLabel = (r: string) => roleOptions[roleValues.indexOf(r)] || r

// 帖子
const posts = ref<any[]>([])
const postLoading = ref(false)

// 达人
const experts = ref<any[]>([])
const expertLoading = ref(false)

// 收益
const revenues = ref<any[]>([])
const revenueLoading = ref(false)

function fmtDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  circleId.value = opts.id || ''
  if (circleId.value) init()
})

async function init() {
  loading.value = true
  try {
    const { data } = await circleApi.detail(circleId.value)
    circle.value = data as any
    // 检查是否为本圈圈主/管理员
    const isOwner = circle.value?.ownerId || circle.value?.membership?.role === 'OWNER'
    if (!isOwner && circle.value?.membership?.role !== 'ADMIN' && circle.value?.membership?.role !== 'PARTNER') {
      uni.showToast({ title: '仅圈主/管理员可访问', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }
  } catch { /* ignore */ }
  loading.value = false
  fetchOverview()
  fetchMembers()
}

async function fetchOverview() {
  try { const { data } = await circleDashboardApi.overview(circleId.value); dashData.value = data || {}; } catch { /* */ }
}

function switchTab(key: string) {
  activeTab.value = key
  if (key === 'announcement') loadAnnouncement()
  if (key === 'members') fetchMembers()
  if (key === 'posts') fetchPendingPosts()
  if (key === 'experts') fetchExperts()
  if (key === 'revenue') fetchRevenue()
}

// 公告
async function loadAnnouncement() {
  try { const { data } = await circleApi.getAnnouncement(circleId.value); announcement.value = (data as any)?.content || ''; } catch { /* */ }
}
async function saveAnnouncement() {
  if (!announcement.value.trim()) return
  savingAnnouncement.value = true
  try { await circleApi.setAnnouncement(circleId.value, announcement.value); uni.showToast({ title: '已发布', icon: 'success' }); } catch { /* */ }
  finally { savingAnnouncement.value = false }
}
async function editAnnouncement() { activeTab.value = 'announcement'; loadAnnouncement(); }

// 成员
async function fetchMembers() {
  memberLoading.value = true
  try {
    const data = await circleApi.listMembers(circleId.value, 1, 100)
    members.value = (data as any)?.members || (data as any)?.data || []
  } catch { members.value = [] } finally { memberLoading.value = false }
}
async function removeMember(m: any) {
  const { confirm } = await uni.showModal({ title: "移除成员", content: `确定移除 ${m.user?.nickname || m.userId} 吗？` });
  if (!confirm) return;
  try { await circleApi.removeMember(circleId.value, m.userId); uni.showToast({ title: "已移除", icon: "success" }); fetchMembers(); fetchOverview(); } catch { uni.showToast({ title: "移除失败", icon: "none" }); }
}

// 帖子审核
async function fetchPendingPosts() {
  postLoading.value = true
  try {
    const { data } = await circleApi.posts(circleId.value, { page: 1, pageSize: 50 })
    const d = data as any; posts.value = (d?.posts || d?.data || []).filter((p: any) => p.status !== 'PUBLISHED')
  } catch { posts.value = [] } finally { postLoading.value = false }
}
async function approvePost(p: any) {
  try { await circleApi.posts(circleId.value, { ...p, status: 'PUBLISHED' }); fetchPendingPosts(); } catch { /* */ }
}
async function rejectPost(p: any) {
  try { await circleApi.deletePost(circleId.value, p.id); fetchPendingPosts(); } catch { /* */ }
}
async function deletePost(p: any) {
  try { await circleApi.deletePost(circleId.value, p.id); fetchPendingPosts(); } catch { /* */ }
}

// 达人
async function fetchExperts() {
  expertLoading.value = true
  try {
    const { data } = await circleApi.getExperts(circleId.value)
    experts.value = (data as any)?.experts || (data as any)?.data || []
  } catch { experts.value = [] } finally { expertLoading.value = false }
}
async function saveExpertConfig(e: any) {
  try {
    await circleApi.setExpertConfig(circleId.value, {
      userId: e.userId,
      questionPriceCoin: e.questionPriceCoin,
      callPricePerMinuteCoin: e.callPricePerMinuteCoin,
    } as any)
  } catch { /* */ }
}

// 收益
async function fetchRevenue() {
  revenueLoading.value = true
  try {
    const data = await circleDashboardApi.revenueBreakdown(circleId.value)
    const d = data as any; revenues.value = d?.items || d?.data || []
  } catch { revenues.value = [] } finally { revenueLoading.value = false }
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 20px; }
.skeleton-page { padding: 12px; }
.skeleton-header { height: 120px; border-radius: 8px; background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%); animation: shimmer 1.5s infinite; margin-bottom: 12px; }
.skeleton-row { height: 50px; border-radius: 6px; background: linear-gradient(90deg, #f0e8d8 25%, #e8dcc8 50%, #f0e8d8 75%); animation: shimmer 1.5s infinite; margin-bottom: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.header-card { background: linear-gradient(135deg, #C41E3A, #C9A96E); padding: 20px 16px; display: flex; align-items: center; gap: 12px; }
.cover { width: 56px; height: 56px; border-radius: 12px; }
.header-info { flex: 1; }
.circle-name { font-size: 18px; font-weight: bold; color: #fff; display: block; }
.circle-tag { font-size: 12px; color: rgba(255,255,255,0.8); }

.stats-row { display: flex; background: #fff; padding: 12px; margin: 0 0 8px 0; }
.stat-item { flex: 1; text-align: center; }
.stat-value { display: block; font-size: 20px; font-weight: bold; color: #C41E3A; }
.stat-label { display: block; font-size: 11px; color: #999; margin-top: 2px; }

.quick-actions { display: flex; background: #fff; padding: 12px; margin-bottom: 8px; gap: 0; }
.q-action { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; color: #666; }
.q-icon { font-size: 22px; }

.tab-bar { display: flex; background: #fff; padding: 0 12px; margin-bottom: 8px; }
.tab-item { flex: 1; text-align: center; padding: 12px 0; font-size: 14px; color: #666; border-bottom: 2px solid transparent; }
.tab-item.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: bold; }

.section { background: #fff; padding: 16px; min-height: 200px; }

/* 公告 */
.announce-input { width: 100%; min-height: 120px; border: 1px solid #E8E0D5; border-radius: 8px; padding: 12px; font-size: 14px; color: #333; box-sizing: border-box; }
.char-count { display: block; text-align: right; font-size: 12px; color: #ccc; margin: 4px 0; }
.save-btn { background: #C41E3A; color: #fff; border-radius: 20px; padding: 8px; font-size: 14px; border: none; margin-top: 8px; }

/* 成员 */
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.filter-input { flex: 1; height: 34px; border: 1px solid #E8E0D5; border-radius: 16px; padding: 0 12px; font-size: 13px; }
.filter-picker { font-size: 13px; color: #666; padding: 6px 12px; background: #F5F0E8; border-radius: 12px; white-space: nowrap; }
.member-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.m-avatar { width: 36px; height: 36px; border-radius: 50%; }
.m-avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: #f0e8d8; }
.m-info { flex: 1; display: flex; flex-direction: column; }
.m-name { font-size: 14px; color: #333; }
.m-time { font-size: 11px; color: #ccc; }
.m-role { font-size: 12px; color: #C41E3A; padding: 2px 8px; background: #fde8e8; border-radius: 8px; }
.m-remove { font-size: 12px; color: #f56c6c; padding: 4px 8px; }

/* 审核 */
.audit-post { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.ap-title { font-size: 14px; color: #333; display: block; margin-bottom: 4px; }
.ap-author { font-size: 12px; color: #bbb; display: block; margin-bottom: 8px; }
.ap-actions { display: flex; gap: 12px; }
.ap-approve { font-size: 13px; color: #4caf50; }
.ap-reject { font-size: 13px; color: #ff9800; }
.ap-delete { font-size: 13px; color: #f56c6c; }

/* 达人 */
.expert-row { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.ex-name { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 8px; }
.ex-prices { display: flex; gap: 16px; }
.ex-field { display: flex; align-items: center; gap: 4px; }
.ex-label { font-size: 11px; color: #999; }
.ex-input { width: 60px; height: 28px; border: 1px solid #E8E0D5; border-radius: 4px; text-align: center; font-size: 13px; }
.ex-unit { font-size: 11px; color: #bbb; }

/* 收益 */
.revenue-summary { display: flex; justify-content: space-between; margin-bottom: 16px; }
.rv-total { font-size: 16px; font-weight: bold; color: #C41E3A; }
.rv-month { font-size: 14px; color: #C9A96E; }
.rv-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.rv-left { display: flex; flex-direction: column; }
.rv-type { font-size: 13px; color: #333; }
.rv-date { font-size: 11px; color: #ccc; }
.rv-right { text-align: right; }
.rv-amount { font-size: 14px; color: #333; display: block; }
.rv-share { font-size: 12px; color: #4caf50; }

.loading-text { text-align: center; color: #999; padding: 30px 0; }
</style>
