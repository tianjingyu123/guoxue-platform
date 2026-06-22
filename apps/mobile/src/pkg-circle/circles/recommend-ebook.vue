<template>
  <view class="re-page">
    <!-- 顶部栏 -->
    <view class="re-header">
      <view class="re-header-left">
        <view @tap="goBack">
          <app-icon
            name="arrow-left"
            :size="36"
            color="#475569"
          />
        </view>
        <view>
          <text class="re-title">
            推荐电子书
          </text>
          <text class="re-subtitle">
            {{ circleInfo.name }}
          </text>
        </view>
      </view>
      <view
        class="re-save-btn"
        :class="{ disabled: isSaving }"
        @tap="handleSave"
      >
        {{ isSaving ? '保存中…' : '保存' }}
      </view>
    </view>

    <!-- 说明提示 -->
    <view class="re-tip">
      <app-icon
        name="crown"
        :size="28"
        color="#C41E3A"
      />
      <text class="re-tip-t">
        圈主推荐的电子书将显示在圈子首页，吸引成员购买阅读（最多 12 本）
      </text>
    </view>

    <!-- Tab 切换 -->
    <view class="re-tabs">
      <view
        class="re-tab"
        :class="{ on: activeTab === 'recommended' }"
        @tap="activeTab = 'recommended'"
      >
        已推荐 ({{ recommended.length }}/12)
      </view>
      <view
        class="re-tab"
        :class="{ on: activeTab === 'search' }"
        @tap="activeTab = 'search'"
      >
        选书
      </view>
    </view>

    <!-- 选书 Tab -->
    <view
      v-if="activeTab === 'search'"
      class="re-body"
    >
      <view class="re-search">
        <app-icon
          name="search"
          :size="30"
          color="#94a3b8"
        />
        <input
          v-model="search"
          class="re-search-input"
          placeholder="搜索书名、作者…"
          placeholder-class="re-ph"
        >
      </view>
      <view class="re-list">
        <view
          v-for="book in filteredBooks"
          :key="book.id"
          class="re-book"
          :class="{ sel: isRec(book.id) }"
        >
          <view
            class="re-cover"
            :style="{ background: coverColor(book.id) }"
          >
            <image
              v-if="book.cover"
              class="re-cover-img"
              :src="book.cover"
              mode="aspectFill"
            />
            <app-icon
              v-else
              name="book-open"
              :size="28"
              color="rgba(255,255,255,0.6)"
            />
          </view>
          <view class="re-book-info">
            <text class="re-book-title">
              {{ book.title }}
            </text>
            <text class="re-book-author">
              {{ book.author }}
            </text>
            <view class="re-book-meta">
              <text
                v-if="book.isMemberFree"
                class="re-tag-member"
              >
                会员免费
              </text>
              <text
                v-else-if="book.price === 0"
                class="re-tag-free"
              >
                免费
              </text>
              <text
                v-else
                class="re-tag-price"
              >
                ¥{{ book.price }}
              </text>
              <view class="re-meta-item">
                <app-icon
                  name="star"
                  :size="20"
                  color="#fbbf24"
                  :fill="true"
                /><text class="re-meta-t">
                  {{ book.rating }}
                </text>
              </view>
              <view class="re-meta-item">
                <app-icon
                  name="users"
                  :size="20"
                  color="#94a3b8"
                /><text class="re-meta-t">
                  {{ book.readers.toLocaleString() }}人读过
                </text>
              </view>
            </view>
          </view>
          <view
            class="re-toggle"
            :class="isRec(book.id) ? 'on' : 'off'"
            @tap="toggleRecommend(book.id)"
          >
            <app-icon
              :name="isRec(book.id) ? 'check' : 'plus'"
              :size="26"
              :color="isRec(book.id) ? '#ffffff' : '#94a3b8'"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 已推荐 Tab -->
    <view
      v-else
      class="re-body"
    >
      <view
        v-if="recommendedBooks.length === 0"
        class="re-empty"
      >
        <app-icon
          name="sparkles"
          :size="80"
          color="#C41E3A"
        />
        <text class="re-empty-t">
          还没有推荐电子书
        </text>
        <text class="re-empty-sub">
          切换到「选书」Tab 添加推荐
        </text>
      </view>
      <view
        v-else
        class="re-list"
      >
        <view
          v-for="(book, i) in recommendedBooks"
          :key="book.id"
          class="re-book"
        >
          <text class="re-rank">
            {{ i + 1 }}
          </text>
          <view
            class="re-cover sm"
            :style="{ background: coverColor(book.id) }"
          >
            <image
              v-if="book.cover"
              class="re-cover-img"
              :src="book.cover"
              mode="aspectFill"
            />
            <app-icon
              v-else
              name="book-open"
              :size="24"
              color="rgba(255,255,255,0.6)"
            />
          </view>
          <view class="re-book-info">
            <text class="re-book-title">
              {{ book.title }}
            </text>
            <text class="re-book-author">
              {{ book.author }}
            </text>
            <text
              v-if="book.price === 0 && !book.isMemberFree"
              class="re-tag-free"
            >
              免费
            </text>
            <text
              v-else-if="book.isMemberFree"
              class="re-tag-member-plain"
            >
              会员免费
            </text>
            <text
              v-else
              class="re-tag-price"
            >
              ¥{{ book.price }}
            </text>
          </view>
          <view
            class="re-remove"
            @tap="toggleRecommend(book.id)"
          >
            <app-icon
              name="x"
              :size="22"
              color="#dc2626"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 推荐电子书（从原型 app/circles/[id]/recommend-ebook/page.tsx 高保真迁移）
 * 浅色书库主题，双Tab选书/已推荐，最多推荐12本
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { circleDetailApi } from '@/lib/circle-detail-data'

