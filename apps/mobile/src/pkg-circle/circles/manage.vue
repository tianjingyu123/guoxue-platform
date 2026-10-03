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
import { getMiniProgramMenuSafeRight } from '@/utils/mini-program-menu'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
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
import { dashboardApi } from '@/pkg-circle/lib/circle-dashboard-data'

type TabType = 'members' | 'posts' | 'settings'
const tabs: { key: TabType; label: string }[] = [
  { key: 'members', label: '成员' },
  { key: 'posts', label: '内容' },
  { key: 'settings', label: '设置' },
]
const tabTitle: Record<TabType, string> = { members: '成员管理', posts: '内容管理', settings: '设置' }

const circleId = ref('')
const activeTab = ref<TabType>('members')
const menuSafeRight = getMiniProgramMenuSafeRight()
const accessState = ref<'checking' | 'granted' | 'failed'>('checking')

async function verifyAccess() {
  accessState.value = 'checking'
  if (!circleId.value) { accessState.value = 'failed'; return }
  try {
    await dashboardApi.circleOverview(circleId.value)
    accessState.value = 'granted'
    if (activeTab.value !== 'settings') void loadOverview().catch(() => { overview.value = null })
    switchTab(activeTab.value)
  } catch {
    accessState.value = 'failed'
  }
}

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
const memberPage = ref(1)
const memberTotal = ref(0)
const membersLoadingMore = ref(false)
const membersMoreError = ref(false)
const hasMoreMembers = computed(() => members.value.length < memberTotal.value)
const guests = ref<CircleGuest[]>([])
const guestsError = ref(false)
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
function clearMemberFilters() {
  memberSearch.value = ''
  roleFilter.value = 'all'
}
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
const postPage = ref(1)
const postTotal = ref(0)
const postsLoadingMore = ref(false)
const postsMoreError = ref(false)
const hasMorePosts = computed(() => posts.value.length < postTotal.value)
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
const settingsReady = ref(false)
const savedSettings = ref('')
const announcementError = ref(false)
const settingsDirty = computed(() => settingsReady.value && JSON.stringify(form) !== savedSettings.value)

function leavePage() {
  if (savingSettings.value || uploadingCover.value || sendingAnnouncement.value) {
    uni.showToast({ title: '操作进行中，请稍候', icon: 'none' })
    return
  }
  if (!settingsDirty.value && !announcementInput.value.trim()) { goBack(); return }
  uni.showModal({ title: '还有未保存的内容', content: '圈子设置或公告尚未保存，离开后将丢失。', confirmText: '离开', cancelText: '继续编辑', success: r => { if (r.confirm) goBack() } })
}

/** 当前加入方式（映射后端 type + needApproval） */
const joinMode = computed<'free' | 'approval' | 'paid'>(() => {
  if (circleType.value === 'PAID' || circleType.value === 'YEARLY') return 'paid'
  return form.needApproval ? 'approval' : 'free'
})
const isPaidCircle = computed(() => circleType.value === 'PAID' || circleType.value === 'YEARLY')

// ─── 确认弹窗（移出成员/删帖） ───
const confirmState = ref<{ type: 'removeMember' | 'deletePost'; id: string; userId?: string; name: string } | null>(null)

// ─── 加载 ───
async function loadOverview(fillForm = false) {
    const ov = await circleManageApi.getOverview(circleId.value)
    overview.value = ov
    if (!fillForm) return
    form.name = ov.name
    form.intro = ov.intro
    form.cover = ov.cover
    form.tags = [...ov.tags]
    form.price = ov.price
    form.needApproval = ov.needApproval
    circleType.value = ov.type
    savedSettings.value = JSON.stringify(form)
    settingsReady.value = true
}

async function loadMembers() {
  if (membersLoading.value) return
  membersLoading.value = true
  membersError.value = false
  membersMoreError.value = false
  guestsError.value = false
  try {
    const [result, gs] = await Promise.all([
      circleManageApi.getMembers(circleId.value, 1),
      circleGuestsApi.list(circleId.value).catch(() => { guestsError.value = true; return [] as CircleGuest[] }),
    ])
    members.value = result.items
    memberTotal.value = result.total
    memberPage.value = 1
    guests.value = gs
  } catch {
    membersError.value = true
  } finally {
    membersLoading.value = false
  }
}

