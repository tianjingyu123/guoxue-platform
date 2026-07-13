<template>
  <view class="c2-page">
    <!-- 自定义导航栏（透明→随滚动渐显，与头图叠放） -->
    <view class="c2-navbar" :style="{ paddingTop: statusBarHeight + 'px', background: navSolid ? 'rgba(250,248,245,0.96)' : 'transparent', borderBottomColor: navSolid ? '#EFEAE3' : 'transparent' }">
      <view class="c2-nav-row">
        <view class="c2-nav-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" :color="navSolid ? '#2C2C2C' : '#fff'" />
        </view>
        <text class="c2-nav-title" :style="{ opacity: navSolid ? 1 : 0 }">{{ station?.name || '驿站详情' }}</text>
        <view class="c2-nav-btn" @tap="onShareTap">
          <app-icon name="share-2" :size="20" :color="navSolid ? '#2C2C2C' : '#fff'" />
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="c2-state">
      <view class="spinner" />
      <text class="c2-state-text">加载中…</text>
    </view>
    <!-- 错误/空态 -->
    <view v-else-if="!station" class="c2-state">
      <app-icon name="map-pin" :size="48" color="#D8CFC0" />
      <text class="c2-state-text">{{ errMsg || '驿站不存在' }}</text>
      <view class="c2-retry" @tap="load"><text class="c2-retry-text">返回重试</text></view>
    </view>

    <template v-else>
      <scroll-view
        scroll-y
        class="c2-body"
        :scroll-into-view="scrollTarget"
        :scroll-with-animation="true"
        scroll-anchoring
        @scroll="onScroll"
      >
        <!-- ===== 头部环境图 16:9（photos 优先→images→cover→虚线占位·多图轮播） ===== -->
        <view id="anchor-top" class="c2-hero">
          <swiper v-if="heroPhotos.length > 1" class="c2-hero-swiper" circular autoplay :interval="4000" :current="heroIndex" @change="onHeroChange">
            <swiper-item v-for="(p, i) in heroPhotos" :key="i">
              <image lazy-load :src="p" class="c2-hero-img" mode="aspectFill" @tap="previewPhoto(i)" />
            </swiper-item>
          </swiper>
          <image v-else-if="heroPhotos.length === 1" lazy-load :src="heroPhotos[0]" class="c2-hero-img" mode="aspectFill" @tap="previewPhoto(0)" />
          <view v-else class="c2-hero-empty"><app-icon name="image" :size="40" color="#C9A96E" /><text class="c2-hero-empty-text">暂无环境图</text></view>
          <view class="c2-hero-mask" />
          <view v-if="heroPhotos.length > 1" class="c2-hero-count">{{ heroIndex + 1 }} / {{ heroPhotos.length }}</view>
        </view>

        <!-- ===== 驿站头信息 ===== -->
        <view class="c2-headinfo">
          <view class="c2-name-row">
            <text class="c2-name serif">{{ station.name }}</text>
            <view v-if="station.status === 'ACTIVE'" class="c2-badge">
              <app-icon name="check-circle" :size="10" color="#C41E3A" />
              <text class="c2-badge-text">营业中</text>
            </view>
            <view v-else class="c2-badge off">
              <text class="c2-badge-text off">{{ stationStatusLabel[station.status] || '筹备中' }}</text>
            </view>
          </view>
          <!-- 评分：仅 getStationHome 返回 rating 时渲染（无则诚实不画） -->
          <view v-if="rating" class="c2-rating">
            <view class="c2-stars">
              <app-icon v-for="s in 5" :key="s" name="star" :size="13" :color="s <= ratingRounded ? '#C9A96E' : '#E5E0D7'" :fill="s <= ratingRounded" />
            </view>
            <text class="c2-rating-avg">{{ rating.avg.toFixed(1) }}</text>
            <text class="c2-rating-count">· {{ rating.count }} 条评价</text>
          </view>
          <text v-if="oneLiner" class="c2-oneliner">{{ oneLiner }}</text>
          <text v-if="businessHoursText" class="c2-hours">营业时间 {{ businessHoursText }}</text>
        </view>

        <!-- ===== 锚点 Tab（scroll 监听 + 固定定位·不用 sticky/X5 不稳） ===== -->
        <view class="c2-tabs" :style="{ top: navHeight + 'px' }">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="c2-tab"
            :class="{ on: activeTab === tab.key }"
            @tap="jumpTo(tab.key)"
          >
            <text class="c2-tab-text" :class="{ on: activeTab === tab.key }">{{ tab.label }}</text>
            <view v-if="activeTab === tab.key" class="c2-tab-ind" />
          </view>
        </view>
        <!-- 占位：Tab 吸顶后内容不跳动 -->
        <view class="c2-tabs-placeholder" />

        <view class="c2-content">
          <!-- ① 简介区 -->
          <view id="anchor-intro" class="c2-anchor">
            <view class="c2-sec serif"><view class="c2-sec-dot" /><text class="c2-sec-title">驿站简介</text></view>
            <view class="c2-card">
              <text v-if="introText" class="c2-intro-text" :class="{ folded: !introExpanded }">{{ introText }}</text>
              <text v-else class="c2-empty-inline">该驿站尚未填写简介</text>
              <text v-if="introText && introText.length > 60" class="c2-fold-btn" @tap="introExpanded = !introExpanded">{{ introExpanded ? '收起 ▴' : '展开全文 ▾' }}</text>
            </view>
            <!-- 品牌故事（getStationHome 有 brandStory 才画） -->
            <view v-if="brandStory" class="c2-card" style="margin-top:12px">
              <view class="c2-substory-head">
                <app-icon name="book-open" :size="15" color="#C41E3A" />
                <text class="c2-substory-title serif">驿站故事</text>
              </view>
              <text class="c2-story-text">{{ brandStory }}</text>
            </view>
          </view>

          <!-- ② 师资区（真 teachers·横滑·签约标 sourceUserId） -->
          <view id="anchor-teachers" class="c2-anchor">
            <view class="c2-sec serif">
              <view class="c2-sec-dot" /><text class="c2-sec-title">驿站师资</text>
              <text v-if="teachers.length" class="c2-sec-sub">· {{ teachers.length }} 位</text>
            </view>
            <view v-if="teachers.length" class="c2-teachers-wrap">
              <scroll-view scroll-x class="c2-teachers-scroll" :show-scrollbar="false">
                <view class="c2-teachers-row">
                  <view v-for="t in teachers" :key="t.id" class="c2-teacher-card" @tap="goTeacherProfile(t)">
                    <image v-if="t.avatar" lazy-load :src="t.avatar" class="c2-teacher-avatar-img" mode="aspectFill" />
                    <view v-else class="c2-teacher-avatar"><text class="c2-teacher-avatar-txt">{{ (t.name || '师')[0] }}</text></view>
                    <text class="c2-teacher-name serif">{{ t.name }}</text>
                    <view v-if="t.sourceUserId" class="c2-teacher-tag signed">
                      <text class="c2-teacher-tag-txt signed">签约{{ t.specialties.length ? ' · ' + t.specialties[0] : '' }}</text>
                    </view>
                    <text v-else class="c2-teacher-spec">{{ t.specialties.length ? t.specialties[0] : '驿站讲师' }}</text>
                  </view>
                </view>
              </scroll-view>
            </view>
            <view v-else class="c2-card"><text class="c2-empty-inline">暂无驻场师资</text></view>
          </view>

          <!-- ③ 线下课区（真 courses·deriveCourseStatus） -->
          <view id="anchor-courses" class="c2-anchor">
            <view class="c2-sec serif">
              <view class="c2-sec-dot" /><text class="c2-sec-title">线下课</text>
              <text v-if="station.courses.length" class="c2-sec-sub">· 近期 {{ station.courses.length }} 场</text>
            </view>
            <view v-if="station.courses.length">
              <view v-for="c in station.courses" :key="c.id" class="c2-card c2-course" @tap="goCourse(c.id)">
                <view class="c2-course-cover">
                  <image v-if="c.cover" lazy-load :src="c.cover" class="c2-course-cover-img" mode="aspectFill" />
                  <view v-else class="c2-course-cover-ph"><app-icon name="graduation-cap" :size="22" color="#C9A96E" /></view>
                </view>
                <view class="c2-course-info">
                  <text class="c2-course-title serif">{{ c.title }}</text>
                  <text class="c2-course-meta">{{ fmtCourseTime(c.startTime) }} · {{ c.teacher?.name || '待定讲师' }}</text>
                  <view class="c2-course-bottom">
                    <text class="c2-course-price serif">{{ num(c.price) === 0 ? '免费' : '¥' + formatPrice(c.price) }}</text>
                    <text class="c2-course-status" :style="{ color: courseStatusStyle[deriveCourseStatus(c)].color, background: courseStatusStyle[deriveCourseStatus(c)].bg }">{{ courseStatusLabel[deriveCourseStatus(c)] }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-else class="c2-card"><text class="c2-empty-inline">暂无线下课</text></view>
          </view>

          <!-- ④ 商品区（真 products·到店自提） -->
          <view id="anchor-products" class="c2-anchor">
            <view class="c2-sec serif">
              <view class="c2-sec-dot" /><text class="c2-sec-title">驿站商品</text>
              <text v-if="station.products.length" class="c2-sec-sub">· 到店自提</text>
            </view>
            <view v-if="station.products.length" class="c2-products">
              <view v-for="p in station.products" :key="p.id" class="c2-product">
                <view class="c2-product-img"><view class="c2-product-img-ph"><app-icon name="shopping-bag" :size="26" color="#C9A96E" /></view></view>
                <text class="c2-product-name serif">{{ p.name }}</text>
                <view class="c2-product-bottom">
                  <text class="c2-product-price serif">¥{{ formatPrice(p.price) }}</text>
                  <text class="c2-product-tag">自提</text>
                </view>
              </view>
            </view>
            <view v-else class="c2-card"><text class="c2-empty-inline">暂无驿站商品</text></view>
          </view>

          <!-- ⑤ 地址与联系区 -->
          <view id="anchor-address" class="c2-anchor">
            <view class="c2-sec serif"><view class="c2-sec-dot" /><text class="c2-sec-title">地址与联系</text></view>
            <view class="c2-card">
              <view class="c2-addr-row" @tap="copyAddress">
                <app-icon name="map-pin" :size="16" color="#C41E3A" />
                <text class="c2-addr-text">{{ station.city ? station.city + ' · ' : '' }}{{ station.address }}</text>
                <text class="c2-addr-copy">复制</text>
              </view>
              <view v-if="station.phone" class="c2-addr-row" @tap="onCall">
                <app-icon name="phone" :size="16" color="#C41E3A" />
                <text class="c2-addr-phone">{{ station.phone }}</text>
              </view>
              <view v-if="hoursList.length" class="c2-hours-list">
                <text v-for="(bh, i) in hoursList" :key="i" class="c2-hour-item" :class="{ closed: !bh.isOpen }">
                  {{ bh.day }}：{{ bh.isOpen ? bh.open + '-' + bh.close : '休息' }}
                </text>
              </view>
              <view class="c2-addr-actions">
                <view class="c2-addr-btn" @tap="copyAddress"><text class="c2-addr-btn-txt">复制地址</text></view>
                <view class="c2-addr-btn o" @tap="onCall"><text class="c2-addr-btn-txt o">电话咨询</text></view>
              </view>
            </view>
          </view>

          <view class="c2-safe" />
        </view>
      </scroll-view>

      <!-- ===== 底部固定 CTA ===== -->
      <view class="c2-footer">
        <view class="c2-foot-btn ghost" @tap="onCall">
          <app-icon name="phone" :size="16" color="#C41E3A" />
          <text class="c2-foot-btn-txt ghost">电话</text>
        </view>
        <view class="c2-foot-btn primary" @tap="onPrimaryCta">
          <app-icon name="calendar" :size="16" color="#fff" />
          <text class="c2-foot-btn-txt primary">{{ primaryCtaLabel }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * C2 驿站详情（对外单长页 · 吸收 station-home 品牌主页元素）
 * 数据接线：
 *   offlineApi.getStation(id)         → StationDetail（含 courses/products/owner/rating?）
 *   offlineApi.getStationTeachers(id) → 真师资（sourceUserId 非空=研究院签约讲师）
 *   offlineApi.getStationHome(id)     → 可选增益（brandStory/photos/rating·失败不阻塞）
 * 锚点 Tab：scroll-into-view 跳转 + @scroll 监听区块位置高亮当前 Tab（不用 CSS sticky·X5 不稳）
 * 诚实降级：去 manager/reviews 虚构区块·events 不再拉取·评分无 rating 不画·环境图无则占位
 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { captureRefFromQuery } from '@/utils/referral'
import {
  offlineApi, stationStatusLabel,
  deriveCourseStatus, courseStatusLabel, courseStatusStyle, fmtCourseTime, num,
  type StationDetail, type StationTeacherLite, type StationRating, type BusinessHour,
} from '@/lib/offline-data'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch {}
// 导航栏总高（状态栏 + 44 内容），锚点 Tab 吸顶到此位置
const navHeight = computed(() => statusBarHeight.value + 44)

const loading = ref(true)
const errMsg = ref('')
const stationId = ref('')
const station = ref<StationDetail | null>(null)
const teachers = ref<StationTeacherLite[]>([])
// 品牌主页增益（brandStory/photos/rating）——失败/无则各自诚实降级
const brandStory = ref<string | null>(null)
const homePhotos = ref<string[]>([])
const homeRating = ref<StationRating | null>(null)

const introExpanded = ref(false)
const heroIndex = ref(0)
const navSolid = ref(false)
const scrollTarget = ref('')

type TabKey = 'intro' | 'teachers' | 'courses' | 'products' | 'address'
const tabs: { key: TabKey; label: string }[] = [
  { key: 'intro', label: '简介' },
  { key: 'teachers', label: '师资' },
  { key: 'courses', label: '线下课' },
  { key: 'products', label: '商品' },
  { key: 'address', label: '地址' },
]
const activeTab = ref<TabKey>('intro')

async function load() {
  if (!stationId.value) { loading.value = false; errMsg.value = '缺少驿站参数'; return }
  loading.value = true
  errMsg.value = ''
  try {
    // 详情为主链（失败=整页错误态）；师资/主页为增益（失败不阻塞·各自降级）
    const [s, t, home] = await Promise.all([
      offlineApi.getStation(stationId.value),
      offlineApi.getStationTeachers(stationId.value).catch(() => [] as StationTeacherLite[]),
      offlineApi.getStationHome(stationId.value).catch(() => null),
    ])
    station.value = s
    teachers.value = t
    if (home) {
      brandStory.value = home.station.brandStory || null
      homePhotos.value = home.station.photos || []
      homeRating.value = home.rating || null
    }
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
    station.value = null
  } finally {
    loading.value = false
  }
}
onLoad((q) => {
  captureRefFromQuery(q) // 详情即对外落地页，分享进入落归因
  stationId.value = q && q.id ? String(q.id) : ''
  load()
})

// ── 头图相册：主页 photos 优先 → 详情 images → cover 单图 ──
const heroPhotos = computed<string[]>(() => {
  const s = station.value
  if (homePhotos.value.length) return homePhotos.value
  if (s?.images?.length) return s.images
  return s?.cover ? [s.cover] : []
})
function onHeroChange(e: { detail: { current: number } }) { heroIndex.value = e.detail.current }
function previewPhoto(index: number) {
  if (!heroPhotos.value.length) return
  uni.previewImage({ urls: heroPhotos.value, current: index })
}

// ── 评分（仅 home.rating 有值才渲染） ──
const rating = computed(() => homeRating.value)
const ratingRounded = computed(() => Math.round(homeRating.value?.avg || 0))

// ── 一句话简介 / 富文本简介 ──
const oneLiner = computed(() => {
  const tags = station.value?.tags || []
  if (tags.length) return tags.join(' · ')
  return ''
})
const introText = computed(() => station.value?.intro || '')

// ── 营业时间 ──
const hoursList = computed<BusinessHour[]>(() => station.value?.businessHours || [])
const businessHoursText = computed(() => {
  const list = hoursList.value
  if (!list.length) return ''
  const open = list.find((b) => b.isOpen)
  const closed = list.filter((b) => !b.isOpen)
  if (!open) return ''
  let s = `${open.open} – ${open.close}`
  if (closed.length) s += ` · ${closed.map((b) => b.day).join('/')}闭馆`
  return s
})

// ── 主 CTA：有线下课→报名（跳首个课程详情），无课→约讲师 ──
const primaryCtaLabel = computed(() => (station.value?.courses.length ? '报名线下课' : '预约到店'))
function onPrimaryCta() {
  const first = station.value?.courses[0]
  if (first) navigateTo(`/offline/courses/${first.id}`)
  else navigateTo(`/offline/teacher-booking?stationId=${stationId.value}`)
}

// ── 锚点 Tab：跳转（scroll-into-view）+ 滚动监听高亮 ──
const anchorIds: Record<TabKey, string> = {
  intro: 'anchor-intro', teachers: 'anchor-teachers', courses: 'anchor-courses', products: 'anchor-products', address: 'anchor-address',
}
function jumpTo(key: TabKey) {
  activeTab.value = key
  // 先清空再赋值，确保重复点同一 Tab 也能触发滚动
  scrollTarget.value = ''
  setTimeout(() => { scrollTarget.value = anchorIds[key] }, 0)
}

// 各锚点相对滚动容器顶部的位置缓存（滚动时比对，判定当前 Tab）
const anchorTops = ref<Record<TabKey, number>>({ intro: 0, teachers: 0, courses: 0, products: 0, address: 0 })
let measured = false
function measureAnchors() {
  const q = uni.createSelectorQuery()
  q.select('.c2-body').boundingClientRect()
  ;(Object.keys(anchorIds) as TabKey[]).forEach((k) => {
    q.select('#' + anchorIds[k]).boundingClientRect()
  })
  q.exec((res: Array<{ top: number } | null>) => {
    const bodyTop = res[0]?.top ?? 0
    const keys = Object.keys(anchorIds) as TabKey[]
    const next = { ...anchorTops.value }
    keys.forEach((k, i) => {
      const r = res[i + 1]
      if (r) next[k] = r.top - bodyTop
    })
    anchorTops.value = next
    measured = true
  })
}

let scrollTop = 0
function onScroll(e: { detail: { scrollTop: number } }) {
  scrollTop = e.detail.scrollTop
  // 头图 16:9 约占屏宽 56%，滚过导航区后导航栏转实底
  navSolid.value = scrollTop > 40
  if (!measured) measureAnchors()
  // Tab 吸顶后判定：以「已滚过锚点顶 - 触发线」的最后一个为当前
  const trigger = navHeight.value + 56
  const keys = Object.keys(anchorIds) as TabKey[]
  let cur: TabKey = 'intro'
  for (const k of keys) {
    if (scrollTop + trigger >= anchorTops.value[k]) cur = k
  }
  activeTab.value = cur
}

// ── 交互 ──
function onCall() {
  const phone = station.value?.phone
  if (phone) uni.makePhoneCall({ phoneNumber: phone }).catch(() => {})
}
function copyAddress() {
  const s = station.value
  if (!s) return
  uni.setClipboardData({ data: `${s.city || ''} ${s.address}`.trim(), success: () => uni.showToast({ title: '地址已复制', icon: 'none' }) })
}
function goCourse(id: string) { navigateTo(`/offline/courses/${id}`) }
/** 签约讲师（sourceUserId 非空）可进讲师公开主页；自建讲师无主页不跳转 */
function goTeacherProfile(t: StationTeacherLite) {
  if (!t.sourceUserId) return
  navigateTo(`/pkg-creator/teacher-profile/index?userId=${t.sourceUserId}`)
}
function onShareTap() { uni.showToast({ title: '点击右上角菜单分享', icon: 'none' }) }

// ── 微信原生分享（路径由 useShare 自动带分享者 ref → 归因） ──
const { toAppMessage, toTimeline } = useShare()
const sharePath = computed(() => `/pkg-offline/station-detail/index?id=${stationId.value}`)
const shareTitle = () => station.value?.name || '国学驿站'
const shareSummary = () => {
  const t = brandStory.value || station.value?.intro || ''
  return t.length > 40 ? t.slice(0, 40) + '…' : t || undefined
}
onShareAppMessage(() => toAppMessage({
  title: shareTitle(),
  summary: shareSummary(),
  path: sharePath.value,
  cover: heroPhotos.value[0] || undefined,
}))
onShareTimeline(() => toTimeline({
  title: shareTitle(),
  summary: shareSummary(),
  path: sharePath.value,
  cover: heroPhotos.value[0] || undefined,
}))
</script>

<style lang="scss" scoped>
/* token：宣纸白 #FAF8F5 / 卡片白 #FFF / 朱红 #C41E3A / 金 #C9A96E / 文 #2C2C2C-#6E6E73-#999 */
.c2-page { min-height: 100vh; height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.serif { font-family: 'Songti SC', 'STSong', serif; }

/* 自定义导航栏（叠在头图上·随滚动渐显实底） */
.c2-navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 60; border-bottom: 1px solid transparent; transition: background 0.2s ease, border-color 0.2s ease; }
.c2-nav-row { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 8px; }
.c2-nav-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.c2-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 700; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 6px; transition: opacity 0.2s ease; }

/* 三态 */
.c2-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 0 40px; }
.c2-state-text { font-size: 14px; color: #6E6E73; }
.spinner { width: 28px; height: 28px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.c2-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.c2-retry-text { font-size: 13px; color: #C41E3A; }

.c2-body { flex: 1; height: 0; min-height: 0; }

/* 头部环境图 16:9（用 padding-top 比例·非 aspect-ratio） */
.c2-hero { position: relative; width: 100%; padding-top: 56.25%; background: #EFE9E0; }
.c2-hero-swiper { position: absolute; inset: 0; width: 100%; height: 100%; }
.c2-hero-img { width: 100%; height: 100%; }
.c2-hero-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1.5px dashed #D8CFC0; }
.c2-hero-empty-text { font-size: 12px; color: #B8AD9B; }
.c2-hero-mask { position: absolute; top: 0; left: 0; right: 0; height: 44%; background: linear-gradient(180deg, rgba(0,0,0,0.28), transparent); }
.c2-hero-count { position: absolute; right: 14px; bottom: 12px; background: rgba(0,0,0,0.4); color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 999px; }

/* 驿站头信息 */
.c2-headinfo { padding: 16px 20px 0; }
.c2-name-row { display: flex; align-items: center; gap: 8px; }
.c2-name { font-size: 22px; font-weight: 700; color: #2C2C2C; }
.c2-badge { display: flex; align-items: center; gap: 3px; background: rgba(196,30,58,0.08); border-radius: 6px; padding: 2px 8px; flex-shrink: 0; }
.c2-badge.off { background: #F0ECE5; }
.c2-badge-text { font-size: 10px; font-weight: 600; color: #C41E3A; }
.c2-badge-text.off { color: #999; }
.c2-rating { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.c2-stars { display: flex; align-items: center; gap: 2px; }
.c2-rating-avg { font-size: 14px; font-weight: 700; color: #C9A96E; }
.c2-rating-count { font-size: 11px; color: #999; }
.c2-oneliner { display: block; font-size: 12.5px; color: #6E6E73; margin-top: 8px; line-height: 1.6; }
.c2-hours { display: block; font-size: 11px; color: #999; margin-top: 4px; }

/* 锚点 Tab（固定定位·随滚动吸顶·不用 sticky） */
.c2-tabs { position: fixed; left: 0; right: 0; z-index: 50; display: flex; background: rgba(250,248,245,0.96); border-bottom: 1px solid #EFEAE3; }
.c2-tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 12px 0; }
.c2-tab-text { font-size: 13px; color: #6E6E73; }
.c2-tab-text.on { color: #C41E3A; font-weight: 700; }
.c2-tab-ind { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: 22px; height: 2.5px; border-radius: 2px; background: #C41E3A; }
.c2-tabs-placeholder { height: 45px; }

.c2-content { padding: 0 20px; }
.c2-anchor { scroll-margin-top: 100px; }

.c2-sec { display: flex; align-items: center; gap: 7px; margin: 22px 0 12px; }
.c2-sec-dot { width: 5px; height: 16px; border-radius: 3px; background: #C41E3A; }
.c2-sec-title { font-size: 18px; font-weight: 700; color: #2C2C2C; }
.c2-sec-sub { font-size: 11px; color: #999; font-weight: 400; }

.c2-card { background: #FFF; border-radius: 18px; padding: 14px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.c2-empty-inline { font-size: 12.5px; color: #B0A89C; }

/* 简介 */
.c2-intro-text { font-size: 12.5px; color: #6E6E73; line-height: 1.85; }
.c2-intro-text.folded { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.c2-fold-btn { display: block; font-size: 12.5px; color: #C41E3A; margin-top: 6px; }
.c2-substory-head { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.c2-substory-title { font-size: 15px; font-weight: 700; color: #2C2C2C; }
.c2-story-text { font-size: 13px; color: #4b5563; line-height: 1.8; white-space: pre-wrap; }

/* 师资横滑 */
.c2-teachers-wrap { margin: 0 -20px; }
.c2-teachers-scroll { white-space: nowrap; }
.c2-teachers-row { display: flex; gap: 10px; padding: 0 20px; }
.c2-teacher-card { flex-shrink: 0; width: 112px; background: #FFF; border-radius: 18px; padding: 14px 8px; text-align: center; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.c2-teacher-avatar { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto; background: linear-gradient(135deg, #efe9e0, #e4ddd0); display: flex; align-items: center; justify-content: center; }
.c2-teacher-avatar-img { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto; display: block; }
.c2-teacher-avatar-txt { font-size: 18px; color: #B8AD9B; font-weight: 700; }
.c2-teacher-name { display: block; font-size: 14px; font-weight: 700; color: #2C2C2C; margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c2-teacher-tag { display: inline-flex; align-items: center; border: 1px solid #C9A96E; border-radius: 999px; padding: 2px 9px; margin-top: 5px; }
.c2-teacher-tag-txt { font-size: 10px; color: #a5843f; }
.c2-teacher-spec { display: block; font-size: 11px; color: #999; margin-top: 6px; }

/* 线下课卡 */
.c2-course { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 12px; }
.c2-course-cover { width: 120px; padding-top: 67px; position: relative; flex-shrink: 0; border-radius: 12px; background: linear-gradient(135deg, #efe9e0, #e4ddd0); overflow: hidden; }
.c2-course-cover-ph { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.c2-course-cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.c2-course-info { flex: 1; min-width: 0; }
.c2-course-title { display: block; font-size: 15px; font-weight: 700; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c2-course-meta { display: block; font-size: 11px; color: #999; margin: 5px 0 8px; }
.c2-course-bottom { display: flex; align-items: center; justify-content: space-between; }
.c2-course-price { font-size: 16px; font-weight: 700; color: #C41E3A; }
.c2-course-status { font-size: 10px; padding: 2px 8px; border-radius: 999px; }

/* 商品 2 列 */
.c2-products { display: flex; flex-wrap: wrap; gap: 12px; }
.c2-product { width: calc(50% - 6px); background: #FFF; border-radius: 18px; padding: 10px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); }
.c2-product-img { width: 100%; padding-top: 100%; position: relative; border-radius: 12px; background: linear-gradient(135deg, #efe9e0, #e4ddd0); }
.c2-product-img-ph { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.c2-product-name { display: block; font-size: 13.5px; font-weight: 700; color: #2C2C2C; margin-top: 8px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c2-product-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.c2-product-price { font-size: 15px; font-weight: 700; color: #C41E3A; }
.c2-product-tag { display: inline-flex; align-items: center; border: 1px solid #C9A96E; color: #a5843f; border-radius: 999px; padding: 2px 9px; font-size: 10px; }

/* 地址 */
.c2-addr-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.c2-addr-text { flex: 1; font-size: 13px; color: #2C2C2C; line-height: 1.5; }
.c2-addr-copy { font-size: 11px; color: #C41E3A; padding: 2px 10px; border: 1px solid rgba(196,30,58,0.35); border-radius: 999px; flex-shrink: 0; }
.c2-addr-phone { font-size: 13px; color: #C41E3A; }
.c2-hours-list { display: flex; flex-direction: column; gap: 3px; margin-top: 8px; padding-top: 10px; border-top: 1px solid #F0ECE5; }
.c2-hour-item { font-size: 12px; color: #6E6E73; }
.c2-hour-item.closed { color: #B0A89C; }
.c2-addr-actions { display: flex; gap: 10px; margin-top: 14px; }
.c2-addr-btn { flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #C41E3A; }
.c2-addr-btn.o { background: #FFF; border: 1px solid #C41E3A; }
.c2-addr-btn-txt { font-size: 13px; font-weight: 600; color: #fff; }
.c2-addr-btn-txt.o { color: #C41E3A; }

.c2-safe { height: 40px; }

/* 底部固定 CTA */
.c2-footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 55; display: flex; gap: 12px; padding: 12px 20px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #FFF; border-top: 1px solid #EFEAE3; }
.c2-foot-btn { height: 46px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 999px; }
.c2-foot-btn.ghost { flex: 0 0 96px; background: #FFF; border: 1px solid #C41E3A; }
.c2-foot-btn.primary { flex: 1; background: #C41E3A; }
.c2-foot-btn-txt { font-size: 15px; font-weight: 700; }
.c2-foot-btn-txt.ghost { color: #C41E3A; }
.c2-foot-btn-txt.primary { color: #fff; }
</style>
