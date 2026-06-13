<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 flex items-center justify-between px-4 h-11 bg-white border-b border-border">
      <view class="p-1" @click="goBack">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="font-medium text-foreground">个性化设置</text>
      <view class="p-1" :style="{ color: config.themeColor }" @click="goPreview">
        <text>️</text>
      </view>
    </view>

    <!-- 分享推广入口 -->
    <view
      class="mx-4 mt-4 p-3 rounded-xl flex items-center justify-between"
      style="background:linear-gradient(to right,rgba(34,197,94,0.1),rgba(34,197,94,0.05));border:1px solid rgba(34,197,94,0.3)"
      @click="navigateTo('/pages/substation/share/index')"
    >
      <view class="flex items-center gap-3">
        <view class="w-10 h-10 rounded-xl flex items-center justify-center" style="background-color:rgba(34,197,94,0.2)">
          <text class="text-lg"></text>
        </view>
        <view>
          <text class="font-medium text-sm text-foreground block">分享推广中心</text>
          <text class="text-[10px] text-muted-foreground block">分享商品/活动/课程赚取佣金</text>
        </view>
      </view>
      <text class="text-xs font-medium" style="color:#22C55E">去分享 →</text>
    </view>

    <!-- 提示信息 -->
    <view class="mx-4 mt-4 p-3 rounded-lg flex items-start gap-2" style="background-color:#FFFBEB">
      <text class="text-sm flex-shrink-0" style="color:#D97706"></text>
      <text class="text-xs" style="color:#D97706">修改后需要审核通过才能生效，审核时间约1-3个工作日</text>
    </view>

    <!-- Tab切换 -->
    <view class="flex border-b border-border bg-white mt-4 sticky top-11 z-40">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="flex-1 text-center py-3 text-sm font-medium"
        :class="activeTab === t.key ? 'border-b-2' : 'text-muted-foreground'"
        :style="activeTab === t.key ? `border-color:${config.themeColor};color:${config.themeColor}` : ''"
        @click="activeTab = t.key"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <!-- 品牌设置 -->
    <view v-if="activeTab === 'brand'" class="px-4 mt-4 space-y-4">
      <!-- 分站名称 -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-sm">🔤</text>
          <text class="text-sm font-medium text-foreground">分站名称</text>
        </view>
        <input
          class="w-full h-9 px-3 rounded-lg border border-border text-sm text-foreground bg-background"
          :value="config.name"
          @input="updateConfig('name', $event.detail.value)"
          placeholder="如：青云国学小站"
          maxlength="20"
        />
        <text class="text-xs text-muted-foreground block mt-2">最多20个字，修改需审核</text>
      </view>

      <!-- 分站Logo -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-sm"></text>
          <text class="text-sm font-medium text-foreground">分站Logo</text>
        </view>
        <view class="flex items-center gap-4">
          <view class="w-20 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-[#F1EDE8]">
            <text class="text-lg text-muted-foreground"></text>
          </view>
          <view class="flex-1">
            <view class="inline-block px-3 py-1.5 rounded-lg border border-border text-sm" @click="handleUpload">
              <text> 上传Logo</text>
            </view>
            <text class="text-xs text-muted-foreground block mt-1">建议尺寸 200×60px，PNG格式</text>
          </view>
        </view>
      </view>

      <!-- 主题色 -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-sm"></text>
          <text class="text-sm font-medium text-foreground">主题色</text>
        </view>
        <view class="grid grid-cols-4 gap-3">
          <view
            v-for="color in presetColors"
            :key="color.value"
            class="aspect-square rounded-xl flex items-center justify-center transition-all"
            :class="config.themeColor === color.value ? 'border-2' : 'border-2 border-transparent'"
            :style="{
              backgroundColor: color.value,
              borderColor: config.themeColor === color.value ? config.themeColor : 'transparent',
              boxShadow: config.themeColor === color.value ? `0 0 0 2px ${config.themeColor}33` : 'none',
            }"
            @click="updateConfig('themeColor', color.value)"
          >
            <text v-if="config.themeColor === color.value" class="text-white text-lg"></text>
          </view>
        </view>
        <view class="flex items-center gap-2 mt-3">
          <text v-for="color in presetColors.slice(0, 4)" :key="color.value" class="flex-1 text-center text-[10px] text-muted-foreground">
            {{ color.name }}
          </text>
        </view>
        <view class="flex items-center gap-2 mt-1">
          <text v-for="color in presetColors.slice(4)" :key="color.value" class="flex-1 text-center text-[10px] text-muted-foreground">
            {{ color.name }}
          </text>
        </view>
      </view>

      <!-- 站长介绍 -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-sm"></text>
          <text class="text-sm font-medium text-foreground">站长介绍</text>
        </view>
        <view class="flex items-center gap-3 mb-3">
          <view
            class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
            :style="{ backgroundColor: config.themeColor }"
          >
            <text class="text-white text-xl font-bold">{{ config.masterName.charAt(0) }}</text>
          </view>
          <view class="inline-block px-3 py-1.5 rounded-lg border border-border text-sm" @click="handleUpload">
            <text> 更换头像</text>
          </view>
        </view>
        <textarea
          class="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-border rounded-lg"
          :value="config.masterIntro"
          @input="updateConfig('masterIntro', $event.detail.value)"
          placeholder="介绍一下自己，让用户更了解你..."
          maxlength="500"
        />
        <text class="text-xs text-muted-foreground text-right block mt-2">{{ config.masterIntro.length }}/500</text>
      </view>
    </view>

    <!-- 首页装修 -->
    <view v-if="activeTab === 'hero'" class="px-4 mt-4 space-y-4">
      <!-- Hero图片 -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-sm"></text>
            <text class="text-sm font-medium text-foreground">首页Banner</text>
          </view>
          <text class="text-xs text-muted-foreground">{{ config.heroImages.length }}/3张</text>
        </view>
        <view class="grid grid-cols-3 gap-2">
          <view
            v-for="(img, idx) in config.heroImages"
            :key="idx"
            class="relative aspect-[2/1] rounded-lg overflow-hidden"
            style="background-color:#F1EDE8"
          >
            <view class="w-full h-full flex items-center justify-center">
              <text class="text-lg text-muted-foreground"></text>
            </view>
            <view
              class="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style="background-color:rgba(0,0,0,0.5)"
              @click="removeHeroImage(idx)"
            >
              <text class="text-white text-[10px]">✕</text>
            </view>
          </view>
          <view
            v-if="config.heroImages.length < 3"
            class="aspect-[2/1] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1"
            @click="addHeroImage"
          >
            <text class="text-lg text-muted-foreground">➕</text>
            <text class="text-[10px] text-muted-foreground">添加</text>
          </view>
        </view>
        <text class="text-xs text-muted-foreground block mt-2">建议尺寸 750×375px，支持1-3张轮播</text>
      </view>

      <!-- 预览效果 -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-sm">️</text>
          <text class="text-sm font-medium text-foreground">预览效果</text>
        </view>
        <view
          class="aspect-[2/1] rounded-xl overflow-hidden flex items-center justify-center"
          :style="{ backgroundColor: config.themeColor }"
        >
          <text class="text-sm" style="color:rgba(255,255,255,0.5)">上传Banner后预览</text>
        </view>
      </view>
    </view>

    <!-- 精选内容 -->
    <view v-if="activeTab === 'featured'" class="px-4 mt-4 space-y-4">
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-sm"></text>
            <text class="text-sm font-medium text-foreground">站长精选</text>
          </view>
          <text class="text-xs text-muted-foreground">{{ config.featured.length }}/6个</text>
        </view>
        <text class="text-xs text-muted-foreground block mb-4">
          从平台内容中挑选推荐给你的用户，精选内容会在首页显著展示
        </text>

        <!-- 已选内容列表 -->
        <view class="space-y-3 mb-4">
          <view v-for="(item, index) in config.featured" :key="item.id" class="p-3 rounded-lg" style="background-color:rgba(241,237,232,0.5)">
            <view class="flex items-center gap-2 mb-2">
              <text class="text-sm text-muted-foreground">≡</text>
              <view
                class="text-[10px] px-1.5 py-0.5 rounded"
                :style="{ backgroundColor: config.themeColor + '15', color: config.themeColor }"
              >
                <text>{{ item.type === 'course' ? '课程' : item.type === 'circle' ? '圈子' : '文章' }}</text>
              </view>
              <text class="flex-1 text-sm font-medium text-foreground truncate">{{ item.title }}</text>
              <view class="p-1" @click="handleRemoveFeatured(item.id)">
                <text class="text-sm">🗑️</text>
              </view>
            </view>
            <input
              class="w-full h-8 px-2 rounded text-xs border border-border bg-background"
              :value="item.recommendation || ''"
              @input="handleUpdateRecommendation(item.id, $event.detail.value)"
              placeholder="添加推荐语（可选）"
              maxlength="50"
            />
          </view>
        </view>

        <!-- 添加按钮 -->
        <view v-if="config.featured.length < 6" class="grid grid-cols-3 gap-2">
          <view
            class="py-2 rounded-lg border border-border text-xs text-center flex items-center justify-center gap-1"
            @click="openContentPicker('course')"
          >
            <text></text>
            <text>添加课程</text>
          </view>
          <view
            class="py-2 rounded-lg border border-border text-xs text-center flex items-center justify-center gap-1"
            @click="openContentPicker('circle')"
          >
            <text></text>
            <text>添加圈子</text>
          </view>
          <view
            class="py-2 rounded-lg border border-border text-xs text-center flex items-center justify-center gap-1"
            @click="openContentPicker('article')"
          >
            <text></text>
            <text>添加文章</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部保存按钮 -->
    <view class="fixed bottom-0 left-0 right-0 px-4 py-4 bg-background border-t border-border">
      <view
        class="w-full py-3 rounded-xl text-sm text-center text-white font-medium flex items-center justify-center gap-2"
        :style="{ backgroundColor: config.themeColor, opacity: !hasChanges || isSaving ? 0.6 : 1 }"
        @click="handleSave"
      >
        <text v-if="isSaving"> 保存中...</text>
        <text v-else>💾 {{ hasChanges ? '保存修改' : '已保存' }}</text>
      </view>
    </view>

    <!-- 内容选择弹窗 -->
    <view v-if="showContentPicker" class="fixed inset-0 z-50 bg-black/50" @click="showContentPicker = false">
      <view class="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl" style="max-height:70vh;overflow:hidden" @click.stop>
        <view class="px-4 py-4 border-b border-border flex items-center justify-between">
          <text class="font-medium text-foreground">
            选择{{ contentPickerType === 'course' ? '课程' : contentPickerType === 'circle' ? '圈子' : '文章' }}
          </text>
          <view @click="showContentPicker = false">
            <text class="text-lg">✕</text>
          </view>
        </view>
        <view class="px-4 py-4">
          <view class="relative mb-4">
            <input
              class="w-full h-9 pl-10 pr-3 rounded-lg border border-border text-sm bg-background"
              placeholder="搜索..."
              :value="contentSearch"
              @input="contentSearch = $event.detail.value"
            />
            <text class="absolute left-3 top-1/2 text-sm text-muted-foreground" style="transform:translateY(-50%)"></text>
          </view>
          <view class="space-y-2" style="max-height:50vh;overflow-y:auto">
            <view
              v-for="item in pickerItems"
              :key="item.id"
              class="w-full p-3 rounded-lg flex items-center justify-between"
              :class="isItemSelected(item.id) ? 'opacity-50' : ''"
              :style="{ backgroundColor: isItemSelected(item.id) ? 'rgba(241,237,232,0.5)' : '' }"
              @click="!isItemSelected(item.id) && handleAddFeatured(contentPickerType, item)"
            >
              <view>
                <text class="font-medium text-sm text-foreground block">{{ item.title }}</text>
                <text class="text-xs text-muted-foreground block mt-0.5">
                  <text v-if="item.price !== undefined">¥{{ item.price }}</text>
                  <text v-if="item.members !== undefined">{{ item.members }}成员</text>
                  <text v-if="item.views !== undefined">{{ item.views }}阅读</text>
                </text>
              </view>
              <text :class="isItemSelected(item.id) ? 'text-primary' : 'text-muted-foreground'">
                {{ isItemSelected(item.id) ? '' : '➕' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const activeTab = ref('brand')
const showContentPicker = ref(false)
const contentPickerType = ref<'course' | 'circle' | 'article'>('course')
const contentSearch = ref('')
const isSaving = ref(false)
const hasChanges = ref(false)

interface FeaturedItem {
  id: string
  type: string
  title: string
  recommendation: string
}

interface Config {
  name: string
  logo: string
  themeColor: string
  heroImages: string[]
  masterName: string
  masterAvatar: string
  masterIntro: string
  featured: FeaturedItem[]
}

const tabs = [
  { key: 'brand', label: '品牌设置' },
  { key: 'hero', label: '首页装修' },
  { key: 'featured', label: '精选内容' },
]

const presetColors = [
  { name: '中国红', value: '#C41E3A' },
  { name: '故宫红', value: '#8B0000' },
  { name: '古铜金', value: '#C9A96E' },
  { name: '青云紫', value: '#8B5CF6' },
  { name: '碧玉绿', value: '#0D9488' },
  { name: '靛蓝', value: '#4F46E5' },
  { name: '琥珀橙', value: '#D97706' },
  { name: '墨黑', value: '#1F2937' },
]

const config = reactive<Config>({
  name: '青云国学小站',
  logo: '',
  themeColor: '#8B5CF6',
  heroImages: ['', ''],
  masterName: '青云道长',
  masterAvatar: '',
  masterIntro: '从事国学研究20余年，专注八字命理与风水堪舆。',
  featured: [
    { id: 'f1', type: 'course', title: '八字入门实战课', recommendation: '非常适合零基础入门' },
    { id: 'f2', type: 'circle', title: '八字命理研习社', recommendation: '圈主讲解非常专业' },
  ],
})

const availableContent = {
  courses: [
    { id: 'c1', title: '八字入门实战课', price: 199 },
    { id: 'c2', title: '紫微斗数高级班', price: 599 },
    { id: 'c3', title: '风水堪舆实战', price: 399 },
    { id: 'c4', title: '梅花易数精讲', price: 299 },
  ],
  circles: [
    { id: 'ci1', title: '八字命理研习社', members: 3680 },
    { id: 'ci2', title: '紫微斗数交流圈', members: 2560 },
    { id: 'ci3', title: '风水爱好者联盟', members: 1890 },
  ],
  articles: [
    { id: 'a1', title: '2024甲辰年运势全解析', views: 12800 },
    { id: 'a2', title: '八字看婚姻的几个要点', views: 8600 },
    { id: 'a3', title: '流年大运怎么看', views: 6500 },
  ],
}

const pickerItems = computed(() => {
  const items = contentPickerType.value === 'course'
    ? availableContent.courses
    : contentPickerType.value === 'circle'
      ? availableContent.circles
      : availableContent.articles
  const kw = contentSearch.value
  if (!kw) return items
  return items.filter((item: any) => item.title.includes(kw))
})

function updateConfig(key: string, value: any) {
  ;(config as any)[key] = value
  hasChanges.value = true
}

function handleUpload() {
  uni.showToast({ title: '上传功能开发中', icon: 'none' })
}

function addHeroImage() {
  if (config.heroImages.length < 3) {
    config.heroImages.push('')
    hasChanges.value = true
  }
}

function removeHeroImage(index: number) {
  config.heroImages.splice(index, 1)
  hasChanges.value = true
}

function handleRemoveFeatured(id: string) {
  config.featured = config.featured.filter(f => f.id !== id)
  hasChanges.value = true
}

function handleUpdateRecommendation(id: string, value: string) {
  const item = config.featured.find(f => f.id === id)
  if (item) {
    item.recommendation = value
    hasChanges.value = true
  }
}

function openContentPicker(type: 'course' | 'circle' | 'article') {
  contentPickerType.value = type
  contentSearch.value = ''
  showContentPicker.value = true
}

function handleAddFeatured(type: string, item: any) {
  if (config.featured.length >= 6) return
  config.featured.push({
    id: item.id,
    type,
    title: item.title,
    recommendation: '',
  })
  hasChanges.value = true
  showContentPicker.value = false
}

function isItemSelected(itemId: string) {
  return config.featured.some(f => f.id === itemId)
}

function handleSave() {
  if (!hasChanges.value || isSaving.value) return
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    hasChanges.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
  }, 1500)
}

function goPreview() {
  uni.navigateTo({ url: '/pages/substation/id-detail/home/index' })
}

function navigateTo(path: string) {
  uni.navigateTo({ url: path })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