async function loadMoreMembers() {
  if (membersLoading.value || membersLoadingMore.value || !hasMoreMembers.value) return
  membersLoadingMore.value = true
  membersMoreError.value = false
  try {
    const nextPage = memberPage.value + 1
    const result = await circleManageApi.getMembers(circleId.value, nextPage)
    members.value = [...members.value, ...result.items.filter((item) => !members.value.some((existing) => existing.id === item.id))]
    memberPage.value = nextPage
    memberTotal.value = result.items.length ? result.total : members.value.length
  } catch {
    membersMoreError.value = true
  } finally {
    membersLoadingMore.value = false
  }
}

async function loadPosts() {
  if (postsLoading.value) return
  postsLoading.value = true
  postsError.value = false
  postsMoreError.value = false
  try {
    const result = await circleManageApi.getPosts(circleId.value, 1)
    posts.value = result.items
    postTotal.value = result.total
    postPage.value = 1
  } catch {
    postsError.value = true
  } finally {
    postsLoading.value = false
  }
}

async function loadSettings() {
  if (settingsLoading.value) return
  settingsLoading.value = true
  settingsError.value = false
  try {
    await loadOverview(true)
    await loadAnnouncement()
  } catch {
    settingsError.value = true
  } finally {
    settingsLoading.value = false
  }
}

async function loadMorePosts() {
  if (postsLoading.value || postsLoadingMore.value || !hasMorePosts.value) return
  postsLoadingMore.value = true
  postsMoreError.value = false
  try {
    const nextPage = postPage.value + 1
    const result = await circleManageApi.getPosts(circleId.value, nextPage)
    posts.value = [...posts.value, ...result.items.filter((item) => !posts.value.some((existing) => existing.id === item.id))]
    postPage.value = nextPage
    postTotal.value = result.items.length ? result.total : posts.value.length
  } catch {
    postsMoreError.value = true
  } finally {
    postsLoadingMore.value = false
  }
}

async function loadAnnouncement() {
  announcementError.value = false
  try { latestAnnouncement.value = await circleManageApi.getLatestAnnouncement(circleId.value) }
  catch { announcementError.value = true }
}

