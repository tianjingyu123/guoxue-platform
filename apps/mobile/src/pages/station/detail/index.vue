<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分站管理</text>
      <text class="v0-route">V0: station/[id]</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="fixed top-0 left-0 right-0 z-50 safe-area-pt">
      <view class="flex items-center justify-between px-4 h-12">
      <BackButton overlay fallbackPath="/discover" />
              <view class="flex items-center gap-2">
                <view class="v0-btn" 
                  @click={() => setIsCollected(!isCollected)}
                  class="p-2 rounded-full bg-black/30 backdrop-blur-sm"
                >
                  <Heart class={`w-5 h-5 ${isCollected ? "text-primary fill-primary" : "text-white"}`} />
                </view>
                <view class="v0-btn" class="p-2 rounded-full bg-black/30 backdrop-blur-sm">
                  <Share2 class="w-5 h-5 text-white" />
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="relative aspect-video bg-secondary">
            <view class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-secondary">
              <ImageIcon class="w-16 h-16 text-muted-foreground/30" />
            </view>
            {stationData.covers[currentCover]?.caption && (
              <view class="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-xs">
                {{ stationData.covers[currentCover].caption }}
              </view>
            )}
            <!--   -->
            <view class="absolute bottom-3 right-3 flex gap-1.5">
              {stationData.covers.map((_, index) => (
                <view class="v0-btn"
                  key={{ index }}
                  @click={() => setCurrentCover(index)}
                  class={`w-2 h-2 rounded-full transition-colors ${
                    currentCover === index ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4 bg-card border-b border-border">
            <view class="flex items-start justify-between mb-3">
              <view>
                <text class="text-lg font-bold text-foreground">{{ stationData.name }}</text>
                <view class="flex items-center gap-2 mt-1">
                  <view class="flex items-center gap-1">
                    <Star class="w-4 h-4 text-accent fill-accent" />
                    <text class="text-sm font-medium text-accent">{{ stationData.rating }}</text>
                  </view>
                  <text class="text-xs text-muted-foreground">{{ stationData.reviewCount }}条评价</text>
                  <Badge variant="outline" class="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                    {{ stationData.distance }}
                  </Badge>
                </view>
              </view>
            </view>
    
            <text class="text-sm text-muted-foreground mb-4">{{ stationData.description }}</text>
    
            <!--   -->
            <view class="space-y-2.5">
              <view class="flex items-center gap-3">
                <view class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin class="w-4 h-4 text-primary" />
                </view>
                <text class="flex-1 text-sm text-foreground">{{ stationData.address }}</text>
                <view class="v0-btn" class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  导航
                </view>
              </view>
              <view class="flex items-center gap-3">
                <view class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Phone class="w-4 h-4 text-accent" />
                </view>
                <text class="flex-1 text-sm text-foreground">{{ stationData.phone }}</text>
                <text href={`tel:${stationData.phone}`} class="px-3 py-1.5 border border-primary text-primary text-xs font-medium rounded-full">
                  拨打
                </text>
              </view>
              <view class="flex items-center gap-3">
                <view class="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Clock class="w-4 h-4 text-muted-foreground" />
                </view>
                <text class="flex-1 text-sm text-muted-foreground">营业时间：{{ stationData.hours }}</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <Calendar class="w-4 h-4 text-primary" />
                <text class="font-semibold text-base text-foreground">近期课程</text>
              </view>
              <Link href={`/station/${stationData.id}/courses`} class="flex items-center gap-1 text-xs text-muted-foreground">
                全部课程 <ChevronRight class="w-3 h-3" />
              </Link>
            </view>
            <view class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {stationData.courses.map(course => (
                <Link key={course.id} href={`/course/${course.id}`} class="flex-shrink-0 w-48">
                  <Card class="overflow-hidden">
                    <view class="aspect-[4/3] bg-secondary flex items-center justify-center relative">
                      <ImageIcon class="w-8 h-8 text-muted-foreground/30" />
                      {course.enrolled >= course.seats && (
                        <view class="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded">
                          已满
                        </view>
                      )}
                    </view>
                    <view class="p-3">
                      <text class="text-sm font-medium text-foreground line-clamp-1">{{ course.title }}</text>
                      <view class="flex items-center gap-2 mt-1.5">
                        <text class="text-xs text-muted-foreground">{{ course.date }}</text>
                        <text class="text-xs text-muted-foreground">{{ course.time }}</text>
                      </view>
                      <view class="flex items-center justify-between mt-2">
                        <text class="text-sm text-primary font-medium">¥{{ course.price }}</text>
                        <text class="text-[10px] text-muted-foreground">
                          {{ course.enrolled }}/{{ course.seats }}人
                        </text>
                      </view>
                    </view>
                  </Card>
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <ShoppingBag class="w-4 h-4 text-accent" />
                <text class="font-semibold text-base text-foreground">驿站好物</text>
              </view>
              <Link href={`/station/${stationData.id}/products`} class="flex items-center gap-1 text-xs text-muted-foreground">
                全部商品 <ChevronRight class="w-3 h-3" />
              </Link>
            </view>
            <view class="grid grid-cols-2 gap-3">
              {stationData.products.map(product => (
                <Link key={product.id} href={`/mall/product/${product.id}`}>
                  <Card class="overflow-hidden">
                    <view class="aspect-square bg-secondary flex items-center justify-center">
                      <ShoppingBag class="w-8 h-8 text-muted-foreground/30" />
                    </view>
                    <view class="p-2.5">
                      <text class="text-xs font-medium text-foreground line-clamp-2">{{ product.name }}</text>
                      <view class="flex items-center gap-2 mt-1.5">
                        <text class="text-sm text-primary font-medium">¥{{ product.price }}</text>
                        <text class="text-[10px] text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
                      </view>
                      <text class="text-[10px] text-muted-foreground">已售{{ product.sales }}</text>
                    </view>
                  </Card>
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <ImageIcon class="w-4 h-4 text-primary" />
                <text class="font-semibold text-base text-foreground">环境预览</text>
              </view>
              <text class="text-xs text-muted-foreground">{{ stationData.photos.length }}张</text>
            </view>
            <view class="grid grid-cols-3 gap-2">
              {stationData.photos.map((photo, index) => (
                <view 
                  key={photo.id}
                  class="relative aspect-square rounded-lg overflow-hidden bg-secondary cursor-pointer group"
                  @click={() => setSelectedPhoto(index)}
                >
                  <view class="absolute inset-0 flex items-center justify-center">
                    <ImageIcon class="w-6 h-6 text-muted-foreground/30" />
                  </view>
                  <view class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <view class="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/50 to-transparent">
                    <text class="text-[10px] text-white">{{ photo.caption }}</text>
                  </view>
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <Users class="w-4 h-4 text-accent" />
                <text class="font-semibold text-base text-foreground">学员评价</text>
                <text class="text-xs text-muted-foreground">({{ stationData.reviewCount }})</text>
              </view>
              <Link href={`/station/${stationData.id}/reviews`} class="flex items-center gap-1 text-xs text-muted-foreground">
                全部评价 <ChevronRight class="w-3 h-3" />
              </Link>
            </view>
            <view class="space-y-3">
              {stationData.reviews.map(review => (
                <Card key={review.id} class="p-3">
                  <view class="flex items-center gap-2 mb-2">
                    <Avatar class="w-8 h-8">
                      <AvatarImage src={{ review.avatar }} alt={{ review.user }} />
                      <AvatarFallback class="bg-secondary text-foreground text-xs">
                        {{ review.user[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1">
                      <text class="text-sm font-medium text-foreground">{{ review.user }}</text>
                      <view class="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={{ i }} 
                            class={`w-3 h-3 ${i < review.rating ? "text-accent fill-accent" : "text-muted-foreground/30"}`} 
                          />
                        ))}
                      </view>
                    </view>
                    <text class="text-[10px] text-muted-foreground">{{ review.date }}</text>
                  </view>
                  <text class="text-sm text-muted-foreground line-clamp-2">{{ review.content }}</text>
                </Card>
              ))}
            </view>
          </view>
    
          <!--   -->
          {selectedPhoto !== null && (
            <view 
              class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              @click={() => setSelectedPhoto(null)}
            >
              <view class="v0-btn" 
                class="absolute top-4 right-4 p-2 rounded-full bg-white/10 safe-area-pt"
                @click={() => setSelectedPhoto(null)}
              >
                <ArrowLeft class="w-5 h-5 text-white rotate-45" />
              </view>
              <view class="w-full max-w-lg px-4">
                <view class="aspect-square bg-secondary/20 rounded-xl flex items-center justify-center">
                  <ImageIcon class="w-16 h-16 text-white/30" />
                </view>
                <text class="text-center text-white text-sm mt-3">
                  {{ stationData.photos[selectedPhoto]?.caption }}
                </text>
              </view>
              <!--   -->
              <view class="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                {stationData.photos.map((_, index) => (
                  <view class="v0-btn"
                    key={{ index }}
                    @click={(e) => { e.stopPropagation(); setSelectedPhoto(index); }}
                    class={`w-2 h-2 rounded-full ${selectedPhoto === index ? "bg-white" : "bg-white/30"}`}
                  />
                ))}
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="flex items-center gap-3 px-4 h-16">
              <text 
                href={`https://maps.apple.com/?address=${encodeURIComponent(stationData.address)}`}
                class="flex-1 flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground font-medium rounded-xl"
              >
                <Navigation class="w-4 h-4" />
                导航到店
              </text>
              <text 
                href={`tel:${stationData.phone}`}
                class="flex-1 flex items-center justify-center gap-2 h-11 border border-primary text-primary font-medium rounded-xl"
              >
                <Phone class="w-4 h-4" />
                电话咨询
              </text>
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
const stationData = {

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