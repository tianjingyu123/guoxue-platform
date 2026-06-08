<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/application-status</text>
    </view>
        <view class="min-h-screen bg-background">
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="flex items-center"><Link href="/" class="mr-3"><ArrowLeft class="w-5 h-5" /></Link><text class="text-lg font-semibold">入驻申请状态</text></view>
              <view class="v0-btn" @click={{ handleRefresh }} class={cn("p-2", isLoading && "animate-spin")}><RefreshCw class="w-5 h-5 text-muted-foreground" /></view>
            </view>
          </view>
          
          <view class="p-4 space-y-4">
            <Card class={cn("p-6", config.bgColor)}>
              <view class="flex flex-col items-center text-center">
                <view class={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", config.bgColor)}><StatusIcon class={cn("w-10 h-10", config.color)} /></view>
                <text class="text-xl font-bold mb-2">{{ config.title }}</text>
                <text class="text-sm text-muted-foreground">{{ config.desc }}</text>
                <view class="mt-4 px-4 py-2 bg-background rounded-lg"><text class="text-sm text-muted-foreground">店铺名称：</text><text class="font-medium">{{ applicationData.shopName }}</text></view>
              </view>
            </Card>
            
            {!["SUSPENDED", "CLOSED"].includes(status) && (
              <Card class="p-4">
                <text class="font-medium mb-4">申请进度</text>
                <view class="flex items-center justify-between relative">
                  <view class="absolute top-4 left-0 right-0 h-0.5 bg-muted" />
                  <view class="absolute top-4 left-0 h-0.5 bg-primary transition-all" :style=" width: `${{ (getProgressIndex() / (progressSteps.length - 1)) * 100 }}%` }} />
                  
    <view v-for="(step, index) in progressSteps" :key="index"> {
                    const isCompleted = index <= getProgressIndex()
                    const isCurrent = index === getProgressIndex()
                    return (
                      <view key={step.id} class="flex flex-col items-center relative z-10">
                        <view class={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium", isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          {isCompleted && index < getProgressIndex() ? <CheckCircle2 class="w-5 h-5" /> : index + 1}
                        </view>
                        <text class={cn("text-xs mt-2", isCurrent ? "text-primary font-medium" : "text-muted-foreground")}>{{ step.name }}</text>
                      </view>
                    )
                  })}
                </view>
              </Card>
            )}
            
            {status === "REVIEW_FAILED" && <Card class="p-4 bg-destructive/5"><text class="font-medium text-destructive mb-2">驳回原因</text><text class="text-sm text-muted-foreground">{{ applicationData.rejectReason }}</text></Card>}
            {status === "DEPOSIT_PENDING" && <Card class="p-4"><text class="font-medium mb-3">保证金信息</text><view class="flex items-baseline gap-1 mb-2"><text class="text-3xl font-bold text-primary">¥{{ applicationData.depositAmount }}</text><text class="text-sm text-muted-foreground">.00</text></view><text class="text-sm text-muted-foreground">保证金将在您退出经营时全额退还</text></Card>}
            {status === "SUSPENDED" && <Card class="p-4 bg-orange-50 dark:bg-orange-950/30"><text class="font-medium text-orange-600 mb-2">暂停原因</text><text class="text-sm text-muted-foreground">{{ applicationData.suspendReason }}</text></Card>}
            {status === "ACTIVE" && <Card class="p-4"><view class="flex items-center justify-between"><text class="text-muted-foreground">开店日期</text><text class="font-medium">{{ applicationData.openDate }}</text></view></Card>}
            
            <view class="space-y-3 pt-2">
              {status === "PENDING_REVIEW" && <Button variant="outline" class="w-full" @click={() => router.push("/merchant/edit-application")}>修改申请</Button>}
              {status === "REVIEW_FAILED" && <Button class="w-full" @click={() => router.push("/merchant/edit-application")}>修改申请</Button>}
              {status === "DEPOSIT_PENDING" && <Button class="w-full" @click={() => router.push("/merchant/pay-deposit")}><CreditCard class="w-4 h-4 mr-2" />立即缴纳保证金</Button>}
              {status === "AGREEMENT_PENDING" && <Button class="w-full" @click={() => router.push("/merchant/sign-agreement")}><FileText class="w-4 h-4 mr-2" />查看协议并签署</Button>}
              {status === "ACTIVE" && <Button class="w-full" @click={() => router.push("/merchant/dashboard")}><Store class="w-4 h-4 mr-2" />进入商家后台</Button>}
              {status === "SUSPENDED" && <Button class="w-full" variant="outline">我要申诉</Button><Button class="w-full" variant="ghost"><Headphones class="w-4 h-4 mr-2" />联系客服</Button>}
              {status === "CLOSED" && <Button class="w-full" @click={() => router.push("/merchant/apply")}>重新申请入驻</Button>}
            </view>
            
            <view class="pt-4 border-t border-dashed border-border">
              <text class="text-xs text-muted-foreground text-center mb-2">演示模式</text>
              <Button variant="outline" size="sm" class="w-full" @click={{ handleDemoSwitch }}>切换状态（{{ status }}）</Button>
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
const statusConfig = {
const progressSteps = [{ id: "submit", name: "已提交" }, { id: "review", name: "审核中" }, { id: "deposit", name: "待缴费" }, { id: "agreement", name: "待签署" }, { id: "active", name: "已开通" }]
  const applicationData = { shopName: "古韵轩书店", rejectReason: "营业执照图片不清晰，请重新上传", depositAmount: 2000, suspendReason: "存在违规商品", openDate: "2024-01-18" }
  const demoStatuses: ApplicationStatus[] = ["PENDING_REVIEW", "REVIEW_FAILED", "DEPOSIT_PENDING", "AGREEMENT_PENDING", "ACTIVE", "SUSPENDED", "CLOSED"]

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