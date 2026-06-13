<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center h-14 px-4">
        <view class="p-2 -ml-2" @click="goBack">
          <text>←</text>
        </view>
        <text class="ml-2 font-semibold">图片浏览器演示</text>
      </view>
    </view>

    <view class="p-4 space-y-6 pb-20">
      <!-- 使用 useImageViewer Hook -->
      <view class="p-4 bg-white rounded-xl border border-border">
        <text class="font-semibold text-base mb-3 block">使用 useImageViewer Hook</text>
        <text class="text-sm text-muted-foreground mb-4 block">
          推荐方式，自动管理状态
        </text>
        <view class="grid grid-cols-3 gap-2">
          <view
            v-for="(img, index) in demoImages.slice(0, 6)"
            :key="index"
            class="aspect-square bg-secondary rounded-lg flex items-center justify-center"
            hover-class="hover-opacity"
            @click="openViewer(demoImages.slice(0, 6), index)"
          >
            <text class="text-xs text-muted-foreground">{{ index + 1 }}</text>
          </view>
        </view>
      </view>

      <!-- 单张图片查看 -->
      <view class="p-4 bg-white rounded-xl border border-border">
        <text class="font-semibold text-base mb-3 block">单张图片查看</text>
        <text class="text-sm text-muted-foreground mb-4 block">
          不显示页码指示器，无左右滑动
        </text>
        <view
          class="aspect-video bg-secondary rounded-lg flex items-center justify-center"
          hover-class="hover-opacity"
          @click="openViewer([demoImages[0]], 0)"
        >
          <text class="text-sm text-muted-foreground">点击查看单张图片</text>
        </view>
      </view>

      <!-- 多张图片 -->
      <view class="p-4 bg-white rounded-xl border border-border">
        <text class="font-semibold text-base mb-3 block">多张图片（数字指示）</text>
        <text class="text-sm text-muted-foreground mb-4 block">
          超过9张时显示数字页码
        </text>
        <view class="grid grid-cols-3 gap-2">
          <view
            v-for="(img, index) in demoImages"
            :key="index"
            class="aspect-square bg-secondary rounded-lg flex items-center justify-center"
            hover-class="hover-opacity"
            @click="openViewer(demoImages, index)"
          >
            <text class="text-xs text-muted-foreground">{{ index + 1 }}</text>
          </view>
        </view>
      </view>

      <!-- 直接控制组件 -->
      <view class="p-4 bg-white rounded-xl border border-border">
        <text class="font-semibold text-base mb-3 block">直接控制组件</text>
        <text class="text-sm text-muted-foreground mb-4 block">
          不使用 Hook，直接传入 props
        </text>
        <view class="grid grid-cols-3 gap-2">
          <view
            v-for="(img, index) in demoImages.slice(0, 3)"
            :key="index"
            class="aspect-square bg-secondary rounded-lg flex items-center justify-center"
            hover-class="hover-opacity"
            @click="directViewer = { isOpen: true, index }"
          >
            <text class="text-xs text-muted-foreground">{{ index + 1 }}</text>
          </view>
        </view>
      </view>

      <!-- 交互说明 -->
      <view class="p-4 bg-secondary/30 rounded-xl border border-border">
        <text class="font-semibold text-base mb-3 block">交互说明</text>
        <view class="text-sm text-muted-foreground space-y-2">
          <text class="block">• 单击图片：显示/隐藏操作栏</text>
          <text class="block">• 双击图片：放大/还原</text>
          <text class="block">• 左右滑动：切换上一张/下一张</text>
          <text class="block">• 长按图片：弹出操作菜单</text>
          <text class="block">• 双指捏合：缩放图片</text>
          <text class="block">• 键盘左右键：切换图片</text>
          <text class="block">• ESC键：关闭浏览器</text>
        </view>
      </view>
    </view>

    <!-- 图片查看器弹窗（模拟） -->
    <view v-if="viewerOpen" class="fixed inset-0 z-50 bg-black flex flex-col">
      <view class="flex items-center justify-between px-4 h-12 text-white">
        <text>{{ currentIndex + 1 }} / {{ viewerImages.length }}</text>
        <view class="p-2" @click="closeViewer">
          <text class="text-white text-lg">✕</text>
        </view>
      </view>
      <view class="flex-1 flex items-center justify-center" @click="closeViewer">
        <text class="text-white text-6xl"></text>
      </view>
      <view class="text-white text-sm text-center py-4">
        <text>{{ viewerImages[currentIndex]?.alt || '图片 ' + (currentIndex + 1) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

function goBack() { uni.navigateBack() }

interface DemoImage {
  url: string
  thumbnail?: string
  alt: string
}

const demoImages: DemoImage[] = [
  { url: '/demo/image1.jpg', thumbnail: '/demo/image1_thumb.jpg', alt: '八卦图示例' },
  { url: '/demo/image2.jpg', thumbnail: '/demo/image2_thumb.jpg', alt: '古籍页面' },
  { url: '/demo/image3.jpg', thumbnail: '/demo/image3_thumb.jpg', alt: '风水罗盘' },
  { url: '/demo/image4.jpg', alt: '紫微斗数盘' },
  { url: '/demo/image5.jpg', alt: '命理书籍' },
  { url: '/demo/image6.jpg', alt: '国学课堂' },
  { url: '/demo/image7.jpg', alt: '线下活动' },
  { url: '/demo/image8.jpg', alt: '学员合影' },
  { url: '/demo/image9.jpg', alt: '证书展示' },
]

const viewerOpen = ref(false)
const viewerImages = ref<DemoImage[]>([])
const currentIndex = ref(0)

const directViewer = ref({ isOpen: false, index: 0 })

function openViewer(images: DemoImage[], index: number) {
  viewerImages.value = images
  currentIndex.value = index
  viewerOpen.value = true
}

function closeViewer() {
  viewerOpen.value = false
}
</script>

<style scoped>
.hover-opacity {
  opacity: 0.8;
  transition: opacity 0.2s;
}
</style>
