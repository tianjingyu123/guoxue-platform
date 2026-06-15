<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#1A1A1A" />
      </view>
      <text class="nav-title">发表评价</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: navHeight + 'px' }">
      <view
        v-for="(item, idx) in reviewItems"
        :key="item.id"
        class="review-card"
      >
        <!-- 商品信息 -->
        <view class="product-row">
          <image class="product-cover" :src="item.cover" mode="aspectFill" />
          <text class="product-name">{{ item.name }}</text>
        </view>

        <!-- 评分 -->
        <view class="rating-row">
          <text class="rating-label">商品评分</text>
          <view class="stars">
            <view
              v-for="star in 5"
              :key="star"
              class="star-btn"
              @tap="setRating(idx, star)"
            >
              <app-icon
                name="star"
                :size="48"
                :color="star <= forms[idx].rating ? '#D4A017' : '#DDDDDD'"
                :fill="star <= forms[idx].rating"
              />
            </view>
            <text class="rating-text">{{ ratingLabels[forms[idx].rating] }}</text>
          </view>
        </view>

        <!-- 评价标签 -->
        <view class="tags-wrap">
          <view
            v-for="tag in tagsByRating[forms[idx].rating] || []"
            :key="tag"
            class="tag-chip"
            :class="{ active: forms[idx].tags.includes(tag) }"
            @tap="toggleTag(idx, tag)"
          >
            <text class="tag-text" :class="{ active: forms[idx].tags.includes(tag) }">{{ tag }}</text>
          </view>
        </view>

        <!-- 文字评价 -->
        <textarea
          class="content-input"
          v-model="forms[idx].content"
          placeholder="宝贝满足你的期待吗？说说它的优点和美中不足的地方吧~"
          :maxlength="500"
          placeholder-class="ph"
        />
        <text class="word-count">{{ forms[idx].content.length }}/500</text>

        <!-- 图片上传 -->
        <view class="upload-wrap">
          <view
            v-for="(img, imgIdx) in forms[idx].images"
            :key="imgIdx"
            class="upload-item"
          >
            <image class="upload-img" :src="img" mode="aspectFill" />
            <view class="upload-del" @tap="removeImage(idx, imgIdx)">
              <app-icon name="x" :size="24" color="#FFFFFF" />
            </view>
          </view>
          <view
            v-if="forms[idx].images.length < 9"
            class="upload-add"
            @tap="addImage(idx)"
          >
            <app-icon name="camera" :size="48" color="#999999" />
            <text class="upload-hint">{{ forms[idx].images.length }}/9</text>
          </view>
        </view>
      </view>

      <!-- 匿名评价 -->
      <view class="anon-row">
        <view class="anon-left">
          <text class="anon-title">匿名评价</text>
          <text class="anon-desc">开启后将隐藏您的头像和昵称</text>
        </view>
        <switch :checked="anonymous" color="#9A2D2D" @change="onAnonChange" />
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <!-- 底部提交 -->
    <view class="submit-bar" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="submit-btn" @tap="submit">
        <text class="submit-text">提交评价</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import { orderReviewItems, reviewTagsByRating, reviewRatingLabels } from '@/lib/order-data'

const statusBarHeight = ref(20)
const navHeight = ref(64)
const safeBottom = ref(0)

const reviewItems = ref(orderReviewItems)
const tagsByRating = reviewTagsByRating
const ratingLabels = reviewRatingLabels
const anonymous = ref(false)

interface ReviewForm { rating: number; tags: string[]; content: string; images: string[] }
const forms = reactive<ReviewForm[]>(
  orderReviewItems.map(() => ({ rating: 5, tags: [], content: '', images: [] })),
)

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    navHeight.value = statusBarHeight.value + 44
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
    navHeight.value = 64
  }
})

function setRating(idx: number, star: number) {
  forms[idx].rating = star
  // 切换评分后清空不适用的标签
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
    count: 9 - forms[idx].images.length,
    success: (res) => {
      const paths = res.tempFilePaths as string[]
      forms[idx].images.push(...paths)
    },
  })
}

function removeImage(idx: number, imgIdx: number) {
  forms[idx].images.splice(imgIdx, 1)
}

function onAnonChange(e: any) {
  anonymous.value = e.detail.value
}

function submit() {
  const empty = forms.some((f) => !f.content.trim())
  if (empty) {
    uni.showToast({ title: '请填写评价内容', icon: 'none' })
    return
  }
  uni.showLoading({ title: '提交中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '评价成功', icon: 'success' })
    setTimeout(() => goBack(), 1500)
  }, 1000)
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
  background: #FFFFFF;
  border-bottom: 1rpx solid #EEEEEE;
}
.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.nav-placeholder {
  width: 60rpx;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.review-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.product-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.product-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}
.product-name {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
  line-height: 1.4;
}

.rating-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
}
.rating-label {
  font-size: 28rpx;
  color: #1A1A1A;
}
.stars {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.star-btn {
  padding: 4rpx;
}
.rating-text {
  margin-left: 8rpx;
  font-size: 26rpx;
  color: #D4A017;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-bottom: 24rpx;
}
.tag-chip {
  padding: 10rpx 24rpx;
  background: #F5F5F5;
  border-radius: 999rpx;
  border: 1rpx solid transparent;
}
.tag-chip.active {
  background: rgba(154, 45, 45, 0.08);
  border-color: #9A2D2D;
}
.tag-text {
  font-size: 24rpx;
  color: #666666;
}
.tag-text.active {
  color: #9A2D2D;
}

.content-input {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  background: #F8F8F8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  box-sizing: border-box;
}
.ph {
  color: #BBBBBB;
}
.word-count {
  display: block;
  text-align: right;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}

.upload-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}
.upload-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.upload-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
}
.upload-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-add {
  width: 160rpx;
  height: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #F8F8F8;
  border: 1rpx dashed #DDDDDD;
  border-radius: 12rpx;
}
.upload-hint {
  font-size: 22rpx;
  color: #999999;
}

.anon-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
}
.anon-title {
  font-size: 28rpx;
  color: #1A1A1A;
}
.anon-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #999999;
}

.bottom-gap {
  height: 160rpx;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #EEEEEE;
}
.submit-btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: #9A2D2D;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
