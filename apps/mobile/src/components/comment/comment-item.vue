<script setup lang="ts">
/**
 * 统一评论单条（《全平台体验标准 V1.0》第七节）
 * 结构：头像 64rpx + (昵称 26rpx/#666 + 作者金标 → 正文 30rpx/#1f1f1f/1.6 → 时间·回复) + 右侧点赞纵列。
 * 子回复：左缩进小头像 48rpx，>2 条折叠「— 展开 N 条回复」；长正文 6 行折叠「展开」。
 * 点赞状态/计数由父级（comment-list）统一乐观维护，本组件只 emit，不发请求。
 * 主题：默认浅色，theme="dark" 供短视频等深色场景（配色对齐 pkg-video/detail cs- 系列）。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { formatCommentTime, formatCount, type CommentItem } from '@/lib/comment-data'

interface Props {
  comment: CommentItem
  /** 内容作者 id：评论者命中时显示金色「作者」标签 */
  authorId?: string
  theme?: 'light' | 'dark'
}
const props = withDefaults(defineProps<Props>(), { authorId: '', theme: 'light' })

const emit = defineEmits<{
  (e: 'reply', payload: { target: CommentItem; rootId: string }): void
  (e: 'like', payload: { id: string; rootId: string }): void
}>()

const isDark = computed(() => props.theme === 'dark')

/* 长正文折叠：uni-app 无法可靠测量真实行数 → 按约 22 字/行 × 6 行的启发式判断是否需要「展开」，
 * 折叠本身用 -webkit-line-clamp: 6 保证视觉上恰好 6 行。 */
const LONG_THRESHOLD = 132
const contentExpanded = ref(false)
const isLong = computed(() => props.comment.content.length > LONG_THRESHOLD)

/* 子回复 >2 条折叠：默认露前 2 条 + 「— 展开 N 条回复」 */
const repliesExpanded = ref(false)
const visibleReplies = computed(() =>
  repliesExpanded.value ? props.comment.replies : props.comment.replies.slice(0, 2),
)
const foldedCount = computed(() => props.comment.replies.length - 2)

function isAuthor(userId: string): boolean {
  return !!props.authorId && userId === props.authorId
}

/* 主题化图标色（app-icon 需要显式 color） */
const likeIdleColor = computed(() => (isDark.value ? 'rgba(233,228,221,0.45)' : '#bbbbbb'))
const mutedIconColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.45)' : '#999999'))
const LIKE_ON = '#e63e31'
</script>

