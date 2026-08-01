<script setup lang="ts">
/** 帖子卡片（从原型 [id]/page.tsx 内 PostCard 1:1 迁移），用于首页/帖子/精华 Tab */
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { navigateTo } from '@/utils/router'
import type { CirclePost } from '@/lib/circle-detail-data'

const props = defineProps<{
  post: CirclePost
  circleId: string
  liked: boolean
  showEssence?: boolean
}>()
const emit = defineEmits<{ (e: 'like', id: string): void; (e: 'report', id: string): void }>()

function openPost() {
  navigateTo(`/pkg-circle/circles/post?circleId=${props.circleId}&id=${props.post.id}`)
}
function openUser() {
  navigateTo(`/pkg-circle/user/profile?id=${props.post.author.id}`)
}
</script>

<template>
  <view class="pc">
    <!-- 置顶/精华标签 -->
    <view v-if="post.isPinned || (showEssence && post.isEssence)" class="pc-tags">
      <view v-if="post.isPinned" class="pc-pin">
        <app-icon name="pin" :size="13" color="#C41E3A" />
        <text class="pc-pin-txt">置顶</text>
      </view>
      <text v-if="post.isEssence" class="pc-essence">精华</text>
    </view>

    <!-- 作者信息 -->
    <view class="pc-head">
      <view class="pc-author" @tap="openUser">
        <smart-avatar :src="post.author.avatar" :name="post.author.name" class="pc-avatar" />
        <view>
          <view class="pc-name-row">
            <text class="pc-name">{{ post.author.name }}</text>
            <text v-if="post.author.title" class="pc-title">{{ post.author.title }}</text>
          </view>
          <text class="pc-time">{{ post.createdAt }}</text>
        </view>
      </view>
      <!-- ··· 接举报（此前无 @tap 是死按钮）：emit 给父页走 pkg-report 统一入口 -->
      <view class="pc-more" @tap.stop="emit('report', post.id)"><app-icon name="more-horizontal" :size="20" color="#999999" /></view>
    </view>

    <!-- 内容 -->
    <view @tap="openPost">
      <text class="pc-content">{{ post.content }}</text>
      <view v-if="post.images && post.images.length" class="pc-imgs" :class="post.images.length === 1 ? 'one' : 'multi'">
        <image
          v-for="(img, idx) in post.images"
          :key="idx"
          :src="img"
          class="pc-img"
          :class="post.images.length === 1 ? 'single' : 'square'"
          mode="aspectFill"
          lazy-load
        />
      </view>
    </view>

    <!-- 操作栏（真机反馈：按钮太小不明显 → 图标 40rpx + 88rpx 点击热区 + 26rpx 文字） -->
    <view class="pc-actions">
      <view class="pc-act" @tap="emit('like', post.id)">
        <app-icon name="heart" :size="40" :color="liked ? '#C41E3A' : 'var(--text, #666666)'" :fill="liked" />
        <text class="pc-act-txt" :class="{ on: liked }">{{ post.likes }}</text>
      </view>
      <view class="pc-act" @tap="openPost">
        <app-icon name="message-circle" :size="40" color="var(--text, #666666)" />
        <text class="pc-act-txt">{{ post.comments }}</text>
      </view>
      <!-- bookmark 图标已删：点击行为=打开帖子（与评论按钮重复），误导用户以为流内可收藏；真收藏在帖子详情页 -->
    </view>

  </view>
</template>

<style scoped lang="scss">
.pc { background: var(--card, #fff); border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.pc-tags { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.pc-pin { display: flex; align-items: center; gap: 8rpx; }
.pc-pin-txt { font-size: 22rpx; color: var(--brand, var(--brand)); font-weight: 500; }
.pc-essence { font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(201,169,110,0.1); color: #C9A96E; border-radius: 6rpx; }
.pc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.pc-author { display: flex; align-items: center; gap: 16rpx; }
.pc-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: #f5f0e8; }
.pc-name-row { display: flex; align-items: center; gap: 8rpx; }
.pc-name { font-size: 26rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.pc-title { font-size: 20rpx; padding: 2rpx 12rpx; background: rgba(196,30,58,0.1); color: var(--brand, var(--brand)); border-radius: 6rpx; }
.pc-time { font-size: 22rpx; color: #999; }
.pc-more { padding: 4rpx; }
.pc-content { display: block; font-size: 28rpx; color: var(--text-ink, #2C2C2C); line-height: 1.7; margin-bottom: 24rpx; }
.pc-imgs { display: grid; gap: 16rpx; margin-bottom: 24rpx; }
.pc-imgs.one { grid-template-columns: 1fr; }
.pc-imgs.multi { grid-template-columns: 1fr 1fr; }
.pc-img { width: 100%; border-radius: 16rpx; }
.pc-img.single { max-height: 480rpx; }
.pc-img.square { aspect-ratio: 1; }
.pc-actions { display: flex; align-items: center; gap: 24rpx; padding-top: 8rpx; border-top: 2rpx solid #F5F0E8; margin-bottom: -16rpx; }
/* 88rpx 高点击热区（padding 撑开），图标+数字间距 12rpx */
.pc-act { display: flex; align-items: center; gap: 12rpx; min-height: 88rpx; padding: 0 20rpx; margin-left: -20rpx; }
.pc-act + .pc-act { margin-left: 0; }
.pc-act-txt { font-size: 26rpx; color: var(--text, #666666); }
.pc-act-txt.on { color: var(--brand, #C41E3A); font-weight: 500; }
</style>
