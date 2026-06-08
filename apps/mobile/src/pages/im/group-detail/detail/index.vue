<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">消息</text>
      <text class="v0-route">V0: im/group-detail/[id]</text>
    </view>
        <DataState
          loading={{ loading }}
          error={{ error }}
          empty={{ !group }}
          loadingComponent={{ <LoadingSkeleton /> }}
          onRetry={{ loadData }}
        >
          <view class="min-h-screen bg-background">
            <!--   -->
            <view class="sticky top-0 z-10 bg-background border-b">
              <view class="flex items-center h-14 px-4">
                <Button variant="ghost" size="icon" @click={() => router.back()}>
                  <ArrowLeft class="w-5 h-5" />
                </Button>
                <text class="flex-1 text-center font-medium">群聊设置</text>
                <view class="w-10" />
              </view>
            </view>
    
            <view class="p-4 space-y-4">
              <!--   -->
              {group && (
                <view class="bg-card rounded-xl p-4 space-y-4">
                  <!--   -->
                  <view class="flex items-center gap-4">
                    <view class="w-16 h-16 rounded-xl bg-secondary overflow-hidden">
                      <image 
                        src={{ group.avatar }} 
                        alt={{ group.name }}
                        class="w-full h-full object-cover"
                      />
                    </view>
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2">
                        <text class="font-semibold text-lg truncate">{{ group.name }}</text>
                        {permissions?.canUpdateNotice && (
                          <Button variant="ghost" size="icon" class="h-6 w-6">
                            <Edit3 class="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </view>
                      <view class="flex items-center gap-2 mt-1">
                        <text class="text-sm text-muted-foreground">群号: {{ groupId }}</text>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          class="h-5 w-5"
                          @click={{ handleCopyGroupId }}
                        >
                          <Copy class="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </view>
                    </view>
                    <Button variant="outline" size="icon" @click={{ handleShowQrcode }}>
                      <QrCode class="w-5 h-5" />
                    </Button>
                  </view>
    
                  <!--   -->
                  <view>
                    <view class="flex items-center justify-between mb-3">
                      <text class="text-sm font-medium">群成员 ({{ group.memberCount }}人)</text>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        class="text-primary h-7"
                        @click={() => setShowAllMembers(true)}
                      >
                        查看全部
                        <ChevronRight class="w-4 h-4 ml-1" />
                      </Button>
                    </view>
                    <view class="flex flex-wrap gap-3">
                      {members.slice(0, 8).map(member => (
                        <view 
                          key={member.id} 
                          class="flex flex-col items-center w-12"
                          @click={() => {
                            setSelectedMember(member)
                            setShowMemberAction(true)
                          }}
                        >
                          <view class="relative">
                            <view class="w-12 h-12 rounded-full bg-secondary overflow-hidden">
                              <image 
                                src={{ member.avatar }} 
                                alt={{ member.nickname }}
                                class="w-full h-full object-cover"
                              />
                            </view>
                            {member.role !== 'member' && (
                              <view class="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                                {{ getRoleIcon(member.role) }}
                              </view>
                            )}
                          </view>
                          <text class="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                            {{ member.remark || member.nickname }}
                          </text>
                        </view>
                      ))}
                      {permissions?.canInvite && (
                        <Link href={`/im/invite-members?groupId=${groupId}`}>
                          <view class="flex flex-col items-center w-12">
                            <view class="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                              <UserPlus class="w-5 h-5 text-muted-foreground" />
                            </view>
                            <text class="text-xs text-muted-foreground mt-1">邀请</text>
                          </view>
                        </Link>
                      )}
                    </view>
                  </view>
                </view>
              )}
    
              <!--   -->
              {group?.noticeDetail && (
                <view class="bg-card rounded-xl p-4">
                  <view class="flex items-center justify-between mb-2">
                    <text class="text-sm font-medium">群公告</text>
                    {permissions?.canUpdateNotice && (
                      <Button variant="ghost" size="sm" class="text-primary h-7">
                        编辑
                      </Button>
                    )}
                  </view>
                  <text class="text-sm text-muted-foreground whitespace-pre-wrap">
                    {{ group.noticeDetail.content }}
                  </text>
                  <view class="text-xs text-muted-foreground mt-2">
                    {{ group.noticeDetail.publisher }} 发布于 {{ group.noticeDetail.publishedAt }}
                  </view>
                </view>
              )}
    
              <!--   -->
              <view class="bg-card rounded-xl divide-y">
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <text class="text-sm">我在本群的昵称</text>
                  {editingNickname ? (
                    <view class="flex items-center gap-2">
                      <Input 
                        value={{ nicknameInput }}
                        @change={e => setNicknameInput(e.target.value)}
                        class="w-32 h-8 text-sm"
                        placeholder="请输入昵称"
                        maxLength={{ 20 }}
                      />
                      <Button size="icon" class="h-8 w-8" @click={{ handleSaveNickname }}>
                        <Check class="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        class="h-8 w-8"
                        @click={() => setEditingNickname(false)}
                      >
                        <X class="w-4 h-4" />
                      </Button>
                    </view>
                  ) : (
                    <Button 
                      variant="ghost" 
                      class="text-muted-foreground h-8 px-2"
                      @click={() => setEditingNickname(true)}
                    >
                      {settings?.myNickname || '未设置'}
                      <ChevronRight class="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    {settings?.isMuted ? (
                      <BellOff class="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Bell class="w-5 h-5 text-muted-foreground" />
                    )}
                    <text class="text-sm">消息免打扰</text>
                  </view>
                  <Switch 
                    :checked={{ settings?.isMuted || false }}
                    onCheckedChange={{ handleToggleMute }}
                  />
                </view>
    
                <!--   -->
                <view class="flex items-center justify-between p-4">
                  <view class="flex items-center gap-3">
                    {settings?.isPinned ? (
                      <Pin class="w-5 h-5 text-primary" />
                    ) : (
                      <PinOff class="w-5 h-5 text-muted-foreground" />
                    )}
                    <text class="text-sm">置顶聊天</text>
                  </view>
                  <Switch 
                    :checked={{ settings?.isPinned || false }}
                    onCheckedChange={{ handleTogglePin }}
                  />
                </view>
              </view>
    
              <!--   -->
              <view class="bg-card rounded-xl">
                {group?.myRole === 'owner' ? (
                  <Button 
                    variant="ghost" 
                    class="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                    @click={() => setShowDismissConfirm(true)}
                  >
                    <Trash2 class="w-5 h-5 mr-2" />
                    解散群聊
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    class="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                    @click={() => setShowQuitConfirm(true)}
                  >
                    <LogOut class="w-5 h-5 mr-2" />
                    退出群聊
                  </Button>
                )}
              </view>
            </view>
    
            <!--   -->
            <Sheet open={{ showAllMembers }} onOpenChange={{ setShowAllMembers }}>
              <SheetContent side="right" class="w-full sm:max-w-md p-0">
                <SheetHeader class="p-4 border-b">
                  <SheetTitle>群成员 ({{ members.length }})</SheetTitle>
                </SheetHeader>
                <view class="overflow-y-auto max-h-[calc(100vh-80px)]">
                  
    <view v-for="(member, index) in members" :key="index"> (
                    <view 
                      key={member.id}
                      class="flex items-center justify-between p-4 hover:bg-secondary/50"
                    >
                      <view class="flex items-center gap-3">
                        <view class="relative">
                          <view class="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                            <image 
                              src={{ member.avatar }} 
                              alt={{ member.nickname }}
                              class="w-full h-full object-cover"
                            />
                          </view>
                        </view>
                        <view>
                          <view class="flex items-center gap-2">
                            <text class="font-medium">{{ member.remark || member.nickname }}</text>
                            {member.role !== 'member' && (
                              <Badge variant="secondary" class="text-xs py-0">
                                {{ getRoleIcon(member.role) }}
                                <text class="ml-1">{{ getGroupRoleName(member.role) }}</text>
                              </Badge>
                            )}
                          </view>
                          {member.remark && (
                            <text class="text-xs text-muted-foreground">{{ member.nickname }}</text>
                          )}
                        </view>
                      </view>
                      
                      {member.id !== 0 && permissions && (permissions.canRemoveMember || permissions.canSetAdmin) && member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" class="h-8 w-8">
                              <MoreVertical class="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {permissions.canSetAdmin && member.role !== 'owner' && (
                              <DropdownMenuItem @click={() => handleToggleAdmin(member)}>
                                <Shield class="w-4 h-4 mr-2" />
                                {member.role === 'admin' ? '取消管理员' : '设为管理员'}
                              </DropdownMenuItem>
                            )}
                            {permissions.canTransfer && member.role !== 'owner' && (
                              <DropdownMenuItem 
                                @click={() => {
                                  setSelectedMember(member)
                                  setShowTransferConfirm(true)
                                }}
                              >
                                <Crown class="w-4 h-4 mr-2" />
                                转让群主
                              </DropdownMenuItem>
                            )}
                            {permissions.canRemoveMember && member.role !== 'owner' && (
                              <DropdownMenuItem 
                                class="text-destructive focus:text-destructive"
                                @click={() => {
                                  setSelectedMember(member)
                                  setShowRemoveConfirm(true)
                                }}
                              >
                                <Trash2 class="w-4 h-4 mr-2" />
                                移除成员
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </view>
                  ))}
                </view>
              </SheetContent>
            </Sheet>
    
            <!--   -->
            <Sheet open={{ showQrcode }} onOpenChange={{ setShowQrcode }}>
              <SheetContent side="bottom" class="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>群二维码</SheetTitle>
                </SheetHeader>
                <view class="flex flex-col items-center py-8">
                  <view class="w-48 h-48 bg-white rounded-xl p-4 shadow-lg">
                    <image src={{ qrcodeUrl }} alt="群二维码" class="w-full h-full" />
                  </view>
                  <text class="text-sm text-muted-foreground mt-4">扫一扫，加入群聊</text>
                  <text class="text-xs text-muted-foreground mt-1">二维码7天内有效</text>
                </view>
              </SheetContent>
            </Sheet>
    
            <!--   -->
            <AlertDialog open={{ showQuitConfirm }} onOpenChange={{ setShowQuitConfirm }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>退出群聊</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要退出群聊「{{ group?.name }}」吗？退出后将不再接收此群消息。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction 
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click={{ handleQuit }}
                  >
                    退出
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
    
            <!--   -->
            <AlertDialog open={{ showDismissConfirm }} onOpenChange={{ setShowDismissConfirm }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>解散群聊</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要解散群聊「{{ group?.name }}」吗？解散后所有成员将被移出，此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction 
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click={{ handleDismiss }}
                  >
                    解散
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
    
            <!--   -->
            <AlertDialog open={{ showTransferConfirm }} onOpenChange={{ setShowTransferConfirm }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>转让群主</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要将群主转让给「{{ selectedMember?.nickname }}」吗？转让后您将成为普通成员。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction @click={{ handleTransfer }}>
                    确认转让
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
    
            <!--   -->
            <AlertDialog open={{ showRemoveConfirm }} onOpenChange={{ setShowRemoveConfirm }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>移除成员</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要将「{{ selectedMember?.nickname }}」移出群聊吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction 
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click={{ handleRemoveMember }}
                  >
                    移除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </view>
        </DataState>
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