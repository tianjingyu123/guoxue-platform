<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">演示</text>
      <text class="v0-route">V0: demo/cards</text>
    </view>
        <view class="min-h-screen bg-[var(--surface-page)]">
          <!--   -->
          <view class="sticky top-0 z-50 bg-white border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <Link href="/">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="font-bold text-lg">卡片组件演示</text>
              </view>
            </view>
          </view>
    
          <view class="pb-20">
            <!--   -->
            <view class="px-4 py-4">
              <text class="text-lg font-bold mb-3">文章/帖子卡片</text>
              <text class="text-sm text-muted-foreground mb-4">
                支持无图、单图(横/竖/方)、多图(2-9张)等多种素材情况，自动适配展示
              </text>
              
              <!--   -->
              <view class="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                <Button 
                  variant={contentVariant === "feed" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setContentVariant("feed")}
                >
                  <LayoutGrid class="w-4 h-4 mr-1" />
                  瀑布流
                </Button>
                <Button 
                  variant={contentVariant === "list" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setContentVariant("list")}
                >
                  <Rows3 class="w-4 h-4 mr-1" />
                  列表
                </Button>
                <Button 
                  variant={contentVariant === "compact" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setContentVariant("compact")}
                >
                  <List class="w-4 h-4 mr-1" />
                  紧凑
                </Button>
                <Button 
                  variant={contentVariant === "text-only" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setContentVariant("text-only")}
                >
                  纯文字
                </Button>
                <Button 
                  variant={contentVariant === "featured" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setContentVariant("featured")}
                >
                  精选大图
                </Button>
              </view>
    
              <!--   -->
              {contentVariant === "feed" && (
                <view class="columns-2 gap-2">
                  {[...mockArticles, ...mockPosts].map((item) => (
                    <ContentCard key={item.id} data={{ item }} variant="feed" />
                  ))}
                </view>
              )}
              
              {contentVariant === "list" && (
                <view class="space-y-2">
                  {[...mockArticles, ...mockPosts].map((item) => (
                    <ContentCard key={item.id} data={{ item }} variant="list" />
                  ))}
                </view>
              )}
              
              {contentVariant === "compact" && (
                <view class="space-y-0 divide-y divide-border">
                  {[...mockArticles, ...mockPosts].map((item) => (
                    <ContentCard key={item.id} data={{ item }} variant="compact" />
                  ))}
                </view>
              )}
              
              {contentVariant === "text-only" && (
                <view class="space-y-2">
                  {[...mockArticles, ...mockPosts].map((item) => (
                    <ContentCard key={item.id} data={{ item }} variant="text-only" />
                  ))}
                </view>
              )}
              
              {contentVariant === "featured" && (
                <view class="space-y-3">
                  {mockArticles.filter(a => a.isFeatured).map((item) => (
                    <ContentCard key={item.id} data={{ item }} variant="featured" />
                  ))}
                </view>
              )}
            </view>
    
            <!--   -->
            <view class="px-4 py-4 border-t border-border mt-4">
              <text class="text-lg font-bold mb-3">视频卡片</text>
              <text class="text-sm text-muted-foreground mb-4">
                支持横版(16:9)、竖版(9:16)、方形(1:1)三种视频比例自动适配
              </text>
              
              <!--   -->
              <view class="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                <Button 
                  variant={videoVariant === "feed" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setVideoVariant("feed")}
                >
                  <LayoutGrid class="w-4 h-4 mr-1" />
                  瀑布流
                </Button>
                <Button 
                  variant={videoVariant === "list" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setVideoVariant("list")}
                >
                  <Rows3 class="w-4 h-4 mr-1" />
                  列表
                </Button>
                <Button 
                  variant={videoVariant === "rail" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setVideoVariant("rail")}
                >
                  横滑
                </Button>
                <Button 
                  variant={videoVariant === "fullscreen" ? "default" : "outline"} 
                  size="sm"
                  @click={() => setVideoVariant("fullscreen")}
                >
                  全屏竖版
                </Button>
              </view>
    
              <!--   -->
              {videoVariant === "feed" && (
                <view class="columns-2 gap-2">
                  
    <view v-for="(item, index) in mockVideos" :key="index"> (
                    <VideoCard key={item.id} data={{ item }} variant="feed" />
                  ))}
                </view>
              )}
              
              {videoVariant === "list" && (
                <view class="space-y-2">
                  
    <view v-for="(item, index) in mockVideos" :key="index"> (
                    <VideoCard key={item.id} data={{ item }} variant="list" />
                  ))}
                </view>
              )}
              
              {videoVariant === "rail" && (
                <view class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  
    <view v-for="(item, index) in mockVideos" :key="index"> (
                    <VideoCard key={item.id} data={{ item }} variant="rail" />
                  ))}
                </view>
              )}
              
              {videoVariant === "fullscreen" && (
                <view class="space-y-3">
                  {mockVideos.filter(v => v.videoRatio === "vertical").map((item) => (
                    <VideoCard key={{ item.id }} data={{ item }} variant="fullscreen" />
                  ))}
                </view>
              )}
            </view>
    
            <!--   -->
            <view class="px-4 py-4 border-t border-border mt-4">
              <text class="text-lg font-bold mb-3">素材适配规则</text>
              <view class="space-y-4 text-sm">
                <view class="p-3 bg-secondary rounded-lg">
                  <text class="font-medium mb-2">图片适配</text>
                  <view class="space-y-1 text-muted-foreground">
                    <view>• 无图：显示文字摘要或渐变背景</view>
                    <view>• 单图横版(16:9/4:3)：保持比例，aspect-video</view>
                    <view>• 单图竖版(9:16/3:4)：保持比例，限制最大宽度70%</view>
                    <view>• 单图方形(1:1)：保持比例，限制最大宽度80%</view>
                    <view>• 2张图：2列并排，各占50%</view>
                    <view>• 3张图：1大+2小布局</view>
                    <view>• 4张图：2x2网格</view>
                    <view>• 5-9张图：3列网格，超出显示+N</view>
                  </view>
                </view>
                <view class="p-3 bg-secondary rounded-lg">
                  <text class="font-medium mb-2">视频适配</text>
                  <view class="space-y-1 text-muted-foreground">
                    <view>• 横版视频(16:9)：标准视频比例</view>
                    <view>• 竖版视频(9:16)：短视频/全屏模式</view>
                    <view>• 方形视频(1:1)：社交媒体常见</view>
                    <view>• 自动根据封面/视频比例检测</view>
                  </view>
                </view>
                <view class="p-3 bg-secondary rounded-lg">
                  <text class="font-medium mb-2">卡片变体</text>
                  <view class="space-y-1 text-muted-foreground">
                    <view>• feed：瀑布流/网格竖卡，首页/发现页</view>
                    <view>• list：横向列表卡，搜索结果/收藏</view>
                    <view>• compact：紧凑卡片，侧边栏/相关推荐</view>
                    <view>• rail：横滑小卡，推荐栏</view>
                    <view>• featured：精选大图，首页Banner</view>
                    <view>• text-only：纯文字卡片</view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockArticles: ContentCardData[] = [
const mockPosts: ContentCardData[] = [
const mockVideos: VideoCardData[] = [

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