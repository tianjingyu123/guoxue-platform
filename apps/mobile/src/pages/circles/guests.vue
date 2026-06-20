<script setup lang="ts">
/**
 * 嘉宾/老师管理页（从原型 app/circles/[id]/guests/page.tsx 570行高保真迁移）
 * 搜索 + 四Tab(全部/嘉宾/老师/待审核) + 嘉宾卡片(角色徽章/操作菜单编辑·收益·移除/权限标签/4数据统计/待审核通过拒绝)
 * + 邀请嘉宾底部弹窗(链接/搜索·角色·权限·分成滑块·邀请链接复制) + 编辑嘉宾底部弹窗
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'
import { circleManageApi, type GuestItem } from '@/lib/circle-detail-data'

const circleId = ref('1')

onLoad((q) => { if (q?.id) circleId.value = q.id })

const permissionLabels: Record<string, string> = { article: '文章', course: '课程', live: '直播', qa: '问答', post: '帖子' }
const permEntries = Object.entries(permissionLabels)

const searchQuery = ref('')
const activeTab = ref<'all' | 'guest' | 'teacher' | 'pending'>('all')
const showInviteModal = ref(false)
const showActionMenu = ref<string | null>(null)
const showEditModal = ref<string | null>(null)
const loading = ref(true)
const error = ref('')
const allGuests = ref<GuestItem[]>([])

onMounted(() => { loadData() })

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    allGuests.value = (await circleManageApi.listGuests(circleId.value)) as GuestItem[]
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const pendingCount = computed(() => allGuests.value.filter((g) => g.status === 'pending').length)
const filteredGuests = computed(() =>
  allGuests.value
    .filter((g) => {
      if (activeTab.value === 'pending') return g.status === 'pending'
      if (activeTab.value === 'guest') return g.role === 'guest' && g.status === 'active'
      if (activeTab.value === 'teacher') return g.role === 'teacher' && g.status === 'active'
      return g.status === 'active'
    })
    .filter((g) => g.name.includes(searchQuery.value) || g.title.includes(searchQuery.value)),
)
const editingGuest = computed(() => allGuests.value.find((g) => g.id === showEditModal.value) || null)
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'guest', label: '嘉宾' },
  { key: 'teacher', label: '老师' },
  { key: 'pending', label: '待审核' },
] as const

// 邀请弹窗状态
const inviteType = ref<'link' | 'search'>('link')
const inviteRole = ref<'guest' | 'teacher'>('guest')
const inviteShare = ref(50)
const invitePerms = ref<string[]>(['article'])
const inviteLink = computed(() => `https://rebugx.com/invite/${circleId.value}?role=${inviteRole.value}`)
function toggleInvitePerm(p: string) { invitePerms.value = invitePerms.value.includes(p) ? invitePerms.value.filter((x) => x !== p) : [...invitePerms.value, p] }
function copyInviteLink() { uni.setClipboardData({ data: inviteLink.value, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) }) }

// 编辑弹窗状态
const editRole = ref<'guest' | 'teacher'>('guest')
const editShare = ref(50)
const editPerms = ref<string[]>([])
function openEdit(g: GuestItem) {
  showEditModal.value = g.id; showActionMenu.value = null
  editRole.value = g.role; editShare.value = g.revenueShare; editPerms.value = [...g.permissions]
}
function toggleEditPerm(p: string) { editPerms.value = editPerms.value.includes(p) ? editPerms.value.filter((x) => x !== p) : [...editPerms.value, p] }
</script>

<template>
  <view class="gt">
    <!-- Header -->
    <view class="gt-nav">
      <view class="gt-nav-bar">
        <view
          class="gt-back"
          @tap="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="#2C2C2C"
          />
        </view>
        <text class="gt-title">
          嘉宾/老师管理
        </text>
        <view
          class="gt-invite-btn"
          @tap="showInviteModal = true"
        >
          <app-icon
            name="user-plus"
            :size="40"
            color="#C41E3A"
          />
        </view>
      </view>
      <!-- 搜索 -->
      <view class="gt-search-wrap">
        <view class="gt-search">
          <app-icon
            name="search"
            :size="28"
            color="#999999"
          />
          <input
            v-model="searchQuery"
            class="gt-search-input"
            placeholder="搜索嘉宾/老师"
            placeholder-class="gt-ph"
          >
        </view>
      </view>
      <!-- Tabs -->
      <view class="gt-tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="gt-tab"
          :class="{ 'gt-tab-on': activeTab === t.key }"
          @tap="activeTab = t.key"
        >
          {{ t.label }}<text
            v-if="t.key === 'pending' && pendingCount"
            class="gt-tab-count"
          >
            ({{ pendingCount }})
          </text>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="gt-list">
      <view
        v-if="loading"
        class="gs-skeleton"
      >
        <view
          v-for="i in 3"
          :key="i"
          class="gs-sk-row"
        >
          <view class="gs-sk-block sk-anim" />
        </view>
      </view>
      <error-state
        v-else-if="error"
        :message="error"
        @retry="loadData"
      />
      <template v-else>
        <view
          v-if="filteredGuests.length === 0"
          class="gt-empty"
        >
          <app-icon
            name="user-plus"
            :size="56"
            color="#D9D9D9"
          />
          <text class="gt-empty-text">
            暂无嘉宾/老师
          </text>
          <view
            class="gt-empty-btn"
            @tap="showInviteModal = true"
          >
            邀请嘉宾
          </view>
        </view>

        <view
          v-for="g in filteredGuests"
          :key="g.id"
          class="gt-card"
        >
          <view class="gt-card-head">
            <image
              class="gt-avatar"
              :src="g.avatar"
              mode="aspectFill"
            />
            <view class="gt-info">
              <view class="gt-name-row">
                <text class="gt-name">
                  {{ g.name }}
                </text>
                <text
                  class="gt-role"
                  :class="g.role === 'teacher' ? 'gt-role-teacher' : 'gt-role-guest'"
                >
                  {{ g.role === 'teacher' ? '老师' : '嘉宾' }}
                </text>
                <text
                  v-if="g.status === 'pending'"
                  class="gt-role gt-role-pending"
                >
                  待审核
                </text>
              </view>
              <text class="gt-titletxt">
                {{ g.title }}
              </text>
              <text class="gt-joined">
                加入于 {{ g.joinedAt }}
              </text>
            </view>
            <view
              class="gt-more"
              @tap="showActionMenu = showActionMenu === g.id ? null : g.id"
            >
              <app-icon
                name="more-vertical"
                :size="36"
                color="#999999"
              />
            </view>
          </view>

          <!-- 操作菜单 -->
          <view
            v-if="showActionMenu === g.id"
            class="gt-menu"
          >
            <view
              class="gt-menu-item"
              @tap="openEdit(g)"
            >
              <app-icon
                name="edit"
                :size="26"
                color="#666666"
              /><text>编辑</text>
            </view>
            <view
              class="gt-menu-item"
              @tap="navigateTo(`/pages/circles/earnings?id=${circleId}&guest=${g.id}`)"
            >
              <app-icon
                name="trending-up"
                :size="26"
                color="#666666"
              /><text>收益</text>
            </view>
            <view
              class="gt-menu-item gt-menu-del"
              @tap="toastComingSoon()"
            >
              <app-icon
                name="trash-2"
                :size="26"
                color="#EF4444"
              /><text>移除</text>
            </view>
          </view>

          <!-- 权限标签 -->
          <view class="gt-perms">
            <text class="gt-perms-label">
              可发布：
            </text>
            <text
              v-for="p in g.permissions"
              :key="p"
              class="gt-perm"
            >
              {{ permissionLabels[p] }}
            </text>
          </view>

          <!-- 数据统计 -->
          <view
            v-if="g.status === 'active'"
            class="gt-stats"
          >
            <view class="gt-stat-grid">
              <view class="gt-stat">
                <view class="gt-stat-top">
                  <app-icon
                    name="file-text"
                    :size="22"
                    color="#999999"
                  /><text class="gt-stat-num">
                    {{ g.stats.articles }}
                  </text>
                </view>
                <text class="gt-stat-label">
                  文章
                </text>
              </view>
              <view class="gt-stat">
                <view class="gt-stat-top">
                  <app-icon
                    name="book-open"
                    :size="22"
                    color="#999999"
                  /><text class="gt-stat-num">
                    {{ g.stats.courses }}
                  </text>
                </view>
                <text class="gt-stat-label">
                  课程
                </text>
              </view>
              <view class="gt-stat">
                <view class="gt-stat-top">
                  <app-icon
                    name="radio"
                    :size="22"
                    color="#999999"
                  /><text class="gt-stat-num">
                    {{ g.stats.lives }}
                  </text>
                </view>
                <text class="gt-stat-label">
                  直播
                </text>
              </view>
              <view class="gt-stat">
                <text class="gt-stat-num gt-gold">
                  ¥{{ g.stats.thisMonthRevenue.toFixed(0) }}
                </text>
                <text class="gt-stat-label">
                  本月收益
                </text>
              </view>
            </view>
            <view class="gt-share-row">
              <text class="gt-share-txt">
                分成比例：{{ g.revenueShare }}%
              </text>
              <text class="gt-share-txt">
                累计收益：¥{{ g.stats.totalRevenue.toFixed(2) }}
              </text>
            </view>
          </view>

          <!-- 待审核操作 -->
          <view
            v-if="g.status === 'pending'"
            class="gt-pending-actions"
          >
            <view
              class="gt-pa gt-pa-ok"
              @tap="toastComingSoon()"
            >
              <app-icon
                name="check"
                :size="28"
                color="#ffffff"
              /><text>通过</text>
            </view>
            <view
              class="gt-pa gt-pa-no"
              @tap="toastComingSoon()"
            >
              <app-icon
                name="x"
                :size="28"
                color="#666666"
              /><text>拒绝</text>
            </view>
          </view>
        </view>
      </template>
    </view>

    <!-- 邀请嘉宾底部弹窗 -->
    <view
      v-if="showInviteModal"
      class="gt-modal-mask"
      @tap="showInviteModal = false"
    >
      <view
        class="gt-sheet"
        @tap.stop
      >
        <view class="gt-sheet-head">
          <text
            class="gt-sheet-cancel"
            @tap="showInviteModal = false"
          >
            取消
          </text>
          <text class="gt-sheet-title">
            邀请嘉宾/老师
          </text>
          <text
            class="gt-sheet-ok"
            @tap="showInviteModal = false"
          >
            确定
          </text>
        </view>
        <scroll-view
          scroll-y
          class="gt-sheet-body"
        >
          <!-- 邀请方式 -->
          <view class="gt-seg">
            <view
              class="gt-seg-btn"
              :class="{ 'gt-seg-on': inviteType === 'link' }"
              @tap="inviteType = 'link'"
            >
              链接邀请
            </view>
            <view
              class="gt-seg-btn"
              :class="{ 'gt-seg-on': inviteType === 'search' }"
              @tap="inviteType = 'search'"
            >
              搜索用户
            </view>
          </view>
          <!-- 角色选择 -->
          <text class="gt-field-label">
            角色类型
          </text>
          <view class="gt-roles">
            <view
              class="gt-role-card"
              :class="{ 'gt-role-card-on': inviteRole === 'guest' }"
              @tap="inviteRole = 'guest'"
            >
              <view class="gt-role-card-head">
                <app-icon
                  name="crown"
                  :size="32"
                  :color="inviteRole === 'guest' ? '#C9A96E' : '#999999'"
                /><text class="gt-role-card-name">
                  嘉宾
                </text>
              </view>
              <text class="gt-role-card-desc">
                受邀创作者，可发布内容
              </text>
            </view>
            <view
              class="gt-role-card"
              :class="{ 'gt-role-card-on': inviteRole === 'teacher' }"
              @tap="inviteRole = 'teacher'"
            >
              <view class="gt-role-card-head">
                <app-icon
                  name="shield"
                  :size="32"
                  :color="inviteRole === 'teacher' ? '#2563EB' : '#999999'"
                /><text class="gt-role-card-name">
                  老师
                </text>
              </view>
              <text class="gt-role-card-desc">
                签约讲师，可开设课程
              </text>
            </view>
          </view>
          <!-- 发布权限 -->
          <text class="gt-field-label">
            发布权限
          </text>
          <view class="gt-perm-pills">
            <view
              v-for="[key, label] in permEntries"
              :key="key"
              class="gt-perm-pill"
              :class="{ 'gt-perm-pill-on': invitePerms.includes(key) }"
              @tap="toggleInvitePerm(key)"
            >
              {{ label }}
            </view>
          </view>
          <!-- 分成比例 -->
          <text class="gt-field-label">
            收益分成比例（嘉宾/老师）
          </text>
          <view class="gt-slider-row">
            <slider
              class="gt-slider"
              :value="inviteShare"
              :min="10"
              :max="90"
              :step="5"
              active-color="#C41E3A"
              block-size="20"
              @changing="inviteShare = $event.detail.value"
              @change="inviteShare = $event.detail.value"
            />
            <text class="gt-slider-val">
              {{ inviteShare }}%
            </text>
          </view>
          <text class="gt-slider-hint">
            嘉宾/老师获得 {{ inviteShare }}%，圈子获得 {{ 100 - inviteShare }}%
          </text>
          <!-- 邀请链接 -->
          <view v-if="inviteType === 'link'">
            <text class="gt-field-label">
              邀请链接
            </text>
            <view class="gt-link-row">
              <view class="gt-link">
                {{ inviteLink }}
              </view>
              <view
                class="gt-link-btn"
                @tap="copyInviteLink"
              >
                <app-icon
                  name="copy"
                  :size="28"
                  color="#ffffff"
                />
              </view>
              <view
                class="gt-link-btn gt-link-btn-ghost"
                @tap="toastComingSoon()"
              >
                <app-icon
                  name="qr-code"
                  :size="28"
                  color="#666666"
                />
              </view>
            </view>
            <text class="gt-slider-hint">
              链接7天内有效，对方接受邀请后自动成为嘉宾/老师
            </text>
          </view>
          <!-- 搜索用户 -->
          <view v-else>
            <text class="gt-field-label">
              搜索用户
            </text>
            <view class="gt-search gt-search-modal">
              <app-icon
                name="search"
                :size="28"
                color="#999999"
              />
              <input
                class="gt-search-input"
                placeholder="输入用户名或ID搜索"
                placeholder-class="gt-ph"
              >
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 编辑嘉宾底部弹窗 -->
    <view
      v-if="showEditModal && editingGuest"
      class="gt-modal-mask"
      @tap="showEditModal = null"
    >
      <view
        class="gt-sheet"
        @tap.stop
      >
        <view class="gt-sheet-head">
          <text
            class="gt-sheet-cancel"
            @tap="showEditModal = null"
          >
            取消
          </text>
          <text class="gt-sheet-title">
            编辑 {{ editingGuest.name }}
          </text>
          <text
            class="gt-sheet-ok"
            @tap="showEditModal = null"
          >
            保存
          </text>
        </view>
        <scroll-view
          scroll-y
          class="gt-sheet-body"
        >
          <text class="gt-field-label">
            角色类型
          </text>
          <view class="gt-seg">
            <view
              class="gt-seg-btn"
              :class="{ 'gt-seg-on-gold': editRole === 'guest' }"
              @tap="editRole = 'guest'"
            >
              嘉宾
            </view>
            <view
              class="gt-seg-btn"
              :class="{ 'gt-seg-on-info': editRole === 'teacher' }"
              @tap="editRole = 'teacher'"
            >
              老师
            </view>
          </view>
          <text class="gt-field-label">
            发布权限
          </text>
          <view class="gt-perm-pills">
            <view
              v-for="[key, label] in permEntries"
              :key="key"
              class="gt-perm-pill"
              :class="{ 'gt-perm-pill-on': editPerms.includes(key) }"
              @tap="toggleEditPerm(key)"
            >
              {{ label }}
            </view>
          </view>
          <text class="gt-field-label">
            收益分成比例
          </text>
          <view class="gt-slider-row">
            <slider
              class="gt-slider"
              :value="editShare"
              :min="10"
              :max="90"
              :step="5"
              active-color="#C41E3A"
              block-size="20"
              @changing="editShare = $event.detail.value"
              @change="editShare = $event.detail.value"
            />
            <text class="gt-slider-val">
              {{ editShare }}%
            </text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.gt { min-height: 100vh; background: #FAF8F5; }
.gt-nav { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1rpx solid #F2EFEA; }
.gt-nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 96rpx; }
.gt-back, .gt-invite-btn { padding: 8rpx; }
.gt-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.gt-search-wrap { padding: 0 24rpx 18rpx; }
.gt-search { display: flex; align-items: center; gap: 10rpx; background: #FAF8F5; border-radius: 16rpx; padding: 16rpx 20rpx; }
.gt-search-input { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.gt-ph { color: #999999; }
.gt-tabs { display: flex; gap: 14rpx; padding: 0 24rpx 18rpx; }
.gt-tab { padding: 10rpx 28rpx; border-radius: 999rpx; font-size: 28rpx; background: #FAF8F5; color: #999999; }
.gt-tab-on { background: #C41E3A; color: #fff; }
.gt-tab-count { font-size: 22rpx; }
.gt-list { padding: 24rpx; display: flex; flex-direction: column; gap: 18rpx; }
.gt-empty { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; gap: 18rpx; }
.gt-empty-text { font-size: 26rpx; color: #999999; }
.gt-empty-btn { margin-top: 8rpx; padding: 14rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 16rpx; font-size: 26rpx; }
.gt-card { background: #fff; border-radius: 28rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.gt-card-head { display: flex; align-items: flex-start; gap: 18rpx; }
.gt-avatar { width: 88rpx; height: 88rpx; border-radius: 16rpx; background: #F2EFEA; flex-shrink: 0; }
.gt-info { flex: 1; min-width: 0; }
.gt-name-row { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.gt-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.gt-role { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.gt-role-teacher { background: rgba(37,99,235,0.1); color: #2563EB; }
.gt-role-guest { background: rgba(201,169,110,0.1); color: #C9A96E; }
.gt-role-pending { background: #FFEDD5; color: #EA580C; }
.gt-titletxt { display: block; font-size: 24rpx; color: #999999; margin-top: 4rpx; }
.gt-joined { display: block; font-size: 20rpx; color: #999999; margin-top: 6rpx; }
.gt-more { padding: 8rpx; margin-right: -8rpx; }
.gt-menu { margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F2EFEA; display: flex; gap: 14rpx; }
.gt-menu-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 16rpx 0; font-size: 26rpx; color: #666666; background: #FAF8F5; border-radius: 12rpx; }
.gt-menu-del { color: #EF4444; background: #FEF2F2; }
.gt-perms { margin-top: 18rpx; display: flex; flex-wrap: wrap; align-items: center; gap: 10rpx; }
.gt-perms-label { font-size: 20rpx; color: #999999; }
.gt-perm { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; background: #FAF8F5; color: #999999; }
.gt-stats { margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F2EFEA; }
.gt-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.gt-stat { text-align: center; }
.gt-stat-top { display: flex; align-items: center; justify-content: center; gap: 6rpx; }
.gt-stat-num { font-size: 28rpx; font-weight: 500; color: #666666; }
.gt-gold { color: #C9A96E; }
.gt-stat-label { display: block; font-size: 20rpx; color: #999999; margin-top: 4rpx; }
.gt-share-row { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; }
.gt-share-txt { font-size: 24rpx; color: #999999; }
.gt-pending-actions { margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F2EFEA; display: flex; gap: 14rpx; }
.gt-pa { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 18rpx 0; border-radius: 16rpx; font-size: 28rpx; }
.gt-pa-ok { background: #C41E3A; color: #fff; }
.gt-pa-no { background: #FAF8F5; color: #666666; }
/* 弹窗 */
.gt-modal-mask { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.gt-sheet { width: 100%; background: #fff; border-radius: 36rpx 36rpx 0 0; max-height: 85vh; overflow: hidden; }
.gt-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-bottom: 1rpx solid #F2EFEA; }
.gt-sheet-cancel { font-size: 28rpx; color: #999999; }
.gt-sheet-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.gt-sheet-ok { font-size: 28rpx; color: #C41E3A; font-weight: 500; }
.gt-sheet-body { padding: 28rpx 24rpx; max-height: 70vh; }
.gt-seg { display: flex; gap: 14rpx; margin-bottom: 24rpx; }
.gt-seg-btn { flex: 1; padding: 18rpx 0; text-align: center; border-radius: 16rpx; font-size: 28rpx; background: #FAF8F5; color: #999999; }
.gt-seg-on { background: #C41E3A; color: #fff; }
.gt-seg-on-gold { background: #C9A96E; color: #fff; }
.gt-seg-on-info { background: #2563EB; color: #fff; }
.gt-field-label { display: block; font-size: 28rpx; font-weight: 500; color: #2C2C2C; margin: 12rpx 0 16rpx; }
.gt-roles { display: flex; gap: 14rpx; }
.gt-role-card { flex: 1; padding: 22rpx; border-radius: 16rpx; border: 3rpx solid #F2EFEA; }
.gt-role-card-on { border-color: #C41E3A; background: rgba(196,30,58,0.05); }
.gt-role-card-head { display: flex; align-items: center; gap: 10rpx; }
.gt-role-card-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.gt-role-card-desc { display: block; font-size: 20rpx; color: #999999; margin-top: 6rpx; }
.gt-perm-pills { display: flex; flex-wrap: wrap; gap: 14rpx; }
.gt-perm-pill { padding: 14rpx 32rpx; border-radius: 16rpx; font-size: 28rpx; background: #FAF8F5; color: #999999; }
.gt-perm-pill-on { background: #C41E3A; color: #fff; }
.gt-slider-row { display: flex; align-items: center; gap: 24rpx; }
.gt-slider { flex: 1; }
.gt-slider-val { font-size: 34rpx; font-weight: 700; color: #C41E3A; width: 100rpx; text-align: right; }
.gt-slider-hint { display: block; font-size: 24rpx; color: #999999; margin-top: 10rpx; }
.gt-link-row { display: flex; gap: 14rpx; }
.gt-link { flex: 1; padding: 18rpx 20rpx; background: #FAF8F5; border-radius: 16rpx; font-size: 26rpx; color: #999999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-link-btn { padding: 0 28rpx; display: flex; align-items: center; justify-content: center; background: #C41E3A; border-radius: 16rpx; }
.gt-link-btn-ghost { background: #FAF8F5; }
.gt-search-modal { margin-top: 4rpx; }
.gs-skeleton { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.gs-sk-row { display: flex; gap: 16rpx; }
.gs-sk-block { flex: 1; height: 120rpx; border-radius: 16rpx; }
.sk-anim { background: linear-gradient(90deg, #E8E0D0 25%, #F0EDE6 50%, #E8E0D0 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
