<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">likes</text>
      <text class="v0-route">V0: likes</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">我的点赞</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-14 z-30 bg-background border-b border-border">
            <view class="flex items-center px-2 overflow-x-auto scrollbar-hide">
              
    <view v-for="(tab, index) in tabs" :key="index"> {
                const count = tab.id === "all" 
                  ? items.length 
                  : items.filter(i => i.type === tab.id).length
                return (
                  <view class="v0-btn"
                    key={{ tab.id }}
                    @click={() => setActiveTab(tab.id)}
                    class={cn(
                      "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                      activeTab === tab.id
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    {tab.icon && <tab.icon class="w-4 h-4" />}
                    {{ tab.label }}
                    {count > 0 && (
                      <text class="text-xs text-muted-foreground">({{ count }})</text>
                    )}
                  </view>
                )
              })}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const config = typeConfig[item.type]
                const Icon = config.icon
                
                return (
                  <Card key={item.id} class="overflow-hidden">
                    <view class="flex">
                      <!--   -->
                      <Link 
                        href={{ item.href }}
                        class="flex-shrink-0 w-28 aspect-[4/3] bg-secondary flex items-center justify-center relative"
                      >
                        {item.type === "video" ? (
                          
                            <Play class="w-8 h-8 text-muted-foreground/40" />
                            {item.duration && (
                              <text class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                                {{ item.duration }}
                              </text>
                            )}
                          
                        ) : item.type === "course" ? (
                          <BookOpen class="w-8 h-8 text-accent/40" />
                        ) : (
                          <FileText class="w-8 h-8 text-muted-foreground/40" />
                        )}
                      </Link>
                      
                      <!--   -->
                      <view class="flex-1 p-3 min-w-0">
                        <view class="flex items-start justify-between gap-2">
                          <view class="flex-1 min-w-0">
                            <!--   -->
                            <Badge variant="secondary" class={cn("text-[10px] px-1.5 py-0 mb-1.5", config.color)}>
                              <Icon class="w-3 h-3 mr-0.5" />
                              {{ config.label }}
                            </Badge>
                            
                            <!--   -->
                            <Link href={{ item.href }}>
                              <text class="font-medium text-sm text-foreground line-clamp-2 hover:text-primary transition-colors">
                                {{ item.title }}
                              </text>
                            </Link>
                            
                            <!--   -->
                            {item.summary && (
                              <text class="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {{ item.summary }}
                              </text>
                            )}
                            
                            <!--   -->
                            <view class="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                              <text>{{ item.author || item.instructor }}</text>
                              {item.type === "course" && item.price && (
                                <text class="text-primary font-medium">¥{{ item.price }}</text>
                              )}
                              {item.type === "video" && item.likes && (
                                <text>{{ item.likes }} 点赞</text>
                              )}
                              <text>· {{ item.likedAt }}</text>
                            </view>
                          </view>
                          
                          <!--   -->
                          <view class="v0-btn"
                            @click={() => handleUnlike(item.id)}
                            class="flex-shrink-0 p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Heart class="w-5 h-5 fill-primary" />
                          </view>
                        </view>
                      </view>
                    </view>
                  </Card>
                )
              })
            ) : (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Heart class="w-10 h-10 text-muted-foreground/40" />
                </view>
                <text class="text-muted-foreground text-sm">暂无点赞记录</text>
                <text class="text-muted-foreground/70 text-xs mt-1">看到喜欢的内容，点个赞吧</text>
                <Link
                  href="/"
                  class="mt-4 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                >
                  去发现内容
                </Link>
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
const likedItems = [
const tabs = [
const typeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  const filteredItems = activeTab === "all" 
            const count = tab.id === "all" 

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