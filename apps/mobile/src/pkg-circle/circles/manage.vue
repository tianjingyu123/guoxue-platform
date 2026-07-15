<script setup lang="ts">
/**
 * 圈主管理后台 · 成员/内容/设置 — V0 circle-admin-{members,content,settings}.html 三稿合一还原（2026-07-10 批③）
 * 三分区（?tab=members|posts|settings 直达·由 dashboard.vue 分区宫格进入）；概览职责已归 dashboard.vue。
 * 数据：circleManageApi（成员/帖子/设置/公告）+ circleGuestsApi（嘉宾分账·后端真实端点
 *      GET /circle-backend/guests + PUT /circle-backend/guests/:userId/share-rate）+ uploadImage（封面）。
 * 降级（后端无来源·不造假）：
 * - 成员行"本月活跃 N 天/帖子 N"无字段 → 仅加入时间；嘉宾行分账比例来自 guests 真实 shareRate。
 * - 帖子卡"评论/点赞/浏览"统计：posts 列表无字段 → 不显示；"被举报"筛选与"删除并禁言"无举报/禁言端点 → 不做。
 * - 推荐电子书区 → 入口行复用已有 recommend-ebook.vue（该页 2026-07-14 才真连；此前是 8 本写死的书 + setTimeout 假保存）。
 * - 设置"圈主的话"circle_intro 图文块后端缺 → 不放；加入方式 type(FREE/PAID/YEARLY) UpdateCircleDto 不收 →
 *   类型只读展示：免费圈可切"免费↔审批"（needApproval），付费圈可改价格（price），跨类型切换禁用并说明。
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import { uploadImage } from '@/utils/request'
import {
  circleManageApi,
  type ManageMember,
  type ManagePost,
  type CircleOverview,
} from '@/lib/circle-manage-data'
import { circleGuestsApi, type CircleGuest } from '@/lib/circle-guests-data'

type TabType = 'members' | 'posts' | 'settings'
const tabs: { key: TabType; label: string }[] = [
  { key: 'members', label: '成员' },
  { key: 'posts', label: '内容' },
  { key: 'settings', label: '设置' },
]
const tabTitle: Record<TabType, string> = { members: '成员管理', posts: '内容管理', settings: '设置' }

const circleId = ref('')
const activeTab = ref<TabType>('members')

// ─── 概览（settings 初值 + 成员数） ───
const overview = ref<CircleOverview | null>(null)

// ─── 成员分区 ───
type RoleFilter = 'all' | 'owner' | 'admin' | 'guest' | 'member'
const roleFilters: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'owner', label: '圈主' },
  { key: 'admin', label: '管理员' },
  { key: 'guest', label: '嘉宾' },
  { key: 'member', label: '成员' },
]
const members = ref<ManageMember[]>([])
const guests = ref<CircleGuest[]>([])
const membersLoading = ref(false)
const membersError = ref(false)
const memberSearch = ref('')
const roleFilter = ref<RoleFilter>('all')
const openMenuId = ref<string | null>(null)
const actingMemberId = ref<string | null>(null)
const savingRateUserId = ref<string | null>(null)

const filteredMembers = computed(() => {
  let list = members.value
  if (roleFilter.value !== 'all') list = list.filter((m) => m.role === roleFilter.value)
  const kw = memberSearch.value.trim()
  if (kw) list = list.filter((m) => m.name.includes(kw))
  return list
})
/** userId → 嘉宾分账信息（成员行 meta 与嘉宾分账卡共用） */
const guestByUserId = computed(() => {
  const map: Record<string, CircleGuest> = {}
  guests.value.forEach((g) => { map[g.userId] = g })
  return map
})

// ─── 内容分区 ───
type PostFilter = 'all' | 'pinned' | 'essence'
const postFilters: { key: PostFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pinned', label: '已置顶' },
  { key: 'essence', label: '精华' },
]
const posts = ref<ManagePost[]>([])
const postsLoading = ref(false)
const postsError = ref(false)
const postFilter = ref<PostFilter>('all')
const actingPostId = ref<string | null>(null)

const filteredPosts = computed(() => {
  if (postFilter.value === 'pinned') return posts.value.filter((p) => p.isPinned)
  if (postFilter.value === 'essence') return posts.value.filter((p) => p.isEssence)
  return posts.value
})

// ─── 设置分区 ───
const settingsLoading = ref(false)
const settingsError = ref(false)
const form = reactive({ name: '', intro: '', cover: '', tags: [] as string[], price: 0, needApproval: false })
const circleType = ref('FREE') // FREE/PAID/YEARLY·后端不可改，只读展示
const savingSettings = ref(false)
const uploadingCover = ref(false)
const announcementInput = ref('')
const latestAnnouncement = ref<{ content: string; createdAt: string } | null>(null)
const sendingAnnouncement = ref(false)

