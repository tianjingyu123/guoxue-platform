<template>
  <view v-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-btn" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#374151" />
      </view>
      <text class="nav-title">群聊</text>
      <view class="nav-btn" @tap="goCreateGroup">
        <app-icon name="plus" :size="40" color="#C41E3A" />
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-box">
        <app-icon class="search-icon" name="search" :size="32" color="#9ca3af" />
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="搜索群聊"
          placeholder-class="search-ph"
          confirm-type="search"
          @input="onSearchInput"
        />
        <view v-if="searchKeyword" class="search-clear" @tap="clearSearch">
          <app-icon name="x" :size="32" color="#9ca3af" />
        </view>
      </view>
    </view>

    <!-- 列表区 -->
    <view class="list-wrap">
      <!-- 骨架(首次加载/搜索中) -->
      <view v-if="loading || isSearching" class="skeleton-list">
        <view v-for="i in 3" :key="i" class="sk-item">
          <view class="sk-avatar" />
          <view class="sk-info">
            <view class="sk-line sk-w33" />
            <view class="sk-line sk-w66" />
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-else-if="displayList.length === 0" class="empty">
        <app-icon name="users" :size="96" color="#d1d5db" />
        <text class="empty-text">{{ searchKeyword ? '未找到相关群聊' : '暂无群聊' }}</text>
      </view>

      <!-- 群聊列表 -->
      <view v-else class="group-list">
        <view
          v-for="group in displayList"
          :key="group.id"
          class="group-item"
          :class="{ pinned: group.isPinned }"
          @tap="goGroupChat(group.id)"
        >
          <!-- 群头像 -->
          <view class="avatar-box">
            <image lazy-load class="avatar" :src="group.avatar" mode="aspectFill" />
            <view v-if="group.isMuted" class="mute-badge">
              <app-icon name="bell-off" :size="20" color="#ffffff" />
            </view>
          </view>

          <!-- 群信息 -->
          <view class="group-info">
            <view class="group-title-row">
              <text class="group-name" :class="{ bold: group.unreadCount > 0 && !group.isMuted }">{{ group.name }}</text>
              <app-icon v-if="group.myRole === 'owner'" name="crown" :size="24" color="#f59e0b" />
              <app-icon v-else-if="group.myRole === 'admin'" name="shield" :size="24" color="#3b82f6" />
              <text class="group-count">({{ group.memberCount }})</text>
              <app-icon v-if="group.isPinned" name="pin" :size="24" color="#9ca3af" />
            </view>
            <text v-if="group.lastMessage" class="group-msg">{{ group.lastMessage.senderName }}: {{ group.lastMessage.content }}</text>
          </view>

          <!-- 右侧信息 -->
          <view class="group-right">
            <text class="group-time">{{ group.lastMessage && group.lastMessage.time }}</text>
            <view v-if="group.unreadCount > 0" class="unread-badge" :class="{ muted: group.isMuted }">
              {{ group.unreadCount > 99 ? '99+' : group.unreadCount }}
            </view>
          </view>

          <!-- 操作菜单触发 -->
          <view class="more-btn" @tap.stop="openMenu(group)">
            <app-icon name="more-vertical" :size="32" color="#9ca3af" />
          </view>
        </view>
      </view>
    </view>

    <!-- 创建群聊浮动按钮 -->
    <view class="fab" @tap="goCreateGroup">
      <app-icon name="plus" :size="48" color="#ffffff" />
    </view>

    <!-- 操作下拉菜单(底部弹层等价 DropdownMenu) -->
    <view v-if="menuGroup" class="mask" @tap="closeMenu">
      <view class="dropdown" @tap.stop>
        <view class="dd-item" @tap="onTogglePin">
          <app-icon name="pin" :size="32" color="#374151" />
          <text class="dd-text">{{ menuGroup.isPinned ? '取消置顶' : '置顶' }}</text>
        </view>
        <view class="dd-item" @tap="onToggleMute">
          <app-icon :name="menuGroup.isMuted ? 'bell' : 'bell-off'" :size="32" color="#374151" />
          <text class="dd-text">{{ menuGroup.isMuted ? '关闭免打扰' : '开启免打扰' }}</text>
        </view>
        <view class="dd-sep" />
        <view class="dd-item" @tap="onQuitTap">
          <app-icon name="log-out" :size="32" color="#dc2626" />
          <text class="dd-text danger">{{ menuGroup.myRole === 'owner' ? '解散群聊' : '退出群聊' }}</text>
        </view>
      </view>
    </view>

    <!-- 退出/解散确认 -->
    <view v-if="quitConfirm" class="mask center" @tap="quitConfirm = null">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">{{ quitConfirm.myRole === 'owner' ? '解散群聊' : '退出群聊' }}</text>
        <text class="dialog-desc">{{ quitConfirm.myRole === 'owner'
          ? `确定要解散「${quitConfirm.name}」吗？解散后所有成员将被移出，且无法恢复。`
          : `确定要退出「${quitConfirm.name}」吗？退出后将不再接收该群消息。` }}</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="quitConfirm = null">取消</view>
          <view class="dialog-btn confirm" @tap="onQuitConfirm">{{ quitConfirm.myRole === 'owner' ? '解散' : '退出' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, goBack as routerBack } from '@/utils/router'
import {
  imApi,
  type GroupListItem,
} from '@/lib/im-data'

const loading = ref(true)
const error = ref('')
const isSearching = ref(false)
const searchKeyword = ref('')
const groupList = ref<GroupListItem[]>([])
const searchResults = ref<GroupListItem[] | null>(null)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const list = await imApi.getGroupList()
    groupList.value = [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return 0
    })
  } catch (e: any) {
    error.value = e?.message || '加载群列表失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const menuGroup = ref<GroupListItem | null>(null)
const quitConfirm = ref<GroupListItem | null>(null)

const displayList = computed(() => searchResults.value ?? groupList.value)

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    searchResults.value = null
    isSearching.value = false
    return
  }
  isSearching.value = true
  if (searchTimer) clearTimeout(searchTimer)
  // @data-needs: 接入真实 searchGroups 接口；此处用本地 mock 过滤
  searchTimer = setTimeout(() => {
    searchResults.value = groupList.value.filter((g) => g.name.includes(kw))
    isSearching.value = false
  }, 300)
}

