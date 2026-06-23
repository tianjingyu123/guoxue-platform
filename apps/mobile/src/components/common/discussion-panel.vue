<template>
  <view class="dp" :class="{ 'dp-inline': inline }">
    <!-- 头部 -->
    <view class="dp-head">
      <view class="dp-head-top">
        <view class="dp-head-title">
          <text class="dp-title">{{ config.title }}</text>
          <text class="dp-count">{{ total }} 条</text>
        </view>
        <view v-if="isReview && config.averageRating !== undefined" class="dp-avg">
          <view class="dp-stars">
            <app-icon
              v-for="i in 5"
              :key="i"
              name="star"
              :size="28"
              :color="i <= Math.round(config.averageRating) ? '#c9a96e' : '#d8d2c8'"
              :fill="i <= Math.round(config.averageRating)"
            />
          </view>
          <text class="dp-avg-num">{{ config.averageRating.toFixed(1) }}</text>
        </view>
      </view>
      <view class="dp-sorts">
        <view
          v-for="s in (['hot', 'new'] as const)"
          :key="s"
          class="dp-sort"
          :class="{ 'dp-sort-on': sort === s }"
          :style="sort === s ? { background: accent } : undefined"
          @tap="sort = s"
        >
          {{ s === 'hot' ? '最热' : '最新' }}
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view scroll-y class="dp-list">
      <view v-if="sorted.length === 0" class="dp-empty">还没有讨论，来说两句吧～</view>
      <view v-for="c in sorted" :key="c.id" class="dp-item">
        <!-- 头像 -->
        <image v-if="c.author.avatar" :src="c.author.avatar" class="dp-avatar" mode="aspectFill" />
        <view v-else class="dp-avatar dp-avatar-letter" :style="{ background: avatarColor(c.author.name) }">
          {{ c.author.name.charAt(0) }}
        </view>

        <view class="dp-body">
          <!-- 作者行 -->
          <view class="dp-author-row">
            <text class="dp-author">{{ c.author.name }}</text>
            <view v-if="badgeInfo(c.author.badge)" class="dp-badge" :style="{ background: accent }">
              <app-icon :name="badgeInfo(c.author.badge)!.icon" :size="22" color="#ffffff" />
              <text class="dp-badge-text">{{ badgeInfo(c.author.badge)!.label }}</text>
            </view>
            <view v-if="c.featured" class="dp-featured" :style="{ background: accent + '1a', color: accent }">
              <app-icon name="pin" :size="22" :color="accent" />
              <text class="dp-featured-text" :style="{ color: accent }">精选</text>
            </view>
            <view v-if="isReview && c.rating !== undefined" class="dp-stars">
              <app-icon
                v-for="i in 5"
                :key="i"
                name="star"
                :size="24"
                :color="i <= c.rating ? '#c9a96e' : '#d8d2c8'"
                :fill="i <= c.rating"
              />
            </view>
          </view>

          <!-- 划线引用 -->
          <view v-if="c.quote" class="dp-quote" :style="{ borderLeftColor: accent }">
            <app-icon name="quote" :size="24" :color="accent" class="dp-quote-icon" />
            <view class="dp-quote-body">
              <text class="dp-quote-text">{{ c.quote.text }}</text>
              <text v-if="c.quote.source" class="dp-quote-source" :style="{ color: accent }">— {{ c.quote.source }}</text>
            </view>
          </view>

          <!-- 正文 -->
          <text class="dp-content">{{ c.content }}</text>

          <!-- 操作行 -->
          <view class="dp-actions">
            <text class="dp-time">{{ c.time }}</text>
            <view class="dp-act" @tap="handleReply(c.id, c.author.name)">
              <app-icon name="message-circle" :size="26" color="#999999" />
              <text class="dp-act-text">回复</text>
            </view>
            <view class="dp-act dp-act-like" @tap="toggleLike(c.id)">
              <app-icon name="heart" :size="26" :color="c.liked ? accent : '#999999'" :fill="c.liked" />
              <text v-if="c.likeCount > 0" class="dp-act-text" :style="c.liked ? { color: accent } : undefined">{{ c.likeCount }}</text>
            </view>
          </view>

          <!-- 楼中楼 -->
          <view v-if="c.replies.length > 0" class="dp-replies-wrap">
            <view v-if="!openReplies.has(c.id)" class="dp-expand" :style="{ color: accent }" @tap="toggleReplies(c.id)">
              <app-icon name="corner-down-right" :size="26" :color="accent" />
              <text class="dp-expand-text" :style="{ color: accent }">展开 {{ c.replyCount ?? c.replies.length }} 条回复</text>
            </view>
            <view v-else class="dp-replies">
              <view v-for="r in c.replies" :key="r.id" class="dp-reply">
                <image v-if="r.author.avatar" :src="r.author.avatar" class="dp-reply-avatar" mode="aspectFill" />
                <view v-else class="dp-reply-avatar dp-avatar-letter" :style="{ background: avatarColor(r.author.name) }">
                  {{ r.author.name.charAt(0) }}
                </view>
                <view class="dp-reply-body">
                  <text class="dp-reply-author">{{ r.author.name }}</text>
                  <text v-if="r.replyToName" class="dp-reply-to"> 回复 @{{ r.replyToName }}</text>
                  <text class="dp-reply-content">{{ r.content }}</text>
                  <text class="dp-reply-time">{{ r.time }}</text>
                </view>
              </view>
              <view class="dp-collapse" @tap="toggleReplies(c.id)">收起回复</view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 输入栏 -->
    <view class="dp-input-bar">
      <!-- 评价模式选星 -->
      <view v-if="isReview && !replyTo" class="dp-rating-pick">
        <text class="dp-rating-label">评分</text>
        <view v-for="i in 5" :key="i" @tap="rating = i">
          <app-icon name="star" :size="40" :color="i <= rating ? '#c9a96e' : '#d8d2c8'" :fill="i <= rating" />
        </view>
      </view>
      <view v-if="replyTo" class="dp-reply-hint">
        <text>回复 @{{ replyTo.name }}</text>
        <text class="dp-reply-cancel" @tap="replyTo = null">取消</text>
      </view>
      <view class="dp-input-row">
        <input
          v-model="input"
          class="dp-input"
          :placeholder="replyTo ? `回复 @${replyTo.name}` : (config.placeholder || '各抒己见，友善交流…')"
          confirm-type="send"
          @confirm="submit"
        />
        <ai-assist-popover
          v-if="enableAIAssist && !replyTo"
          scene="comment"
          :text="input"
          @apply="(v: string) => (input = v)"
        />
        <view class="dp-send" :class="{ 'dp-send-off': !input.trim() }" :style="{ background: accent }" @tap="submit">
          <app-icon name="send" :size="32" color="#ffffff" />
        </view>
      </view>
    </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AiAssistPopover from '@/components/common/ai-assist-popover.vue'
