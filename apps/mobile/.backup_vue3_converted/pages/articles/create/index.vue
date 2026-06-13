<template>
  <!-- 无权限提示 -->
  <view v-if="!hasPublishPermission" class="min-h-screen bg-background flex flex-col">
    <view class="sticky top-0 z-50 bg-white border-b border-border" style="padding-top:var(--status-bar-height)">
      <view class="flex items-center justify-between px-4 h-12">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="font-medium text-foreground">写文章</text>
        <view class="w-9" />
      </view>
    </view>
    <view class="flex-1 flex flex-col items-center justify-center p-6">
      <text class="text-6xl mb-4">👑</text>
      <text class="text-lg font-semibold text-foreground mb-2">暂无发布权限</text>
      <text class="text-sm text-muted-foreground text-center mb-6">
        根据平台规则，只有圈主和嘉宾才能发布文章。
      </text>
      <text class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium" @click="goTo('/pages/circles/create/index')">
        <text class="text-white">+</text>
        <text>创建圈子</text>
      </text>
    </view>
  </view>

  <!-- 文章编辑器 -->
  <view v-else class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border" style="padding-top:var(--status-bar-height)">
      <view class="flex items-center justify-between px-4 h-12">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="font-medium text-foreground">写文章</text>
        <view class="flex items-center gap-2">
          <view @click="showPreview = !showPreview" class="p-2 text-muted-foreground">
            <text>️</text>
          </view>
          <view @click="handleSave" class="px-3 py-1 rounded-lg bg-secondary text-sm text-foreground">
            <text>{{ saving ? '保存中...' : '存草稿' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 选择圈子 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="block text-sm font-medium text-foreground mb-2">发布到 <text class="text-primary">*</text></text>
        <view @click="showCirclePicker = true" :class="['w-full p-3 rounded-xl border flex items-center justify-between', selectedCircleData ? 'bg-primary/5 border-primary/30' : 'bg-background border-transparent']">
          <view v-if="selectedCircleData" class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <text></text>
            </view>
            <view class="text-left">
              <text class="font-medium text-foreground block">{{ selectedCircleData.name }}</text>
              <text class="text-xs text-muted-foreground">{{ selectedCircleData.role === 'owner' ? '圈主' : '嘉宾' }}</text>
            </view>
          </view>
          <view v-else class="flex items-center gap-2 text-muted-foreground">
            <text></text>
            <text>选择发布的圈子</text>
          </view>
          <text class="text-sm text-muted-foreground">▼</text>
        </view>
      </view>

      <!-- 封面图 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="block text-sm font-medium text-foreground mb-2">封面图</text>
        <view v-if="cover" class="relative aspect-video rounded-xl overflow-hidden bg-secondary">
          <image :src="cover" mode="aspectFill" class="w-full h-full" />
          <view @click="cover = null" class="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
            <text class="text-white text-sm">✕</text>
          </view>
        </view>
        <view v-else @click="handlePickCover" class="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <text class="text-3xl"></text>
          <text class="text-sm">添加封面图（建议16:9）</text>
        </view>
      </view>

      <!-- 标题 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <input
          v-model="title"
          placeholder="请输入文章标题"
          class="w-full text-lg font-medium text-foreground placeholder:text-muted-foreground outline-none"
          maxlength="50"
        />
        <text class="text-right text-xs text-muted-foreground block mt-1">{{ title.length }}/50</text>
      </view>

      <!-- 正文编辑 -->
      <view class="bg-white rounded-xl shadow-sm overflow-hidden">
        <!-- 工具栏 -->
        <view class="flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
          <view class="p-2 text-muted-foreground"><text class="font-bold">B</text></view>
          <view class="p-2 text-muted-foreground"><text class="italic">I</text></view>
          <view class="w-px h-5 bg-[#E8E0D5] mx-1" />
          <view class="p-2 text-muted-foreground"><text class="font-bold text-sm">H1</text></view>
          <view class="p-2 text-muted-foreground"><text class="font-bold text-sm">H2</text></view>
          <view class="w-px h-5 bg-[#E8E0D5] mx-1" />
          <view class="p-2 text-muted-foreground"><text>≡</text></view>
          <view class="p-2 text-muted-foreground"><text>#.</text></view>
          <view class="p-2 text-muted-foreground"><text>"</text></view>
          <view class="w-px h-5 bg-[#E8E0D5] mx-1" />
          <view class="p-2 text-muted-foreground"><text>️</text></view>
          <view class="p-2 text-muted-foreground"><text></text></view>
        </view>
        <!-- 正文输入 -->
        <textarea
          v-model="content"
          placeholder="开始写作，分享你的知识与见解..."
          class="w-full min-h-[300px] p-4 text-[15px] text-foreground leading-relaxed placeholder:text-muted-foreground outline-none resize-none bg-transparent"
        />
      </view>

      <!-- 挂载内容 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-medium text-foreground">挂载推荐内容</text>
          <text class="text-xs text-muted-foreground">已添加 {{ embeddedItems.length }}/5</text>
        </view>

        <!-- 已添加的挂载内容 -->
        <view v-if="embeddedItems.length > 0" class="space-y-2 mb-3">
          <view v-for="item in embeddedItems" :key="item.type + '-' + item.id" class="flex items-center gap-3 p-2 bg-background rounded-lg">
            <view :class="['w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm', item.type === 'product' ? 'bg-primary' : item.type === 'course' ? 'bg-blue-500' : item.type === 'activity' ? 'bg-orange-500' : 'bg-purple-500']">
              <text>{{ item.type === 'product' ? '' : item.type === 'course' ? '' : item.type === 'activity' ? '📍' : '' }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground truncate block">{{ item.data.name || item.data.title }}</text>
              <text class="text-xs text-muted-foreground">
                {{ item.type === 'product' ? '商品' : item.type === 'course' ? '课程' : item.type === 'activity' ? '活动' : '智能体' }}
              </text>
            </view>
            <view @click="handleRemoveEmbed(item.type, item.id)" class="p-1.5 text-muted-foreground">
              <text class="text-sm">🗑️</text>
            </view>
          </view>
        </view>

        <!-- 添加按钮 -->
        <view v-if="embeddedItems.length < 5" class="grid grid-cols-4 gap-2">
          <view @click="openEmbedPicker('product')" class="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-border">
            <text class="text-lg text-primary">️</text>
            <text class="text-xs text-muted-foreground">商品</text>
          </view>
          <view @click="openEmbedPicker('course')" class="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-border">
            <text class="text-lg text-blue-500"></text>
            <text class="text-xs text-muted-foreground">课程</text>
          </view>
          <view @click="openEmbedPicker('activity')" class="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-border">
            <text class="text-lg text-orange-500">📍</text>
            <text class="text-xs text-muted-foreground">活动</text>
          </view>
          <view @click="openEmbedPicker('agent')" class="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-border">
            <text class="text-lg text-purple-500"></text>
            <text class="text-xs text-muted-foreground">智能体</text>
          </view>
        </view>
      </view>

      <!-- 可见范围和付费设置 -->
      <view v-if="selectedCircle" class="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <view>
          <text class="block text-sm font-medium text-foreground mb-2">可见范围</text>
          <view class="grid grid-cols-2 gap-2">
            <view @click="visibility = 'platform_wide'" :class="['p-3 rounded-xl border-2 flex items-center gap-2 transition-all', visibility === 'platform_wide' ? 'border-primary bg-primary/5' : 'border-border']">
              <text :class="visibility === 'platform_wide' ? 'text-primary' : 'text-muted-foreground'">🌐</text>
              <view class="text-left">
                <text :class="['text-sm font-medium', visibility === 'platform_wide' ? 'text-primary' : 'text-muted-foreground']">全平台</text>
                <text class="text-[10px] text-muted-foreground block">推送到首页需审核</text>
              </view>
            </view>
            <view @click="visibility = 'circle_only'" :class="['p-3 rounded-xl border-2 flex items-center gap-2 transition-all', visibility === 'circle_only' ? 'border-primary bg-primary/5' : 'border-border']">
              <text :class="visibility === 'circle_only' ? 'text-primary' : 'text-muted-foreground'"></text>
              <view class="text-left">
                <text :class="['text-sm font-medium', visibility === 'circle_only' ? 'text-primary' : 'text-muted-foreground']">仅圈内</text>
                <text class="text-[10px] text-muted-foreground block">仅圈子成员可见</text>
              </view>
            </view>
          </view>
        </view>

        <view>
          <text class="block text-sm font-medium text-foreground mb-2">阅读权限</text>
          <view class="space-y-2">
            <!-- 免费 -->
            <view @click="paymentType = 'free'" :class="['w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all', paymentType === 'free' ? 'border-primary bg-primary/5' : 'border-border']">
              <view :class="['w-8 h-8 rounded-lg flex items-center justify-center text-sm', paymentType === 'free' ? 'bg-green-500 text-white' : 'bg-secondary text-muted-foreground']">
                <text class="font-bold">免</text>
              </view>
              <view class="text-left">
                <text :class="['text-sm font-medium', paymentType === 'free' ? 'text-foreground' : 'text-muted-foreground']">免费阅读</text>
                <text class="text-[10px] text-muted-foreground block">所有人可免费阅读全文</text>
              </view>
            </view>
            <!-- 圈内免费（仅全平台可见时） -->
            <view v-if="visibility === 'platform_wide'" @click="paymentType = 'member_free'" :class="['w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all', paymentType === 'member_free' ? 'border-primary bg-primary/5' : 'border-border']">
              <view :class="['w-8 h-8 rounded-lg flex items-center justify-center', paymentType === 'member_free' ? 'bg-blue-500 text-white' : 'bg-secondary text-muted-foreground']">
                <text></text>
              </view>
              <view class="text-left">
                <text :class="['text-sm font-medium', paymentType === 'member_free' ? 'text-foreground' : 'text-muted-foreground']">圈内免费</text>
                <text class="text-[10px] text-muted-foreground block">圈子成员免费，圈外用户付费</text>
              </view>
            </view>
            <!-- 付费 -->
            <view @click="paymentType = 'paid'" :class="['w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all', paymentType === 'paid' ? 'border-primary bg-primary/5' : 'border-border']">
              <view :class="['w-8 h-8 rounded-lg flex items-center justify-center', paymentType === 'paid' ? 'bg-yellow-500 text-white' : 'bg-secondary text-muted-foreground']">
                <text></text>
              </view>
              <view class="flex-1 text-left">
                <text :class="['text-sm font-medium', paymentType === 'paid' ? 'text-foreground' : 'text-muted-foreground']">付费阅读</text>
                <text class="text-[10px] text-muted-foreground block">所有用户需付费解锁全文</text>
              </view>
            </view>
          </view>

          <!-- 定价输入 -->
          <view v-if="paymentType === 'paid' || paymentType === 'member_free'" class="mt-3">
            <text class="block text-xs text-muted-foreground mb-1">{{ paymentType === 'member_free' ? '圈外用户' : '' }}定价（元）</text>
            <input v-model="price" type="digit" placeholder="请输入价格" class="w-full px-4 py-3 bg-background rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border" />
          </view>
        </view>
      </view>

      <!-- 标签 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="block text-sm font-medium text-foreground mb-2">文章标签</text>
        <view class="flex flex-wrap gap-2 mb-2">
          <view v-for="tag in tags" :key="tag" class="px-2.5 py-1 bg-secondary rounded-full text-sm text-foreground flex items-center gap-1">
            <text>#{{ tag }}</text>
            <text @click="handleRemoveTag(tag)" class="ml-1 text-muted-foreground">✕</text>
          </view>
        </view>
        <view v-if="tags.length < 5" class="flex gap-2">
          <input v-model="tagInput" @confirm="handleAddTag" placeholder="输入标签，回车添加" class="flex-1 px-4 py-2 bg-background rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border" maxlength="10" />
          <view @click="handleAddTag" class="px-4 py-2 bg-primary text-white text-sm rounded-full">添加</view>
        </view>
        <text class="text-xs text-muted-foreground mt-2 block">最多添加5个标签，每个标签不超过10字</text>
      </view>
    </view>

    <!-- 底部发布栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 pt-3" style="padding-bottom:calc(12px + env(safe-area-inset-bottom))">
      <view @click="handlePublish"
        :class="['w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all', publishing || !title.trim() || !content.trim() || !selectedCircle ? 'bg-[#E8E0D5] text-muted-foreground' : 'bg-primary text-white']"
      >
        <text v-if="publishing" class="animate-spin"></text>
        <template v-else>
          <text></text>
          <text>发布文章</text>
        </template>
      </view>
    </view>

    <!-- 圈子选择弹窗 -->
    <view v-if="showCirclePicker" class="fixed inset-0 z-50 flex items-end">
      <view @click="showCirclePicker = false" class="absolute inset-0 bg-black/40" />
      <view class="relative w-full bg-white rounded-t-3xl overflow-hidden" style="max-height:60vh">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="showCirclePicker = false" class="text-muted-foreground"><text>取消</text></view>
          <text class="font-medium text-foreground">选择圈子</text>
          <view class="w-8" />
        </view>
        <scroll-view scroll-y class="p-4 space-y-2" style="max-height:50vh">
          <text class="text-xs text-muted-foreground mb-2 block">仅显示您有发布权限的圈子</text>
          <view v-for="circle in mockManagedCircles" :key="circle.id"
            @click="selectedCircle = circle.id; showCirclePicker = false"
            :class="['w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all', selectedCircle === circle.id ? 'border-primary bg-primary/5' : 'border-border bg-background']"
          >
            <view class="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <text></text>
            </view>
            <view class="flex-1 text-left">
              <view class="flex items-center gap-2">
                <text class="text-foreground font-medium">{{ circle.name }}</text>
                <text :class="['text-[10px] px-1.5 py-0.5 rounded', circle.role === 'owner' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700']">
                  {{ circle.role === 'owner' ? '圈主' : '嘉宾' }}
                </text>
              </view>
              <text class="text-muted-foreground text-xs mt-0.5 block">{{ circle.members.toLocaleString() }} 成员</text>
            </view>
            <text v-if="selectedCircle === circle.id" class="text-primary text-lg">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 挂载内容选择弹窗 -->
    <view v-if="showEmbedPicker && embedPickerType" class="fixed inset-0 z-50 flex items-end">
      <view @click="closeEmbedPicker" class="absolute inset-0 bg-black/40" />
      <view class="relative w-full bg-white rounded-t-3xl overflow-hidden" style="max-height:70vh">
        <view class="flex items-center justify-between p-4 border-b border-border">
          <view @click="closeEmbedPicker" class="text-muted-foreground"><text>取消</text></view>
          <text class="font-medium text-foreground">选择{{ embedPickerType === 'product' ? '商品' : embedPickerType === 'course' ? '课程' : embedPickerType === 'activity' ? '活动' : '智能体' }}</text>
          <view class="w-8" />
        </view>
        <scroll-view scroll-y class="p-4 space-y-2" style="max-height:60vh">
          <!-- 商品列表 -->
          <view v-if="embedPickerType === 'product'">
            <view v-for="item in mockProducts" :key="item.id" @click="handleAddEmbed('product', item)"
              class="w-full p-3 rounded-xl border border-border flex items-center gap-3 mb-2">
              <view class="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <text class="text-xl text-muted-foreground">📦</text>
              </view>
              <view class="flex-1 text-left">
                <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ item.name }}</text>
                <text class="text-sm text-primary font-bold mt-1 block">¥{{ item.price }}</text>
              </view>
            </view>
          </view>
          <!-- 课程列表 -->
          <view v-if="embedPickerType === 'course'">
            <view v-for="item in mockCourses" :key="item.id" @click="handleAddEmbed('course', item)"
              class="w-full p-3 rounded-xl border border-border flex items-center gap-3 mb-2">
              <view class="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                <text class="text-xl"></text>
              </view>
              <view class="flex-1 text-left">
                <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ item.title }}</text>
                <view class="flex items-center gap-2 mt-1">
                  <text class="text-sm text-primary font-bold">¥{{ item.price }}</text>
                  <text class="text-xs text-muted-foreground">{{ item.lessons }}课时</text>
                </view>
              </view>
            </view>
          </view>
          <!-- 活动列表 -->
          <view v-if="embedPickerType === 'activity'">
            <view v-for="item in mockActivities" :key="item.id" @click="handleAddEmbed('activity', item)"
              class="w-full p-3 rounded-xl border border-border flex items-center gap-3 mb-2">
              <view class="w-14 h-14 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <text class="text-xl text-orange-500">📍</text>
              </view>
              <view class="flex-1 text-left">
                <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ item.title }}</text>
                <view class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <text>{{ item.date }}</text>
                  <text>·</text>
                  <text>{{ item.location }}</text>
                </view>
              </view>
            </view>
          </view>
          <!-- 智能体列表 -->
          <view v-if="embedPickerType === 'agent'">
            <view v-for="item in mockAgents" :key="item.id" @click="handleAddEmbed('agent', item)"
              class="w-full p-3 rounded-xl border border-border flex items-center gap-3 mb-2">
              <view class="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center shrink-0">
                <text class="text-xl text-white"></text>
              </view>
              <view class="flex-1 text-left">
                <view class="flex items-center gap-2">
                  <text class="text-sm font-medium text-foreground">{{ item.name }}</text>
                  <text v-if="item.isOfficial" class="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] rounded">官方</text>
                </view>
                <text class="text-xs text-muted-foreground mt-0.5 block line-clamp-1">{{ item.description }}</text>
                <view class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <text>{{ item.conversations }}次对话</text>
                  <text>·</text>
                  <text> {{ item.rating }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// Mock 数据
const mockManagedCircles = [
  { id: "1", name: "八字命理研习社", cover: "", role: "owner", members: 12580 },
  { id: "2", name: "风水堪舆交流群", cover: "", role: "owner", members: 8920 },
  { id: "3", name: "紫微斗数学习班", cover: "", role: "guest", members: 5600 },
]
const mockProducts = [
  { id: "p1", name: "《渊海子平》精装典藏版", cover: "", price: 68, stock: 120 },
  { id: "p2", name: "专业堪舆罗盘套装", cover: "", price: 298, stock: 50 },
  { id: "p3", name: "开运水晶手链", cover: "", price: 158, stock: 200 },
]
const mockCourses = [
  { id: "c1", title: "八字入门实战课", cover: "", price: 199, lessons: 32, students: 2860 },
  { id: "c2", title: "紫微斗数命盘解读", cover: "", price: 299, lessons: 48, students: 1560 },
  { id: "c3", title: "风水堪舆入门精讲", cover: "", price: 168, lessons: 24, students: 980 },
]
const mockActivities = [
  { id: "a1", title: "2024八字命理线下研讨会·北京站", date: "2024-04-20", location: "北京·朝阳区", price: 299, quota: 60, enrolled: 45 },
  { id: "a2", title: "风水实地考察·苏州园林行", date: "2024-05-15", location: "苏州·拙政园", price: 599, quota: 30, enrolled: 18 },
]
const mockAgents = [
  { id: "ag1", name: "八字命理分析师", description: "专业八字命理分析，解读命盘格局", conversations: 12680, rating: 4.9, isOfficial: true },
  { id: "ag2", name: "风水布局顾问", description: "家居风水、办公风水专业指导", conversations: 8560, rating: 4.8, isOfficial: true },
  { id: "ag3", name: "择日择吉助手", description: "婚嫁、开业、搬家吉日选择", conversations: 5680, rating: 4.7, isOfficial: false },
]

interface EmbeddedItem {
  type: "product" | "course" | "activity" | "agent"
  id: string
  data: any
}

// 组件状态
const title = ref("")
const content = ref("")
const cover = ref<string | null>(null)
const selectedCircle = ref<string | null>(null)
const visibility = ref<"circle_only" | "platform_wide">("platform_wide")
const paymentType = ref<"free" | "paid" | "member_free">("free")
const price = ref("")
const tags = ref<string[]>([])
const tagInput = ref("")
const embeddedItems = ref<EmbeddedItem[]>([])
const showCirclePicker = ref(false)
const showEmbedPicker = ref(false)
const embedPickerType = ref<"product" | "course" | "activity" | "agent" | null>(null)
const showPreview = ref(false)
const saving = ref(false)
const publishing = ref(false)

const hasPublishPermission = mockManagedCircles.length > 0
const selectedCircleData = computed(() => mockManagedCircles.find(c => c.id === selectedCircle.value))

// 添加标签
function handleAddTag() {
  const t = tagInput.value.trim()
  if (t && tags.value.length < 5 && !tags.value.includes(t)) {
    tags.value = [...tags.value, t]
    tagInput.value = ""
  }
}

// 移除标签
function handleRemoveTag(tag: string) {
  tags.value = tags.value.filter(t => t !== tag)
}

// 添加挂载内容
function handleAddEmbed(type: "product" | "course" | "activity" | "agent", item: any) {
  if (embeddedItems.value.some(e => e.type === type && e.id === item.id)) return
  embeddedItems.value = [...embeddedItems.value, { type, id: item.id, data: item }]
  showEmbedPicker.value = false
  embedPickerType.value = null
}

// 移除挂载内容
function handleRemoveEmbed(type: string, id: string) {
  embeddedItems.value = embeddedItems.value.filter(e => !(e.type === type && e.id === id))
}

function openEmbedPicker(type: "product" | "course" | "activity" | "agent") {
  embedPickerType.value = type
  showEmbedPicker.value = true
}

function closeEmbedPicker() {
  showEmbedPicker.value = false
  embedPickerType.value = null
}

// 选择封面
function handlePickCover() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      cover.value = res.tempFilePaths[0]
    }
  })
}

// 保存草稿
async function handleSave() {
  saving.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  saving.value = false
  uni.showToast({ title: '草稿已保存', icon: 'success' })
}

// 发布
async function handlePublish() {
  if (!title.value.trim() || !content.value.trim() || !selectedCircle.value) {
    uni.showToast({ title: '请填写标题、正文，并选择发布圈子', icon: 'none' })
    return
  }
  publishing.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  publishing.value = false
  uni.showToast({ title: '发布成功', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 800)
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
