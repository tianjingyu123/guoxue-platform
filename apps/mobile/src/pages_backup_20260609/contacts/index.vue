<template>
  <view class="contacts-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">通讯录</text>
      </view>
      <view class="search-bar">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索用户昵称或ID" />
          <text v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="isSearching" class="contacts-content">
      <text class="result-count">
        {{ searchResults.length > 0 ? '找到 ' + searchResults.length + ' 个用户' : '未找到相关用户' }}
      </text>

      <view v-if="searchResults.length > 0" class="user-list">
        <view v-for="u in searchResults" :key="u.id" class="user-item">
          <view class="ui-avatar">{{ u.name[0] }}</view>
          <view class="ui-info">
            <view class="ui-name-row">
              <text class="ui-name">{{ u.name }}</text>
              <text v-if="u.isVerified" class="ui-badge">V</text>
            </view>
            <text class="ui-intro">{{ u.intro }}</text>
          </view>
          <view class="ui-msg-btn">💬</view>
        </view>
      </view>

      <view v-else class="no-result">
        <text class="nr-icon">🔍</text>
        <text class="nr-text">未找到相关用户</text>
        <text class="nr-sub">试试其他关键词</text>
        <view class="nr-discover">
          <text class="nrd-title">✨ 发现更多</text>
          <view v-for="u in recommendedUsers.slice(0, 3)" :key="u.id" class="nrd-user">
            <view class="nrd-avatar">{{ u.name[0] }}</view>
            <view class="nrd-info">
              <text class="nrd-name">{{ u.name }}</text>
              <text class="nrd-followers">{{ u.followers.toLocaleString() }} 粉丝</text>
            </view>
            <view class="nrd-follow-btn">关注</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 通讯录分组 -->
    <view v-else class="contacts-content">
      <view v-for="group in contactGroups" :key="group.id" class="group-card">
        <view class="group-header" @click="toggleGroup(group.id)">
          <view class="gh-icon" :class="group.bgClass">{{ group.icon }}</view>
          <view class="gh-info">
            <text class="gh-name">{{ group.name }}</text>
            <text class="gh-count">{{ totalMembers(group) }} 人</text>
          </view>
          <text class="gh-arrow" :class="{ open: expandedGroups.includes(group.id) }">›</text>
        </view>

        <view v-if="expandedGroups.includes(group.id)">
          <view v-for="(sub, idx) in group.subGroups" :key="sub.name">
            <view class="sub-header" @click="toggleSub(sub.name)">
              <text class="sh-name">{{ sub.name }}</text>
              <view class="sh-right">
                <text class="sh-count">{{ sub.members.length }} 人</text>
                <text class="sh-arrow" :class="{ open: expandedSubs.includes(sub.name) }">›</text>
              </view>
            </view>

            <view v-if="expandedSubs.includes(sub.name)" class="member-list">
              <view v-for="m in sub.members" :key="m.id" class="member-item">
                <view class="mi-avatar" :class="{ online: m.isOnline }">
                  <text>{{ m.name[0] }}</text>
                  <view v-if="m.isOnline" class="mi-dot" />
                </view>
                <view class="mi-info">
                  <view class="mi-name-row">
                    <text class="mi-name">{{ m.name }}</text>
                    <text v-if="m.isVerified" class="mi-badge">V</text>
                    <text v-if="m.role" class="mi-role">{{ m.role }}</text>
                  </view>
                  <text class="mi-intro">{{ m.intro }}</text>
                </view>
                <view class="mi-msg-btn">💬</view>
              </view>
            </view>

            <view v-if="idx < group.subGroups.length - 1" class="sub-divider" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const expandedGroups = ref<string[]>(['circle'])
const expandedSubs = ref<string[]>([])

