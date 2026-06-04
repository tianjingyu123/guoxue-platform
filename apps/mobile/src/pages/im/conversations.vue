<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-left">
        <text
          class="nav-back"
          @click="goBack"
        >
          ←
        </text>
        <text class="nav-title">
          消息
        </text>
        <text
          v-if="totalUnread > 0"
          class="nav-badge"
        >
          {{ totalUnread > 99 ? '99+' : totalUnread }}
        </text>
      </view>
      <text
        class="nav-search-btn"
        @click="openSearch"
      >
        🔍
      </text>
    </view>

    <!-- 会话列表 -->
    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="!loading && convs.length === 0"
      empty-icon="💬"
      empty-title="暂无消息"
      empty-description="开始与好友交流吧"
      skeleton-type="list"
      @retry="fetchConvs"
    >
      <view class="conv-list">
        <view
          v-for="c in convs"
          :key="c.id"
          class="conv-item-wrap"
          @touchstart="onTouchStart($event, c)"
          @touchmove="onTouchMove($event, c)"
          @touchend="onTouchEnd($event, c)"
        >
          <!-- 左滑删除按钮 -->
          <view
            class="swipe-delete"
            :class="{ show: swipeId === c.id }"
          >
            <view
              class="swipe-btn delete-btn"
              @click="confirmDelete(c)"
            >
              🗑
            </view>
          </view>
          <!-- 会话内容 -->
          <view
            class="conv-item"
            :class="{ swiped: swipeId === c.id, pinned: c.isPinned }"
            @click="enterChat(c)"
          >
            <!-- 头像 -->
            <view class="conv-avatar-wrap">
              <image
                :src="c.avatar || ''"
                class="conv-avatar"
                mode="aspectFill"
              />
              <text
                v-if="c.unread > 0 && !c.isMuted"
                class="badge-text"
              >
                {{ c.unread > 99 ? '99+' : c.unread }}
              </text>
              <view
                v-if="c.unread > 0 && c.isMuted"
                class="badge-dot"
              />
              <view
                v-if="c.type === 'group'"
                class="type-icon"
              >
                👥
              </view>
              <view
                v-if="c.type === 'system'"
                class="type-icon"
              >
                🔔
              </view>
              <view
                v-if="c.type === 'service'"
                class="type-icon"
              >
                🎧
              </view>
            </view>
            <!-- 信息区 -->
            <view class="conv-info">
              <view class="conv-top">
                <view class="conv-name-row">
                  <text
                    class="conv-name"
                    :class="{ unread: c.unread > 0 }"
                  >
                    {{ c.name }}
                  </text>
                  <text
                    v-if="c.isPinned"
                    class="icon-pin"
                  >
                    📌
                  </text>
                  <text
                    v-if="c.isMuted"
                    class="icon-mute"
                  >
                    🔕
                  </text>
                </view>
                <text class="conv-time">
                  {{ c.lastTime || '' }}
                </text>
              </view>
              <view class="conv-bottom">
                <text
                  v-if="c.draft"
                  class="conv-draft"
                >
                  [草稿] {{ c.draft }}
                </text>
                <text
                  v-else
                  class="conv-msg"
                  :class="{ unread: c.unread > 0 }"
                >
                  {{ c.lastMsg || '' }}
                </text>
              </view>
            </view>
            <!-- 更多按钮 -->
            <text
              class="conv-more"
              @click.stop="openActions(c)"
            >
              ⋮
            </text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- 搜索弹层 -->
    <view
      v-if="showSearch"
      class="sheet-mask"
      @click="closeSearch"
    >
      <view
        class="sheet-content sheet-full"
        @click.stop
      >
        <view class="search-header">
          <view class="search-input-wrap">
            <text class="search-icon">
              🔍
            </text>
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索好友或聊天记录"
              focus
            >
            <text
              v-if="searchKeyword"
              class="search-clear"
              @click="searchKeyword = ''"
            >
              ✕
            </text>
          </view>
          <text
            class="search-cancel"
            @click="closeSearch"
          >
            取消
          </text>
        </view>
        <!-- 搜索结果 -->
        <view
          v-if="searching"
          class="search-status"
        >
          搜索中...
        </view>
        <view
          v-else-if="searchResults"
          class="search-results"
        >
          <view
            v-if="searchResults.friends?.length > 0"
            class="search-section"
          >
            <text class="search-section-title">
              好友
            </text>
            <view
              v-for="f in searchResults.friends"
              :key="f.id"
              class="search-item"
              @click="searchToChat(f, 'private')"
            >
              <image
                :src="f.avatar || ''"
                class="search-item-avatar"
                mode="aspectFill"
              />
              <view class="search-item-info">
                <text class="search-item-name">
                  {{ f.remark || f.nickname }}
                </text>
                <text
                  v-if="f.signature"
                  class="search-item-desc"
                >
                  {{ f.signature }}
                </text>
              </view>
            </view>
          </view>
          <view
            v-if="searchResults.convs?.length > 0"
            class="search-section"
          >
            <text class="search-section-title">
              聊天记录
            </text>
            <view
              v-for="conv in searchResults.convs"
              :key="conv.id"
              class="search-item"
              @click="searchToChat(conv, conv.type)"
            >
              <image
                :src="conv.avatar || ''"
                class="search-item-avatar"
                mode="aspectFill"
              />
              <view class="search-item-info">
                <text class="search-item-name">
                  {{ conv.name }}
                </text>
                <text class="search-item-desc">
                  {{ conv.lastMsg || '' }}
                </text>
              </view>
            </view>
          </view>
          <view
            v-if="(!searchResults.friends || searchResults.friends.length === 0) && (!searchResults.convs || searchResults.convs.length === 0)"
            class="search-status"
          >
            未找到相关结果
          </view>
        </view>
        <view
          v-else
          class="search-status"
        >
          输入关键词搜索好友或聊天记录
        </view>
      </view>
    </view>

    <!-- 操作菜单 -->
    <view
      v-if="showActions"
      class="sheet-mask"
      @click="closeActions"
    >
      <view
        class="sheet-content sheet-bottom"
        @click.stop
      >
        <view
          class="action-item"
          @click="togglePin"
        >
          <text>📌</text>
          <text>{{ activeConv?.isPinned ? '取消置顶' : '置顶聊天' }}</text>
        </view>
        <view
          class="action-item"
          @click="toggleMute"
        >
          <text>🔕</text>
          <text>{{ activeConv?.isMuted ? '取消免打扰' : '消息免打扰' }}</text>
        </view>
        <view
          class="action-item action-danger"
          @click="confirmDelete(activeConv)"
        >
          <text>🗑</text>
          <text>删除会话</text>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view
      v-if="showDeleteConfirm"
      class="dialog-mask"
      @click="showDeleteConfirm = false"
    >
      <view
        class="dialog-box"
        @click.stop
      >
        <text class="dialog-title">
          删除会话
        </text>
        <text class="dialog-desc">
          确定要删除与"{{ deleteTarget?.name }}"的会话吗？聊天记录将被清空且无法恢复。
        </text>
        <view class="dialog-btns">
          <text
            class="dialog-btn dialog-btn-cancel"
            @click="showDeleteConfirm = false"
          >
            取消
          </text>
          <text
            class="dialog-btn dialog-btn-danger"
            @click="handleDelete"
          >
            删除
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import DataState from '../../components/DataState.vue'
import { imApi } from '../../api'

