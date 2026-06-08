<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/revenue</text>
    </view>
        <view class="min-h-screen bg-muted/30 pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <view class="flex items-center gap-3">
                <Link href="/merchant/dashboard">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">收入管理</text>
              </view>
              <Button variant="ghost" size="icon">
                <Calendar class="w-5 h-5" />
              </Button>
            </view>
          </view>
          
          <!--   -->
          <view class="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 pb-20">
            <view class="flex items-center justify-between">
              <view>
                <text class="text-sm text-primary-foreground/80">可提现余额(元)</text>
                <text class="text-3xl font-bold mt-1">{{ revenueData.balance.toFixed(2) }}</text>
              </view>
              <Button variant="secondary" class="bg-white text-primary hover:bg-white/90">
                <Wallet class="w-4 h-4 mr-2" />
                提现
              </Button>
            </view>
            
            <view class="flex items-center gap-6 mt-4 text-sm">
              <view>
                <text class="text-primary-foreground/70">待结算</text>
                <text class="font-medium">¥{{ revenueData.pendingSettle.toFixed(2) }}</text>
              </view>
              <view>
                <text class="text-primary-foreground/70">冻结中</text>
                <text class="font-medium">¥{{ revenueData.frozen.toFixed(2) }}</text>
              </view>
            </view>
          </view>
          
          <!--   -->
          <view class="px-4 -mt-12">
            <Card class="p-4 shadow-lg">
              <view class="grid grid-cols-3 gap-4">
                <view class="text-center">
                  <text class="text-lg font-bold text-foreground">¥{{ (revenueData.totalIncome/1000).toFixed(1) }}k</text>
                  <text class="text-xs text-muted-foreground mt-0.5">累计收入</text>
                </view>
                <view class="text-center border-x border-border">
                  <text class="text-lg font-bold text-foreground">¥{{ revenueData.monthIncome.toFixed(0) }}</text>
                  <text class="text-xs text-muted-foreground mt-0.5">本月收入</text>
                </view>
                <view class="text-center">
                  <view class="flex items-center justify-center gap-1">
                    <TrendingUp class="w-4 h-4 text-green-600" />
                    <text class="text-lg font-bold text-green-600">+{{ revenueData.monthCompare }}%</text>
                  </view>
                  <text class="text-xs text-muted-foreground mt-0.5">环比上月</text>
                </view>
              </view>
            </Card>
          </view>
          
          <!--   -->
          <view class="mt-4 px-4">
            <view class="flex items-center justify-between mb-3">
              <text class="font-medium">收支明细</text>
              <Button variant="ghost" size="sm" class="text-xs">
                <Download class="w-4 h-4 mr-1" />
                导出
              </Button>
            </view>
            
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-4 h-9 mb-3">
                <TabsTrigger value="all" class="text-xs">全部</TabsTrigger>
                <TabsTrigger value="income" class="text-xs">收入</TabsTrigger>
                <TabsTrigger value="withdraw" class="text-xs">提现</TabsTrigger>
                <TabsTrigger value="refund" class="text-xs">支出</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <view class="space-y-2">
              
    <view v-for="(item, index) in filteredTransactions" :key="index"> {
                const config = typeConfig[item.type as keyof typeof typeConfig]
                const status = statusConfig[item.status as keyof typeof statusConfig]
                const Icon = config.icon
                
                return (
                  <Card key={item.id} class="p-3">
                    <view class="flex items-center gap-3">
                      <view class={cn("w-10 h-10 rounded-full flex items-center justify-center bg-muted", config.color)}>
                        <Icon class="w-5 h-5" />
                      </view>
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="text-sm font-medium">{{ item.title }}</text>
                          <Badge class={cn("text-[10px]", status.color)}>{{ status.label }}</Badge>
                        </view>
                        <text class="text-xs text-muted-foreground mt-0.5">
                          {item.orderNo ? `订单: ${item.orderNo}` : item.bankCard}
                        </text>
                      </view>
                      <view class="text-right">
                        <text class={cn(
                          "font-medium",
                          item.amount > 0 ? "text-green-600" : "text-foreground"
                        )}>
                          {item.amount > 0 ? "+" : ""}{{ item.amount.toFixed(2) }}
                        </text>
                        <text class="text-xs text-muted-foreground mt-0.5">{{ item.createdAt }}</text>
                      </view>
                    </view>
                  </Card>
                )
              })}
            </view>
          </view>
          
          <!--   -->
          <view class="mt-4 px-4">
            <Card class="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50">
              <view class="flex items-start gap-2">
                <Clock class="w-4 h-4 text-amber-600 mt-0.5" />
                <view>
                  <text class="text-sm font-medium text-foreground">结算说明</text>
                  <text class="text-xs text-muted-foreground mt-1">
                    订单完成后7天自动结算到可提现余额，提现到银行卡1-3个工作日到账。
                  </text>
                </view>
              </view>
            </Card>
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
const revenueData = {
const transactions = [
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