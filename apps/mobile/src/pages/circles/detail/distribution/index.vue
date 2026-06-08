<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circles/[id]/distribution</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-white border-b border-muted">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5 text-foreground" />
              </view>
              <text class="font-semibold text-foreground">收益分配设置</text>
              <view class="v0-btn" 
                @click={() => setShowHelp(true)}
                class="p-2 -mr-2 text-muted-foreground"
              >
                <HelpCircle class="w-5 h-5" />
              </view>
            </view>
    
            <!--   -->
            <view class="flex border-b border-muted">
              <view class="v0-btn"
                @click={() => setActiveTab("plans")}
                class={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "plans"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                分配方案
              </view>
              <view class="v0-btn"
                @click={() => setActiveTab("guests")}
                class={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "guests"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                嘉宾个性化
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <view class="flex gap-3">
              <Info class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <view class="text-sm text-amber-800">
                <text class="font-medium mb-1">分配说明</text>
                <text class="text-xs text-amber-700 leading-relaxed">
                  收益分配顺序：平台抽成 → 圈子收益 → 创作者（嘉宾/老师）收益。
                  您可以为不同内容类型设置不同方案，也可以为特定嘉宾设置个性化分成比例。
                </text>
              </view>
            </view>
          </view>
    
          {activeTab === "plans" ? (
            /* 分配方案列表 */
            <view class="p-4 space-y-3">
              
    <view v-for="(plan, index) in plans" :key="index"> (
                <view 
                  key={plan.id}
                  class="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                >
                  <view class="flex items-start justify-between">
                    <view class="flex-1">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-foreground">{{ plan.name }}</text>
                        {plan.isDefault && (
                          <text class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            默认
                          </text>
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground mt-1">{{ plan.description }}</text>
                    </view>
                    <view class="v0-btn" 
                      @click={() => setEditingPlan(plan.id)}
                      class="p-2 text-muted-foreground"
                    >
                      <Edit class="w-4 h-4" />
                    </view>
                  </view>
    
                  <!--   -->
                  <view class="mt-3 flex flex-wrap gap-1.5">
                    {plan.contentTypes.map(type => {
                      const cfg = contentTypes.find(t => t.key === type)
                      if (!cfg) return null
                      return (
                        <text 
                          key={type}
                          class="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                          :style=" backgroundColor: `${{ cfg.color }}15`, color: cfg.color }}
                        >
                          <cfg.icon class="w-3 h-3" />
                          {{ cfg.label }}
                        </text>
                      )
                    })}
                  </view>
    
                  <!--   -->
                  <view class="mt-3 pt-3 border-t border-muted">
                    <view class="flex h-8 rounded-lg overflow-hidden">
                      <view 
                        class="flex items-center justify-center text-white text-[10px] font-medium"
                        :style=" 
                          width: `${{ plan.rules.platform }}%`, 
                          backgroundColor: "#999",
                          minWidth: plan.rules.platform > 5 ? "auto" : "20px"
                        }}
                      >
                        {plan.rules.platform > 8 && `${plan.rules.platform}%`}
                      </view>
                      <view 
                        class="flex items-center justify-center text-white text-[10px] font-medium"
                        :style=" 
                          width: `${{ plan.rules.circle }}%`, 
                          backgroundColor: "#C9A96E" 
                        }}
                      >
                        {{ plan.rules.circle }}%
                      </view>
                      <view 
                        class="flex items-center justify-center text-white text-[10px] font-medium"
                        :style=" 
                          width: `${{ plan.rules.creator }}%`, 
                          backgroundColor: "#C41E3A" 
                        }}
                      >
                        {{ plan.rules.creator }}%
                      </view>
                    </view>
                    <view class="flex justify-between mt-2 text-[10px] text-muted-foreground">
                      <text class="flex items-center gap-1">
                        <text class="w-2 h-2 rounded-full bg-muted-foreground"></text>
                        平台 {{ plan.rules.platform }}%
                      </text>
                      <text class="flex items-center gap-1">
                        <text class="w-2 h-2 rounded-full bg-gold"></text>
                        圈子 {{ plan.rules.circle }}%
                      </text>
                      <text class="flex items-center gap-1">
                        <text class="w-2 h-2 rounded-full bg-primary"></text>
                        创作者 {{ plan.rules.creator }}%
                      </text>
                    </view>
                  </view>
                </view>
              ))}
    
              <!--   -->
              <view class="v0-btn" 
                @click={() => setShowCreateModal(true)}
                class="w-full py-4 border-2 border-dashed border-muted rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus class="w-5 h-5" />
                <text class="text-sm">添加分配方案</text>
              </view>
            </view>
          ) : (
            /* 嘉宾个性化分成 */
            <view class="p-4 space-y-3">
              <text class="text-xs text-muted-foreground mb-2">
                为特定嘉宾/老师设置个性化分成比例，覆盖默认方案
              </text>
    
              
    <view v-for="(guest, index) in mockGuestOverrides" :key="index"> (
                <view 
                  key={guest.guestId}
                  class="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                >
                  <view class="flex items-center gap-3">
                    <image alt="图片" 
                      src={{ guest.avatar }} 
                      alt={{ guest.guestName }}
                      class="w-10 h-10 rounded-xl"
                    />
                    <view class="flex-1">
                      <text class="font-medium text-foreground">{{ guest.guestName }}</text>
                      <view class="flex flex-wrap gap-1 mt-1">
                        {guest.contentTypes.map(type => {
                          const cfg = contentTypes.find(t => t.key === type)
                          return cfg ? (
                            <text 
                              key={type}
                              class="text-[10px] px-1.5 py-0.5 rounded"
                              :style=" backgroundColor: `${{ cfg.color }}15`, color: cfg.color }}
                            >
                              {{ cfg.label }}
                            </text>
                          ) : null
                        })}
                      </view>
                    </view>
                    <view class="text-right">
                      <text class="text-lg font-bold text-primary">{{ guest.sharePercent }}%</text>
                      <text class="text-[10px] text-muted-foreground">创作者分成</text>
                    </view>
                    <ChevronRight class="w-5 h-5 text-muted-foreground" />
                  </view>
                </view>
              ))}
    
              {mockGuestOverrides.length === 0 && (
                <view class="text-center py-8">
                  <Users class="w-12 h-12 text-muted mx-auto mb-3" />
                  <text class="text-muted-foreground text-sm">暂无个性化分成设置</text>
                  <text class="text-xs text-muted-foreground mt-1">所有嘉宾使用默认分配方案</text>
                </view>
              )}
    
              <view class="v0-btn" 
                class="w-full py-4 border-2 border-dashed border-muted rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus class="w-5 h-5" />
                <text class="text-sm">添加个性化分成</text>
              </view>
            </view>
          )}
    
          <!--   -->
          {(showCreateModal || editingPlan) && (
            <PlanEditorModal
              plan={editingPlan ? plans.find(p => p.id === editingPlan) : undefined}
              onClose={() => { setShowCreateModal(false); setEditingPlan(null) }}
              onSave={(newPlan) => {
                if (editingPlan) {
                  setPlans(plans.map(p => p.id === editingPlan ? { ...p, ...newPlan } : p))
                } else {
                  setPlans([...plans, { ...newPlan, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] }])
                }
                setShowCreateModal(false)
                setEditingPlan(null)
              }}
            />
          )}
    
          <!--   -->
          {showHelp && (
            <HelpModal onClose={() => setShowHelp(false)} />
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
const contentTypes = [
const mockDistributionPlans = [
const mockGuestOverrides = [

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