/** 当前加入方式（映射后端 type + needApproval） */
const joinMode = computed<'free' | 'approval' | 'paid'>(() => {
  if (circleType.value === 'PAID' || circleType.value === 'YEARLY') return 'paid'
  return form.needApproval ? 'approval' : 'free'
})
const isPaidCircle = computed(() => circleType.value === 'PAID' || circleType.value === 'YEARLY')

// ─── 确认弹窗（移出成员/删帖） ───
const confirmState = ref<{ type: 'removeMember' | 'deletePost'; id: string; userId?: string; name: string } | null>(null)

// ─── 加载 ───
async function loadOverview() {
  try {
    const ov = await circleManageApi.getOverview(circleId.value)
    overview.value = ov
    form.name = ov.name
    form.intro = ov.intro
    form.cover = ov.cover
    form.tags = [...ov.tags]
    form.price = ov.price
    form.needApproval = ov.needApproval
    circleType.value = ov.type
  } catch { /* settings tab 会再触发并展示 error */ }
}

async function loadMembers() {
  membersLoading.value = true
  membersError.value = false
  try {
    const [ms, gs] = await Promise.all([
      circleManageApi.getMembers(circleId.value),
      circleGuestsApi.list().catch(() => [] as CircleGuest[]),
    ])
    members.value = ms
    guests.value = gs
  } catch {
    membersError.value = true
  } finally {
    membersLoading.value = false
  }
}

async function loadPosts() {
  postsLoading.value = true
  postsError.value = false
  try {
    posts.value = await circleManageApi.getPosts(circleId.value)
  } catch {
    postsError.value = true
  } finally {
    postsLoading.value = false
  }
}

async function loadSettings() {
  settingsLoading.value = true
  settingsError.value = false
  try {
    await loadOverview()
    if (!overview.value) throw new Error('load failed')
    latestAnnouncement.value = await circleManageApi.getLatestAnnouncement(circleId.value).catch(() => null)
  } catch {
    settingsError.value = true
  } finally {
    settingsLoading.value = false
  }
}

function switchTab(t: TabType) {
  activeTab.value = t
  openMenuId.value = null
  if (t === 'members' && !members.value.length && !membersLoading.value) loadMembers()
  if (t === 'posts' && !posts.value.length && !postsLoading.value) loadPosts()
  if (t === 'settings' && !settingsLoading.value) loadSettings()
}

// ─── 成员写操作 ───
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}

async function setRole(m: ManageMember, role: 'ADMIN' | 'GUEST' | 'MEMBER') {
  if (actingMemberId.value) return
  actingMemberId.value = m.id
  try {
    await circleManageApi.setMemberRole(circleId.value, m.userId, role)
    uni.showToast({ title: '已更新角色', icon: 'success' })
    openMenuId.value = null
    await loadMembers()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    actingMemberId.value = null
  }
}

function askRemoveMember(m: ManageMember) {
  confirmState.value = { type: 'removeMember', id: m.id, userId: m.userId, name: m.name }
}

async function doConfirm() {
  const c = confirmState.value
  if (!c) return
  if (c.type === 'removeMember' && c.userId) {
    if (actingMemberId.value) return
    actingMemberId.value = c.id
    try {
      await circleManageApi.removeMember(circleId.value, c.userId)
      uni.showToast({ title: '已移出圈子', icon: 'success' })
      openMenuId.value = null
      await loadMembers()
    } catch (e) {
      uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
    } finally {
      actingMemberId.value = null
    }
  } else if (c.type === 'deletePost') {
    if (actingPostId.value) return
    actingPostId.value = c.id
    try {
      await circleManageApi.deletePost(circleId.value, c.id)
      uni.showToast({ title: '已删除', icon: 'success' })
      await loadPosts()
    } catch (e) {
      uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
    } finally {
      actingPostId.value = null
    }
  }
  confirmState.value = null
}

/** 嘉宾分账比例（uni slider @change·后端 PUT share-rate 0-100） */
async function onShareRateChange(g: CircleGuest, e: { detail: { value: number } }) {
  const rate = e.detail.value
  if (savingRateUserId.value) return
  savingRateUserId.value = g.userId
  try {
    await circleGuestsApi.setShareRate(g.userId, rate)
    g.shareRate = rate
    uni.showToast({ title: `分账比例已设为 ${rate}%`, icon: 'none' })
  } catch (err) {
    uni.showToast({ title: (err as Error)?.message || '设置失败', icon: 'none' })
    await loadMembers() // 回滚为服务端真实值
  } finally {
    savingRateUserId.value = null
  }
}

