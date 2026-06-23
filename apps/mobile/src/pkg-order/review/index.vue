<template>
  <view class="page">
    <app-nav-bar back-icon="arrow-left" :back-size="40" title-align="left">
      <template #center>
        <view class="nav-title-wrap">
          <text class="nav-title">评价订单</text>
          <text class="nav-id">#{{ orderId }}</text>
        </view>
      </template>
    </app-nav-bar>

    <scroll-view scroll-y class="scroll-area">
      <view v-for="(item, idx) in reviewItems" :key="item.id" class="review-card">
        <!-- 商品信息 -->
        <view class="product-row">
          <image class="product-cover" :src="item.cover" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ item.name }}</text>
            <text class="product-idx">商品 {{ idx + 1 }}/{{ reviewItems.length }}</text>
          </view>
        </view>

        <view class="card-body">
          <!-- 星级评分 -->
          <view class="rating-block">
            <text class="rating-label">商品评分 <text class="req">*</text></text>
            <view class="stars">
              <view v-for="star in 5" :key="star" class="star-btn" @tap="setRating(idx, star)">
                <app-icon
                  name="star"
                  :size="64"
                  :color="star <= forms[idx].rating ? '#D4A017' : '#9CA3AF'"
                  :fill="star <= forms[idx].rating"
                />
              </view>
              <text v-if="forms[idx].rating > 0" class="rating-text" :class="ratingClass(forms[idx].rating)">
                {{ ratingLabels[forms[idx].rating] }}
              </text>
            </view>
          </view>

          <!-- 评价标签 -->
          <view v-if="(tagsByRating[forms[idx].rating] || []).length > 0" class="tags-wrap">
            <view
              v-for="tag in tagsByRating[forms[idx].rating]"
              :key="tag"
              class="tag-chip"
              :class="{ active: forms[idx].tags.includes(tag) }"
              @tap="toggleTag(idx, tag)"
            >
              <text class="tag-text" :class="{ active: forms[idx].tags.includes(tag) }">{{ tag }}</text>
            </view>
          </view>

          <!-- 文字评价 -->
          <view class="content-block">
            <view class="content-head">
              <text class="content-label">详细评价（选填）</text>
              <text class="word-count">{{ forms[idx].content.length }}/200</text>
            </view>
            <textarea
              class="content-input"
              v-model="forms[idx].content"
              placeholder="分享使用感受，帮助更多买家..."
              :maxlength="200"
              placeholder-class="ph"
            />
          </view>

          <!-- 图片上传入口 -->
          <view class="upload-row">
            <view class="upload-add" @tap="addImage(idx)">
              <app-icon name="camera" :size="40" color="#9CA3AF" />
              <text class="upload-add-text">添加图片</text>
            </view>
            <text class="upload-hint">最多添加 6 张图片</text>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <!-- 底部提交 -->
    <view class="submit-bar" :style="{ paddingBottom: 16 + safeBottom + 'px' }">
      <text v-if="!allRated" class="submit-hint">请为所有商品打分后提交</text>
      <view class="submit-btn" :class="{ disabled: !allRated }" @tap="submit">
        <text class="submit-text" :class="{ disabled: !allRated }">提交评价</text>
      </view>
    </view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import { orderApi, reviewItems as orderReviewItems, reviewTagsByRating, reviewRatingLabels } from '@/lib/order-data'

const safeBottom = ref(0)
const orderId = ref('1')

const reviewItems = ref(orderReviewItems)
const tagsByRating = reviewTagsByRating
const ratingLabels = reviewRatingLabels

interface ReviewForm { rating: number; tags: string[]; content: string; images: string[] }
const forms = reactive<ReviewForm[]>(
  orderReviewItems.map(() => ({ rating: 0, tags: [], content: '', images: [] })),
)

const allRated = computed(() => forms.every((f) => f.rating > 0))
const submitting = ref(false)

function ratingClass(r: number) {
  if (r >= 4) return 'good'
  if (r === 3) return 'mid'
  return 'bad'
}

onLoad((opts: any) => {
  if (opts?.id) orderId.value = opts.id
  try {
    safeBottom.value = uni.getSystemInfoSync().safeAreaInsets?.bottom || 0
  } catch (e) {
    safeBottom.value = 0
  }
})

function setRating(idx: number, star: number) {
  forms[idx].rating = star
  forms[idx].tags = []
}

function toggleTag(idx: number, tag: string) {
  const tags = forms[idx].tags
  const i = tags.indexOf(tag)
  if (i >= 0) tags.splice(i, 1)
  else tags.push(tag)
}

function addImage(idx: number) {
  uni.chooseImage({
    count: 6 - forms[idx].images.length,
    success: (res) => {
      forms[idx].images.push(...(res.tempFilePaths as string[]))
    },
  })
}

async function submit() {
  if (!allRated.value || submitting.value) return
  submitting.value = true
  try {
    uni.showLoading({ title: '提交中...' })
    const items = forms.map((f, i) => ({
      productId: reviewItems.value[i]?.id || '',
      rating: f.rating,
      tags: f.tags,
      content: f.content,
    }))
    await orderApi.submitReview(orderId.value, items)
    uni.hideLoading()
    uni.showToast({ title: '评价成功', icon: 'success' })
    setTimeout(() => goBack(), 1500)
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAF8F5;
}

.nav-title-wrap {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-left: 24rpx;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-id {
  font-size: 24rpx;
  color: #999999;
}

.scroll-area {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.review-card {
  margin: 32rpx 32rpx 0;
  background: #FFFFFF;
  border: 1rpx solid #E8E3DB;
  border-radius: 24rpx;
  overflow: hidden;
}
.product-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E3DB;
}
.product-cover {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  background: #F0EDE8;
  flex-shrink: 0;
}
.product-info {
  flex: 1;
  min-width: 0;
}
.product-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
}
.product-idx {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #999999;
}

.card-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.rating-label {
  display: block;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #999999;
}
.req {
  color: #ef4444;
}
.stars {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.star-btn {
  line-height: 0;
}
.rating-text {
  margin-left: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.rating-text.good {
  color: #D4A017;
}
.rating-text.mid {
  color: #999999;
}
.rating-text.bad {
  color: #ef4444;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag-chip {
  padding: 12rpx 24rpx;
  background: #FFFFFF;
  border-radius: 999rpx;
  border: 1rpx solid #E8E3DB;
}
.tag-chip.active {
  background: #C41E3A;
  border-color: #C41E3A;
}
.tag-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.tag-text.active {
  color: #FFFFFF;
}

.content-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.content-label {
  font-size: 24rpx;
  color: #999999;
}
.word-count {
  font-size: 24rpx;
  color: #999999;
}
.content-input {
  width: 100%;
  min-height: 160rpx;
  padding: 16rpx 24rpx;
  background: #FAF8F5;
  border: 1rpx solid #E8E3DB;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}
.ph {
  color: #9CA3AF;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.upload-add {
  width: 128rpx;
  height: 128rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #FFFFFF;
  border: 1rpx dashed #E8E3DB;
  border-radius: 16rpx;
}
.upload-add-text {
  font-size: 20rpx;
  color: #9CA3AF;
}
.upload-hint {
  font-size: 24rpx;
  color: #999999;
}

.bottom-gap {
  height: 200rpx;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1rpx solid #E8E3DB;
}
.submit-hint {
  display: block;
  text-align: center;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #999999;
}
.submit-btn {
  height: 88rpx;
  border-radius: 24rpx;
  background: #C41E3A;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-btn.disabled {
  background: #E5E1DA;
}
.submit-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.submit-text.disabled {
  color: #9CA3AF;
}
</style>
