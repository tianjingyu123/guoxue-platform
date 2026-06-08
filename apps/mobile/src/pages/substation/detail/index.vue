<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">substation</text>
      <text class="v0-route">V0: substation/[id]</text>
    </view>
        <view class="min-h-screen bg-background">
          <view class="max-w-lg mx-auto">
            <!--   -->
            <view 
              class="sticky top-0 z-50 h-11 flex items-center justify-between px-4"
              :style=" backgroundColor: station.themeColor }}
            >
              <Link href="/" class="p-1">
                <ArrowLeft class="w-5 h-5 text-white" />
              </Link>
              <text class="text-white font-medium">{{ station.name }}</text>
              <Link href={`/substation/${station.id}/poster`} class="p-1">
                <Share2 class="w-5 h-5 text-white" />
              </Link>
            </view>
            
            <!--   -->
            <view 
              class="px-4 pt-6 pb-8"
              :style=" background: `linear-gradient(180deg, ${{ station.themeColor }} 0%, ${{ station.themeColor }}00 100%)` }}
            >
              <view class="flex items-start gap-4">
                <!--   -->
                <view 
                  class="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden flex-shrink-0"
                  :style=" backgroundColor: station.themeColor }}
                >
                  {{ station.masterAvatar ? (
                    <image src={station.masterAvatar }} alt="" class="w-full h-full object-cover" />
                  ) : (
                    <view class="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {{ station.masterName.charAt(0) }}
                    </view>
                  )}
                </view>
                
                <!--   -->
                <view class="flex-1 pt-1">
                  <view class="flex items-center gap-2 mb-1">
                    <text class="text-xl font-bold text-white">{{ station.masterName }}</text>
                    <Badge class="bg-white/20 text-white border-0 text-[10px]">
                      <Crown class="w-3 h-3 mr-0.5" />
                      站长
                    </Badge>
                  </view>
                  <text class="text-white/80 text-sm mb-2">{{ station.name }}</text>
                  <view class="flex flex-wrap gap-1.5">
                    {station.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" class="bg-white/20 text-white border-0 text-[10px]">
                        {{ tag }}
                      </Badge>
                    ))}
                  </view>
                </view>
              </view>
              
              <!--   -->
              <view class="grid grid-cols-3 gap-4 mt-6 bg-white rounded-2xl p-4 shadow-sm">
                <view class="text-center">
                  <text class="text-xl font-bold" :style=" color: station.themeColor }}>{{ station.memberCount }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">成员</text>
                </view>
                <view class="text-center border-x border-border">
                  <text class="text-xl font-bold" :style=" color: station.themeColor }}>{{ station.contentCount }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">精选内容</text>
                </view>
                <view class="text-center">
                  <text class="text-xl font-bold" :style=" color: station.themeColor }}>
                    {{ Math.floor((new Date(station.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) }}
                  </text>
                  <text class="text-xs text-muted-foreground mt-0.5">剩余天数</text>
                </view>
              </view>
            </view>
            
            <!--   -->
            <view class="px-4 py-4 bg-card mx-4 -mt-4 rounded-xl shadow-sm">
              <text class="font-medium text-sm mb-2 flex items-center gap-1.5">
                <Star class="w-4 h-4" :style=" color: station.themeColor }} />
                站长简介
              </text>
              <text class="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {{ station.masterIntro }}
              </text>
            </view>
            
            <!--   -->
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }} class="mt-4">
              <TabsList class="w-full grid grid-cols-3 mx-4 max-w-[calc(100%-2rem)]">
                <TabsTrigger value="featured">站长精选</TabsTrigger>
                <TabsTrigger value="activities">最新动态</TabsTrigger>
                <TabsTrigger value="contact">联系站长</TabsTrigger>
              </TabsList>
              
              <!--   -->
              <TabsContent value="featured" class="px-4 mt-4">
                <view class="space-y-3">
                  {station.featured.map((item) => (
                    <FeaturedCard key={item.id} item={{ item }} themeColor={{ station.themeColor }} />
                  ))}
                </view>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="activities" class="px-4 mt-4">
                <view class="space-y-3">
                  {station.activities.map((activity) => (
                    <view key={activity.id} class="flex items-start gap-3 p-3 bg-card rounded-lg">
                      <view 
                        class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        :style=" backgroundColor: station.themeColor }}
                      />
                      <view class="flex-1">
                        <text class="text-sm">{{ activity.content }}</text>
                        <text class="text-xs text-muted-foreground mt-1">{{ activity.time }}</text>
                      </view>
                    </view>
                  ))}
                </view>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="contact" class="px-4 mt-4">
                <Card class="p-4">
                  <view class="text-center">
                    <view 
                      class="w-32 h-32 mx-auto rounded-xl flex items-center justify-center mb-3"
                      :style=" backgroundColor: `${{ station.themeColor }}10` }}
                    >
                      <QrCode class="w-16 h-16" :style=" color: station.themeColor }} />
                    </view>
                    <text class="text-sm text-muted-foreground mb-4">扫码添加站长微信</text>
                    <Button 
                      class="w-full"
                      :style=" backgroundColor: station.themeColor }}
                    >
                      <MessageCircle class="w-4 h-4 mr-2" />
                      发送私信
                    </Button>
                  </view>
                </Card>
              </TabsContent>
            </Tabs>
            
            <!--   -->
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border max-w-lg mx-auto">
              <Link href={`/substation/${station.id}/poster`}>
                <Button 
                  class="w-full"
                  :style=" backgroundColor: station.themeColor }}
                >
                  <Share2 class="w-4 h-4 mr-2" />
                  生成分享海报
                </Button>
              </Link>
            </view>
            
            <view class="h-20" /> <!--   -->
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
  const typeConfig = {

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