// ─── 帖子写操作 ───
async function togglePin(p: ManagePost) {
  if (actingPostId.value) return
  actingPostId.value = p.id
  try {
    await circleManageApi.toggleTop(circleId.value, p.id)
    p.isPinned = !p.isPinned
    uni.showToast({ title: p.isPinned ? '已置顶' : '已取消置顶', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    actingPostId.value = null
  }
}

async function toggleEssence(p: ManagePost) {
  if (actingPostId.value) return
  actingPostId.value = p.id
  try {
    await circleManageApi.toggleEssence(circleId.value, p.id)
    p.isEssence = !p.isEssence
    uni.showToast({ title: p.isEssence ? '已设为精华' : '已取消精华', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    actingPostId.value = null
  }
}

function askDeletePost(p: ManagePost) {
  confirmState.value = { type: 'deletePost', id: p.id, name: p.author.name }
}

// ─── 设置写操作 ───
function changeCover() {
  if (uploadingCover.value) return
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      const path = res.tempFilePaths[0]
      uploadingCover.value = true
      try {
        form.cover = await uploadImage(path)
        uni.showToast({ title: '封面已上传，保存后生效', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '上传失败', icon: 'none' })
      } finally {
        uploadingCover.value = false
      }
    },
  })
}

function editTags() {
  uni.showModal({
    title: '编辑标签',
    editable: true,
    placeholderText: '用逗号分隔，如：家居风水,零基础',
    content: form.tags.join(','),
    success: (r) => {
      if (!r.confirm) return
      form.tags = (r.content || '')
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6)
    },
  })
}

function editPrice() {
  if (!isPaidCircle.value) return
  uni.showModal({
    title: '年费价格（元）',
    editable: true,
    content: String(form.price || ''),
    success: (r) => {
      if (!r.confirm) return
      const n = Number(r.content)
      if (!Number.isFinite(n) || n < 0) {
        uni.showToast({ title: '请输入有效价格', icon: 'none' })
        return
      }
      form.price = Math.round(n * 100) / 100
    },
  })
}

function pickJoinMode(mode: 'free' | 'approval' | 'paid') {
  if (isPaidCircle.value) {
    if (mode !== 'paid') uni.showToast({ title: '付费圈暂不支持改为免费/审批加入', icon: 'none' })
    return
  }
  if (mode === 'paid') {
    uni.showToast({ title: '免费圈暂不支持改为付费加入', icon: 'none' })
    return
  }
  form.needApproval = mode === 'approval'
}

async function saveSettings() {
  if (savingSettings.value) return
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入圈子名称', icon: 'none' })
    return
  }
  savingSettings.value = true
  try {
    await circleManageApi.saveSettings(circleId.value, {
      name: form.name.trim(),
      intro: form.intro.trim(),
      cover: form.cover || undefined,
      tags: form.tags,
      price: isPaidCircle.value ? form.price : undefined,
      needApproval: form.needApproval,
    })
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    savingSettings.value = false
  }
}

async function sendAnnouncement() {
  const content = announcementInput.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入公告内容', icon: 'none' })
    return
  }
  if (sendingAnnouncement.value) return
  sendingAnnouncement.value = true
  try {
    await circleManageApi.saveAnnouncement(circleId.value, content)
    uni.showToast({ title: '公告已发布', icon: 'success' })
    announcementInput.value = ''
    latestAnnouncement.value = await circleManageApi.getLatestAnnouncement(circleId.value).catch(() => null)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发布失败', icon: 'none' })
  } finally {
    sendingAnnouncement.value = false
  }
}

