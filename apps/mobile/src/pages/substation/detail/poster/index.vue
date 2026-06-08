<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">poster</text>
      <text class="v0-route">V0: substation/[id]/poster</text>
    </view>
        <view class="min-h-screen bg-background">
          <view class="max-w-lg mx-auto">
            <!--   -->
            <view class="sticky top-0 z-50 h-11 flex items-center justify-between px-4 bg-background border-b border-border">
              <Link href={`/substation/${station.id}`} class="p-1">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">分享海报</text>
              <view class="w-6" />
            </view>
            
            <!--   -->
            <view class="p-4">
              <view 
                ref={{ posterRef }}
                class={cn(
                  "relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl",
                  selectedTemplate.bgColor
                )}
              >
                <!--   -->
                <view class="absolute inset-0 opacity-10">
                  <view class="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <view class="absolute bottom-0 left-0 w-60 h-60 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                </view>
                
                <!--   -->
                <view class="relative h-full flex flex-col p-6">
                  <!--   -->
                  <view class="flex items-center gap-2 mb-8">
                    <view 
                      class="w-8 h-8 rounded-lg flex items-center justify-center"
                      :style=" backgroundColor: station.themeColor }}
                    >
                      <text class="text-white text-sm font-bold">
                        {{ station.name.charAt(0) }}
                      </text>
                    </view>
                    <text class={cn("text-sm font-medium", selectedTemplate.textColor)}>
                      热卜国学
                    </text>
                  </view>
                  
                  <!--   -->
                  <view class="flex-1 flex flex-col items-center justify-center text-center">
                    <!--   -->
                    <view 
                      class="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden mb-4"
                      :style=" backgroundColor: station.themeColor }}
                    >
                      {{ station.masterAvatar ? (
                        <image src={station.masterAvatar }} alt="" class="w-full h-full object-cover" />
                      ) : (
                        <view class="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                          {{ station.masterName.charAt(0) }}
                        </view>
                      )}
                    </view>
                    
                    <!--   -->
                    <text class={cn("text-2xl font-bold mb-2", selectedTemplate.textColor)}>
                      {{ station.name }}
                    </text>
                    <text class={cn("text-sm opacity-80 mb-6", selectedTemplate.textColor)}>
                      {{ station.masterName }} · 诚邀您加入
                    </text>
                    
                    <!--   -->
                    <view class="flex items-center gap-6 mb-8">
                      <view class="text-center">
                        <text class={cn("text-2xl font-bold", selectedTemplate.accentColor)}>
                          {{ station.memberCount }}
                        </text>
                        <text class={cn("text-xs opacity-70", selectedTemplate.textColor)}>成员</text>
                      </view>
                      <view class="w-px h-8 bg-white/20" />
                      <view class="text-center">
                        <text class={cn("text-2xl font-bold", selectedTemplate.accentColor)}>
                          {{ station.contentCount }}
                        </text>
                        <text class={cn("text-xs opacity-70", selectedTemplate.textColor)}>精选</text>
                      </view>
                    </view>
                    
                    <!--   -->
                    <text class={cn("text-sm opacity-70 max-w-[200px]", selectedTemplate.textColor)}>
                      {{ station.masterIntro }}
                    </text>
                  </view>
                  
                  <!--   -->
                  <view class="flex flex-col items-center">
                    <view class="w-24 h-24 bg-white rounded-xl p-2 mb-3">
                      {{ station.qrCode ? (
                        <image src={station.qrCode }} alt="" class="w-full h-full" />
                      ) : (
                        <view class="w-full h-full flex items-center justify-center bg-secondary rounded-lg">
                          <QrCode class="w-12 h-12 text-muted-foreground" />
                        </view>
                      )}
                    </view>
                    <text class={cn("text-xs opacity-70", selectedTemplate.textColor)}>
                      扫码加入{{ station.name }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
            
            <!--   -->
            <view class="px-4 mb-4">
              <text class="text-sm font-medium mb-3">选择风格</text>
              <view class="flex gap-3">
                
    <view v-for="(template, index) in posterTemplates" :key="index"> (
                  <view class="v0-btn"
                    key={{ template.id }}
                    @click={() => setSelectedTemplate(template)}
                    class={cn(
                      "flex-1 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all",
                      selectedTemplate.id === template.id 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-transparent"
                    )}
                  >
                    <view class={cn("w-full h-full", template.bgColor)}>
                      <view class="h-full flex flex-col items-center justify-center p-2">
                        <view class="w-6 h-6 rounded-full bg-white/30 mb-1" />
                        <view class="w-8 h-1 rounded bg-white/50 mb-0.5" />
                        <view class="w-6 h-0.5 rounded bg-white/30" />
                      </view>
                    </view>
                  </view>
                ))}
              </view>
              <view class="flex gap-3 mt-2">
                
    <view v-for="(template, index) in posterTemplates" :key="index"> (
                  <text 
                    key={template.id}
                    class={cn(
                      "flex-1 text-center text-xs",
                      selectedTemplate.id === template.id ? "text-primary font-medium" : "text-muted-foreground"
                    )}
                  >
                    {{ template.name }}
                  </text>
                ))}
              </view>
            </view>
            
            <!--   -->
            <view class="px-4 pb-8">
              <view class="flex gap-3">
                <Button
                  variant="outline"
                  class="flex-1"
                  @click={{ handleSave }}
                  :disabled={{ isSaving }}
                >
                  {saved ? (
                    
                      <Check class="w-4 h-4 mr-2" />
                      已保存
                    
                  ) : isSaving ? (
                    
                      <Download class="w-4 h-4 mr-2 animate-bounce" />
                      保存中...
                    
                  ) : (
                    
                      <Download class="w-4 h-4 mr-2" />
                      保存图片
                    
                  )}
                </Button>
                <Button 
                  class="flex-1"
                  :style=" backgroundColor: station.themeColor }}
                >
                  <Share2 class="w-4 h-4 mr-2" />
                  分享海报
                </Button>
              </view>
              
              <text class="text-xs text-muted-foreground text-center mt-4">
                分享海报邀请好友，好友通过您的专属链接加入平台后将永久归属您的分站
              </text>
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
const stationData = {
const posterTemplates = [

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