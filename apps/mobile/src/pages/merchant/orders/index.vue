<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">订单</text>
      <text class="v0-route">V0: merchant/orders</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <Link href="/merchant/dashboard" class="mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="text-lg font-semibold">订单管理</text>
            </view>
          </view>
          
          <!--   -->
          <view class="p-4 space-y-3">
            <view class="flex gap-2">
              <view class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索订单号/商品名称" 
                  value={{ searchQuery }}
                  @change={e => setSearchQuery(e.target.value)}
                  class="pl-9"
                />
              </view>
              <Button variant="outline" size="icon">
                <Filter class="w-4 h-4" />
              </Button>
            </view>
            
            <!--   -->
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-4 h-9">
                <TabsTrigger value="all" class="text-xs">全部({{ stats.all }})</TabsTrigger>
                <TabsTrigger value="pending" class="text-xs">待发货({{ stats.pending }})</TabsTrigger>
                <TabsTrigger value="shipped" class="text-xs">已发货({{ stats.shipped }})</TabsTrigger>
                <TabsTrigger value="refunding" class="text-xs">退款({{ stats.refunding }})</TabsTrigger>
              </TabsList>
            </Tabs>
          </view>
          
          <!--   -->
          <view class="px-4 space-y-3">
            
    <view v-for="(order, index) in filteredOrders" :key="index"> {
              const config = statusConfig[order.status as keyof typeof statusConfig]
              const StatusIcon = config.icon
              
              return (
                <Link key={order.id} href={`/merchant/order-detail?id=${order.id}`}>
                  <Card class="p-4 hover:shadow-md transition-shadow">
                    <!--   -->
                    <view class="flex items-center justify-between mb-3">
                      <text class="text-xs text-muted-foreground">订单号: {{ order.id }}</text>
                      <Badge class={cn("text-xs", config.color)}>
                        <StatusIcon class="w-3 h-3 mr-1" />
                        {{ config.label }}
                      </Badge>
                    </view>
                    
                    <!--   -->
                    <view class="flex gap-3">
                      <view class="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <text class="text-xl">📦</text>
                      </view>
                      <view class="flex-1 min-w-0">
                        <text class="text-sm font-medium text-foreground line-clamp-2">{{ order.productTitle }}</text>
                        <view class="flex items-center justify-between mt-1">
                          <text class="text-xs text-muted-foreground">x{{ order.quantity }}</text>
                          <text class="text-sm font-medium">¥{{ order.price }}</text>
                        </view>
                      </view>
                    </view>
                    
                    <!--   -->
                    <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <text class="text-xs text-muted-foreground">
                        {order.createdAt.split(" ")[0]}
                      </text>
                      <view class="flex items-center gap-2">
                        <text class="text-sm">
                          共{{ order.quantity }}件，实付: <text class="font-bold text-primary">¥{{ order.totalAmount }}</text>
                        </text>
                        <ChevronRight class="w-4 h-4 text-muted-foreground" />
                      </view>
                    </view>
                    
                    <!--   -->
                    {order.status === "pending" && (
                      <view class="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                        <Button variant="outline" size="sm" @click={e => e.preventDefault()}>
                          修改价格
                        </Button>
                        <Button size="sm" @click={e => e.preventDefault()}>
                          立即发货
                        </Button>
                      </view>
                    )}
                    
                    {order.status === "refunding" && (
                      <view class="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                        <Button variant="outline" size="sm" @click={e => e.preventDefault()}>
                          拒绝退款
                        </Button>
                        <Button variant="destructive" size="sm" @click={e => e.preventDefault()}>
                          同意退款
                        </Button>
                      </view>
                    )}
                  </Card>
                </Link>
              )
            })}
            
            {filteredOrders.length === 0 && (
              <view class="py-20 text-center">
                <text class="text-muted-foreground">暂无订单</text>
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
const orders = [
const statusConfig = {
  const stats = {

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