<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">消息</text>
      <text class="v0-route">V0: im/group-list</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-50 bg-white border-b border-gray-100">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ArrowLeft class="w-5 h-5 text-gray-700" />
              </view>
              <text class="text-lg font-semibold text-gray-900">群聊</text>
              <Link href="/im/create-group" class="p-2 -mr-2">
                <Plus class="w-5 h-5 text-[#C41E3A]" />
              </Link>
            </view>
          </view>
          
          <!--   -->
          <view class="sticky top-14 z-40 bg-[#FAF8F5] p-4">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={{ searchKeyword }}
                @change={(e) => handleSearch(e.target.value)}
                placeholder="搜索群聊"
                class="pl-9 pr-9 bg-white border-gray-200"
              />
              {searchKeyword && (
                <view class="v0-btn" 
                  @click={{ clearSearch }}
                  class="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X class="w-4 h-4 text-gray-400" />
                </view>
              )}
            </view>
          </view>
          
          <!--   -->
          <view class="bg-white">
            <DataState
              loading={{ loading }}
              error={{ error }}
              empty={{ displayList.length === 0 }}
              emptyMessage={searchKeyword ? '未找到相关群聊' : '暂无群聊'}
              onRetry={{ loadData }}
            >
              <!--   -->
              {isSearching && (
                <view class="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <view key={i} class="flex items-center gap-3">
                      <Skeleton class="w-12 h-12 rounded-lg shrink-0" />
                      <view class="flex-1 space-y-2">
                        <Skeleton class="h-4 w-1/3" />
                        <Skeleton class="h-3 w-2/3" />
                      </view>
                    </view>
                  ))}
                </view>
              )}
              
              <!--   -->
              {!isSearching && (
                <view class="divide-y divide-gray-50">
                  
    <view v-for="(group, index) in displayList" :key="index"> (
                    <view 
                      key={group.id}
                      class={`flex items-center gap-3 p-4 active:bg-gray-50 cursor-pointer ${
                        group.isPinned ? 'bg-gray-50/50' : ''
                      }`}
                      @click={() => router.push(`/im/group-chat/${group.id}`)}
                    >
                      <!--   -->
                      <view class="relative shrink-0">
                        <view class="w-12 h-12 rounded-lg bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] flex items-center justify-center overflow-hidden">
                          {{ group.avatar ? (
                            <image 
                              src={group.avatar }} 
                              alt={{ group.name }}
                              class="w-full h-full object-cover"
                            />
                          ) : (
                            <Users class="w-6 h-6 text-white" />
                          )}
                        </view>
                        <!--   -->
                        {group.isMuted && (
                          <view class="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                            <BellOff class="w-2.5 h-2.5 text-white" />
                          </view>
                        )}
                      </view>
                      
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-1.5">
                          <text class={`font-medium text-gray-900 truncate ${
                            group.unreadCount > 0 && !group.isMuted ? 'font-semibold' : ''
                          }`}>
                            {{ group.name }}
                          </text>
                          <RoleIcon role={{ group.myRole }} />
                          <text class="text-xs text-gray-400">({{ group.memberCount }})</text>
                          {group.isPinned && (
                            <Pin class="w-3 h-3 text-gray-400 shrink-0" />
                          )}
                        </view>
                        {group.lastMessage && (
                          <text class="text-sm text-gray-500 truncate mt-0.5">
                            {{ group.lastMessage.senderName }}: {{ group.lastMessage.content }}
                          </text>
                        )}
                      </view>
                      
                      <!--   -->
                      <view class="flex flex-col items-end gap-1 shrink-0">
                        <text class="text-xs text-gray-400">
                          {{ group.lastMessage?.time }}
                        </text>
                        {group.unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            class={`h-5 min-w-5 px-1.5 text-xs ${
                              group.isMuted ? 'bg-gray-400' : ''
                            }`}
                          >
                            {group.unreadCount > 99 ? '99+' : group.unreadCount}
                          </Badge>
                        )}
                      </view>
                      
                      <!--   -->
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild @click={(e) => e.stopPropagation()}>
                          <view class="v0-btn" class="p-1.5 -mr-1.5 hover:bg-gray-100 rounded">
                            <MoreVertical class="w-4 h-4 text-gray-400" />
                          </view>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem @click={(e) => handleTogglePin(group, e as unknown as React.MouseEvent)}>
                            <Pin class="w-4 h-4 mr-2" />
                            {group.isPinned ? '取消置顶' : '置顶'}
                          </DropdownMenuItem>
                          <DropdownMenuItem @click={(e) => handleToggleMute(group, e as unknown as React.MouseEvent)}>
                            {group.isMuted ? (
                              
                                <Bell class="w-4 h-4 mr-2" />
                                关闭免打扰
                              
                            ) : (
                              
                                <BellOff class="w-4 h-4 mr-2" />
                                开启免打扰
                              
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            class="text-red-600"
                            @click={(e) => {
                              e.stopPropagation()
                              setQuitConfirm(group)
                            }}
                          >
                            <LogOut class="w-4 h-4 mr-2" />
                            {group.myRole === 'owner' ? '解散群聊' : '退出群聊'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </view>
                  ))}
                </view>
              )}
            </DataState>
          </view>
          
          <!--   -->
          <Link 
            href="/im/create-group"
            class="fixed bottom-24 right-4 w-14 h-14 bg-[#C41E3A] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus class="w-6 h-6 text-white" />
          </Link>
          
          <!--   -->
          <AlertDialog open={{ !!quitConfirm }} onOpenChange={() => setQuitConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {quitConfirm?.myRole === 'owner' ? '解散群聊' : '退出群聊'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {quitConfirm?.myRole === 'owner' 
                    ? `确定要解散「${{ quitConfirm?.name }}」吗？解散后所有成员将被移出，且无法恢复。`
                    : `确定要退出「${{ quitConfirm?.name }}」吗？退出后将不再接收该群消息。`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  @click={{ handleQuit }}
                  class="bg-red-600 hover:bg-red-700"
                >
                  {quitConfirm?.myRole === 'owner' ? '解散' : '退出'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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