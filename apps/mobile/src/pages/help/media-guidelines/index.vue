<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">帮助中心</text>
      <text class="v0-route">V0: help/media-guidelines</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-muted">
            <view class="flex items-center justify-between px-4 h-12">
              <view class="flex items-center gap-3">
                <Link href="/help" class="p-1 -ml-1">
                  <ArrowLeft class="w-5 h-5 text-foreground" />
                </Link>
                <text class="font-medium text-foreground">素材上传规范</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <view class="flex gap-3">
                <Info class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <view class="text-sm text-blue-700">
                  <text class="font-medium mb-1">为什么要遵循素材规范？</text>
                  <text class="text-blue-600">
                    遵循规范上传的素材，能在各种展示场景（信息流、详情页、分享卡片等）获得最佳展示效果。
                    即使不完全遵循，系统也会自动适配，但可能有裁切或缩放。
                  </text>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4">
            <view class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              
    <view v-for="(spec, index) in mediaSpecs" :key="index"> (
                <view class="v0-btn"
                  key={{ spec.id }}
                  @click={() => setActiveTab(spec.id)}
                  class={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeTab === spec.id
                      ? "bg-primary text-white"
                      : "bg-white text-muted-foreground border border-muted"
                  }`}
                >
                  <spec.icon class="w-4 h-4" />
                  {{ spec.name }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4 space-y-4">
            <!--   -->
            <view class="flex items-center gap-3">
              <view class={`w-10 h-10 rounded-xl ${activeSpec.color} flex items-center justify-center`}>
                <activeSpec.icon class="w-5 h-5 text-white" />
              </view>
              <view>
                <text class="font-bold text-foreground">{{ activeSpec.name }}</text>
                <text class="text-xs text-muted-foreground">{{ activeSpec.description }}</text>
              </view>
            </view>
    
            <!--   -->
            {activeSpec.cover && (
              <Card class="p-4">
                <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Image class="w-4 h-4 text-primary" />
                  封面图规范
                </text>
                <view class="space-y-3">
                  <view class="grid grid-cols-2 gap-3 text-sm">
                    <view class="p-3 bg-background rounded-lg">
                      <text class="text-muted-foreground text-xs mb-1">推荐比例</text>
                      <text class="font-medium text-foreground">{{ activeSpec.cover.recommended }}</text>
                    </view>
                    <view class="p-3 bg-background rounded-lg">
                      <text class="text-muted-foreground text-xs mb-1">推荐尺寸</text>
                      <text class="font-medium text-foreground">{{ activeSpec.cover.size }}</text>
                    </view>
                    {activeSpec.cover.minSize && (
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">最小尺寸</text>
                        <text class="font-medium text-foreground">{{ activeSpec.cover.minSize }}</text>
                      </view>
                    )}
                    <view class="p-3 bg-background rounded-lg">
                      <text class="text-muted-foreground text-xs mb-1">文件格式</text>
                      <text class="font-medium text-foreground">{{ activeSpec.cover.format }}</text>
                    </view>
                    <view class="p-3 bg-background rounded-lg">
                      <text class="text-muted-foreground text-xs mb-1">文件大小</text>
                      <text class="font-medium text-foreground">≤ {{ activeSpec.cover.maxFileSize }}</text>
                    </view>
                  </view>
                  {activeSpec.cover.tips && (
                    <view class="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                      <Lightbulb class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <text class="text-xs text-amber-700">{{ activeSpec.cover.tips }}</text>
                    </view>
                  )}
                </view>
              </Card>
            )}
    
            <!--   -->
            {activeSpec.content && (
              <Card class="p-4">
                <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                  {activeSpec.content.video ? (
                    <Video class="w-4 h-4 text-primary" />
                  ) : (
                    <Image class="w-4 h-4 text-primary" />
                  )}
                  内容素材规范
                </text>
                
                <!--   -->
                {activeSpec.content.images && (
                  <view class="space-y-3 mb-4">
                    <text class="text-sm font-medium text-muted-foreground">图片</text>
                    <view class="grid grid-cols-2 gap-3 text-sm">
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">推荐比例</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.images.recommended }}</text>
                      </view>
                      {activeSpec.content.images.size && (
                        <view class="p-3 bg-background rounded-lg">
                          <text class="text-muted-foreground text-xs mb-1">推荐尺寸</text>
                          <text class="font-medium text-foreground">{{ activeSpec.content.images.size }}</text>
                        </view>
                      )}
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">最多数量</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.images.maxCount }}张</text>
                      </view>
                    </view>
                    {activeSpec.content.images.tips && (
                      <view class="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                        <Lightbulb class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <text class="text-xs text-amber-700">{{ activeSpec.content.images.tips }}</text>
                      </view>
                    )}
                  </view>
                )}
    
                <!--   -->
                {activeSpec.content.video && (
                  <view class="space-y-3">
                    <text class="text-sm font-medium text-muted-foreground">视频</text>
                    
                    <!--   -->
                    {activeSpec.content.video.horizontal && (
                      <view class="grid grid-cols-3 gap-2">
                        <view class="p-3 bg-background rounded-lg text-center">
                          <RectangleHorizontal class="w-8 h-5 mx-auto mb-1 text-muted-foreground" />
                          <text class="text-xs font-medium">{{ activeSpec.content.video.horizontal.ratio }}</text>
                          <text class="text-[10px] text-muted-foreground">{{ activeSpec.content.video.horizontal.desc }}</text>
                        </view>
                        <view class="p-3 bg-primary/5 rounded-lg text-center border border-primary/20">
                          <RectangleVertical class="w-4 h-6 mx-auto mb-1 text-primary" />
                          <text class="text-xs font-medium text-primary">{{ activeSpec.content.video.vertical.ratio }}</text>
                          <text class="text-[10px] text-primary">{{ activeSpec.content.video.vertical.desc }}</text>
                        </view>
                        <view class="p-3 bg-background rounded-lg text-center">
                          <Square class="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                          <text class="text-xs font-medium">{{ activeSpec.content.video.square.ratio }}</text>
                          <text class="text-[10px] text-muted-foreground">{{ activeSpec.content.video.square.desc }}</text>
                        </view>
                      </view>
                    )}
    
                    <view class="grid grid-cols-2 gap-3 text-sm">
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">文件格式</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.video.format }}</text>
                      </view>
                      {activeSpec.content.video.maxDuration && (
                        <view class="p-3 bg-background rounded-lg">
                          <text class="text-muted-foreground text-xs mb-1">最长时长</text>
                          <text class="font-medium text-foreground">{{ activeSpec.content.video.maxDuration }}</text>
                        </view>
                      )}
                      {activeSpec.content.video.maxFileSize && (
                        <view class="p-3 bg-background rounded-lg">
                          <text class="text-muted-foreground text-xs mb-1">文件大小</text>
                          <text class="font-medium text-foreground">≤ {{ activeSpec.content.video.maxFileSize }}</text>
                        </view>
                      )}
                      {activeSpec.content.video.codec && (
                        <view class="p-3 bg-background rounded-lg">
                          <text class="text-muted-foreground text-xs mb-1">编码格式</text>
                          <text class="font-medium text-foreground">{{ activeSpec.content.video.codec }}</text>
                        </view>
                      )}
                    </view>
                  </view>
                )}
    
                <!--   -->
                {activeSpec.content.stream && (
                  <view class="space-y-3">
                    <text class="text-sm font-medium text-muted-foreground">推流设置</text>
                    <view class="grid grid-cols-2 gap-3 text-sm">
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">推荐分辨率</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.stream.resolution }}</text>
                      </view>
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">推荐码率</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.stream.bitrate }}</text>
                      </view>
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">帧率</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.stream.fps }}</text>
                      </view>
                    </view>
                  </view>
                )}
    
                <!--   -->
                {activeSpec.content.detail && (
                  <view class="space-y-3 mt-4">
                    <text class="text-sm font-medium text-muted-foreground">详情图</text>
                    <view class="p-3 bg-background rounded-lg">
                      <text class="text-muted-foreground text-xs mb-1">推荐规格</text>
                      <text class="font-medium text-foreground">{{ activeSpec.content.detail.recommended }}</text>
                    </view>
                    {activeSpec.content.detail.tips && (
                      <view class="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                        <Lightbulb class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <text class="text-xs text-amber-700">{{ activeSpec.content.detail.tips }}</text>
                      </view>
                    )}
                  </view>
                )}
    
                <!--   -->
                {activeSpec.content.banner && (
                  <view class="space-y-3 mt-4">
                    <text class="text-sm font-medium text-muted-foreground">横幅/Banner</text>
                    <view class="grid grid-cols-2 gap-3 text-sm">
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">推荐比例</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.banner.recommended }}</text>
                      </view>
                      <view class="p-3 bg-background rounded-lg">
                        <text class="text-muted-foreground text-xs mb-1">推荐尺寸</text>
                        <text class="font-medium text-foreground">{{ activeSpec.content.banner.size }}</text>
                      </view>
                    </view>
                  </view>
                )}
              </Card>
            )}
    
            <!--   -->
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3 flex items-center gap-2">
                <HelpCircle class="w-4 h-4 text-primary" />
                非标准素材适配规则
              </text>
              <text class="text-xs text-muted-foreground mb-3">
                即使上传的素材不符合推荐规范，系统也会自动处理以确保正常展示
              </text>
              <view class="space-y-2">
                {activeSpec.adaptRules.map((rule, i) => (
                  <view key={i} class="flex items-start gap-2 p-2 rounded-lg bg-background">
                    {rule.status === "ok" ? (
                      <Check class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <view class="flex-1 min-w-0">
                      <text class="text-sm font-medium text-foreground">{{ rule.case }}</text>
                      <text class="text-xs text-muted-foreground">{{ rule.handle }}</text>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3">常用比例对比</text>
              <view class="flex items-end justify-around gap-2 py-4">
                <view class="text-center">
                  <view class="w-16 h-9 bg-blue-100 rounded border border-blue-200 mx-auto mb-1" />
                  <text class="text-[10px] text-muted-foreground">16:9</text>
                  <text class="text-[10px] text-muted-foreground">视频/课程</text>
                </view>
                <view class="text-center">
                  <view class="w-12 h-9 bg-green-100 rounded border border-green-200 mx-auto mb-1" />
                  <text class="text-[10px] text-muted-foreground">4:3</text>
                  <text class="text-[10px] text-muted-foreground">传统照片</text>
                </view>
                <view class="text-center">
                  <view class="w-10 h-10 bg-purple-100 rounded border border-purple-200 mx-auto mb-1" />
                  <text class="text-[10px] text-muted-foreground">1:1</text>
                  <text class="text-[10px] text-muted-foreground">商品/头像</text>
                </view>
                <view class="text-center">
                  <view class="w-8 h-12 bg-pink-100 rounded border border-pink-200 mx-auto mb-1" />
                  <text class="text-[10px] text-muted-foreground">3:4</text>
                  <text class="text-[10px] text-muted-foreground">竖版照片</text>
                </view>
                <view class="text-center">
                  <view class="w-6 h-11 bg-red-100 rounded border border-red-200 mx-auto mb-1" />
                  <text class="text-[10px] text-muted-foreground">9:16</text>
                  <text class="text-[10px] text-muted-foreground">短视频</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-8">
            <text class="font-medium text-foreground mb-3">通用建议</text>
            <view class="space-y-2">
              
    <view v-for="(tip, i) in generalTips" :key="i"> (
                <view key={i} class="p-3 bg-white rounded-xl border border-muted">
                  <text class="text-sm font-medium text-foreground mb-1">{{ tip.title }}</text>
                  <text class="text-xs text-muted-foreground">{{ tip.content }}</text>
                </view>
              ))}
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
const mediaSpecs = [
const generalTips = [

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