<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">帮助中心</text>
      <text class="v0-route">V0: help</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <AISearchModal isOpen={{ aiSearch.isOpen }} onClose={{ aiSearch.close }} placeholder="问我任何使用问题..." />
    
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">帮助中心</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-6">
            <!--   -->
            <view class="flex items-center gap-2">
              <view class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="输入问题关键词，快速查找答案"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </view>
              <AISearchButton @click={{ aiSearch.open }} />
            </view>
    
            <!--   -->
            {searchQuery === "" && (
              <view>
                <text class="font-semibold text-sm text-foreground mb-3">问题分类</text>
                <view class="grid grid-cols-3 gap-3">
                  
    <view v-for="(cat, index) in categories" :key="index"> {
                    const Icon = cat.icon
                    const isSelected = selectedCategory === cat.id
                    return (
                      <view class="v0-btn"
                        key={{ cat.id }}
                        @click={() => setSelectedCategory(isSelected ? null : cat.id)}
                        class={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                          isSelected 
                            ? "bg-primary/10 ring-1 ring-primary/30" 
                            : "bg-card hover:bg-secondary"
                        )}
                      >
                        <view class={cn("w-10 h-10 rounded-xl flex items-center justify-center", cat.bgColor)}>
                          <Icon class={cn("w-5 h-5", cat.color)} />
                        </view>
                        <view class="text-center">
                          <text class="text-xs font-medium text-foreground">{{ cat.name }}</text>
                        </view>
                      </view>
                    )
                  })}
                </view>
                {selectedCategory && (
                  <view class="v0-btn"
                    @click={() => setSelectedCategory(null)}
                    class="mt-2 text-xs text-primary hover:underline"
                  >
                    清除筛选
                  </view>
                )}
              </view>
            )}
    
            <!--   -->
            <view>
              <view class="flex items-center gap-2 mb-3">
                <text class="font-semibold text-sm text-foreground">
                  {searchQuery ? "搜索结果" : selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "常见问题"}
                </text>
                {!searchQuery && !selectedCategory && (
                  <Flame class="w-4 h-4 text-orange-500" />
                )}
              </view>
    
              {filteredQuestions.length > 0 ? (
                <view class="space-y-2">
                  
    <view v-for="(item, index) in filteredQuestions" :key="index"> (
                    <Card
                      key={item.id}
                      class={cn(
                        "overflow-hidden transition-all",
                        expandedId === item.id ? "bg-secondary/50" : "bg-card"
                      )}
                    >
                      <view class="v0-btn"
                        @click={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        class="w-full p-4 flex items-start gap-3 text-left"
                      >
                        <HelpCircle class="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2">
                            <text class="font-medium text-sm text-foreground line-clamp-2">
                              {{ item.question }}
                            </text>
                            {item.hot && (
                              <Badge variant="secondary" class="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-500 border-0 shrink-0">
                                热门
                              </Badge>
                            )}
                          </view>
                          <text class="text-xs text-muted-foreground mt-1">{{ item.category }}</text>
                        </view>
                        <ChevronDown 
                          class={cn(
                            "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                            expandedId === item.id && "rotate-180"
                          )} 
                        />
                      </view>
                      
                      {expandedId === item.id && (
                        <view class="px-4 pb-4 pt-0">
                          <view class="pl-8 pt-3 border-t border-border">
                            <text class="text-sm text-muted-foreground leading-relaxed">
                              {{ item.answer }}
                            </text>
                            <view class="flex items-center gap-4 mt-3">
                              <text class="text-xs text-muted-foreground">这个回答有帮助吗？</text>
                              <view class="v0-btn" class="text-xs text-primary hover:underline">有帮助</view>
                              <view class="v0-btn" class="text-xs text-muted-foreground hover:text-foreground">没有帮助</view>
                            </view>
                          </view>
                        </view>
                      )}
                    </Card>
                  ))}
                </view>
              ) : (
                <view class="py-12 text-center">
                  <view class="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Search class="w-8 h-8 text-muted-foreground" />
                  </view>
                  <text class="text-sm text-muted-foreground mb-2">没有找到相关问题</text>
                  <text class="text-xs text-muted-foreground">��试其他关键词，或联系客服获取帮助</text>
                </view>
              )}
            </view>
    
            <!--   -->
            <view>
              <text class="font-semibold text-sm text-foreground mb-3">更多帮助</text>
              <view class="space-y-2">
                <Link href="/feedback">
                  <Card class="p-4 flex items-center justify-between bg-card hover:bg-secondary/50 transition-colors">
                    <view class="flex items-center gap-3">
                      <view class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <MessageCircle class="w-5 h-5 text-blue-500" />
                      </view>
                      <view>
                        <text class="font-medium text-sm text-foreground">意见反馈</text>
                        <text class="text-xs text-muted-foreground">提交建议或报告问题</text>
                      </view>
                    </view>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </Card>
                </Link>
                <Link href="/about">
                  <Card class="p-4 flex items-center justify-between bg-card hover:bg-secondary/50 transition-colors">
                    <view class="flex items-center gap-3">
                      <view class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <BookOpen class="w-5 h-5 text-purple-500" />
                      </view>
                      <view>
                        <text class="font-medium text-sm text-foreground">使用教程</text>
                        <text class="text-xs text-muted-foreground">图文视频新手指引</text>
                      </view>
                    </view>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </Card>
                </Link>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
            <view class="max-w-lg mx-auto">
              <Link href="/agent/customer-service">
                <view class="v0-btn" class="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                  <MessageCircle class="w-5 h-5" />
                  联系在线客服
                </view>
              </Link>
              <text class="text-xs text-muted-foreground text-center mt-2">
                工作时间：每日 9:00-22:00
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
const categories = [
const hotQuestions = [
    const matchSearch = searchQuery === "" || 

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