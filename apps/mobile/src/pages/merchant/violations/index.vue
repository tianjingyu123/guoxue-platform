<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/violations</text>
    </view>
        <view class="min-h-screen bg-muted/30 pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <Link href="/merchant/dashboard" class="mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="text-lg font-semibold">违规管理</text>
            </view>
          </view>
          
          <!--   -->
          <view class="p-4">
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <view>
                  <text class="text-sm text-muted-foreground">店铺扣分</text>
                  <view class="flex items-baseline gap-1 mt-1">
                    <text class="text-3xl font-bold text-foreground">{{ violationStats.score }}</text>
                    <text class="text-sm text-muted-foreground">/ {{ violationStats.maxScore }}分</text>
                  </view>
                </view>
                <view class={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  scorePercent > 50 ? "bg-red-100" : scorePercent > 25 ? "bg-amber-100" : "bg-green-100"
                )}>
                  <text class={cn(
                    "text-lg font-bold",
                    scorePercent > 50 ? "text-red-600" : scorePercent > 25 ? "text-amber-600" : "text-green-600"
                  )}>
                    {scorePercent > 50 ? "警告" : scorePercent > 25 ? "注意" : "良好"}
                  </text>
                </view>
              </view>
              
              <!--   -->
              <view class="w-full h-2 bg-muted rounded-full overflow-hidden">
                <view 
                  class={cn(
                    "h-full rounded-full transition-all",
                    scorePercent > 50 ? "bg-red-500" : scorePercent > 25 ? "bg-amber-500" : "bg-green-500"
                  )}
                  :style=" width: `${{ scorePercent }}%` }}
                />
              </view>
              
              <view class="flex items-center gap-4 mt-4 text-sm">
                <view class="flex items-center gap-1">
                  <text class="text-muted-foreground">违规次数</text>
                  <text class="font-medium">{{ violationStats.total }}</text>
                </view>
                <view class="flex items-center gap-1">
                  <text class="text-muted-foreground">待处理</text>
                  <text class="font-medium text-red-600">{{ violationStats.pending }}</text>
                </view>
              </view>
            </Card>
            
            <!--   -->
            <Card class="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50">
              <view class="flex items-start gap-2">
                <Info class="w-4 h-4 text-amber-600 mt-0.5" />
                <view class="text-xs text-muted-foreground">
                  <text>扣分满48分将被暂停营业资格，每季度初清零一次。</text>
                  <text class="mt-1">如有异议可在收到通知后3天内提交申诉。</text>
                </view>
              </view>
            </Card>
          </view>
          
          <!--   -->
          <view class="px-4">
            <text class="font-medium mb-3">违规记录</text>
            
            <view class="space-y-3">
              
    <view v-for="(violation, index) in violations" :key="index"> {
                const config = typeConfig[violation.type as keyof typeof typeConfig]
                const status = statusConfig[violation.status as keyof typeof statusConfig]
                const Icon = config.icon
                
                return (
                  <Card key={violation.id} class="p-4">
                    <view class="flex items-start gap-3">
                      <view class={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", config.color)}>
                        <Icon class="w-5 h-5" />
                      </view>
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center justify-between">
                          <text class="font-medium text-foreground">{{ violation.title }}</text>
                          <Badge class={cn("text-[10px]", status.color)}>{{ status.label }}</Badge>
                        </view>
                        <text class="text-sm text-muted-foreground mt-1">{{ violation.description }}</text>
                        
                        <view class="mt-2 text-xs text-muted-foreground">
                          {violation.productTitle && <text>商品: {violation.productTitle}</text>}
                          {violation.orderNo && <text>订单: {violation.orderNo}</text>}
                        </view>
                        
                        <view class="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded text-xs">
                          <text class="text-red-600">处罚: {{ violation.penalty }}</text>
                        </view>
                        
                        <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <text class="text-xs text-muted-foreground">{{ violation.createdAt }}</text>
                          {violation.status === "pending" && (
                            <view class="flex gap-2">
                              <Button variant="outline" size="sm">申诉</Button>
                              <Button size="sm">去处理</Button>
                            </view>
                          )}
                          {violation.status === "processed" && (
                            <text class="text-xs text-muted-foreground">
                              处理时间: {{ violation.processedAt }}
                            </text>
                          )}
                        </view>
                      </view>
                    </view>
                  </Card>
                )
              })}
            </view>
            
            {violations.length === 0 && (
              <view class="py-20 text-center">
                <view class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert class="w-8 h-8 text-green-600" />
                </view>
                <text class="text-muted-foreground">暂无违规记录，继续保持！</text>
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
const violationStats = {
const violations = [
const typeConfig = {
const statusConfig = {

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