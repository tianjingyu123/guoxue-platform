<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">数据报告</text>
      <text class="v0-route">V0: report/result/[id]</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/messages" />
              <text class="font-semibold text-base text-foreground">举报处理结果</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-4 pb-24">
            <!--   -->
            <Card class={cn(
              "p-6 text-center",
              isProcessed 
                ? "bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20"
                : "bg-gradient-to-br from-muted/50 via-muted/30 to-transparent border-border"
            )}>
              <view class={cn(
                "w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3",
                isProcessed ? "bg-green-500/20" : "bg-muted"
              )}>
                {isProcessed ? (
                  <Check class="w-8 h-8 text-green-500" />
                ) : (
                  <Info class="w-8 h-8 text-muted-foreground" />
                )}
              </view>
              <text class={cn(
                "text-lg font-bold",
                isProcessed ? "text-green-600" : "text-muted-foreground"
              )}>
                {{ report.resultTitle }}
              </text>
              <text class="text-xs text-muted-foreground mt-1">
                处理时间：{{ report.processTime }}
              </text>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle class="w-4 h-4 text-amber-500" />
                被举报对象
              </text>
              
              <view class="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                {report.targetType === "user" ? (
                  
                    <Avatar class="w-12 h-12">
                      <AvatarImage src={{ report.target.avatar }} alt={{ report.target.nickname }} />
                      <AvatarFallback class="bg-primary/10 text-primary">
                        {{ report.target.nickname[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 min-w-0">
                      <Badge variant="outline" class="text-[10px] px-1.5 py-0 mb-1 border-blue-500/30 text-blue-500">
                        用户
                      </Badge>
                      <text class="font-medium text-sm text-foreground">{{ report.target.nickname }}</text>
                    </view>
                  
                ) : (
                  
                    <view class="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      {report.targetType === "post" ? (
                        <FileText class="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <User class="w-5 h-5 text-muted-foreground" />
                      )}
                    </view>
                    <view class="flex-1 min-w-0">
                      <Badge variant="outline" class="text-[10px] px-1.5 py-0 mb-1 border-primary/30 text-primary">
                        {report.targetType === "post" ? "帖子" : "评论"}
                      </Badge>
                      {report.target.title && (
                        <text class="font-medium text-sm text-foreground line-clamp-1">{{ report.target.title }}</text>
                      )}
                      <text class="text-xs text-muted-foreground line-clamp-2 mt-0.5">{{ report.target.content }}</text>
                      <text class="text-xs text-muted-foreground mt-1">发布者：{{ report.target.nickname }}</text>
                    </view>
                  
                )}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="text-sm font-medium text-foreground mb-3">举报信息</text>
              <view class="space-y-3">
                <view class="flex items-center justify-between py-2 border-b border-border/50">
                  <text class="text-sm text-muted-foreground">举报编号</text>
                  <text class="text-sm text-foreground font-mono">{{ report.id }}</text>
                </view>
                <view class="flex items-center justify-between py-2 border-b border-border/50">
                  <text class="text-sm text-muted-foreground">举报类型</text>
                  <Badge variant="secondary" class="text-xs bg-amber-500/10 text-amber-600 border-0">
                    {{ report.reportType }}
                  </Badge>
                </view>
                <view class="flex items-center justify-between py-2">
                  <text class="text-sm text-muted-foreground">举报时间</text>
                  <text class="text-sm text-foreground">{{ report.reportTime }}</text>
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Shield class="w-4 h-4 text-primary" />
                处理说明
              </text>
              <text class="text-sm text-muted-foreground leading-relaxed">
                {{ report.resultDescription }}
              </text>
              
              {report.punishment && (
                <view class="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <text class="text-xs text-muted-foreground mb-1">处罚措施</text>
                  <text class="text-sm text-green-600 font-medium">{{ report.punishment }}</text>
                </view>
              )}
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <Link href="/content/community-rules" class="flex items-center justify-between">
                <view class="flex items-center gap-3">
                  <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <HelpCircle class="w-5 h-5 text-primary" />
                  </view>
                  <view>
                    <text class="text-sm font-medium text-foreground">查看平台内容规范</text>
                    <text class="text-xs text-muted-foreground">了解什么是违规内容</text>
                  </view>
                </view>
                <ChevronRight class="w-5 h-5 text-muted-foreground" />
              </Link>
            </Card>
    
            <!--   -->
            <view class="text-center py-4">
              <text class="text-xs text-muted-foreground">
                如对处理结果有异议，可
                <Link href="/help" class="text-primary">联系客服</Link>
                进一步反馈
              </text>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="flex items-center gap-3 px-4 py-3">
              <Link
                href="/"
                class="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Home class="w-4 h-4" />
                返回首页
              </Link>
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
  const isProcessed = report.result === "processed"

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