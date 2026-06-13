<template>
  <view class="min-h-screen bg-white pb-24">
    <!-- 顶部导航 -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="p-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <view class="flex items-center gap-1" @click="goCircle">
          <text class="text-[14px] font-medium text-foreground">{{ post.circleName }}</text>
        </view>
        <view class="p-1">
          <text class="text-xl text-ink-soft">⋯</text>
        </view>
      </view>
    </view>

    <main class="pt-12">
      <!-- 文章内容 -->
      <view class="px-4 py-4">
        <!-- 标签 -->
        <view class="flex items-center gap-2 mb-3">
          <view v-if="post.isPinned" class="px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full flex items-center gap-1">
            <text class="text-xs">📌</text>
            <text>置顶</text>
          </view>
          <view v-if="post.isEssence" class="px-2 py-0.5 bg-accent/10 text-accent text-[11px] rounded-full flex items-center gap-1">
            <text class="text-xs"></text>
            <text>精华</text>
          </view>
          <view v-if="post.type === 'article'" class="px-2 py-0.5 bg-info/10 text-info text-[11px] rounded-full flex items-center gap-1">
            <text class="text-xs"></text>
            <text>长文</text>
          </view>
        </view>

        <!-- 标题 -->
        <text class="text-[22px] font-bold text-foreground block leading-tight mb-4">{{ post.title }}</text>

        <!-- 作者信息 -->
        <view class="flex items-center justify-between mb-4 pb-4" style="border-bottom: 1px solid #F5F0E8;">
          <view class="flex items-center gap-3" @click="goUser(post.author.id)">
            <view class="relative">
              <image :src="post.author.avatar" mode="aspectFill" class="w-11 h-11 rounded-full" />
              <view class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <text class="text-[9px] text-white font-bold">{{ post.author.level }}</text>
              </view>
            </view>
            <view>
              <view class="flex items-center gap-2">
                <text class="font-medium text-[15px] text-foreground">{{ post.author.name }}</text>
                <text class="px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] rounded">{{ post.author.title }}</text>
              </view>
              <view class="flex items-center gap-2 text-[12px] text-muted-foreground">
                <text>{{ post.author.followers }}粉丝</text>
                <text>·</text>
                <text>{{ post.author.posts }}篇文章</text>
              </view>
            </view>
          </view>
          <view
            class="px-4 py-1.5 rounded-full text-[13px] font-medium"
            :class="isFollowed ? 'bg-[#F5F0E8] text-muted-foreground' : 'bg-primary text-white'"
            @click="handleFollow"
          >
            <text>{{ isFollowed ? '已关注' : '关注' }}</text>
          </view>
        </view>

        <!-- 元信息 -->
        <view class="flex items-center gap-4 text-[12px] text-muted-foreground mb-6">
          <text class="flex items-center gap-1">🕐 {{ post.createdAt }}</text>
          <text class="flex items-center gap-1">️ {{ post.views }}阅读</text>
          <text class="flex items-center gap-1">🕐 约{{ post.readTime }}分钟</text>
        </view>

        <!-- 音频播放器 -->
        <view v-if="post.audio" class="mb-6">
          <view class="rounded-2xl p-4" style="background: linear-gradient(to right, #1a1a2e, #16213e);">
            <view class="flex items-center gap-3 mb-3">
              <view
                class="w-12 h-12 rounded-full flex items-center justify-center"
                style="background: rgba(255,255,255,0.1);"
                @click="toggleAudioPlay"
              >
                <text class="text-white text-xl" :class="audioIsPlaying ? '' : 'ml-1'">{{ audioIsPlaying ? '⏸' : '▶' }}</text>
              </view>
              <view class="flex-1">
                <view class="flex items-center gap-2 mb-1">
                  <text class="text-white/70 text-sm"></text>
                  <text class="text-white font-medium text-[14px]">{{ post.audio.title }}</text>
                </view>
                <view class="flex items-center gap-2">
                  <text class="text-white/50 text-[12px]">{{ formatDuration(audioCurrentTime) }}</text>
                  <view class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.2);">
                    <view
                      class="h-full bg-white rounded-full"
                      :style="{ width: audioProgress + '%' }"
                    />
                  </view>
                  <text class="text-white/50 text-[12px]">{{ formatDuration(post.audio.duration) }}</text>
                </view>
              </view>
            </view>
            <view class="flex items-center justify-between">
              <text class="text-white/50 text-[11px]">边听边看，学习更高效</text>
              <view class="flex items-center gap-2">
                <text class="text-white/70 text-[12px]">0.75x</text>
                <text class="text-white text-[12px] font-medium">1.0x</text>
                <text class="text-white/70 text-[12px]">1.5x</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 正文内容 -->
        <view class="article-content" v-html="renderedContent" />

        <!-- 图片展示 -->
        <view v-if="post.images && post.images.length > 0" class="mt-6 space-y-3">
          <view v-for="(img, idx) in post.images" :key="idx" class="rounded-xl overflow-hidden">
            <image
              :src="img.url"
              mode="widthFix"
              class="w-full"
              @click="previewImage = img.url"
            />
            <view v-if="img.caption" class="px-3 py-2 bg-background text-center">
              <text class="text-[12px] text-muted-foreground">{{ img.caption }}</text>
            </view>
          </view>
        </view>

        <!-- 打赏区 -->
        <view class="mt-8 pt-6" style="border-top: 1px solid #E8E0D5;">
          <view class="flex items-center justify-between mb-4">
            <view class="flex items-center gap-2">
              <text class="text-accent text-lg">🎁</text>
              <text class="font-medium text-foreground">打赏作者</text>
            </view>
            <text class="text-[12px] text-muted-foreground">{{ post.rewardCount }}人已打赏</text>
          </view>
          <view class="flex items-center justify-center gap-3 mb-4">
            <view
              v-for="amount in [5, 10, 20, 50]"
              :key="amount"
              class="w-16 h-16 rounded-xl bg-background flex flex-col items-center justify-center"
              @click="showRewardModal = true"
            >
              <text class="text-accent text-base mb-1"></text>
              <text class="text-[14px] font-medium text-foreground">{{ amount }}</text>
            </view>
          </view>
          <text class="block text-center text-[12px] text-muted-foreground">累计收到 {{ post.reward }} 国学币打赏</text>
        </view>
      </view>

      <!-- 互动数据 -->
      <view class="px-4 py-4 bg-background flex items-center justify-around">
        <view class="flex flex-col items-center" @click="handleLike">
          <text class="text-2xl mb-1" :class="isLiked ? 'text-primary' : 'text-ink-soft'"></text>
          <text class="text-[12px]" :class="isLiked ? 'text-primary' : 'text-ink-soft'">{{ likes }}</text>
        </view>
        <view class="flex flex-col items-center">
          <text class="text-2xl mb-1 text-ink-soft"></text>
          <text class="text-[12px] text-ink-soft">{{ post.comments }}</text>
        </view>
        <view class="flex flex-col items-center" @click="handleCollect">
          <text class="text-2xl mb-1" :class="isCollected ? 'text-accent' : 'text-ink-soft'">🔖</text>
          <text class="text-[12px]" :class="isCollected ? 'text-accent' : 'text-ink-soft'">{{ collects }}</text>
        </view>
        <view class="flex flex-col items-center">
          <text class="text-2xl mb-1 text-ink-soft">↗️</text>
          <text class="text-[12px] text-ink-soft">{{ post.shares }}</text>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="px-4 pt-4">
        <view class="flex items-center justify-between mb-2">
          <text class="font-semibold text-foreground">评论 {{ post.comments }}</text>
          <view class="flex items-center gap-2">
            <text class="text-[13px] text-primary">最热</text>
            <text class="text-[#E8E0D5]">|</text>
            <text class="text-[13px] text-muted-foreground">最新</text>
          </view>
        </view>

        <!-- 评论列表 -->
        <view v-for="comment in comments" :key="comment.id" class="py-4" style="border-bottom: 1px solid #F5F0E8;">
          <view class="flex gap-3">
            <image :src="comment.author.avatar" mode="aspectFill" class="w-9 h-9 rounded-full flex-shrink-0" />
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2 mb-1">
                <text class="text-[14px] font-medium text-foreground">{{ comment.author.name }}</text>
                <text v-if="comment.author.level" class="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded">Lv.{{ comment.author.level }}</text>
                <text v-if="comment.author.title" class="px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] rounded">{{ comment.author.title }}</text>
                <text v-if="comment.isPinned" class="px-1.5 py-0.5 bg-success/10 text-success text-[10px] rounded flex items-center gap-0.5">📌 置顶</text>
              </view>
              <text class="text-[14px] text-foreground block leading-relaxed mb-2">{{ comment.content }}</text>
              <view class="flex items-center gap-4">
                <text class="text-[12px] text-muted-foreground">{{ comment.createdAt }}</text>
                <view class="flex items-center gap-1 text-[12px] text-muted-foreground" @click="handleCommentLike(comment.id)">
                  <text class="text-xs" :class="comment.isLiked ? 'text-primary' : ''"></text>
                  <text v-if="comment.likes > 0" class="text-xs" :class="comment.isLiked ? 'text-primary' : ''">{{ comment.likes }}</text>
                </view>
                <view class="text-[12px] text-muted-foreground" @click="handleReply(comment)">回复</view>
              </view>

              <!-- 子评论 -->
              <view v-if="comment.replies && comment.replies.length > 0" class="mt-3 pl-3" style="border-left: 2px solid #F5F0E8;">
                <!-- 未展开 -->
                <view v-if="!expandedReplies.has(comment.id)" class="text-[13px] text-primary flex items-center gap-1" @click="toggleReplies(comment.id)">
                  <text>展开{{ comment.replies.length }}条回复</text>
                  <text class="text-sm">↓</text>
                </view>
                <!-- 已展开 -->
                <view v-else class="space-y-3">
                  <view v-for="reply in comment.replies" :key="reply.id" class="flex gap-2">
                    <image :src="reply.author.avatar" mode="aspectFill" class="w-7 h-7 rounded-full flex-shrink-0" />
                    <view>
                      <view class="flex items-center gap-1 mb-0.5">
                        <text class="text-[13px] font-medium text-foreground">{{ reply.author.name }}</text>
                        <text v-if="reply.author.title" class="px-1 py-0.5 bg-accent/10 text-accent text-[9px] rounded">{{ reply.author.title }}</text>
                      </view>
                      <text class="text-[13px] text-foreground">{{ reply.content }}</text>
                      <view class="flex items-center gap-3 mt-1">
                        <text class="text-[11px] text-muted-foreground">{{ reply.createdAt }}</text>
                        <view class="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <text class="text-xs"></text>
                          <text>{{ reply.likes }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                  <view class="text-[12px] text-muted-foreground flex items-center gap-1" @click="toggleReplies(comment.id)">
                    <text>收起</text>
                    <text class="text-sm">↑</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </main>

    <!-- 底部评论输入 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white px-4 py-3 z-50" style="border-top: 1px solid #E8E0D5; padding-bottom: 34px;">
      <view v-if="replyTo" class="flex items-center justify-between mb-2 px-3 py-1.5 bg-[#F5F0E8] rounded-lg">
        <text class="text-[12px] text-ink-soft flex items-center gap-1">
          <text class="text-xs">@</text>
          回复 {{ replyTo.author.name }}
        </text>
        <view @click="replyTo = null">
          <text class="text-base text-muted-foreground">✕</text>
        </view>
      </view>
      <view class="flex items-center gap-3">
        <input
          v-model="commentText"
          :placeholder="replyTo ? '回复 ' + replyTo.author.name + '...' : '写评论...'"
          class="flex-1 h-10 px-4 bg-[#F5F0E8] rounded-full text-[14px]"
          :class="{ 'outline-none': true }"
          ref="inputRef"
        />
        <view
          class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="commentText.trim() ? 'bg-primary text-white' : 'bg-[#E8E0D5] text-muted-foreground'"
          @click="handleSubmitComment"
        >
          <text class="text-base">➤</text>
        </view>
      </view>
    </view>

    <!-- 图片预览 -->
    <view
      v-if="previewImage"
      class="fixed inset-0 z-50 bg-black flex items-center justify-center"
      @click="previewImage = null"
    >
      <view class="absolute top-4 right-4 text-white" @click.stop="previewImage = null">
        <text class="text-2xl">✕</text>
      </view>
      <image :src="previewImage" mode="aspectFit" class="w-full h-full" />
    </view>

    <!-- 打赏弹窗 -->
    <view v-if="showRewardModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <view class="w-[85%] max-w-sm bg-white rounded-2xl p-6">
        <view class="text-center mb-6">
          <view class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style="background: linear-gradient(to bottom right, #C9A96E, #E8D5B5);">
            <text class="text-white text-3xl">🎁</text>
          </view>
          <text class="text-[18px] font-bold text-foreground block mb-1">打赏作者</text>
          <text class="text-[14px] text-muted-foreground block">感谢 {{ post.author.name }} 的精彩分享</text>
        </view>
        <view class="grid grid-cols-4 gap-2 mb-6">
          <view
            v-for="amount in [5, 10, 20, 50, 100, 200, 500, 1000]"
            :key="amount"
            class="py-2 rounded-lg bg-background text-[14px] font-medium text-foreground text-center"
          >
            <text>{{ amount }}</text>
          </view>
        </view>
        <view class="flex gap-3">
          <view
            class="flex-1 py-3 rounded-full bg-[#F5F0E8] text-ink-soft text-[14px] font-medium text-center"
            @click="showRewardModal = false"
          >
            <text>取消</text>
          </view>
          <view
            class="flex-1 py-3 rounded-full text-white text-[14px] font-medium text-center"
            style="background: linear-gradient(to right, #C9A96E, #E8D5B5);"
            @click="showRewardModal = false"
          >
            <text>确认打赏</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// 帖子详情数据 - 增强版
const postDetail = {
  id: '1',
  type: 'article', // normal | article | audio | qa
  circleId: '1',
  circleName: '八字命理研习社',
  title: '八字命理中的十神关系详解 - 正财与偏财的本质区别',
  content: [
    '在八字命理学中，十神是分析命局的核心概念之一。今天我们重点探讨**正财**与**偏财**的区别，这对于理解一个人的财运特质至关重要。',
    '',
    '## 一、正财的定义与特性',
    '',
    '正财，是指日干所克之物，且阴阳相异者。比如甲木日主见己土、乙木日主见戊土，这都是正财。',
    '',
    '**正财的核心特质：**',
    '1. 代表正当、稳定的收入来源',
    '2. 体现务实、保守的理财观念',
    '3. 象征妻财（男命）、俸禄、工薪',
    '4. 为人勤俭、重视积累',
    '',
    '> 《滴天髓》云："财为养命之源，不可无，亦不可过旺。"',
    '',
    '## 二、偏财的定义与特性',
    '',
    '偏财，同样是日干所克之物，但阴阳相同。如甲木日主见戊土、乙木日主见己土。',
    '',
    '**偏财的核心特质：**',
    '1. 代表意外之财、投机收入',
    '2. 体现慷慨、大方的用财态度',
    '3. 象征父亲、情人（男命）、横财',
    '4. 为人豪爽、不拘小节',
    '',
    '## 三、实战案例分析',
    '',
    '让我们看一个具体的八字案例：',
    '',
    '**八字：甲子、丙寅、戊辰、壬戌**',
    '',
    '此八字日主戊土，生于寅月木旺之时。年干甲木、月令寅木均为七杀（偏官），时干壬水为偏财。',
    '',
    '从财运角度分析：',
    '- 时柱见偏财壬水，主中晚年财运较好',
    '- 偏财坐戌土（日主之根），财有根基',
    '- 但财星被年月木克，需注意投资风险',
    '',
    '## 四、总结与建议',
    '',
    '正财与偏财各有特点，在实际批命中需要结合整体格局来判断。',
    '',
    '**实践建议：**',
    '- 正财旺者适合稳定职业，如公务员、企业职员',
    '- 偏财旺者可尝试投资理财，但需控制风险',
    '- 财星太弱需补财运，可从方位、颜色等方面调理',
    '',
    '---',
    '',
    '*本文为原创内容，欢迎讨论交流。如需转载请注明出处。*',
  ].join('\n'),
  images: [
    { url: 'https://picsum.photos/800/400?random=101', caption: '图1：十神关系图解' },
    { url: 'https://picsum.photos/800/400?random=102', caption: '图2：八字排盘示例' },
  ],
  audio: {
    url: '/audio/lesson-01.mp3',
    duration: 856,
    title: '音频讲解版',
  },
  author: {
    id: '1',
    name: '周易大师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master',
    title: '资深命理师',
    level: 8,
    levelName: '一代宗师',
    isFollowed: false,
    followers: 12800,
    posts: 256,
  },
  createdAt: '2024-01-15 10:30',
  readTime: 8,
  views: 3256,
  likes: 328,
  collects: 156,
  comments: 89,
  shares: 45,
  isLiked: false,
  isCollected: false,
  isPinned: true,
  isEssence: true,
  reward: 128,
  rewardCount: 23,
}

// 评论数据
const commentsData = [
  {
    id: 'c1',
    content: '老师讲得太好了！正财偏财的区别一直困扰我很久，看完这篇文章豁然开朗。',
    author: { id: 'u1', name: '命理新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u1', level: 3 },
    createdAt: '1小时前',
    likes: 28,
    isLiked: false,
    isPinned: true,
    replies: [
      { id: 'c1-r1', content: '同感！收藏了', author: { id: 'u2', name: '学习中', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u2' }, createdAt: '45分钟前', likes: 5, isLiked: false },
      { id: 'c1-r2', content: '感谢支持，有问题随时讨论', author: { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', title: '作者' }, createdAt: '30分钟前', likes: 12, isLiked: false },
    ],
  },
  {
    id: 'c2',
    content: '请问老师，如果八字中正财偏财都有，而且力量差不多，应该怎么分析呢？',
    author: { id: 'u3', name: '易学爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u3', level: 4 },
    createdAt: '30分钟前',
    likes: 15,
    isLiked: true,
    replies: [],
  },
]

// 格式化时长
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins + ':' + secs.toString().padStart(2, '0')
}

// Markdown 渲染
function renderMarkdown(content: string): string {
  const lines = content.trim().split('\n')
  let html = ''

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('## ')) {
      html += '<h2 style="font-size:18px;font-weight:700;color:#2C2C2C;margin-top:24px;margin-bottom:12px;">' + escapeHtml(trimmed.slice(3)) + '</h2>'
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      html += '<p style="font-size:15px;font-weight:600;color:#2C2C2C;margin:8px 0;">' + escapeHtml(trimmed.slice(2, -2)) + '</p>'
    } else if (trimmed.startsWith('> ')) {
      html += '<blockquote style="border-left:4px solid #C9A96E;background:#FFF8E7;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;"><p style="font-size:14px;color:#666;font-style:italic;margin:0;">' + escapeHtml(trimmed.slice(2)) + '</p></blockquote>'
    } else if (trimmed.startsWith('- ')) {
      html += '<li style="font-size:15px;color:#2C2C2C;line-height:1.8;margin-left:16px;margin-top:4px;margin-bottom:4px;">' + escapeHtml(trimmed.slice(2)) + '</li>'
    } else if (/^\d+\. /.test(trimmed)) {
      html += '<li style="font-size:15px;color:#2C2C2C;line-height:1.8;margin-left:16px;margin-top:4px;margin-bottom:4px;list-style-type:decimal;">' + escapeHtml(trimmed.replace(/^\d+\. /, '')) + '</li>'
    } else if (trimmed.startsWith('---')) {
      html += '<hr style="margin:24px 0;border:none;border-top:1px solid #E8E0D5;" />'
    } else if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
      html += '<p style="font-size:14px;color:#999;font-style:italic;margin:8px 0;">' + escapeHtml(trimmed.slice(1, -1)) + '</p>'
    } else if (trimmed) {
      const boldProcessed = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      html += '<p style="font-size:15px;color:#2C2C2C;line-height:1.8;margin:8px 0;">' + boldProcessed + '</p>'
    }
  })

  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// State
const post = ref(postDetail)
const comments = ref(JSON.parse(JSON.stringify(commentsData)))
const isLiked = ref(postDetail.isLiked)
const isCollected = ref(postDetail.isCollected)
const likes = ref(postDetail.likes)
const collects = ref(postDetail.collects)
const isFollowed = ref(postDetail.author.isFollowed)
const commentText = ref('')
const replyTo = ref<any>(null)
const showRewardModal = ref(false)
const previewImage = ref<string | null>(null)
const expandedReplies = ref(new Set<string>())
const audioIsPlaying = ref(false)
const audioProgress = ref(0)
const audioCurrentTime = ref(0)
const inputRef = ref<any>(null)

// 渲染后的 Markdown 内容
const renderedContent = computed(() => renderMarkdown(post.value.content))

// 音频播放器定时器
let audioTimerInterval: ReturnType<typeof setInterval> | null = null

watch(audioIsPlaying, (playing) => {
  if (playing) {
    audioTimerInterval = setInterval(() => {
      if (audioCurrentTime.value >= postDetail.audio.duration) {
        audioIsPlaying.value = false
        audioCurrentTime.value = 0
        audioProgress.value = 0
        return
      }
      audioCurrentTime.value++
      audioProgress.value = (audioCurrentTime.value / postDetail.audio.duration) * 100
    }, 1000)
  } else {
    if (audioTimerInterval) {
      clearInterval(audioTimerInterval)
      audioTimerInterval = null
    }
  }
})

onUnmounted(() => {
  if (audioTimerInterval) {
    clearInterval(audioTimerInterval)
    audioTimerInterval = null
  }
})

function toggleAudioPlay() {
  audioIsPlaying.value = !audioIsPlaying.value
}

function handleLike() {
  isLiked.value = !isLiked.value
  likes.value += isLiked.value ? 1 : -1
}

function handleCollect() {
  isCollected.value = !isCollected.value
  collects.value += isCollected.value ? 1 : -1
}

function handleFollow() {
  isFollowed.value = !isFollowed.value
}

function handleReply(comment: any) {
  replyTo.value = comment
  // 聚焦输入框
  if (inputRef.value) {
    inputRef.value.focus?.()
  }
}

function handleCommentLike(commentId: string) {
  const comment = comments.value.find((c: any) => c.id === commentId)
  if (comment) {
    comment.isLiked = !comment.isLiked
    comment.likes += comment.isLiked ? 1 : -1
  }
}

function handleSubmitComment() {
  if (!commentText.value.trim()) return
    // 提交评论
  const newComment = {
    id: 'c' + Date.now(),
    userName: '当前用户',
    content: commentText.value,
    time: '刚刚',
    likes: 0,
    isLiked: false,
    replies: [],
  }
  comments.value.unshift(newComment)
  commentText.value = ''
  replyTo.value = null
  uni.showToast({ title: '评论已发送', icon: 'success' })
}

function toggleReplies(commentId: string) {
  const newSet = new Set(expandedReplies.value)
  if (newSet.has(commentId)) {
    newSet.delete(commentId)
  } else {
    newSet.add(commentId)
  }
  expandedReplies.value = newSet
}

function goBack() {
  uni.navigateBack()
}

function goCircle() {
  uni.navigateTo({ url: '/pages/circles/id-detail/index' })
}

function goUser(id: string) {
  uni.showToast({ title: '用户主页(Mock)', icon: 'none' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
