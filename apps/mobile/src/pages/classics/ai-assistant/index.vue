<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">古籍</text>
      <text class="v0-route">V0: classics/ai-assistant</text>
    </view>
        <view class="min-h-screen bg-surface-base flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-50 bg-card border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" 
                @click={() => router.back()}
                class="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center"
                aria-label="返回"
              >
                <ArrowLeft class="w-5 h-5" />
              </view>
              
              <view class="text-center">
                <text class="font-medium text-base">古籍AI助手</text>
                <text class="text-[10px] text-muted-foreground">内容由AI生成</text>
              </view>
              
              <view class="v0-btn" 
                class="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center"
                aria-label="历史记录"
              >
                <History class="w-5 h-5" />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              // 空状态 - 展示介绍和推荐问题
              <view class="p-4 space-y-4">
                <!--   -->
                <view class="bg-card rounded-2xl p-4 border border-border/60">
                  <text class="text-sm leading-relaxed text-foreground">
                    刃"的高超创作技艺——全书虽完全以虚构笔法展开，却做到了数万字内容境界不重复、主旨不偏离，兼具可读性与思想启发性，进一步印证了本篇对《西游记》艺术价值的评价。
                  </text>
                  <!--   -->
                  <view class="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                    <view class="v0-btn" class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw class="w-3.5 h-3.5" />
                    </view>
                    <view class="v0-btn" class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <ThumbsUp class="w-3.5 h-3.5" />
                    </view>
                    <view class="v0-btn" class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <ThumbsDown class="w-3.5 h-3.5" />
                    </view>
                    <view class="v0-btn" class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <Copy class="w-3.5 h-3.5" />
                    </view>
                  </view>
                </view>
    
                <!--   -->
                <view class="space-y-2">
                  
    <view v-for="(q, i) in relatedQuestions" :key="i"> (
                    <view class="v0-btn"
                      key={{ i }}
                      @click={() => handleQuestionClick(q)}
                      class="w-full text-left px-4 py-3 rounded-xl bg-card border border-border/60 hover:bg-secondary/50 hover:border-border transition-colors text-sm"
                    >
                      {{ q }}
                    </view>
                  ))}
                </view>
    
                <!--   -->
                <view class="flex items-center gap-3 py-2">
                  <view class="flex-1 border-t border-border/50" />
                  <text class="text-xs text-muted-foreground">聊聊新话题</text>
                  <view class="flex-1 border-t border-border/50" />
                </view>
    
                <!--   -->
                <AIIntroCard />
    
                <!--   -->
                <view class="space-y-2">
                  
    <view v-for="(q, i) in suggestedQuestions" :key="i"> (
                    <view class="v0-btn"
                      key={{ i }}
                      @click={() => handleQuestionClick(q)}
                      class="w-full text-left px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
                    >
                      {{ q }}
                    </view>
                  ))}
                </view>
              </view>
            ) : (
              // 对话消息列表
              <view class="p-4 space-y-4">
                
    <view v-for="(message, index) in messages" :key="index"> (
                  <view key={message.id} class={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "gap-3"
                  )}>
                    {message.role === "assistant" && (
                      <view class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles class="w-4 h-4 text-white" />
                      </view>
                    )}
                    
                    <view class={cn(
                      "max-w-[85%]",
                      message.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3" 
                        : "flex-1 min-w-0"
                    )}>
                      {message.role === "user" ? (
                        <text class="text-sm leading-relaxed">{{ message.content }}</text>
                      ) : (
                        
                          <view class="bg-card rounded-2xl rounded-tl-sm p-4 border border-border/60">
                            <text class="text-sm leading-relaxed whitespace-pre-wrap">{{ message.content }}</text>
                          </view>
                          <!--   -->
                          <view class="flex items-center gap-1 mt-2 ml-1">
                            <view class="v0-btn" class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                              <RotateCcw class="w-3.5 h-3.5" />
                            </view>
                            <view class="v0-btn" 
                              @click={() => handleLike(message.id, true)}
                              class={cn(
                                "p-1.5 rounded-md hover:bg-secondary transition-colors",
                                liked[message.id] === true ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <ThumbsUp class="w-3.5 h-3.5" />
                            </view>
                            <view class="v0-btn" 
                              @click={() => handleLike(message.id, false)}
                              class={cn(
                                "p-1.5 rounded-md hover:bg-secondary transition-colors",
                                liked[message.id] === false ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <ThumbsDown class="w-3.5 h-3.5" />
                            </view>
                            <view class="v0-btn" 
                              @click={() => handleCopy(message.content)}
                              class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Copy class="w-3.5 h-3.5" />
                            </view>
                          </view>
                        
                      )}
                    </view>
                  </view>
                ))}
                
                <!--   -->
                {isLoading && (
                  <view class="flex gap-3">
                    <view class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles class="w-4 h-4 text-white" />
                    </view>
                    <view class="bg-card rounded-2xl rounded-tl-sm p-4 border border-border/60">
                      <view class="flex items-center gap-2">
                        <view class="flex gap-1">
                          <text class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" :style=" animationDelay: "0ms" }} />
                          <text class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" :style=" animationDelay: "150ms" }} />
                          <text class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" :style=" animationDelay: "300ms" }} />
                        </view>
                        <text class="text-sm text-muted-foreground">正在思考...</text>
                      </view>
                    </view>
                  </view>
                )}
                
                <view ref={{ messagesEndRef }} />
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="sticky bottom-0 bg-card border-t border-border p-3 safe-area-inset-bottom">
            <view class="flex items-end gap-2">
              <view class="flex-1 relative">
                <textarea
                  ref={{ inputRef }}
                  value={{ inputValue }}
                  @change={(e) => setInputValue(e.target.value)}
                  onKeyDown={{ handleKeyDown }}
                  placeholder="输入和古籍相关的问题"
                  :disabled={{ isLoading }}
                  rows={{ 1 }}
                  class={cn(
                    "w-full resize-none rounded-2xl",
                    "bg-secondary/50 border border-border/60",
                    "px-4 py-2.5 pr-10",
                    "text-sm placeholder:text-muted-foreground",
                    "focus:outline-none focus:border-primary/50",
                    "disabled:opacity-50",
                    "max-h-32"
                  )}
                  :style=" minHeight: "42px" }}
                />
                <view class="v0-btn"
                  class="absolute right-3 bottom-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="语音输入"
                >
                  <Mic class="w-4 h-4" />
                </view>
              </view>
              <Button
                @click={{ handleSend }}
                :disabled={{ isLoading || !inputValue.trim() }}
                size="icon"
                class="rounded-full w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <Send class="w-4 h-4" />
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
const suggestedQuestions = [
const relatedQuestions = [
    const userMessage: Message = {
      const aiMessage: Message = {

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