function clearSearch() {
  searchKeyword.value = ''
  searchResults.value = null
  isSearching.value = false
}

function goBack() {
  routerBack()
}
function goCreateGroup() {
  navigateTo('/im/create-group')
}
function goGroupChat(id: number) {
  navigateTo(`/im/group-chat/${id}`)
}

function openMenu(group: GroupListItem) {
  menuGroup.value = group
}
function closeMenu() {
  menuGroup.value = null
}

function onTogglePin() {
  // @data-needs: 调用 togglePinGroup 接口
  const g = menuGroup.value
  if (g) {
    g.isPinned = !g.isPinned
    groupList.value = [...groupList.value].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return 0
    })
    uni.showToast({ title: g.isPinned ? '已置顶' : '已取消置顶', icon: 'none' })
  }
  closeMenu()
}

function onToggleMute() {
  // @data-needs: 调用 toggleMuteGroup 接口
  const g = menuGroup.value
  if (g) {
    g.isMuted = !g.isMuted
    uni.showToast({ title: g.isMuted ? '已开启免打扰' : '已关闭免打扰', icon: 'none' })
  }
  closeMenu()
}

function onQuitTap() {
  quitConfirm.value = menuGroup.value
  menuGroup.value = null
}

function onQuitConfirm() {
  // @data-needs: 调用 quitGroup / dismissGroup 接口
  const g = quitConfirm.value
  if (g) {
    groupList.value = groupList.value.filter((x) => x.id !== g.id)
    if (searchResults.value) searchResults.value = searchResults.value.filter((x) => x.id !== g.id)
    uni.showToast({ title: g.myRole === 'owner' ? '已解散群聊' : '已退出群聊', icon: 'none' })
  }
  quitConfirm.value = null
}
</script>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; }