import type {
  AuthorBadge,
  DiscussionConfig,
  DiscussionItem,
} from '@/lib/discussion-types'

const props = withDefaults(
  defineProps<{
    config: DiscussionConfig
    items: DiscussionItem[]
    inline?: boolean
    enableAIAssist?: boolean
  }>(),
  { inline: true, enableAIAssist: false },
)

const accent = computed(() => props.config.accentColor || '#c41e3a')
const isReview = computed(() => props.config.mode === 'review')

const data = ref<DiscussionItem[]>(props.items.map((it) => ({ ...it })))
const sort = ref<'hot' | 'new'>('hot')
const input = ref('')
const rating = ref(5)
const replyTo = ref<{ id: string | number; name: string } | null>(null)
const openReplies = ref<Set<string | number>>(new Set())

const sorted = computed(() => {
  const featured = data.value.filter((d) => d.featured)
  const rest = data.value.filter((d) => !d.featured)
  rest.sort((a, b) => (sort.value === 'hot' ? b.likeCount - a.likeCount : 0))
  if (sort.value === 'new') rest.reverse()
  return [...featured, ...rest]
})

const total = computed(() => data.value.reduce((n, c) => n + 1 + c.replies.length, 0))

const AVATAR_COLORS = ['#a06a38', '#2e5a88', '#3e7a52', '#c41e3a', '#8a6d2f', '#6b4a7a']
function avatarColor(name: string) {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

const BADGE_MAP: Record<Exclude<AuthorBadge, 'none'>, { icon: string; label: string }> = {
  teacher: { icon: 'graduation-cap', label: '讲师' },
  official: { icon: 'badge-check', label: '官方' },
  master: { icon: 'crown', label: '名家' },
  vip: { icon: 'crown', label: '会员' },
}
function badgeInfo(badge?: AuthorBadge) {
  if (!badge || badge === 'none') return null
  return BADGE_MAP[badge]
}

function toggleLike(id: string | number) {
  data.value = data.value.map((c) =>
    c.id === id ? { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 } : c,
  )
}

function toggleReplies(id: string | number) {
  const next = new Set(openReplies.value)
  next.has(id) ? next.delete(id) : next.add(id)
  openReplies.value = next
}

function handleReply(id: string | number, name: string) {
  replyTo.value = { id, name }
}

function submit() {
  const text = input.value.trim()
  if (!text) return
  const me = { id: 'me', name: '我' }
  if (replyTo.value) {
    const target = replyTo.value
    data.value = data.value.map((c) =>
      c.id === target.id
        ? {
            ...c,
            replies: [
              ...c.replies,
              { id: `r${Date.now()}`, author: me, content: text, time: '刚刚', likeCount: 0, replyToName: target.name },
            ],
          }
        : c,
    )
    const next = new Set(openReplies.value)
    next.add(target.id)
    openReplies.value = next
  } else {
    data.value = [
      {
        id: `c${Date.now()}`,
        author: me,
        content: text,
        time: '刚刚',
        likeCount: 0,
        replies: [],
        ...(isReview.value ? { rating: rating.value } : {}),
      },
      ...data.value,
    ]
  }
  input.value = ''
  replyTo.value = null
}
</script>

<style scoped>
.dp {
  display: flex;
  flex-direction: column;
  background: var(--card);
}
.dp-inline {
  height: 100%;
  min-height: 0;
}
.dp-head {
  flex-shrink: 0;
  border-bottom: 2rpx solid var(--border);
  padding: 24rpx 32rpx;
}
.dp-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dp-head-title {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}
.dp-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--foreground);
}
.dp-count {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.dp-avg {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.dp-stars {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
}
.dp-avg-num {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--foreground);
}
.dp-sorts {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.dp-sort {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  background: var(--muted);
  color: var(--muted-foreground);
}
.dp-sort-on {
  color: #ffffff;
}
.dp-list {
  flex: 1;
  min-height: 0;
  padding: 32rpx;
}
.dp-empty {
  padding: 96rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: var(--muted-foreground);
}
.dp-item {
  display: flex;
  gap: 24rpx;
  margin-bottom: 40rpx;
}
.dp-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.dp-avatar-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 500;
  font-size: 30rpx;
}
.dp-body {
  flex: 1;
  min-width: 0;
}
.dp-author-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16rpx;
}
.dp-author {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--foreground);
}
.dp-badge {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
  border-radius: 8rpx;
  padding: 2rpx 12rpx;
}
.dp-badge-text {
  font-size: 20rpx;
  font-weight: 500;
  color: #ffffff;
}
.dp-featured {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
  border-radius: 8rpx;
  padding: 2rpx 12rpx;
}
.dp-featured-text {
  font-size: 20rpx;
  font-weight: 500;
}
.dp-quote {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
  border-radius: 16rpx;
  padding: 12rpx 20rpx;
  background: var(--muted);
  border-left: 4rpx solid;
}
.dp-quote-icon {
  margin-top: 4rpx;
  flex-shrink: 0;
}
.dp-quote-body {
  min-width: 0;
}
.dp-quote-text {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.dp-quote-source {
  display: block;
  font-size: 22rpx;
  font-weight: 500;
}
.dp-content {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--foreground);
}
.dp-actions {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 12rpx;
}
.dp-time {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.dp-act {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.dp-act-text {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.dp-act-like {
  margin-left: auto;
}
.dp-replies-wrap {
  margin-top: 16rpx;
}
.dp-expand {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.dp-expand-text {
  font-size: 24rpx;
}
.dp-replies {
  margin-top: 8rpx;
  border-left: 4rpx solid var(--border);
  padding-left: 24rpx;
}
.dp-reply {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.dp-reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  font-size: 22rpx;
}
.dp-reply-body {
  flex: 1;
  min-width: 0;
}
.dp-reply-author {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--foreground);
}
.dp-reply-to {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.dp-reply-content {
  display: block;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--foreground);
}
.dp-reply-time {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.dp-collapse {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.dp-input-bar {
  flex-shrink: 0;
  border-top: 2rpx solid var(--border);
  background: var(--card);
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.dp-rating-pick {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.dp-rating-label {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.dp-reply-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.dp-reply-cancel {
  color: var(--muted-foreground);
}
.dp-input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.dp-input {
  height: 80rpx;
  flex: 1;
  border-radius: 999rpx;
  background: var(--muted);
  padding: 0 32rpx;
  font-size: 28rpx;
  color: var(--foreground);
}
.dp-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.dp-send-off {
  opacity: 0.4;
}
</style>
