<template>
  <view class="c1-page">
    <!-- 自定义导航栏（宣纸白·发现驿站） -->
    <view class="c1-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="c1-nav-row">
        <view class="c1-nav-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#2C2C2C" />
        </view>
        <text class="c1-nav-title serif">发现驿站</text>
        <view class="c1-nav-btn" />
      </view>

      <!-- 城市选择 + 搜索 -->
      <view class="c1-filter">
        <view class="c1-city" @tap="showCityPicker">
          <app-icon name="map-pin" :size="13" color="#C41E3A" />
          <text class="c1-city-text">{{ selectedCity }}</text>
          <app-icon name="chevron-down" :size="11" color="#999" />
        </view>
        <view class="c1-search">
          <app-icon name="search" :size="14" color="#bbb" />
          <input
            v-model="keyword"
            class="c1-search-input"
            placeholder="搜索驿站名称 / 地区"
            placeholder-class="c1-ph"
            confirm-type="search"
          />
          <view v-if="keyword" class="c1-search-clear" @tap="keyword = ''">
            <app-icon name="x" :size="13" color="#bbb" />
          </view>
        </view>
      </view>

      <!-- 类型筛选条（后端真有 type·替代原型虚构的距离/热度排序） -->
      <scroll-view scroll-x class="c1-types" :show-scrollbar="false">
        <view
          v-for="t in stationTypeFilters"
          :key="t.value"
          class="c1-pill"
          :class="{ on: selectedType === t.value }"
          @tap="selectedType = t.value"
        >
          {{ t.label }}
        </view>
      </scroll-view>
    </view>

    <scroll-view scroll-y class="c1-body">
      <!-- 加载态：骨架屏 3 张卡片占位 -->
      <view v-if="loading" class="c1-page-pad">
        <view v-for="i in 3" :key="i" class="c1-skeleton">
          <view class="c1-sk-img" />
          <view class="c1-sk-info">
            <view class="c1-sk-line w60" />
            <view class="c1-sk-line w80" />
            <view class="c1-sk-line w40" />
          </view>
        </view>
      </view>

      <!-- 错误态 -->
      <view v-else-if="errMsg" class="c1-state">
        <app-icon name="alert-circle" :size="48" color="#d3c9b6" />
        <text class="c1-state-text">{{ errMsg }}</text>
        <view class="c1-retry" @tap="load"><text class="c1-retry-text">重试</text></view>
      </view>

      <!-- 空态：该地区暂无驿站 -->
      <view v-else-if="filteredStations.length === 0" class="c1-empty">
        <app-icon name="map-pin" :size="72" color="#d3c9b6" />
        <text class="c1-empty-title serif">该地区暂无驿站</text>
        <text class="c1-empty-sub">当前城市 / 搜索条件下没有找到线下驿站{{ '\n' }}试试切换城市或清空筛选</text>
        <view class="c1-empty-btns">
          <view class="c1-btn o" @tap="showCityPicker">
            <text class="c1-btn-text o">切换城市</text>
          </view>
          <view v-if="hasFilter" class="c1-btn" @tap="clearFilter">
            <text class="c1-btn-text">清空筛选</text>
          </view>
        </view>
      </view>

      <!-- 列表内容 -->
      <view v-else class="c1-page-pad">
        <view class="c1-sec">
          <view class="c1-sec-l">
            <view class="c1-dot" />
            <text class="c1-sec-title serif">{{ keyword ? '搜索结果' : '全部驿站' }}</text>
          </view>
          <text class="c1-sec-count">共 {{ filteredStations.length }} 家</text>
        </view>

        <view class="c1-list">
          <view
            v-for="s in filteredStations"
            :key="s.id"
            class="c1-card"
            @tap="goDetail(s.id)"
          >
            <!-- 环境图 16:9·有 cover/images → 真图；无 → smart-cover 书法水印雅致兜底（取代虚线灰框） -->
            <view class="c1-card-img">
              <view class="c1-card-cover">
                <smart-cover
                  :src="stationCover(s)"
                  :title="s.name"
                  type="default"
                  deco
                />
              </view>
              <view v-if="s.status !== 'ACTIVE'" class="c1-card-mask">
                <text class="c1-card-mask-text">{{ stationStatusLabel[s.status] || '筹备中' }}</text>
              </view>
            </view>

            <view class="c1-card-body">
              <view class="c1-card-titlerow">
                <text class="c1-card-name serif">{{ s.name }}</text>
                <text v-if="s.type" class="c1-card-type">{{ getStationTypeLabel(s.type) }}</text>
              </view>

              <view class="c1-card-addr">
                <app-icon name="map-pin" :size="12" color="#9ca3af" />
                <text class="c1-card-addr-text">{{ s.city }} · {{ s.address }}</text>
              </view>

              <view v-if="s.tags && s.tags.length" class="c1-card-tags">
                <text v-for="t in s.tags.slice(0, 3)" :key="t" class="c1-tag">{{ t }}</text>
              </view>

              <view class="c1-card-bottom">
                <view v-if="s.facilities && s.facilities.length" class="c1-facilities">
                  <app-icon
                    v-for="f in s.facilities.slice(0, 4)"
                    :key="f"
                    :name="getFacilityInfo(f).icon"
                    :size="14"
                    color="#b0a89c"
                  />
                  <text v-if="s.facilities.length > 4" class="c1-fac-more">+{{ s.facilities.length - 4 }}</text>
                </view>
                <text class="c1-course-cnt">{{ s._count?.courses ?? 0 }} 门课程 ›</text>
              </view>
            </view>
          </view>
        </view>

        <text class="c1-end">— 已加载全部 —</text>
      </view>
      <view class="c1-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  offlineApi,
  stationTypeFilters,
  getStationTypeLabel,
  getFacilityInfo,
  stationStatusLabel,
  type Station,
  type StationType,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const all = ref<Station[]>([])
