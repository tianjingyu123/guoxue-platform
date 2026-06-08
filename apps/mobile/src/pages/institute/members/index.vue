<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">研究院</text>
      <text class="v0-route">V0: institute/members</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <Link href="/institute" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">研究院成员</text>
              </view>
              <Badge variant="secondary" class="text-xs">
                {{ stats.total }}人
              </Badge>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 border-b border-border">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索成员姓名或擅长领域"
                value={{ searchKeyword }}
                @change={(e) => setSearchKeyword(e.target.value)}
                class="pl-9 bg-secondary/30 border-0"
              />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3">
            <view class="grid grid-cols-3 gap-2">
              <view class="text-center p-3 rounded-xl bg-gold/10">
                <text class="text-lg font-bold text-gold">{{ stats.total }}</text>
                <text class="text-[10px] text-muted-foreground">总成员</text>
              </view>
              <view class="text-center p-3 rounded-xl bg-operator/10">
                <text class="text-lg font-bold text-operator">{{ stats.leadership }}</text>
                <text class="text-[10px] text-muted-foreground">管理层</text>
              </view>
              <view class="text-center p-3 rounded-xl bg-success/10">
                <text class="text-lg font-bold text-success">{{ stats.teachers }}</text>
                <text class="text-[10px] text-muted-foreground">入选人才库</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-2 flex gap-2">
            
    <view v-for="(opt, index) in filterOptions" :key="index"> (
              <Button
                key={opt.id}
                variant={activeFilter === opt.id ? "default" : "outline"}
                size="sm"
                @click={() => setActiveFilter(opt.id)}
                class={cn(
                  "rounded-full text-xs",
                  activeFilter === opt.id && "bg-primary text-primary-foreground"
                )}
              >
                {{ opt.label }}
              </Button>
            ))}
          </view>
    
          <!--   -->
          <view class="px-4 py-3 space-y-3">
            
    <view v-for="(member, index) in filteredMembers" :key="index"> {
              const config = roleConfig[member.role]
              return (
                <Link href={`/institute/members/${member.id}`} key={{ member.id }}>
                  <Card class="p-3 hover:bg-secondary/30 transition-colors">
                    <view class="flex gap-3">
                      <!--   -->
                      <view class="relative flex-shrink-0">
                        <view class="w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-gold/20 flex items-center justify-center text-lg font-bold text-gold">
                          {{ member.name.slice(0, 1) }}
                        </view>
                        {member.role !== "member" && (
                          <view class={cn(
                            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                            config.bgColor
                          )}>
                            <Crown class={cn("w-3 h-3", config.color)} />
                          </view>
                        )}
                      </view>
                      
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="font-medium text-foreground">{{ member.name }}</text>
                          <Badge class={cn("text-[10px] px-1.5 py-0", config.bgColor, config.color)}>
                            {{ config.label }}
                          </Badge>
                          {member.isOnlineTeacher && (
                            <Badge class="text-[10px] px-1.5 py-0 bg-success/10 text-success">
                              人才库
                            </Badge>
                          )}
                        </view>
                        <text class="text-xs text-muted-foreground mt-0.5">
                          擅长：{{ member.title }}
                        </text>
                        <view class="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <text class="flex items-center gap-1">
                            <Users class="w-3 h-3" />
                            {{ member.circleName }}
                          </text>
                          <text class="flex items-center gap-1">
                            <Video class="w-3 h-3" />
                            分享{{ member.contributions }}次
                          </text>
                          {member.location && (
                            <text class="flex items-center gap-1">
                              <MapPin class="w-3 h-3" />
                              {{ member.location }}
                            </text>
                          )}
                        </view>
                      </view>
                      
                      <ChevronRight class="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                    </view>
                  </Card>
                </Link>
              )
            })}
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Link href="/institute/member-apply">
              <Button class="w-full bg-gradient-to-r from-gold to-gold hover:from-gold hover:to-[#7A6548]">
                申请加入研究院
              </Button>
            </Link>
          </view>
    
          <!--   -->
          <view class="h-20" />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const roleConfig: Record<MemberRole, { label: string; color: string; bgColor: string; order: number }> = {
const mockMembers: InstituteMember[] = [
const filterOptions = [
  const stats = {

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