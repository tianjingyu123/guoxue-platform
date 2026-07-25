<template>
  <view class="video-search-page">
    <!-- 顶部搜索栏：白底胶囊 + 描边 + 取消返回上一页 -->
    <view class="vs-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vs-header-row">
        <view class="vs-input-wrap" :class="{ filled: query }">
          <AppIcon name="search" :size="30" color="#999999" :stroke-width="2" />
          <input
            class="vs-input"
            type="text"
            placeholder="搜索短视频"
            placeholder-class="vs-input-ph"
            v-model="query"
            :focus="true"
            confirm-type="search"
            @input="onInput"
            @confirm="doSearch(query)"
          />
          <view v-if="query" class="vs-clear" hover-class="vs-tap" @tap="clearQuery">
            <AppIcon name="x" :size="20" color="#FFFFFF" :stroke-width="2.6" />
          </view>
        </view>
        <text class="vs-cancel" hover-class="vs-tap" @tap="goBack">取消</text>
      </view>
    </view>

    <view class="vs-body">
      <!-- ===== 未输入态：热门搜索 + 历史搜索 ===== -->
      <block v-if="!searched">
        <!-- 热门搜索（真连 /search/hot；前 3 名朱红序号 + 火苗） -->
        <block v-if="hotKeywords.length > 0">
          <view class="vs-sec">
            <text class="vs-sec-title">热门搜索</text>
          </view>
          <view class="vs-tags">
            <view
              v-for="(kw, i) in hotKeywords"
              :key="kw"
              class="vs-tag"
              hover-class="vs-tap"
              @tap="doSearch(kw)"
            >
              <text class="vs-tag-rank" :class="{ plain: i >= 3 }">{{ i + 1 }}</text>
              <text class="vs-tag-txt">{{ kw }}</text>
              <AppIcon v-if="i < 3" name="flame" :size="22" color="#C41E3A" :fill="true" />
            </view>
          </view>
        </block>

        <!-- 历史搜索（本地存储，可清空；无历史整块隐藏） -->
        <block v-if="history.length > 0">
          <view class="vs-sec">
            <text class="vs-sec-title">历史搜索</text>
            <view class="vs-sec-op" hover-class="vs-tap" @tap="clearHistory">
              <AppIcon name="history" :size="24" color="#999999" :stroke-width="2" />
              <text class="vs-sec-op-txt">清空</text>
            </view>
          </view>
          <view class="vs-tags">
            <view
              v-for="h in history"
              :key="h"
              class="vs-tag vs-tag-history"
              hover-class="vs-tap"
              @tap="doSearch(h)"
            >
              <text class="vs-tag-txt vs-tag-txt-history">{{ h }}</text>
            </view>
          </view>
        </block>
      </block>

      <!-- ===== 已搜索态 ===== -->
      <block v-else>
        <!-- 骨架态：搜索请求中（双列错位微光） -->
        <view v-if="loading" class="vs-feed">
          <view class="vs-col">
            <view class="vs-sk vs-sk-cover" style="padding-bottom: 133.33%" />
            <view class="vs-sk vs-sk-line" style="width: 90%" />
            <view class="vs-sk vs-sk-cover" style="padding-bottom: 177.78%" />
          </view>
          <view class="vs-col">
            <view class="vs-sk vs-sk-cover" style="padding-bottom: 177.78%" />
            <view class="vs-sk vs-sk-line" style="width: 70%" />
            <view class="vs-sk vs-sk-cover" style="padding-bottom: 133.33%" />
          </view>
        </view>

        <!-- 错误态 -->
        <view v-else-if="error" class="vs-empty">
          <AppIcon name="video" :size="120" color="#D8D0C4" />
          <text class="vs-empty-msg">{{ error }}</text>
          <view class="vs-ghost-btn" hover-class="vs-tap" @tap="retry"><text class="vs-ghost-txt">重试</text></view>
        </view>

        <!-- 结果态：双列瀑布卡（复用 V1 卡样式） -->
        <template v-else-if="results.length > 0">
          <view class="vs-feed">
            <view class="vs-col">
              <view
                v-for="(video, i) in resultLeft"
                :key="video.id"
                class="vs-card"
                hover-class="vs-card-hover"
                :hover-stay-time="120"
                @tap="goDetail(video.id)"
              >
                <view class="vs-cover" :style="{ paddingBottom: ratioByIndex(i * 2) }">
                  <smart-cover class="vs-cover-img" :src="video.cover" :video-url="video.videoUrl" :title="video.title" type="video" />
                  <view class="vs-cover-shade" />
                  <view class="vs-plays">
                    <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
                    <text class="vs-plays-txt num">{{ formatNum(video.views) }}</text>
                  </view>
                </view>
                <view class="vs-info">
                  <text class="vs-card-title">{{ video.title }}</text>
                  <view class="vs-author">
                    <image lazy-load class="vs-avatar" :src="video.authorAvatar" mode="aspectFill" />
                    <text class="vs-author-name">{{ video.author }}</text>
                    <text class="vs-card-dur num">{{ video.duration }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="vs-col">
              <view
                v-for="(video, i) in resultRight"
                :key="video.id"
                class="vs-card"
                hover-class="vs-card-hover"
                :hover-stay-time="120"
                @tap="goDetail(video.id)"
              >
                <view class="vs-cover" :style="{ paddingBottom: ratioByIndex(i * 2 + 1) }">
                  <smart-cover class="vs-cover-img" :src="video.cover" :video-url="video.videoUrl" :title="video.title" type="video" />
                  <view class="vs-cover-shade" />
                  <view class="vs-plays">
                    <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
                    <text class="vs-plays-txt num">{{ formatNum(video.views) }}</text>
                  </view>
                </view>
                <view class="vs-info">
                  <text class="vs-card-title">{{ video.title }}</text>
                  <view class="vs-author">
                    <image lazy-load class="vs-avatar" :src="video.authorAvatar" mode="aspectFill" />
                    <text class="vs-author-name">{{ video.author }}</text>
                    <text class="vs-card-dur num">{{ video.duration }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 空结果态：水墨留白空态 + 大家都在看（真连热门兜底） -->
        <template v-else>
          <view class="vs-empty">
            <AppIcon name="video" :size="120" color="#D8D0C4" />
            <text class="vs-empty-msg">没有找到相关视频，换个词试试</text>
          </view>
          <block v-if="hotVideos.length > 0">
            <view class="vs-sec">
              <text class="vs-sec-title">大家都在看</text>
            </view>
            <view class="vs-feed">
              <view class="vs-col">
                <view
                  v-for="(video, i) in hotLeft"
                  :key="video.id"
                  class="vs-card"
                  hover-class="vs-card-hover"
                  :hover-stay-time="120"
                  @tap="goDetail(video.id)"
                >
                  <view class="vs-cover" :style="{ paddingBottom: ratioByIndex(i * 2) }">
                    <smart-cover class="vs-cover-img" :src="video.coverUrl" :video-url="video.videoUrl" :title="video.title" type="video" />
                    <view class="vs-cover-shade" />
                    <view class="vs-plays">
                      <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
                      <text class="vs-plays-txt num">{{ formatNum(video.plays) }}</text>
                    </view>
                  </view>
                  <view class="vs-info">
                    <text class="vs-card-title">{{ video.title }}</text>
                    <view class="vs-author">
                      <image lazy-load class="vs-avatar" :src="video.author.avatar" mode="aspectFill" />
                      <text class="vs-author-name">{{ video.author.name }}</text>
                      <view class="vs-likes">
                        <AppIcon name="heart" :size="22" color="#999999" :stroke-width="1.6" />
                        <text class="vs-likes-txt num">{{ formatNum(video.likes) }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
              <view class="vs-col">
                <view
                  v-for="(video, i) in hotRight"
                  :key="video.id"
                  class="vs-card"
                  hover-class="vs-card-hover"
                  :hover-stay-time="120"
                  @tap="goDetail(video.id)"
                >
                  <view class="vs-cover" :style="{ paddingBottom: ratioByIndex(i * 2 + 1) }">
                    <smart-cover class="vs-cover-img" :src="video.coverUrl" :video-url="video.videoUrl" :title="video.title" type="video" />
                    <view class="vs-cover-shade" />
                    <view class="vs-plays">
                      <AppIcon name="play" :size="20" color="#ffffff" :fill="true" />
                      <text class="vs-plays-txt num">{{ formatNum(video.plays) }}</text>
                    </view>
                  </view>
                  <view class="vs-info">
                    <text class="vs-card-title">{{ video.title }}</text>
                    <view class="vs-author">
                      <image lazy-load class="vs-avatar" :src="video.author.avatar" mode="aspectFill" />
                      <text class="vs-author-name">{{ video.author.name }}</text>
                      <view class="vs-likes">
                        <AppIcon name="heart" :size="22" color="#999999" :stroke-width="1.6" />
                        <text class="vs-likes-txt num">{{ formatNum(video.likes) }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </block>
        </template>
      </block>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateTo } from '@/utils/router'
import { videoApi, videoFallbackKeywords, fetchVideoHotKeywords, formatVideoNumber, type VideoSearchResult, type VideoListItem } from '@/lib/video-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 0 } })

const HISTORY_KEY = 'video_search_history'
const query = ref('')
const searched = ref(false)
const loading = ref(false)
const error = ref('')
const results = ref<VideoSearchResult[]>([])
// 真连 /search/hot（全站真实热搜），失败/空回退视频语境引导词
const hotKeywords = ref<string[]>(videoFallbackKeywords)
onMounted(async () => { hotKeywords.value = await fetchVideoHotKeywords() })

// 搜索历史持久化（uni.storage）
const history = ref<string[]>((() => {
  try { return (uni.getStorageSync(HISTORY_KEY) as string[]) || [] } catch { return [] }
})())
function saveHistory() {
  try { uni.setStorageSync(HISTORY_KEY, history.value) } catch { /* ignore */ }
}

function onInput() {
  searched.value = false
}
function clearQuery() {
  query.value = ''
  searched.value = false
  results.value = []
}
// 真连搜索 GET /videos/search?keyword=（三态）
async function doSearch(q: string) {
  if (!q.trim()) return
  query.value = q
  searched.value = true
  loading.value = true
  error.value = ''
  try {
    results.value = await videoApi.search({ keyword: q.trim() })
    // 无结果：拉热门兜底「大家都在看」，避免死胡同
    if (results.value.length === 0) loadHotVideos()
  } catch (e) {
    error.value = (e as Error)?.message || '搜索失败，请重试'
    results.value = []
  } finally {
    loading.value = false
  }
  if (!history.value.includes(q)) {
    history.value = [q, ...history.value].slice(0, 10)
    saveHistory()
  }
}
function retry() { if (query.value) doSearch(query.value) }
function clearHistory() {
  history.value = []
  saveHistory()
}

const formatNum = formatVideoNumber

// 空结果态兜底「大家都在看」：真连 GET /videos/items?sort=hot 取前 4 条热门（不造假）
const hotVideos = ref<VideoListItem[]>([])
async function loadHotVideos() {
  if (hotVideos.value.length > 0) return
  try {
    hotVideos.value = (await videoApi.listItems({ sort: 'hot' })).slice(0, 4)
  } catch { /* 兜底推荐失败则不显示，不阻断空结果提示 */ }
}
// 结果卡双列瀑布：按顺序前半 / 后半（与 V1 列表页一致）
const resultHalf = computed(() => Math.ceil(results.value.length / 2))
const resultLeft = computed(() => results.value.slice(0, resultHalf.value))
const resultRight = computed(() => results.value.slice(resultHalf.value))
// 推荐卡双列
const hotHalf = computed(() => Math.ceil(hotVideos.value.length / 2))
const hotLeft = computed(() => hotVideos.value.slice(0, hotHalf.value))
const hotRight = computed(() => hotVideos.value.slice(hotHalf.value))
// 封面比例：照搬 V1 index%3 的 3/4、9/16、5/4 交替（撑 padding-top）
function ratioByIndex(i: number): string {
  const r = i % 3 === 0 ? 4 / 3 : i % 3 === 1 ? 16 / 9 : 5 / 4
  return r * 100 + '%'
}
function goBack() {
  uni.navigateBack({ fail: () => navigateTo('/videos') })
}
function goDetail(id: string) {
  // 原型跳 /videos/:id(549版未迁)，改跳已迁的 /video/:id(812版全屏播放，功能等价)
  navigateTo(`/video/${id}`)
}
</script>

<style scoped>
/* 视觉 token：宣纸白 #FAF8F5 页底 / 卡片白 / 朱红 #C41E3A / 文字 #2C2C2C·#6E6E73·#999 / 圆角 36·999 */
.video-search-page {
  min-height: 100vh;
  background-color: #FAF8F5;
}
.num { font-variant-numeric: tabular-nums; }
.vs-tap { opacity: 0.6; }

/* 顶部搜索栏：白胶囊 + 描边 + 取消 */
.vs-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: #FAF8F5;
}
.vs-header-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 40rpx 20rpx;
}
.vs-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background-color: #FFFFFF;
  border: 1rpx solid #EDE7DD;
}
.vs-input { flex: 1; font-size: 26rpx; color: #999999; }
.vs-input-wrap.filled .vs-input { color: #2C2C2C; }
.vs-input-ph { color: #999999; }
.vs-clear {
  flex-shrink: 0;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background-color: #E5E0D8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vs-cancel { font-size: 28rpx; color: #6E6E73; flex-shrink: 0; }

.vs-body { padding-bottom: 60rpx; }

/* 分区标题 */
.vs-sec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 40rpx 20rpx;
}
.vs-sec-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.vs-sec-op { display: flex; align-items: center; gap: 8rpx; }
.vs-sec-op-txt { font-size: 24rpx; color: #999999; }

/* 标签云胶囊：白底描边；前 3 名朱红序号 + 火苗 */
.vs-tags { display: flex; flex-wrap: wrap; gap: 20rpx; padding: 0 40rpx; }
.vs-tag {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background-color: #FFFFFF;
  border: 1rpx solid #EDE7DD;
}
.vs-tag-rank { font-size: 24rpx; font-weight: 700; color: #C41E3A; }
.vs-tag-rank.plain { color: #999999; font-weight: 400; }
.vs-tag-txt { font-size: 26rpx; color: #2C2C2C; }
.vs-tag-history { }
.vs-tag-txt-history { color: #6E6E73; }

/* 空 / 错误态：水墨留白 */
.vs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 120rpx 80rpx 40rpx;
}
.vs-empty-msg { font-size: 28rpx; color: #6E6E73; text-align: center; }
.vs-ghost-btn {
  margin-top: 8rpx;
  width: 300rpx;
  height: 84rpx;
  border-radius: 999rpx;
  border: 1rpx solid #E5DED2;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vs-ghost-txt { font-size: 28rpx; color: #2C2C2C; }

/* 双列瀑布卡流（复用 V1 卡样式） */
.vs-feed { display: flex; gap: 20rpx; padding: 20rpx 40rpx; }
.vs-col { flex: 1; display: flex; flex-direction: column; gap: 20rpx; min-width: 0; }
.vs-card {
  background-color: #FFFFFF;
  border-radius: 36rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(44, 44, 44, 0.05);
}
.vs-card-hover { transform: scale(0.97); transition: transform 0.12s; }
.vs-cover { position: relative; width: 100%; height: 0; overflow: hidden; }
.vs-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.vs-cover-shade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 88rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.45) 100%);
}
.vs-plays {
  position: absolute;
  left: 16rpx;
  bottom: 14rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.vs-plays-txt { font-size: 22rpx; color: #FFFFFF; }

.vs-info { padding: 18rpx 20rpx 20rpx; display: flex; flex-direction: column; gap: 14rpx; }
.vs-card-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.45;
}
.vs-author { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.vs-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0; background-color: #E5E5E5; }
.vs-author-name {
  font-size: 22rpx;
  color: #6E6E73;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vs-card-dur { margin-left: auto; font-size: 22rpx; color: #999999; flex-shrink: 0; }
.vs-likes { margin-left: auto; display: flex; align-items: center; gap: 6rpx; flex-shrink: 0; }
.vs-likes-txt { font-size: 22rpx; color: #999999; }

/* 骨架态：与 V1 同一套微光 */
.vs-sk {
  border-radius: 36rpx;
  background: linear-gradient(90deg, #EFEBE4 25%, #F7F4EF 37%, #EFEBE4 63%);
  background-size: 400% 100%;
  animation: vs-shimmer 1.4s ease infinite;
}
.vs-sk-cover { width: 100%; height: 0; }
.vs-sk-line { height: 28rpx; border-radius: 8rpx; }
@keyframes vs-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
