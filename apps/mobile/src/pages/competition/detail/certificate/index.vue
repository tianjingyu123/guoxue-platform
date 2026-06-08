<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]/certificate</text>
    </view>
        <view class="min-h-screen bg-gradient-to-b from-amber-50 to-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-transparent">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">电子证书</text>
              <view class="v0-btn" class="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow">
                <Share2 class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-6">
            <Card class="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-amber-50 border-2 border-amber-200">
              <!--   -->
              <view class="absolute inset-2 border-2 border-amber-300/50 rounded-lg pointer-events-none" />
              <view class="absolute inset-4 border border-amber-200/50 rounded pointer-events-none" />
              
              <!--   -->
              <view class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-400" />
              <view class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-400" />
              <view class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-400" />
              <view class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-400" />
              
              <view class="relative p-8 text-center">
                <!--   -->
                <view class="mb-6">
                  <Award class="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <text class="text-2xl font-bold text-amber-800 tracking-widest">荣 誉 证 书</text>
                  <text class="text-sm text-amber-600 mt-1">CERTIFICATE OF HONOR</text>
                </view>
                
                <!--   -->
                <view class="space-y-4 text-gray-800">
                  <text class="text-lg">
                    兹证明 <text class="text-2xl font-bold text-primary mx-2 border-b-2 border-primary px-2">{{ certificateData.participantName }}</text> 同志
                  </text>
                  
                  <text class="text-lg leading-relaxed">
                    在 <text class="font-medium text-amber-700">{{ certificateData.competitionTitle }}</text> 中
                  </text>
                  
                  <text class="text-lg">
                    以 <text class="text-xl font-bold text-primary">{{ certificateData.score }}</text> 分的成绩
                  </text>
                  
                  <text class="text-lg">
                    获得 <text class="text-xl font-bold text-amber-600">{{ certificateData.award }}</text> 称号
                  </text>
                  
                  <text class="text-lg">
                    排名第 <text class="text-xl font-bold text-primary">{{ certificateData.rank }}</text> 名
                  </text>
                </view>
                
                <!--   -->
                <text class="text-gray-600 mt-6">特此证明</text>
                
                <!--   -->
                <view class="mt-8 flex items-end justify-between px-4">
                  <view class="text-left">
                    <text class="text-sm text-gray-500">证书编号</text>
                    <text class="font-mono text-sm">{{ certificateData.certificateNo }}</text>
                  </view>
                  
                  <view class="text-center">
                    <!--   -->
                    <view class="w-20 h-20 mx-auto border-4 border-red-500 rounded-full flex items-center justify-center">
                      <text class="text-red-500 text-xs font-bold text-center leading-tight">
                        热卜<text>
    </text>/>国学平台
                      </text>
                    </view>
                  </view>
                  
                  <view class="text-right">
                    <text class="text-sm text-gray-500">签发日期</text>
                    <text class="text-sm">{{ certificateData.issueDate }}</text>
                  </view>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 mb-4">
            <Card class="p-4">
              <view class="grid grid-cols-2 gap-4 text-sm">
                <view>
                  <text class="text-muted-foreground">赛事名称</text>
                  <text class="font-medium">{{ certificateData.competitionTitle }}</text>
                </view>
                <view>
                  <text class="text-muted-foreground">获奖等级</text>
                  <text class="font-medium text-amber-600">{{ certificateData.award }}</text>
                </view>
                <view>
                  <text class="text-muted-foreground">证书编号</text>
                  <text class="font-mono">{{ certificateData.certificateNo }}</text>
                </view>
                <view>
                  <text class="text-muted-foreground">有效期</text>
                  <text class="font-medium">{{ certificateData.validUntil }}</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-6 space-y-3">
            <Button class="w-full">
              <Download class="w-4 h-4 mr-2" />
              保存为图片
            </Button>
            <Button variant="outline" class="w-full">
              <Share2 class="w-4 h-4 mr-2" />
              分享证书
            </Button>
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
const certificateData = {

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