<template>
  <view class="ci" :class="{ 'ci--dark': isDark }">
    <view class="ci__row">
      <smart-avatar class="ci__avatar" :src="comment.user.avatar" :name="comment.user.nickname" />
      <view class="ci__main">
        <view class="ci__name-row">
          <text class="ci__name">{{ comment.user.nickname }}</text>
          <text v-if="isAuthor(comment.user.id)" class="ci__author-tag">作者</text>
          <text v-if="comment.isPinned" class="ci__pin-tag">置顶</text>
        </view>
        <text class="ci__content" :class="{ 'ci__content--clamp': isLong && !contentExpanded }">{{ comment.content }}</text>
        <text v-if="isLong" class="ci__content-toggle" @tap="contentExpanded = !contentExpanded">{{ contentExpanded ? '收起' : '展开' }}</text>
        <view class="ci__meta">
          <text class="ci__time">{{ formatCommentTime(comment.createdAt) }}</text>
          <text class="ci__reply-btn" @tap="emit('reply', { target: comment, rootId: comment.id })">回复</text>
        </view>

        <!-- 子回复（拍平一级·小头像缩进列） -->
        <view v-if="comment.replies.length" class="ci__replies">
          <view v-for="r in visibleReplies" :key="r.id" class="ci__row ci__row--sub">
            <smart-avatar class="ci__avatar ci__avatar--sub" :src="r.user.avatar" :name="r.user.nickname" />
            <view class="ci__main">
              <view class="ci__name-row">
                <text class="ci__name">{{ r.user.nickname }}</text>
                <text v-if="isAuthor(r.user.id)" class="ci__author-tag">作者</text>
              </view>
              <text class="ci__content ci__content--sub"><text v-if="r.replyToName" class="ci__reply-at">回复 @{{ r.replyToName }}：</text>{{ r.content }}</text>
              <view class="ci__meta">
                <text class="ci__time">{{ formatCommentTime(r.createdAt) }}</text>
                <text class="ci__reply-btn" @tap="emit('reply', { target: r, rootId: comment.id })">回复</text>
              </view>
            </view>
            <view class="ci__like" @tap="emit('like', { id: r.id, rootId: comment.id })">
              <view class="ci__like-ico" :class="{ 'ci__like-ico--on': r.isLiked }">
                <app-icon name="heart" :size="26" :color="r.isLiked ? LIKE_ON : likeIdleColor" :fill="r.isLiked" />
              </view>
              <text class="ci__like-num" :class="{ 'ci__like-num--on': r.isLiked }">{{ r.likeCount > 0 ? formatCount(r.likeCount) : '' }}</text>
            </view>
          </view>
          <view v-if="comment.replies.length > 2" class="ci__expand" @tap="repliesExpanded = !repliesExpanded">
            <view class="ci__expand-line" />
            <text class="ci__expand-txt">{{ repliesExpanded ? '收起' : `展开 ${foldedCount} 条回复` }}</text>
            <app-icon v-if="!repliesExpanded" name="chevron-down" :size="22" :color="mutedIconColor" />
          </view>
        </view>
      </view>

      <!-- 右侧点赞纵列（小红书式） -->
      <view class="ci__like" @tap="emit('like', { id: comment.id, rootId: comment.id })">
        <view class="ci__like-ico" :class="{ 'ci__like-ico--on': comment.isLiked }">
          <app-icon name="heart" :size="32" :color="comment.isLiked ? LIKE_ON : likeIdleColor" :fill="comment.isLiked" />
        </view>
        <text class="ci__like-num" :class="{ 'ci__like-num--on': comment.isLiked }">{{ comment.likeCount > 0 ? formatCount(comment.likeCount) : '' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.ci { padding: 20rpx 0; }
.ci__row { display: flex; gap: 20rpx; }
.ci__row--sub { padding: 14rpx 0 4rpx; }

.ci__avatar { width: 64rpx; height: 64rpx; border-radius: 999rpx; flex-shrink: 0; }
.ci__avatar--sub { width: 48rpx; height: 48rpx; }

.ci__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ci__name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.ci__name { font-size: 26rpx; color: #666666; }
.ci__author-tag {
  font-size: 18rpx; line-height: 1.4; color: #b8860b;
  border: 1rpx solid rgba(184, 134, 11, 0.45); background: rgba(212, 160, 23, 0.08);
  border-radius: 6rpx; padding: 2rpx 8rpx; flex-shrink: 0;
}
.ci__pin-tag {
  font-size: 18rpx; line-height: 1.4; color: #c41e3a;
  border: 1rpx solid rgba(196, 30, 58, 0.35); background: rgba(196, 30, 58, 0.06);
  border-radius: 6rpx; padding: 2rpx 8rpx; flex-shrink: 0;
}

.ci__content { font-size: 30rpx; line-height: 1.6; color: #1f1f1f; word-break: break-all; }
.ci__content--sub { font-size: 28rpx; }
.ci__content--clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  overflow: hidden;
}
.ci__content-toggle { font-size: 26rpx; color: #576b95; margin-top: 6rpx; padding: 8rpx 0; align-self: flex-start; }
.ci__reply-at { color: #576b95; }

.ci__meta { display: flex; align-items: center; gap: 32rpx; margin-top: 8rpx; }
.ci__time { font-size: 22rpx; color: #999999; }
/* 触控热区：负 margin 抵消 padding，不撑大版面（≥88rpx 目标） */
.ci__reply-btn { font-size: 22rpx; font-weight: 500; color: #999999; padding: 28rpx 24rpx; margin: -28rpx -24rpx; }

.ci__like {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  gap: 4rpx; flex-shrink: 0; min-width: 88rpx; min-height: 88rpx; padding: 4rpx 0 0 8rpx;
}
.ci__like-ico { transition: transform 0.15s; }
.ci__like-ico--on { animation: ci-heart-pop 0.32s cubic-bezier(0.17, 0.89, 0.32, 1.49); }
@keyframes ci-heart-pop {
  0% { transform: scale(0.6); }
  55% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.ci__like-num { font-size: 20rpx; color: #999999; min-height: 24rpx; }
.ci__like-num--on { color: #e63e31; }

.ci__replies { margin-top: 6rpx; }
.ci__expand { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 0 8rpx; }
.ci__expand-line { width: 48rpx; height: 1rpx; background: #d9d9d9; }
.ci__expand-txt { font-size: 22rpx; color: #999999; }

/* ───── 深色主题（配色对齐 pkg-video/detail cs- 系列） ───── */
.ci--dark .ci__name { color: rgba(233, 228, 221, 0.55); }
.ci--dark .ci__content { color: #e9e4dd; }
.ci--dark .ci__content-toggle { color: rgba(151, 178, 217, 0.9); }
.ci--dark .ci__reply-at { color: rgba(151, 178, 217, 0.9); }
.ci--dark .ci__time { color: rgba(233, 228, 221, 0.4); }
.ci--dark .ci__reply-btn { color: rgba(233, 228, 221, 0.55); }
.ci--dark .ci__like-num { color: rgba(233, 228, 221, 0.45); }
.ci--dark .ci__like-num--on { color: #e63e31; }
.ci--dark .ci__expand-line { background: rgba(255, 255, 255, 0.25); }
.ci--dark .ci__expand-txt { color: rgba(255, 255, 255, 0.45); }
.ci--dark .ci__author-tag { color: #e6c367; border-color: rgba(230, 195, 103, 0.5); background: rgba(230, 195, 103, 0.12); }
.ci--dark .ci__pin-tag { color: #ff8f9f; border-color: rgba(255, 143, 159, 0.4); background: rgba(196, 30, 58, 0.16); }
</style>
