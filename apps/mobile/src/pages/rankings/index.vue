<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">rankings</text>
      <text class="v0-route">V0: rankings</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <view class="flex items-center px-4 h-12">
              <Link href="/" class="p-1 mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <view class="flex items-center gap-2">
                <Trophy class="w-5 h-5" />
                <text class="font-medium">热卜榜单</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-12 z-40 bg-background border-b border-border">
            <view class="flex overflow-x-auto scrollbar-hide">
              
    <view v-for="(cat, index) in categories" :key="index"> (
                <view class="v0-btn"
                  key={{ cat.id }}
                  @click={() => setActiveCategory(cat.id)}
                  class={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeCategory === cat.id
                      ? "text-amber-600 border-amber-500"
                      : "text-muted-foreground border-transparent"
                  )}
                >
                  <cat.icon class="w-4 h-4" />
                  {{ cat.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 flex justify-end">
            <view class="flex items-center gap-1 bg-secondary rounded-full p-0.5">
              {[
                { id: "week", label: "本周" },
                { id: "month", label: "本月" },
                { id: "total", label: "总榜" },
              ].map((item) => (
                <view class="v0-btn"
                  key={{ item.id }}
                  @click={() => setTimeRange(item.id as typeof timeRange)}
                  class={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    timeRange === item.id
                      ? "bg-amber-500 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ item.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 space-y-3">
            <!--   -->
            {activeCategory === "circles" && circleRanks.map((item, index) => {{ const rank = index + 1
              const style = getRankStyle(rank)
              return (
                <Card key={item.id }} class={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
                  <view class="flex items-center gap-3">
                    <view class={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                      {{ rank }}
                    </view>
                    <Avatar class="w-12 h-12 rounded-xl">
                      <AvatarImage src={{ item.avatar }} />
                      <AvatarFallback class="bg-primary/10 text-primary rounded-xl">
                        {{ item.name.slice(0, 1) }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 min-w-0">
                      <text class="font-medium truncate">{{ item.name }}</text>
                      <text class="text-xs text-muted-foreground">圈主：{{ item.owner }}</text>
                    </view>
                    <view class="text-right">
                      <text class="font-bold text-amber-600">{{ (item.members / 1000).toFixed(1) }}k</text>
                      <text class="text-[10px] text-green-500">+{{ item.growth }}</text>
                    </view>
                  </view>
                </Card>
              )
            })}
    
            <!--   -->
            {activeCategory === "creators" && creatorRanks.map((item, index) => {{ const rank = index + 1
              const style = getRankStyle(rank)
              return (
                <Card key={item.id }} class={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
                  <view class="flex items-center gap-3">
                    <view class={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                      {{ rank }}
                    </view>
                    <Avatar class="w-12 h-12">
                      <AvatarImage src={{ item.avatar }} />
                      <AvatarFallback class="bg-primary/10 text-primary">
                        {{ item.name.slice(0, 1) }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 min-w-0">
                      <text class="font-medium">{{ item.name }}</text>
                      <text class="text-xs text-muted-foreground">{{ item.title }}</text>
                      <view class="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <text class="flex items-center gap-0.5">
                          <Users class="w-3 h-3" />
                          {{ (item.followers / 1000).toFixed(1) }}k
                        </text>
                        <text class="flex items-center gap-0.5">
                          <Heart class="w-3 h-3" />
                          {{ (item.likes / 1000).toFixed(1) }}k
                        </text>
                        <text class="flex items-center gap-0.5">
                          <BookOpen class="w-3 h-3" />
                          {{ item.articles }}篇
                        </text>
                      </view>
                    </view>
                  </view>
                </Card>
              )
            })}
    
            <!--   -->
            {activeCategory === "courses" && courseRanks.map((item, index) => {{ const rank = index + 1
              const style = getRankStyle(rank)
              return (
                <Card key={item.id }} class={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
                  <view class="flex items-center gap-3">
                    <view class={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                      {{ rank }}
                    </view>
                    <view class="w-16 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <BookOpen class="w-6 h-6 text-muted-foreground" />
                    </view>
                    <view class="flex-1 min-w-0">
                      <text class="font-medium text-sm truncate">{{ item.name }}</text>
                      <text class="text-xs text-muted-foreground">{{ item.teacher }}</text>
                      <view class="flex items-center gap-2 mt-1">
                        <text class="text-[10px] text-muted-foreground">{{ item.students }}人学习</text>
                        <text class="flex items-center gap-0.5 text-[10px] text-amber-500">
                          <Star class="w-3 h-3 fill-current" />
                          {{ item.rating }}
                        </text>
                      </view>
                    </view>
                    <text class="font-bold text-primary">¥{{ item.price }}</text>
                  </view>
                </Card>
              )
            })}
    
            <!--   -->
            {activeCategory === "products" && productRanks.map((item, index) => {{ const rank = index + 1
              const style = getRankStyle(rank)
              return (
                <Card key={item.id }} class={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
                  <view class="flex items-center gap-3">
                    <view class={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                      {{ rank }}
                    </view>
                    <view class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingBag class="w-5 h-5 text-muted-foreground" />
                    </view>
                    <view class="flex-1 min-w-0">
                      <text class="font-medium text-sm truncate">{{ item.name }}</text>
                      <view class="flex items-center gap-2 mt-1">
                        <text class="text-[10px] text-muted-foreground">{{ item.sales }}人购买</text>
                        <text class="flex items-center gap-0.5 text-[10px] text-amber-500">
                          <Star class="w-3 h-3 fill-current" />
                          {{ item.rating }}
                        </text>
                      </view>
                    </view>
                    <text class="font-bold text-primary">¥{{ item.price }}</text>
                  </view>
                </Card>
              )
            })}
    
            <!--   -->
            {activeCategory === "rising" && risingRanks.map((item, index) => {{ const rank = index + 1
              const style = getRankStyle(rank)
              return (
                <Card key={item.id }} class={cn("p-4", rank <= 3 && "border-amber-200 bg-amber-50/50")}>
                  <view class="flex items-center gap-3">
                    <view class={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", style.bg, style.text)}>
                      {{ rank }}
                    </view>
                    <Avatar class="w-12 h-12">
                      <AvatarImage src={{ item.avatar }} />
                      <AvatarFallback class="bg-green-500/10 text-green-600">
                        {{ item.name.slice(0, 1) }}
                      </AvatarFallback>
                    </Avatar>
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2">
                        <text class="font-medium">{{ item.name }}</text>
                        <Badge class="bg-green-500/10 text-green-600 text-[10px]">
                          <Flame class="w-3 h-3 mr-0.5" />
                          新星
                        </Badge>
                      </view>
                      <text class="text-xs text-muted-foreground">入驻{{ item.joinDays }}天</text>
                    </view>
                    <view class="text-right">
                      <text class="font-bold text-green-600">+{{ item.growth }}</text>
                      <text class="text-[10px] text-muted-foreground">{{ item.followers }}粉丝</text>
                    </view>
                  </view>
                </Card>
              )
            })}
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
const categories = [
const circleRanks = [
const creatorRanks = [
const courseRanks = [
const productRanks = [
const risingRanks = [

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