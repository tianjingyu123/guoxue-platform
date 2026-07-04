<script setup lang="ts">
/**
 * 帖子详情页（从原型 app/circles/[id]/posts/[postId]/page.tsx 1:1 高保真迁移）
 * 结构：导航 + 标签 + 标题 + 作者(关注) + 元信息 + 音频播放器 + Markdown正文 + 图片 +
 *       打赏区 + 互动数据栏 + 评论区(含子评论展开) + 底部评论输入 + 打赏弹窗 + 图片预览
 * 音频播放经 uni.createInnerAudioContext 跨端适配（替代原型 setInterval 模拟）。
 */
import { ref, reactive, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import TouchpointCard from '@/components/common/touchpoint-card.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  postDetailApi, parseMarkdown,
  REWARD_QUICK, REWARD_ALL,
  type PostDetail, type Comment, type MdBlock,
} from '@/lib/post-detail-data'
import { touchpointApi, type TouchpointResult } from '@/lib/touchpoint-data'

const circleId = ref('')
const postId = ref('')
const post = ref<PostDetail | null>(null)
const mdBlocks = ref<MdBlock[]>([])
const loading = ref(true)
const error = ref('')

// 互动状态
const isLiked = ref(false)
const isCollected = ref(false)
const likes = ref(0)
const collects = ref(0)
const isFollowed = ref(false)

// 评论
const comments = ref<Comment[]>([])
const expandedReplies = reactive<Record<string, boolean>>({})
const commentText = ref('')
const replyTo = ref<Comment | null>(null)
const commentSort = ref<'hot' | 'new'>('hot')

// 互动防重复（进行中直接 return，避免快点连发）
const likeActing = ref(false)
const collectActing = ref(false)
const followActing = ref(false)
const commentSubmitting = ref(false)
const commentLikeActing = reactive<Record<string, boolean>>({})

// 弹窗
const showRewardModal = ref(false)
const previewImage = ref<string | null>(null)

