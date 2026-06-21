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
import { ref, computed } from 'vue'
import { navigateTo } from '@/utils/router'

const followingUsers = [
  { id: 1, name: '玄易大师', bio: '国学研究者，专注八字命理30年', isVerified: true },
  { id: 2, name: '子平先生', bio: '《渊海子平》研究专家，授课千余场', isVerified: true },
  { id: 3, name: '紫微学堂', bio: '紫微斗数教学，通俗易懂', isVerified: false },
  { id: 4, name: '风水堪舆师', bio: '环境风水咨询，阳宅布局', isVerified: true },
  { id: 5, name: '易学爱好者小王', bio: '学习中，欢迎交流', isVerified: false },
]
const followerUsers = [
  { id: 6, name: '命理学徒', bio: '正在学习八字命理', isVerified: false, isFollowing: false },
  { id: 7, name: '国学新手', bio: '对传统文化很感兴趣', isVerified: false, isFollowing: true },
  { id: 8, name: '道法自然', bio: '道家文化爱好者，修身养性', isVerified: true, isFollowing: false },
  { id: 9, name: '周易研习社', bio: '周易研究小组，共同进步', isVerified: false, isFollowing: false },
  { id: 10, name: '玄门弟子', bio: '跟随师父学习中', isVerified: false, isFollowing: true },
  { id: 11, name: '易经初学者', bio: '刚开始接触易经', isVerified: false, isFollowing: false },
]

const tab = ref<'following' | 'followers'>('following')
const keyword = ref('')
const state = ref<Record<number, boolean>>({})
followingUsers.forEach(u => { state.value[u.id] = true })
followerUsers.forEach(u => { state.value[u.id] = u.isFollowing })

const current = computed(() => tab.value === 'following' ? followingUsers : followerUsers)
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return current.value
  return current.value.filter(u => u.name.toLowerCase().includes(k) || u.bio.toLowerCase().includes(k))
})
function toggle(id: number) { state.value[id] = !state.value[id] }
function goUser(id: number) { navigateTo('/user/' + id) }
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.header { position: sticky; top: 0; z-index: 50; background: rgba(250,248,245,0.95); border-bottom: 2rpx solid #e8e3db; }
.tabs { display: flex; border-bottom: 2rpx solid #e8e3db; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; font-weight: 500; color: #8a8276; position: relative; }
.tab.on { color: #c41e3a; }
.tab-bar { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: #c41e3a; border-radius: 2rpx; }
.search-wrap { padding: 24rpx 32rpx; }
.search { display: flex; align-items: center; gap: 16rpx; height: 72rpx; padding: 0 24rpx; background: #f0ece4; border-radius: 999rpx; }
.search-input { flex: 1; font-size: 28rpx; color: #2c2c2c; }
.ph { color: #b5ad9f; }
.list { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; border-bottom: 2rpx solid #e8e3db; }
.row-main { display: flex; align-items: center; gap: 24rpx; flex: 1; min-width: 0; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(196,30,58,0.1); color: #c41e3a; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.info { flex: 1; min-width: 0; }
.name-line { display: flex; align-items: center; gap: 8rpx; }
.name { font-size: 28rpx; font-weight: 500; color: #2c2c2c; max-width: 320rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bio { display: block; font-size: 24rpx; color: #8a8276; margin-top: 4rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.follow-btn { display: flex; align-items: center; gap: 6rpx; height: 56rpx; padding: 0 28rpx; border-radius: 999rpx; background: #c41e3a; color: #fff; font-size: 24rpx; font-weight: 500; flex-shrink: 0; }
.follow-btn text { color: #fff; }
.follow-btn.following { background: transparent; border: 2rpx solid #e8e3db; color: #8a8276; }
.follow-btn.following text { color: #8a8276; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 64rpx; }
.empty-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: #f0ece4; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-text { font-size: 28rpx; color: #8a8276; text-align: center; }
</style>
