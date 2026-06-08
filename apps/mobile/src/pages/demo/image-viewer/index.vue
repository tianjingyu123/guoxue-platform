<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">演示</text>
      <text class="v0-route">V0: demo/image-viewer</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center h-14 px-4">
      <BackButton />
      <text class="ml-2 font-semibold">图片浏览器演示</text>
            </view>
          </view>
    
          <view class="p-4 space-y-6 pb-20">
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-base mb-3">使用 useImageViewer Hook</text>
              <text class="text-sm text-muted-foreground mb-4">
                推荐方式，自动管理状态
              </text>
              <view class="grid grid-cols-3 gap-2">
                {demoImages.slice(0, 6).map((img, index) => (
                  <view
                    key={index}
                    @click={() => open(demoImages.slice(0, 6), index)}
                    class="aspect-square bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <text class="text-xs text-muted-foreground">{{ index + 1 }}</text>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-base mb-3">单张图片查看</text>
              <text class="text-sm text-muted-foreground mb-4">
                不显示页码指示器，无左右滑动
              </text>
              <view
                @click={() => open([demoImages[0]], 0)}
                class="aspect-video bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              >
                <text class="text-sm text-muted-foreground">点击查看单张图片</text>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-base mb-3">多张图片（数字指示）</text>
              <text class="text-sm text-muted-foreground mb-4">
                超过9张时显示数字页码
              </text>
              <view class="grid grid-cols-3 gap-2">
                
    <view v-for="(img, index) in demoImages" :key="index"> (
                  <view
                    key={index}
                    @click={() => open(demoImages, index)}
                    class="aspect-square bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <text class="text-xs text-muted-foreground">{{ index + 1 }}</text>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-semibold text-base mb-3">直接控制组件</text>
              <text class="text-sm text-muted-foreground mb-4">
                不使用 Hook，直接传入 props
              </text>
              <view class="grid grid-cols-3 gap-2">
                {demoImages.slice(0, 3).map((img, index) => (
                  <view
                    key={index}
                    @click={() => setDirectViewer({ isOpen: true, index })}
                    class="aspect-square bg-secondary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <text class="text-xs text-muted-foreground">{{ index + 1 }}</text>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4 bg-secondary/30">
              <text class="font-semibold text-base mb-3">交互说明</text>
              <view class="text-sm text-muted-foreground space-y-2">
                <view>• 单击图片：显示/隐藏操作栏</view>
                <view>• 双击图片：放大/还原</view>
                <view>• 左右滑动：切换上一张/下一张</view>
                <view>• 长按图片：弹出操作菜单</view>
                <view>• 双指捏合：缩放图片</view>
                <view>• 键盘左右键：切换图片</view>
                <view>• ESC键：关闭浏览器</view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <ImageViewerComponent />
    
          <!--   -->
          <ImageViewer
            images={{ demoImages.slice(0, 3) }}
            initialIndex={{ directViewer.index }}
            isOpen={{ directViewer.isOpen }}
            onClose={() => setDirectViewer({ ...directViewer, isOpen: false })}
          />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const demoImages = [

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>