const contactGroups = [
  {
    id: 'circle', name: '我的圈友', icon: '👥', bgClass: 'g-red',
    subGroups: [
      { name: '八字命理研习社', members: [
        { id: 1, name: '李明远', intro: '命理学爱好者，专注八字研究5年', isOnline: true },
        { id: 2, name: '王晓燕', intro: '紫微斗数从业者', isOnline: false },
        { id: 3, name: '张道长', intro: '道家文化传承人', isOnline: true, isVerified: true },
      ]},
      { name: '风水堪舆学院', members: [
        { id: 4, name: '陈风水', intro: '风水师，从业10年', isOnline: true, isVerified: true },
        { id: 5, name: '刘易经', intro: '易经研究者', isOnline: false },
      ]}
    ]
  },
  {
    id: 'student', name: '我的学员/老师', icon: '🎓', bgClass: 'g-gold',
    subGroups: [
      { name: '我的老师', members: [
        { id: 6, name: '周易大师', intro: '八字命理资深讲师', isOnline: true, isVerified: true, role: '讲师' },
      ]},
      { name: '我的学员', members: [
        { id: 7, name: '小明', intro: '八字入门学员', isOnline: false },
        { id: 8, name: '小红', intro: '紫微斗数学员', isOnline: true },
        { id: 9, name: '小华', intro: '风水基础学员', isOnline: false },
      ]}
    ]
  },
  {
    id: 'following', name: '我关注的', icon: '❤️', bgClass: 'g-rose',
    subGroups: [
      { name: '关注的用户', members: [
        { id: 10, name: '国学大咖', intro: '知名国学自媒体', isOnline: true, isVerified: true },
        { id: 11, name: '命理小王', intro: '八字命理科普博主', isOnline: false },
        { id: 12, name: '风水达人', intro: '风水布局专家', isOnline: true, isVerified: true },
      ]}
    ]
  }
]

const allUsers = [
  { id: 101, name: '张三丰', intro: '太极拳传承人，武当山道长', isOnline: true, isVerified: true },
  { id: 102, name: '李清照', intro: '诗词爱好者，古典文学研究', isOnline: false },
  { id: 103, name: '王阳明', intro: '心学研究者，国学讲师', isOnline: true, isVerified: true },
  { id: 104, name: '苏东坡', intro: '书法爱好者，美食评论家', isOnline: false },
  { id: 105, name: '诸葛亮', intro: '易经研究，奇门遁甲专家', isOnline: true, isVerified: true },
]

const recommendedUsers = [
  { id: 201, name: '周易大师', intro: '八字命理资深讲师，20年从业经验', followers: 12800, role: '讲师' },
  { id: 202, name: '张玄风', intro: '紫微斗数传承人，知名圈主', followers: 8560, role: '圈主' },
  { id: 203, name: '陈风水', intro: '风水堪舆专家，实战派代表', followers: 6280, role: '讲师' },
]

const isSearching = computed(() => searchQuery.value.trim().length > 0)

const searchResults = computed(() => {
  if (!isSearching.value) return []
  const q = searchQuery.value.toLowerCase()
  return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.intro.toLowerCase().includes(q))
})

function totalMembers(g: typeof contactGroups[0]) {
  return g.subGroups.reduce((sum, s) => sum + s.members.length, 0)
}

function toggleGroup(id: string) {
  const idx = expandedGroups.value.indexOf(id)
  if (idx >= 0) expandedGroups.value.splice(idx, 1)
  else expandedGroups.value.push(id)
}

function toggleSub(name: string) {
  const idx = expandedSubs.value.indexOf(name)
  if (idx >= 0) expandedSubs.value.splice(idx, 1)
  else expandedSubs.value.push(name)
}
</script>

<style scoped>
.contacts-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 60rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