// ─── 工具 ───
function roleLabel(r: ManageMember['role']) {
  return r === 'owner' ? '圈主' : r === 'admin' ? '管理员' : r === 'guest' ? '嘉宾' : ''
}
/** YYYY-MM-DD → "2024.01 加入" */
function joinMeta(d: string) {
  return d ? `${d.slice(0, 7).replace('-', '.')} 加入` : ''
}
function fmtAnnDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日发布`
}
function go(url: string) { navigateTo(url) }

onLoad((q) => {
  circleId.value = q?.id || q?.circleId || ''
  const t = q?.tab as TabType | undefined
  if (t && ['members', 'posts', 'settings'].includes(t)) activeTab.value = t
  loadOverview()
  switchTab(activeTab.value)
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="topbar-title">{{ tabTitle[activeTab] }}</text>
      <text v-if="activeTab === 'members' && overview" class="topbar-count">共 {{ overview.memberCount.toLocaleString() }} 人</text>
    </view>

    <!-- 分区切换 -->
    <view class="seg">
      <view
        v-for="t in tabs" :key="t.key"
        class="seg-item" :class="{ active: activeTab === t.key }"
        @tap="switchTab(t.key)"
      >
        <text class="seg-txt">{{ t.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- ═══════════ 成员分区 ═══════════ -->
      <template v-if="activeTab === 'members'">
        <!-- 搜索 -->
        <view class="search">
          <app-icon name="search" :size="30" color="#999999" />
          <input v-model="memberSearch" class="search-input" placeholder="搜索成员昵称" placeholder-class="ph" />
        </view>

        <!-- 角色筛选 -->
        <scroll-view scroll-x class="filters-scroll">
          <view class="filters">
            <view
              v-for="f in roleFilters" :key="f.key"
              class="filter" :class="{ active: roleFilter === f.key }"
              @tap="roleFilter = f.key"
            >
              <text class="filter-txt">{{ f.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 成员洞察入口 -->
        <view class="insight-row" @tap="go(`/pkg-circle/circles/members-insight?id=${circleId}`)">
          <app-icon name="bar-chart-3" :size="32" color="#6E6E73" />
          <text class="insight-txt"><text class="insight-b">成员洞察</text> · 活跃 / 消费 / 兴趣画像与行为时间线</text>
          <app-icon name="chevron-right" :size="28" color="#999999" />
        </view>

        <!-- 三态 -->
        <view v-if="membersLoading" class="state-view"><app-icon name="loader" :size="56" color="#C41E3A" class="spin" /><text class="state-desc">加载中…</text></view>
        <view v-else-if="membersError" class="state-view">
          <app-icon name="alert-circle" :size="64" color="#C9A96E" />
          <text class="state-desc">成员加载失败</text>
          <view class="state-btn" @tap="loadMembers"><text class="state-btn-txt">重试</text></view>
        </view>
        <view v-else-if="!filteredMembers.length" class="state-view">
          <app-icon name="users" :size="64" color="#CCCCCC" />
          <text class="state-desc">{{ memberSearch || roleFilter !== 'all' ? '没有匹配的成员' : '还没有成员' }}</text>
        </view>

        <template v-else>
          <text class="section-label">成员列表</text>
          <view class="list">
            <view v-for="m in filteredMembers" :key="m.id" class="member-block">
              <view class="member-row" @tap="m.role !== 'owner' && toggleMenu(m.id)">
                <view class="avatar-wrap" :class="{ 'ring-gold': m.role === 'owner' }">
                  <smart-avatar :src="m.avatar" :name="m.name" class="avatar" />
                </view>
                <view class="member-main">
                  <view class="member-name-row">
                    <text class="member-name">{{ m.name }}</text>
                    <text v-if="roleLabel(m.role)" class="role-tag" :class="m.role">{{ roleLabel(m.role) }}</text>
                  </view>
                  <text class="member-meta">
                    {{ joinMeta(m.joinedAt) }}<template v-if="guestByUserId[m.userId]"> · 分账 {{ guestByUserId[m.userId].shareRate }}%</template>
                  </text>
                </view>
                <view v-if="m.role !== 'owner'" class="member-more"><app-icon name="more-horizontal" :size="34" color="#999999" /></view>
              </view>
              <!-- 行内操作 -->
              <view v-if="openMenuId === m.id" class="row-actions">
                <view v-if="m.role !== 'admin'" class="row-action" @tap="setRole(m, 'ADMIN')"><text class="row-action-txt">设为管理员</text></view>
                <view v-if="m.role !== 'guest'" class="row-action" @tap="setRole(m, 'GUEST')"><text class="row-action-txt">设为嘉宾</text></view>
                <view v-if="m.role !== 'member'" class="row-action" @tap="setRole(m, 'MEMBER')"><text class="row-action-txt">设为普通成员</text></view>
                <view class="row-action danger" @tap="askRemoveMember(m)"><text class="row-action-txt danger-txt">移出圈子</text></view>
              </view>
            </view>
          </view>

          <!-- 嘉宾分账（真实 shareRate/totalEarned·slider 真连 PUT share-rate） -->
          <template v-if="guests.length">
            <text class="section-label">嘉宾分账</text>
            <view v-for="g in guests" :key="g.userId" class="guest-card">
              <view class="guest-head">
                <view class="avatar-wrap">
                  <smart-avatar :src="g.user.avatar" :name="g.user.nickname" class="avatar" />
                </view>
                <view class="guest-main">
                  <text class="guest-name">{{ g.user.nickname }}</text>
                  <text class="guest-earning">累计分账收益 <text class="guest-earning-b">¥{{ g.totalEarned.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }}</text></text>
                </view>
              </view>
              <view class="split">
                <view class="split-label">
                  <text class="split-label-txt">嘉宾分账比例（其内容收入）</text>
                  <text class="split-pct">{{ g.shareRate }}%</text>
                </view>
                <slider
                  class="split-slider"
                  :value="g.shareRate" :min="0" :max="100" :step="1"
                  :disabled="savingRateUserId === g.userId"
                  activeColor="#C9A96E" backgroundColor="#EDE7DD" block-size="20"
                  @change="onShareRateChange(g, $event)"
                />
                <text class="split-hint">调整后仅影响之后产生的订单；历史订单按当时比例结算。</text>
              </view>
            </view>
          </template>
        </template>
      </template>

      <!-- ═══════════ 内容分区 ═══════════ -->
      <template v-else-if="activeTab === 'posts'">
        <!-- 筛选（被举报：后端无举报端点 → 不做） -->
        <scroll-view scroll-x class="filters-scroll">
          <view class="filters">
            <view
              v-for="f in postFilters" :key="f.key"
              class="filter" :class="{ active: postFilter === f.key }"
              @tap="postFilter = f.key"
            >
              <text class="filter-txt">{{ f.label }}</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="postsLoading" class="state-view"><app-icon name="loader" :size="56" color="#C41E3A" class="spin" /><text class="state-desc">加载中…</text></view>
        <view v-else-if="postsError" class="state-view">
          <app-icon name="alert-circle" :size="64" color="#C9A96E" />
          <text class="state-desc">帖子加载失败</text>
          <view class="state-btn" @tap="loadPosts"><text class="state-btn-txt">重试</text></view>
        </view>
        <view v-else-if="!filteredPosts.length" class="state-view">
          <app-icon name="file-text" :size="64" color="#CCCCCC" />
          <text class="state-desc">{{ postFilter !== 'all' ? '该筛选下暂无帖子' : '圈子里还没有帖子' }}</text>
        </view>

        <template v-else>
          <view v-for="p in filteredPosts" :key="p.id" class="post-card">
            <view class="post-head">
              <view class="avatar-wrap sm">
                <smart-avatar :src="p.author.avatar" :name="p.author.name" class="avatar" />
              </view>
              <view class="post-author">
                <text class="post-name">{{ p.author.name }}</text>
                <text class="post-time">{{ p.createdAt }}</text>
              </view>
              <text v-if="p.isPinned" class="state-tag pinned">已置顶</text>
              <text v-if="p.isEssence" class="state-tag featured">精华</text>
            </view>
            <text class="post-text">{{ p.content }}</text>
            <view class="post-actions">
              <view class="pa-btn" :class="{ on: p.isPinned }" @tap="togglePin(p)">
                <text class="pa-txt" :class="{ 'on-txt': p.isPinned }">{{ p.isPinned ? '取消置顶' : '置顶' }}</text>
              </view>
              <view class="pa-btn" :class="p.isEssence ? 'on' : 'gold'" @tap="toggleEssence(p)">
                <text class="pa-txt" :class="p.isEssence ? 'on-txt' : 'gold-txt'">{{ p.isEssence ? '取消精华' : '设为精华' }}</text>
              </view>
              <view class="pa-del" @tap="askDeletePost(p)"><text class="pa-del-txt">删除</text></view>
            </view>
          </view>
        </template>

        <!-- 🔴 2026-07-14 撤除「推荐电子书配置」入口：整条链依附于已下线的电子书板块。
             后端 GET/PUT /circles/:id/recommended-ebooks 是在的，但圈主用来挑书的书城
             /ebook/books 已随 07-08 瘦身一起删掉（生产 404）—— 圈主点进去只会看到一个
             无书可选的空页。配置页 recommend-ebook.vue 已删。 -->
      </template>

      <!-- ═══════════ 设置分区 ═══════════ -->
      <template v-else>
        <view v-if="settingsLoading" class="state-view"><app-icon name="loader" :size="56" color="#C41E3A" class="spin" /><text class="state-desc">加载中…</text></view>
        <view v-else-if="settingsError" class="state-view">
          <app-icon name="alert-circle" :size="64" color="#C9A96E" />
          <text class="state-desc">设置加载失败</text>
          <view class="state-btn" @tap="loadSettings"><text class="state-btn-txt">重试</text></view>
        </view>

        <template v-else>
          <!-- 圈子信息 -->
          <text class="section-label">圈子信息</text>
          <view class="group">
            <view class="cover-row">
              <view class="cover-thumb">
                <smart-cover :src="form.cover" :title="form.name" type="circle" class="cover-img" />
              </view>
              <view class="cover-main">
                <text class="cover-title">封面</text>
                <text class="cover-desc">建议 4:3，清晰传达圈子主题</text>
              </view>
              <view class="change-btn" @tap="changeCover">
                <text class="change-btn-txt">{{ uploadingCover ? '上传中…' : '更换' }}</text>
              </view>
            </view>
            <view class="field-row">
              <text class="field-label">名称</text>
              <input v-model="form.name" class="field-input" placeholder="2-30 字" placeholder-class="ph" maxlength="30" />
            </view>
            <view class="field-row align-top">
              <text class="field-label">简介</text>
              <textarea
                v-model="form.intro" class="field-textarea" auto-height
                placeholder="一句话说明圈子能带来什么" placeholder-class="ph" maxlength="200"
              />
            </view>
            <view class="field-row" @tap="editTags">
              <text class="field-label">标签</text>
              <view class="field-value">
                <view v-if="form.tags.length" class="tags">
                  <text v-for="t in form.tags" :key="t" class="tag">{{ t }}</text>
                </view>
                <text v-else class="field-placeholder">添加标签，最多 6 个</text>
              </view>
              <app-icon name="chevron-right" :size="28" color="#999999" />
            </view>
          </view>

          <!-- 加入方式（type 后端不可改 → 免费圈仅可切"免费↔审批"，付费圈仅可改价） -->
          <text class="section-label">加入方式</text>
          <view class="group">
            <view class="join-option" :class="{ disabled: isPaidCircle }" @tap="pickJoinMode('free')">
              <view class="radio" :class="{ checked: joinMode === 'free' }" />
              <view class="join-main">
                <text class="join-title">免费加入</text>
                <text class="join-desc">任何人可直接加入，适合冷启动聚人气</text>
              </view>
            </view>
            <view class="join-option" :class="{ disabled: isPaidCircle }" @tap="pickJoinMode('approval')">
              <view class="radio" :class="{ checked: joinMode === 'approval' }" />
              <view class="join-main">
                <text class="join-title">审批加入</text>
                <text class="join-desc">申请后由你审核通过，适合控制成员质量</text>
              </view>
            </view>
            <view class="join-option" :class="{ disabled: !isPaidCircle }" @tap="pickJoinMode('paid')">
              <view class="radio" :class="{ checked: joinMode === 'paid' }" />
              <view class="join-main">
                <text class="join-title">付费加入</text>
                <text class="join-desc">支付年费后加入，退款按平台规则执行</text>
              </view>
            </view>
            <view v-if="isPaidCircle" class="price-row" @tap="editPrice">
              <text class="price-label">年费价格</text>
              <text class="price-num">¥{{ form.price }} / 年</text>
            </view>
          </view>
          <text class="mode-note">圈子收费类型暂不支持在免费与付费之间切换</text>

          <!-- 公告 -->
          <text class="section-label">公告</text>
          <view class="group">
            <view class="notice-box">
              <textarea
                v-model="announcementInput" class="notice-input" auto-height
                placeholder="发布新公告，全体成员将收到通知…" placeholder-class="ph" maxlength="500"
              />
              <view class="notice-actions">
                <text class="notice-hint">公告显示在圈子详情头部，仅保留最新一条</text>
                <view class="notice-send" :class="{ sending: sendingAnnouncement }" @tap="sendAnnouncement">
                  <text class="notice-send-txt">{{ sendingAnnouncement ? '发布中…' : '发布' }}</text>
                </view>
              </view>
            </view>
            <view v-if="latestAnnouncement" class="notice-history">
              <text class="notice-item">「{{ latestAnnouncement.content }}」
                <text v-if="latestAnnouncement.createdAt" class="notice-date"> · {{ fmtAnnDate(latestAnnouncement.createdAt) }}</text>
              </text>
            </view>
          </view>

          <!-- 保存 -->
          <view class="save-btn" :class="{ saving: savingSettings }" @tap="saveSettings">
            <text class="save-btn-txt">{{ savingSettings ? '保存中…' : '保存修改' }}</text>
          </view>
          <text class="save-hint">价格与加入方式的修改仅对新成员生效，不影响已加入成员</text>
        </template>
      </template>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 确认弹窗 -->
    <view v-if="confirmState" class="mask" @tap="confirmState = null">
      <view class="confirm" @tap.stop>
        <text class="confirm-title">{{ confirmState.type === 'removeMember' ? '移出圈子' : '删除帖子' }}</text>
        <text class="confirm-desc">
          {{ confirmState.type === 'removeMember'
            ? `确定将「${confirmState.name}」移出圈子？其发布的内容会保留。`
            : `确定删除「${confirmState.name}」的这条帖子？删除后不可恢复。` }}
        </text>
        <view class="confirm-btns">
          <view class="confirm-btn plain" @tap="confirmState = null"><text class="confirm-btn-txt plain-txt">取消</text></view>
          <view class="confirm-btn danger" @tap="doConfirm"><text class="confirm-btn-txt danger-btn-txt">确定</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 28rpx 32rpx 20rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 28rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.back-btn { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }
.topbar-count { font-size: 24rpx; color: var(--text-tertiary, #999999); }

/* 分区切换 */
.seg { display: flex; gap: 16rpx; padding: 8rpx 32rpx 0; }
.seg-item {
  flex: 1; height: 68rpx; border-radius: 34rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #ffffff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.seg-item.active { background: var(--text-primary, #2c2c2c); }
.seg-txt { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.seg-item.active .seg-txt { color: #ffffff; font-weight: 500; }

.body { flex: 1; }

/* 搜索 */
.search {
  margin: 24rpx 32rpx 0; display: flex; align-items: center; gap: 16rpx;
  height: 76rpx; padding: 0 28rpx;
  background: var(--bg-card, #ffffff); border-radius: 38rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.search-input { flex: 1; font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
.ph { color: var(--text-tertiary, #999999); }

/* 筛选 chips */
.filters-scroll { width: 100%; white-space: nowrap; margin-top: 24rpx; }
.filters { display: inline-flex; gap: 16rpx; padding: 0 32rpx; }
.filter {
  flex-shrink: 0; height: 60rpx; padding: 0 28rpx; border-radius: 30rpx;
  display: inline-flex; align-items: center;
  background: var(--bg-card, #ffffff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.filter.active { background: var(--text-primary, #2c2c2c); }
.filter-txt { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.filter.active .filter-txt { color: #ffffff; font-weight: 500; }

/* 成员洞察入口 */
.insight-row {
  margin: 20rpx 32rpx 0; padding: 26rpx 32rpx;
  display: flex; align-items: center; gap: 20rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
}
.insight-row:active { opacity: 0.85; }
.insight-txt { flex: 1; font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.insight-b { color: var(--text-primary, #2c2c2c); font-weight: 500; }

/* 分区标题 */
.section-label { display: block; margin: 40rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999999); }

/* 成员列表 */
.list {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.member-block + .member-block { border-top: 1rpx solid var(--separator, #ede7dd); }
.member-row { display: flex; align-items: center; gap: 24rpx; padding: 26rpx 32rpx; }
.avatar-wrap {
  width: 84rpx; height: 84rpx; border-radius: 999rpx; overflow: hidden; flex-shrink: 0;
  box-shadow: 0 0 0 1rpx var(--separator, #ede7dd);
}
.avatar-wrap.ring-gold { box-shadow: 0 0 0 3rpx var(--gold, #c9a96e); }
.avatar-wrap.sm { width: 68rpx; height: 68rpx; }
.avatar { width: 100%; height: 100%; }
.avatar-fallback { background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; }
.member-main { flex: 1; min-width: 0; }
.member-name-row { display: flex; align-items: center; gap: 12rpx; }
.member-name { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.role-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 10rpx; flex-shrink: 0; }
.role-tag.owner { color: var(--gold, #c9a96e); border: 1rpx solid var(--gold, #c9a96e); }
.role-tag.admin { color: var(--gold-2, #d4b87d); border: 1rpx solid var(--gold-2, #d4b87d); }
.role-tag.guest { color: #c97b2d; border: 1rpx solid #c97b2d; }
.member-meta { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; }
.member-more { flex-shrink: 0; }

/* 行内操作 */
.row-actions { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 32rpx 26rpx 140rpx; }
.row-action {
  height: 56rpx; padding: 0 24rpx; border-radius: 28rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center;
}
.row-action:active { opacity: 0.8; }
.row-action.danger { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.row-action-txt { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.danger-txt { color: var(--brand, #c41e3a); }

/* 嘉宾分账卡 */
.guest-card {
  margin: 0 32rpx 20rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 32rpx;
}
.guest-head { display: flex; align-items: center; gap: 24rpx; }
.guest-main { flex: 1; min-width: 0; }
.guest-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.guest-earning { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.guest-earning-b { color: var(--gold, #c9a96e); font-weight: 600; }
.split { margin-top: 28rpx; }
.split-label { display: flex; justify-content: space-between; align-items: center; }
.split-label-txt { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.split-pct { font-size: 28rpx; color: var(--gold, #c9a96e); font-weight: 700; }
.split-slider { margin: 20rpx 0 0; }
.split-hint { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 16rpx; line-height: 1.6; }

/* 帖子治理卡 */
.post-card {
  margin: 24rpx 32rpx 0; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 28rpx 32rpx;
}
.post-head { display: flex; align-items: center; gap: 20rpx; }
.post-author { flex: 1; min-width: 0; }
.post-name { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.post-time { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); }
.state-tag { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 10rpx; flex-shrink: 0; }
.state-tag.pinned { color: var(--brand, #c41e3a); background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.state-tag.featured { color: var(--gold, #c9a96e); border: 1rpx solid var(--gold, #c9a96e); }
.post-text {
  display: block; font-size: 28rpx; line-height: 1.7; margin-top: 20rpx; color: var(--text-primary, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
}
.post-actions {
  display: flex; gap: 16rpx; margin-top: 24rpx; padding-top: 24rpx;
  border-top: 1rpx solid var(--separator, #ede7dd); align-items: center;
}
.pa-btn {
  height: 56rpx; padding: 0 24rpx; border-radius: 28rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center;
}
.pa-btn:active { opacity: 0.8; }
.pa-btn.on { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.pa-btn.gold { background: transparent; border: 1rpx solid var(--gold, #c9a96e); }
.pa-txt { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.on-txt { color: var(--brand, #c41e3a); font-weight: 500; }
.gold-txt { color: var(--gold, #c9a96e); }
.pa-del { margin-left: auto; padding: 8rpx 12rpx; }
.pa-del-txt { font-size: 24rpx; color: var(--text-tertiary, #999999); text-decoration: underline; text-underline-offset: 6rpx; }

/* 推荐电子书入口 */
.book-entry {
  margin: 0 32rpx; padding: 26rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-card, #ffffff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.book-entry:active { background: var(--bg-warm, #f8f4ec); }
.todo-icon {
  width: 68rpx; height: 68rpx; border-radius: 20rpx; flex-shrink: 0;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center; justify-content: center;
}
.todo-main { flex: 1; min-width: 0; }
.todo-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.todo-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; line-height: 1.5; }

/* 设置分组 */
.group {
  margin: 0 32rpx; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.cover-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; }
.cover-thumb { width: 112rpx; height: 112rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; }
.cover-img { width: 112rpx; height: 112rpx; }
.cover-main { flex: 1; }
.cover-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.cover-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.change-btn {
  flex-shrink: 0; height: 56rpx; padding: 0 24rpx; border-radius: 28rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center;
}
.change-btn:active { opacity: 0.8; }
.change-btn-txt { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.field-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.field-row.align-top { align-items: flex-start; }
.field-label { font-size: 28rpx; flex-shrink: 0; width: 120rpx; color: var(--text-secondary, #6e6e73); }
.field-input { flex: 1; font-size: 28rpx; color: var(--text-primary, #2c2c2c); }
.field-textarea { flex: 1; font-size: 28rpx; color: var(--text-primary, #2c2c2c); line-height: 1.6; min-height: 80rpx; }
.field-value { flex: 1; min-width: 0; display: flex; }
.field-placeholder { font-size: 28rpx; color: var(--text-tertiary, #999999); }
.tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag {
  font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 12rpx;
  background: var(--bg-warm, #f8f4ec); color: var(--text-secondary, #6e6e73);
}

/* 加入方式 */
.join-option { display: flex; align-items: flex-start; gap: 24rpx; padding: 28rpx 32rpx; }
.join-option + .join-option { border-top: 1rpx solid var(--separator, #ede7dd); }
.join-option.disabled { opacity: 0.45; }
.radio {
  width: 36rpx; height: 36rpx; border-radius: 999rpx; flex-shrink: 0; margin-top: 2rpx;
  border: 3rpx solid var(--separator, #ede7dd); box-sizing: border-box;
}
.radio.checked { border-color: var(--brand, #c41e3a); border-width: 10rpx; }
.join-main { flex: 1; }
.join-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.join-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; line-height: 1.6; }
.price-row {
  margin: 0 32rpx 28rpx 92rpx; padding: 20rpx 28rpx;
  background: var(--bg-warm, #f8f4ec); border-radius: 16rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.price-row:active { opacity: 0.85; }
.price-label { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.price-num { font-size: 30rpx; color: var(--gold, #c9a96e); font-weight: 700; }
.mode-note { display: block; margin: 12rpx 36rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999999); }

/* 公告 */
.notice-box { padding: 28rpx 32rpx; }
.notice-input {
  width: 100%; min-height: 144rpx; padding: 22rpx 26rpx; box-sizing: border-box;
  border: 1rpx solid var(--separator, #ede7dd); border-radius: 16rpx;
  background: var(--bg-page, #faf8f5); font-size: 28rpx; line-height: 1.7;
  color: var(--text-primary, #2c2c2c);
}
.notice-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; gap: 20rpx; }
.notice-hint { flex: 1; font-size: 22rpx; color: var(--text-tertiary, #999999); line-height: 1.5; }
.notice-send {
  height: 64rpx; padding: 0 36rpx; border-radius: 32rpx; flex-shrink: 0;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center;
}
.notice-send.sending { opacity: 0.6; }
.notice-send:active { opacity: 0.85; }
.notice-send-txt { font-size: 26rpx; font-weight: 500; color: #ffffff; }
.notice-history { padding: 24rpx 32rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.notice-item { font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }
.notice-date { font-size: 22rpx; color: var(--text-tertiary, #999999); }

/* 保存 */
.save-btn {
  margin: 40rpx 32rpx 0; height: 92rpx; border-radius: 46rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.save-btn.saving { opacity: 0.6; }
.save-btn:active { opacity: 0.85; }
.save-btn-txt { color: #ffffff; font-size: 32rpx; font-weight: 600; letter-spacing: 2rpx; }
.save-hint { display: block; margin: 16rpx 36rpx 0; text-align: center; font-size: 22rpx; color: var(--text-tertiary, #999999); }

/* 三态 */
.state-view { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx; padding: 100rpx 80rpx; }
.state-desc { font-size: 26rpx; color: var(--text-tertiary, #999999); text-align: center; }
.state-btn { margin-top: 16rpx; height: 72rpx; padding: 0 48rpx; border-radius: 36rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.state-btn-txt { color: #ffffff; font-size: 26rpx; font-weight: 500; }
.spin { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 确认弹窗 */
.mask {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(44, 44, 44, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 0 64rpx;
}
.confirm { width: 100%; background: #ffffff; border-radius: 36rpx; padding: 44rpx 40rpx 32rpx; }
.confirm-title { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); text-align: center; }
.confirm-desc { display: block; font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; margin-top: 20rpx; text-align: center; }
.confirm-btns { display: flex; gap: 20rpx; margin-top: 36rpx; }
.confirm-btn { flex: 1; height: 80rpx; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; }
.confirm-btn.plain { background: var(--bg-warm, #f8f4ec); }
.confirm-btn.danger { background: var(--brand, #c41e3a); }
.confirm-btn:active { opacity: 0.85; }
.confirm-btn-txt { font-size: 28rpx; font-weight: 500; }
.plain-txt { color: var(--text-secondary, #6e6e73); }
.danger-btn-txt { color: #ffffff; }

.safe-bottom { height: 80rpx; }
</style>
