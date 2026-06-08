<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">公告</text>
      <text class="v0-route">V0: announcements</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border">
            <view class="flex items-center px-4 h-12">
              <Link href="/" class="p-1 mr-3">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">平台公告</text>
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-12 z-40 bg-background border-b border-border">
            <view class="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
              
    <view v-for="(type, index) in announcementTypes" :key="index"> (
                <view class="v0-btn"
                  key={{ type.id }}
                  @click={() => setActiveType(type.id)}
                  class={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    activeType === type.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {{ type.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4 space-y-3">
            <!--   -->
            {topAnnouncements.length > 0 && (
              <view class="space-y-3">
                
    <view v-for="(item, index) in topAnnouncements" :key="index"> {
                  const config = typeConfig[item.type]
                  return (
                    <Link key={item.id} href={`/announcements/${item.id}`}>
                      <Card class="p-4 border-primary/30 bg-primary/5">
                        <view class="flex items-start gap-3">
                          <view class={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bgColor)}>
                            <config.icon class={cn("w-5 h-5", config.color)} />
                          </view>
                          <view class="flex-1 min-w-0">
                            <view class="flex items-center gap-2">
                              <Badge class="bg-red-500 text-white text-[10px] px-1.5">置顶</Badge>
                              {item.isNew && (
                                <Badge class="bg-primary text-primary-foreground text-[10px] px-1.5">NEW</Badge>
                              )}
                            </view>
                            <text class="font-medium mt-1">{{ item.title }}</text>
                            <text class="text-xs text-muted-foreground mt-1 line-clamp-2">{{ item.summary }}</text>
                            <view class="flex items-center justify-between mt-2">
                              <text class="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock class="w-3 h-3" />
                                {{ item.time }}
                              </text>
                              <ChevronRight class="w-4 h-4 text-muted-foreground" />
                            </view>
                          </view>
                        </view>
                      </Card>
                    </Link>
                  )
                })}
              </view>
            )}
    
            <!--   -->
            {normalAnnouncements.length > 0 && (
              <view class="space-y-3">
                
    <view v-for="(item, index) in normalAnnouncements" :key="index"> {
                  const config = typeConfig[item.type]
                  return (
                    <Link key={item.id} href={`/announcements/${item.id}`}>
                      <Card class="p-4 hover:bg-secondary/30 transition-colors">
                        <view class="flex items-start gap-3">
                          <view class={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bgColor)}>
                            <config.icon class={cn("w-5 h-5", config.color)} />
                          </view>
                          <view class="flex-1 min-w-0">
                            <view class="flex items-center gap-2">
                              <text class="font-medium flex-1 truncate">{{ item.title }}</text>
                              {item.isNew && (
                                <Badge class="bg-primary text-primary-foreground text-[10px] px-1.5">NEW</Badge>
                              )}
                            </view>
                            <text class="text-xs text-muted-foreground mt-1 line-clamp-2">{{ item.summary }}</text>
                            <view class="flex items-center justify-between mt-2">
                              <text class="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock class="w-3 h-3" />
                                {{ item.time }}
                              </text>
                              <ChevronRight class="w-4 h-4 text-muted-foreground" />
                            </view>
                          </view>
                        </view>
                      </Card>
                    </Link>
                  )
                })}
              </view>
            )}
    
            {filteredAnnouncements.length === 0 && (
              <view class="text-center py-12 text-muted-foreground">
                <Megaphone class="w-12 h-12 mx-auto mb-2 opacity-50" />
                <text class="text-sm">暂无相关公告</text>
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
const announcementTypes = [
const announcements = [
const typeConfig: Record<string, { icon: typeof Bell; color: string; bgColor: string }> = {
  const filteredAnnouncements = activeType === "all" 

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