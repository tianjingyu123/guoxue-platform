<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">scan</text>
      <text class="v0-route">V0: common/scan</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackUrl="/" />
              <text class="font-semibold">扫码结果</text>
              <view class="w-10" />
            </view>
          </view>
    
          <view class="p-4">
            <!--   -->
            {status === 'parsing' && (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Loader2 class="w-10 h-10 text-primary animate-spin" />
                </view>
                <text class="text-muted-foreground">正在解析二维码...</text>
              </view>
            )}
    
            <!--   -->
            {status === 'success' && result && (
              <view class="space-y-6">
                <!--   -->
                <view class="flex justify-center">
                  <view class={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center",
                    typeConfig?.bgColor
                  )}>
                    <TypeIcon class={cn("w-10 h-10", typeConfig?.color)} />
                  </view>
                </view>
    
                <text class="text-center text-muted-foreground">{{ typeConfig?.label }}</text>
    
                <!--   -->
                <Card class="p-4">
                  <!--   -->
                  {result.type === 'friend' && (
                    <view class="flex items-center gap-4">
                      <Avatar class="w-16 h-16">
                        <AvatarImage src={{ result.data.avatar as string }} />
                        <AvatarFallback>{{ (result.data.nickname as string)?.[0] }}</AvatarFallback>
                      </Avatar>
                      <view class="flex-1 min-w-0">
                        <text class="font-semibold text-lg">{{ result.data.nickname as string }}</text>
                        <text class="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {{ result.data.signature as string }}
                        </text>
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'group' && (
                    <view class="flex items-center gap-4">
                      <Avatar class="w-16 h-16 rounded-lg">
                        <AvatarImage src={{ result.data.avatar as string }} />
                        <AvatarFallback class="rounded-lg">{{ (result.data.name as string)?.[0] }}</AvatarFallback>
                      </Avatar>
                      <view class="flex-1 min-w-0">
                        <text class="font-semibold text-lg">{{ result.data.name as string }}</text>
                        <text class="text-sm text-muted-foreground">{{ result.data.memberCount as number }}人</text>
                        <text class="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {{ result.data.description as string }}
                        </text>
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'pay' && (
                    <view class="flex items-center gap-4">
                      <Avatar class="w-16 h-16">
                        <AvatarImage src={{ result.data.merchantAvatar as string }} />
                        <AvatarFallback>{{ (result.data.merchantName as string)?.[0] }}</AvatarFallback>
                      </Avatar>
                      <view class="flex-1 min-w-0">
                        <text class="font-semibold text-lg">{{ result.data.merchantName as string }}</text>
                        <text class="text-sm text-muted-foreground">向TA付款</text>
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'course' && (
                    <view class="flex gap-3">
                      <image 
                        src={{ result.data.cover as string }} 
                        alt={{ result.data.title as string }}
                        class="w-24 h-16 rounded-lg object-cover"
                      />
                      <view class="flex-1 min-w-0">
                        <text class="font-medium line-clamp-2">{{ result.data.title as string }}</text>
                        <text class="text-sm text-muted-foreground mt-1">{{ result.data.teacher as string }}</text>
                        <text class="text-primary font-semibold mt-1">¥{{ result.data.price as number }}</text>
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'article' && (
                    <view class="flex gap-3">
                      <image 
                        src={{ result.data.cover as string }} 
                        alt={{ result.data.title as string }}
                        class="w-24 h-16 rounded-lg object-cover"
                      />
                      <view class="flex-1 min-w-0">
                        <text class="font-medium line-clamp-2">{{ result.data.title as string }}</text>
                        <text class="text-sm text-muted-foreground mt-1">{{ result.data.author as string }}</text>
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'live' && (
                    <view class="flex gap-3">
                      <view class="relative">
                        <image 
                          src={{ result.data.cover as string }} 
                          alt={{ result.data.title as string }}
                          class="w-24 h-16 rounded-lg object-cover"
                        />
                        {result.data.status === 'live' && (
                          <text class="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded">
                            直播中
                          </text>
                        )}
                      </view>
                      <view class="flex-1 min-w-0">
                        <text class="font-medium line-clamp-2">{{ result.data.title as string }}</text>
                        <text class="text-sm text-muted-foreground mt-1">{{ result.data.host as string }}</text>
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'invite' && (
                    <view class="text-center">
                      <Avatar class="w-16 h-16 mx-auto mb-3">
                        <AvatarImage src={{ result.data.inviterAvatar as string }} />
                        <AvatarFallback>{{ (result.data.inviterName as string)?.[0] }}</AvatarFallback>
                      </Avatar>
                      <text class="text-muted-foreground mb-2">
                        <text class="font-medium text-foreground">{{ result.data.inviterName as string }}</text> 邀请您加入热卜
                      </text>
                      <view class="space-y-1 mt-4">
                        {(result.data.benefits as string[])?.map((benefit, idx) => (
                          <view key={idx} class="flex items-center justify-center gap-2 text-sm">
                            <CheckCircle class="w-4 h-4 text-green-500" />
                            <text>{{ benefit }}</text>
                          </view>
                        ))}
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'checkin' && (
                    <view class="text-center">
                      <text class="font-semibold text-lg">{{ result.data.eventName as string }}</text>
                      <text class="text-muted-foreground mt-2">{{ result.data.eventTime as string }}</text>
                      <text class="text-muted-foreground">{{ result.data.location as string }}</text>
                    </view>
                  )}
    
                  <!--   -->
                  {result.type === 'url' && (
                    <view>
                      <text class="text-sm text-muted-foreground mb-2">即将访问外部链接：</text>
                      <text class="text-sm text-blue-600 break-all">{{ result.data.url as string }}</text>
                      <text class="text-xs text-amber-600 mt-2">请注意识别链接安全性</text>
                    </view>
                  )}
                </Card>
    
                <!--   -->
                {result.action && (
                  <Button 
                    class="w-full h-12 text-base"
                    @click={{ handleAction }}
                    :disabled={{ actionLoading }}
                  >
                    {actionLoading ? (
                      <Loader2 class="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ArrowRight class="w-5 h-5 mr-2" />
                    )}
                    {{ result.action.label }}
                  </Button>
                )}
              </view>
            )}
    
            <!--   -->
            {status === 'error' && (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <XCircle class="w-10 h-10 text-gray-400" />
                </view>
                <text class="font-semibold text-lg mb-2">无法识别二维码</text>
                <text class="text-muted-foreground text-center mb-6">
                  {content ? '该二维码内容无法识别或已失效' : '未获取到二维码内容'}
                </text>
                
                {result?.type === 'unknown' && result.data.content && (
                  <Card class="w-full p-4 mb-6">
                    <text class="text-sm text-muted-foreground mb-1">原始内容：</text>
                    <text class="text-sm break-all">{{ result.data.content as string }}</text>
                  </Card>
                )}
    
                <view class="flex gap-3">
                  <Button variant="outline" @click={() => router.back()}>
                    <RefreshCw class="w-4 h-4 mr-2" />
                    重新扫码
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/">
                      <Home class="w-4 h-4 mr-2" />
                      返回首页
                    </Link>
                  </Button>
                </view>
              </view>
            )}
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
  const configs: Record<ScanResultType, { icon: typeof UserPlus; label: string; color: string; bgColor: string }> = {

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