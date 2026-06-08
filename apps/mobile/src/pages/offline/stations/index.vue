<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">线下</text>
      <text class="v0-route">V0: offline/stations</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/discover" />
              <text class="text-lg font-semibold">线下驿站</text>
              <view class="flex items-center gap-2">
                <view class="v0-btn"
                  @click={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                  class="p-2 rounded-full hover:bg-muted"
                >
                  {viewMode === 'list' ? <MapIcon class="w-5 h-5" /> : <List class="w-5 h-5" />}
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 pb-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索驿站名称或地址"
                  value={{ searchKeyword }}
                  @change={(e) => setSearchKeyword(e.target.value)}
                  class="w-full h-10 pl-10 pr-4 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              
    <view v-for="(type, index) in stationTypes" :key="index"> (
                <view class="v0-btn"
                  key={{ type.value }}
                  @click={() => setSelectedType(type.value)}
                  class={cn(
                    "px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                    selectedType === type.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {{ type.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-6">
            <!--   -->
            {nearbyStations.length > 0 && !searchKeyword && selectedType === 'all' && (
              <view>
                <view class="flex items-center justify-between mb-3">
                  <text class="font-semibold flex items-center gap-2">
                    <MapPin class="w-4 h-4 text-primary" />
                    附近驿站
                  </text>
                </view>
                <view class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  
    <view v-for="(station, index) in nearbyStations" :key="index"> (
                    <Link
                      key={station.id}
                      href={`/offline/stations/${station.id}`}
                      class="flex-shrink-0 w-64"
                    >
                      <Card class="overflow-hidden">
                        <view class="relative h-32">
                          <image
                            src={{ station.cover }}
                            alt={{ station.name }}
                            class="w-full h-full object-cover"
                          />
                          <Badge class="absolute top-2 left-2 bg-primary/90">
                            {{ formatDistance(station.distance) }}
                          </Badge>
                        </view>
                        <view class="p-3">
                          <text class="font-medium text-sm line-clamp-1">{{ station.name }}</text>
                          <text class="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {{ station.address }}
                          </text>
                        </view>
                      </Card>
                    </Link>
                  ))}
                </view>
              </view>
            )}
    
            <!--   -->
            <view>
              <text class="font-semibold mb-3">
                {searchKeyword ? '搜索结果' : '全部驿站'}
                {!isLoading && <text class="text-muted-foreground font-normal text-sm ml-2">({{ stations.length }})</text>}
              </text>
    
              {isLoading ? (
                <view class="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} class="p-4">
                      <view class="flex gap-4">
                        <Skeleton class="w-24 h-24 rounded-lg flex-shrink-0" />
                        <view class="flex-1 space-y-2">
                          <Skeleton class="h-5 w-3/4" />
                          <Skeleton class="h-4 w-full" />
                          <Skeleton class="h-4 w-1/2" />
                        </view>
                      </view>
                    </Card>
                  ))}
                </view>
              ) : stations.length === 0 ? (
                <view class="text-center py-12">
                  <MapPin class="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <text class="mt-4 text-muted-foreground">暂无驿站</text>
                </view>
              ) : (
                <view class="space-y-4">
                  
    <view v-for="(station, index) in stations" :key="index"> (
                    <Link key={station.id} href={`/offline/stations/${station.id}`}>
                      <Card class="overflow-hidden hover:shadow-md transition-shadow">
                        <view class="flex">
                          <!--   -->
                          <view class="relative w-28 h-28 flex-shrink-0">
                            <image
                              src={{ station.cover }}
                              alt={{ station.name }}
                              class="w-full h-full object-cover"
                            />
                            {station.status !== 'open' && (
                              <view class="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <text class="text-white text-xs">
                                  {station.status === 'closed' ? '暂停营业' : '装修中'}
                                </text>
                              </view>
                            )}
                          </view>
    
                          <!--   -->
                          <view class="flex-1 p-3 flex flex-col">
                            <view class="flex items-start justify-between gap-2">
                              <view class="flex-1 min-w-0">
                                <view class="flex items-center gap-2">
                                  <text class="font-medium text-sm line-clamp-1">{{ station.name }}</text>
                                  <Badge variant="outline" class="text-xs flex-shrink-0">
                                    {{ getStationTypeLabel(station.type) }}
                                  </Badge>
                                </view>
                                <view class="flex items-center gap-1 mt-1 text-xs text-amber-500">
                                  <Star class="w-3 h-3 fill-current" />
                                  <text>{{ station.rating }}</text>
                                  <text class="text-muted-foreground">({{ station.reviewCount }}评价)</text>
                                </view>
                              </view>
                              <view class="v0-btn"
                                @click={(e) => handleToggleFavorite(station.id, e)}
                                class="p-1"
                              >
                                <Heart
                                  class={cn(
                                    "w-5 h-5",
                                    station.isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                  )}
                                />
                              </view>
                            </view>
    
                            <text class="text-xs text-muted-foreground mt-1 line-clamp-1 flex items-center gap-1">
                              <MapPin class="w-3 h-3 flex-shrink-0" />
                              {{ station.address }}
                            </text>
    
                            <!--   -->
                            <view class="flex items-center gap-2 mt-2">
                              {station.facilities.slice(0, 4).map((f) => (
                                <text key={f} class="text-muted-foreground" title={{ f }}>
                                  {{ facilityIcons[f] }}
                                </text>
                              ))}
                              {station.facilities.length > 4 && (
                                <text class="text-xs text-muted-foreground">
                                  +{{ station.facilities.length - 4 }}
                                </text>
                              )}
                            </view>
    
                            <!--   -->
                            <view class="flex items-center justify-between mt-auto pt-2">
                              {station.distance && (
                                <text class="text-xs text-primary">
                                  {{ formatDistance(station.distance) }}
                                </text>
                              )}
                              <view class="v0-btn"
                                @click={(e) => handleNavigate(station, e)}
                                class="flex items-center gap-1 text-xs text-primary"
                              >
                                <Navigation class="w-3 h-3" />
                                导航
                              </view>
                            </view>
                          </view>
                        </view>
                      </Card>
                    </Link>
                  ))}
                </view>
              )}
            </view>
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
const stationTypes: { value: StationType | 'all'; label: string }[] = [
const facilityIcons: Record<string, React.ReactNode> = {

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