/* 顶部导航 */
.nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 32rpx; background: #ffffff; border-bottom: 2rpx solid #f3f4f6; }
.nav-btn { padding: 16rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { font-size: 36rpx; font-weight: 600; color: #111827; }

/* 搜索框 */
.search-bar { position: sticky; top: 112rpx; z-index: 40; background: #FAF8F5; padding: 32rpx; }
.search-box { position: relative; display: flex; align-items: center; height: 72rpx; background: #ffffff; border: 2rpx solid #e5e7eb; border-radius: 12rpx; }
.search-icon { position: absolute; left: 24rpx; }
.search-input { flex: 1; height: 72rpx; padding: 0 72rpx; font-size: 28rpx; color: #111827; }
.search-ph { color: #9ca3af; }
.search-clear { position: absolute; right: 20rpx; padding: 8rpx; }

/* 列表 */
.list-wrap { background: #ffffff; }
.group-list { }
.group-item { position: relative; display: flex; align-items: center; gap: 24rpx; padding: 32rpx; border-bottom: 2rpx solid #fafafa; }
.group-item.pinned { background: rgba(249, 250, 251, 0.5); }
.group-item:active { background: #f9fafb; }

.avatar-box { position: relative; flex-shrink: 0; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 16rpx; background: var(--brand); }
.mute-badge { position: absolute; bottom: -4rpx; right: -4rpx; width: 32rpx; height: 32rpx; background: #9ca3af; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }

.group-info { flex: 1; min-width: 0; }
.group-title-row { display: flex; align-items: center; gap: 12rpx; }
.group-name { font-weight: 500; color: #111827; font-size: 30rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320rpx; }
.group-name.bold { font-weight: 600; }
.group-count { font-size: 22rpx; color: #9ca3af; flex-shrink: 0; }
.group-msg { display: block; font-size: 26rpx; color: #6b7280; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.group-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; }
.group-time { font-size: 22rpx; color: #9ca3af; }
.unread-badge { height: 36rpx; min-width: 36rpx; padding: 0 12rpx; background: var(--brand); color: #ffffff; font-size: 22rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.unread-badge.muted { background: #9ca3af; }

.more-btn { padding: 12rpx; margin-right: -12rpx; flex-shrink: 0; }

/* 浮动按钮 */
.fab { position: fixed; bottom: 192rpx; right: 32rpx; width: 112rpx; height: 112rpx; background: var(--brand); border-radius: 999rpx; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); display: flex; align-items: center; justify-content: center; z-index: 30; }
.fab:active { transform: scale(0.95); }

/* 骨架 */
.skeleton-list { padding: 32rpx; }
.sk-item { display: flex; align-items: center; gap: 24rpx; margin-bottom: 24rpx; }
.sk-avatar { width: 96rpx; height: 96rpx; border-radius: 16rpx; background: #f0ebe5; flex-shrink: 0; }
.sk-info { flex: 1; }
.sk-line { height: 28rpx; background: #f0ebe5; border-radius: 8rpx; margin-bottom: 16rpx; }
.sk-w33 { width: 33%; }
.sk-w66 { width: 66%; }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; gap: 24rpx; }
.empty-text { font-size: 28rpx; color: #9ca3af; }

/* 遮罩 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.mask.center { align-items: center; justify-content: center; }

/* 下拉菜单(底部弹层) */
.dropdown { width: 100%; background: #ffffff; border-radius: 24rpx 24rpx 0 0; padding: 16rpx 0 48rpx; }
.dd-item { display: flex; align-items: center; gap: 24rpx; padding: 32rpx 48rpx; }
.dd-item:active { background: #f9fafb; }
.dd-text { font-size: 30rpx; color: #374151; }
.dd-text.danger { color: #dc2626; }
.dd-sep { height: 2rpx; background: #f3f4f6; margin: 8rpx 0; }

/* 确认弹窗 */
.dialog { width: 560rpx; background: #ffffff; border-radius: 24rpx; padding: 48rpx; }
.dialog-title { display: block; font-size: 34rpx; font-weight: 600; color: #111827; margin-bottom: 16rpx; }
.dialog-desc { display: block; font-size: 28rpx; color: #6b7280; line-height: 1.6; margin-bottom: 48rpx; }
.dialog-actions { display: flex; gap: 24rpx; }
.dialog-btn { flex: 1; height: 80rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.dialog-btn.cancel { background: #f3f4f6; color: #374151; }
.dialog-btn.confirm { background: #dc2626; color: #ffffff; }

/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
