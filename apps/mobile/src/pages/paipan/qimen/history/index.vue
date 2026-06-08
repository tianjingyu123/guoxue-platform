<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/qimen/history</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-12">
              <Link href="/qimen" class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6 text-foreground" />
              </Link>
              <text class="text-base font-bold text-foreground">排盘记录</text>
              <view class="v0-btn" @click={() => setShowMenu(!showMenu)} class="p-1 -mr-1 relative">
                <MoreVertical class="w-5 h-5 text-foreground" />
              </view>
            </view>
    
            <!--   -->
            {showMenu && (
              
                <view class="fixed inset-0 z-10" @click={() => setShowMenu(false)} />
                <view class="absolute right-3 top-12 bg-card rounded-xl shadow-xl z-20 py-2 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link 
                    href="/qimen/history/groups"
                    @click={() => setShowMenu(false)}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <Users class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">分组管理</text>
                  </Link>
                  <view class="v0-btn" 
                    @click={() => { setSelectMode("group"); setShowMenu(false) }}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <FolderEdit class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">修改分组</text>
                  </view>
                  <view class="v0-btn" 
                    @click={() => { setSelectMode("pin"); setShowMenu(false) }}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <Pin class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">批量置顶</text>
                  </view>
                  <view class="v0-btn" 
                    @click={() => { setSelectMode("delete"); setShowMenu(false) }}
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-foreground/80 hover:bg-secondary"
                  >
                    <Trash2 class="w-4 h-4 text-muted-foreground" />
                    <text class="text-sm">批量删除</text>
                  </view>
                </view>
              
            )}
          </view>
    
          <!--   -->
          <view class="px-4 py-3 border-b border-border">
            <view class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              
    <view v-for="(group, index) in groups" :key="index"> (
                <view class="v0-btn"
                  key={{ group }}
                  @click={() => setActiveGroup(group)}
                  class={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeGroup === group
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {{ group }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 border-b border-border">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={{ searchQuery }}
                @change={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索事项、时间、局数..."
                class="w-full pl-9 pr-4 py-2.5 bg-secondary/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 overflow-y-auto px-4 py-3">
            {filteredRecords.length === 0 ? (
              <view class="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <text class="text-lg mb-2">暂无记录</text>
                <text class="text-sm">开始排盘后，记录会显示在这���</text>
              </view>
            ) : (
              <view class="space-y-3">
                
    <view v-for="(record, index) in filteredRecords" :key="index"> (
                  <view 
                    key={record.id}
                    class={`bg-card rounded-xl border border-border overflow-hidden transition-all ${
                      selectMode !== "none" ? "cursor-pointer" : ""
                    } ${selectedIds.includes(record.id) ? "ring-2 ring-primary" : ""} ${record.pinned ? "bg-amber-50/30" : ""}`}
                    @click={() => { if (selectMode !== "none") toggleSelect(record.id) }}
                  >
                    <view class="flex">
                      <!--   -->
                      <view class="w-1 bg-gradient-to-b from-blue-400 to-indigo-500 shrink-0" />
                      <view class="p-4 flex-1">
                        <view class="flex items-start gap-3">
                          <!--   -->
                          {selectMode !== "none" && (
                            <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              selectedIds.includes(record.id)
                                ? "border-primary bg-primary"
                                : "border-border"
                            }`}>
                              {selectedIds.includes(record.id) && (
                                <Check class="w-3 h-3 text-white" />
                              )}
                            </view>
                          )}
    
                          <!--   -->
                          <Link 
                            href={`/qimen/result?matter=${encodeURIComponent(record.matter)}&ju=${{ encodeURIComponent(record.ju) }}`}
                            class={`flex-1 ${selectMode !== "none" ? "pointer-events-none" : ""}`}
                            @click={(e) => selectMode !== "none" && e.preventDefault()}
                          >
                            <view class="flex items-center justify-between mb-2">
                              <view class="flex items-center gap-2">
                                {record.pinned && <Pin class="w-3.5 h-3.5 text-amber-500" />}
                                <text class="text-base font-semibold text-foreground">
                                  {record.matter || "未命名事项"}
                                </text>
                              </view>
                              <text class="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">{{ record.group }}</text>
                            </view>
                            <view class="flex items-center gap-3 text-sm">
                              <text class="text-muted-foreground">{{ record.dateTime }}</text>
                              <text class="text-primary font-semibold bg-primary/5 px-2 py-0.5 rounded">{{ record.ju }}</text>
                              <text class="text-muted-foreground text-xs">{{ record.panMethod }}</text>
                            </view>
                          </Link>
                        </view>
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
              <view class="v0-btn" @click={{ selectAll }} class="flex items-center gap-2">
                <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "border-primary bg-primary" : "border-border"
                }`}>
                  {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && <Check class="w-3 h-3 text-white" />}
                </view>
                <text class="text-sm text-foreground/80">全选</text>
              </view>
              <view class="flex-1 flex gap-3 justify-end">
                <view class="v0-btn" @click={() => { setSelectMode("none"); setSelectedIds([]) }} class="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full">取消</view>
                <view class="v0-btn" :disabled={{ selectedIds.length === 0 }} @click={{ handleDelete }} class="px-6 py-2.5 text-sm font-medium text-white bg-red-500 rounded-full disabled:opacity-40">删除 {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</view>
              </view>
            </view>
          )}
    
          <!--   -->
          {selectMode === "pin" && (
            <view class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
              <view class="v0-btn" @click={{ selectAll }} class="flex items-center gap-2">
                <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "border-primary bg-primary" : "border-border"
                }`}>
                  {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && <Check class="w-3 h-3 text-white" />}
                </view>
                <text class="text-sm text-foreground/80">全选</text>
              </view>
              <view class="flex-1 flex gap-3 justify-end">
                <view class="v0-btn" @click={() => { setSelectMode("none"); setSelectedIds([]) }} class="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full">取消</view>
                <view class="v0-btn" :disabled={{ selectedIds.length === 0 }} @click={{ handlePin }} class="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full disabled:opacity-40">置顶 {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</view>
              </view>
            </view>
          )}
    
          <!--   -->
          {selectMode === "group" && (
            <view class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
              <view class="v0-btn" @click={{ selectAll }} class="flex items-center gap-2">
                <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "border-primary bg-primary" : "border-border"
                }`}>
                  {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 && <Check class="w-3 h-3 text-white" />}
                </view>
                <text class="text-sm text-foreground/80">全选</text>
              </view>
              <view class="flex-1 flex gap-2 justify-end">
                <view class="v0-btn" @click={() => { setSelectMode("none"); setSelectedIds([]) }} class="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full">取消</view>
                <view class="v0-btn" :disabled={{ selectedIds.length === 0 }} @click={() => setShowGroupPicker(true)} class="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full disabled:opacity-40">移动到分组</view>
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
                    <view class="v0-btn" key={{ group }} @click={() => handleChangeGroup(group)} class="w-full px-4 py-4 text-left text-foreground hover:bg-secondary/50 transition-colors border-b border-border/60 last:border-b-0">
                      {{ group }}
                    </view>
                  ))}
                </view>
                <view class="p-4 border-t border-border">
                  <view class="v0-btn" @click={() => setShowGroupPicker(false)} class="w-full py-3 bg-secondary text-muted-foreground rounded-full font-medium">取消</view>
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
const groups = ["全部", "工作事业", "财运投资", "感情婚姻", "健康出行", "其他"]
const mockRecords = [

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