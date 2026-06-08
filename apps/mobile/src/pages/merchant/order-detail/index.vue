<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/order-detail</text>
    </view>
        <view class="min-h-screen bg-muted/30 pb-32">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center h-14 px-4">
              <Link href="/merchant/orders" class="mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="text-lg font-semibold">订单详情</text>
            </view>
          </view>
          
          <!--   -->
          <view class="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4">
            <view class="flex items-center gap-3">
              <Package class="w-10 h-10" />
              <view>
                <text class="text-lg font-semibold">{{ config.label }}</text>
                <text class="text-sm text-white/80">请尽快发货，超时将自动关闭订单</text>
              </view>
            </view>
          </view>
          
          <!--   -->
          <Card class="mx-4 -mt-2 relative z-10 p-4">
            <view class="flex items-start gap-3">
              <MapPin class="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <view class="flex-1">
                <view class="flex items-center gap-2">
                  <text class="font-medium">{{ orderDetail.buyer.name }}</text>
                  <text class="text-muted-foreground">{{ orderDetail.buyer.phone }}</text>
                  <Button variant="ghost" size="icon" class="w-6 h-6" @click={() => copyText(orderDetail.buyer.phone)}>
                    <Copy class="w-3 h-3" />
                  </Button>
                </view>
                <text class="text-sm text-muted-foreground mt-1">{{ orderDetail.buyer.address }}</text>
              </view>
              <text href={`tel:${orderDetail.buyer.phone}`}>
                <Button variant="outline" size="icon" class="flex-shrink-0">
                  <Phone class="w-4 h-4" />
                </Button>
              </text>
            </view>
          </Card>
          
          <!--   -->
          <Card class="mx-4 mt-3 p-4">
            <text class="font-medium mb-3">商品信息</text>
            {orderDetail.products.map(product => (
              <view key={product.id} class="flex gap-3">
                <view class="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <text class="text-xl">📦</text>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium line-clamp-2">{{ product.title }}</text>
                  <text class="text-xs text-muted-foreground mt-1">{{ product.specs }}</text>
                  <view class="flex items-center justify-between mt-1">
                    <text class="text-sm font-medium">¥{{ product.price }}</text>
                    <text class="text-xs text-muted-foreground">x{{ product.quantity }}</text>
                  </view>
                </view>
              </view>
            ))}
            
            {orderDetail.remark && (
              <view class="mt-3 pt-3 border-t border-border">
                <view class="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <MessageSquare class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <view>
                    <text class="text-xs text-muted-foreground">买家备注</text>
                    <text class="text-sm mt-0.5">{{ orderDetail.remark }}</text>
                  </view>
                </view>
              </view>
            )}
          </Card>
          
          <!--   -->
          <Card class="mx-4 mt-3 p-4">
            <text class="font-medium mb-3">金额明细</text>
            <view class="space-y-2 text-sm">
              <view class="flex justify-between">
                <text class="text-muted-foreground">商品总价</text>
                <text>¥{{ orderDetail.amounts.productTotal }}</text>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">运费</text>
                <text>{orderDetail.amounts.shipping === 0 ? "免运费" : `¥${{ orderDetail.amounts.shipping }}`}</text>
              </view>
              {orderDetail.amounts.discount > 0 && (
                <view class="flex justify-between">
                  <text class="text-muted-foreground">优惠</text>
                  <text class="text-red-500">-¥{{ orderDetail.amounts.discount }}</text>
                </view>
              )}
              <Separator />
              <view class="flex justify-between font-medium">
                <text>实付金额</text>
                <text class="text-primary text-lg">¥{{ orderDetail.amounts.total }}</text>
              </view>
            </view>
          </Card>
          
          <!--   -->
          <Card class="mx-4 mt-3 p-4">
            <text class="font-medium mb-3">订单信息</text>
            <view class="space-y-2 text-sm">
              <view class="flex justify-between">
                <text class="text-muted-foreground">订单编号</text>
                <view class="flex items-center gap-1">
                  <text>{{ orderId }}</text>
                  <Button variant="ghost" size="icon" class="w-6 h-6" @click={() => copyText(orderId)}>
                    <Copy class="w-3 h-3" />
                  </Button>
                </view>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">下单时间</text>
                <text>{{ orderDetail.createdAt }}</text>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">付款时间</text>
                <text>{{ orderDetail.paidAt }}</text>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">支付方式</text>
                <text>{{ orderDetail.payMethod }}</text>
              </view>
            </view>
          </Card>
          
          <!--   -->
          <Card class="mx-4 mt-3 p-4">
            <text class="font-medium mb-3">订单进度</text>
            <view class="space-y-4">
              {orderDetail.timeline.map((item, index) => (
                <view key={index} class="flex gap-3">
                  <view class="flex flex-col items-center">
                    <view class={cn(
                      "w-3 h-3 rounded-full",
                      index === 0 ? "bg-primary" : "bg-muted"
                    )} />
                    {index < orderDetail.timeline.length - 1 && (
                      <view class="w-px h-full bg-border flex-1 my-1" />
                    )}
                  </view>
                  <view class="flex-1 pb-4">
                    <text class={cn("text-sm font-medium", index === 0 ? "text-foreground" : "text-muted-foreground")}>
                      {{ item.title }}
                    </text>
                    <text class="text-xs text-muted-foreground mt-0.5">{{ item.desc }}</text>
                    <text class="text-xs text-muted-foreground mt-1">{{ item.time }}</text>
                  </view>
                </view>
              ))}
            </view>
          </Card>
          
          <!--   -->
          {orderDetail.status === "pending" && (
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
              <view class="flex gap-3">
                <Button variant="outline" class="flex-1">
                  修改价格
                </Button>
                <Dialog open={{ showShipDialog }} onOpenChange={{ setShowShipDialog }}>
                  <DialogTrigger asChild>
                    <Button class="flex-1">
                      <Truck class="w-4 h-4 mr-2" />
                      发货
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>填写物流信息</DialogTitle>
                    </DialogHeader>
                    <view class="space-y-4 pt-4">
                      <!--   -->
                      <view class="space-y-2">
                        <Label>快递公司 <text class="text-destructive">*</text></Label>
                        <Select value={{ expressCompany }} onValueChange={{ setExpressCompany }}>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择快递公司" />
                          </SelectTrigger>
                          <SelectContent>
                            
    <view v-for="(company, index) in expressCompanies" :key="index"> (
                              <SelectItem key={company.id} value={{ company.id }}>
                                {{ company.name }}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </view>
                      
                      <!--   -->
                      <view class="space-y-2">
                        <Label>物流单号 <text class="text-destructive">*</text></Label>
                        <Input 
                          placeholder="请输入物流单号" 
                          value={{ trackingNo }}
                          @change={e => setTrackingNo(e.target.value)}
                        />
                        <text class="text-xs text-muted-foreground">
                          请仔细核对单号，填写错误将影响买家查询物流
                        </text>
                      </view>
                      
                      <!--   -->
                      <view class="p-3 bg-secondary/50 rounded-lg">
                        <text class="text-xs text-muted-foreground mb-2">发货商品</text>
                        <view class="flex items-center gap-2">
                          <view class="w-10 h-10 rounded bg-muted flex items-center justify-center text-sm">
                            📦
                          </view>
                          <view class="flex-1 min-w-0">
                            <text class="text-sm truncate">{{ orderDetail.products[0].title }}</text>
                            <text class="text-xs text-muted-foreground">x{{ orderDetail.products[0].quantity }}</text>
                          </view>
                        </view>
                      </view>
                      
                      <Button 
                        class="w-full" 
                        @click={{ handleShip }}
                        :disabled={{ !trackingNo || !expressCompany || isSubmitting }}
                      >
                        <template v-if="isSubmitting">
    Loader2 class="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle class="w-4 h-4 mr-2" />}
                        确认发货
                      </Button>
                    </view>
                  </DialogContent>
                </Dialog>
              </view>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const expressCompanies = [
const orderDetail = {
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