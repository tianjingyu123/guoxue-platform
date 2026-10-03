<template>
  <view class="page">
    <!-- 顶部导航 + Tab + 搜索 -->
    <view class="header">
      <app-nav-bar title="社交关系" :back-icon="'arrow-left'" :back-size="40" :title-size="32" :title-weight="600" :bar-height="112" />
      <view class="tabs">
        <view class="tab" :class="{ on: tab === 'following' }" @tap="tab = 'following'">
          关注 {{ followingUsers.length }}
          <view v-if="tab === 'following'" class="tab-bar" />
        </view>
        <view class="tab" :class="{ on: tab === 'followers' }" @tap="tab = 'followers'">
          粉丝 {{ followerUsers.length }}
          <view v-if="tab === 'followers'" class="tab-bar" />
        </view>
      </view>
      <view class="search-wrap">
        <view class="search">
          <app-icon name="search" :size="32" color="#b5ad9f" />
          <input class="search-input" v-model="keyword" placeholder="搜索用户" placeholder-class="ph" />
        </view>
      </view>
    </view>

    <!-- 用户列表 -->
    <view class="list" v-if="filtered.length">
      <view class="row" v-for="u in filtered" :key="u.id">
        <view class="row-main" @tap="goUser(u.id)">
          <view class="avatar">{{ u.name[0] }}</view>
          <view class="info">
            <view class="name-line">
              <text class="name">{{ u.name }}</text>
              <app-icon v-if="u.isVerified" name="badge-check" :size="28" color="#C9A96E" />
            </view>
            <text class="bio">{{ u.bio }}</text>
          </view>
        </view>
        <view class="follow-btn" :class="{ following: state[u.id] }" @tap="toggle(u.id)">
          <app-icon :name="state[u.id] ? 'user-minus' : 'user-plus'" :size="26" :color="state[u.id] ? '#8a8276' : '#fff'" />
          <text>{{ state[u.id] ? '已关注' : (tab === 'followers' ? '回关' : '关注') }}</text>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view class="empty" v-else>
      <view class="empty-icon">
        <app-icon name="users" :size="80" color="#d8d2c6" />
      </view>
      <text class="empty-text">{{ keyword ? '没有找到相关用户' : (tab === 'following' ? '还没有关注任何人' : '还没有粉丝') }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'

// 展示用结构（后端仅返回 id/nickname/avatar，无 bio/认证字段，故 bio 用关系提示、isVerified 恒 false）
interface DisplayUser { id: string; name: string; bio: string; isVerified: boolean }

const followingUsers = ref<DisplayUser[]>([])
const followerUsers = ref<DisplayUser[]>([])
const tab = ref<'following' | 'followers'>('following')
const keyword = ref('')
const loading = ref(false)
const state = ref<Record<string, boolean>>({})
const submittingId = ref<string | null>(null)

// 真连：GET /users/:id/following + /users/:id/followers（复用 mineApi.getFollowData 的交叉互关计算）
async function fetchData() {
  loading.value = true
  try {
    const res = await mineApi.getFollowData()
    followingUsers.value = res.following.map((u) => ({
      id: u.id, name: u.name || '用户',
      bio: u.isFollowedBy ? '互相关注' : '', isVerified: false,
    }))
    followerUsers.value = res.followers.map((u) => ({
      id: u.id, name: u.name || '用户',
      bio: u.isFollowing ? '互相关注' : '关注了你', isVerified: false,
    }))
    const s: Record<string, boolean> = {}
    res.following.forEach((u) => { s[u.id] = true })
    res.followers.forEach((u) => { s[u.id] = u.isFollowing })
    state.value = s
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
onMounted(fetchData)

const current = computed(() => tab.value === 'following' ? followingUsers.value : followerUsers.value)
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return current.value
  return current.value.filter(u => u.name.toLowerCase().includes(k) || u.bio.toLowerCase().includes(k))
})

async function toggle(id: string) {
  if (submittingId.value) return
  submittingId.value = id
  const next = !state.value[id]
  try {
    if (next) await mineApi.followUser(id)
    else await mineApi.unfollowUser(id)
    state.value[id] = next
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    submittingId.value = null
  }
}
function goUser(id: string) { navigateTo('/user/' + id) }
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.header { position: sticky; top: 0; z-index: 50; background: rgba(250,248,245,0.95); border-bottom: 2rpx solid #e8e3db; }
.tabs { display: flex; border-bottom: 2rpx solid #e8e3db; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; font-weight: 500; color: #8a8276; position: relative; }
.tab.on { color: var(--brand); }
.tab-bar { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: var(--brand); border-radius: 2rpx; }
.search-wrap { padding: 24rpx 32rpx; }
.search { display: flex; align-items: center; gap: 16rpx; height: 72rpx; padding: 0 24rpx; background: #f0ece4; border-radius: 999rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #2c2c2c; }
.ph { color: #b5ad9f; }
.list { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; border-bottom: 2rpx solid #e8e3db; }
.row-main { display: flex; align-items: center; gap: 24rpx; flex: 1; min-width: 0; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(196,30,58,0.1); color: var(--brand); display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.info { flex: 1; min-width: 0; }
.name-line { display: flex; align-items: center; gap: 8rpx; }
.name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; max-width: 320rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bio { display: block; font-size: 24rpx; color: #8a8276; margin-top: 4rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.follow-btn { display: flex; align-items: center; gap: 6rpx; height: 56rpx; padding: 0 28rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 24rpx; font-weight: 500; flex-shrink: 0; }
.follow-btn text { color: #fff; }
.follow-btn.following { background: transparent; border: 2rpx solid #e8e3db; color: #8a8276; }
.follow-btn.following text { color: #8a8276; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 64rpx; }
.empty-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: #f0ece4; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-text { font-size: 28rpx; color: #8a8276; text-align: center; }
</style>