.search-bar { padding: 0 24rpx 14rpx; }
.search-box { display: flex; align-items: center; height: 72rpx; background: #F0EDE5; border-radius: 36rpx; padding: 0 20rpx; }
.search-icon { font-size: 24rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.search-clear { font-size: 22rpx; color: #999; padding: 8rpx; }

.contacts-content { padding: 12rpx 24rpx; }

.result-count { font-size: 24rpx; color: #999; margin-bottom: 14rpx; display: block; }

.user-list { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.user-item { display: flex; align-items: center; gap: 14rpx; padding: 18rpx 20rpx; }
.user-item + .user-item { border-top: 1px solid #F5F1EB; }
.ui-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 500; color: #999; flex-shrink: 0; }
.ui-info { flex: 1; min-width: 0; }
.ui-name-row { display: flex; align-items: center; gap: 6rpx; }
.ui-name { font-size: 26rpx; font-weight: 500; color: #333; }
.ui-badge { font-size: 16rpx; color: #C9A96E; background: rgba(201,169,110,0.15); padding: 1rpx 6rpx; border-radius: 4rpx; }
.ui-intro { font-size: 22rpx; color: #999; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.ui-msg-btn { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; font-size: 24rpx; }

.no-result { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; }
.nr-icon { font-size: 80rpx; opacity: 0.3; margin-bottom: 16rpx; }
.nr-text { font-size: 28rpx; color: #999; margin-bottom: 4rpx; }
.nr-sub { font-size: 22rpx; color: #BBB; }

.nr-discover { width: 100%; margin-top: 40rpx; }
.nrd-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 14rpx; }
.nrd-user { display: flex; align-items: center; gap: 14rpx; background: #fff; border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 8rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.nrd-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 500; color: #999; flex-shrink: 0; }
.nrd-info { flex: 1; }
.nrd-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.nrd-followers { font-size: 20rpx; color: #BBB; margin-top: 2rpx; display: block; }
.nrd-follow-btn { padding: 8rpx 20rpx; border-radius: 24rpx; background: #C41E3A; color: #fff; font-size: 22rpx; }

.group-card { background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.group-header { display: flex; align-items: center; gap: 14rpx; padding: 20rpx 24rpx; }
.gh-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.g-red { background: rgba(196,30,58,0.06); }
.g-gold { background: rgba(201,169,110,0.1); }
.g-rose { background: rgba(233,30,99,0.06); }
.gh-info { flex: 1; }
.gh-name { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.gh-count { font-size: 22rpx; color: #999; margin-top: 2rpx; display: block; }
.gh-arrow { font-size: 28rpx; color: #BBB; transition: transform 0.2s; display: inline-block; }
.gh-arrow.open { transform: rotate(90deg); }

.sub-header { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 24rpx 16rpx 40rpx; background: #FAF8F5; }
.sh-name { font-size: 24rpx; color: #333; }
.sh-right { display: flex; align-items: center; gap: 8rpx; }
.sh-count { font-size: 20rpx; color: #999; }
.sh-arrow { font-size: 24rpx; color: #BBB; transition: transform 0.2s; display: inline-block; }
.sh-arrow.open { transform: rotate(90deg); }

.member-list { }
.member-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 24rpx 16rpx 54rpx; }
.member-item + .member-item { border-top: 1px solid #F5F1EB; }
.mi-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 500; color: #999; position: relative; flex-shrink: 0; }
.mi-avatar.online { }
.mi-dot { position: absolute; bottom: 0; right: 0; width: 18rpx; height: 18rpx; border-radius: 50%; background: #52C41A; border: 3rpx solid #fff; }
.mi-info { flex: 1; min-width: 0; }
.mi-name-row { display: flex; align-items: center; gap: 6rpx; }
.mi-name { font-size: 24rpx; font-weight: 500; color: #333; }
.mi-badge { font-size: 14rpx; color: #C9A96E; background: rgba(201,169,110,0.15); padding: 1rpx 6rpx; border-radius: 4rpx; }
.mi-role { font-size: 16rpx; color: #C41E3A; padding: 1rpx 8rpx; border: 1px solid rgba(196,30,58,0.2); border-radius: 4rpx; }
.mi-intro { font-size: 20rpx; color: #BBB; margin-top: 2rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.mi-msg-btn { width: 52rpx; height: 52rpx; border-radius: 50%; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; font-size: 22rpx; flex-shrink: 0; }

.sub-divider { height: 1px; background: #F5F1EB; }
</style>
