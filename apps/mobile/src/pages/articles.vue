<template>
  <view class="page v0-page" data-v0-route="articles">
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <AISearchModal isOpen={{ aiSearch.isOpen }} onClose={{ aiSearch.close }} context="文章" />
    
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center gap-3 px-4 h-14">
      <BackButton />
      <text class="h1" class="font-semibold text-lg text-foreground">文章</text>
              <view class="flex-1" />
              <AISearchButton @click={{ aiSearch.open }} />
            </view>
    
            <!--   -->
            <view class="px-4 pb-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索文章标题或内容"
                  class="w-full h-10 pl-10 pr-10 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {searchQuery && (
                  <view class="v0-btn"
                    @click={() => setSearchQuery("")}
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  >
                    <X class="w-4 h-4 text-muted-foreground" />
                  </view>
                )}
              </view>
            </view>
    
            <!--   -->
            <view class="flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
              <view v-for="cat in categories" :key="cat.id || index">
                <view class="v0-btn"
                  key={cat.id}
                  @click={() => setActiveCategory(cat.id)}
                  class="v0-class"
                >
                  {{ cat.name }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="flex items-center justify-between px-4 py-3 border-b border-border">
            <text class="text-sm text-muted-foreground">
              共 {{ filteredArticles.length }} 篇文章
            </text>
            <view class="relative">
              <view class="v0-btn"
                @click={() => setShowSortMenu(!showSortMenu)}
                class="flex items-center gap-1 text-sm text-foreground"
              >
                {{ sortBy === "latest" ? "最新发布" : "最受欢迎" }}
                <ChevronDown class="v0-class" />
              </view>
              {showSortMenu && (
                
                  <view class="fixed inset-0 z-40" @click={() => setShowSortMenu(false)} />
                  <view class="absolute right-0 top-full mt-1 w-28 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden">
                    <view class="v0-btn"
                      @click={() => { setSortBy("latest"); setShowSortMenu(false) }}
                      class="v0-class"
                    >
                      最新发布
                    </view>
                    <view class="v0-btn"
                      @click={() => { setSortBy("popular"); setShowSortMenu(false) }}
                      class="v0-class"
                    >
                      最受欢迎
                    </view>
                  </view>
                
              )}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-0">
            {filteredArticles.length > 0 ? (
              filteredArticles.map(article => (
                <Link key={article.id} href={{ `/article/${article.id }}`}>
                  <Card class="flex gap-3 p-3 border-0 rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white mb-2">
                    <!--   -->
                    <view class="w-28 h-20 rounded-[8px] flex-shrink-0 overflow-hidden">
                      <image src={{ article.cover }} alt={{ article.title }} class="w-full h-full object-cover" loading="lazy" />
                    </view>
    
                    <!--   -->
                    <view class="flex-1 min-w-0 flex flex-col">
                      <view class="flex items-start gap-2">
                        {{ article.isTop && (
                          <Badge class="text-[10px] px-1.5 py-0 bg-[#C41E3A]/10 text-[#C41E3A] border-0 flex-shrink-0">
                            置顶
                          </Badge>
                        ) }}
                        <text class="h3" class="text-[15px] font-medium text-[#2C2C2C] line-clamp-2 flex-1 leading-snug">
                          {{ article.title }}
                        </text>
                      </view>
    
                      <text class="text-[11px] text-[#666666] line-clamp-1 mt-1">
                        {{ article.excerpt }}
                      </text>
    
                      <view class="flex items-center justify-between mt-auto pt-2">
                        <view class="flex items-center gap-1.5">
                          <Avatar class="w-5 h-5">
                            <AvatarImage src={{ article.author.avatar }} />
                            <AvatarFallback class="text-[9px] bg-[#F5F1EB] text-[#666666]">
                              {{ article.author.name[0] }}
                            </AvatarFallback>
                          </Avatar>
                          <text class="text-[11px] text-[#666666]">{{ article.author.name }}</text>
                          {{ article.author.isVerified && (
                            <Badge class="text-[8px] px-1 py-0 bg-[#C9A96E]/20 text-[#C9A96E] border-0">V</Badge>
                          ) }}
                        </view>
    
                        <view class="flex items-center gap-3 text-[11px] text-[#999999]">
                          <text class="flex items-center gap-0.5">
                            <Heart class="w-3.5 h-3.5" />
                            {{ article.likes }}
                          </text>
                          <text class="flex items-center gap-0.5">
                            <MessageCircle class="w-3.5 h-3.5" />
                            {{ article.comments }}
                          </text>
                          <text>{{ formatDate(article.createdAt) }}</text>
                        </view>
                      </view>
                    </view>
                  </Card>
                </Link>
              ))
            ) : (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <FileText class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm">暂无相关文章</text>
                <text class="text-muted-foreground/70 text-xs mt-1">换个关键词试试</text>
              </view>
            )}
    
            <!--   -->
            {{ filteredArticles.length > 0 && (
              <view class="flex items-center justify-center py-6">
                <view class="v0-btn" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  点击加载更多
                </view>
              </view>
            ) }}
          </view>
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
    // TODO: 集成真实 API - V0 路由: articles
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