function switchTab(t: TabType) {
  activeTab.value = t
  openMenuId.value = null
  if (t === 'members' && !members.value.length && !membersLoading.value) loadMembers()
  if (t === 'posts' && !posts.value.length && !postsLoading.value) loadPosts()
  if (t === 'settings' && !settingsReady.value && !settingsLoading.value) loadSettings()
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
    await circleGuestsApi.setShareRate(g.userId, rate, circleId.value)
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
  if (savingSettings.value || uploadingCover.value || !settingsReady.value) return
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入圈子名称', icon: 'none' })
    return
  }
  savingSettings.value = true
  const submittedSnapshot = JSON.stringify(form)
  try {
    await circleManageApi.saveSettings(circleId.value, {
      name: form.name.trim(),
      intro: form.intro.trim(),
      cover: form.cover || undefined,
      tags: [...form.tags],
      price: isPaidCircle.value ? form.price : undefined,
      needApproval: form.needApproval,
    })
    savedSettings.value = submittedSnapshot
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
    if (announcementInput.value.trim() === content) announcementInput.value = ''
    await loadAnnouncement()
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
  void verifyAccess()
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar" :style="menuSafeRight ? { paddingRight: `${menuSafeRight}px` } : {}">
      <view class="back-btn" role="button" tabindex="0" aria-label="返回管理概览" @tap="leavePage" @keydown.enter="leavePage"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="topbar-title">{{ tabTitle[activeTab] }}</text>
      <text v-if="activeTab === 'members' && overview" class="topbar-count">共 {{ overview.memberCount.toLocaleString() }} 人</text>
    </view>

    <!-- 分区切换 -->
    <view v-if="accessState === 'checking'" class="state-view"><AppLoading /><text class="state-desc">正在核验管理权限</text></view>
    <view v-else-if="accessState === 'failed'" class="state-view">
      <app-icon name="lock" :size="64" color="#6E6E73" />
      <text class="state-desc">暂无法进入管理页，请确认权限或稍后重试</text>
      <view class="state-btn" role="button" tabindex="0" @tap="verifyAccess" @keydown.enter="verifyAccess"><text class="state-btn-txt">重试</text></view>
    </view>
    <view v-if="accessState === 'granted'" class="seg">
      <view
        v-for="t in tabs" :key="t.key"
        class="seg-item" :class="{ active: activeTab === t.key }"
        role="tab" :aria-selected="activeTab === t.key" tabindex="0" @keydown.enter="switchTab(t.key)"
        @tap="switchTab(t.key)"
      >
        <text class="seg-txt">{{ t.label }}</text>
      </view>
    </view>

    <scroll-view v-if="accessState === 'granted'" scroll-y class="body">
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
              role="button" tabindex="0" :aria-pressed="roleFilter === f.key"
              @tap="roleFilter = f.key" @keydown.enter="roleFilter = f.key"
            >
              <text class="filter-txt">{{ f.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 成员洞察入口 -->
        <view class="insight-row" role="button" tabindex="0" aria-label="查看成员洞察" @tap="go(`/pkg-circle/circles/members-insight?id=${circleId}`)" @keydown.enter="go(`/pkg-circle/circles/members-insight?id=${circleId}`)">
          <app-icon name="bar-chart-3" :size="32" color="#6E6E73" />
          <text class="insight-txt"><text class="insight-b">成员洞察</text> · 活跃 / 消费 / 兴趣画像与行为时间线</text>
          <app-icon name="chevron-right" :size="28" color="#999999" />
        </view>

        <!-- 三态 -->
        <view v-if="membersLoading" class="state-view"><AppLoading /></view>
        <view v-else-if="membersError" class="state-view">
          <app-icon name="alert-circle" :size="64" color="#C9A96E" />
          <text class="state-desc">成员加载失败</text>
          <view class="state-btn" @tap="loadMembers"><text class="state-btn-txt">重试</text></view>
        </view>
        <view v-else-if="!filteredMembers.length" class="state-view">
          <app-icon name="users" :size="64" color="#CCCCCC" />
          <text class="state-desc">{{ memberSearch || roleFilter !== 'all' ? '已加载成员中没有匹配项' : '还没有成员' }}</text>
          <view v-if="memberSearch || roleFilter !== 'all'" class="state-btn secondary" role="button" tabindex="0" @tap="clearMemberFilters" @keydown.enter="clearMemberFilters"><text class="state-btn-txt secondary-txt">清除筛选</text></view>
        </view>

        <template v-else>
          <text class="section-label">成员列表 · 已加载 {{ members.length }}/{{ memberTotal }}</text>
          <view class="list">
            <view v-for="m in filteredMembers" :key="m.id" class="member-block">
              <view class="member-row" :role="m.role !== 'owner' ? 'button' : undefined" :tabindex="m.role !== 'owner' ? 0 : undefined" :aria-label="m.role !== 'owner' ? `管理成员${m.name}` : undefined" @tap="m.role !== 'owner' && toggleMenu(m.id)" @keydown.enter="m.role !== 'owner' && toggleMenu(m.id)">
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
                <view v-if="m.role !== 'admin'" class="row-action" role="button" tabindex="0" @tap="setRole(m, 'ADMIN')" @keydown.enter="setRole(m, 'ADMIN')"><text class="row-action-txt">设为管理员</text></view>
                <view v-if="m.role !== 'guest'" class="row-action" role="button" tabindex="0" @tap="setRole(m, 'GUEST')" @keydown.enter="setRole(m, 'GUEST')"><text class="row-action-txt">设为嘉宾</text></view>
                <view v-if="m.role !== 'member'" class="row-action" role="button" tabindex="0" @tap="setRole(m, 'MEMBER')" @keydown.enter="setRole(m, 'MEMBER')"><text class="row-action-txt">设为普通成员</text></view>
                <view class="row-action danger" role="button" tabindex="0" @tap="askRemoveMember(m)" @keydown.enter="askRemoveMember(m)"><text class="row-action-txt danger-txt">移出圈子</text></view>
              </view>
            </view>
          </view>

          <text v-if="hasMoreMembers && (memberSearch || roleFilter !== 'all')" class="page-hint">当前筛选仅覆盖已加载成员，继续加载可查看更多。</text>
          <view v-if="hasMoreMembers" class="load-more" role="button" tabindex="0" :aria-label="membersMoreError ? '重试加载更多成员' : '加载更多成员'" @tap="loadMoreMembers" @keydown.enter="loadMoreMembers" @keydown.space.prevent="loadMoreMembers">
            <text>{{ membersLoadingMore ? '加载中…' : membersMoreError ? '加载失败，点此重试' : '加载更多成员' }}</text>
          </view>

          <view v-if="guestsError" class="state-view" role="button" aria-label="重试嘉宾信息" @tap="loadMembers"><text class="state-desc">嘉宾分账信息暂时无法读取，点此重试</text></view>
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
        <view v-if="!membersLoading && !membersError && !filteredMembers.length && hasMoreMembers" class="load-more" role="button" tabindex="0" aria-label="加载更多成员" @tap="loadMoreMembers" @keydown.enter="loadMoreMembers" @keydown.space.prevent="loadMoreMembers">
          <text>{{ membersLoadingMore ? '加载中…' : membersMoreError ? '加载失败，点此重试' : '加载更多成员' }}</text>
        </view>
      </template>

      <!-- ═══════════ 内容分区 ═══════════ -->
      <template v-else-if="activeTab === 'posts'">
        <!-- 筛选（被举报：后端无举报端点 → 不做） -->
        <scroll-view scroll-x class="filters-scroll">
          <view class="filters">
            <view
              v-for="f in postFilters" :key="f.key"
              class="filter" :class="{ active: postFilter === f.key }"
              role="button" tabindex="0" :aria-pressed="postFilter === f.key"
              @tap="postFilter = f.key" @keydown.enter="postFilter = f.key"
            >
              <text class="filter-txt">{{ f.label }}</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="postsLoading" class="state-view"><AppLoading /></view>
        <view v-else-if="postsError" class="state-view">
          <app-icon name="alert-circle" :size="64" color="#C9A96E" />
          <text class="state-desc">帖子加载失败</text>
          <view class="state-btn" @tap="loadPosts"><text class="state-btn-txt">重试</text></view>
        </view>
        <view v-else-if="!filteredPosts.length" class="state-view">
          <app-icon name="file-text" :size="64" color="#CCCCCC" />
          <text class="state-desc">{{ postFilter !== 'all' ? '已加载内容中没有匹配项' : '圈子里还没有帖子' }}</text>
          <view v-if="postFilter !== 'all'" class="state-btn secondary" role="button" tabindex="0" @tap="postFilter = 'all'" @keydown.enter="postFilter = 'all'"><text class="state-btn-txt secondary-txt">查看全部内容</text></view>
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
              <view class="pa-btn" :class="{ on: p.isPinned }" role="button" tabindex="0" @tap="togglePin(p)" @keydown.enter="togglePin(p)">
                <text class="pa-txt" :class="{ 'on-txt': p.isPinned }">{{ p.isPinned ? '取消置顶' : '置顶' }}</text>
              </view>
              <view class="pa-btn" :class="p.isEssence ? 'on' : 'gold'" role="button" tabindex="0" @tap="toggleEssence(p)" @keydown.enter="toggleEssence(p)">
                <text class="pa-txt" :class="p.isEssence ? 'on-txt' : 'gold-txt'">{{ p.isEssence ? '取消精华' : '设为精华' }}</text>
              </view>
              <view class="pa-del" role="button" tabindex="0" @tap="askDeletePost(p)" @keydown.enter="askDeletePost(p)"><text class="pa-del-txt">删除</text></view>
            </view>
          </view>
          <text class="page-hint">已加载 {{ posts.length }}/{{ postTotal }} 条内容<template v-if="hasMorePosts && postFilter !== 'all'">；当前筛选仅覆盖已加载内容</template></text>
          <view v-if="hasMorePosts" class="load-more" role="button" tabindex="0" :aria-label="postsMoreError ? '重试加载更多内容' : '加载更多内容'" @tap="loadMorePosts" @keydown.enter="loadMorePosts" @keydown.space.prevent="loadMorePosts">
            <text>{{ postsLoadingMore ? '加载中…' : postsMoreError ? '加载失败，点此重试' : '加载更多内容' }}</text>
          </view>
        </template>
        <view v-if="!postsLoading && !postsError && !filteredPosts.length && hasMorePosts" class="load-more" role="button" tabindex="0" aria-label="加载更多内容" @tap="loadMorePosts" @keydown.enter="loadMorePosts" @keydown.space.prevent="loadMorePosts">
          <text>{{ postsLoadingMore ? '加载中…' : postsMoreError ? '加载失败，点此重试' : '加载更多内容' }}</text>
        </view>

        <!-- 🔴 2026-07-14 撤除「推荐电子书配置」入口：整条链依附于已下线的电子书板块。
             后端 GET/PUT /circles/:id/recommended-ebooks 是在的，但圈主用来挑书的书城
             /ebook/books 已随 07-08 瘦身一起删掉（生产 404）—— 圈主点进去只会看到一个
             无书可选的空页。配置页 recommend-ebook.vue 已删。 -->
      </template>

      <!-- ═══════════ 设置分区 ═══════════ -->
      <template v-else>
        <view v-if="settingsLoading" class="state-view"><AppLoading /></view>
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
                placeholder="写下需要成员了解的新公告…" placeholder-class="ph" maxlength="500"
              />
              <view class="notice-actions">
                <text class="notice-hint">公告显示在圈子详情头部，仅保留最新一条</text>
                <view class="notice-send" :class="{ sending: sendingAnnouncement }" @tap="sendAnnouncement">
                  <text class="notice-send-txt">{{ sendingAnnouncement ? '发布中…' : '发布' }}</text>
                </view>
              </view>
            </view>
            <view v-if="announcementError" class="notice-history" role="button" aria-label="重试读取公告" @tap="loadAnnouncement"><text class="notice-item">最新公告暂时无法读取，点此重试。已输入内容会保留。</text></view>
            <view v-else-if="latestAnnouncement" class="notice-history">
              <text class="notice-item">「{{ latestAnnouncement.content }}」
                <text v-if="latestAnnouncement.createdAt" class="notice-date"> · {{ fmtAnnDate(latestAnnouncement.createdAt) }}</text>
              </text>
            </view>
          </view>

          <!-- 保存 -->
          <text class="save-hint" role="status">{{ settingsDirty ? '有尚未保存的修改' : '当前设置没有待保存修改' }}</text>
          <view class="save-btn" role="button" aria-label="保存圈子设置" :aria-disabled="savingSettings || uploadingCover" :class="{ saving: savingSettings || uploadingCover }" @tap="saveSettings">
            <text class="save-btn-txt">{{ uploadingCover ? '封面上传中…' : savingSettings ? '保存中…' : '保存修改' }}</text>
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
.page { height: 100vh; background: var(--circle-canvas, #f5f5f7); display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 28rpx 32rpx 20rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 28rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.back-btn { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }
.topbar-count { font-size: 24rpx; color: var(--text-tertiary, #999999); }

/* 分区切换 */
.seg { display: flex; gap: 16rpx; padding: 8rpx 32rpx 0; }
.seg-item {
  flex: 1; min-height: 44px; border-radius: 20rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card, #ffffff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.seg-item.active { background: var(--text-primary, #2c2c2c); }
.seg-txt { font-size: 28rpx; color: var(--text-secondary, #6e6e73); }
.seg-item.active .seg-txt { color: #ffffff; font-weight: 500; }

.body { flex: 1; height: 0; min-height: 0; }

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
  flex-shrink: 0; min-height: 44px; padding: 0 28rpx; border-radius: 999rpx;
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
.page-hint { display: block; margin: 20rpx 36rpx 8rpx; font-size: 23rpx; line-height: 1.5; color: var(--text-secondary, #6e6e73); }
.load-more { display: flex; align-items: center; justify-content: center; min-height: 88rpx; margin: 16rpx 32rpx 32rpx; border-radius: 24rpx; background: var(--bg-card, #fff); color: var(--text-primary, #2c2c2c); font-size: 26rpx; font-weight: 600; }

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
  min-height: 44px; padding: 0 24rpx; border-radius: 999rpx;
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
  display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; padding-top: 24rpx;
  border-top: 1rpx solid var(--separator, #ede7dd); align-items: center;
}
.pa-btn {
  min-height: 44px; padding: 0 24rpx; border-radius: 999rpx;
  background: var(--bg-warm, #f8f4ec);
  display: flex; align-items: center;
}
.pa-btn:active { opacity: 0.8; }
.pa-btn.on { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.pa-btn.gold { background: transparent; border: 1rpx solid var(--gold, #c9a96e); }
.pa-txt { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.on-txt { color: var(--brand, #c41e3a); font-weight: 500; }
.gold-txt { color: var(--gold, #c9a96e); }
.pa-del { min-height: 44px; margin-left: auto; padding: 0 12rpx; display: flex; align-items: center; }
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
.state-btn { margin-top: 16rpx; min-height: 44px; padding: 0 48rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.state-btn-txt { color: #ffffff; font-size: 26rpx; font-weight: 500; }
.state-btn.secondary { background: var(--circle-surface, #fff); border: 1rpx solid var(--circle-border-soft, #ECECF0); }
.state-btn-txt.secondary-txt { color: var(--circle-ink, #1D1D1F); }
.filter:focus-visible, .insight-row:focus-visible, .member-row:focus-visible, .row-action:focus-visible, .pa-btn:focus-visible, .pa-del:focus-visible, .state-btn:focus-visible { outline: 2px solid #2B6F68; outline-offset: 2px; }

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
