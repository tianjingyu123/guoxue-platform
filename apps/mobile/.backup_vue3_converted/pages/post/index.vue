<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="fixed top-0 left-0 right-0 z-40 bg-white/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
        <text class="font-medium text-base text-foreground">帖子详情</text>
        <view class="relative">
          <view @click="showMoreMenu = !showMoreMenu" class="p-2 -mr-2 rounded-full"><text class="text-lg text-foreground">⋯</text></view>
          <view v-if="showMoreMenu" class="fixed inset-0 z-40" @click="showMoreMenu = false" />
          <view v-if="showMoreMenu" class="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50">
            <template v-if="isAdmin">
              <view @click="showMoreMenu = false" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground">
                <text class="text-accent"></text>
                <text>{{ post.isEssence ? '取消加精' : '设为精华' }}</text>
              </view>
              <view @click="showMoreMenu = false" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground">
                <text class="text-primary">📌</text>
                <text>{{ post.isPinned ? '取消置顶' : '置顶帖子' }}</text>
              </view>
              <view @click="showMoreMenu = false" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-primary">
                <text>🗑️</text>
                <text>删除帖子</text>
              </view>
            </template>
            <template v-else>
              <view @click="showMoreMenu = false" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-primary">
                <text>🚩</text>
                <text>举报</text>
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="pt-12 p-4">
      <view class="flex items-center gap-3 mb-4 animate-pulse">
        <view class="w-11 h-11 rounded-full bg-[#F0EDE8]" />
        <view class="flex-1 space-y-1.5">
          <view class="h-4 w-24 bg-[#F0EDE8] rounded" />
          <view class="h-3 w-16 bg-[#F0EDE8] rounded" />
        </view>
      </view>
      <view class="space-y-2 animate-pulse">
        <view v-for="i in 5" :key="i" class="h-4 bg-[#F0EDE8] rounded" :style="{ width: (50 + Math.random() * 50) + '%' }" />
      </view>
      <view class="grid grid-cols-3 gap-2 mt-4 animate-pulse">
        <view v-for="i in 3" :key="i" class="aspect-square bg-[#F0EDE8] rounded-lg" />
      </view>
    </view>

    <!-- 主内容 -->
    <view v-else class="pt-12">
      <!-- 帖子内容区 -->
      <view class="p-4 border-b border-border">
        <!-- 发布者信息 -->
        <view class="flex items-center gap-3 mb-4">
          <view class="w-11 h-11 rounded-full bg-[#F0EDE8] flex items-center justify-center shrink-0" @click="goUser(post.author.id)">
            <text class="text-foreground font-medium">{{ post.author.name[0] }}</text>
          </view>
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="font-medium text-sm text-foreground">{{ post.author.name }}</text>
              <view v-if="post.author.isVerified" class="px-1 py-0 bg-accent/20 text-accent text-[10px] rounded">V</view>
              <view :class="['px-1.5 py-0 text-[10px] rounded', roleBadgeClass(post.author.role)]">{{ post.author.role }}</view>
            </view>
            <text class="text-xs text-muted-foreground mt-0.5 block">{{ post.publishTime }}</text>
          </view>
          <view class="flex items-center gap-1">
            <view v-if="post.isEssence" class="px-1.5 py-0 bg-accent text-white text-[10px] rounded">精华</view>
            <view v-if="post.isPinned" class="px-1.5 py-0 bg-primary text-white text-[10px] rounded">置顶</view>
          </view>
        </view>

        <!-- 正文 -->
        <text class="text-sm text-foreground leading-relaxed whitespace-pre-wrap block mb-4">{{ post.content }}</text>

        <!-- 图片 -->
        <view v-if="post.images && post.images.length > 0" :class="['grid gap-2 mb-4', post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3']">
          <view v-for="(img, i) in post.images" :key="img.id"
            :class="['relative bg-[#F0EDE8] rounded-lg overflow-hidden flex items-center justify-center', post.images.length === 1 ? 'aspect-video' : 'aspect-square']"
            @click="selectedImage = i"
          >
            <text class="text-3xl opacity-30">️</text>
          </view>
        </view>

        <!-- 视频 -->
        <view v-if="post.video" class="relative aspect-video bg-[#F0EDE8] rounded-lg overflow-hidden mb-4 flex items-center justify-center">
          <text class="text-5xl opacity-20"></text>
          <view class="absolute inset-0 flex items-center justify-center">
            <view class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
              <text class="text-primary text-2xl">▶</text>
            </view>
          </view>
        </view>

        <!-- 文件附件 -->
        <view v-if="post.files && post.files.length > 0" class="space-y-2 mb-4">
          <view v-for="file in post.files" :key="file.id" class="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
            <view class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <text class="text-lg"></text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground truncate block">{{ file.name }}</text>
              <text class="text-xs text-muted-foreground">{{ file.size }}</text>
            </view>
            <text class="text-muted-foreground"></text>
          </view>
        </view>

        <!-- 话题标签 -->
        <view v-if="post.tags && post.tags.length > 0" class="flex flex-wrap gap-2 mb-4">
          <view v-for="tag in post.tags" :key="tag" class="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
            <text>#</text>
            <text>{{ tag }}</text>
          </view>
        </view>

        <!-- 互动数据 -->
        <view class="flex items-center gap-4 text-xs text-muted-foreground">
          <text>{{ post.likes }} 点赞</text>
          <text>{{ post.comments }} 评论</text>
          <text>{{ post.collects }} 收藏</text>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="p-4">
        <text class="font-semibold text-base text-foreground block mb-4">全部评论 ({{ comments.length }})</text>

        <view v-if="comments.length === 0" class="flex flex-col items-center justify-center py-12">
          <text class="text-4xl text-[#E8E0D5] mb-3"></text>
          <text class="text-sm text-muted-foreground">暂无评论，来发表第一条吧</text>
        </view>

        <view v-else class="space-y-4">
          <view v-for="comment in comments" :key="comment.id" class="border-b border-border pb-4 last:border-0">
            <view class="flex gap-3">
              <view class="w-9 h-9 rounded-full bg-[#F0EDE8] flex items-center justify-center shrink-0" @click="goUser(comment.author.id)">
                <text class="text-xs text-foreground font-medium">{{ comment.author.name[0] }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2 mb-1">
                  <text class="font-medium text-sm text-foreground">{{ comment.author.name }}</text>
                  <view v-if="comment.author.role !== '成员'" :class="['px-1 py-0 text-[10px] rounded', roleBadgeClass(comment.author.role)]">{{ comment.author.role }}</view>
                  <text class="text-xs text-muted-foreground">{{ comment.time }}</text>
                </view>
                <text class="text-sm text-foreground mb-2 block">{{ comment.content }}</text>
                <view class="flex items-center gap-4">
                  <view :class="['flex items-center gap-1 text-xs', comment.isLiked ? 'text-primary' : 'text-muted-foreground']" @click="handleCommentLike(comment.id)">
                    <text>{{ comment.isLiked ? '' : '' }}</text>
                    <text v-if="comment.likes > 0">{{ comment.likes }}</text>
                  </view>
                  <view class="text-xs text-muted-foreground" @click="startReply(comment)">回复</view>
                </view>

                <!-- 楼中楼 -->
                <view v-if="comment.replies && comment.replies.length > 0" class="mt-3 pl-3 border-l-2 border-border space-y-3">
                  <view v-for="reply in (expandedReplies.includes(comment.id) ? comment.replies : comment.replies.slice(0, 2))" :key="reply.id" class="text-sm">
                    <view class="flex items-center gap-2 mb-1">
                      <text class="font-medium text-foreground">{{ reply.author.name }}</text>
                      <view v-if="reply.author.role !== '成员'" :class="['px-1 py-0 text-[10px] rounded', roleBadgeClass(reply.author.role)]">{{ reply.author.role }}</view>
                      <text class="text-xs text-muted-foreground">{{ reply.time }}</text>
                    </view>
                    <text class="text-foreground">
                      <text class="text-primary">@{{ reply.replyTo }}</text>
                      {{ ' ' + reply.content }}
                    </text>
                  </view>
                  <view v-if="comment.totalReplies > 2" class="flex items-center gap-1 text-xs text-primary" @click="toggleReplies(comment.id)">
                    <text>{{ expandedReplies.includes(comment.id) ? '收起' : `展开更多回复 (${comment.totalReplies - 2})` }}</text>
                    <text>{{ expandedReplies.includes(comment.id) ? '▲' : '▼' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 图片预览弹窗 -->
    <view v-if="selectedImage !== null && post.images" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90" @click="selectedImage = null">
      <view @click="selectedImage = null" class="absolute top-4 right-4 p-2 rounded-full bg-white/10 z-10">
        <text class="text-white text-lg">✕</text>
      </view>
      <view class="w-full h-full flex items-center justify-center p-4">
        <view class="max-w-lg w-full aspect-square bg-white/10 rounded-xl flex flex-col items-center justify-center">
          <text class="text-5xl opacity-40 mb-3">️</text>
          <text class="text-white/60 text-sm">{{ post.images[selectedImage]?.caption || '图片预览' }}</text>
        </view>
      </view>
      <view class="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
        <view v-for="(_, i) in post.images" :key="i"
          :class="['w-2 h-2 rounded-full', selectedImage === i ? 'bg-white' : 'bg-white/30']"
          @click.stop="selectedImage = i"
        />
      </view>
    </view>

    <!-- 底部固定操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border z-30">
      <view class="flex items-center gap-2 px-4 h-14">
        <view :class="['flex items-center gap-1 px-3 py-2 rounded-full', post.isLiked ? 'text-primary' : 'text-muted-foreground']" @click="handleLike">
          <text :class="['text-lg', post.isLiked ? '' : '']">{{ post.isLiked ? '' : '🤍' }}</text>
          <text class="text-xs">{{ post.likes }}</text>
        </view>
        <view :class="['flex items-center gap-1 px-3 py-2 rounded-full', post.isCollected ? 'text-accent' : 'text-muted-foreground']" @click="handleCollect">
          <text class="text-lg">{{ post.isCollected ? '' : '☆' }}</text>
          <text class="text-xs">{{ post.collects }}</text>
        </view>
        <view class="flex-1 flex items-center gap-2 px-4 py-2 bg-secondary rounded-full" @click="showInputFocus = true">
          <text class="text-sm text-muted-foreground">{{ replyTo ? `回复 @${replyTo.name}` : '说点什么...' }}</text>
        </view>
        <view class="p-2 rounded-full text-muted-foreground" @click="handleShare">
          <text class="text-lg"></text>
        </view>
      </view>
    </view>

    <!-- 评论输入弹窗 -->
    <view v-if="showInputFocus" class="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" @click="closeInput">
      <view class="bg-white border-t border-border p-4" @click.stop>
        <view v-if="replyTo" class="flex items-center justify-between mb-2">
          <text class="text-xs text-muted-foreground">回复 @{{ replyTo.name }}</text>
          <text class="text-xs text-primary" @click="replyTo = null">取消回复</text>
        </view>
        <view class="flex items-end gap-2">
          <textarea
            v-model="commentInput"
            :placeholder="replyTo ? `回复 @${replyTo.name}...` : '说点什么...'"
            class="flex-1 px-4 py-3 bg-secondary rounded-xl text-sm text-foreground resize-none"
            :style="{ minHeight: '80px', maxHeight: '160px' }"
          />
          <view :class="['p-3 rounded-full', commentInput.trim() ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground']" @click="sendComment">
            <text class="text-lg"></text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Author { id: number; name: string; avatar: string; role: string; isVerified?: boolean }
interface ReplyItem { id: number; author: Author; replyTo: string; content: string; time: string; likes: number; isLiked: boolean }
interface CommentItem { id: number; author: Author; content: string; time: string; likes: number; isLiked: boolean; replies: ReplyItem[]; totalReplies: number }
interface FileItem { id: number; name: string; size: string; type: string }
interface ImageItem { id: number; url: string; caption: string }

interface PostData {
  id: number
  author: Author
  publishTime: string
  content: string
  images: ImageItem[]
  files: FileItem[]
  video: any
  tags: string[]
  likes: number; comments: number; collects: number
  isLiked: boolean; isCollected: boolean
  isPinned: boolean; isEssence: boolean
  circleName: string; circleId: number
}

const loading = ref(true)
const showMoreMenu = ref(false)
const showInputFocus = ref(false)
const selectedImage = ref<number | null>(null)
const commentInput = ref('')
const replyTo = ref<{ id: number; name: string } | null>(null)
const expandedReplies = ref<number[]>([])
const isAdmin = ref(true)

const post = ref<PostData>({
  id: 1,
  author: { id: 1, name: '周易大师', avatar: '', role: '圈主', isVerified: true },
  publishTime: '2小时前',
  content: '今天分享一个有趣的八字案例分析。\n\n这位朋友是甲木日主，生于寅月，地支寅卯辰三会木局，天干透甲乙，木气极旺。\n\n从格局上看，这是一个「从强格」的典型案例。木旺喜水木相生，忌金克土泄。\n\n关键分析点：\n1. 日主甲木坐寅，得禄得地，根基稳固\n2. 月令寅木当令，木气正旺\n3. 地支三会木局，势不可挡\n\n这种命格的人通常性格正直，有领导才能，但也要注意过刚易折的问题。\n\n大家有什么看法？欢迎在评论区讨论！',
  images: [{ id: 1, url: '', caption: '八字排盘图' }, { id: 2, url: '', caption: '五行分析' }, { id: 3, url: '', caption: '大运走势' }],
  files: [{ id: 1, name: '八字案例分析.pdf', size: '2.3MB', type: 'pdf' }],
  video: null,
  tags: ['八字案例', '命理分析', '从强格'],
  likes: 128, comments: 36, collects: 45,
  isLiked: false, isCollected: false,
  isPinned: true, isEssence: true,
  circleName: '八字命理研习社', circleId: 1,
})

const comments = ref<CommentItem[]>([
  {
    id: 1, author: { id: 2, name: '易学新手', avatar: '', role: '成员' },
    content: '周老师分析得太透彻了！请问如果大运走金运，是不是会比较艰难？', time: '1小时前', likes: 15, isLiked: false,
    replies: [
      { id: 11, author: { id: 1, name: '周易大师', avatar: '', role: '圈主' }, replyTo: '易学新手', content: '是的，金运克木，对于从强格来说确实不利。但也要看具体流年配合，不能一概而论。', time: '50分钟前', likes: 8, isLiked: false },
      { id: 12, author: { id: 3, name: '命理爱好者', avatar: '', role: '嘉宾' }, replyTo: '周易大师', content: '周老师说得对，还要看大运地支的配合情况。', time: '30分钟前', likes: 3, isLiked: false },
    ],
    totalReplies: 5,
  },
  {
    id: 2, author: { id: 4, name: '紫微研究者', avatar: '', role: '成员' },
    content: '从紫微斗数的角度来看，这种命格的人在事业宫应该也很强。有机会可以对比分析一下两种命理体系的异同。', time: '45分钟前', likes: 22, isLiked: true,
    replies: [], totalReplies: 0,
  },
  {
    id: 3, author: { id: 5, name: '风水学徒', avatar: '', role: '成员' },
    content: '学习了，请问周老师有没有关于从弱格的案例分析？', time: '20分钟前', likes: 6, isLiked: false,
    replies: [], totalReplies: 0,
  },
])

onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

function roleBadgeClass(role: string): string {
  switch (role) {
    case '圈主': return 'bg-primary/20 text-primary border-primary/30'
    case '嘉宾': return 'bg-accent/20 text-accent border-accent/30'
    case '管理员': return 'bg-blue-100 text-blue-500'
    default: return 'bg-[#F0EDE8] text-muted-foreground'
  }
}

function handleLike() {
  post.value.isLiked = !post.value.isLiked
  post.value.likes += post.value.isLiked ? 1 : -1
}
function handleCollect() {
  post.value.isCollected = !post.value.isCollected
  post.value.collects += post.value.isCollected ? 1 : -1
}
function handleCommentLike(cid: number) {
  const c = comments.value.find(x => x.id === cid)
  if (c) { c.isLiked = !c.isLiked; c.likes += c.isLiked ? 1 : -1 }
}
function toggleReplies(cid: number) {
  const i = expandedReplies.value.indexOf(cid)
  if (i >= 0) expandedReplies.value.splice(i, 1)
  else expandedReplies.value.push(cid)
}
function startReply(comment: CommentItem) {
  replyTo.value = { id: comment.id, name: comment.author.name }
  showInputFocus.value = true
}
function closeInput() { showInputFocus.value = false; replyTo.value = null }
function sendComment() {
  if (!commentInput.value.trim()) return
  comments.value.unshift({
    id: Date.now(), author: { id: 999, name: '我', avatar: '', role: '成员' },
    content: replyTo.value ? `回复 @${replyTo.value.name}：${commentInput.value}` : commentInput.value,
    time: '刚刚', likes: 0, isLiked: false, replies: [], totalReplies: 0,
  })
  commentInput.value = ''
  replyTo.value = null
  showInputFocus.value = false
}
function handleShare() { uni.showToast({ title: '分享功能已开启', icon: 'none' }) }
function goBack() { uni.navigateBack() }
function goUser(uid: number) { uni.navigateTo({ url: '/pages/user/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