interface ConvItem {
  id: string
  name: string
  avatar?: string
  lastMsg?: string
  lastTime?: string
  unread: number
  type: 'private' | 'group' | 'system' | 'service'
  isPinned: boolean
  isMuted: boolean
  targetId?: string
  draft?: string
}

const convs = ref<ConvItem[]>([])
const totalUnread = ref(0)
const loading = ref(true)
const loadError = ref<string | null>(null)

// 搜索
const showSearch = ref(false)
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<{ friends: any[]; convs: any[] } | null>(null)

// 操作
const activeConv = ref<ConvItem | null>(null)
const showActions = ref(false)

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<ConvItem | null>(null)

// 滑动
const swipeId = ref<string | null>(null)
const touchStartX = ref(0)
const touchStartY = ref(0)

function goBack() {
  uni.navigateBack()
}

async function fetchConvs() {
  loading.value = true
  loadError.value = null
  try {
    const res = await imApi.getConversationList()
    const raw = (res as any)?.data ?? res
    const list: any[] = Array.isArray(raw) ? raw : []
    convs.value = list.map((item: any, idx: number) => ({
      id: String(item.conversationID || item.id || idx),
      name: item.name || item.showName || '',
      avatar: item.avatar || '',
      lastMsg: item.lastMessage?.text || item.lastMsg || '',
      lastTime: item.lastTime || '',
      unread: item.unreadCount || item.unread || 0,
      type: item.type || 'private' as const,
      isPinned: item.isPinned || false,
      isMuted: item.isMuted || false,
      targetId: String(item.userID || item.userId || item.groupId || ''),
    }))
    totalUnread.value = convs.value.reduce((sum, c) => sum + c.unread, 0)
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchConvs()
})

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchKeyword, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!val.trim()) {
    searchResults.value = null
    return
  }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try {
      const res = await imApi.searchConversationsAndFriends(val)
      const data = (res as any)?.data || res || {}
      searchResults.value = {
        friends: data?.friends || [],
        convs: data?.conversations || [],
      }
    } catch {
      searchResults.value = { friends: [], convs: [] }
    } finally {
      searching.value = false
    }
  }, 300)
})

