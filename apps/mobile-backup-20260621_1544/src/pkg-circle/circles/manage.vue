<script setup lang="ts">
/**
 * 圈子管理页（从原型 app/circles/[id]/manage/page.tsx 1:1 高保真迁移）
 * 4 Tab 后台：概览(数据卡+公告编辑) / 成员(搜索+列表+角色操作) / 帖子(置顶/精华/删除) / 设置(基本信息+圈规)
 * 成员操作菜单原型用 hover group，移动端改为点击展开。所有写操作 mock(toast 提示)。
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

type TabType = 'overview' | 'members' | 'posts' | 'settings'
type Role = 'owner' | 'admin' | 'member'

const circleId = ref('1')
const activeTab = ref<TabType>('overview')

const tabs: { key: TabType; label: string; icon: string }[] = [
  { key: 'overview', label: '概览', icon: 'bar-chart-3' },
  { key: 'members', label: '成员', icon: 'users' },
  { key: 'posts', label: '帖子', icon: 'file-text' },
  { key: 'settings', label: '设置', icon: 'settings' },
]

const circle = reactive({
  id: '1',
  name: '八字命理研习社',
  description: '探讨八字命理学问，分享预测心得',
  category: '命理',
  rules: ['尊重他人，友善交流', '禁止发布广告与无关内容', '原创分享，注明出处'],
})

const stats = reactive({
  totalMembers: 12800, newMembersToday: 56,
  totalPosts: 3560, newPostsToday: 128,
  activeMembers: 2340, essencePosts: 89,
})

const announcement = ref('欢迎加入圈子！请遵守圈规，友善交流。')
const saving = ref(false)

interface Member { id: string; name: string; avatar: string; role: Role; joinedAt: string; posts: number; title?: string }
const members = reactive<Member[]>([
  { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', role: 'owner', joinedAt: '2024-01-01', posts: 568, title: '创始人' },
  { id: '2', name: '紫微真人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zw', role: 'admin', joinedAt: '2024-02-15', posts: 234 },
  { id: '3', name: '命理学徒', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xt', role: 'member', joinedAt: '2024-06-01', posts: 45 },
  { id: '4', name: '易学新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xs', role: 'member', joinedAt: '2024-06-10', posts: 12 },
])
const memberSearch = ref('')
const openMenuId = ref<string | null>(null)
const filteredMembers = computed(() =>
  memberSearch.value.trim()
    ? members.filter((m) => m.name.includes(memberSearch.value.trim()))
    : members,
)

interface Post { id: string; content: string; author: { id: string; name: string; avatar: string }; createdAt: string; likes: number; comments: number; isPinned?: boolean; isEssence?: boolean }
const posts = reactive<Post[]>([
  { id: '1', content: '八字入门必看：如何快速掌握基础知识', author: { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master' }, createdAt: '2024-06-01', likes: 256, comments: 89, isPinned: true, isEssence: true },
  { id: '2', content: '今日分享一个有趣的八字案例分析', author: { id: '2', name: '紫微真人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zw' }, createdAt: '2024-06-02', likes: 128, comments: 45, isEssence: true },
  { id: '3', content: '新人报道，请多多指教', author: { id: '3', name: '命理学徒', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xt' }, createdAt: '2024-06-03', likes: 34, comments: 12 },
])

const showConfirm = ref<{ type: string; id: string; name: string } | null>(null)

onLoad((q) => { if (q?.id) { circleId.value = q.id; circle.id = q.id } })

function fmt(n: number) { return n.toLocaleString() }

function saveAnnouncement() {
  saving.value = true
  setTimeout(() => { saving.value = false; uni.showToast({ title: '保存成功', icon: 'success' }) }, 600)
}

function toggleMenu(id: string) { openMenuId.value = openMenuId.value === id ? null : id }

function setRole(id: string, role: Role) {
  const m = members.find((x) => x.id === id)
  if (m) m.role = role
  showConfirm.value = null
  openMenuId.value = null
  uni.showToast({ title: '操作成功', icon: 'success' })
}
function removeMember(id: string) {
  const i = members.findIndex((x) => x.id === id)
  if (i >= 0) members.splice(i, 1)
  showConfirm.value = null
  openMenuId.value = null
  uni.showToast({ title: '已移出', icon: 'success' })
}
function toggleTop(p: Post) { p.isPinned = !p.isPinned; uni.showToast({ title: p.isPinned ? '已置顶' : '已取消置顶', icon: 'none' }) }
function toggleEssence(p: Post) { p.isEssence = !p.isEssence; uni.showToast({ title: p.isEssence ? '已设精华' : '已取消精华', icon: 'none' }) }
function deletePost(id: string) {
  const i = posts.findIndex((x) => x.id === id)
  if (i >= 0) posts.splice(i, 1)
  showConfirm.value = null
  uni.showToast({ title: '已删除', icon: 'success' })
}

function confirmTitle(t: string) {
  return { setAdmin: '设为管理员', removeAdmin: '取消管理员', remove: '移出圈子', deletePost: '删除帖子' }[t] || ''
}
function confirmDesc(c: { type: string; name: string }) {
  if (c.type === 'setAdmin') return `确定将 "${c.name}" 设为管理员？`
  if (c.type === 'removeAdmin') return `确定取消 "${c.name}" 的管理员权限？`
  if (c.type === 'remove') return `确定将 "${c.name}" 移出圈子？此操作不可撤销。`
  if (c.type === 'deletePost') return `确定删除帖子 "${c.name}..."？此操作不可撤销。`
  return ''
}
function doConfirm() {
  const c = showConfirm.value
  if (!c) return
  if (c.type === 'setAdmin') setRole(c.id, 'admin')
  else if (c.type === 'removeAdmin') setRole(c.id, 'member')
  else if (c.type === 'remove') removeMember(c.id)
  else if (c.type === 'deletePost') deletePost(c.id)
}
const dangerConfirm = computed(() => showConfirm.value?.type === 'remove' || showConfirm.value?.type === 'deletePost')

function saveSettings() { uni.showToast({ title: '设置已保存', icon: 'success' }) }
</script>

<template>
  <view class="mg">
    <!-- 顶栏 + Tab -->
    <view class="mg-hdr-wrap">
      <view class="mg-hdr">
        <view
          class="mg-hdr-btn"
          @tap="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#2C2C2C"
          />
        </view>
        <text class="mg-hdr-title">
          圈子管理
        </text>
        <view class="mg-hdr-btn" />
      </view>
      <view class="mg-tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="mg-tab"
          @tap="activeTab = t.key"
        >
          <app-icon
            :name="t.icon"
            :size="40"
            :color="activeTab === t.key ? '#C41E3A' : '#666666'"
          />
          <text
            class="mg-tab-t"
            :class="{ on: activeTab === t.key }"
          >
            {{ t.label }}
          </text>
          <view
            v-if="activeTab === t.key"
            class="mg-tab-bar"
          />
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="mg-body"
    >
      <!-- 概览 -->
      <view
        v-if="activeTab === 'overview'"
        class="mg-section"
      >
        <view class="mg-stats">
          <view class="mg-stat">
            <text class="mg-stat-num red">
              {{ fmt(stats.totalMembers) }}
            </text>
            <text class="mg-stat-label">
              总成员数
            </text>
            <text class="mg-stat-delta">
              +{{ stats.newMembersToday }} 今日新增
            </text>
          </view>
          <view class="mg-stat">
            <text class="mg-stat-num gold">
              {{ fmt(stats.totalPosts) }}
            </text>
            <text class="mg-stat-label">
              总帖子数
            </text>
            <text class="mg-stat-delta">
              +{{ stats.newPostsToday }} 今日新增
            </text>
          </view>
          <view class="mg-stat">
            <text class="mg-stat-num dark">
              {{ fmt(stats.activeMembers) }}
            </text>
            <text class="mg-stat-label">
              活跃成员
            </text>
          </view>
          <view class="mg-stat">
            <text class="mg-stat-num dark">
              {{ stats.essencePosts }}
            </text>
            <text class="mg-stat-label">
              精华帖子
            </text>
          </view>
        </view>

        <view class="mg-card">
          <view class="mg-card-head">
            <view class="mg-card-title">
              <app-icon
                name="bell"
                :size="28"
                color="#C9A96E"
              /><text class="mg-card-title-t">
                圈子公告
              </text>
            </view>
            <view
              class="mg-save-btn"
              :class="{ saving }"
              @tap="saveAnnouncement"
            >
              <app-icon
                name="save"
                :size="22"
                color="#ffffff"
              /><text class="mg-save-t">
                {{ saving ? '保存中...' : '保存' }}
              </text>
            </view>
          </view>
          <textarea
            v-model="announcement"
            class="mg-textarea"
            placeholder="输入圈子公告..."
            :maxlength="-1"
          />
        </view>

        <!-- 管理工具入口 -->
        <view class="mg-entries">
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/dashboard?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FCE8EB;"
            >
              <app-icon
                name="bar-chart-3"
                :size="32"
                color="#C41E3A"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                数据看板
              </text><text class="mg-entry-sub">
                成员增长 / 热门内容 / 收益构成
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/knowledge?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FAF3E6;"
            >
              <app-icon
                name="book-open"
                :size="32"
                color="#C9A96E"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                知识库
              </text><text class="mg-entry-sub">
                沉淀优质内容 / 待确认入库
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/analytics?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FCE8EB;"
            >
              <app-icon
                name="trending-up"
                :size="32"
                color="#C41E3A"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                内容分析
              </text><text class="mg-entry-sub">
                浏览/点赞趋势 / 热门内容 TOP5
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/settings-knowledge?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FAF3E6;"
            >
              <app-icon
                name="file-text"
                :size="32"
                color="#C9A96E"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                知识库设置
              </text><text class="mg-entry-sub">
                AI 助手文档/链接/问答启用
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/join-requests?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FCE8EB;"
            >
              <app-icon
                name="users"
                :size="32"
                color="#C41E3A"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                入圈申请
              </text><text class="mg-entry-sub">
                审核新成员加入申请
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/exit-requests?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #F2EFEA;"
            >
              <app-icon
                name="log-out"
                :size="32"
                color="#666666"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                退出申请
              </text><text class="mg-entry-sub">
                审核成员退出与退款核算
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/invite-codes?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FAF3E6;"
            >
              <app-icon
                name="gift"
                :size="32"
                color="#C9A96E"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                邀请码管理
              </text><text class="mg-entry-sub">
                生成 / 分享 / 统计邀请码
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/guests?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FCE8EB;"
            >
              <app-icon
                name="user-plus"
                :size="32"
                color="#C41E3A"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                嘉宾/老师
              </text><text class="mg-entry-sub">
                邀请创作者 / 分成与权限管理
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/distribution?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FAF3E6;"
            >
              <app-icon
                name="percent"
                :size="32"
                color="#C9A96E"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                收益分配
              </text><text class="mg-entry-sub">
                平台/圈子/创作者分成方案
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
          <view
            class="mg-entry"
            @tap="navigateTo(`/pkg-circle/circles/earnings?id=${circleId}`)"
          >
            <view
              class="mg-entry-icon"
              style="background: #FCE8EB;"
            >
              <app-icon
                name="dollar-sign"
                :size="32"
                color="#C41E3A"
              />
            </view>
            <view class="mg-entry-info">
              <text class="mg-entry-title">
                收益明细
              </text><text class="mg-entry-sub">
                收入构成 / 历史收益 / 提现
              </text>
            </view>
            <app-icon
              name="chevron-right"
              :size="30"
              color="#cccccc"
            />
          </view>
        </view>
      </view>

      <!-- 成员 -->
      <view
        v-else-if="activeTab === 'members'"
        class="mg-section"
      >
        <view class="mg-search">
          <app-icon
            name="search"
            :size="28"
            color="#999999"
          />
          <input
            v-model="memberSearch"
            class="mg-search-input"
            placeholder="搜索成员"
            placeholder-class="mg-ph"
          >
        </view>

        <view
          v-for="m in filteredMembers"
          :key="m.id"
          class="mg-member"
        >
          <view class="mg-member-avatar-wrap">
            <image
              :src="m.avatar"
              class="mg-member-avatar"
              mode="aspectFill"
            />
            <view
              v-if="m.role === 'owner'"
              class="mg-member-badge owner"
            >
              <app-icon
                name="crown"
                :size="20"
                color="#ffffff"
              />
            </view>
            <view
              v-else-if="m.role === 'admin'"
              class="mg-member-badge admin"
            >
              <app-icon
                name="shield"
                :size="20"
                color="#ffffff"
              />
            </view>
          </view>
          <view class="mg-member-info">
            <view class="mg-member-name-row">
              <text class="mg-member-name">
                {{ m.name }}
              </text>
              <text
                class="mg-member-role"
                :class="m.role"
              >
                {{ m.role === 'owner' ? '圈主' : m.role === 'admin' ? '管理员' : '成员' }}
              </text>
            </view>
            <text class="mg-member-meta">
              发帖 {{ m.posts }} · 加入于 {{ m.joinedAt }}
            </text>
          </view>
          <view
            v-if="m.role !== 'owner'"
            class="mg-member-action"
          >
            <view
              class="mg-member-more"
              @tap="toggleMenu(m.id)"
            >
              <app-icon
                name="more-vertical"
                :size="28"
                color="#666666"
              />
            </view>
            <view
              v-if="openMenuId === m.id"
              class="mg-menu"
            >
              <view
                v-if="m.role === 'member'"
                class="mg-menu-item"
                @tap="showConfirm = { type: 'setAdmin', id: m.id, name: m.name }"
              >
                <text class="mg-menu-t">
                  设为管理员
                </text>
              </view>
              <view
                v-else
                class="mg-menu-item"
                @tap="showConfirm = { type: 'removeAdmin', id: m.id, name: m.name }"
              >
                <text class="mg-menu-t">
                  取消管理员
                </text>
              </view>
              <view
                class="mg-menu-item"
                @tap="showConfirm = { type: 'remove', id: m.id, name: m.name }"
              >
                <text class="mg-menu-t danger">
                  移出圈子
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 帖子 -->
      <view
        v-else-if="activeTab === 'posts'"
        class="mg-section"
      >
        <view
          v-for="p in posts"
          :key="p.id"
          class="mg-post"
        >
          <view class="mg-post-top">
            <image
              :src="p.author.avatar"
              class="mg-post-avatar"
              mode="aspectFill"
            />
            <view class="mg-post-main">
              <view class="mg-post-name-row">
                <text class="mg-post-name">
                  {{ p.author.name }}
                </text>
                <text
                  v-if="p.isPinned"
                  class="mg-post-tag pin"
                >
                  置顶
                </text>
                <text
                  v-if="p.isEssence"
                  class="mg-post-tag ess"
                >
                  精华
                </text>
              </view>
              <text class="mg-post-content">
                {{ p.content }}
              </text>
              <view class="mg-post-meta">
                <text class="mg-post-meta-t">
                  {{ p.likes }} 赞
                </text>
                <text class="mg-post-meta-t">
                  {{ p.comments }} 评论
                </text>
                <text class="mg-post-meta-t">
                  {{ p.createdAt }}
                </text>
              </view>
            </view>
          </view>
          <view class="mg-post-actions">
            <view
              class="mg-post-btn"
              :class="{ on: p.isPinned }"
              @tap="toggleTop(p)"
            >
              <app-icon
                name="pin"
                :size="22"
                :color="p.isPinned ? '#ffffff' : '#666666'"
              /><text
                class="mg-post-btn-t"
                :class="{ on: p.isPinned }"
              >
                {{ p.isPinned ? '取消置顶' : '置顶' }}
              </text>
            </view>
            <view
              class="mg-post-btn"
              :class="{ gold: p.isEssence }"
              @tap="toggleEssence(p)"
            >
              <app-icon
                name="star"
                :size="22"
                :color="p.isEssence ? '#ffffff' : '#666666'"
              /><text
                class="mg-post-btn-t"
                :class="{ on: p.isEssence }"
              >
                {{ p.isEssence ? '取消精华' : '设为精华' }}
              </text>
            </view>
            <view
              class="mg-post-btn danger"
              @tap="showConfirm = { type: 'deletePost', id: p.id, name: p.content.slice(0, 20) }"
            >
              <app-icon
                name="trash-2"
                :size="22"
                color="#EF4444"
              /><text class="mg-post-btn-t del">
                删除
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 设置 -->
      <view
        v-else-if="activeTab === 'settings'"
        class="mg-section"
      >
        <view class="mg-card">
          <text class="mg-set-title">
            基本信息
          </text>
          <view class="mg-field">
            <text class="mg-field-label">
              圈子名称
            </text>
            <input
              v-model="circle.name"
              class="mg-field-input"
            >
          </view>
          <view class="mg-field">
            <text class="mg-field-label">
              圈子简介
            </text>
            <textarea
              v-model="circle.description"
              class="mg-field-textarea"
              :maxlength="-1"
            />
          </view>
          <view class="mg-field">
            <text class="mg-field-label">
              圈子分类
            </text>
            <view class="mg-cat-list">
              <text
                v-for="cat in ['命理', '风水', '养生', '书法']"
                :key="cat"
                class="mg-cat"
                :class="{ on: circle.category === cat }"
                @tap="circle.category = cat"
              >
                {{ cat }}
              </text>
            </view>
          </view>
        </view>

        <view class="mg-card">
          <text class="mg-set-title">
            圈规设置
          </text>
          <textarea
            :value="circle.rules.join('\n')"
            class="mg-field-textarea tall"
            placeholder="请输入圈规，每行一条"
            :maxlength="-1"
            @input="(e:any) => circle.rules = e.detail.value.split('\n')"
          />
        </view>

        <view
          class="mg-save-settings"
          @tap="saveSettings"
        >
          <text class="mg-save-settings-t">
            保存设置
          </text>
        </view>
      </view>
      <view class="mg-bottom-pad" />
    </scroll-view>

    <!-- 确认弹窗 -->
    <view
      v-if="showConfirm"
      class="mg-mask"
      @tap="showConfirm = null"
    >
      <view
        class="mg-confirm"
        @tap.stop
      >
        <view class="mg-confirm-icon">
          <app-icon
            name="alert-triangle"
            :size="44"
            color="#F97316"
          />
        </view>
        <text class="mg-confirm-title">
          {{ confirmTitle(showConfirm.type) }}
        </text>
        <text class="mg-confirm-desc">
          {{ confirmDesc(showConfirm) }}
        </text>
        <view class="mg-confirm-actions">
          <view
            class="mg-confirm-btn cancel"
            @tap="showConfirm = null"
          >
            <text class="mg-confirm-btn-t cancel">
              取消
            </text>
          </view>
          <view
            class="mg-confirm-btn"
            :class="dangerConfirm ? 'danger' : 'primary'"
            @tap="doConfirm"
          >
            <text class="mg-confirm-btn-t ok">
              确定
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mg { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
/* 顶栏 + Tab */
.mg-hdr-wrap { background: #fff; border-bottom: 2rpx solid #E8E3DB; flex-shrink: 0; }
.mg-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; padding-top: var(--status-bar-height, 0); }
.mg-hdr-btn { width: 72rpx; }
.mg-hdr-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.mg-tabs { display: flex; border-top: 2rpx solid #E8E3DB; }
.mg-tab { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 20rpx 0; }
.mg-tab-t { font-size: 22rpx; color: #666666; }
.mg-tab-t.on { color: #C41E3A; }
.mg-tab-bar { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: #C41E3A; border-radius: 999rpx; }
.mg-body { flex: 1; overflow: hidden; }
.mg-section { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
/* 概览统计 */
.mg-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.mg-stat { background: #fff; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.mg-stat-num { display: block; font-size: 48rpx; font-weight: 700; line-height: 1.2; }
.mg-stat-num.red { color: #C41E3A; }
.mg-stat-num.gold { color: #C9A96E; }
.mg-stat-num.dark { color: #2C2C2C; }
.mg-stat-label { display: block; font-size: 22rpx; color: #666666; margin-top: 8rpx; }
  .mg-stat-delta { display: block; font-size: 22rpx; color: #22C55E; margin-top: 8rpx; }
  .mg-entries { display: flex; flex-direction: column; gap: 20rpx; margin-top: 20rpx; }
  .mg-entry { display: flex; align-items: center; gap: 18rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
  .mg-entry-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .mg-entry-info { flex: 1; min-width: 0; }
  .mg-entry-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
  .mg-entry-sub { display: block; font-size: 22rpx; color: #999999; margin-top: 4rpx; }
/* 卡片 */
.mg-card { background: #fff; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.mg-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.mg-card-title { display: flex; align-items: center; gap: 12rpx; }
.mg-card-title-t { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.mg-save-btn { display: flex; align-items: center; gap: 6rpx; padding: 10rpx 24rpx; background: #C41E3A; border-radius: 999rpx; }
.mg-save-btn.saving { opacity: 0.6; }
.mg-save-t { font-size: 22rpx; color: #fff; }
.mg-textarea { width: 100%; height: 180rpx; padding: 24rpx; background: #FAF8F5; border-radius: 16rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
/* 搜索 */
.mg-search { display: flex; align-items: center; gap: 16rpx; height: 80rpx; padding: 0 28rpx; background: #fff; border-radius: 16rpx; }
.mg-search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.mg-ph { color: #999999; }
/* 成员 */
.mg-member { display: flex; align-items: center; gap: 20rpx; background: #fff; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.mg-member-avatar-wrap { position: relative; flex-shrink: 0; }
.mg-member-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; }
.mg-member-badge { position: absolute; top: -6rpx; right: -6rpx; width: 36rpx; height: 36rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.mg-member-badge.owner { background: #C9A96E; }
.mg-member-badge.admin { background: #3B82F6; }
.mg-member-info { flex: 1; min-width: 0; }
.mg-member-name-row { display: flex; align-items: center; gap: 12rpx; }
.mg-member-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.mg-member-role { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.mg-member-role.owner { background: rgba(201,169,110,0.1); color: #C9A96E; }
.mg-member-role.admin { background: #EFF6FF; color: #3B82F6; }
.mg-member-role.member { background: #F3F4F6; color: #6B7280; }
.mg-member-meta { display: block; font-size: 22rpx; color: #999999; margin-top: 8rpx; }
.mg-member-action { position: relative; }
.mg-member-more { padding: 12rpx; }
.mg-menu { position: absolute; right: 0; top: 100%; margin-top: 8rpx; background: #fff; border-radius: 12rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); border: 2rpx solid #E8E3DB; min-width: 200rpx; z-index: 10; overflow: hidden; }
.mg-menu-item { padding: 20rpx 28rpx; }
.mg-menu-t { font-size: 26rpx; color: #2C2C2C; }
.mg-menu-t.danger { color: #EF4444; }
/* 帖子 */
.mg-post { background: #fff; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.mg-post-top { display: flex; gap: 20rpx; }
.mg-post-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0; }
.mg-post-main { flex: 1; min-width: 0; }
.mg-post-name-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.mg-post-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.mg-post-tag { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.mg-post-tag.pin { background: rgba(196,30,58,0.1); color: #C41E3A; }
.mg-post-tag.ess { background: rgba(201,169,110,0.1); color: #C9A96E; }
.mg-post-content { display: block; font-size: 28rpx; color: #2C2C2C; margin-top: 8rpx; line-height: 1.5; }
.mg-post-meta { display: flex; align-items: center; gap: 24rpx; margin-top: 12rpx; }
.mg-post-meta-t { font-size: 22rpx; color: #999999; }
.mg-post-actions { display: flex; align-items: center; gap: 16rpx; margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #E8E3DB; }
.mg-post-btn { display: flex; align-items: center; gap: 6rpx; padding: 10rpx 24rpx; border-radius: 999rpx; background: #FAF8F5; }
.mg-post-btn.on { background: #C41E3A; }
.mg-post-btn.gold { background: #C9A96E; }
.mg-post-btn.danger { background: #FEF2F2; }
.mg-post-btn-t { font-size: 22rpx; color: #666666; }
.mg-post-btn-t.on { color: #fff; }
.mg-post-btn-t.del { color: #EF4444; }
/* 设置 */
.mg-set-title { display: block; font-size: 30rpx; font-weight: 500; color: #2C2C2C; margin-bottom: 28rpx; }
.mg-field { margin-bottom: 28rpx; }
.mg-field:last-child { margin-bottom: 0; }
.mg-field-label { display: block; font-size: 22rpx; color: #666666; margin-bottom: 12rpx; }
.mg-field-input { width: 100%; height: 80rpx; padding: 0 24rpx; background: #FAF8F5; border-radius: 16rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.mg-field-textarea { width: 100%; height: 160rpx; padding: 24rpx; background: #FAF8F5; border-radius: 16rpx; font-size: 28rpx; color: #2C2C2C; box-sizing: border-box; }
.mg-field-textarea.tall { height: 240rpx; }
.mg-cat-list { display: flex; gap: 16rpx; flex-wrap: wrap; }
.mg-cat { font-size: 26rpx; color: #666666; padding: 12rpx 32rpx; background: #FAF8F5; border-radius: 999rpx; }
.mg-cat.on { background: #C41E3A; color: #fff; }
.mg-save-settings { height: 96rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(to right, #C41E3A, #E85050); border-radius: 20rpx; }
.mg-save-settings-t { font-size: 30rpx; font-weight: 500; color: #fff; }
.mg-bottom-pad { height: 40rpx; }
/* 确认弹窗 */
.mg-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 0 32rpx; }
.mg-confirm { width: 100%; max-width: 600rpx; background: #fff; border-radius: 28rpx; padding: 48rpx; }
.mg-confirm-icon { width: 88rpx; height: 88rpx; margin: 0 auto 24rpx; border-radius: 999rpx; background: #FFF7ED; display: flex; align-items: center; justify-content: center; }
.mg-confirm-title { display: block; text-align: center; font-size: 32rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 12rpx; }
.mg-confirm-desc { display: block; text-align: center; font-size: 26rpx; color: #666666; line-height: 1.5; margin-bottom: 40rpx; }
.mg-confirm-actions { display: flex; gap: 20rpx; }
.mg-confirm-btn { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; border-radius: 16rpx; }
.mg-confirm-btn.cancel { background: #FAF8F5; }
.mg-confirm-btn.primary { background: #C41E3A; }
.mg-confirm-btn.danger { background: #EF4444; }
.mg-confirm-btn-t { font-size: 28rpx; font-weight: 500; }
.mg-confirm-btn-t.cancel { color: #666666; }
.mg-confirm-btn-t.ok { color: #fff; }
</style>
