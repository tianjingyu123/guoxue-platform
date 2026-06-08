<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/yangpan/history</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="bg-card border-b border-border sticky top-0 z-20">
            <view class="flex items-center justify-between px-4 py-3">
              <Link href="/yangpan" class="flex items-center text-muted-foreground hover:text-foreground">
                <ChevronLeft class="w-5 h-5" />
              </Link>
              
              <!--   -->
              <view class="flex bg-secondary rounded-full p-0.5">
                <view class="v0-btn" class="px-5 py-1.5 text-sm font-medium rounded-full bg-card text-foreground shadow-sm">
                  用户列表
                </view>
                <Link
                  href="/yangpan/history/celebrities"
                  class="px-5 py-1.5 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground relative"
                >
                  案例库
                  <text class="absolute -top-1 -right-1 px-1 py-0.5 text-[10px] font-medium text-bronze bg-bronze-light rounded">VIP</text>
                </Link>
              </view>
    
              <view class="v0-btn" 
                @click={() => setShowMenu(!showMenu)}
                class="p-1.5 rounded-full hover:bg-secondary transition-colors relative"
              >
                <MoreVertical class="w-5 h-5 text-muted-foreground" />
              </view>
            </view>
    
            <!--   -->
            {showMenu && (
              
                <view class="fixed inset-0 z-10" @click={() => setShowMenu(false)} />
                <view class="absolute right-3 top-12 bg-card rounded-xl shadow-xl z-20 py-2 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link 
                    href="/yangpan/history/groups"
                    @click={() => setShowMenu(false)}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <Users class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">分组编辑</text>
                  </Link>
                  <view class="v0-btn" 
                    @click={() => {
                      setSelectMode("group")
                      setShowMenu(false)
                    }}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <FolderEdit class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">修改分组</text>
                  </view>
                  <view class="v0-btn" 
                    @click={() => {
                      setSelectMode("pin")
                      setShowMenu(false)
                    }}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <Star class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">星标置顶</text>
                  </view>
                  <view class="v0-btn" 
                    @click={() => {
                      setSelectMode("delete")
                      setShowMenu(false)
                    }}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <Trash2 class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">批量删除</text>
                  </view>
                </view>
              
            )}
          </view>
    
          <!--   -->
          <view class="bg-card px-4 py-3 border-b border-border/60">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索客户名称"
                value={{ searchQuery }}
                @change={(e) => setSearchQuery(e.target.value)}
                class="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card border border-transparent focus:border-primary/20"
              />
            </view>
          </view>
    
          <!--   -->
          <view class="bg-card px-4 py-2 border-b border-border/60 overflow-x-auto scrollbar-hide">
            <view class="flex gap-2">
              
    <view v-for="(group, index) in groups" :key="index"> (
                <view class="v0-btn"
                  key={{ group }}
                  @click={() => setActiveGroup(group)}
                  class={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                    activeGroup === group
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {{ group }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 bg-card">
            {filteredRecords.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search class="w-12 h-12 mb-3 opacity-50" />
                <text>暂无记录</text>
              </view>
            ) : (
              <view class="divide-y divide-border/60">
                
    <view v-for="(record, index) in filteredRecords" :key="index"> (
                  <view 
                    key={record.id}
                    class="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <!--   -->
                    {selectMode !== "none" && (
                      <view class="v0-btn"
                        @click={() => toggleSelect(record.id)}
                        class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedIds.includes(record.id)
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}
                      >
                        {selectedIds.includes(record.id) && (
                          <Check class="w-3 h-3 text-white" />
                        )}
                      </view>
                    )}
    
                    <!--   -->
                    <view class={`w-10 h-10 rounded-full flex items-center justify-center ${
                      record.gender === "male" ? "bg-blue-50" : "bg-pink-50"
                    }`}>
                      <svg 
                        class={`w-6 h-6 ${record.gender === "male" ? "text-blue-400" : "text-pink-400"}`}
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        {record.gender === "male" ? (
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        ) : (
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        )}
                      </svg>
                    </view>
    
                    <!--   -->
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-foreground truncate">{{ record.name }}</text>
                        {record.analyzed && (
                          <text class="px-1.5 py-0.5 text-xs text-bronze bg-bronze-light rounded">已解析</text>
                        )}
                      </view>
                      <view class="text-xs text-muted-foreground mt-0.5">{{ record.date }}</view>
                    </view>
    
                    <!--   -->
                    <view class="text-right">
                      <view class="flex gap-0.5 text-sm font-medium justify-end">
                        <text class={{ tianGanColors[record.pillars.yearGan] }}>{{ record.pillars.yearGan }}</text>
                        <text class={{ tianGanColors[record.pillars.monthGan] }}>{{ record.pillars.monthGan }}</text>
                        <text class={{ tianGanColors[record.pillars.dayGan] }}>{{ record.pillars.dayGan }}</text>
                        <text class={{ tianGanColors[record.pillars.hourGan] }}>{{ record.pillars.hourGan }}</text>
                      </view>
                      <view class="flex gap-0.5 text-sm font-medium justify-end mt-0.5">
                        <text class={{ diZhiColors[record.pillars.yearZhi] }}>{{ record.pillars.yearZhi }}</text>
                        <text class={{ diZhiColors[record.pillars.monthZhi] }}>{{ record.pillars.monthZhi }}</text>
                        <text class={{ diZhiColors[record.pillars.dayZhi] }}>{{ record.pillars.dayZhi }}</text>
                        <text class={{ diZhiColors[record.pillars.hourZhi] }}>{{ record.pillars.hourZhi }}</text>
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            )}
          </view>
    
          <!--   -->
          {selectMode === "delete" && (
            <view class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
              <!--   -->
              <view class="v0-btn"
                @click={{ selectAll }}
                class="flex items-center gap-2"
              >
                <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.length === filteredRecords.length && filteredRecords.length > 0
                    ? "border-primary bg-primary"
                    : "border-border"
                }`}>
                  {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && (
                    <Check class="w-3 h-3 text-white" />
                  )}
                </view>
                <text class="text-sm text-foreground/80">全选</text>
              </view>
    
              <!--   -->
              <view class="flex-1 flex gap-2 justify-end">
                <view class="v0-btn"
                  @click={() => {
                    setSelectMode("none")
                    setSelectedIds([])
                  }}
                  class="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
                >
                  取消
                </view>
                <view class="v0-btn"
                  :disabled={{ selectedIds.length === 0 }}
                  class="px-6 py-2.5 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :style=" backgroundColor: selectedIds.length > 0 ? '#f87171' : '#fca5a5' }}
                >
                  删除
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {selectMode === "pin" && (
            <view class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
              <!--   -->
              <view class="flex-1 flex gap-3">
                <view class="v0-btn"
                  @click={() => {
                    setSelectMode("none")
                    setSelectedIds([])
                  }}
                  class="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
                >
                  取消
                </view>
                <view class="v0-btn"
                  :disabled={{ selectedIds.length === 0 }}
                  class="flex-1 py-2.5 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :style=" backgroundColor: selectedIds.length > 0 ? '#6b7280' : '#9ca3af' }}
                >
                  置顶
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {selectMode === "group" && (
            <view class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
              <!--   -->
              <view class="v0-btn"
                @click={{ selectAll }}
                class="flex items-center gap-2"
              >
                <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.length === filteredRecords.length && filteredRecords.length > 0
                    ? "border-primary bg-primary"
                    : "border-border"
                }`}>
                  {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && (
                    <Check class="w-3 h-3 text-white" />
                  )}
                </view>
                <text class="text-sm text-foreground/80">全选</text>
              </view>
    
              <!--   -->
              <view class="flex-1 flex gap-2 justify-end">
                <view class="v0-btn"
                  @click={() => {
                    setSelectMode("none")
                    setSelectedIds([])
                  }}
                  class="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
                >
                  取消
                </view>
                <view class="v0-btn"
                  :disabled={{ selectedIds.length === 0 }}
                  @click={() => setShowGroupPicker(true)}
                  class="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  移动到分组
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showGroupPicker && (
            <view class="fixed inset-0 bg-black/40 z-50 flex items-end" @click={() => setShowGroupPicker(false)}>
              <view class="bg-card w-full rounded-t-2xl overflow-hidden animate-slide-up" @click={e => e.stopPropagation()}>
                <view class="px-4 py-4 border-b border-border text-center">
                  <text class="text-base font-semibold text-foreground">选择分组</text>
                </view>
                <view class="max-h-[50vh] overflow-y-auto">
                  {groups.filter(g => g !== "全部").map(group => (
                    <view class="v0-btn"
                      key={{ group }}
                      @click={() => handleChangeGroup(group)}
                      class="w-full px-4 py-4 text-left text-foreground hover:bg-secondary/50 transition-colors border-b border-border/60 last:border-b-0"
                    >
                      {{ group }}
                    </view>
                  ))}
                </view>
                <view class="p-4 border-t border-border">
                  <view class="v0-btn"
                    @click={() => setShowGroupPicker(false)}
                    class="w-full py-3 bg-secondary text-muted-foreground rounded-full font-medium"
                  >
                    取消
                  </view>
                </view>
              </view>
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
const tianGanColors: Record<string, string> = {
const diZhiColors: Record<string, string> = {
const mockRecords = [
const groups = ["全部", "家人", "朋友", "客户"]
    const matchesGroup = activeGroup === "全部" || record.group === activeGroup

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