const circleInfo = { id: '1', name: '八字命理研习圈' }

interface Book { id: string; title: string; author: string; cover: string; price: number; rating: number; readers: number; isMemberFree: boolean; isRecommended: boolean }
const allBooks = ref<Book[]>([])
const booksLoading = ref(true)

onMounted(async () => {
  booksLoading.value = true
  try {
    const recommendedIds = await circleDetailApi.getRecommendedEbooks(circleInfo.id)
    // @todo: 接入 ebookApi.list() 获取全部电子书列表后富化 isRecommended
    // 当前降级使用推荐ID列表，待 ebook 模块 API 完成
    allBooks.value = recommendedIds.map((id: string) => ({
      id, title: `电子书 ${id}`, author: '加载中', cover: '',
      price: 0, rating: 0, readers: 0, isMemberFree: false, isRecommended: true,
    }))
  } catch {
    // 降级为空列表
  } finally {
    booksLoading.value = false
  }
})

const coverColors = ['#1e3a5f', '#1a4731', '#4a1942', '#3d1f00', '#2d3561', '#1e3a2f', '#3a1a1a', '#1a2a4a']
function coverColor(id: string) { return coverColors[parseInt(id) % coverColors.length] }

const search = ref('')
const activeTab = ref<'search' | 'recommended'>('recommended')
const isSaving = ref(false)
const recommended = ref<string[]>(allBooks.filter((b) => b.isRecommended).map((b) => b.id))

const filteredBooks = computed(() => allBooks.filter((b) => b.title.includes(search.value) || b.author.includes(search.value)))
const recommendedBooks = computed(() => allBooks.filter((b) => recommended.value.includes(b.id)))
function isRec(id: string) { return recommended.value.includes(id) }
function toggleRecommend(id: string) {
  if (recommended.value.includes(id)) {
    recommended.value = recommended.value.filter((x) => x !== id)
  } else {
    if (recommended.value.length >= 12) { uni.showToast({ title: '最多推荐12本', icon: 'none' }); return }
    recommended.value = [...recommended.value, id]
  }
}
async function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  const ids = recommended.value.map(b => b.id)
  const res = await circleDetailApi.setRecommendedEbooks(circleInfo.id, ids)
  isSaving.value = false
  if (res.success) {
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => goBack(), 600)
  } else {
    uni.showToast({ title: res.message || '保存失败', icon: 'none' })
  }
}
</script>

<style scoped lang="scss">
.re-page { min-height: 100vh; background: #f8fafc; }
.re-header { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; background: rgba(255,255,255,0.95); border-bottom: 1rpx solid #e2e8f0; }
.re-header-left { display: flex; align-items: center; gap: 24rpx; }
.re-title { display: block; font-size: 30rpx; font-weight: 700; color: #0f172a; }
.re-subtitle { display: block; font-size: 22rpx; color: #64748b; }
.re-save-btn { padding: 0 32rpx; height: 64rpx; line-height: 64rpx; background: #C41E3A; color: #fff; font-size: 24rpx; border-radius: 16rpx; }
.re-save-btn.disabled { opacity: 0.6; }

.re-tip { margin: 24rpx 32rpx 16rpx; padding: 16rpx 24rpx; border-radius: 16rpx; display: flex; align-items: center; gap: 16rpx; background: rgba(196,30,58,0.08); }
.re-tip-t { font-size: 24rpx; color: #C41E3A; flex: 1; }

.re-tabs { display: flex; gap: 8rpx; margin: 24rpx 32rpx 8rpx; }
.re-tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 26rpx; font-weight: 500; border-radius: 16rpx; color: #64748b; background: #fff; }
.re-tab.on { background: #C41E3A; color: #fff; }

.re-body { padding: 0 32rpx 64rpx; }
.re-search { position: relative; display: flex; align-items: center; gap: 16rpx; margin: 24rpx 0; padding: 0 24rpx; height: 80rpx; background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08); }
.re-search-input { flex: 1; font-size: 28rpx; color: #0f172a; }
.re-ph { color: #94a3b8; }

.re-list { display: flex; flex-direction: column; gap: 16rpx; }
.re-book { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.re-book.sel { border: 2rpx solid #C41E3A; }
.re-cover { width: 112rpx; height: 160rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.re-cover.sm { width: 80rpx; height: 112rpx; }
.re-cover-img { width: 100%; height: 100%; }
.re-book-info { flex: 1; min-width: 0; }
.re-book-title { display: block; font-size: 26rpx; font-weight: 500; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.re-book-author { display: block; font-size: 22rpx; color: #64748b; margin-top: 4rpx; }
.re-book-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 8rpx; }
.re-tag-member { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: rgba(201,169,110,0.15); color: #A67C52; }
.re-tag-member-plain { font-size: 20rpx; color: #A67C52; }
.re-tag-free { font-size: 20rpx; font-weight: 700; color: #16a34a; }
.re-tag-price { font-size: 22rpx; font-weight: 700; color: #C41E3A; }
.re-meta-item { display: flex; align-items: center; gap: 4rpx; }
.re-meta-t { font-size: 20rpx; color: #94a3b8; }
.re-rank { width: 32rpx; text-align: center; font-size: 24rpx; color: #94a3b8; flex-shrink: 0; }
.re-toggle { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.re-toggle.on { background: #C41E3A; } .re-toggle.off { background: #f1f5f9; }
.re-remove { width: 48rpx; height: 48rpx; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.re-empty { display: flex; flex-direction: column; align-items: center; padding: 128rpx 0; }
.re-empty-t { font-size: 28rpx; color: #64748b; margin-top: 24rpx; } .re-empty-sub { font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; }
</style>
