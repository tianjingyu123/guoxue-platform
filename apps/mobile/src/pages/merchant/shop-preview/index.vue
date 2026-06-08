<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/shop-preview</text>
    </view>
        <view class="min-h-screen bg-muted/30 pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <Link href="/merchant/profile">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="text-lg font-semibold">店铺预览</text>
              <Button variant="ghost" size="icon">
                <Share2 class="w-5 h-5" />
              </Button>
            </view>
          </view>
          
          <!--   -->
          <view class="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 pb-6">
            <view class="flex items-start gap-4">
              <view class="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Store class="w-8 h-8" />
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2">
                  <text class="text-lg font-bold truncate">{{ shopData.name }}</text>
                  <Badge class="bg-amber-500/90 text-white text-[10px] flex-shrink-0">{{ shopData.level }}</Badge>
                </view>
                <text class="text-sm text-primary-foreground/80 mt-1 line-clamp-2">{{ shopData.slogan }}</text>
                <view class="flex items-center gap-3 mt-2 text-sm">
                  <view class="flex items-center gap-1">
                    <Star class="w-4 h-4 fill-amber-400 text-amber-400" />
                    <text class="font-medium">{{ shopData.rating }}</text>
                  </view>
                  <text class="text-primary-foreground/60">|</text>
                  <text>{{ shopData.followerCount }}关注</text>
                  <text class="text-primary-foreground/60">|</text>
                  <text>{{ shopData.productCount }}商品</text>
                </view>
              </view>
            </view>
            
            <!--   -->
            <view class="flex flex-wrap gap-2 mt-4">
              {shopData.badges.map(badge => (
                <Badge key={badge} variant="secondary" class="bg-white/20 text-white text-[10px] border-0">
                  {{ badge }}
                </Badge>
              ))}
            </view>
          </view>
          
          <!--   -->
          <Card class="mx-4 -mt-3 relative z-10 p-4">
            <view class="grid grid-cols-4 gap-2 text-center">
              <view>
                <text class="text-lg font-bold text-foreground">{{ shopData.productCount }}</text>
                <text class="text-xs text-muted-foreground">全部商品</text>
              </view>
              <view>
                <text class="text-lg font-bold text-foreground">{{ shopData.salesCount }}</text>
                <text class="text-xs text-muted-foreground">总销量</text>
              </view>
              <view>
                <text class="text-lg font-bold text-foreground">{{ shopData.reviewCount }}</text>
                <text class="text-xs text-muted-foreground">评价数</text>
              </view>
              <view>
                <text class="text-lg font-bold text-foreground">{{ shopData.followerCount }}</text>
                <text class="text-xs text-muted-foreground">粉丝数</text>
              </view>
            </view>
            
            <!--   -->
            <view class="flex gap-3 mt-4 pt-4 border-t border-border">
              <Button variant="outline" class="flex-1">
                <Heart class="w-4 h-4 mr-1" />
                关注店铺
              </Button>
              <Button variant="outline" class="flex-1">
                <MessageSquare class="w-4 h-4 mr-1" />
                联系客服
              </Button>
            </view>
          </Card>
          
          <!--   -->
          <Card class="mx-4 mt-3 p-4">
            <text class="font-medium mb-3">店铺信息</text>
            <view class="space-y-2 text-sm">
              <view class="flex items-center gap-2 text-muted-foreground">
                <Phone class="w-4 h-4" />
                <text>{{ shopData.phone }}</text>
              </view>
              <view class="flex items-center gap-2 text-muted-foreground">
                <MapPin class="w-4 h-4" />
                <text>{{ shopData.address }}</text>
              </view>
              <view class="flex items-center gap-2 text-muted-foreground">
                <Clock class="w-4 h-4" />
                <text>营业时间: {{ shopData.businessHours }}</text>
              </view>
            </view>
          </Card>
          
          <!--   -->
          <view class="mt-4">
            <Tabs defaultValue="all">
              <view class="px-4 sticky top-14 z-40 bg-muted/30 py-2">
                <TabsList class="w-full grid grid-cols-4 h-9">
                  <TabsTrigger value="all" class="text-xs">全部</TabsTrigger>
                  <TabsTrigger value="hot" class="text-xs">热销</TabsTrigger>
                  <TabsTrigger value="new" class="text-xs">新品</TabsTrigger>
                  <TabsTrigger value="price" class="text-xs">价格</TabsTrigger>
                </TabsList>
              </view>
              
              <TabsContent value="all" class="mt-0 px-4">
                <view class="grid grid-cols-2 gap-3">
                  
    <view v-for="(product, index) in products" :key="index"> (
                    <Card key={product.id} class="overflow-hidden">
                      <view class="aspect-square bg-muted flex items-center justify-center">
                        <text class="text-4xl">📦</text>
                      </view>
                      <view class="p-3">
                        <text class="text-sm font-medium line-clamp-2">{{ product.title }}</text>
                        <view class="flex items-baseline gap-1 mt-2">
                          <text class="text-base font-bold text-primary">¥{{ product.price }}</text>
                          {product.originalPrice && (
                            <text class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
                          )}
                        </view>
                        <text class="text-xs text-muted-foreground mt-1">已售 {{ product.sales }}</text>
                      </view>
                    </Card>
                  ))}
                </view>
              </TabsContent>
            </Tabs>
          </view>
          
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
            <view class="flex items-center gap-3">
              <Button variant="outline" size="icon" class="relative">
                <ShoppingCart class="w-5 h-5" />
                <text class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  2
                </text>
              </Button>
              <Button class="flex-1">
                去购物车结算
              </Button>
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
const shopData = {
const products = [

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