onLoad((q) => {
  if (q?.circleId) circleId.value = q.circleId
  if (q?.id) postId.value = q.id
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const p = await postDetailApi.getDetail(circleId.value, postId.value)
    post.value = p
    mdBlocks.value = parseMarkdown(p.content)
    isLiked.value = p.isLiked
    // 收藏：后端无单帖收藏态查询端点 → 保持初始 false，靠乐观更新维护本次会话内状态
    isCollected.value = p.isCollected
    likes.value = p.likes
    collects.value = p.collects
    isFollowed.value = p.author.isFollowed ?? false
    comments.value = await postDetailApi.getComments(postId.value)
    // 详情不返回当前用户点赞态 → 单独查询补上 isLiked（失败保持 false，不阻断页面）
    isLiked.value = await postDetailApi.checkPostLiked(postId.value)
    // 触点 #6 圈主的课（不 await·失败静默不出，绝不阻塞正文）
    loadTouchpoint(p)
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}
function retry() { loadData() }

// 触点 #6 圈子课程（服务端按 circleId→圈主→APPROVED 课召回·show:false 或异常一律不渲染）
const tp = ref<TouchpointResult | null>(null)
async function loadTouchpoint(p: PostDetail) {
  tp.value = await touchpointApi.get('circle_course', {
    circleId: circleId.value,
    postAuthorId: p.author.id,
  })
}

// ─── 音频播放器（跨端；后端暂无音频，逻辑保留兼容将来） ───
const isPlaying = ref(false)
const currentTime = ref(0)
let audioCtx: any = null // uni InnerAudioContext 类型，保守保留 any
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
function toggleAudio() {
  const audio = post.value?.audio
  if (!audio) return
  if (!audioCtx) {
    audioCtx = uni.createInnerAudioContext()
    audioCtx.src = audio.url
    audioCtx.onTimeUpdate(() => { currentTime.value = Math.floor(audioCtx.currentTime) })
    audioCtx.onEnded(() => { isPlaying.value = false; currentTime.value = 0 })
    audioCtx.onError(() => { isPlaying.value = false; uni.showToast({ title: '音频加载失败', icon: 'none' }) })
  }
  if (isPlaying.value) { audioCtx.pause(); isPlaying.value = false }
  else { audioCtx.play(); isPlaying.value = true }
}
const audioProgress = () => post.value?.audio ? Math.min(100, (currentTime.value / post.value.audio.duration) * 100) : 0

// ─── 互动（乐观更新 + 失败回滚 + 防重复）───

// 帖子点赞
async function toggleLike() {
  if (likeActing.value) return
  likeActing.value = true
  const prevLiked = isLiked.value
  const prevLikes = likes.value
  // 乐观更新
  isLiked.value = !prevLiked
  likes.value = prevLikes + (isLiked.value ? 1 : -1)
  try {
    await postDetailApi.toggleLike(postId.value)
  } catch {
    // 回滚
    isLiked.value = prevLiked
    likes.value = prevLikes
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    likeActing.value = false
  }
}

// 帖子收藏
async function toggleCollect() {
  if (collectActing.value) return
  collectActing.value = true
  const prevCollected = isCollected.value
  const prevCollects = collects.value
  isCollected.value = !prevCollected
  collects.value = prevCollects + (isCollected.value ? 1 : -1)
  try {
    await postDetailApi.toggleCollect(postId.value)
  } catch {
    isCollected.value = prevCollected
    collects.value = prevCollects
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    collectActing.value = false
  }
}

// 关注作者
async function toggleFollow() {
  if (followActing.value) return
  const authorId = post.value?.author.id
  if (!authorId) return
  followActing.value = true
  const prev = isFollowed.value
  isFollowed.value = !prev
  try {
    await postDetailApi.toggleFollow(authorId)
  } catch {
    isFollowed.value = prev
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    followActing.value = false
  }
}

// 评论点赞
async function toggleCommentLike(c: Comment) {
  if (commentLikeActing[c.id]) return
  commentLikeActing[c.id] = true
  const prevLiked = c.isLiked
  const prevLikes = c.likes
  c.isLiked = !prevLiked
  c.likes = prevLikes + (c.isLiked ? 1 : -1)
  try {
    await postDetailApi.toggleCommentLike(c.id)
  } catch {
    c.isLiked = prevLiked
    c.likes = prevLikes
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    commentLikeActing[c.id] = false
  }
}

function startReply(c: Comment) {
  replyTo.value = c
}

// 发评论/回复（防重复 + 真调后端 + 成功后重载评论列表）
async function submitComment() {
  if (commentSubmitting.value) return
  const content = commentText.value.trim()
  if (!content) return
  commentSubmitting.value = true
  try {
    await postDetailApi.createComment(postId.value, content, replyTo.value?.id)
    // 成功：清空输入 + 重载评论拿真实新评论 + 同步评论计数
    commentText.value = ''
    replyTo.value = null
    comments.value = await postDetailApi.getComments(postId.value)
    if (post.value) post.value.comments = comments.value.length
    uni.showToast({ title: '评论已发送', icon: 'success' })
  } catch {
    // 失败：不清空输入，便于重发
    uni.showToast({ title: '发送失败，请重试', icon: 'none' })
  } finally {
    commentSubmitting.value = false
  }
}

function openShare() { navigateTo(`/pkg-circle/common/share-poster?type=post&targetId=${postId.value}`) }
function openUser(id: string) { navigateTo(`/pkg-circle/user/profile?id=${id}`) }
function openCircle() { navigateTo(`/pkg-circle/circles/detail?id=${circleId.value}`) }
function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : String(n) }

onUnmounted(() => { if (audioCtx) { try { audioCtx.destroy() } catch {} } })
</script>

