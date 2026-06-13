<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="shrink-0 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view @click="goBack" class="w-7 h-7 flex items-center justify-center -ml-1">
          <text class="text-lg text-foreground">←</text>
        </view>
        <text class="font-semibold text-foreground">发布内容</text>
        <view
          @click="canPublish && handlePublish()"
          :class="[
            'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
            canPublish
              ? 'bg-primary text-white'
              : 'bg-secondary text-muted-foreground'
          ]"
        >
          发布
        </view>
      </view>
    </view>

    <!-- 可滚动内容 -->
    <scroll-view scroll-y class="flex-1 overflow-y-auto">
      <view class="p-4 space-y-4" style="padding-bottom: 100px;">
        <!-- 内容类型选择 -->
        <view class="flex gap-2">
          <view
            v-for="type in contentTypes"
            :key="type.id"
            @click="selectContentType(type.id)"
            :class="[
              'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
              contentType === type.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-white'
            ]"
          >
            <text :class="['text-lg', contentType === type.id ? 'text-primary' : 'text-muted-foreground']">{{ type.icon }}</text>
            <text :class="['text-sm font-medium', contentType === type.id ? 'text-primary' : 'text-foreground']">{{ type.label }}</text>
            <text class="text-[10px] text-muted-foreground">{{ type.desc }}</text>
          </view>
        </view>

        <!-- 标题输入 帖子/文章 -->
        <input
          v-if="contentType === 'post' || contentType === 'article'"
          v-model="title"
          type="text"
          placeholder="请输入标题（选填）"
          class="w-full px-4 py-3 bg-white rounded-xl border border-border text-foreground placeholder:text-muted-foreground"
        />

        <!-- 标题输入 短视频 -->
        <input
          v-if="contentType === 'video'"
          v-model="title"
          type="text"
          placeholder="添加视频标题，获得更多曝光"
          class="w-full px-4 py-3 bg-white rounded-xl border border-border text-foreground placeholder:text-muted-foreground"
        />

        <!-- 正文编辑区 帖子/文章 -->
        <view v-if="contentType === 'post' || contentType === 'article'" class="bg-white rounded-xl border border-border overflow-hidden">
          <!-- 文章工具栏 -->
          <view v-if="contentType === 'article'" class="flex items-center gap-1 px-3 py-2 border-b border-border bg-secondary/30">
            <view class="p-2 rounded">
              <text class="text-sm text-muted-foreground font-bold">B</text>
            </view>
            <view class="p-2 rounded">
              <text class="text-sm text-muted-foreground italic">I</text>
            </view>
            <view class="p-2 rounded">
              <text class="text-sm text-muted-foreground">≡</text>
            </view>
            <view class="p-2 rounded">
              <text class="text-sm text-muted-foreground"></text>
            </view>
            <view class="p-2 rounded">
              <text class="text-sm text-muted-foreground">☰</text>
            </view>
            <view class="flex-1" />
            <view
              @click="showRecommendPanel = !showRecommendPanel"
              class="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium"
            >
              <text class="text-xs">➕</text>
              <text>推荐卡片</text>
            </view>
          </view>
          <textarea
            v-model="content"
            :placeholder="contentType === 'article' ? '开始撰写你的文章...' : '分享你的想法...'"
            class="w-full min-h-[200px] px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground resize-none"
          />
        </view>

        <!-- 推荐卡片选择面板 -->
        <view v-if="showRecommendPanel && contentType === 'article'" class="p-4 bg-white border border-primary/30 rounded-xl">
          <text class="text-sm font-medium text-foreground block mb-3">插入推荐卡片</text>
          <view class="grid grid-cols-5 gap-2">
            <view
              v-for="card in recommendCardTypes"
              :key="card.id"
              @click="handleInsertCard(card.id)"
              class="flex flex-col items-center gap-1.5 p-3 rounded-lg"
            >
              <view :class="['w-10 h-10 rounded-full flex items-center justify-center', card.color]">
                <text class="text-lg">{{ card.icon }}</text>
              </view>
              <text class="text-xs text-foreground">{{ card.label }}</text>
            </view>
          </view>
        </view>

        <!-- 媒体上传区 - 帖子模式 -->
        <view v-if="contentType === 'post'" class="space-y-2">
          <view class="flex items-center justify-between">
            <text class="text-sm text-muted-foreground">添加图片/视频</text>
            <text class="text-xs text-muted-foreground">{{ uploadedMedia.length }}/9</text>
          </view>
          <view class="grid grid-cols-3 gap-2">
            <view
              v-for="media in uploadedMedia"
              :key="media.id"
              class="aspect-square relative bg-secondary rounded-lg overflow-hidden"
            >
              <view class="w-full h-full flex items-center justify-center">
                <text class="text-2xl text-muted-foreground">{{ media.type === 'video' ? '' : '️' }}</text>
              </view>
              <view
                @click="handleRemoveMedia(media.id)"
                class="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
              >
                <text class="text-xs text-white">✕</text>
              </view>
            </view>
            <view
              v-if="uploadedMedia.length < 9"
              @click="handleAddMedia"
              class="aspect-square bg-secondary rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1"
            >
              <text class="text-2xl text-muted-foreground">➕</text>
              <text class="text-xs text-muted-foreground">添加</text>
            </view>
          </view>
        </view>

        <!-- 短视频上传区 -->
        <view v-if="contentType === 'video'" class="space-y-4">
          <!-- 视频上传 -->
          <view class="space-y-2">
            <text class="text-sm text-muted-foreground">上传视频</text>
            <view v-if="uploadedMedia.length === 0">
              <view
                @click="handleAddMedia"
                class="w-full aspect-video bg-secondary rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2"
              >
                <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <text class="text-xl text-primary"></text>
                </view>
                <text class="text-sm text-muted-foreground">点击上传视频</text>
                <text class="text-xs text-muted-foreground">支持 MP4、MOV 格式，最大 500MB</text>
              </view>
            </view>
            <view v-else class="relative aspect-video bg-secondary rounded-xl overflow-hidden">
              <view class="w-full h-full flex items-center justify-center">
                <text class="text-3xl text-muted-foreground"></text>
              </view>
              <view class="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                <text>{{ uploadedMedia[0].name }}</text>
              </view>
              <view
                @click="uploadedMedia = []"
                class="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
              >
                <text class="text-sm text-white">✕</text>
              </view>
            </view>
          </view>

          <!-- 封面选择 -->
          <view v-if="uploadedMedia.length > 0" class="space-y-2">
            <text class="text-sm text-muted-foreground">选择封面</text>
            <view class="flex gap-2">
              <view
                v-for="i in 3"
                :key="i"
                @click="videoCover = String(i)"
                :class="[
                  'flex-1 aspect-video bg-secondary rounded-lg border-2 flex items-center justify-center',
                  videoCover === String(i) ? 'border-primary' : 'border-transparent'
                ]"
              >
                <text class="text-xs text-muted-foreground">第{{ i }}帧</text>
              </view>
              <view class="flex-1 aspect-video bg-secondary rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5">
                <text class="text-sm text-muted-foreground">➕</text>
                <text class="text-[10px] text-muted-foreground">自定义</text>
              </view>
            </view>
          </view>

          <!-- 关联商品 -->
          <view
            v-if="uploadedMedia.length > 0"
            @click="linkedProducts = [1]"
            class="p-4 bg-white rounded-xl"
          >
            <view class="flex items-center justify-between">
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <text class="text-lg text-orange-500">️</text>
                </view>
                <view>
                  <text class="text-sm font-medium text-foreground">关联商品</text>
                  <text class="text-xs text-muted-foreground block">
                    {{ linkedProducts.length > 0 ? `已关联 ${linkedProducts.length} 件商品` : '从商城选择商品进行带货' }}
                  </text>
                </view>
              </view>
              <text class="text-lg text-muted-foreground">›</text>
            </view>
          </view>
        </view>

        <!-- 关联圈子 -->
        <view
          @click="showCircleSelect = !showCircleSelect"
          class="p-4 bg-white rounded-xl"
        >
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                <text>{{ selectedCircle.name[0] }}</text>
              </view>
              <view>
                <text class="text-sm font-medium text-foreground">{{ selectedCircle.name }}</text>
                <text class="text-xs text-muted-foreground block">{{ selectedCircle.members }} 成员</text>
              </view>
            </view>
            <view class="flex items-center gap-2">
              <view class="text-xs border border-primary/30 text-primary px-2 py-0.5 rounded">
                发布到此圈子
              </view>
              <text class="text-lg text-muted-foreground">›</text>
            </view>
          </view>
        </view>

        <!-- 圈子选择面板 -->
        <view v-if="showCircleSelect" class="p-2 bg-white border border-primary/30 rounded-xl">
          <view
            v-for="circle in myCircles"
            :key="circle.id"
            @click="selectCircle(circle)"
            :class="[
              'w-full flex items-center gap-3 p-3 rounded-lg',
              selectedCircle.id === circle.id ? 'bg-primary/10' : ''
            ]"
          >
            <view class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
              <text>{{ circle.name[0] }}</text>
            </view>
            <view class="flex-1 text-left">
              <text class="text-sm text-foreground">{{ circle.name }}</text>
              <text class="text-xs text-muted-foreground block">{{ circle.members }} 成员</text>
            </view>
            <view v-if="selectedCircle.id === circle.id" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <text class="text-white text-xs">✓</text>
            </view>
          </view>
        </view>

        <!-- 发布设置 -->
        <view class="bg-white rounded-xl overflow-hidden">
          <view
            @click="showSettings = !showSettings"
            class="w-full flex items-center justify-between p-4"
          >
            <view class="flex items-center gap-3">
              <text class="text-lg text-muted-foreground">⚙️</text>
              <text class="text-sm font-medium text-foreground">发布设置</text>
            </view>
            <text :class="['text-lg text-muted-foreground transition-transform', showSettings && 'rotate-90']">›</text>
          </view>

          <view v-if="showSettings" class="border-t border-border">
            <!-- 定时发布 -->
            <view class="flex items-center justify-between p-4 border-b border-border">
              <view class="flex items-center gap-3">
                <text class="text-lg text-muted-foreground">🕐</text>
                <view>
                  <text class="text-sm text-foreground">定时发布</text>
                  <text v-if="scheduleEnabled && scheduleTime" class="text-xs text-primary block">{{ scheduleTime }}</text>
                </view>
              </view>
              <view
                @click="scheduleEnabled = !scheduleEnabled"
                :class="[
                  'w-11 h-6 rounded-full relative',
                  scheduleEnabled ? 'bg-primary' : 'bg-secondary'
                ]"
              >
                <view :class="[
                  'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                  scheduleEnabled ? 'left-5' : 'left-0.5'
                ]" />
              </view>
            </view>

            <!-- 定时时间选择 -->
            <view v-if="scheduleEnabled" class="p-4 border-b border-border bg-secondary/30">
              <view class="flex items-center gap-2">
                <text class="text-sm text-muted-foreground"></text>
                <input
                  v-model="scheduleTime"
                  type="text"
                  placeholder="选择日期时间"
                  class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
                />
              </view>
            </view>

            <!-- 推送到首页 - 仅文章可见 -->
            <view v-if="contentType === 'article'" class="flex items-center justify-between p-4">
              <view class="flex items-center gap-3">
                <text class="text-lg text-muted-foreground">🌐</text>
                <view>
                  <text class="text-sm text-foreground">推送到首页</text>
                  <text class="text-xs text-muted-foreground block">需经平台审核</text>
                </view>
              </view>
              <view
                @click="pushToHome = !pushToHome"
                :class="[
                  'w-11 h-6 rounded-full relative',
                  pushToHome ? 'bg-primary' : 'bg-secondary'
                ]"
              >
                <view :class="[
                  'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                  pushToHome ? 'left-5' : 'left-0.5'
                ]" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border z-50">
      <view class="flex items-center justify-between p-4 max-w-lg mx-auto">
        <view class="px-6 py-2.5 rounded-full border border-border text-foreground text-sm font-medium">
          存为草稿
        </view>
        <view
          @click="canPublish && handlePublish()"
          :class="[
            'px-8 py-2.5 rounded-full text-sm font-medium transition-all',
            canPublish
              ? 'bg-primary text-white'
              : 'bg-secondary text-muted-foreground'
          ]"
        >
          {{ scheduleEnabled ? '定时发布' : '立即发布' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type ContentType = 'post' | 'article' | 'video'

interface UploadedMedia {
  id: string
  type: 'image' | 'video'
  url: string
  name: string
}

const contentTypes = [
  { id: 'post' as ContentType, label: '帖子', icon: '', desc: '图文动态，快速分享' },
  { id: 'article' as ContentType, label: '文章', icon: '', desc: '深度长文，知识沉淀' },
  { id: 'video' as ContentType, label: '短视频', icon: '', desc: '视频内容，生动展示' },
]

const recommendCardTypes = [
  { id: 'circle', label: '圈子', icon: '', color: 'bg-blue-500/10 text-blue-500' },
  { id: 'course', label: '课程', icon: '', color: 'bg-green-500/10 text-green-500' },
  { id: 'product', label: '商品', icon: '️', color: 'bg-orange-500/10 text-orange-500' },
  { id: 'paipan', label: '排盘', icon: '🧭', color: 'bg-primary/10 text-primary' },
  { id: 'agent', label: '智能体', icon: '🤖', color: 'bg-purple-500/10 text-purple-500' },
]

const myCircles = [
  { id: 1, name: '八字命理研习社', avatar: '', members: 1280 },
  { id: 2, name: '紫微斗数交流群', avatar: '', members: 856 },
  { id: 3, name: '风水堪舆学院', avatar: '', members: 2100 },
]

const contentType = ref<ContentType>('post')
const title = ref('')
const content = ref('')
const uploadedMedia = ref<UploadedMedia[]>([])
const selectedCircle = ref(myCircles[0])
const showCircleSelect = ref(false)
const showSettings = ref(false)
const showRecommendPanel = ref(false)
const scheduleEnabled = ref(false)
const pushToHome = ref(false)
const scheduleTime = ref('')
const videoCover = ref('')
const linkedProducts = ref<number[]>([])

const canPublish = computed(() => {
  return title.value.trim() !== '' || content.value.trim() !== '' || uploadedMedia.value.length > 0
})

function goBack() {
  uni.navigateBack()
}

function selectContentType(id: ContentType) {
  contentType.value = id
  uploadedMedia.value = []
}

function handleAddMedia() {
  const newMedia: UploadedMedia = {
    id: Date.now().toString(),
    type: contentType.value === 'video' ? 'video' : 'image',
    url: '',
    name: contentType.value === 'video' ? 'video_001.mp4' : `image_${uploadedMedia.value.length + 1}.jpg`,
  }
  if (contentType.value === 'video') {
    uploadedMedia.value = [newMedia]
  } else if (uploadedMedia.value.length < 9) {
    uploadedMedia.value = [...uploadedMedia.value, newMedia]
  }
}

function handleRemoveMedia(id: string) {
  uploadedMedia.value = uploadedMedia.value.filter((m) => m.id !== id)
}

function handleInsertCard(type: string) {
  content.value = content.value + `\n[${type.toUpperCase()}_CARD]\n`
  showRecommendPanel.value = false
}

function selectCircle(circle: (typeof myCircles)[0]) {
  selectedCircle.value = circle
  showCircleSelect.value = false
}

function handlePublish() {
  // 发布逻辑 - 等待后续实现
}
</script>
