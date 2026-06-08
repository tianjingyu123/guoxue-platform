<template>
  <view class="page v0-page" data-v0-route="agent/history">
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center justify-between px-4 h-14">
      <BackButton fallbackPath="/profile" />
      <text class="h1" class="font-semibold text-base text-foreground">对话历史</text>
              <view class="relative">
                <view class="v0-btn" 
                  @click={() => setShowMenu(!showMenu)}
                  class="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <MoreHorizontal class="w-5 h-5 text-foreground" />
                </view>
                {showMenu && (
                  
                    <view class="fixed inset-0 z-40" @click={() => setShowMenu(false)} />
                    <view class="absolute right-0 top-full mt-1 w-32 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50">
                      <view class="v0-btn"
                        @click={() => setShowClearConfirm(true)}
                        class="flex items-center gap-2 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors"
                      >
                        <Trash2 class="w-4 h-4" />
                        清空全部
                      </view>
                    </view>
                  
                )}
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 pb-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索对话内容..."
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="w-full h-10 pl-10 pr-4 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchQuery && (
                  <view class="v0-btn"
                    @click={() => setSearchQuery("")}
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background"
                  >
                    <X class="w-3 h-3 text-muted-foreground" />
                  </view>
                )}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="pb-20">
            {filteredHistory.length > 0 ? (
              <view>
                <!--   -->
                {["今天", "昨天", "本周", "更早"].map(group => {
                  const groupItems = filteredHistory.filter(item => item.timeGroup === group)
                  if (groupItems.length === 0) return null
                  return (
                    <view key={group}>
                      <view class="px-4 py-2 bg-secondary/50">
                        <text class="text-xs font-medium text-muted-foreground">{{ group }}</text>
                      </view>
                      <view class="divide-y divide-border">
                        <view v-for="(item) in groupItems" :key="index">
                  <view
                    key={item.id}
                    class="relative overflow-hidden"
                    onTouchStart={() => setSwipedId(null)}
                  >
                    <!--   -->
                    <view 
                      class="v0-class"
                    >
                      <view class="v0-btn"
                        @click={() => handleDelete(item.id)}
                        class="flex flex-col items-center gap-1 text-white"
                      >
                        <Trash2 class="w-5 h-5" />
                        <text class="text-xs">删除</text>
                      </view>
                    </view>
    
                    <!--   -->
                    <view
                      class="v0-class"
                      @click={() => {
                        if (swipedId === item.id) {
                          setSwipedId(null)
                        } else {{ setSwipedId(item.id) } }}
                    >
                      <Link
                        href={{ `/agent/${item.id }}`}
                        class="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
                        @click={(e) => {
                          if (swipedId === item.id) {
                            e.preventDefault()
                            setSwipedId(null)
                           }}
                      >
                        <!--   -->
                        <view class="relative flex-shrink-0">
                          <Avatar class="w-12 h-12 ring-2 ring-accent/20">
                            <AvatarImage src={{ item.agentAvatar }} alt={{ item.agentName }} />
                            <AvatarFallback class="bg-accent/10 text-accent">
                              <Bot class="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          {{ item.unread > 0 && (
                            <view class="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center">
                              <text class="text-[10px] text-white font-medium">{item.unread }}</text>
                            </view>
                          )}
                        </view>
    
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2 mb-1">
                            <text class="font-medium text-sm text-foreground">{{ item.agentName }}</text>
                            <Badge 
                              variant="secondary" 
                              class="v0-class"
                            >
                              {{ item.agentType }}
                            </Badge>
                          </view>
                          <text class="text-xs text-muted-foreground line-clamp-2">{{ item.lastMessage }}</text>
                        </view>
    
                        <!--   -->
                        <view class="flex-shrink-0 text-right">
                          <text class="text-xs text-muted-foreground">{{ item.time }}</text>
                        </view>
                      </Link>
                    </view>
                  </view>
                        ))}
                      </view>
                    </view>
                  )
                })}
              </view>
            ) : history.length === 0 ? (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-20 px-4">
                <view class="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <Sparkles class="w-10 h-10 text-accent" />
                </view>
                <text class="text-foreground font-medium mb-2">暂无对话记录</text>
                <text class="text-sm text-muted-foreground text-center mb-6">
                  去智能体广场探索各类AI助手，开启你的国学之旅
                </text>
                <Link
                  href="/agents"
                  class="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                >
                  探索智能体广场
                </Link>
              </view>
            ) : (
              /* 搜索无结果 */
              <view class="flex flex-col items-center justify-center py-20 px-4">
                <view class="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Search class="w-7 h-7 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm">未找到相关对话</text>
                <text class="text-muted-foreground/70 text-xs mt-1">试试其他关键词</text>
              </view>
            )}
          </view>
    
          <!--   -->
          {showClearConfirm && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-8">
              <Card class="w-full max-w-sm p-5">
                <view class="text-center mb-4">
                  <view class="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <Trash2 class="w-6 h-6 text-destructive" />
                  </view>
                  <text class="h3" class="font-semibold text-foreground mb-1">清空全部对话</text>
                  <text class="text-sm text-muted-foreground">
                    确定要清空所有对话历史吗？此操作无法撤销。
                  </text>
                </view>
                <view class="flex gap-3">
                  <view class="v0-btn"
                    @click={() => {
                      setShowClearConfirm(false)
                      setShowMenu(false)
                    }}
                    class="flex-1 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    @click={{ handleClearAll }}
                    class="flex-1 py-2.5 bg-destructive text-white text-sm font-medium rounded-xl hover:bg-destructive/90 transition-colors"
                  >
                    确认清空
                  </view>
                </view>
              </Card>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: agent/history
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>