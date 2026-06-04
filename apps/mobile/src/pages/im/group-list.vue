<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">群聊</text>
      <text class="nav-create" @click="goCreateGroup">＋</text>
    </view>

    <!-- 搜索框 -->
    <view class="search-wrap">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索群聊"
          @input="handleSearch"
        />
        <text v-if="searchKeyword" class="search-clear" @click="clearSearch">✕</text>
      </view>
    </view>

    <!-- 群聊列表 -->
    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="displayList.length === 0"
      :empty-icon="searchKeyword ? '🔍' : '👥'"
      :empty-title="searchKeyword ? '未找到相关群聊' : '暂无群聊'"
      skeleton-type="list"
      @retry="loadData"
    >
      <view>
        <!-- 搜索中 -->
        <view v-if="isSearching" class="searching-list">
          <view v-for="i in 3" :key="i" class="searching-item">
            <view class="sk-avatar" />
            <view class="sk-lines">
              <view class="sk-line w-40" />
              <view class="sk-line w-70" />
            </view>
          </view>
        </view>

        <!-- 群聊列表 -->
        <view v-else class="group-list">
          <view
            v-for="g in displayList"
            :key="g.id"
            class="group-item"
            :class="{ pinned: g.isPinned }"
            @click="goGroupChat(g)"
            @longpress="showGroupMenu(g)"
          >
            <!-- 群头像 -->
            <view class="group-avatar-wrap">
              <image v-if="g.avatar" :src="g.avatar" class="group-avatar" mode="aspectFill" />
              <view v-else class="group-avatar-placeholder">👥</view>
              <view v-if="g.isMuted" class="group-mute-badge">🔕</view>
            </view>
            <!-- 群信息 -->
            <view class="group-info">
              <view class="group-top">
                <view class="group-name-row">
                  <text class="group-name" :class="{ unread: g.unreadCount > 0 && !g.isMuted }">{{ g.name }}</text>
                  <text v-if="g.myRole === 'owner'" class="group-role">👑</text>
                  <text v-if="g.myRole === 'admin'" class="group-role">🛡</text>
                  <text class="group-member-count">({{ g.memberCount }})</text>
                  <text v-if="g.isPinned" class="group-pin">📌</text>
                </view>
                <text v-if="g.lastMessage" class="group-last-msg">
                  {{ g.lastMessage.senderName || '' }}: {{ g.lastMessage.content || '' }}
                </text>
              </view>
            </view>
            <!-- 右侧 -->
            <view class="group-right">
              <text class="group-time">{{ g.lastMessage?.time || '' }}</text>
              <text v-if="g.unreadCount > 0" class="group-badge" :class="{ muted: g.isMuted }">
                {{ g.unreadCount > 99 ? '99+' : g.unreadCount }}
              </text>
            </view>
            <!-- 操作按钮 -->
            <text class="group-more" @click.stop="showGroupMenu(g)">⋮</text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 创建群聊浮动按钮 -->
    <view class="fab" @click="goCreateGroup">
      <text class="fab-icon">＋</text>
    </view>

    <!-- 退群确认 -->
    <view v-if="quitConfirm" class="dialog-mask" @click="quitConfirm = null">
      <view class="dialog-box" @click.stop>
        <text class="dialog-title">{{ quitConfirm.myRole === 'owner' ? '解散群聊' : '退出群聊' }}</text>
        <text class="dialog-desc">
          {{ quitConfirm.myRole === 'owner'
            ? `确定要解散「${quitConfirm.name}」吗？解散后所有成员将被移出，且无法恢复。`
            : `确定要退出「${quitConfirm.name}」吗？退出后将不再接收该群消息。`
          }}
        </text>
        <view class="dialog-btns">
          <text class="dialog-btn dialog-btn-cancel" @click="quitConfirm = null">取消</text>
          <text class="dialog-btn dialog-btn-danger" @click="doQuit">{{ quitConfirm.myRole === 'owner' ? '解散' : '退出' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { imApi } from '../../api'

interface GroupLastMsg {
  senderName?: string
  content?: string
  time?: string
}

interface GroupItem {
  id: string
  name: string
  avatar?: string
  memberCount: number
  myRole: 'owner' | 'admin' | 'member'
  isPinned: boolean
  isMuted: boolean
  unreadCount: number
  lastMessage?: GroupLastMsg
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const data = ref<{ list: GroupItem[]; total: number } | null>(null)

const searchKeyword = ref('')
const searchResults = ref<GroupItem[] | null>(null)
const isSearching = ref(false)
const quitConfirm = ref<GroupItem | null>(null)

const displayList = computed(() => {
  if (searchKeyword.value && searchResults.value !== null) return searchResults.value
  return data.value?.list || []
})

function goBack() { uni.navigateBack() }

async function loadData() {
  loading.value = true
  loadError.value = null
  try {
    const res = await imApi.getGroupList() as any
    const raw = res?.data ?? res
    const list = Array.isArray(raw) ? raw : raw?.list || []
    data.value = { list, total: list.length }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchKeyword.value.trim()) {
    searchResults.value = null
    return
  }
  isSearching.value = true
  searchTimer = setTimeout(async () => {
    try {
      const res = await imApi.searchGroups(searchKeyword.value) as any
      const raw = res?.data ?? res
      searchResults.value = Array.isArray(raw) ? raw : []
    } catch {
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function clearSearch() {
  searchKeyword.value = ''
  searchResults.value = null
}

function goGroupChat(g: GroupItem) {
  uni.navigateTo({ url: `/pages/im/group-chat?groupId=${g.id}` })
}

function goCreateGroup() {
  uni.navigateTo({ url: '/pages/im/create-group' })
}

function showGroupMenu(g: GroupItem) {
  uni.showActionSheet({
    itemList: [
      g.isPinned ? '取消置顶' : '置顶',
      g.isMuted ? '关闭免打扰' : '开启免打扰',
      g.myRole === 'owner' ? '解散群聊' : '退出群聊',
    ],
    success: (res) => {
      if (res.tapIndex === 0) togglePin(g)
      else if (res.tapIndex === 1) toggleMute(g)
      else if (res.tapIndex === 2) quitConfirm.value = g
    }
  })
}

function togglePin(g: GroupItem) {
  g.isPinned = !g.isPinned
  if (data.value) {
    data.value.list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return 0
    })
  }
  uni.showToast({ title: g.isPinned ? '已置顶' : '已取消置顶', icon: 'none' })
}

function toggleMute(g: GroupItem) {
  g.isMuted = !g.isMuted
  uni.showToast({ title: g.isMuted ? '已开启免打扰' : '已关闭免打扰', icon: 'none' })
}

function doQuit() {
  if (!quitConfirm.value) return
  const item = quitConfirm.value
  if (data.value) {
    data.value.list = data.value.list.filter(g => g.id !== item.id)
    data.value.total = Math.max(0, data.value.total - 1)
  }
  quitConfirm.value = null
  uni.showToast({ title: item.myRole === 'owner' ? '群聊已解散' : '已退出群聊', icon: 'none' })
}

// 骨架屏辅助类
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

/* 导航 */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB; }
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-title { font-size: 18px; font-weight: 600; color: #2C2C2C; }
.nav-create { font-size: 22px; color: #C41E3A; padding: 4px; }

/* 搜索 */
.search-wrap { padding: 12px 16px; background: #F5F0E8; }
.search-input-wrap { position: relative; }
.search-input { background: #fff; border-radius: 20px; padding: 8px 32px 8px 36px; font-size: 14px; width: 100%; box-sizing: border-box; border: 1px solid #E5E1DB; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #999; }
.search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #999; padding: 4px; }

/* 搜索中 */
.searching-list { background: #fff; padding: 16px; }
.searching-item { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.sk-avatar { width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(90deg, #f0ece4 25%, #e8e2d8 50%, #f0ece4 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; flex-shrink: 0; }
.sk-lines { flex: 1; }
.sk-line { height: 12px; border-radius: 6px; background: linear-gradient(90deg, #f0ece4 25%, #e8e2d8 50%, #f0ece4 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; margin-bottom: 8px; }
.w-40 { width: 40%; }
.w-70 { width: 70%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 群列表 */
.group-list { background: #fff; }
.group-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-bottom: 1px solid #f5f0e8;
}
.group-item:active { background: #FAF8F5; }
.group-item.pinned { background: #FAF8F5; }

.group-avatar-wrap { position: relative; flex-shrink: 0; }
.group-avatar { width: 44px; height: 44px; border-radius: 8px; }
.group-avatar-placeholder { width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, #C41E3A, #E85A6B); display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; }
.group-mute-badge { position: absolute; bottom: -4px; right: -4px; font-size: 12px; background: #fff; border-radius: 50%; padding: 1px; line-height: 1; }

.group-info { flex: 1; min-width: 0; }
.group-top { }
.group-name-row { display: flex; align-items: center; gap: 4px; }
.group-name { font-size: 15px; font-weight: 400; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-name.unread { font-weight: 600; }
.group-role { font-size: 11px; }
.group-member-count { font-size: 11px; color: #999; flex-shrink: 0; }
.group-pin { font-size: 10px; color: #999; flex-shrink: 0; }
.group-last-msg { font-size: 12px; color: #999; margin-top: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.group-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.group-time { font-size: 11px; color: #ccc; }
.group-badge {
  min-width: 18px; height: 18px; background: #C41E3A; color: #fff;
  border-radius: 9px; text-align: center; line-height: 18px; font-size: 10px; padding: 0 5px;
}
.group-badge.muted { background: #999; }

.group-more { font-size: 16px; color: #999; padding: 8px 4px; flex-shrink: 0; }

/* 浮动按钮 */
.fab {
  position: fixed; bottom: 100px; right: 20px;
  width: 50px; height: 50px; background: linear-gradient(135deg, #C41E3A, #A01830);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(196,30,58,0.3); z-index: 50;
}
.fab:active { transform: scale(0.92); }
.fab-icon { font-size: 24px; color: #fff; }

/* 弹窗 */
.dialog-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.dialog-box { background: #fff; border-radius: 12px; width: 280px; padding: 24px; text-align: center; }
.dialog-title { font-size: 17px; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 10px; }
.dialog-desc { font-size: 14px; color: #666; line-height: 1.5; display: block; margin-bottom: 20px; }
.dialog-btns { display: flex; gap: 12px; }
.dialog-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 15px; text-align: center; }
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-danger { background: #C41E3A; color: #fff; }
</style>