function openSearch() {
  showSearch.value = true
  searchKeyword.value = ''
  searchResults.value = null
}

function closeSearch() {
  showSearch.value = false
  searchKeyword.value = ''
  searchResults.value = null
}

function searchToChat(target: any, type: string) {
  closeSearch()
  if (type === 'private') {
    uni.navigateTo({ url: `/pages/im/chat?userId=${target.id || target.userId}` })
  } else if (type === 'group') {
    uni.navigateTo({ url: `/pages/im/group-chat?groupId=${target.id}` })
  }
}

function enterChat(c: ConvItem) {
  if (swipeId.value === c.id) {
    swipeId.value = null
    return
  }
  if (c.type === 'private') {
    uni.navigateTo({ url: `/pages/im/chat?userId=${c.targetId}` })
  } else if (c.type === 'group') {
    uni.navigateTo({ url: `/pages/im/group-chat?groupId=${c.targetId}` })
  }
}

function openActions(c: ConvItem) {
  activeConv.value = c
  showActions.value = true
}

function closeActions() {
  showActions.value = false
  activeConv.value = null
}

async function togglePin() {
  if (!activeConv.value) return
  const c = activeConv.value
  c.isPinned = !c.isPinned
  // 重新排序：置顶在前
  convs.value.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return 0
  })
  closeActions()
}

async function toggleMute() {
  if (!activeConv.value) return
  activeConv.value.isMuted = !activeConv.value.isMuted
  closeActions()
}

function confirmDelete(c: ConvItem | null) {
  if (!c) return
  deleteTarget.value = c
  showDeleteConfirm.value = true
  showActions.value = false
  swipeId.value = null
}

