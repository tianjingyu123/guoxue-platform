<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circle/[id]/members</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-12">
              <BackButton fallbackPath="/circle/1/home" />
              <text class="font-semibold text-base text-foreground">圈子成员</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-12 z-30 bg-background px-4 py-3 border-b border-border">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索成员昵称或编号"
                value={{ searchQuery }}
                @change={(e) => setSearchQuery(e.target.value)}
                class="w-full h-10 pl-10 pr-4 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <view class="v0-btn" 
                  @click={() => setSearchQuery("")}
                  class="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X class="w-4 h-4 text-muted-foreground" />
                </view>
              )}
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-[100px] z-30 bg-background border-b border-border">
            <view class="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
              
    <view v-for="(role, index) in roles" :key="index"> (
                <view class="v0-btn"
                  key={{ role.id }}
                  @click={() => setSelectedRole(role.id)}
                  class={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    selectedRole === role.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ role.label }}
                  <text class="ml-1 opacity-70">{{ role.count }}</text>
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="flex items-center justify-between px-4 py-2 border-b border-border">
            <text class="text-xs text-muted-foreground">
              共 {{ filteredMembers.length }} 位成员
            </text>
            <view class="relative">
              <view class="v0-btn"
                @click={() => setShowSortMenu(!showSortMenu)}
                class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {sortBy === "time" ? "按加入时间" : "按活跃度"}
                <ChevronDown class={cn("w-3 h-3 transition-transform", showSortMenu && "rotate-180")} />
              </view>
              {showSortMenu && (
                
                  <view class="fixed inset-0 z-40" @click={() => setShowSortMenu(false)} />
                  <view class="absolute right-0 top-6 z-50 w-28 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
                    <view class="v0-btn"
                      @click={() => { setSortBy("time"); setShowSortMenu(false) }}
                      class={cn(
                        "w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors",
                        sortBy === "time" && "text-primary"
                      )}
                    >
                      按加入时间
                    </view>
                    <view class="v0-btn"
                      @click={() => { setSortBy("active"); setShowSortMenu(false) }}
                      class={cn(
                        "w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors",
                        sortBy === "active" && "text-primary"
                      )}
                    >
                      按活跃度
                    </view>
                  </view>
                
              )}
            </view>
          </view>
    
          <!--   -->
          <view class="divide-y divide-border">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => {
                const roleConfig = getRoleConfig(member.role)
                const roleIcon = getRoleIcon(member.role)
                
                return (
                  <view key={member.id} class="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <Link href={`/user/${member.id}`} class="flex-shrink-0">
                      <Avatar class="w-12 h-12">
                        <AvatarImage src={{ member.avatar }} alt={{ member.name }} />
                        <AvatarFallback class="bg-secondary text-foreground">
                          {{ member.name[0] }}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-1.5 flex-wrap">
                        <Link href={`/user/${member.id}`} class="font-medium text-sm text-foreground hover:text-primary">
                          {{ member.name }}
                        </Link>
                        {member.isVerified && (
                          <Badge variant="secondary" class="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                        )}
                        {member.role !== "member" && (
                          <Badge class={cn("text-[10px] px-1.5 py-0 border-0 flex items-center gap-0.5", roleConfig.color)}>
                            {{ roleIcon }}
                            {{ roleConfig.label }}
                          </Badge>
                        )}
                      </view>
                      <view class="flex items-center gap-2 mt-0.5">
                        <text class="text-xs text-muted-foreground">#{{ member.memberNo }}</text>
                        <text class="text-[10px] text-muted-foreground/60">·</text>
                        <text class="text-xs text-muted-foreground/70">{{ member.joinTime }} 加入</text>
                      </view>
                      {member.intro && (
                        <text class="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{{ member.intro }}</text>
                      )}
                    </view>
    
                    <view class="flex items-center gap-2 flex-shrink-0">
                      <text class="text-[10px] text-muted-foreground/60">{{ member.lastActive }}</text>
                      {isAdmin && member.role !== "owner" && (
                        <view class="v0-btn"
                          @click={() => handleManage(member)}
                          class="p-1.5 rounded-full hover:bg-secondary transition-colors"
                        >
                          <MoreHorizontal class="w-4 h-4 text-muted-foreground" />
                        </view>
                      )}
                    </view>
                  </view>
                )
              })
            ) : (
              <view class="flex flex-col items-center justify-center py-16">
                <view class="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Users class="w-7 h-7 text-muted-foreground" />
                </view>
                <text class="text-sm text-muted-foreground">未找到相关成员</text>
                <text class="text-xs text-muted-foreground/70 mt-1">试试其他搜索条件</text>
              </view>
            )}
          </view>
    
          <!--   -->
          {showManageModal && selectedMember && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view 
                class="absolute inset-0" 
                @click={() => setShowManageModal(false)} 
              />
              <view class="relative w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <!--   -->
                <view class="flex items-center gap-3 p-4 border-b border-border">
                  <Avatar class="w-12 h-12">
                    <AvatarImage src={{ selectedMember.avatar }} alt={{ selectedMember.name }} />
                    <AvatarFallback class="bg-secondary text-foreground">
                      {{ selectedMember.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                  <view>
                    <text class="font-medium text-foreground">{{ selectedMember.name }}</text>
                    <text class="text-xs text-muted-foreground">#{{ selectedMember.memberNo }}</text>
                  </view>
                </view>
    
                <!--   -->
                <view class="p-4 border-b border-border">
                  <text class="text-xs text-muted-foreground mb-3">修改角色</text>
                  <view class="grid grid-cols-3 gap-2">
                    {roles.filter(r => r.id !== "all" && r.id !== "owner").map(role => (
                      <view class="v0-btn"
                        key={{ role.id }}
                        @click={() => handleChangeRole(role.id)}
                        class={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          selectedMember.role === role.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                      >
                        {{ role.label }}
                      </view>
                    ))}
                    <view class="v0-btn"
                      @click={() => handleChangeRole("member")}
                      class={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        selectedMember.role === "member"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      普通成员
                    </view>
                  </view>
                </view>
    
                <!--   -->
                <view class="p-4">
                  <view class="v0-btn"
                    @click={{ handleRemove }}
                    class="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
                  >
                    <UserMinus class="w-4 h-4" />
                    移出圈子
                  </view>
                </view>
    
                <!--   -->
                <view class="p-4 pt-0">
                  <view class="v0-btn"
                    @click={() => setShowManageModal(false)}
                    class="w-full py-3 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    取消
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showConfirmModal && selectedMember && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <Card class="w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200">
                <view class="text-center mb-4">
                  {confirmAction === "remove" ? (
                    <view class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                      <UserMinus class="w-6 h-6 text-red-500" />
                    </view>
                  ) : (
                    <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <UserCog class="w-6 h-6 text-primary" />
                    </view>
                  )}
                  <text class="font-semibold text-foreground">
                    {confirmAction === "remove" ? "确认移出成员?" : "确认修改角色?"}
                  </text>
                  <text class="text-sm text-muted-foreground mt-2">
                    {confirmAction === "remove" 
                      ? `将 ${{ selectedMember.name }} 移出圈子后，其发布的内容将保留，但无法再访问圈子内容。`
                      : `将 ${{ selectedMember.name }} 的角色修改为「${{ getRoleConfig(newRole).label }}」`
                    }
                  </text>
                </view>
                <view class="flex gap-3">
                  <view class="v0-btn"
                    @click={() => { setShowConfirmModal(false); setSelectedMember(null) }}
                    class="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    @click={{ confirmActionHandler }}
                    class={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      confirmAction === "remove"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    确认
                  </view>
                </view>
              </Card>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const roles = [
const membersData = [
      const matchRole = selectedRole === "all" || m.role === selectedRole
      const activeOrder = ["刚刚", "5分钟前", "2小时前", "3小时前", "昨天", "1天前", "2天前", "3天前", "1周前"]

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