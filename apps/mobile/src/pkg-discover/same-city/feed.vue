<script setup lang="ts">
import { onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import RecommendSection from '@/components/common/recommend-section.vue'
import { useSameCity } from '@/composables/use-same-city'
import { goBack, navigateTo } from '@/utils/router'
import { getMiniProgramMenuSafeRight } from '@/utils/mini-program-menu'

const statusBarHeight = (() => {
  try { return uni.getSystemInfoSync().statusBarHeight || 0 } catch { return 0 }
})()
const menuSafeRight = getMiniProgramMenuSafeRight()
const { cities, city, directoryLoading, directoryError, stations, recommendations, loading,
  stationError, recommendationError, loadingMore, moreError, hasMore,
  loadDirectory, loadCity, selectCity, loadMore, dispose } = useSameCity()
onLoad(() => loadDirectory())
onUnmounted(dispose)
function changeCity(event: { detail: { value: string | number } }) {
  const value = cities.value[Number(event.detail.value)]
  if (value) void selectCity(value)
}
</script>

<template>
  <view class="city-page">
    <view
      class="city-nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="nav-row"
        :style="{ paddingRight: Math.max(12, menuSafeRight) + 'px' }"
      >
        <view
          class="nav-action"
          role="button"
          aria-label="返回上一页"
          tabindex="0"
          @tap="goBack"
          @keydown.enter="goBack"
        >
          <app-icon
            name="chevron-left"
            :size="22"
            color="#2f2925"
          />
        </view>
        <text class="nav-title">
          同城发现
        </text>
      </view>
    </view>
    <scroll-view
      scroll-y
      class="city-scroll"
      @scrolltolower="loadMore"
    >
      <view class="city-content">
        <view class="city-heading">
          <text class="city-kicker">
            在你选择的城市
          </text>
          <text class="city-title">
            相遇，从身边开始
          </text>
          <text class="city-note">
            手动选城即可浏览，无需提供精确位置。
          </text>
        </view>
        <view
          v-if="directoryLoading"
          class="state"
          role="status"
        >
          正在读取城市目录…
        </view>
        <view
          v-else-if="directoryError"
          class="state"
        >
          <text>城市目录暂时无法加载</text>
          <button
            class="secondary"
            @tap="loadDirectory"
          >
            重新加载
          </button>
        </view>
        <view
          v-else-if="!cities.length"
          class="state"
        >
          <app-icon
            name="map-pin"
            :size="38"
            color="#9a8d7b"
          />
          <text class="state-title">
            暂时没有开放的同城驿站
          </text>
          <text class="city-note">
            城市接入后会展示在这里，你仍可浏览平台内容。
          </text>
          <button
            class="secondary"
            @tap="loadDirectory"
          >
            刷新城市目录
          </button>
        </view>
        <template v-else>
          <picker
            :range="cities"
            :value="Math.max(0, cities.indexOf(city))"
            @change="changeCity"
          >
            <view
              class="city-picker"
              role="button"
              :aria-label="city ? '切换城市，当前' + city : '选择城市'"
            >
              <app-icon
                name="map-pin"
                :size="18"
                color="#a5162e"
              />
              <text class="city-picker-text">
                {{ city || '选择你想逛的城市' }}
              </text>
              <text class="city-picker-hint">
                {{ city ? '换城' : '选城' }}
              </text>
              <app-icon
                name="chevron-down"
                :size="16"
                color="#73685e"
              />
            </view>
          </picker>
          <view
            v-if="!city"
            class="state"
          >
            <text>选好城市，再看看身边有什么。</text>
          </view>
          <view
            v-else-if="loading"
            class="state"
            role="status"
          >
            正在寻找{{ city }}的真实内容…
          </view>
          <template v-else>
            <view class="section-heading">
              <text class="section-title">
                当地驿站
              </text>
              <button
                class="refresh"
                aria-label="刷新当前城市"
                @tap="loadCity"
              >
                刷新
              </button>
            </view>
            <view
              v-if="stationError"
              class="state compact"
            >
              <text>驿站加载失败，请重试</text>
              <button
                class="secondary"
                @tap="loadCity"
              >
                重新加载
              </button>
            </view>
            <view
              v-else-if="!stations.length"
              class="state compact"
            >
              {{ city }}暂时没有可浏览的驿站
            </view>
            <view
              v-else
              class="station-list"
            >
              <view
                v-for="station in stations"
                :key="station.id"
                class="station-card"
                role="button"
                :aria-label="'查看' + station.name"
                tabindex="0"
                @tap="navigateTo('/offline/stations/' + station.id)"
                @keydown.enter="navigateTo('/offline/stations/' + station.id)"
              >
                <view class="station-cover">
                  <smart-cover
                    :src="station.cover || station.images?.[0] || ''"
                    :title="station.name"
                    type="default"
                  />
                </view>
                <view class="station-copy">
                  <text class="station-name">
                    {{ station.name }}
                  </text>
                  <text class="station-address">
                    {{ station.city }} · {{ station.address }}
                  </text>
                  <text class="station-link">
                    查看驿站与线下服务 →
                  </text>
                </view>
              </view>
            </view>
            <button
              v-if="moreError"
              class="secondary load-more"
              @tap="loadMore"
            >
              加载更多失败，点击重试
            </button>
            <button
              v-else-if="hasMore"
              class="secondary load-more"
              :disabled="loadingMore"
              @tap="loadMore"
            >
              {{ loadingMore ? '正在加载…' : '查看更多驿站' }}
            </button>
            <recommend-section
              title="本地关联课程与好物"
              :items="recommendations"
            />
            <view
              v-if="recommendationError"
              class="state compact"
            >
              <text>关联课程与好物暂时无法加载</text>
              <button
                class="secondary"
                @tap="loadCity"
              >
                重试
              </button>
            </view>
            <view
              v-else-if="!recommendations.length"
              class="empty-resources"
            >
              当前城市暂无可展示的关联课程或好物，线下服务请查看驿站详情。
            </view>
          </template>
        </template>
        <view class="national-entry">
          <text class="section-title">
            也看看全国的精彩
          </text>
          <text class="city-note">
            全国内容与当前城市分别展示。
          </text>
          <button
            class="national-button"
            @tap="navigateTo('/discover')"
          >
            去发现内容 <text aria-hidden="true">
              →
            </text>
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.city-page { height: 100vh; display: flex; flex-direction: column; background: #faf8f5; color: #2f2925; }
.city-nav { background: #faf8f5; flex-shrink: 0; border-bottom: 1px solid #eee8df; }
.nav-row { min-height: 52px; display: flex; align-items: center; padding-left: 10px; gap: 8px; }
.nav-action { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; }
.nav-action:active { background: #ede8e0; }
.nav-title { font-size: 17px; font-weight: 700; }
.city-scroll { flex: 1; height: 0; min-height: 0; }
.city-content { max-width: 700px; margin: 0 auto; padding: 24px 20px calc(28px + env(safe-area-inset-bottom)); }
.city-heading { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
.city-kicker { color: #a5162e; font-size: 12px; font-weight: 600; }
.city-title { font-family: 'Songti SC', 'STSong', serif; font-size: 26px; font-weight: 700; }
.city-note { color: #786f65; font-size: 13px; line-height: 1.65; }
.city-picker { min-height: 52px; display: flex; align-items: center; gap: 10px; padding: 0 14px; background: #fff; border: 1px solid #e4d9ca; border-radius: 15px; }
.city-picker-text { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; }
.city-picker-hint { color: #a5162e; font-size: 12px; flex-shrink: 0; }
.state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 40px 12px; color: #71675e; font-size: 14px; text-align: center; line-height: 1.65; }
.state-title { color: #39312b; font-size: 17px; font-weight: 600; }
.compact { padding: 22px 12px; background: #f2eee7; border-radius: 14px; }
button { margin: 0; font-size: 14px; line-height: 1.4; min-height: 44px; display: flex; align-items: center; justify-content: center; }
button::after { border: 0; }
.secondary { color: #a5162e; background: #fff; border: 1px solid #d8ccc0; padding: 10px 20px; border-radius: 22px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin-top: 25px; margin-bottom: 12px; }
.section-title { font-size: 17px; font-weight: 700; }
.refresh { background: transparent; color: #a5162e; min-width: 44px; padding: 8px 0 8px 12px; }
.station-list { display: flex; flex-direction: column; gap: 12px; }
.station-card { display: flex; gap: 14px; padding: 12px; background: #fff; border: 1px solid #ede6dd; border-radius: 16px; }
.station-cover { width: 88px; height: 88px; flex-shrink: 0; border-radius: 10px; overflow: hidden; }
.station-copy { display: flex; flex-direction: column; flex: 1; min-width: 0; justify-content: center; gap: 7px; }
.station-name { font-size: 16px; font-weight: 700; line-height: 1.5; }
.station-address { color: #7c7167; font-size: 12px; line-height: 1.5; }
.station-link { color: #a5162e; font-size: 12px; }
.load-more { margin: 16px auto 22px; }
.empty-resources { font-size: 13px; color: #7a7168; line-height: 1.65; padding: 20px 0; }
.national-entry { border-top: 1px solid #e7ded2; margin-top: 28px; padding-top: 22px; display: flex; flex-direction: column; gap: 9px; }
.national-button { justify-content: space-between; border-radius: 12px; padding: 12px 16px; background: #fff; border: 1px solid #e4d9ca; color: #3d342d; margin-top: 5px; }
</style>
