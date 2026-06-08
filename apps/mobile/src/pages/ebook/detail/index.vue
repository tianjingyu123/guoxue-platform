<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">电子书</text>
      <text class="v0-route">V0: ebook/[id]</text>
    </view>
        <view class="min-h-screen bg-[var(--classics-bg)] pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-[var(--classics-bg)]/95 backdrop-blur-sm border-b border-[var(--classics-border)]">
            <view class="flex items-center justify-between px-4 h-14">
              <Link href="/ebook" class="p-1.5 -ml-1.5 rounded-lg hover:bg-secondary/80 active:scale-95 transition-all">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium text-base">书籍详情</text>
              <Button variant="ghost" size="icon" class="p-1.5 -mr-1.5">
                <Share2 class="w-5 h-5" />
              </Button>
            </view>
          </view>
          
          <view>
            <!--   -->
            <view class="px-4 py-5 bg-gradient-to-b from-[var(--classics-jing)]/5 to-transparent">
              <view class="flex gap-4">
                <!--   -->
                <view class="relative w-28 h-40 flex-shrink-0 rounded-lg shadow-lg overflow-hidden bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0]">
                  <view class="absolute left-0 top-0 bottom-0 w-2 bg-[var(--book-spine)]/50" />
                  <view class="absolute inset-0 flex items-center justify-center p-2">
                    <view class="writing-vertical-rl font-serif font-bold text-lg text-[#3d3225] leading-tight">
                      {{ bookDetail.title.slice(0, 6) }}
                    </view>
                  </view>
                  {bookDetail.isHot && (
                    <Badge class="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px]">热门</Badge>
                  )}
                </view>
                
                <!--   -->
                <view class="flex-1 min-w-0 flex flex-col">
                  <text class="font-bold text-lg line-clamp-2">{{ bookDetail.title }}</text>
                  <text class="text-sm text-muted-foreground mt-0.5 line-clamp-1">{{ bookDetail.subtitle }}</text>
                  
                  <Link href="#" class="flex items-center gap-2 mt-2">
                    <view class="w-6 h-6 rounded-full bg-secondary" />
                    <text class="text-sm text-muted-foreground">{{ bookDetail.author }}</text>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </Link>
                  
                  <view class="flex items-center gap-3 mt-2 text-sm">
                    <view class="flex items-center gap-1">
                      <Star class="w-4 h-4 fill-amber-400 text-amber-400" />
                      <text class="font-medium">{{ bookDetail.rating }}</text>
                    </view>
                    <text class="text-muted-foreground">{{ bookDetail.reviewCount }}条评价</text>
                  </view>
                  
                  <view class="flex items-center gap-2 mt-auto pt-2">
                    {bookDetail.tags.map(tag => (
                      <Badge key={tag} variant="secondary" class="text-xs">{{ tag }}</Badge>
                    ))}
                  </view>
                </view>
              </view>
              
              <!--   -->
              <view class="flex items-center justify-around mt-5 py-3 bg-card rounded-xl border border-[var(--classics-border)]">
                <view class="text-center">
                  <text class="text-lg font-bold">{{ (bookDetail.wordCount / 10000).toFixed(1) }}万</text>
                  <text class="text-xs text-muted-foreground">字数</text>
                </view>
                <view class="w-px h-8 bg-border" />
                <view class="text-center">
                  <text class="text-lg font-bold">{{ bookDetail.pageCount }}</text>
                  <text class="text-xs text-muted-foreground">页数</text>
                </view>
                <view class="w-px h-8 bg-border" />
                <view class="text-center">
                  <text class="text-lg font-bold">{{ (bookDetail.salesCount / 1000).toFixed(1) }}k</text>
                  <text class="text-xs text-muted-foreground">已购</text>
                </view>
                <view class="w-px h-8 bg-border" />
                <view class="text-center">
                  <text class="text-lg font-bold">{{ bookDetail.chapters.length }}</text>
                  <text class="text-xs text-muted-foreground">章节</text>
                </view>
              </view>
            </view>
            
            <!--   -->
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }} class="mt-4">
              <TabsList class="w-full justify-start px-4 h-auto p-0 bg-transparent border-b border-[var(--classics-border)] rounded-none">
                {[
                  { id: "intro", label: "简介" },
                  { id: "chapters", label: "目录" },
                  { id: "reviews", label: `评价(${{ bookDetail.reviewCount }})` },
                ].map(tab => (
                  <TabsTrigger
                    key={{ tab.id }}
                    value={{ tab.id }}
                    class={cn(
                      "px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--classics-jing)] data-[state=active]:text-[var(--classics-jing)]",
                      "data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    )}
                  >
                    {{ tab.label }}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <!--   -->
              <TabsContent value="intro" class="px-4 py-4 space-y-5 mt-0">
                <view>
                  <text class="font-medium mb-2">书籍简介</text>
                  <text class="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {{ bookDetail.description }}
                  </text>
                </view>
                
                <!--   -->
                <Card class="p-4 border-[var(--classics-border)]">
                  <view class="flex items-center gap-3">
                    <view class="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <Users class="w-6 h-6 text-muted-foreground" />
                    </view>
                    <view class="flex-1">
                      <text class="font-medium">{{ bookDetail.author }}</text>
                      <text class="text-sm text-muted-foreground">{{ bookDetail.authorTitle }}</text>
                    </view>
                    <Button variant="outline" size="sm">关注</Button>
                  </view>
                </Card>
                
                <!--   -->
                <view>
                  <view class="flex items-center justify-between mb-3">
                    <text class="font-medium">相关推荐</text>
                    <Link href="/ebook" class="text-sm text-muted-foreground flex items-center">
                      更多 <ChevronRight class="w-4 h-4" />
                    </Link>
                  </view>
                  <view class="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                    {bookDetail.relatedBooks.map(book => (
                      <Link key={book.id} href={`/ebook/${book.id}`} class="flex-shrink-0 w-24">
                        <view class="aspect-[3/4] rounded-md bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0] mb-2 relative overflow-hidden">
                          <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--book-spine)]/40" />
                          <view class="absolute inset-0 flex items-center justify-center">
                            <view class="writing-vertical-rl font-serif font-bold text-xs text-[#3d3225]">
                              {{ book.title.slice(0, 4) }}
                            </view>
                          </view>
                        </view>
                        <text class="text-xs font-medium line-clamp-1">{{ book.title }}</text>
                        <text class="text-[var(--classics-jing)] text-xs font-bold">¥{{ book.price }}</text>
                      </Link>
                    ))}
                  </view>
                </view>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="chapters" class="px-4 py-4 mt-0">
                <view class="space-y-1">
                  {bookDetail.chapters.map((chapter, index) => (
                    <Link
                      key={chapter.id}
                      href={chapter.isFree ? `/ebook/reader/${bookDetail.id}?chapter=${{ chapter.id }}` : "#"}
                      class={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-all",
                        chapter.isFree 
                          ? "hover:bg-secondary/60 active:scale-[0.99]" 
                          : "opacity-60"
                      )}
                    >
                      <view class="flex items-center gap-3">
                        <text class="w-6 h-6 rounded-full bg-secondary text-xs flex items-center justify-center text-muted-foreground">
                          {{ index + 1 }}
                        </text>
                        <text class="text-sm">{{ chapter.title }}</text>
                      </view>
                      <view class="flex items-center gap-2">
                        {chapter.isFree && (
                          <Badge variant="secondary" class="text-[10px] bg-[var(--classics-shi)]/10 text-[var(--classics-shi)]">
                            免费
                          </Badge>
                        )}
                        <text class="text-xs text-muted-foreground">{{ chapter.pageCount }}页</text>
                      </view>
                    </Link>
                  ))}
                </view>
              </TabsContent>
              
              <!--   -->
              <TabsContent value="reviews" class="px-4 py-4 mt-0 space-y-4">
                {bookDetail.reviews.map(review => (
                  <Card key={review.id} class="p-4 border-[var(--classics-border)]">
                    <view class="flex items-start gap-3">
                      <view class="w-9 h-9 rounded-full bg-secondary flex-shrink-0" />
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center justify-between">
                          <text class="font-medium text-sm">{{ review.user }}</text>
                          <text class="text-xs text-muted-foreground">{{ review.date }}</text>
                        </view>
                        <view class="flex items-center gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={{ i }}
                              class={cn(
                                "w-3 h-3",
                                i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                              )}
                            />
                          ))}
                        </view>
                        <text class="text-sm text-muted-foreground mt-2">{{ review.content }}</text>
                        <view class="v0-btn" class="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground">
                          <ThumbsUp class="w-3.5 h-3.5" />
                          {{ review.likes }}
                        </view>
                      </view>
                    </view>
                  </Card>
                ))}
                
                <Button variant="outline" class="w-full">查看全部评价</Button>
              </TabsContent>
            </Tabs>
          </view>
          
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card border-t border-[var(--classics-border)] px-4 py-3 z-50">
            <view class="flex items-center gap-3 max-w-screen-lg mx-auto">
              <view class="v0-btn" 
                @click={() => setIsFavorite(!isFavorite)}
                class="flex flex-col items-center gap-0.5 px-2"
              >
                <Heart class={cn("w-5 h-5", isFavorite ? "fill-red-500 text-red-500" : "")} />
                <text class="text-[10px] text-muted-foreground">收藏</text>
              </view>
              
              <view class="v0-btn" class="flex flex-col items-center gap-0.5 px-2">
                <MessageCircle class="w-5 h-5" />
                <text class="text-[10px] text-muted-foreground">评论</text>
              </view>
              
              <view class="flex-1 flex gap-2">
                {bookDetail.hasPreview && (
                  <Button 
                    variant="outline" 
                    class="flex-1 h-11 border-[var(--classics-jing)] text-[var(--classics-jing)]"
                    asChild
                  >
                    <Link href={`/ebook/reader/${bookDetail.id}?preview=true`}>
                      <BookOpen class="w-4 h-4 mr-1.5" />
                      试读
                    </Link>
                  </Button>
                )}
                <Button 
                  class="flex-1 h-11 bg-[var(--classics-jing)] hover:bg-[var(--classics-jing)]/90"
                  asChild
                >
                  <Link href={`/ebook/reader/${bookDetail.id}`}>
                    <ShoppingCart class="w-4 h-4 mr-1.5" />
                    ¥{{ bookDetail.price }} 购买
                  </Link>
                </Button>
              </view>
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
const bookDetail = {

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