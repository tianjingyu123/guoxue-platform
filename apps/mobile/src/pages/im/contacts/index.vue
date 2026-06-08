<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">消息</text>
      <text class="v0-route">V0: im/contacts</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-20 bg-background border-b">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">通讯录</text>
              <view class="flex items-center gap-2">
                <view class="v0-btn" 
                  @click={() => setShowSearch(true)} 
                  class="p-2"
                >
                  <Search class="w-5 h-5" />
                </view>
                <Link href="/im/add-friend" class="p-2 -mr-2">
                  <UserPlus class="w-5 h-5" />
                </Link>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 flex overflow-hidden relative">
            <!--   -->
            <view 
              ref={{ listRef }} 
              class="flex-1 overflow-y-auto pr-6"
              onScroll={{ handleScroll }}
            >
              <DataState
                data={{ groups }}
                loading={{ loading }}
                error={{ error }}
                onRetry={{ loadFriends }}
                loadingComponent={{ renderSkeleton() }}
                emptyMessage="暂无好友"
                emptyDescription="快去添加好友吧"
              >
                
    <view v-for="(group, index) in groups" :key="index"> (
                  <view 
                    key={group.letter}
                    ref={(el) => {
                      if (el) groupRefs.current.set(group.letter, el)
                    }}
                  >
                    <!--   -->
                    <view class="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-4 py-1.5">
                      <text class="text-sm font-medium text-muted-foreground">
                        {{ group.letter }}
                      </text>
                    </view>
                    <!--   -->
                    <view class="px-2">
                      {{ group.friends.map(renderFriendItem) }}
                    </view>
                  </view>
                ))}
              </DataState>
            </view>
    
            <!--   -->
            {letterList.length > 0 && (
              <view class="absolute right-0 top-0 bottom-0 w-6 flex flex-col items-center justify-center py-2">
                
    <view v-for="(letter, index) in letterList" :key="index"> (
                  <view class="v0-btn"
                    key={{ letter }}
                    @click={() => scrollToLetter(letter, index)}
                    class={`w-5 h-5 flex items-center justify-center text-[10px] font-medium transition-colors ${
                      activeLetterIndex === index 
                        ? 'text-primary bg-primary/10 rounded-full' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {{ letter }}
                  </view>
                ))}
              </view>
            )}
          </view>
    
          <!--   -->
          <Sheet open={{ showSearch }} onOpenChange={{ setShowSearch }}>
            <SheetContent side="top" class="h-full">
              <SheetHeader class="text-left">
                <SheetTitle>搜索好友</SheetTitle>
              </SheetHeader>
              <view class="mt-4">
                <!--   -->
                <view class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索昵称、备注"
                    value={{ searchKeyword }}
                    @change={(e) => handleSearch(e.target.value)}
                    class="pl-9 pr-9"
                    autoFocus
                  />
                  {searchKeyword && (
                    <view class="v0-btn" 
                      @click={() => {
                        setSearchKeyword('')
                        setSearchResults([])
                      }}
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      <X class="w-4 h-4" />
                    </view>
                  )}
                </view>
    
                <!--   -->
                <view class="mt-4">
                  {isSearching ? (
                    <view class="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <view key={i} class="flex items-center gap-3">
                          <Skeleton class="w-10 h-10 rounded-full" />
                          <Skeleton class="h-4 w-24" />
                        </view>
                      ))}
                    </view>
                  ) : searchKeyword ? (
                    searchResults.length > 0 ? (
                      <view class="space-y-1">
                        {{ searchResults.map(renderFriendItem) }}
                      </view>
                    ) : (
                      <view class="text-center py-8 text-muted-foreground">
                        未找到相关好友
                      </view>
                    )
                  ) : (
                    <view class="text-center py-8 text-muted-foreground">
                      输入关键词搜索好友
                    </view>
                  )}
                </view>
              </view>
            </SheetContent>
          </Sheet>
    
          <!--   -->
          <Sheet open={{ !!selectedFriend }} onOpenChange={(open) => !open && setSelectedFriend(null)}>
            <SheetContent side="bottom" class="rounded-t-2xl">
              {selectedFriend && (
                
                  <view class="flex items-center gap-4 py-4">
                    <view class="relative">
                      <image
                        src={{ selectedFriend.avatar }}
                        alt={{ selectedFriend.nickname }}
                        class="w-16 h-16 rounded-full object-cover"
                      />
                      {selectedFriend.isOnline && (
                        <view class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </view>
                    <view class="flex-1">
                      <text class="text-lg font-semibold">
                        {{ selectedFriend.remark || selectedFriend.nickname }}
                      </text>
                      {selectedFriend.remark && (
                        <text class="text-sm text-muted-foreground">
                          昵称: {{ selectedFriend.nickname }}
                        </text>
                      )}
                      {selectedFriend.signature && (
                        <text class="text-sm text-muted-foreground mt-1">
                          {{ selectedFriend.signature }}
                        </text>
                      )}
                      <text class={`text-xs mt-1 ${selectedFriend.isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {selectedFriend.isOnline ? '在线' : selectedFriend.lastActiveAt ? `${{ selectedFriend.lastActiveAt }}活跃` : '离线'}
                      </text>
                    </view>
                  </view>
    
                  <view class="grid grid-cols-2 gap-3 pb-4">
                    <Button
                      @click={() => handleFriendAction('chat')}
                      class="gap-2"
                    >
                      <MessageCircle class="w-4 h-4" />
                      发消息
                    </Button>
                    <Button
                      variant="outline"
                      @click={() => handleFriendAction('profile')}
                      class="gap-2"
                    >
                      <User class="w-4 h-4" />
                      查看主页
                    </Button>
                  </view>
                
              )}
            </SheetContent>
          </Sheet>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


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