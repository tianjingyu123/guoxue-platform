<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: creator/live/team</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <view class="v0-btn" @click={() => router.back()}>
                  <ChevronLeft class="w-5 h-5" />
                </view>
                <text class="text-lg font-semibold">主播团队管理</text>
              </view>
              <Button size="sm" @click={() => setShowAddDialog(true)}>
                <Plus class="w-4 h-4 mr-1" />
                添加成员
              </Button>
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <view class="grid grid-cols-3 gap-3">
              <Card class="p-3 text-center">
                <view class="text-2xl font-bold text-red-500">
                  {mockTeamMembers.filter(m => m.role === "host").length}
                </view>
                <text class="text-xs text-muted-foreground mt-1">主播</text>
              </Card>
              <Card class="p-3 text-center">
                <view class="text-2xl font-bold text-orange-500">
                  {mockTeamMembers.filter(m => m.role === "cohost").length}
                </view>
                <text class="text-xs text-muted-foreground mt-1">副播</text>
              </Card>
              <Card class="p-3 text-center">
                <view class="text-2xl font-bold text-blue-500">
                  {mockTeamMembers.filter(m => m.role === "operator").length}
                </view>
                <text class="text-xs text-muted-foreground mt-1">运营</text>
              </Card>
            </view>
    
            <!--   -->
            <Card 
              class="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 cursor-pointer"
              @click={() => setShowPermissions(!showPermissions)}
            >
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-2">
                  <Shield class="w-4 h-4 text-amber-600" />
                  <text class="text-sm font-medium">角色权限说明</text>
                </view>
                <ChevronLeft class={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  showPermissions ? "rotate-90" : "-rotate-90"
                )} />
              </view>
              
              {showPermissions && (
                <view class="mt-3 space-y-3 pt-3 border-t border-amber-500/20">
                  {Object.entries(permissions).map(([role, perms]) => (
                    <view key={role}>
                      <view class="flex items-center gap-2 mb-2">
                        <Badge class={cn("text-white border-0", roleConfig[role as keyof typeof roleConfig].color)}>
                          {{ roleConfig[role as keyof typeof roleConfig].label }}
                        </Badge>
                      </view>
                      <view class="grid grid-cols-2 gap-2">
                        
    <view v-for="(perm, idx) in perms" :key="idx"> (
                          <view key={idx} class="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <perm.icon class="w-3 h-3" />
                            <text>{{ perm.label }}</text>
                          </view>
                        ))}
                      </view>
                    </view>
                  ))}
                </view>
              )}
            </Card>
    
            <!--   -->
            <view class="space-y-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索成员姓名或擅长领域"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="pl-9"
                />
              </view>
              
              <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
                <TabsList class="w-full grid grid-cols-4">
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="host">主播</TabsTrigger>
                  <TabsTrigger value="cohost">副播</TabsTrigger>
                  <TabsTrigger value="operator">运营</TabsTrigger>
                </TabsList>
              </Tabs>
            </view>
    
            <!--   -->
            <view class="space-y-3">
              {filteredMembers.length === 0 ? (
                <Card class="p-8 text-center">
                  <Users class="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <text class="text-muted-foreground">暂无成员</text>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    class="mt-3"
                    @click={() => setShowAddDialog(true)}
                  >
                    添加成员
                  </Button>
                </Card>
              ) : (
                filteredMembers.map((member) => {{ const RoleIcon = roleConfig[member.role].icon
                  return (
                    <Card key={member.id }} class="p-4">
                      <view class="flex items-start gap-3">
                        <!--   -->
                        <view class="relative">
                          <Avatar class="w-12 h-12">
                            <AvatarImage src={{ member.avatar }} alt={{ member.name }} />
                            <AvatarFallback>{{ member.name[0] }}</AvatarFallback>
                          </Avatar>
                          <!--   -->
                          <text class={cn(
                            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                            member.status === "online" ? "bg-green-500" : "bg-gray-400"
                          )} />
                        </view>
                        
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2 flex-wrap">
                            <text class="font-semibold">{{ member.name }}</text>
                            <Badge class={cn("text-white border-0 text-[10px]", roleConfig[member.role].color)}>
                              <RoleIcon class="w-3 h-3 mr-0.5" />
                              {{ roleConfig[member.role].label }}
                            </Badge>
                            {member.hasActiveLive && (
                              <Badge variant="outline" class="text-[10px] border-red-500 text-red-500">
                                直播中
                              </Badge>
                            )}
                          </view>
                          
                          <view class="flex flex-wrap gap-1 mt-1.5">
                            {member.expertise.map((exp, idx) => (
                              <text 
                                key={idx} 
                                class="px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground"
                              >
                                {{ exp }}
                              </text>
                            ))}
                          </view>
                          
                          <view class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <text class="flex items-center gap-1">
                              <Phone class="w-3 h-3" />
                              {{ member.phone }}
                            </text>
                            <text>已直播 {{ member.liveCount }} 场</text>
                          </view>
                        </view>
                        
                        <!--   -->
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" class="h-8 w-8">
                              <MoreHorizontal class="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem @click={() => {
                              setSelectedMember(member)
                              setSelectedRole(member.role)
                              setShowEditDialog(true)
                            }}>
                              <Edit2 class="w-4 h-4 mr-2" />
                              编辑信息
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              class="text-red-500"
                              @click={() => {
                                setSelectedMember(member)
                                setShowRemoveDialog(true)
                              }}
                            >
                              <Trash2 class="w-4 h-4 mr-2" />
                              移除成员
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </view>
                    </Card>
                  )
                })
              )}
            </view>
          </view>
    
          <!--   -->
          <Dialog open={{ showAddDialog }} onOpenChange={{ setShowAddDialog }}>
            <DialogContent class="max-w-md">
              <DialogHeader>
                <DialogTitle>添加团队成员</DialogTitle>
                <DialogDescription>从签约讲师或圈内成员中搜索添加</DialogDescription>
              </DialogHeader>
              
              <view class="space-y-4">
                <!--   -->
                <view class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名或擅长领域"
                    value={{ addSearchQuery }}
                    @change={(e) => setAddSearchQuery(e.target.value)}
                    class="pl-9"
                  />
                </view>
                
                <!--   -->
                <view class="space-y-2">
                  <Label>分配角色</Label>
                  <Select value={{ selectedRole }} onValueChange={{ setSelectedRole }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="host">主播</SelectItem>
                      <SelectItem value="cohost">副播</SelectItem>
                      <SelectItem value="operator">运营</SelectItem>
                    </SelectContent>
                  </Select>
                </view>
                
                <!--   -->
                <view class="space-y-2 max-h-60 overflow-y-auto">
                  <text class="text-xs text-muted-foreground">搜索结果</text>
                  
    <view v-for="(member, index) in filteredAvailable" :key="index"> (
                    <Card 
                      key={member.id} 
                      class="p-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar class="w-10 h-10">
                        <AvatarFallback>{{ member.name[0] }}</AvatarFallback>
                      </Avatar>
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="font-medium text-sm">{{ member.name }}</text>
                          <Badge variant="outline" class="text-[10px]">
                            {member.type === "lecturer" ? "签约讲师" : "圈内成员"}
                          </Badge>
                        </view>
                        <text class="text-xs text-muted-foreground truncate">
                          {member.expertise.join("、")}
                        </text>
                      </view>
                      <Button size="sm" variant="outline">
                        <Plus class="w-3 h-3 mr-1" />
                        添加
                      </Button>
                    </Card>
                  ))}
                </view>
              </view>
              
              <DialogFooter>
                <Button variant="outline" @click={() => setShowAddDialog(false)}>取消</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    
          <!--   -->
          <Dialog open={{ showEditDialog }} onOpenChange={{ setShowEditDialog }}>
            <DialogContent class="max-w-md">
              <DialogHeader>
                <DialogTitle>编辑成员信息</DialogTitle>
              </DialogHeader>
              
              {selectedMember && (
                <view class="space-y-4">
                  <view class="flex items-center gap-3">
                    <Avatar class="w-12 h-12">
                      <AvatarImage src={{ selectedMember.avatar }} alt={{ selectedMember.name }} />
                      <AvatarFallback>{{ selectedMember.name[0] }}</AvatarFallback>
                    </Avatar>
                    <view>
                      <text class="font-semibold">{{ selectedMember.name }}</text>
                      <text class="text-sm text-muted-foreground">加入时间：{{ selectedMember.joinDate }}</text>
                    </view>
                  </view>
                  
                  <view class="space-y-2">
                    <Label>角色</Label>
                    <Select value={{ selectedRole }} onValueChange={{ setSelectedRole }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="host">主播</SelectItem>
                        <SelectItem value="cohost">副播</SelectItem>
                        <SelectItem value="operator">运营</SelectItem>
                      </SelectContent>
                    </Select>
                  </view>
                  
                  <view class="p-3 bg-secondary/50 rounded-lg">
                    <text class="text-xs text-muted-foreground mb-2">当前角色权限</text>
                    <view class="flex flex-wrap gap-2">
                      {permissions[selectedRole as keyof typeof permissions]?.map((perm, idx) => (
                        <view key={idx} class="flex items-center gap-1 text-xs">
                          <Check class="w-3 h-3 text-green-500" />
                          {{ perm.label }}
                        </view>
                      ))}
                    </view>
                  </view>
                </view>
              )}
              
              <DialogFooter>
                <Button variant="outline" @click={() => setShowEditDialog(false)}>取消</Button>
                <Button @click={() => setShowEditDialog(false)}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    
          <!--   -->
          <Dialog open={{ showRemoveDialog }} onOpenChange={{ setShowRemoveDialog }}>
            <DialogContent class="max-w-sm">
              <DialogHeader>
                <DialogTitle>移除成员</DialogTitle>
              </DialogHeader>
              
              {selectedMember && (
                <view class="space-y-4">
                  {selectedMember.hasActiveLive ? (
                    <view class="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <view class="flex items-start gap-3">
                        <AlertTriangle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <view>
                          <text class="font-medium text-red-600">无法移除</text>
                          <text class="text-sm text-muted-foreground mt-1">
                            该成员当前有进行中的直播，请在直播结束后再进行移除操作。
                          </text>
                        </view>
                      </view>
                    </view>
                  ) : (
                    <view class="text-center">
                      <Avatar class="w-16 h-16 mx-auto mb-3">
                        <AvatarImage src={{ selectedMember.avatar }} alt={{ selectedMember.name }} />
                        <AvatarFallback>{{ selectedMember.name[0] }}</AvatarFallback>
                      </Avatar>
                      <text class="text-muted-foreground">
                        确定要移除 <text class="font-medium text-foreground">{{ selectedMember.name }}</text> 吗？
                      </text>
                      <text class="text-xs text-muted-foreground mt-1">
                        移除后该成员将无法参与直播管理
                      </text>
                    </view>
                  )}
                </view>
              )}
              
              <DialogFooter>
                <Button variant="outline" @click={() => setShowRemoveDialog(false)}>取消</Button>
                {selectedMember && !selectedMember.hasActiveLive && (
                  <Button variant="destructive" @click={{ handleRemove }}>确认移除</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const roleConfig = {
const mockTeamMembers = [
const mockAvailableMembers = [
const permissions = {
    const matchTab = activeTab === "all" || member.role === activeTab || (activeTab === "guest" && member.role === "guest")

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