async function handleDelete() {
  if (!deleteTarget.value) return
  convs.value = convs.value.filter(item => item.id !== deleteTarget.value!.id)
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

// 左滑事件
function onTouchStart(e: any, c: ConvItem) {
  const touch = e.touches[0]
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

function onTouchMove(e: any, c: ConvItem) {
  const touch = e.touches[0]
  const diffX = touchStartX.value - touch.clientX
  const diffY = Math.abs(touchStartY.value - touch.clientY)
  if (diffY < 30) {
    if (diffX > 50) {
      swipeId.value = c.id
    } else if (diffX < -30) {
      swipeId.value = null
    }
  }
}

function onTouchEnd(e: any, c: ConvItem) {
  // handled in onTouchMove
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

/* 导航 */
.nav {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB;
}
.nav-left { display: flex; align-items: center; gap: 10px; }
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-title { font-size: 18px; font-weight: 600; color: #2C2C2C; }
.nav-badge {
  background: #C41E3A; color: #fff; font-size: 11px;
  padding: 1px 8px; border-radius: 10px; min-width: 20px; text-align: center;
}
.nav-search-btn { font-size: 18px; color: #999; padding: 4px; }

/* 会话列表 */
.conv-list { background: #fff; }
.conv-item-wrap {
  position: relative; overflow: hidden;
  border-bottom: 1px solid #f5f0e8;
}
.conv-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; background: #fff;
  transition: transform 0.2s;
  position: relative; z-index: 1;
}
.conv-item.swiped { transform: translateX(-68px); }
.conv-item.pinned { background: #FAF8F5; }

/* 头像 */
.conv-avatar-wrap { position: relative; flex-shrink: 0; }
.conv-avatar { width: 48px; height: 48px; border-radius: 50%; }
.badge-text {
  position: absolute; top: -4px; right: -4px;
  background: #C41E3A; color: #fff; font-size: 10px;
  min-width: 18px; height: 18px; line-height: 18px;
  text-align: center; border-radius: 9px; padding: 0 4px;
}
.badge-dot {
  position: absolute; top: 0; right: 0;
  width: 8px; height: 8px; border-radius: 50%; background: #999;
}
.type-icon {
  position: absolute; bottom: -2px; right: -2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #C41E3A; color: #fff; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}

/* 信息区 */
.conv-info { flex: 1; min-width: 0; }
.conv-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.conv-name-row { display: flex; align-items: center; gap: 4px; min-width: 0; }
.conv-name { font-size: 15px; color: #2C2C2C; font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-name.unread { font-weight: 600; }
.icon-pin { font-size: 10px; color: #C41E3A; flex-shrink: 0; }
.icon-mute { font-size: 10px; color: #999; flex-shrink: 0; }
.conv-time { font-size: 11px; color: #999; flex-shrink: 0; }
.conv-bottom { margin-top: 2px; }
.conv-draft { font-size: 13px; color: #C41E3A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.conv-msg { font-size: 13px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.conv-msg.unread { color: #666; }
.conv-more {
  font-size: 18px; color: #999; padding: 4px 0 4px 8px; flex-shrink: 0;
}

/* 滑动删除 */
.swipe-delete {
  position: absolute; right: 0; top: 0; bottom: 0;
  display: flex; align-items: stretch;
  transform: translateX(100%); transition: transform 0.2s; z-index: 0;
}
.swipe-delete.show { transform: translateX(0); }
.swipe-btn {
  width: 68px; display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.delete-btn { background: #C41E3A; color: #fff; }

/* 搜索弹层 */
.sheet-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 100; display: flex;
}
.sheet-content { background: #fff; }
.sheet-full { width: 100%; height: 100%; overflow-y: auto; }
.sheet-bottom {
  margin-top: auto; border-radius: 16px 16px 0 0;
  padding: 8px 0 env(safe-area-inset-bottom);
}
.search-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB; }
.search-input-wrap { flex: 1; position: relative; }
.search-input {
  background: #F5F0E8; border-radius: 20px; padding: 8px 32px 8px 36px;
  font-size: 14px; width: 100%; box-sizing: border-box;
}
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #999; }
.search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #999; padding: 4px; }
.search-cancel { font-size: 15px; color: #666; padding: 4px; }
.search-status { text-align: center; padding: 40px 16px; font-size: 14px; color: #999; }
.search-results { padding: 8px 0; }
.search-section { margin-bottom: 12px; }
.search-section-title { font-size: 12px; color: #999; padding: 8px 16px; }
.search-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; }
.search-item:active { background: #F5F0E8; }
.search-item-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.search-item-info { flex: 1; min-width: 0; }
.search-item-name { font-size: 14px; font-weight: 500; color: #2C2C2C; display: block; }
.search-item-desc { font-size: 12px; color: #999; margin-top: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 操作菜单 */
.action-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; font-size: 15px; color: #2C2C2C;
  border-bottom: 1px solid #f5f5f5;
}
.action-item:active { background: #F5F0E8; }
.action-danger { color: #C41E3A; }

/* 弹窗 */
.dialog-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.dialog-box {
  background: #fff; border-radius: 12px; width: 280px;
  padding: 24px; text-align: center;
}
.dialog-title { font-size: 17px; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 12px; }
.dialog-desc { font-size: 14px; color: #666; line-height: 1.5; display: block; margin-bottom: 20px; }
.dialog-btns { display: flex; gap: 12px; }
.dialog-btn {
  flex: 1; padding: 10px; border-radius: 8px; font-size: 15px; text-align: center;
}
.dialog-btn-cancel { background: #F5F0E8; color: #666; }
.dialog-btn-danger { background: #C41E3A; color: #fff; }
</style>