<template>
  <view class="pd">
    <!-- 顶部导航 -->
    <view class="pd-hdr">
      <view class="pd-hdr-btn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <view class="pd-hdr-circle" @tap="openCircle"><text class="pd-hdr-name">{{ post?.circleName || '帖子' }}</text></view>
      <view class="pd-hdr-btn" @tap="toastComingSoon"><app-icon name="more-horizontal" :size="40" color="#666666" /></view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading && !post" class="pd-state">
      <text class="pd-state-t">加载中…</text>
    </view>
    <!-- 错误态 -->
    <view v-else-if="error && !post" class="pd-state">
      <text class="pd-state-t">{{ error }}</text>
      <view class="pd-state-retry" @tap="retry"><text class="pd-state-retry-t">重试</text></view>
    </view>

    <scroll-view v-else-if="post" scroll-y class="pd-body">
      <!-- 文章 -->
      <view class="pd-article">
        <!-- 标签 -->
        <view class="pd-tags">
          <view v-if="post.isPinned" class="pd-tag pin"><app-icon name="pin" :size="22" color="#C41E3A" /><text class="pd-tag-t" style="color:#C41E3A">置顶</text></view>
          <view v-if="post.isEssence" class="pd-tag ess"><app-icon name="star" :size="22" color="#C9A96E" /><text class="pd-tag-t" style="color:#C9A96E">精华</text></view>
          <view v-if="post.type === 'article'" class="pd-tag art"><app-icon name="file-text" :size="22" color="#1890FF" /><text class="pd-tag-t" style="color:#1890FF">长文</text></view>
        </view>

        <!-- 标题 -->
        <text class="pd-title">{{ post.title }}</text>

        <!-- 作者 -->
        <view class="pd-author-row">
          <view class="pd-author" @tap="openUser(post.author.id)">
            <view class="pd-avatar-wrap">
              <image lazy-load :src="post.author.avatar" class="pd-avatar" mode="aspectFill" />
              <view v-if="post.author.level" class="pd-level">{{ post.author.level }}</view>
            </view>
            <view class="pd-author-info">
              <view class="pd-author-name-row">
                <text class="pd-author-name">{{ post.author.name }}</text>
                <text v-if="post.author.title" class="pd-author-title">{{ post.author.title }}</text>
              </view>
              <view v-if="post.author.followers != null || post.author.posts != null" class="pd-author-meta">
                <text v-if="post.author.followers != null" class="pd-author-stat">{{ post.author.followers }}粉丝</text>
                <text v-if="post.author.followers != null && post.author.posts != null" class="pd-author-dot">·</text>
                <text v-if="post.author.posts != null" class="pd-author-stat">{{ post.author.posts }}篇文章</text>
              </view>
            </view>
          </view>
          <view v-if="post.author.followers != null" class="pd-follow" :class="{ on: isFollowed }" @tap="toggleFollow">
            <text class="pd-follow-t" :class="{ on: isFollowed }">{{ isFollowed ? '已关注' : '关注' }}</text>
          </view>
        </view>

        <!-- 元信息（阅读量/读完时间后端无 → 隐藏，仅留发布时间） -->
        <view class="pd-meta">
          <view class="pd-meta-item"><app-icon name="clock" :size="24" color="#999999" /><text class="pd-meta-t">{{ post.createdAt }}</text></view>
          <view v-if="post.views" class="pd-meta-item"><app-icon name="eye" :size="24" color="#999999" /><text class="pd-meta-t">{{ post.views }}阅读</text></view>
          <view v-if="post.readTime" class="pd-meta-item"><app-icon name="clock" :size="24" color="#999999" /><text class="pd-meta-t">约{{ post.readTime }}分钟</text></view>
        </view>

        <!-- 音频播放器 -->
        <view v-if="post.audio" class="pd-audio">
          <view class="pd-audio-top">
            <view class="pd-audio-play" @tap="toggleAudio">
              <app-icon :name="isPlaying ? 'pause' : 'play'" :size="32" color="#ffffff" />
            </view>
            <view class="pd-audio-main">
              <view class="pd-audio-title-row">
                <app-icon name="volume-2" :size="22" color="rgba(255,255,255,0.7)" />
                <text class="pd-audio-title">{{ post.audio.title }}</text>
              </view>
              <view class="pd-audio-prog-row">
                <text class="pd-audio-time">{{ fmtDuration(currentTime) }}</text>
                <view class="pd-audio-bar"><view class="pd-audio-bar-fill" :style="{ width: audioProgress() + '%' }" /></view>
                <text class="pd-audio-time">{{ fmtDuration(post.audio.duration) }}</text>
              </view>
            </view>
          </view>
          <view class="pd-audio-bottom">
            <text class="pd-audio-tip">边听边看，学习更高效</text>
            <view class="pd-audio-rate">
              <text class="pd-rate">0.75x</text>
              <text class="pd-rate on">1.0x</text>
              <text class="pd-rate">1.5x</text>
            </view>
          </view>
        </view>

        <!-- Markdown 正文 -->
        <view class="pd-content">
          <template v-for="(b, i) in mdBlocks" :key="i">
            <text v-if="b.type === 'h2'" class="md-h2">{{ b.text }}</text>
            <text v-else-if="b.type === 'bold'" class="md-bold">{{ b.text }}</text>
            <view v-else-if="b.type === 'quote'" class="md-quote"><text class="md-quote-t">{{ b.text }}</text></view>
            <view v-else-if="b.type === 'li'" class="md-li"><text class="md-dot">•</text><text class="md-li-t">{{ b.text }}</text></view>
            <view v-else-if="b.type === 'oli'" class="md-li"><text class="md-li-t">{{ b.text }}</text></view>
            <view v-else-if="b.type === 'hr'" class="md-hr" />
            <text v-else-if="b.type === 'em'" class="md-em">{{ b.text }}</text>
            <text v-else class="md-p"><text v-for="(seg, j) in b.segments" :key="j" :class="{ 'md-inline-bold': seg.bold }">{{ seg.text }}</text></text>
          </template>
        </view>

        <!-- 图片 -->
        <view v-if="post.images && post.images.length" class="pd-images">
          <view v-for="(img, i) in post.images" :key="i" class="pd-img-cell">
            <image lazy-load :src="img.url" class="pd-img" mode="widthFix" @tap="previewImage = img.url" />
            <view v-if="img.caption" class="pd-img-cap"><text class="pd-img-cap-t">{{ img.caption }}</text></view>
          </view>
        </view>

        <!-- 触点 #6 圈主的课：正文尾·服务端裁决无卡则不渲染（一页一触点·帖质量分门槛留服务端后续加） -->
        <touchpoint-card v-if="tp?.card" :card="tp.card" scene="circle_course" />

        <!-- 打赏区（后端暂无打赏统计 → 隐藏，待打赏数据接入后显示） -->
        <view v-if="post.reward || post.rewardCount" class="pd-reward">
          <view class="pd-reward-head">
            <view class="pd-reward-title"><app-icon name="gift" :size="28" color="#C9A96E" /><text class="pd-reward-title-t">打赏作者</text></view>
            <text class="pd-reward-count">{{ post.rewardCount }}人已打赏</text>
          </view>
          <view class="pd-reward-grid">
            <view v-for="amt in REWARD_QUICK" :key="amt" class="pd-reward-btn" @tap="showRewardModal = true">
              <app-icon name="sparkles" :size="28" color="#C9A96E" />
              <text class="pd-reward-amt">{{ amt }}</text>
            </view>
          </view>
          <text class="pd-reward-total">累计收到 {{ post.reward }} 国学币打赏</text>
        </view>
      </view>

      <!-- 互动数据栏 -->
      <view class="pd-actions">
        <view class="pd-action" @tap="toggleLike">
          <app-icon name="heart" :size="44" :color="isLiked ? '#C41E3A' : '#666666'" :fill="isLiked" />
          <text class="pd-action-t" :style="{ color: isLiked ? '#C41E3A' : '#666666' }">{{ likes }}</text>
        </view>
        <view class="pd-action">
          <app-icon name="message-circle" :size="44" color="#666666" />
          <text class="pd-action-t">{{ post.comments }}</text>
        </view>
        <view class="pd-action" @tap="toggleCollect">
          <app-icon name="bookmark" :size="44" :color="isCollected ? '#C9A96E' : '#666666'" :fill="isCollected" />
          <text v-if="collects" class="pd-action-t" :style="{ color: isCollected ? '#C9A96E' : '#666666' }">{{ collects }}</text>
        </view>
        <view class="pd-action" @tap="openShare">
          <app-icon name="share-2" :size="44" color="#666666" />
          <text v-if="post.shares" class="pd-action-t">{{ post.shares }}</text>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="pd-comments">
        <view class="pd-comments-head">
          <text class="pd-comments-title">评论 {{ post.comments }}</text>
          <view class="pd-comments-sort">
            <text class="pd-sort" :class="{ on: commentSort === 'hot' }" @tap="commentSort = 'hot'">最热</text>
            <text class="pd-sort-sep">|</text>
            <text class="pd-sort" :class="{ on: commentSort === 'new' }" @tap="commentSort = 'new'">最新</text>
          </view>
        </view>

        <!-- 评论空态 -->
        <view v-if="comments.length === 0" class="pd-c-empty">
          <app-icon name="message-circle" :size="64" color="#E8E3DB" />
          <text class="pd-c-empty-t">还没有评论，来抢沙发吧</text>
        </view>

        <view v-for="c in comments" :key="c.id" class="pd-comment">
          <image lazy-load :src="c.author.avatar" class="pd-c-avatar" mode="aspectFill" @tap="openUser(c.author.id)" />
          <view class="pd-c-main">
            <view class="pd-c-name-row">
              <text class="pd-c-name">{{ c.author.name }}</text>
              <text v-if="c.author.level" class="pd-c-badge lv">Lv.{{ c.author.level }}</text>
              <text v-if="c.author.title" class="pd-c-badge title">{{ c.author.title }}</text>
              <view v-if="c.isPinned" class="pd-c-badge pin-badge"><app-icon name="pin" :size="20" color="#52C41A" /><text class="pd-c-pin-t">置顶</text></view>
            </view>
            <text class="pd-c-content">{{ c.content }}</text>
            <view class="pd-c-foot">
              <text class="pd-c-time">{{ c.createdAt }}</text>
              <view class="pd-c-like" @tap="toggleCommentLike(c)">
                <app-icon name="heart" :size="24" :color="c.isLiked ? '#C41E3A' : '#999999'" :fill="c.isLiked" />
                <text v-if="c.likes > 0" class="pd-c-like-t" :style="{ color: c.isLiked ? '#C41E3A' : '#999999' }">{{ c.likes }}</text>
              </view>
              <text class="pd-c-reply" @tap="startReply(c)">回复</text>
            </view>

            <!-- 子评论 -->
            <view v-if="c.replies && c.replies.length" class="pd-replies">
              <view v-if="!expandedReplies[c.id]" class="pd-expand" @tap="expandedReplies[c.id] = true">
                <text class="pd-expand-t">展开{{ c.replies.length }}条回复</text>
                <app-icon name="chevron-down" :size="26" color="#C41E3A" />
              </view>
              <view v-else class="pd-reply-list">
                <view v-for="r in c.replies" :key="r.id" class="pd-reply">
                  <image lazy-load :src="r.author.avatar" class="pd-r-avatar" mode="aspectFill" />
                  <view class="pd-r-main">
                    <view class="pd-r-name-row">
                      <text class="pd-r-name">{{ r.author.name }}</text>
                      <text v-if="r.author.title" class="pd-c-badge title sm">{{ r.author.title }}</text>
                    </view>
                    <text class="pd-r-content">{{ r.content }}</text>
                    <view class="pd-r-foot">
                      <text class="pd-r-time">{{ r.createdAt }}</text>
                      <view class="pd-r-like"><app-icon name="heart" :size="20" color="#999999" /><text class="pd-r-like-t">{{ r.likes }}</text></view>
                    </view>
                  </view>
                </view>
                <view class="pd-expand" @tap="expandedReplies[c.id] = false">
                  <text class="pd-collapse-t">收起</text>
                  <app-icon name="chevron-up" :size="26" color="#999999" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="pd-bottom-pad" />
    </scroll-view>

    <!-- 底部评论输入 -->
    <view v-if="post" class="pd-input-bar">
      <view v-if="replyTo" class="pd-reply-hint">
        <view class="pd-reply-hint-l"><app-icon name="at-sign" :size="22" color="#666666" /><text class="pd-reply-hint-t">回复 {{ replyTo.author.name }}</text></view>
        <view @tap="replyTo = null"><app-icon name="x" :size="28" color="#999999" /></view>
      </view>
      <view class="pd-input-row">
        <input
          v-model="commentText"
          class="pd-input"
          :placeholder="replyTo ? `回复 ${replyTo.author.name}...` : '写评论...'"
          confirm-type="send"
          @confirm="submitComment"
        />
        <view class="pd-send" :class="{ on: commentText.trim() }" @tap="submitComment">
          <app-icon name="send" :size="36" :color="commentText.trim() ? '#ffffff' : '#999999'" />
        </view>
      </view>
    </view>

    <!-- 图片预览 -->
    <view v-if="previewImage" class="pd-preview" @tap="previewImage = null">
      <view class="pd-preview-close"><app-icon name="x" :size="44" color="#ffffff" /></view>
      <image lazy-load :src="previewImage" class="pd-preview-img" mode="aspectFit" />
    </view>

    <!-- 打赏弹窗 -->
    <view v-if="showRewardModal" class="pd-mask" @tap="showRewardModal = false">
      <view class="pd-reward-modal" @tap.stop>
        <view class="pd-rm-head">
          <view class="pd-rm-icon"><app-icon name="gift" :size="44" color="#ffffff" /></view>
          <text class="pd-rm-title">打赏作者</text>
          <text class="pd-rm-sub">感谢 {{ post?.author.name }} 的精彩分享</text>
        </view>
        <view class="pd-rm-grid">
          <view v-for="amt in REWARD_ALL" :key="amt" class="pd-rm-amt"><text class="pd-rm-amt-t">{{ amt }}</text></view>
        </view>
        <view class="pd-rm-actions">
          <view class="pd-rm-btn cancel" @tap="showRewardModal = false"><text class="pd-rm-btn-t cancel">取消</text></view>
          <view class="pd-rm-btn confirm" @tap="showRewardModal = false"><text class="pd-rm-btn-t confirm">确认打赏</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.pd { display: flex; flex-direction: column; height: 100vh; background: #ffffff; }
/* 顶栏 */
.pd-hdr { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 24rpx; background: rgba(255,255,255,0.95); border-bottom: 2rpx solid #E8E3DB; padding-top: var(--status-bar-height, 0); flex-shrink: 0; }
.pd-hdr-btn { padding: 8rpx; }
.pd-hdr-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.pd-body { flex: 1; overflow: hidden; }
.pd-article { padding: 24rpx; }
/* 加载/错误态 */
.pd-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; padding: 160rpx 0; }
.pd-state-t { font-size: 28rpx; color: #999; }
.pd-state-retry { padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.pd-state-retry-t { font-size: 26rpx; color: #fff; }
/* 评论空态 */
.pd-c-empty { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 96rpx 0; }
.pd-c-empty-t { font-size: 26rpx; color: #999; }
/* 标签 */
.pd-tags { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.pd-tag { display: flex; align-items: center; gap: 6rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }
.pd-tag.pin { background: rgba(196,30,58,0.1); }
.pd-tag.ess { background: rgba(201,169,110,0.1); }
.pd-tag.art { background: rgba(24,144,255,0.1); }
.pd-tag-t { font-size: 22rpx; }
.pd-title { display: block; font-size: 44rpx; font-weight: 700; color: #2C2C2C; line-height: 1.3; margin-bottom: 28rpx; }
/* 作者 */
.pd-author-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; padding-bottom: 28rpx; border-bottom: 2rpx solid #F5F0E8; }
.pd-author { display: flex; align-items: center; gap: 20rpx; }
.pd-avatar-wrap { position: relative; }
.pd-avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; }
.pd-level { position: absolute; bottom: -4rpx; right: -4rpx; width: 36rpx; height: 36rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 18rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.pd-author-name-row { display: flex; align-items: center; gap: 12rpx; }
.pd-author-name { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.pd-author-title { font-size: 20rpx; color: #C9A96E; background: rgba(201,169,110,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.pd-author-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.pd-author-stat { font-size: 24rpx; color: #999999; }
.pd-author-dot { font-size: 24rpx; color: #999999; }
.pd-follow { padding: 12rpx 32rpx; border-radius: 999rpx; background: var(--brand); }
.pd-follow.on { background: #F5F0E8; }
.pd-follow-t { font-size: 26rpx; font-weight: 500; color: #fff; }
.pd-follow-t.on { color: #999999; }
/* 元信息 */
.pd-meta { display: flex; align-items: center; gap: 32rpx; margin-bottom: 40rpx; }
.pd-meta-item { display: flex; align-items: center; gap: 6rpx; }
.pd-meta-t { font-size: 24rpx; color: #999999; }
/* 音频 */
.pd-audio { background: linear-gradient(to right, #1a1a2e, #16213e); border-radius: 28rpx; padding: 28rpx; margin-bottom: 40rpx; }
.pd-audio-top { display: flex; align-items: center; gap: 20rpx; margin-bottom: 20rpx; }
.pd-audio-play { width: 88rpx; height: 88rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pd-audio-main { flex: 1; }
.pd-audio-title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.pd-audio-title { font-size: 28rpx; font-weight: 500; color: #fff; }
.pd-audio-prog-row { display: flex; align-items: center; gap: 12rpx; }
.pd-audio-time { font-size: 22rpx; color: rgba(255,255,255,0.5); font-variant-numeric: tabular-nums; }
.pd-audio-bar { flex: 1; height: 6rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; overflow: hidden; }
.pd-audio-bar-fill { height: 100%; background: #fff; border-radius: 999rpx; transition: width 0.3s; }
.pd-audio-bottom { display: flex; align-items: center; justify-content: space-between; }
.pd-audio-tip { font-size: 20rpx; color: rgba(255,255,255,0.5); }
.pd-audio-rate { display: flex; align-items: center; gap: 16rpx; }
.pd-rate { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.pd-rate.on { color: #fff; font-weight: 500; }
/* Markdown */
.pd-content { }
.md-h2 { display: block; font-size: 34rpx; font-weight: 700; color: #2C2C2C; margin: 40rpx 0 20rpx; }
.md-bold { display: block; font-size: 30rpx; font-weight: 600; color: #2C2C2C; margin: 12rpx 0; }
.md-quote { border-left: 8rpx solid #C9A96E; background: #FFF8E7; padding: 20rpx 28rpx; margin: 28rpx 0; border-radius: 0 12rpx 12rpx 0; }
.md-quote-t { font-size: 28rpx; color: #666666; font-style: italic; }
.md-li { display: flex; gap: 10rpx; margin: 8rpx 0; padding-left: 20rpx; }
.md-dot { color: var(--brand); }
.md-li-t { flex: 1; font-size: 30rpx; color: #2C2C2C; line-height: 1.7; }
.md-hr { height: 2rpx; background: #E8E3DB; margin: 40rpx 0; }
.md-em { display: block; font-size: 28rpx; color: #999999; font-style: italic; margin: 12rpx 0; }
.md-p { display: block; font-size: 30rpx; color: #2C2C2C; line-height: 1.7; margin: 12rpx 0; }
.md-inline-bold { font-weight: 700; }
/* 图片 */
.pd-images { margin-top: 40rpx; }
.pd-img-cell { border-radius: 20rpx; overflow: hidden; margin-bottom: 20rpx; }
.pd-img { width: 100%; display: block; }
.pd-img-cap { padding: 12rpx; background: #FAF8F5; text-align: center; }
.pd-img-cap-t { font-size: 22rpx; color: #999999; }
/* 打赏 */
.pd-reward { margin-top: 48rpx; padding-top: 40rpx; border-top: 2rpx solid #E8E3DB; }
.pd-reward-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.pd-reward-title { display: flex; align-items: center; gap: 12rpx; }
.pd-reward-title-t { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.pd-reward-count { font-size: 22rpx; color: #999999; }
.pd-reward-grid { display: flex; justify-content: center; gap: 20rpx; margin-bottom: 28rpx; }
.pd-reward-btn { width: 112rpx; height: 112rpx; border-radius: 20rpx; background: #FAF8F5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; }
.pd-reward-amt { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.pd-reward-total { display: block; text-align: center; font-size: 22rpx; color: #999999; }
/* 互动栏 */
.pd-actions { display: flex; align-items: center; justify-content: space-around; padding: 28rpx 24rpx; background: #FAF8F5; }
.pd-action { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.pd-action-t { font-size: 22rpx; color: #666666; }
/* 评论 */
.pd-comments { padding: 28rpx 24rpx 0; }
.pd-comments-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.pd-comments-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.pd-comments-sort { display: flex; align-items: center; gap: 12rpx; }
.pd-sort { font-size: 24rpx; color: #999999; }
.pd-sort.on { color: var(--brand); }
.pd-sort-sep { color: #E8E3DB; }
.pd-comment { display: flex; gap: 20rpx; padding: 28rpx 0; border-bottom: 2rpx solid #F5F0E8; }
.pd-c-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0; }
.pd-c-main { flex: 1; min-width: 0; }
.pd-c-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.pd-c-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.pd-c-badge { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.pd-c-badge.lv { background: rgba(196,30,58,0.1); color: var(--brand); }
.pd-c-badge.title { background: rgba(201,169,110,0.1); color: #C9A96E; }
.pd-c-badge.title.sm { font-size: 18rpx; padding: 2rpx 8rpx; }
.pd-c-badge.pin-badge { display: flex; align-items: center; gap: 4rpx; background: rgba(82,196,26,0.1); }
.pd-c-pin-t { font-size: 20rpx; color: #52C41A; }
.pd-c-content { display: block; font-size: 28rpx; color: #2C2C2C; line-height: 1.6; margin-bottom: 16rpx; }
.pd-c-foot { display: flex; align-items: center; gap: 32rpx; }
.pd-c-time { font-size: 22rpx; color: #999999; }
.pd-c-like { display: flex; align-items: center; gap: 6rpx; }
.pd-c-like-t { font-size: 22rpx; }
.pd-c-reply { font-size: 22rpx; color: #999999; }
.pd-replies { margin-top: 20rpx; padding-left: 20rpx; border-left: 4rpx solid #F5F0E8; }
.pd-expand { display: flex; align-items: center; gap: 6rpx; }
.pd-expand-t { font-size: 24rpx; color: var(--brand); }
.pd-collapse-t { font-size: 22rpx; color: #999999; }
.pd-reply-list { display: flex; flex-direction: column; gap: 20rpx; }
.pd-reply { display: flex; gap: 12rpx; }
.pd-r-avatar { width: 56rpx; height: 56rpx; border-radius: 999rpx; flex-shrink: 0; }
.pd-r-main { flex: 1; }
.pd-r-name-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 4rpx; }
.pd-r-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; }
.pd-r-content { display: block; font-size: 24rpx; color: #2C2C2C; line-height: 1.5; }
.pd-r-foot { display: flex; align-items: center; gap: 24rpx; margin-top: 8rpx; }
.pd-r-time { font-size: 20rpx; color: #999999; }
.pd-r-like { display: flex; align-items: center; gap: 4rpx; }
.pd-r-like-t { font-size: 20rpx; color: #999999; }
.pd-bottom-pad { height: 40rpx; }
/* 输入栏 */
.pd-input-bar { background: #fff; border-top: 2rpx solid #E8E3DB; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); flex-shrink: 0; }
.pd-reply-hint { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; padding: 8rpx 20rpx; background: #F5F0E8; border-radius: 12rpx; }
.pd-reply-hint-l { display: flex; align-items: center; gap: 6rpx; }
.pd-reply-hint-t { font-size: 22rpx; color: #666666; }
.pd-input-row { display: flex; align-items: center; gap: 20rpx; }
.pd-input { flex: 1; height: 72rpx; padding: 0 28rpx; background: #F5F0E8; border-radius: 999rpx; font-size: 28rpx; }
.pd-send { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: #E8E3DB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pd-send.on { background: var(--brand); }
/* 图片预览 */
.pd-preview { position: fixed; inset: 0; z-index: 200; background: #000; display: flex; align-items: center; justify-content: center; }
.pd-preview-close { position: absolute; top: 60rpx; right: 32rpx; }
.pd-preview-img { width: 100%; height: 80%; }
/* 打赏弹窗 */
.pd-mask { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.pd-reward-modal { width: 85%; max-width: 640rpx; background: #fff; border-radius: 28rpx; padding: 48rpx; }
.pd-rm-head { text-align: center; margin-bottom: 40rpx; }
.pd-rm-icon { width: 112rpx; height: 112rpx; margin: 0 auto 20rpx; border-radius: 999rpx; background: linear-gradient(to bottom right, #C9A96E, #E8D5B5); display: flex; align-items: center; justify-content: center; }
.pd-rm-title { display: block; font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.pd-rm-sub { font-size: 28rpx; color: #999999; }
.pd-rm-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; margin-bottom: 40rpx; }
.pd-rm-amt { padding: 16rpx 0; border-radius: 12rpx; background: #FAF8F5; text-align: center; }
.pd-rm-amt-t { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.pd-rm-actions { display: flex; gap: 20rpx; }
.pd-rm-btn { flex: 1; padding: 24rpx 0; border-radius: 999rpx; text-align: center; }
.pd-rm-btn.cancel { background: #F5F0E8; }
.pd-rm-btn.confirm { background: linear-gradient(to right, #C9A96E, #E8D5B5); }
.pd-rm-btn-t { font-size: 28rpx; font-weight: 500; }
.pd-rm-btn-t.cancel { color: #666666; }
.pd-rm-btn-t.confirm { color: #fff; }
</style>
