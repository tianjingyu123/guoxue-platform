<template>
  <view class="pd-page">
    <!-- 顶部导航 -->
    <view class="header-bar">
      <text class="header-back" @click="uni.navigateBack()">‹</text>
      <text class="header-title">帖子详情</text>
      <view class="header-menu" @click.stop="showMoreMenu = !showMoreMenu">
        <text class="hm-trigger">⋯</text>
        <view v-if="showMoreMenu" class="hm-drop">
          <view class="hm-mask" @click="showMoreMenu = false" />
          <view class="hm-list">
            <template v-if="isAdmin">
              <text class="hm-item" @click="showMoreMenu = false">{{ post.isEssence ? '取消加精' : '设为精华' }}</text>
              <text class="hm-item" @click="showMoreMenu = false">{{ post.isPinned ? '取消置顶' : '置顶帖子' }}</text>
              <text class="hm-item danger" @click="showMoreMenu = false">删除帖子</text>
            </template>
            <template v-else>
              <text class="hm-item danger" @click="showMoreMenu = false">举报</text>
            </template>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 帖子内容 -->
      <view class="post-card">
        <!-- 作者信息 -->
        <view class="author-row">
          <view class="ar-avatar">{{ post.author.name[0] }}</view>
          <view class="ar-info">
            <view class="ar-name-row">
              <text class="ar-name">{{ post.author.name }}</text>
              <text v-if="post.author.isVerified" class="ar-verify">V</text>
              <text class="ar-role" :class="roleClass">{{ post.author.role }}</text>
            </view>
            <text class="ar-time">{{ post.publishTime }}</text>
          </view>
          <view class="ar-badges">
            <text v-if="post.isEssence" class="ab-essence">精华</text>
            <text v-if="post.isPinned" class="ab-pinned">置顶</text>
          </view>
        </view>

        <!-- 正文 -->
        <text class="post-content">{{ post.content }}</text>

        <!-- 图片 -->
        <view v-if="post.images?.length" class="post-images" :class="'grid-' + Math.min(post.images.length, 3)">
          <view v-for="(img, i) in post.images" :key="img.id" class="pi-item" @click="selectedImage = i">
            <text>🖼️</text>
          </view>
        </view>

        <!-- 视频 -->
        <view v-if="post.video" class="post-video">
          <view class="pv-play"><text>▶️</text></view>
        </view>

        <!-- 文件附件 -->
        <view v-if="post.files?.length" class="post-files">
          <view v-for="f in post.files" :key="f.id" class="pf-item">
            <text class="pf-icon">📎</text>
            <view class="pf-info">
              <text class="pf-name">{{ f.name }}</text>
              <text class="pf-size">{{ f.size }}</text>
            </view>
            <text class="pf-dl">⬇️</text>
          </view>
        </view>

        <!-- 标签 -->
        <view v-if="post.tags?.length" class="post-tags">
          <text v-for="tag in post.tags" :key="tag" class="pt-tag">#{{ tag }}</text>
        </view>

        <!-- 互动数据 -->
        <view class="post-stats">
          <text>{{ post.likes }} 点赞</text>
          <text>{{ post.comments }} 评论</text>
          <text>{{ post.collects }} 收藏</text>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comments-section">
        <text class="cs-title">全部评论 ({{ post.comments }})</text>

        <view v-if="comments.length === 0" class="cs-empty">
          <text class="cse-icon">💬</text>
          <text class="cse-text">暂无评论，来发表第一条吧</text>
        </view>

        <view v-for="comment in comments" :key="comment.id" class="comment-item">
          <view class="ci-main">
            <view class="ci-avatar">{{ comment.author.name[0] }}</view>
            <view class="ci-body">
              <view class="ci-header">
                <text class="ci-name">{{ comment.author.name }}</text>
                <text v-if="comment.author.role !== '成员'" class="ci-role" :class="getRoleClass(comment.author.role)">{{ comment.author.role }}</text>
                <text class="ci-time">{{ comment.time }}</text>
              </view>
              <text class="ci-content">{{ comment.content }}</text>
              <view class="ci-actions">
                <text class="cia-like" :class="{ active: comment.isLiked }" @click="handleCommentLike(comment.id)">{{ comment.isLiked ? '👍' : '👍' }} {{ comment.likes || '' }}</text>
                <text class="cia-reply" @click="startReply(comment.id, comment.author.name)">回复</text>
              </view>

              <!-- 子评论（楼中楼） -->
              <view v-if="comment.replies.length" class="sub-comments">
                <template v-for="reply in (expandedReplies.includes(comment.id) ? comment.replies : comment.replies.slice(0, 2))" :key="reply.id">
                  <view class="sc-item">
                    <text class="sci-name">{{ reply.author.name }}</text>
                    <text v-if="reply.author.role !== '成员'" class="sci-role" :class="getRoleClass(reply.author.role)">{{ reply.author.role }}</text>
                    <text class="sci-at">@{{ reply.replyTo }}</text>
                    <text class="sci-content">{{ reply.content }}</text>
                    <text class="sci-time">{{ reply.time }}</text>
                  </view>
                </template>
                <text v-if="comment.hasMoreReplies && comment.totalReplies > 2" class="sc-expand" @click="toggleReplies(comment.id)">
                  {{ expandedReplies.includes(comment.id) ? '收起 ▲' : '展开更多回复 (' + (comment.totalReplies - 2) + ') ▼' }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bb-btn" :class="{ active: post.isLiked }" @click="handleLike">
        <text>{{ post.isLiked ? '❤️' : '🤍' }} {{ post.likes }}</text>
      </view>
      <view class="bb-btn" :class="{ active: post.isCollected }" @click="handleCollect">
        <text>{{ post.isCollected ? '🔖' : '🏷️' }} {{ post.collects }}</text>
      </view>
      <view class="bb-input" @click="showInputFocus = true">
        <text>{{ replyTo ? '回复 @' + replyTo.name : '说点什么...' }}</text>
      </view>
      <text class="bb-share" @click="handleShare">📤</text>
    </view>

    <!-- 图片预览 -->
    <view v-if="selectedImage !== null" class="img-preview" @click="selectedImage = null">
      <text class="ip-close">✕</text>
      <view class="ip-content">
        <text class="ip-icon">🖼️</text>
        <text class="ip-caption">{{ post.images?.[selectedImage]?.caption || '图片预览' }}</text>
      </view>
      <view class="ip-dots">
        <view v-for="(img, i) in post.images" :key="i" class="ip-dot" :class="{ active: i === selectedImage }" @click.stop="selectedImage = i" />
      </view>
    </view>

    <!-- 评论输入弹窗 -->
    <view v-if="showInputFocus" class="comment-modal" @click="closeCommentModal">
      <view class="cm-panel" @click.stop>
        <view v-if="replyTo" class="cm-reply-bar">
          <text class="cm-reply-text">回复 @{{ replyTo.name }}</text>
          <text class="cm-reply-cancel" @click="replyTo = null">取消回复</text>
        </view>
        <view class="cm-input-row">
          <textarea v-model="commentInput" class="cm-textarea" :placeholder="replyTo ? '回复 @' + replyTo.name + '...' : '说点什么...'" :focus="true" />
          <view class="cm-send" :class="{ disabled: !commentInput.trim() }" @click="handleSendComment">
            <text>➤</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const userRole = '圈主'
const isAdmin = userRole === '圈主' || userRole === '管理员'

const post = ref({
  id: 1,
  author: { id: 1, name: '周易大师', avatar: '', role: '圈主', isVerified: true },
  publishTime: '2小时前',
  content: `今天分享一个有趣的八字案例分析。\n\n这位朋友是甲木日主，生于寅月，地支寅卯辰三会木局，天干透甲乙，木气极旺。\n\n从格局上看，这是一个「从强格」的典型案例。木旺喜水木相生，忌金克土泄。\n\n关键分析点：\n1. 日主甲木坐寅，得禄得地，根基稳固\n2. 月令寅木当令，木气正旺\n3. 地支三会木局，势不可挡\n\n这种命格的人通常性格正直，有领导才能，但也要注意过刚易折的问题。\n\n大家有什么看法？欢迎在评论区讨论！`,
  images: [
    { id: 1, url: '', caption: '八字排盘图' },
    { id: 2, url: '', caption: '五行分析' },
    { id: 3, url: '', caption: '大运走势' },
  ],
  files: [{ id: 1, name: '八字案例分析.pdf', size: '2.3MB', type: 'pdf' }],
  video: null,
  tags: ['八字案例', '命理分析', '从强格'],
  likes: 128, comments: 36, collects: 45,
  isLiked: false, isCollected: false, isPinned: true, isEssence: true,
  circleName: '八字命理研习社', circleId: 1,
})

const comments = ref([
  {
    id: 1, author: { id: 2, name: '易学新手', avatar: '', role: '成员' },
    content: '周老师分析得太透彻了！请问如果大运走金运，是不是会比较艰难？',
    time: '1小时前', likes: 15, isLiked: false,
    replies: [
      { id: 11, author: { id: 1, name: '周易大师', avatar: '', role: '圈主' }, replyTo: '易学新手', content: '是的，金运克木，对于从强格来说确实不利。但也要看具体流年配合，不能一概而论。', time: '50分钟前', likes: 8, isLiked: false },
      { id: 12, author: { id: 3, name: '命理爱好者', avatar: '', role: '嘉宾' }, replyTo: '周易大师', content: '周老师说得对，还要看大运地支的配合情况。', time: '30分钟前', likes: 3, isLiked: false },
    ],
    hasMoreReplies: true, totalReplies: 5,
  },
  {
    id: 2, author: { id: 4, name: '紫微研究者', avatar: '', role: '成员' },
    content: '从紫微斗数的角度来看，这种命格的人在事业宫应该也很强。',
    time: '45分钟前', likes: 22, isLiked: true, replies: [], hasMoreReplies: false, totalReplies: 0,
  },
  {
    id: 3, author: { id: 5, name: '风水学徒', avatar: '', role: '成员' },
    content: '学习了，请问周老师有没有关于从弱格的案例分析？',
    time: '20分钟前', likes: 6, isLiked: false, replies: [], hasMoreReplies: false, totalReplies: 0,
  },
])

const showMoreMenu = ref(false)
const selectedImage = ref<number | null>(null)
const commentInput = ref('')
const replyTo = ref<{ id: number; name: string } | null>(null)
const expandedReplies = ref<number[]>([])
const showInputFocus = ref(false)

const roleClass = getRoleClass(post.value.author.role)

function getRoleClass(role: string) {
  if (role === '圈主') return 'owner'
  if (role === '嘉宾') return 'guest'
  if (role === '管理员') return 'admin'
  return ''
}

function handleLike() {
  post.value.isLiked = !post.value.isLiked
  post.value.likes += post.value.isLiked ? 1 : -1
}

function handleCollect() {
  post.value.isCollected = !post.value.isCollected
  post.value.collects += post.value.isCollected ? 1 : -1
}

function handleCommentLike(id: number) {
  const c = comments.value.find(c => c.id === id)
  if (c) { c.isLiked = !c.isLiked; c.likes += c.isLiked ? 1 : -1 }
}

function startReply(id: number, name: string) {
  replyTo.value = { id, name }
  showInputFocus.value = true
}

function handleSendComment() {
  if (!commentInput.value.trim()) return
  comments.value.unshift({
    id: Date.now(), author: { id: 999, name: '我', avatar: '', role: '成员' },
    content: replyTo.value ? `回复 @${replyTo.value.name}：${commentInput.value}` : commentInput.value,
    time: '刚刚', likes: 0, isLiked: false, replies: [], hasMoreReplies: false, totalReplies: 0,
  })
  commentInput.value = ''
  replyTo.value = null
  showInputFocus.value = false
}

function toggleReplies(id: number) {
  const idx = expandedReplies.value.indexOf(id)
  if (idx >= 0) expandedReplies.value.splice(idx, 1)
  else expandedReplies.value.push(id)
}

function closeCommentModal() {
  showInputFocus.value = false
  replyTo.value = null
}

function handleShare() { uni.showToast({ title: '分享功能', icon: 'none' }) }
</script>

<style scoped>
.pd-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

.header-bar { height: 80rpx; background: #fff; border-bottom: 1px solid #E8E0D5; display: flex; align-items: center; padding: 0 20rpx; flex-shrink: 0; position: relative; z-index: 30; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-menu { position: relative; }
.hm-trigger { font-size: 36rpx; color: #333; width: 56rpx; text-align: center; }
.hm-drop { position: absolute; right: 0; top: 50rpx; z-index: 50; }
.hm-mask { position: fixed; inset: 0; }
.hm-list { background: #fff; border-radius: 14rpx; padding: 8rpx 0; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); min-width: 200rpx; }
.hm-item { display: block; padding: 16rpx 24rpx; font-size: 24rpx; color: #333; }
.hm-item.danger { color: #C41E3A; }

.body { flex: 1; }

.post-card { background: #fff; padding: 24rpx; margin-bottom: 16rpx; }

.author-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; }
.ar-avatar { width: 66rpx; height: 66rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #C41E3A; flex-shrink: 0; }
.ar-info { flex: 1; }
.ar-name-row { display: flex; align-items: center; gap: 8rpx; }
.ar-name { font-size: 26rpx; font-weight: 500; color: #333; }
.ar-verify { font-size: 16rpx; padding: 2rpx 6rpx; border-radius: 4rpx; background: rgba(240,160,48,0.15); color: #F0A030; }
.ar-role { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; }
.ar-role.owner { background: rgba(196,30,58,0.08); color: #C41E3A; }
.ar-role.guest { background: rgba(201,169,110,0.1); color: #C9A96E; }
.ar-role.admin { background: rgba(30,100,200,0.08); color: #1E64C8; }
.ar-time { font-size: 20rpx; color: #BBB; display: block; }
.ar-badges { display: flex; gap: 6rpx; }
.ab-essence { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: #C9A96E; color: #fff; }
.ab-pinned { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: #C41E3A; color: #fff; }

.post-content { font-size: 26rpx; color: #555; line-height: 1.8; white-space: pre-wrap; display: block; margin-bottom: 20rpx; }

.post-images { display: grid; gap: 8rpx; margin-bottom: 20rpx; }
.post-images.grid-1 { grid-template-columns: 1fr; }
.post-images.grid-2 { grid-template-columns: 1fr 1fr; }
.post-images.grid-3 { grid-template-columns: repeat(3, 1fr); }
.pi-item { aspect-ratio: 1; border-radius: 12rpx; background: #F5F1EB; display: flex; align-items: center; justify-content: center; }
.pi-item text { font-size: 48rpx; }

.post-video { aspect-ratio: 16/9; border-radius: 12rpx; background: #333; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.pv-play { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; }
.pv-play text { font-size: 32rpx; }

.post-files { display: flex; flex-direction: column; gap: 10rpx; margin-bottom: 20rpx; }
.pf-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; border-radius: 12rpx; background: #FAF8F5; }
.pf-icon { font-size: 32rpx; }
.pf-info { flex: 1; min-width: 0; }
.pf-name { font-size: 24rpx; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf-size { font-size: 20rpx; color: #BBB; }
.pf-dl { font-size: 28rpx; }

.post-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 16rpx; }
.pt-tag { font-size: 20rpx; padding: 6rpx 14rpx; border-radius: 20rpx; background: rgba(196,30,58,0.06); color: #C41E3A; }

.post-stats { display: flex; gap: 24rpx; padding-top: 16rpx; border-top: 1px solid #F5F1EB; }
.post-stats text { font-size: 22rpx; color: #BBB; }

.comments-section { background: #fff; padding: 24rpx; }
.cs-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 20rpx; }
.cs-empty { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; }
.cse-icon { font-size: 60rpx; opacity: 0.15; margin-bottom: 16rpx; }
.cse-text { font-size: 24rpx; color: #999; }

.comment-item { padding-bottom: 24rpx; border-bottom: 1px solid #F5F1EB; margin-bottom: 24rpx; }
.comment-item:last-child { border-bottom: none; margin-bottom: 0; }
.ci-main { display: flex; gap: 12rpx; }
.ci-avatar { width: 54rpx; height: 54rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; flex-shrink: 0; }
.ci-body { flex: 1; min-width: 0; }
.ci-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 6rpx; flex-wrap: wrap; }
.ci-name { font-size: 24rpx; font-weight: 500; color: #333; }
.ci-role { font-size: 16rpx; padding: 2rpx 8rpx; border-radius: 4rpx; }
.ci-role.owner { background: rgba(196,30,58,0.08); color: #C41E3A; }
.ci-role.guest { background: rgba(201,169,110,0.1); color: #C9A96E; }
.ci-time { font-size: 20rpx; color: #BBB; }
.ci-content { font-size: 24rpx; color: #555; line-height: 1.6; display: block; margin-bottom: 10rpx; }
.ci-actions { display: flex; gap: 20rpx; }
.cia-like { font-size: 20rpx; color: #BBB; }
.cia-like.active { color: #C41E3A; }
.cia-reply { font-size: 20rpx; color: #BBB; }

.sub-comments { margin-top: 16rpx; padding-left: 20rpx; border-left: 4rpx solid #F5F1EB; }
.sc-item { margin-bottom: 14rpx; line-height: 1.6; }
.sci-name { font-size: 22rpx; font-weight: 500; color: #333; }
.sci-role { font-size: 16rpx; padding: 1rpx 6rpx; border-radius: 4rpx; margin-left: 6rpx; }
.sci-role.owner { background: rgba(196,30,58,0.08); color: #C41E3A; }
.sci-role.guest { background: rgba(201,169,110,0.1); color: #C9A96E; }
.sci-at { font-size: 22rpx; color: #C41E3A; margin: 0 4rpx; }
.sci-content { font-size: 22rpx; color: #555; }
.sci-time { font-size: 18rpx; color: #CCC; margin-left: 8rpx; }
.sc-expand { font-size: 20rpx; color: #C41E3A; display: block; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 14rpx 20rpx; padding-bottom: calc(14rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 12rpx; z-index: 20; }
.bb-btn { padding: 10rpx 16rpx; border-radius: 24rpx; }
.bb-btn text { font-size: 24rpx; color: #999; }
.bb-btn.active text { color: #C41E3A; }
.bb-input { flex: 1; padding: 14rpx 20rpx; border-radius: 28rpx; background: #F5F1EB; }
.bb-input text { font-size: 24rpx; color: #BBB; }
.bb-share { font-size: 32rpx; padding: 8rpx; }

.img-preview { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ip-close { position: absolute; top: 48rpx; right: 24rpx; font-size: 36rpx; color: #fff; z-index: 2; }
.ip-content { display: flex; flex-direction: column; align-items: center; }
.ip-icon { font-size: 100rpx; opacity: 0.3; margin-bottom: 20rpx; }
.ip-caption { font-size: 24rpx; color: rgba(255,255,255,0.6); }
.ip-dots { position: absolute; bottom: 80rpx; display: flex; gap: 12rpx; }
.ip-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: rgba(255,255,255,0.3); }
.ip-dot.active { background: #fff; }

.comment-modal { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; justify-content: flex-end; }
.cm-panel { background: #fff; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
.cm-reply-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.cm-reply-text { font-size: 20rpx; color: #999; }
.cm-reply-cancel { font-size: 20rpx; color: #C41E3A; }
.cm-input-row { display: flex; align-items: flex-end; gap: 12rpx; }
.cm-textarea { flex: 1; min-height: 80rpx; max-height: 180rpx; padding: 14rpx 18rpx; border-radius: 14rpx; background: #F5F1EB; font-size: 24rpx; color: #333; }
.cm-send { width: 56rpx; height: 56rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cm-send text { font-size: 24rpx; color: #fff; }
.cm-send.disabled { background: #F5F1EB; }
.cm-send.disabled text { color: #BBB; }
</style>
