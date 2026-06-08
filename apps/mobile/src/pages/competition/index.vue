<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-primary text-primary-foreground">
            <view class="flex items-center justify-between px-4 h-11">
              <Link href="/" class="flex items-center">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="font-medium">赛事中心</text>
              <Link href="/competition/archive" class="text-sm opacity-80">
                往期
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 bg-card border-b border-border">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索赛事名称..."
                value={{ searchQuery }}
                @change={(e) => setSearchQuery(e.target.value)}
                class="pl-9 bg-secondary border-0"
              />
            </view>
          </view>
    
          <!--   -->
          {hotCompetitions.length > 0 && (
            <view class="px-4 py-4">
              <Link href={`/competition/${hotCompetitions[0].id}`}>
                <view class="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-white p-4">
                  <!--   -->
                  <view class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <view class="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                  
                  <view class="relative">
                    <view class="flex items-center gap-2 mb-2">
                      <Badge class="bg-white/20 text-white border-0">
                        <Flame class="w-3 h-3 mr-1" />
                        热门赛事
                      </Badge>
                      <Badge class={cn("border-0", statusConfig[hotCompetitions[0].status as keyof typeof statusConfig].color)}>
                        {{ statusConfig[hotCompetitions[0].status as keyof typeof statusConfig].label }}
                      </Badge>
                    </view>
                    
                    <text class="text-lg font-bold mb-1">{{ hotCompetitions[0].title }}</text>
                    <text class="text-white/80 text-sm mb-3">
                      {{ hotCompetitions[0].organizer }} · {{ hotCompetitions[0].participants }}人已报名
                    </text>
                    
                    <view class="flex items-center gap-4 text-sm">
                      <text class="flex items-center gap-1">
                        <Trophy class="w-4 h-4" />
                        {{ hotCompetitions[0].prizes[0] }}
                      </text>
                    </view>
                    
                    <view class="flex items-center justify-between mt-4">
                      <text class="text-xs text-white/70">
                        报名截止: {{ hotCompetitions[0].registrationDeadline }}
                      </text>
                      <Button size="sm" class="bg-white text-primary hover:bg-white/90">
                        立即报名
                      </Button>
                    </view>
                  </view>
                </view>
              </Link>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 pb-2">
            <view class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              
    <view v-for="(cat, index) in categories" :key="index"> (
                <view class="v0-btn"
                  key={{ cat.id }}
                  @click={() => setActiveCategory(cat.id)}
                  class={cn(
                    "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {{ cat.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-2">
            <Tabs value={{ activeTab }} onValueChange={{ setActiveTab }}>
              <TabsList class="w-full grid grid-cols-4 h-9">
                <TabsTrigger value="all" class="text-xs">全部</TabsTrigger>
                <TabsTrigger value="registering" class="text-xs">报名中</TabsTrigger>
                <TabsTrigger value="ongoing" class="text-xs">进行中</TabsTrigger>
                <TabsTrigger value="ended" class="text-xs">已结束</TabsTrigger>
              </TabsList>
            </Tabs>
          </view>
    
          <!--   -->
          <view class="px-4 py-2 space-y-4">
            
    <view v-for="(comp, index) in filteredCompetitions" :key="index"> (
              <CompetitionCard key={comp.id} competition={{ comp }} />
            ))}
            
            {filteredCompetitions.length === 0 && (
              <view class="text-center py-12 text-muted-foreground">
                <Trophy class="w-12 h-12 mx-auto mb-3 opacity-30" />
                <text>暂无相关赛事</text>
              </view>
            )}
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
const statusConfig = {
const typeConfig = {
const competitions = [
const categories = [
    const matchesTab = activeTab === "all" || comp.status === activeTab

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