const selectedType = ref<StationType | 'all'>('all')
const selectedCity = ref('全部')
const keyword = ref('')

// 环境图取值：优先 cover，回退 images 首张，无 → 空串走占位
function stationCover(s: Station): string {
  return s.cover || (s.images && s.images.length ? s.images[0] : '') || ''
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    // 城市在服务端过滤（后端 discover 支持 city 参数），关键词客户端二次过滤更跟手
    all.value = await offlineApi.discoverStations({
      city: selectedCity.value === '全部' ? undefined : selectedCity.value,
    })
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

// 可选城市列表：由已返回驿站的 city 去重派生（后端无独立城市字典）
const cityOptions = computed(() => {
  const set = new Set<string>()
  all.value.forEach((s) => { if (s.city) set.add(s.city) })
  return ['全部', ...Array.from(set)]
})

const hasFilter = computed(
  () => !!keyword.value || selectedType.value !== 'all' || selectedCity.value !== '全部'
)

const filteredStations = computed(() => {
  let list = all.value
  if (selectedType.value !== 'all') list = list.filter((s) => s.type === selectedType.value)
  if (selectedCity.value !== '全部') list = list.filter((s) => s.city === selectedCity.value)
  const kw = keyword.value.trim()
  if (kw) {
    list = list.filter(
      (s) => s.name.includes(kw) || (s.address || '').includes(kw) || (s.city || '').includes(kw)
    )
  }
  return list
})

function showCityPicker() {
  const opts = cityOptions.value
  if (opts.length <= 1) {
    uni.showToast({ title: '暂无更多城市', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: opts,
    success: (res) => {
      const city = opts[res.tapIndex]
      if (city === selectedCity.value) return
      selectedCity.value = city
      load()
    },
  })
}

function clearFilter() {
  keyword.value = ''
  selectedType.value = 'all'
  if (selectedCity.value !== '全部') {
    selectedCity.value = '全部'
    load()
  }
}

function goDetail(id: string) {
  navigateTo(`/offline/stations/${id}`)
}
</script>

<style lang="scss" scoped>
.c1-page {
  height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.serif {
  font-family: 'Songti SC', 'STSong', serif;
}

/* ===== 导航栏 ===== */
.c1-nav {
  background: #faf8f5;
  border-bottom: 1px solid #efeae3;
  flex-shrink: 0;
}
.c1-nav-row {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.c1-nav-btn {
  position: absolute;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.c1-nav-btn:first-child {
  left: 6px;
  width: 40px;
}
.c1-nav-title {
  font-size: 17px;
  font-weight: 700;
  color: #2c2c2c;
  letter-spacing: 0.02em;
}
.c1-nav-view {
  right: 14px;
  gap: 4px;
}
.c1-nav-view-text {
  font-size: 13px;
  color: #6e6e73;
}

/* ===== 城市 + 搜索 ===== */
.c1-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 20px 12px;
}
.c1-city {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #efeae3;
  border-radius: 999px;
  background: #fff;
  flex-shrink: 0;
}
.c1-city-text {
  font-size: 13px;
  color: #2c2c2c;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c1-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #efeae3;
  border-radius: 999px;
  background: #fff;
  min-width: 0;
}
.c1-search-input {
  flex: 1;
  height: 36px;
  font-size: 13px;
  color: #2c2c2c;
  min-width: 0;
}
.c1-ph {
  color: #999;
}
.c1-search-clear {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 类型筛选 ===== */
.c1-types {
  white-space: nowrap;
  padding: 0 20px 12px;
}
.c1-pill {
  display: inline-block;
  padding: 6px 15px;
  margin-right: 8px;
  font-size: 12.5px;
  color: #6e6e73;
  background: #fff;
  border: 1px solid #efeae3;
  border-radius: 999px;
}
.c1-pill.on {
  color: #fff;
  background: #c41e3a;
  border-color: #c41e3a;
}

/* ===== 列表容器 ===== */
.c1-body {
  flex: 1;
  height: 0;
  min-height: 0;
}
.c1-page-pad {
  padding: 14px 20px 0;
}

/* 骨架屏 */
.c1-skeleton {
  background: #fff;
  border-radius: 18px;
  padding: 12px;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(60, 40, 20, 0.05);
}
.c1-sk-img {
  width: 100%;
  padding-top: 56.25%;
  border-radius: 12px;
  background: #f0ece5;
  animation: c1shimmer 1.2s ease-in-out infinite;
}
.c1-sk-info {
  margin-top: 12px;
}
.c1-sk-line {
  height: 12px;
  border-radius: 6px;
  background: #f0ece5;
  margin-bottom: 8px;
  animation: c1shimmer 1.2s ease-in-out infinite;
}
.c1-sk-line.w60 { width: 60%; }
.c1-sk-line.w80 { width: 80%; }
.c1-sk-line.w40 { width: 40%; }
@keyframes c1shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 错误态 */
.c1-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 90px 40px 0;
}
.c1-state-text {
  font-size: 13px;
  color: #6e6e73;
}
.c1-retry {
  margin-top: 2px;
  padding: 8px 22px;
  border: 1px solid #c41e3a;
  border-radius: 999px;
}
.c1-retry-text {
  font-size: 13px;
  color: #c41e3a;
}

/* 空态 */
.c1-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 90px 30px 0;
}
.c1-empty-title {
  font-size: 18px;
  font-weight: 700;
  color: #2c2c2c;
  margin-top: 20px;
}
.c1-empty-sub {
  font-size: 13px;
  color: #6e6e73;
  line-height: 1.7;
  text-align: center;
  margin-top: 10px;
}
.c1-empty-btns {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}
.c1-btn {
  padding: 9px 22px;
  border-radius: 999px;
  background: #c41e3a;
}
.c1-btn.o {
  background: #fff;
  border: 1px solid #c41e3a;
}
.c1-btn-text {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}
.c1-btn-text.o {
  color: #c41e3a;
}

/* ===== 区块标题 ===== */
.c1-sec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.c1-sec-l {
  display: flex;
  align-items: center;
  gap: 8px;
}
.c1-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c9a96e;
}
.c1-sec-title {
  font-size: 18px;
  font-weight: 700;
  color: #2c2c2c;
  letter-spacing: 0.02em;
}
.c1-sec-count {
  font-size: 11px;
  color: #999;
}

/* ===== 驿站卡 ===== */
.c1-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.c1-card {
  background: #fff;
  border-radius: 18px;
  padding: 12px;
  box-shadow: 0 2px 10px rgba(60, 40, 20, 0.05);
}
.c1-card-img {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  border-radius: 12px;
  overflow: hidden;
  background: #f0ece5;
}
.c1-card-img-real {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* smart-cover 填充绝对定位包裹（父 padding-top 撑 16:9，内容高度为 0，需绝对填充） */
.c1-card-cover {
  position: absolute;
  inset: 0;
}
.c1-card-img-ph {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed #d8ccb6;
  border-radius: 12px;
}
.c1-card-img-tip {
  font-size: 11px;
  color: #b0a89c;
}
.c1-card-mask {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 9px;
  background: rgba(44, 44, 44, 0.62);
  border-radius: 6px;
}
.c1-card-mask-text {
  font-size: 11px;
  color: #fff;
}
.c1-card-body {
  padding-top: 11px;
}
.c1-card-titlerow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.c1-card-name {
  font-size: 16px;
  font-weight: 700;
  color: #2c2c2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}
.c1-card-type {
  flex-shrink: 0;
  padding: 2px 7px;
  font-size: 10px;
  color: #a5843f;
  background: rgba(201, 169, 110, 0.14);
  border-radius: 6px;
}
.c1-card-addr {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 7px;
}
.c1-card-addr-text {
  font-size: 12px;
  color: #6e6e73;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c1-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.c1-tag {
  font-size: 10.5px;
  padding: 2px 8px;
  color: #6e6e73;
  background: #f6f2ec;
  border-radius: 6px;
}
.c1-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f2eee7;
}
.c1-facilities {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.c1-fac-more {
  font-size: 11px;
  color: #b0a89c;
}
.c1-course-cnt {
  font-size: 12px;
  color: #c41e3a;
  font-weight: 600;
  flex-shrink: 0;
}

.c1-end {
  display: block;
  text-align: center;
  font-size: 11px;
  color: #b0a89c;
  padding: 18px 0 4px;
}
.c1-safe {
  height: 30px;
}
</style>
