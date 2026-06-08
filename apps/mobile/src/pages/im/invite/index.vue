<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">邀请有礼</text>
      <text class="v0-route">V0: im/invite</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <view class="flex items-center justify-between px-4 h-14">
              <Button 
                variant="ghost" 
                size="icon" 
                @click={() => router.back()}
                class="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft class="w-5 h-5" />
              </Button>
              <text class="text-lg font-semibold">邀请好友</text>
              <view class="w-10" />
            </view>
          </view>
    
          <DataState
            loading={{ loading }}
            error={{ error }}
            empty={{ !linkInfo }}
            emptyMessage="暂无邀请信息"
            onRetry={() => window.location.reload()}
          >
            <view class="p-4 space-y-4">
              <!--   -->
              <view class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/50">
                <view class="flex items-center gap-2 mb-2">
                  <Gift class="w-5 h-5 text-amber-600" />
                  <text class="font-semibold text-amber-800 dark:text-amber-200">邀请奖励</text>
                </view>
                <view class="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <view>• 好友注册即得 <text class="font-semibold">10积分</text></view>
                  <view>• 好友首次付费返佣 <text class="font-semibold">10%</text></view>
                  <view>• 好友开通会员再得 <text class="font-semibold">20元</text></view>
                </view>
              </view>
    
              <!--   -->
              <Tabs value={{ activeTab }} onValueChange={(v) => setActiveTab(v as TabType)}>
                <TabsList class="grid w-full grid-cols-3">
                  <TabsTrigger value="link" class="gap-1.5">
                    <Link2 class="w-4 h-4" />
                    推荐链接
                  </TabsTrigger>
                  <TabsTrigger value="qrcode" class="gap-1.5">
                    <QrCode class="w-4 h-4" />
                    二维码
                  </TabsTrigger>
                  <TabsTrigger value="poster" class="gap-1.5">
                    <ImageIcon class="w-4 h-4" />
                    分享海报
                  </TabsTrigger>
                </TabsList>
    
                <!--   -->
                <TabsContent value="link" class="mt-4 space-y-4">
                  <view class="bg-card rounded-xl p-4 border">
                    <view class="text-sm text-muted-foreground mb-2">我的邀请码</view>
                    <view class="flex items-center justify-between">
                      <text class="text-2xl font-bold text-primary tracking-widest">
                        {{ linkInfo?.inviteCode }}
                      </text>
                      <Button variant="outline" size="sm" @click={{ handleCopyCode }}>
                        <Copy class="w-4 h-4 mr-1" />
                        复制
                      </Button>
                    </view>
                  </view>
    
                  <view class="bg-card rounded-xl p-4 border">
                    <view class="text-sm text-muted-foreground mb-2">邀请链接</view>
                    <view class="bg-muted/50 rounded-lg p-3 text-sm break-all text-foreground/80">
                      {{ linkInfo?.inviteLink }}
                    </view>
                    <Button 
                      class="w-full mt-3" 
                      @click={{ handleCopyLink }}
                      :disabled={{ copied }}
                    >
                      {copied ? (
                        
                          <Check class="w-4 h-4 mr-2" />
                          已复制
                        
                      ) : (
                        
                          <Copy class="w-4 h-4 mr-2" />
                          复制链接
                        
                      )}
                    </Button>
                  </view>
                </TabsContent>
    
                <!--   -->
                <TabsContent value="qrcode" class="mt-4">
                  <view class="bg-card rounded-xl p-6 border text-center">
                    <view class="inline-block p-4 bg-white rounded-xl shadow-sm">
                      <image 
                        src={linkInfo?.qrCodeUrl || '/placeholder.svg'} 
                        alt="邀请二维码"
                        class="w-48 h-48"
                      />
                    </view>
                    <text class="mt-4 text-sm text-muted-foreground">
                      长按或扫描二维码加入
                    </text>
                    <text class="mt-1 text-primary font-semibold">
                      邀请码: {{ linkInfo?.inviteCode }}
                    </text>
                    
                    <view class="mt-4 flex gap-3">
                      <Button 
                        variant="outline" 
                        class="flex-1"
                        @click={() => {
                          if (linkInfo?.qrCodeUrl) {
                            const link = document.createElement('a')
                            link.download = `qrcode_${{ linkInfo.inviteCode }}.png`
                            link.href = linkInfo.qrCodeUrl
                            link.click()
                            toast.success('二维码已保存')
                           }}
                      >
                        <Download class="w-4 h-4 mr-2" />
                        保存二维码
                      </Button>
                      <Button class="flex-1" @click={{ handleCopyLink }}>
                        <Copy class="w-4 h-4 mr-2" />
                        复制链接
                      </Button>
                    </view>
                  </view>
                </TabsContent>
    
                <!--   -->
                <TabsContent value="poster" class="mt-4">
                  <view class="bg-card rounded-xl p-4 border">
                    <!--   -->
                    <view class="mb-4">
                      <view class="text-sm text-muted-foreground mb-2">选择背景</view>
                      <view class="flex gap-2">
                        {posterConfig?.backgroundImages.map((bg, index) => (
                          <view class="v0-btn"
                            key={{ index }}
                            @click={() => setSelectedBg(index)}
                            class={`w-16 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                              selectedBg === index 
                                ? 'border-primary ring-2 ring-primary/20' 
                                : 'border-transparent hover:border-muted-foreground/30'
                            }`}
                          >
                            <image 
                              src={{ bg }} 
                              alt={`背景${index + 1}`}
                              class="w-full h-full object-cover"
                            />
                          </view>
                        ))}
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="relative flex justify-center bg-muted/30 rounded-lg p-4">
                      {generatingPoster && (
                        <view class="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg z-10">
                          <Loader2 class="w-8 h-8 animate-spin text-primary" />
                        </view>
                      )}
                      <canvas 
                        ref={{ canvasRef }}
                        class="max-w-full h-auto rounded-lg shadow-lg"
                        :style=" maxHeight: '400px' }}
                      />
                    </view>
    
                    <!--   -->
                    <view class="mt-4 flex gap-3">
                      <Button 
                        variant="outline" 
                        class="flex-1"
                        @click={{ generatePoster }}
                        :disabled={{ generatingPoster }}
                      >
                        {generatingPoster ? (
                          <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ImageIcon class="w-4 h-4 mr-2" />
                        )}
                        重新生成
                      </Button>
                      <Button 
                        class="flex-1"
                        @click={{ handleSavePoster }}
                        :disabled={{ !posterGenerated }}
                      >
                        <Download class="w-4 h-4 mr-2" />
                        保存海报
                      </Button>
                    </view>
                  </view>
                </TabsContent>
              </Tabs>
    
              <!--   -->
              <view class="bg-card rounded-xl p-4 border">
                <view class="text-sm text-muted-foreground mb-3">分享到</view>
                <view class="grid grid-cols-4 gap-4">
                  <view class="v0-btn" 
                    @click={() => handleShare('wechat')}
                    class="flex flex-col items-center gap-1.5"
                  >
                    <view class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89l-.006-.033zm-2.722 2.394c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                      </svg>
                    </view>
                    <text class="text-xs text-muted-foreground">微信</text>
                  </view>
                  
                  <view class="v0-btn" 
                    @click={() => handleShare('moments')}
                    class="flex flex-col items-center gap-1.5"
                  >
                    <view class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" fill="white" />
                      </svg>
                    </view>
                    <text class="text-xs text-muted-foreground">朋友圈</text>
                  </view>
                  
                  <view class="v0-btn" 
                    @click={() => handleShare('qq')}
                    class="flex flex-col items-center gap-1.5"
                  >
                    <view class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29.43 2.212 0 6.29.256 6.29-.43 0-.687-1.77-1.182-1.77-1.182 2.084-1.77 1.904-3.967 1.904-3.967.846 1.588 1.634 2.072 1.748 2.072.11 0 .281-.36.281-1.025 0-2.514-2.163-6.954-2.163-6.954V9.325C18.293 3.364 14.268 2 12.003 2z"/>
                      </svg>
                    </view>
                    <text class="text-xs text-muted-foreground">QQ</text>
                  </view>
                  
                  <view class="v0-btn" 
                    @click={() => handleShare('copy')}
                    class="flex flex-col items-center gap-1.5"
                  >
                    <view class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Copy class="w-6 h-6 text-muted-foreground" />
                    </view>
                    <text class="text-xs text-muted-foreground">复制链接</text>
                  </view>
                </view>
              </view>
    
              <!--   -->
              <Button 
                variant="outline" 
                class="w-full justify-between"
                @click={() => router.push('/mine/invite-records')}
              >
                <text>查看邀请记录</text>
                <ChevronRight class="w-4 h-4" />
              </Button>
            </view>
          </DataState>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
    const messages: Record<ShareChannel, string> = {

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